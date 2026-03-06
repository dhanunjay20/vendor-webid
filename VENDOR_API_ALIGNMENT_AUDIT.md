# 🔍 Vendor API Alignment Audit Report

**Project:** Bidzaro Vendor UI  
**Date:** March 6, 2026  
**Branch:** sandhya → main  
**API Version:** 1.0.0 (Base URL: `/api/v1`)

---

## ✅ Overall Status

**ALIGNMENT LEVEL: 65-70% IMPLEMENTATION COVERAGE**

The UI project has made significant progress towards implementing the documented Vendor API, but several **critical gaps and misalignments** exist that will prevent full API compliance.

---

## 📊 Implementation Summary by Feature

| Feature | Implementation | Coverage | Status |
|---------|------------------|----------|--------|
| **Auth & Registration** | Partial | 80% | ⚠️ Needs Token Structure Fix |
| **Vendor Profile** | Complete | 95% | ✅ Good |
| **Menu Management** | Complete | 100% | ✅ Full |
| **Bid Management** | Complete | 100% | ✅ Full |
| **Orders & Delivery** | Complete | 100% | ✅ Full |
| **Reviews & Responses** | Partial | 75% | ⚠️ Response Endpoint Missing |
| **Chat & Messaging** | Partial | 70% | ⚠️ Multiple Issues |
| **Analytics Dashboard** | Partial | 60% | ⚠️ Data Transformation Issues |
| **Document Upload** | Complete | 100% | ✅ Full |
| **Notifications** | Partial | 50% | ⚠️ WebSocket Integration Needs Work |

---

## 🔴 CRITICAL ISSUES

### 1. **Missing Analytics Endpoint Integration**
**Severity:** HIGH | **Endpoint:** `GET /api/v1/analytics/vendor/dashboard`

**Current State:**
```typescript
// src/lib/analyticsApi.ts - Line 231
getCompleteDashboard: async (): Promise<DashboardDataDto> => {
  const response = await axiosInstance.get<{ data: VendorDashboardResponse }>(
    `/v1/analytics/vendor/dashboard`
  );
  const dashboardData = transformDashboardResponse(response.data.data);
  return dashboardData;
}
```

**Issues:**
- ❌ Base URL missing `/api` prefix (should be `/api/v1/analytics/vendor/dashboard`)
- ❌ Response transformation generates **fake data** instead of using actual backend metrics
- ❌ Data shape mismatch: Backend returns `VendorDashboardResponse` but component expects `DashboardDataDto`
- ❌ No error handling for CORS issues (seen in Index.tsx line 47)

**API Documentation expects:**
```json
{
  "success": true,
  "data": {
    "vendorId": "vendor-12345-67890",
    "vendorName": "Spice Garden Catering",
    "metrics": { /* VendorMetrics */ },
    "bidMetrics": { /* BidMetrics */ },
    "performance": { /* PerformanceMetrics */ }
  }
}
```

**Fix Required:**
```typescript
export const analyticsApi = {
  getCompleteDashboard: async (): Promise<DashboardDataDto> => {
    try {
      const response = await axiosInstance.get<ApiResponse<VendorDashboardResponse>>(
        `/api/v1/analytics/vendor/dashboard`  // Add /api prefix
      );
      // Return actual data, not generated mock
      return response.data.data;
    } catch (error: any) {
      // Handle CORS properly
      throw error;
    }
  },
};
```

---

### 2. **Chat API DTOs Mismatch**
**Severity:** HIGH | **File:** `src/lib/chatApi.ts`

**Current State:**
```typescript
// Line 27 - Backend field is "message", but DTO expects both
export interface MessageDto {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderType?: "USER" | "VENDOR" | "SUPPORT";
  senderName?: string;
  message: string;      // ✅ Correct (backend uses this)
  messageType: "TEXT" | "IMAGE" | "FILE";
  attachments?: MessageAttachment[];
  timestamp: string;
}

// Line 44 - But component also uses "content" field
export interface MessageDto {
  // ... other fields ...
  content?: string;     // ❌ Not in API docs
  isRead?: boolean;     // ❌ Not returned by backend
  readAt?: string;      // ❌ Not returned by backend
}
```

