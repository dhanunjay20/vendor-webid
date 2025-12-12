# MongoDB ID Usage in Chat System

## Overview
The chat system now correctly uses MongoDB ObjectIds (`_id` field) for both vendors and customers.

## Important Changes

### ✅ What Changed
**Before:** Used `vendorOrganizationId` (not a MongoDB `_id`)  
**After:** Uses `vendorId` (actual MongoDB `_id` from vendors collection)

### localStorage Keys

| Key | Description | Used For |
|-----|-------------|----------|
| `vendorId` | MongoDB `_id` from `vendors` collection | ✅ **Chat system** (primary) |
| `id` | Convenience MongoDB `_id` | ✅ **Chat system** (fallback) |
| `vendorOrganizationId` | Organization reference | ❌ Not used for chat |
| `userId` | User type identifier | ❌ Not used for chat |

### Code Updates

#### 1. Messaging Component (`src/pages/Messaging.tsx`)
```typescript
// OLD - Incorrect
const CURRENT_USER_ID = localStorage.getItem("vendorOrganizationId") || "vendor-001";

// NEW - Correct
const CURRENT_USER_ID = localStorage.getItem("vendorId") || localStorage.getItem("id") || "";
```

#### 2. Chat API Client (`src/lib/chatApi.ts`)
Added documentation:
```typescript
/**
 * IMPORTANT: All user IDs must be MongoDB ObjectIds (_id field)
 * - For vendors: Use localStorage.getItem("vendorId")
 * - For customers: Use the _id from users collection
 */
```

#### 3. WebSocket Service (`src/lib/websocket.ts`)
Added JSDoc:
```typescript
/**
 * @param userId - MongoDB ObjectId (_id) of the vendor from vendors collection
 */
```

#### 4. Online Status Integration
When vendor connects:
- WebSocket sends `ONLINE` status via `/app/status`
- REST API updates via `PUT /api/chat-notifications/{vendorId}/status?status=ONLINE`

When vendor disconnects:
- WebSocket sends `OFFLINE` status
- REST API updates via `PUT /api/chat-notifications/{vendorId}/status?status=OFFLINE`

## Backend Entity Mapping

### Vendor Collection
```json
{
  "_id": "507f1f77bcf86cd799439011",  // ✅ Use this for chat (vendorId)
  "vendorOrganizationId": "ORG-12345", // ❌ Don't use for chat
  "name": "Catering Co",
  "email": "vendor@example.com"
}
```

### Users Collection
```json
{
  "_id": "507f191e810c19729de860ea",  // ✅ Use this for chat (customerId)
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Orders Collection
```json
{
  "_id": "...",
  "customerId": "507f191e810c19729de860ea",  // ✅ MongoDB _id of customer
  "vendorOrganizationId": "507f1f77bcf86cd799439011", // ✅ MongoDB _id of vendor
  "customerName": "John Doe"  // Display name for UI
}
```

## Login Flow

When vendor logs in (`src/pages/Login.tsx`):
```typescript
// Backend returns
{
  "token": "...",
  "vendorId": "507f1f77bcf86cd799439011",  // MongoDB _id (✅ use this)
  "vendorOrganizationId": "ORG-12345",     // Organization code (❌ not for chat)
  "id": "507f1f77bcf86cd799439011"         // Convenience _id
}

// Frontend stores
localStorage.setItem("vendorId", "507f1f77bcf86cd799439011");
localStorage.setItem("vendorOrganizationId", "ORG-12345");
localStorage.setItem("id", "507f1f77bcf86cd799439011");
```

## Chat Message Flow

### 1. Vendor Sends Message to Customer
```typescript
// From Orders page - click MessageSquare icon
handleOpenChat(order.customerId, order.customerName);
// customerId = "507f191e810c19729de860ea" (MongoDB _id)

// Navigate to messaging
navigate(`/dashboard/messaging?userId=${customerId}&userName=${name}`);

// In Messaging component
const CURRENT_USER_ID = localStorage.getItem("vendorId"); // "507f1f77bcf86cd799439011"
const recipientId = searchParams.get('userId'); // "507f191e810c19729de860ea"

