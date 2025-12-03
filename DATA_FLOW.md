# WebSocket Data Flow Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │   Messaging      │────────▶│   useWebSocket   │                 │
│  │   Component      │         │      Hook        │                 │
│  └──────────────────┘         └──────────────────┘                 │
│           │                            │                             │
│           │                            │                             │
│           ▼                            ▼                             │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │    Chat API      │         │   WebSocket      │                 │
│  │   (REST/HTTP)    │         │    Service       │                 │
│  └──────────────────┘         └──────────────────┘                 │
│           │                            │                             │
└───────────┼────────────────────────────┼─────────────────────────────┘
            │                            │
            │ HTTP                       │ WebSocket (STOMP)
            │                            │
┌───────────┼────────────────────────────┼─────────────────────────────┐
│           ▼                            ▼                             │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │   REST           │         │   WebSocket      │                 │
│  │   Controller     │         │   Controller     │                 │
│  └──────────────────┘         └──────────────────┘                 │
│           │                            │                             │
│           │                            │                             │
│           ▼                            ▼                             │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │                  │         │   STOMP Message  │                 │
│  │   Chat Service   │◀────────│     Broker       │                 │
│  │                  │         │                  │                 │
│  └──────────────────┘         └──────────────────┘                 │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────┐                                               │
│  │    Database      │                                               │
│  │   (Messages)     │                                               │
│  └──────────────────┘                                               │
│                                                                      │
│                    Backend (Spring Boot)                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Message Flow Diagrams

### 1. Sending a Message

```
User                 Frontend              WebSocket           Backend              Database
 │                      │                     │                    │                    │
 │  Type & Send         │                     │                    │                    │
 │─────────────────────▶│                     │                    │                    │
 │                      │                     │                    │                    │
 │                      │  sendMessage()      │                    │                    │
 │                      │────────────────────▶│                    │                    │
 │                      │                     │                    │                    │
 │                      │                     │  /app/chat         │                    │
 │                      │                     │───────────────────▶│                    │
 │                      │                     │                    │                    │
 │                      │                     │                    │  Save Message      │
 │                      │                     │                    │───────────────────▶│
 │                      │                     │                    │                    │
 │                      │                     │                    │  Message Saved     │
 │                      │                     │                    │◀───────────────────│
 │                      │                     │                    │                    │
 │                      │                     │  /user/{id}/queue/messages              │
 │                      │                     │◀───────────────────│                    │
 │                      │                     │                    │                    │
 │  Message Displayed   │  onMessageReceived  │                    │                    │
 │◀─────────────────────│◀────────────────────│                    │                    │
 │                      │                     │                    │                    │
```

### 2. Receiving a Message

```
Sender                Frontend A           WebSocket            Backend            Frontend B            Receiver
  │                      │                    │                    │                   │                    │
  │  Send Message        │                    │                    │                   │                    │
  │─────────────────────▶│                    │                    │                   │                    │
  │                      │                    │                    │                   │                    │
  │                      │  STOMP /app/chat   │                    │                   │                    │
  │                      │───────────────────▶│                    │                   │                    │
  │                      │                    │                    │                   │                    │
  │                      │                    │  Process Message   │                   │                    │
  │                      │                    │───────────────────▶│                   │                    │
  │                      │                    │                    │                   │                    │
  │                      │                    │                    │  /user/B/queue/messages              │
  │                      │                    │                    │──────────────────▶│                    │
  │                      │                    │                    │                   │                    │
  │                      │                    │                    │                   │  Notification      │
  │                      │                    │                    │                   │───────────────────▶│
  │                      │                    │                    │                   │                    │
  │                      │                    │  Mark Delivered    │                   │                    │
  │                      │                    │                    │◀──────────────────│                    │
  │                      │                    │                    │                   │                    │
```

### 3. Typing Indicator Flow

```
User                 Frontend              WebSocket           Backend            Recipient
 │                      │                     │                    │                    │
 │  Start Typing        │                     │                    │                    │
 │─────────────────────▶│                     │                    │                    │
 │                      │                     │                    │                    │
 │                      │  sendTypingStatus() │                    │                    │
 │                      │────────────────────▶│                    │                    │
 │                      │                     │                    │                    │
 │                      │                     │  /app/typing       │                    │
 │                      │                     │───────────────────▶│                    │
 │                      │                     │                    │                    │
 │                      │                     │                    │  /user/{id}/queue/typing
 │                      │                     │                    │───────────────────▶│
 │                      │                     │                    │                    │
 │                      │                     │                    │  "typing..." shown │
 │                      │                     │                    │                    │
 │  Stop Typing         │                     │                    │                    │
 │  (3s timeout)        │                     │                    │                    │
 │─────────────────────▶│                     │                    │                    │
 │                      │                     │                    │                    │
 │                      │  sendTypingStatus() │                    │                    │
 │                      │  (false)            │                    │                    │
 │                      │────────────────────▶│───────────────────▶│───────────────────▶│
 │                      │                     │                    │                    │
 │                      │                     │                    │  Indicator hidden  │
 │                      │                     │                    │                    │
```

### 4. Read Receipt Flow