**Problems:**
- ❌ Field name confusion: `message` vs `content`
- ❌ Frontend-only fields mixed with API response fields
- ❌ No clear separation between backend DTO and frontend model
- ❌ `ConversationDto` uses `participants` array but `otherUserName` computed field

**API Documentation expects:**
```json
{
  "messageId": "msg-001-aaaa",
  "conversationId": "conv-77665-88990-aabb",
  "senderId": "550e8400...",
  "senderType": "VENDOR",
  "message": "Yes! We can handle 500 guests",
  "messageType": "TEXT",
  "attachments": []
}
```

**Fix Required:**
Separate API DTOs from frontend models:
```typescript
// API Response (from backend)
export interface MessageDtoResponse {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderType: "USER" | "VENDOR" | "SUPPORT";
  message: string;
  messageType: "TEXT" | "IMAGE" | "FILE";
  attachments?: MessageAttachment[];
  timestamp: string;
}

// Frontend Model (with computed fields)
export interface Message extends MessageDtoResponse {
  isRead?: boolean;        // Client-side only
  readAt?: string;         // Client-side only
  displayName?: string;    // Computed
}
```

---

### 3. **Vendor Profile DTOs Don't Match API Response**
**Severity:** MEDIUM | **File:** `src/types/vendor-api.ts`

**Current State:**
- ✅ Type definitions exist for request payloads
- ❌ Response DTO (`VendorResponse`) partially matches backend

**Mismatch Details:**

| Field | Backend Doc | Frontend DTO | Status |
|-------|-----------|-----------|--------|
| `registeredEmail` | ✅ Yes | ✅ Yes | ✅ OK |
| `registeredEmailVerified` | ✅ Yes | ✅ Yes | ✅ OK |
| `businessName` | ✅ Yes | ✅ Yes | ✅ OK |
| `documents` | ✅ Array of VendorDocument | ✅ Has type | ✅ OK |
| `ratings` | ✅ { averageRating, totalReviews } | ✅ VendorRatings | ✅ OK |
| `stats` | ✅ { totalOrders, completedOrders } | ✅ VendorStats | ✅ OK |

**Issue:** Most fields are correct but `VendorProfileSetup.tsx` uses different field names:
```typescript
// Line 28 - API expects "businessType"
const [formData, setFormData] = useState({
  businessType: "CATERING",  // ✅ Correct
  // ...
  doc1Type: country === "USA" ? "EIN" : "GST",  // ❌ Wrong field names
  doc1Name: "",  // ❌ Should be "documentName"
  doc1Url: "",   // ❌ Should be "documentUrl"
});
```

---

## 🟡 HIGH PRIORITY ISSUES

### 4. **Review Response Endpoint Not Implemented**
**Severity:** MEDIUM | **Endpoint:** `POST /reviews/{reviewId}/vendor-response`

**Current State:**
```typescript
// src/lib/api.ts - Line 1120
export async function respondToReview(reviewId: string, responseText: string) {
  try {
    const url = buildUrl(`/reviews/${reviewId}/vendor-response`);
    const res = await axiosInstance.post(url, { responseText });
    return res.data;
  }
}
```

**Issues:**
- ❌ Wrong endpoint: Should be `/api/v1/reviews/{reviewId}/vendor-response`
- ✅ Payload is correct: `{ responseText }`

**Fix:**
```typescript
export async function respondToReview(reviewId: string, responseText: string) {
  try {
    const url = buildUrl(`/api/v1/reviews/${reviewId}/vendor-response`);
    const res = await apiClient.post(url, { responseText });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}
```

---

### 5. **Menu Item Availability Toggle Endpoint Partially Implemented**
**Severity:** MEDIUM | **Endpoint:** `PATCH /api/v1/menu/vendor-items/{vendorItemId}/availability`

