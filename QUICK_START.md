# Quick Start Guide - WebSocket Messaging

## Setup (Already Completed ✅)

1. **Dependencies Installed**
   ```bash
   npm install sockjs-client @stomp/stompjs
   ```

2. **Files Created**
   - `src/lib/websocket.ts` - WebSocket service
   - `src/lib/chatApi.ts` - REST API client
   - `src/hooks/use-websocket.ts` - React hook
   - `src/pages/Messaging.tsx` - Updated UI

## Configuration Needed

### 1. Backend URL Configuration

**If backend is NOT on `localhost:8080`, update these files:**

**File: `src/lib/websocket.ts` (line ~42)**
```typescript
webSocketFactory: () => new SockJS('http://YOUR_BACKEND_HOST:PORT/ws')
```

**File: `src/lib/chatApi.ts` (line 4)**
```typescript
const API_BASE_URL = 'http://YOUR_BACKEND_HOST:PORT/api';
```

### 2. User Authentication

**File: `src/pages/Messaging.tsx` (line 49)**

Replace:
```typescript
const CURRENT_USER_ID = "vendor-001";
```

With your auth context:
```typescript
const { user } = useAuth(); // or your auth hook
const CURRENT_USER_ID = user.id;
```

## Testing

### 1. Start Backend
```bash
# In your Spring Boot project directory
./mvnw spring-boot:run

# Or if using Gradle
./gradlew bootRun
```

### 2. Start Frontend
```bash
# Already in the correct directory
npm run dev
```

### 3. Test Features

**Send a Message:**
1. Navigate to Messaging page
2. Select a conversation
3. Type message and press Enter
4. Message appears instantly

**Typing Indicator:**
1. Start typing in the message box
2. Recipient sees "typing..." indicator
3. Stops after 3 seconds of inactivity

**Connection Status:**
- Green dot = Connected & Online
- Yellow dot = Away
- Gray dot = Offline
- Top-right shows "● Connected" or "● Disconnected"

## Component Usage

### Option 1: Direct WebSocket Service (Current Implementation)

```typescript
import { webSocketService } from '@/lib/websocket';

// In component
useEffect(() => {
  webSocketService.connect(
    userId,
    onMessageReceived,
    onTypingReceived,
    onReadReceived,
    onUserStatusReceived,
    onConnected,
    onError
  );

  return () => webSocketService.disconnect();
}, []);
```

### Option 2: Using Custom Hook (Cleaner)

```typescript
import { useWebSocket } from '@/hooks/use-websocket';

const {
  isConnected,
  sendMessage,
  sendTypingStatus,
  sendReadReceipt,
} = useWebSocket({
  userId: CURRENT_USER_ID,
  onMessageReceived: (msg) => { /* handle */ },
  onTypingReceived: (status) => { /* handle */ },
  // ... other callbacks
});
```

## API Reference

### WebSocket Methods

```typescript
// Send a message
webSocketService.sendMessage({
  senderId: "user-1",
  recipientId: "user-2",
  content: "Hello!",
  timestamp: new Date().toISOString()
});

// Send typing indicator
webSocketService.sendTypingStatus("recipient-id", true);

// Send read receipt
webSocketService.sendReadReceipt("sender-id", "message-id");

// Update user status
webSocketService.sendUserStatus("ONLINE"); // or "OFFLINE", "AWAY"
```

### REST API Methods

```typescript
// Get chat history
const messages = await chatApi.getChatHistory("user-1", "user-2");

// Get chat ID
const chatId = await chatApi.getChatId("user-1", "user-2");

// Mark as delivered
const count = await chatApi.markAsDelivered("sender-id", "recipient-id");

// Mark as read
const count = await chatApi.markAsRead("sender-id", "recipient-id");
```

## Common Issues

### Issue: "Disconnected" shows in UI

**Cause**: Backend not running or wrong URL
**Fix**: 
1. Verify backend is running: `curl http://localhost:8080/ws`
2. Check URLs in `websocket.ts` and `chatApi.ts`

### Issue: Messages not received

**Cause**: User IDs don't match
**Fix**: 
1. Check console logs for sent/received user IDs
2. Verify backend uses same user ID format

### Issue: CORS errors

**Cause**: Backend CORS configuration
**Fix**: In Spring Boot, update WebSocketConfig:
```java
registry.addEndpoint("/ws")
    .setAllowedOriginPatterns("*")  // or specific origin
    .withSockJS();
```

## Browser DevTools Debugging

### Network Tab
1. Filter: WS (WebSocket)
2. Look for connection to `/ws`
3. Check frames for STOMP messages

### Console
- WebSocket connection logs
- Message send/receive logs
- Error messages

## Production Checklist

- [ ] Update backend URLs (remove localhost)
- [ ] Integrate with auth system
- [ ] Add user ID from auth context
- [ ] Configure CORS properly
- [ ] Add error boundaries
- [ ] Implement retry logic
- [ ] Add loading states
- [ ] Test with multiple concurrent users
- [ ] Set up monitoring/logging
- [ ] Configure WebSocket timeouts

## Support Files

- **Full Documentation**: `WEBSOCKET_INTEGRATION.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Hook Example**: `src/pages/Messaging.hook-example.tsx`

---

**Ready to Use**: Yes ✅  
**Build Status**: Passing ✅  
**Backend Required**: Spring Boot on port 8080