```
Sender               Frontend A           WebSocket            Backend            Frontend B            Recipient
  │                      │                    │                    │                   │                    │
  │                      │                    │                    │                   │  Open Chat         │
  │                      │                    │                    │                   │◀───────────────────│
  │                      │                    │                    │                   │                    │
  │                      │                    │                    │  markAsRead()     │                    │
  │                      │                    │                    │◀──────────────────│                    │
  │                      │                    │                    │                   │                    │
  │                      │                    │                    │  Update DB        │                    │
  │                      │                    │                    │  (status=READ)    │                    │
  │                      │                    │                    │                   │                    │
  │                      │                    │  /app/read         │                   │                    │
  │                      │                    │◀───────────────────│                   │                    │
  │                      │                    │                    │                   │                    │
  │                      │  /user/A/queue/read│                    │                   │                    │
  │                      │◀───────────────────│                    │                   │                    │
  │                      │                    │                    │                   │                    │
  │  ✓✓ Read Shown       │                    │                    │                   │                    │
  │◀─────────────────────│                    │                    │                   │                    │
  │                      │                    │                    │                   │                    │
```

### 5. Connection & Status Flow

```
User                 Frontend              WebSocket           Backend            Other Users
 │                      │                     │                    │                    │
 │  Open App            │                     │                    │                    │
 │─────────────────────▶│                     │                    │                    │
 │                      │                     │                    │                    │
 │                      │  connect()          │                    │                    │
 │                      │────────────────────▶│                    │                    │
 │                      │                     │                    │                    │
 │                      │                     │  CONNECT           │                    │
 │                      │                     │───────────────────▶│                    │
 │                      │                     │                    │                    │
 │                      │                     │  CONNECTED         │                    │
 │                      │                     │◀───────────────────│                    │
 │                      │                     │                    │                    │
 │                      │  onConnected()      │                    │                    │
 │                      │◀────────────────────│                    │                    │
 │                      │                     │                    │                    │
 │                      │  sendUserStatus()   │                    │                    │
 │                      │  (ONLINE)           │                    │                    │
 │                      │────────────────────▶│                    │                    │
 │                      │                     │                    │                    │
 │                      │                     │  /app/status       │                    │
 │                      │                     │───────────────────▶│                    │
 │                      │                     │                    │                    │
 │                      │                     │                    │  /topic/status     │
 │                      │                     │                    │───────────────────▶│
 │                      │                     │                    │                    │
 │                      │                     │                    │  Green Dot Shown   │
 │                      │                     │                    │                    │
 │  Close App           │                     │                    │                    │
 │─────────────────────▶│                     │                    │                    │
 │                      │                     │                    │                    │
 │                      │  sendUserStatus()   │                    │                    │
 │                      │  (OFFLINE)          │                    │                    │
 │                      │────────────────────▶│───────────────────▶│───────────────────▶│
 │                      │                     │                    │                    │
 │                      │  disconnect()       │                    │  Gray Dot Shown    │
 │                      │────────────────────▶│                    │                    │
 │                      │                     │                    │                    │
```

## Subscription Channels

### Private Channels (Per User)
```
/user/{userId}/queue/messages   → Receives private messages
/user/{userId}/queue/typing     → Receives typing indicators
/user/{userId}/queue/read       → Receives read receipts
```

### Public Channels (Broadcast)
```
/topic/status                   → Receives all user status updates
```

## Message Destinations

### Send Messages To
```
/app/chat      → Send a chat message
/app/typing    → Send typing status
/app/read      → Send read receipt
/app/status    → Send user status update
```

## State Management

```
┌─────────────────────────────────────────────────┐
│         Frontend State (React)                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  • messages[]          - All chat messages       │
│  • conversationList[]  - All conversations       │
│  • selectedConversation - Current chat           │
│  • isTyping           - Typing indicator state   │
│  • isConnected        - WebSocket status         │
│  • messageText        - Current input text       │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Error Handling Flow

```
Error Occurs          Frontend              WebSocket           Backend
    │                    │                     │                   │
    │  Connection Lost   │                     │                   │
    │───────────────────▶│                     │                   │
    │                    │                     │                   │
    │                    │  onWebSocketError   │                   │
    │                    │◀────────────────────│                   │
    │                    │                     │                   │
    │                    │  setIsConnected     │                   │
    │                    │  (false)            │                   │
    │                    │                     │                   │
    │  UI Update         │                     │                   │
    │  • Show Disconnected                     │                   │
    │  • Disable Input   │                     │                   │
    │  • Show Error Toast│                     │                   │
    │                    │                     │                   │
    │                    │  Auto-Reconnect     │                   │
    │                    │  (after 5s)         │                   │
    │                    │────────────────────▶│                   │
    │                    │                     │                   │
    │                    │                     │  CONNECT          │
    │                    │                     │──────────────────▶│
    │                    │                     │                   │
    │                    │                     │  CONNECTED        │
    │                    │                     │◀──────────────────│
    │                    │                     │                   │
    │                    │  onConnected()      │                   │
    │                    │◀────────────────────│                   │
    │                    │                     │                   │
    │  UI Update         │                     │                   │
    │  • Show Connected  │                     │                   │
    │  • Enable Input    │                     │                   │
    │  • Show Success    │                     │                   │
    │                    │                     │                   │
```

## Performance Considerations

### Message Batching
- Messages are sent individually via WebSocket
- Consider batching for high-frequency updates

### Subscription Management
- Subscribe once per user on connection
- Unsubscribe on disconnect
- Resubscribe on reconnection

### State Updates
- Use optimistic updates for sent messages
- Update local state immediately
- Sync with server response

### Auto-Scroll
- Only scroll if user is at bottom
- Don't interrupt user if scrolled up

---

**Architecture Type**: Client-Server with WebSocket  
**Protocol**: STOMP over WebSocket/SockJS  
**Pattern**: Pub/Sub with private queues  