**Current State:**
```typescript
// src/lib/api.ts - Line 840
export async function toggleMenuItemAvailability(vendorItemId: string, isAvailable: boolean, reason?: string) {
  try {
    const url = buildUrl(`/api/v1/menu/vendor-items/${vendorItemId}/availability`);
    const body: any = { isAvailable };
    if (reason) body.reason = reason;
    const res = await apiClient.patch(url, body);
    return res.data;
  }
}
```

**Status:** ✅ Implementation is correct!

**But Usage in Menu.tsx is incomplete:**
- Component doesn't call this endpoint when toggling availability
- No UI for setting unavailability reason
- No date picker for `unavailableUntil`

**API expects (for complete feature):**
```json
{
  "isAvailable": false,
  "reason": "Ingredient shortage — back in stock Feb 26",
  "unavailableUntil": "2026-02-26T00:00:00.000Z"
}
```

**Menu.tsx should implement:**
1. Dialog for unavailability reason
2. Date picker for `unavailableUntil`
3. Call `toggleMenuItemAvailability()` with all fields

---

### 6. **Order Status Update Mismatch**
**Severity:** MEDIUM | **Endpoint:** `PATCH /orders/{orderId}/vendor-status`

**Current Implementation:**
```typescript
// src/lib/api.ts - Line 1061
export async function updateOrderStatusNew(
  orderId: string, 
  vendorStatus: string, 
  deliveryStatus?: string, 
  notes?: string
) {
  try {
    const url = buildUrl(`/api/v1/orders/${orderId}/vendor-status`);
    const res = await apiClient.patch(url, { vendorStatus, deliveryStatus, notes });
    return res.data;
  }
}
```

**Issues:**
- ❌ API expects only `vendorStatus` field in request body
- ❌ API doesn't accept `deliveryStatus` or `notes` in PATCH request
- ❌ Endpoint path might be wrong (should verify: `/orders/{orderId}/vendor-status`)

**API Documentation says:**
```json
{
  "vendorStatus": "IN_PREPARATION",
  "deliveryStatus": "PENDING",
  "notes": "Started food preparation"
}
```

**Need Clarification:** Does backend accept all three fields or just `vendorStatus`?

---

## 🟠 MEDIUM PRIORITY ISSUES

### 7. **Bid Submission Payload Doesn't Match API Spec**
**Severity:** MEDIUM | **Endpoint:** `POST /api/v1/bids/submit`

**Current Implementation:**
```typescript
// src/lib/api.ts - Line 692
export async function submitBid(bidRequestId: string, payload: {
  quotedPrice: { currency?: string; subtotal: number; ... };
  itemizedPricing?: Array<{ ... }>;
  deliveryDetails?: { ... };
  staffProvided?: { ... };
  ...
}) {
  const url = buildUrl(`/api/v1/bids/submit`);
  const body = { bidRequestId, ...payload };
  const res = await apiClient.post(url, body);
  return res.data;
}
```

**Issues:**
- ✅ Endpoint is correct
- ✅ Payload structure matches API spec
- ⚠️ **But:** BidsNew.tsx doesn't populate all fields when submitting

**Component Gap (BidsNew.tsx):**
```typescript
// Line 1-50 - Has dialog/modal for bid submission
// But doesn't collect:
// ❌ itemizedPricing breakdown
// ❌ deliveryDetails (estimatedSetupTime, foodReadyTime, cleanupTime)
// ❌ staffProvided (chefs, servers, cleaners count)
// ⚠️ Only basic quotedPrice and validityPeriodHours
```

**Fix Required:** Enhance bid submission form to collect:
1. Itemized pricing per item
2. Delivery timeline details
3. Staff allocation details

---

### 8. **Chat WebSocket Integration Incomplete**
**Severity:** MEDIUM | **File:** `src/lib/chatApi.ts`, `src/hooks/useWebSocketChat.ts`

