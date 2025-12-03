# WebSocket Real-Time Messaging Integration

This document explains the WebSocket integration for real-time messaging between vendors and clients.

## Overview

The application uses STOMP over WebSocket with SockJS fallback for real-time bidirectional communication. The backend is a Spring Boot application with the following endpoints:

### Backend Configuration

- **WebSocket Endpoint**: `http://localhost:8080/ws`
- **STOMP Prefixes**:
  - Application destination: `/app`
  - User destination: `/user`
  - Topic/Queue: `/topic`, `/queue`

## Architecture

### Frontend Components

1. **WebSocket Service** (`src/lib/websocket.ts`)
   - Manages WebSocket connection lifecycle
   - Handles STOMP messaging protocol
   - Provides methods for sending/receiving messages

2. **Chat API** (`src/lib/chatApi.ts`)
   - REST API client for chat operations
   - Fetches chat history
   - Marks messages as read/delivered

3. **Messaging Component** (`src/pages/Messaging.tsx`)
   - Main UI component for chat interface
   - Integrates WebSocket service and Chat API
   - Manages local state and UI updates

### Message Flow

#### Sending Messages
1. User types message and clicks send
2. Message sent via STOMP to `/app/chat`
3. Backend processes and routes to recipient via `/user/{recipientId}/queue/messages`
4. Local UI updates immediately (optimistic update)

#### Receiving Messages
1. Subscribe to `/user/{userId}/queue/messages`
2. Receive ChatNotification from backend
3. Update messages list and conversation list
4. Mark message as delivered via REST API

#### Typing Indicators
1. Send typing status via `/app/typing`
2. Receive status on `/user/{userId}/queue/typing`
3. Display "typing..." indicator

#### Read Receipts
1. When messages are read, send receipt via `/app/read`
2. Receive confirmation on `/user/{userId}/queue/read`
3. Update message status to READ

#### User Status
1. Send status (ONLINE/OFFLINE/AWAY) via `/app/status`
2. Receive updates on `/topic/status`
3. Update user status indicators

## Features

### ✅ Implemented

- Real-time message sending and receiving
- Typing indicators
- Read receipts (✓, ✓✓, ✓✓ Read)
- Online/offline status indicators
- Automatic reconnection
- Message delivery status
- Chat history loading
- Unread message count
- Conversation list
- Auto-scroll to latest message

### 🎨 UI Features

- Connection status indicator
- Status dots for users (green=online, yellow=away, gray=offline)
- Message bubbles with timestamps
- Typing animation
- Disabled input when disconnected
- Toast notifications for new messages

## Data Models

### ChatMessage
```typescript
interface ChatMessage {
  id?: string;
  chatId?: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp?: string;
  status?: 'SENT' | 'DELIVERED' | 'READ';
}
```

### ChatNotification
```typescript
interface ChatNotification {
  id: string;
  senderId: string;
  content: string;
}
```

### TypingStatus
```typescript
interface TypingStatus {
  senderId: string;
  recipientId: string;
  typing: boolean;
}
```

### UserStatus
```typescript
interface UserStatus {
  userId: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
}
```

## API Endpoints

### WebSocket Endpoints
- `POST /app/chat` - Send a message
- `POST /app/typing` - Send typing status
- `POST /app/read` - Send read receipt
- `POST /app/status` - Send user status

### REST API Endpoints
- `GET /api/messages/{senderId}/{recipientId}` - Get chat history
- `GET /api/messages/chatId/{senderId}/{recipientId}` - Get chat ID
- `PUT /api/messages/delivered/{senderId}/{recipientId}` - Mark as delivered
- `PUT /api/messages/read/{senderId}/{recipientId}` - Mark as read

## Configuration

### Backend URL
Update the backend URL in the following files:

**`src/lib/websocket.ts`** (line 42):
```typescript
webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
```

**`src/lib/chatApi.ts`** (line 4):
```typescript
const API_BASE_URL = 'http://localhost:8080/api';
```

### Current User ID
In a production app, get this from authentication context. Currently hardcoded:

**`src/pages/Messaging.tsx`** (line 49):
```typescript
const CURRENT_USER_ID = "vendor-001";
```

## Usage

### Starting the Application

1. **Start Backend** (Spring Boot):
   ```bash
   ./mvnw spring-boot:run
   ```

2. **Start Frontend** (Vite):
   ```bash
   npm run dev
   ```

3. Navigate to the Messaging page

### Testing

To test the integration:

1. Open the application in two different browsers/tabs
2. Use different user IDs for each instance
3. Send messages between them
4. Observe real-time updates, typing indicators, and read receipts

## Dependencies

### Installed Packages
```json
{
  "sockjs-client": "^1.6.1",
  "@stomp/stompjs": "^7.0.0"
}
```

### Installation Command
```bash
npm install sockjs-client @stomp/stompjs
```

## Troubleshooting

### Connection Issues

**Problem**: WebSocket fails to connect
**Solution**: 
- Verify backend is running on port 8080
- Check CORS configuration in Spring Boot
- Verify firewall settings

**Problem**: Messages not received
**Solution**:
- Check browser console for errors
- Verify user IDs match backend expectations
- Check WebSocket connection status

### Performance Issues

**Problem**: Slow message delivery
**Solution**:
- Check network latency
- Verify backend message broker configuration
- Consider enabling message compression

## Future Enhancements

- [ ] File/image sharing
- [ ] Voice/video calls
- [ ] Group messaging
- [ ] Message search
- [ ] Message deletion
- [ ] Message editing
- [ ] Emoji reactions
- [ ] Push notifications
- [ ] Message encryption
- [ ] User blocking
- [ ] Message pinning
- [ ] Chat themes

## Security Considerations

1. **Authentication**: Implement proper authentication before connecting to WebSocket
2. **Authorization**: Verify users can only access their own messages
3. **Input Validation**: Sanitize message content on both frontend and backend
4. **Rate Limiting**: Implement rate limiting to prevent spam
5. **Encryption**: Consider end-to-end encryption for sensitive messages

## Best Practices

1. **Error Handling**: Always handle WebSocket disconnections gracefully
2. **Optimistic Updates**: Update UI immediately for better UX
3. **Persistence**: Store messages in backend database
4. **Cleanup**: Always disconnect WebSocket on component unmount
5. **Logging**: Log important events for debugging

## Support

For issues or questions:
- Check browser console for errors
- Review Spring Boot logs
- Verify network connectivity
- Check STOMP protocol messages in browser DevTools

---

**Last Updated**: December 3, 2025
