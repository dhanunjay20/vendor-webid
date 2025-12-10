# Profile Update Debugging Guide

## Issues Fixed in Frontend

### 1. Added Comprehensive Logging
- Logs vendorId, vendorOrgId, and payloads before API calls
- Logs API responses for debugging
- Logs errors with detailed error responses from backend

### 2. Added vendorOrganizationId to Service Details Payload
- Service payload now includes `vendorOrganizationId`
- Helps backend match service details with vendor org

### 3. Improved Error Handling
- Separate error handling for vendor vs service details updates
- Shows warning toast if service details fails but vendor update succeeds
- Better error logging for troubleshooting

## Debugging Steps

### Step 1: Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Click "Save Changes" button
4. Look for logs like:
   ```
   Saving vendor profile...
   Vendor ID: xxxxx
   Vendor Org ID: xxxxx
   Form Data: {...}
   Vendor Payload: {...}
   ```

### Step 2: Check Network Tab
1. Go to Network tab in DevTools
2. Click "Save Changes"
3. Look for API requests:
   - `PUT /api/vendor/{vendorId}` - Should return 200
   - `POST /api/service-details/{vendorId}` - Should return 200

### Step 3: Check Backend Logs
1. View backend application logs
2. Look for:
   - Log entries from VendorServiceImpl.updateVendor()
   - Log entries from ServiceDetailsService.createOrUpdateServiceDetails()
   - Any error messages from MongoDB

## Known Backend Issues to Fix

### Issue 1: Path Conflict in ServiceDetailsController
**Problem**: Spring has ambiguity between these paths:
```
GET /api/service-details/vendor/{vendorId}
GET /api/service-details/search/service-type?type=...
```

**Solution**: Reorder paths in controller:
```java
// Put more specific paths FIRST
@GetMapping("/search/service-type")
@GetMapping("/search/cuisine")
@GetMapping("/search/area")

// Then generic paths
@GetMapping("/vendor/{vendorId}")
@GetMapping("/org/{vendorOrgId}")
```

### Issue 2: Ensure Backend Methods Exist
Verify these methods are implemented:
- `VendorService.updateVendor(vendorId, dto)`
- `ServiceDetailsService.createOrUpdateServiceDetails(vendorId, dto)`
- `ServiceDetailsRepository.findByVendorId(vendorId)`
- `ServiceDetailsRepository.findByVendorOrganizationId(vendorOrgId)`

### Issue 3: Validate Input Fields
Ensure backend validates:
- vendorId is not null/empty
- vendorOrganizationId is not null/empty (for service details)
- Required fields are present
- Return proper HTTP status codes with error messages

### Issue 4: Database Save
Check:
- MongoDB is connected
- Vendor and ServiceDetails collections exist
- Proper indexing is set up
- New fields are being saved correctly

## Testing the Fix

### Manual Test 1: Update Vendor Profile Only
```bash
curl -X PUT http://localhost:8080/api/vendor/YOUR_VENDOR_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "businessName": "Test Business",
    "contactName": "John Doe",
    "email": "john@example.com",
    "mobile": "+919876543210",
    "website": "https://example.com",
    "yearsInBusiness": 5,
    "aboutBusiness": "Test description",
    "addresses": []
  }'
```

### Manual Test 2: Create/Update Service Details
```bash
curl -X POST http://localhost:8080/api/service-details/YOUR_VENDOR_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "vendorId": "YOUR_VENDOR_ID",
    "vendorOrganizationId": "YOUR_ORG_ID",
    "cuisineSpecialties": ["Indian", "Chinese"],
    "serviceTypes": ["Wedding"],
    "maximumCapacity": 100,
    "startingPricePerPerson": 500
  }'
```

### Manual Test 3: Fetch Vendor Profile
```bash
curl http://localhost:8080/api/vendor/org/YOUR_ORG_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Manual Test 4: Fetch Service Details
```bash
curl http://localhost:8080/api/service-details/vendor/YOUR_VENDOR_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Backend Code to Add/Fix