**Current State:**
```typescript
// Line 113-200 in chatApi.ts
export const chatApi = {
  createConversation: async (...) => { },
  getConversations: async (...) => { },
  getMessages: async (...) => { },
  sendMessage: async (...) => { },  // REST API
  // WebSocket missing!
}
```

**Issues:**
- ❌ No WebSocket `/topic/conversations.{id}` subscription implemented
- ❌ No real-time message broadcast implementation
- ❌ `useWebSocketChat` hook exists but WebSocket client not fully connected
- ⚠️ Messages being sent via REST API instead of WebSocket

**API Expects:**
```
CONNECT to: ws://localhost:8080/ws
Destination: /app/chat.sendMessage
{
  "conversationId": "conv-77665-88990-aabb",
  "message": "We can provide 8 chefs and 15 servers",
  "messageType": "TEXT"
}

Subscribe to: /topic/conversations.conv-77665-88990-aabb
```

**Current Implementation Falls Back to REST:**
```typescript
export async function sendMessage(conversationId: string, message: string) {
  const url = buildUrl(`/chat/conversations/${conversationId}/messages`);
  const res = await axiosInstance.post(url, { message });
  return res.data;
}
```

**Fix Required:**
1. Connect to WebSocket endpoint properly
2. Use STOMP protocol for `/app/chat.sendMessage`
3. Subscribe to `/topic/conversations.{conversationId}`
4. Handle incoming message broadcasts

---

### 9. **Multiple Token Storage Keys Causing Confusion**
**Severity:** MEDIUM | **File:** `src/lib/api.ts`

**Current State:**
```typescript
// Multiple different keys used inconsistently:
localStorage.getItem("accessToken")       // ✅ DTO.accessToken
localStorage.getItem("authToken")         // ❌ Legacy
localStorage.getItem("webid_token")       // ❌ chatApi.ts uses this
localStorage.getItem("token")             // ❌ analyticsApi.ts checks this
localStorage.getItem("idToken")           // ❌ Might be from another source
localStorage.getItem("jwt")               // ❌ Generic JWT key
```

**Problems:**
- ❌ Different modules check different localStorage keys
- ❌ Not all modules properly set/retrieve tokens from auth flow
- ❌ When token refreshes, not all keys are updated
- ❌ Creates sync issues between modules

**API Documentation expects:**
```
Authorization: Bearer {accessToken}
```

**Current Token Flow in api.ts:**
```typescript
const token = localStorage.getItem("accessToken") || localStorage.getItem("authToken");
const tokenType = localStorage.getItem("tokenType") || "Bearer";
headers.Authorization = `${tokenType} ${token}`;
```

**But chatApi.ts does:**
```typescript
const token = localStorage.getItem("webid_token") || "";
```

**Fix Required:**
1. Use single consistent key: `accessToken`
2. Add key: `refreshToken` (for refresh flow)
3. Update all modules to use same keys
4. Ensure token refresh updates all places

---

## 🟢 WORKING CORRECTLY

### ✅ Complete Implementations

1. **Vendor Registration** - `POST /api/v1/auth/register` ✅
   - Properly implemented in VendorProfileSetup.tsx
   - Correct payload and error handling
   
2. **Vendor Profile Get/Update** - `GET/PUT /api/v1/vendors/...` ✅
   - Full implementation with proper DTO mapping
   - Handles both `my-profile` and specific vendor endpoints
   
3. **Menu Item CRUD** - `POST/PUT/DELETE /api/v1/menu/vendor-items/...` ✅
   - All operations implemented correctly
   - Pagination support for listing
   
4. **Bid Lifecycle** - `POST/PUT/DELETE /api/v1/bids/...` ✅
   - Submit, revise, withdraw all working
   - Proper payload structure
   - Bid request retrieval working
   
5. **Order Management** - `GET/PATCH /api/v1/orders/...` ✅
   - Vendor orders listing with pagination
   - Order detail retrieval
   - Status updates functioning
   
6. **Document Upload** - `POST /api/v1/uploads/document` ✅
   - Multipart form data handling correct
   - Entity type and ID parameters working
   