// Send message via WebSocket
webSocketService.sendMessage({
  senderId: "507f1f77bcf86cd799439011",    // Vendor MongoDB _id
  recipientId: "507f191e810c19729de860ea", // Customer MongoDB _id
  content: "Hello!"
});
```

### 2. Backend Processing
```java
@MessageMapping("/chat")
public void sendMessage(ChatMessage message) {
    // message.senderId = "507f1f77bcf86cd799439011" (vendor _id)
    // message.recipientId = "507f191e810c19729de860ea" (customer _id)
    
    // Save to MongoDB
    chatMessageRepository.save(message);
    
    // Update ChatNotificationMetadata for recipient
    chatNotificationService.updateNotification(
        message.recipientId,      // customer _id
        message.senderId,         // vendor _id
        message.content
    );
    
    // Send to recipient via WebSocket
    messagingTemplate.convertAndSendToUser(
        message.recipientId,  // "507f191e810c19729de860ea"
        "/queue/messages",
        notification
    );
}
```

### 3. Customer Receives Message
Customer's app subscribes to:
```javascript
stompClient.subscribe(`/user/507f191e810c19729de860ea/queue/messages`, callback);
```

## REST API Endpoints

All endpoints now use MongoDB ObjectIds:

```
GET  /api/messages/{senderId}/{recipientId}
     Example: GET /api/messages/507f1f77bcf86cd799439011/507f191e810c19729de860ea

GET  /api/chat-notifications/{userId}/chats
     Example: GET /api/chat-notifications/507f1f77bcf86cd799439011/chats

PUT  /api/chat-notifications/{userId}/mark-read/{otherParticipantId}
     Example: PUT /api/chat-notifications/507f1f77bcf86cd799439011/mark-read/507f191e810c19729de860ea

PUT  /api/chat-notifications/{userId}/status?status=ONLINE
     Example: PUT /api/chat-notifications/507f1f77bcf86cd799439011/status?status=ONLINE
```

## Validation Checklist

### ✅ Frontend Validation
- [ ] `localStorage.getItem("vendorId")` returns MongoDB ObjectId (24-char hex string)
- [ ] `order.customerId` contains MongoDB ObjectId, not username
- [ ] Chat list loads with correct vendor `_id`
- [ ] Messages send with correct sender/recipient `_id` values

### ✅ Backend Validation
- [ ] `ChatMessage.senderId` and `recipientId` are MongoDB ObjectIds
- [ ] `ChatNotificationMetadata.userId` is MongoDB ObjectId
- [ ] WebSocket topics use MongoDB ObjectIds in paths
- [ ] Database queries filter by `_id` fields correctly

## Troubleshooting

### Issue: "Vendor MongoDB ID not found"
**Cause:** `vendorId` not in localStorage  
**Solution:** Check login response, ensure backend returns `vendorId` field with MongoDB `_id`

### Issue: Messages not sending
**Cause:** Using wrong ID format (e.g., vendorOrganizationId instead of vendorId)  
**Solution:** Verify `CURRENT_USER_ID` in browser console:
```javascript
console.log(localStorage.getItem("vendorId")); // Should be 24-char hex
```

### Issue: Chat list empty
**Cause:** Backend can't find ChatNotificationMetadata with given vendorId  
**Solution:** 
1. Verify vendorId matches `_id` in vendors collection
2. Check MongoDB indexes on chat_notifications collection
3. Send a test message to create metadata

### Issue: Online status not updating
**Cause:** REST API call failing after WebSocket connects  
**Solution:** Check network tab for PUT `/chat-notifications/{vendorId}/status` call

## Testing Commands

### Check localStorage
```javascript
// In browser console
console.log('Vendor ID:', localStorage.getItem("vendorId"));
console.log('Vendor Org ID:', localStorage.getItem("vendorOrganizationId"));
console.log('Convenience ID:', localStorage.getItem("id"));
```

### Verify MongoDB ObjectId Format
```javascript
const vendorId = localStorage.getItem("vendorId");
const isValidObjectId = /^[a-f\d]{24}$/i.test(vendorId);
console.log('Valid ObjectId:', isValidObjectId); // Should be true
```

### Test Chat API
```javascript
import { chatApi } from './lib/chatApi';

const vendorId = localStorage.getItem("vendorId");
const customerId = "507f191e810c19729de860ea"; // From order

chatApi.getChatHistory(vendorId, customerId)
  .then(messages => console.log('Chat history:', messages))
  .catch(err => console.error('Error:', err));
```

## Migration Notes

If upgrading from old system:
1. ✅ Update all chat API calls to use `vendorId` instead of `vendorOrganizationId`
2. ✅ Verify backend ChatMessage collection uses MongoDB ObjectIds
3. ✅ Update ChatNotificationMetadata to store MongoDB `_id` values
4. ✅ Re-index chat_notifications collection if needed
5. ✅ Clear localStorage and re-login to get correct vendorId

## Summary

| Component | Old ID | New ID | Why |
|-----------|--------|--------|-----|
| Vendor identification | `vendorOrganizationId` | `vendorId` | Must use MongoDB `_id` |
| Customer identification | username | `customerId` (_id) | Must use MongoDB `_id` |
| WebSocket topics | organization code | MongoDB ObjectId | Backend expects `_id` |
| REST API endpoints | organization code | MongoDB ObjectId | Database queries by `_id` |

**Key Takeaway:** Always use MongoDB `_id` fields for chat participants, never use organization codes or usernames.