### 1. Add Logging to VendorServiceImpl.updateVendor()
```java
@Override
public VendorResponseDto updateVendor(String vendorId, VendorUpdateDto dto) {
    log.info("Updating vendor: {}", vendorId);
    log.info("Update DTO: {}", dto);
    
    Optional<Vendor> vendorOpt = vendorRepository.findById(vendorId);
    if (!vendorOpt.isPresent()) {
        log.error("Vendor not found: {}", vendorId);
        throw new RuntimeException("Vendor not found");
    }
    
    Vendor vendor = vendorOpt.get();
    
    if (dto.getBusinessName() != null) vendor.setBusinessName(dto.getBusinessName());
    if (dto.getContactName() != null) vendor.setContactName(dto.getContactName());
    if (dto.getEmail() != null) vendor.setEmail(dto.getEmail());
    if (dto.getMobile() != null) vendor.setMobile(dto.getMobile());
    if (dto.getAddresses() != null) vendor.setAddresses(dto.getAddresses());
    if (dto.getWebsite() != null) vendor.setWebsite(dto.getWebsite());
    if (dto.getYearsInBusiness() != null) vendor.setYearsInBusiness(dto.getYearsInBusiness());
    if (dto.getAboutBusiness() != null) vendor.setAboutBusiness(dto.getAboutBusiness());
    
    if (dto.getPassword() != null && !dto.getPassword().isEmpty()) {
        vendor.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
    }
    
    Vendor saved = vendorRepository.save(vendor);
    log.info("Vendor updated successfully: {}", vendorId);
    
    return toResponseDto(saved);
}
```

### 2. Add Logging to ServiceDetailsService
```java
public ServiceDetailsDto createOrUpdateServiceDetails(String vendorId, ServiceDetailsDto dto) {
    log.info("Creating/Updating service details for vendor: {}", vendorId);
    log.info("Service Details DTO: {}", dto);
    
    ServiceDetails existing = serviceDetailsRepository.findByVendorId(vendorId);
    
    ServiceDetails serviceDetails;
    if (existing != null) {
        serviceDetails = existing;
        log.info("Updating existing service details");
    } else {
        serviceDetails = new ServiceDetails();
        serviceDetails.setVendorId(vendorId);
        log.info("Creating new service details");
    }
    
    // Map fields
    if (dto.getCuisineSpecialties() != null) 
        serviceDetails.setCuisineSpecialties(dto.getCuisineSpecialties());
    if (dto.getDietaryOptions() != null) 
        serviceDetails.setDietaryOptions(dto.getDietaryOptions());
    // ... map other fields
    
    ServiceDetails saved = serviceDetailsRepository.save(serviceDetails);
    log.info("Service details saved successfully for vendor: {}", vendorId);
    
    return convertToDto(saved);
}
```

### 3. Ensure Repository Methods Exist
```java
public interface ServiceDetailsRepository extends MongoRepository<ServiceDetails, String> {
    ServiceDetails findByVendorId(String vendorId);
    ServiceDetails findByVendorOrganizationId(String vendorOrganizationId);
    List<ServiceDetails> findByCuisineSpecialtiesContaining(String cuisine);
    List<ServiceDetails> findByServiceTypesContaining(String serviceType);
    List<ServiceDetails> findByServiceAreaContaining(String area);
}
```

## Expected Behavior After Fix

### Before Clicking Save
- User sees vendor and service details loaded
- Form is in read-only mode

### After Clicking Save
1. Console shows logging messages
2. Network tab shows two API calls:
   - PUT /api/vendor/{id} → 200 OK
   - POST /api/service-details/{id} → 200 OK
3. Success toast appears
4. Form switches to read-only mode
5. Page refreshes data from backend

### If Error Occurs
1. Error toast appears with specific error message
2. Console shows detailed error from backend
3. Network tab shows which API call failed
4. Form stays in edit mode for retry

## Quick Troubleshooting

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| No logs in console | Logging not enabled | Check localStorage keys are set |
| 404 Not Found | Wrong endpoint URL | Verify path in api.ts matches backend |
| 400 Bad Request | Invalid payload | Check console logs for payload structure |
| 401 Unauthorized | Missing/invalid token | Login again, check authToken |
| 500 Internal Server Error | Backend error | Check backend logs |
| Profile not updating | Service calls failing silently | Check Network tab and Console |

## Support
If issues persist:
1. Share the console logs from browser
2. Share the Network tab request/response
3. Share the backend application logs
4. Share the error message from toast