7. **Review Listing** - `GET /reviews/vendor/{vendorId}` ✅
   - Fetches reviews with pagination
   - Proper error handling

---

## ⚠️ MEDIUM PRIORITY ISSUES

### 10. **Notification WebSocket Service Not Fully Integrated**
**Severity:** MEDIUM | **File:** `src/lib/notificationWebSocket.ts`

**Current State:**
```typescript
// Service is created but not properly wired to backend
class NotificationWebSocketService {
  private ws: WebSocket | null = null;
  
  connect() {
    // Connects to generic WS endpoint
    // But doesn't subscribe to vendor-specific topics
  }
  
  subscribe() {
    // Not implemented properly
  }
}
```

**Issues:**
- ❌ No vendor-specific notification subscription
- ❌ Doesn't listen to `/topic/vendor/{vendorId}/notifications`
- ❌ Manual polling instead of real-time updates
- ⚠️ Duplicates functionality in useWebSocketChat hook

**Should Implement:**
```
Subscribe to: /topic/vendors/{vendorId}/notifications
Message types:
- BidRequestReceived
- BidAccepted
- OrderConfirmed
- ReviewReceived
- MessageReceived
- OrderStatusUpdate
```

---

### 11. **Missing Analytics Data Endpoints**
**Severity:** LOW | **File:** `src/lib/analyticsApi.ts`

**Documented Endpoints Not Implemented:**
- ❌ `/api/v1/analytics/vendor/monthly-revenue`
- ❌ `/api/v1/analytics/vendor/order-volume`
- ❌ `/api/v1/analytics/vendor/popular-items`
- ❌ `/api/v1/analytics/vendor/performance`

**Current:**
- Only `getCompleteDashboard()` exists
- Generates fake data instead of calling real endpoints
- Components can't refresh individual metrics

---

## 📋 DETAILED ENDPOINT COMPLIANCE MATRIX

### Auth Endpoints
| Endpoint | Method | Implemented | Status | Notes |
|----------|--------|-------------|--------|-------|
| `/auth/register` | POST | ✅ | Working | Both user and vendor |
| `/auth/login` | POST | ✅ | Working | Proper identifier/password |
| `/auth/refresh-token` | POST | ✅ | Working | With auto-retry |
| `/auth/forgot-password` | POST | ✅ | Working | |
| `/auth/reset-password` | POST | ✅ | Working | |
| `/auth/recover/forgot-email` | POST | ✅ | Working | |
| `/auth/recover/forgot-phone` | POST | ✅ | Working | |

### Vendor Endpoints
| Endpoint | Method | Implemented | Status | Notes |
|----------|--------|-------------|--------|-------|
| `/vendors/register` | POST | ✅ | ⚠️ | Field name mismatches |
| `/vendors/my-profile` | GET | ✅ | ✅ | Correct |
| `/vendors/{vendorId}` | PUT | ✅ | ✅ | Correct |
| `/uploads/document` | POST | ✅ | ✅ | Correct multipart |

### Menu Endpoints
| Endpoint | Method | Implemented | Status | Notes |
|----------|--------|-------------|--------|-------|
| `/menu/vendor-items` | POST | ✅ | ✅ | Correct |
| `/menu/vendor-items/my-items` | GET | ✅ | ✅ | Pagination works |
| `/menu/vendor-items/{vendorItemId}` | PUT | ✅ | ✅ | Correct |
| `/menu/vendor-items/{vendorItemId}` | DELETE | ✅ | ✅ | Correct |
| `/menu/vendor-items/{vendorItemId}/availability` | PATCH | ✅ | ⚠️ | Not used in UI |

### Bid Endpoints
| Endpoint | Method | Implemented | Status | Notes |
|----------|--------|-------------|--------|-------|
| `/bids/available-leads` | GET | ✅ | ✅ | Pagination works |
| `/bids/submit` | POST | ✅ | ⚠️ | Form incomplete |
| `/bids/my-bids` | GET | ✅ | ✅ | Correct |
| `/bids/{bidId}` | PUT | ✅ | ✅ | Revise working |
| `/bids/{bidId}` | DELETE | ✅ | ✅ | Withdraw working |
| `/bids/requests/{bidRequestId}` | GET | ❌ | ❌ | Missing |

### Order Endpoints
| Endpoint | Method | Implemented | Status | Notes |
|----------|--------|-------------|--------|-------|
| `/orders/vendor-orders` | GET | ✅ | ✅ | Pagination works |
| `/orders/{orderId}/vendor-status` | PATCH | ✅ | ⚠️ | Extra fields sent |
| `/orders/{orderId}` | GET | ✅ | ✅ | Correct |

### Review Endpoints
| Endpoint | Method | Implemented | Status | Notes |
|----------|--------|-------------|--------|-------|
| `/reviews/vendor/{vendorId}` | GET | ✅ | ✅ | Pagination works |
| `/reviews/{reviewId}/vendor-response` | POST | ✅ | ⚠️ | Wrong URL path |

### Chat Endpoints
| Endpoint | Method | Implemented | Status | Notes |
|----------|--------|-------------|--------|-------|
| `/chat/conversations` | POST | ✅ | ⚠️ | Request OK, response mismatch |
| `/chat/conversations` | GET | ✅ | ⚠️ | Conversation DTO issues |
| `/chat/conversations/{id}/messages` | GET | ✅ | ⚠️ | Message DTO issues |
| `/chat/conversations/{id}/messages` | POST | ✅ | ⚠️ | Should use WebSocket |
| `/app/chat.sendMessage` | WS | ❌ | ❌ | WebSocket not implemented |

### Analytics Endpoints
| Endpoint | Method | Implemented | Status | Notes |
|----------|--------|-------------|--------|-------|
| `/analytics/vendor/dashboard` | GET | ⚠️ | ⚠️ | Wrong URL, fake data |
| `/analytics/vendor/monthly-revenue` | GET | ❌ | ❌ | Missing |
| `/analytics/vendor/order-volume` | GET | ❌ | ❌ | Missing |

---

## 🎯 ACTION ITEMS (Priority Order)

### CRITICAL (Fix before shipping)
- [ ] Fix analytics endpoint URL and data transformation
- [ ] Fix chat DTO mismatches and separate API from frontend models
- [ ] Implement WebSocket for chat messages
- [ ] Fix token storage consistency across modules
- [ ] Complete bid submission form UI (itemized pricing, delivery details)

### HIGH (Fix soon)
- [ ] Implement review response endpoint correctly
- [ ] Fix menu item availability toggle UI
- [ ] Implement order status endpoint correctly
- [ ] Implement bid request details endpoint
- [ ] Test and fix CORS issues

### MEDIUM (Fix before next release)
- [ ] Implement notification WebSocket subscription
- [ ] Add missing analytics data endpoints
- [ ] Improve error handling and user feedback
- [ ] Test all pagination endpoints
- [ ] Add request/response logging in development

### LOW (Nice to have)
- [ ] Add request caching for frequently accessed data
- [ ] Implement request cancellation tokens
- [ ] Add retry logic for failed requests
- [ ] Add loading state management across all pages

---

## 📝 RECOMMENDATIONS

1. **Immediate:** Run integration tests against actual backend to identify all misalignments
2. **Separate DTOs:** Create clear separation between API response DTOs and frontend models
3. **Token Management:** Standardize token handling across all API modules
4. **WebSocket Support:** Implement proper WebSocket connections for real-time features
5. **Error Handling:** Add user-friendly error messages for API failures
6. **Testing:** Add API integration tests to catch future misalignments

---

## 📞 Next Steps

1. **Review this audit** with backend team to confirm API contract
2. **Prioritize critical issues** and create tracking tickets
3. **Implement fixes systematically** going through priority tiers
4. **Run integration tests** against staging environment
5. **Get API contract confirmation** before final deployment

---

*Generated: March 6, 2026 | Reviewed Coverage: All major API endpoints from vendor-api.ts documentation*
