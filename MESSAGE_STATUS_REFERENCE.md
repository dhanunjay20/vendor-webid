# Quick Reference - MessageStatus Enum

## Import Statement

```typescript
import { MessageStatus } from '@/lib/websocket';
```

## Enum Values

```typescript
MessageStatus.SENT      // Message sent by sender
MessageStatus.DELIVERED // Message delivered to recipient
MessageStatus.READ      // Message read by recipient
```

## Usage Examples

### Setting Status

```typescript
// When sending a message
const message: ChatMessage = {
  senderId: userId,
  recipientId: recipientId,
  content: "Hello!",
  status: MessageStatus.SENT
};

// When message is delivered
message.status = MessageStatus.DELIVERED;

// When message is read
message.status = MessageStatus.READ;
```

### Checking Status

```typescript
// Type-safe comparisons
if (message.status === MessageStatus.SENT) {
  console.log("Message sent");
}

if (message.status === MessageStatus.DELIVERED) {
  console.log("Message delivered");
}

if (message.status === MessageStatus.READ) {
  console.log("Message read");
}
```

### Switch Statement

```typescript
switch (message.status) {
  case MessageStatus.SENT:
    return '✓';
  case MessageStatus.DELIVERED:
    return '✓✓';
  case MessageStatus.READ:
    return '✓✓ Read';
  default:
    return '';
}
```

### UI Display

```tsx
// In React component
{message.status === MessageStatus.SENT && '✓'}
{message.status === MessageStatus.DELIVERED && '✓✓'}
{message.status === MessageStatus.READ && '✓✓ Read'}
```

### Array Filtering

```typescript
// Get all unread messages
const unreadMessages = messages.filter(
  msg => msg.status !== MessageStatus.READ
);

// Get all delivered but not read
const deliveredNotRead = messages.filter(
  msg => msg.status === MessageStatus.DELIVERED
);

// Get all sent messages
const sentMessages = messages.filter(
  msg => msg.senderId === currentUserId
);
```

### Status Icons Component

```tsx
const MessageStatusIcon = ({ status }: { status?: MessageStatus }) => {
  if (!status) return null;
  
  switch (status) {
    case MessageStatus.SENT:
      return <span className="text-gray-400">✓</span>;
    case MessageStatus.DELIVERED:
      return <span className="text-blue-400">✓✓</span>;
    case MessageStatus.READ:
      return <span className="text-blue-600">✓✓</span>;
    default:
      return null;
  }
};

// Usage
<MessageStatusIcon status={message.status} />
```

### Status Badge Component

```tsx
const MessageStatusBadge = ({ status }: { status?: MessageStatus }) => {
  const getStatusConfig = () => {
    switch (status) {
      case MessageStatus.SENT:
        return { text: 'Sent', color: 'bg-gray-500' };
      case MessageStatus.DELIVERED:
        return { text: 'Delivered', color: 'bg-blue-500' };
      case MessageStatus.READ:
        return { text: 'Read', color: 'bg-green-500' };
      default:
        return { text: 'Unknown', color: 'bg-gray-300' };
    }
  };
  
  const { text, color } = getStatusConfig();
  
  return (
    <span className={`px-2 py-1 rounded text-xs text-white ${color}`}>
      {text}
    </span>
  );
};
```

## Common Patterns

### Update Status Optimistically

```typescript
// Update UI immediately, then sync with server
const sendMessage = async (content: string) => {
  const tempMessage = {
    id: Date.now().toString(),
    content,
    status: MessageStatus.SENT  // Optimistic status
  };
  
  setMessages(prev => [...prev, tempMessage]);
  
  try {
    const savedMessage = await api.sendMessage(tempMessage);
    // Update with server response
    setMessages(prev => 
      prev.map(msg => 
        msg.id === tempMessage.id ? savedMessage : msg
      )
    );
  } catch (error) {
    // Handle error - maybe mark as failed
  }
};
```

### Status Transition Validation

```typescript
const canTransitionTo = (
  currentStatus: MessageStatus,
  newStatus: MessageStatus
): boolean => {
  const transitions: Record<MessageStatus, MessageStatus[]> = {
    [MessageStatus.SENT]: [MessageStatus.DELIVERED],
    [MessageStatus.DELIVERED]: [MessageStatus.READ],
    [MessageStatus.READ]: []  // Terminal state
  };
  
  return transitions[currentStatus]?.includes(newStatus) ?? false;
};

// Usage
if (canTransitionTo(message.status, MessageStatus.READ)) {
  message.status = MessageStatus.READ;
}
```

### Batch Status Update

```typescript
// Mark multiple messages as read
const markMultipleAsRead = (messageIds: string[]) => {
  setMessages(prev =>
    prev.map(msg =>
      messageIds.includes(msg.id)
        ? { ...msg, status: MessageStatus.READ }
        : msg
    )
  );
};
```

### Status Statistics

```typescript
// Get message statistics
const getMessageStats = (messages: Message[]) => {
  return {
    total: messages.length,
    sent: messages.filter(m => m.status === MessageStatus.SENT).length,
    delivered: messages.filter(m => m.status === MessageStatus.DELIVERED).length,
    read: messages.filter(m => m.status === MessageStatus.READ).length
  };
};

// Usage
const stats = getMessageStats(messages);
console.log(`${stats.read}/${stats.total} messages read`);
```

## Type Guards

```typescript
// Check if message has a valid status
const hasStatus = (message: Message): message is Message & { status: MessageStatus } => {
  return message.status !== undefined;
};

// Check if message is read
const isRead = (message: Message): boolean => {
  return message.status === MessageStatus.READ;
};

// Check if message is delivered or read
const isDeliveredOrRead = (message: Message): boolean => {
  return message.status === MessageStatus.DELIVERED || 
         message.status === MessageStatus.READ;
};
```

## WebSocket Integration

```typescript
// Send message with status
webSocketService.sendMessage({
  senderId: currentUserId,
  recipientId: recipientId,
  content: messageText,
  status: MessageStatus.SENT,
  timestamp: new Date().toISOString()
});

// Update status on delivery
chatApi.markAsDelivered(senderId, recipientId).then(() => {
  updateMessageStatus(messageId, MessageStatus.DELIVERED);
});

// Update status on read
chatApi.markAsRead(senderId, recipientId).then(() => {
  updateMessageStatus(messageId, MessageStatus.READ);
});
```

## Benefits Over String Literals

✅ **Type Safety**: Compile-time error detection  
✅ **Autocomplete**: IDE suggestions for enum values  
✅ **Refactoring**: Easy to rename across codebase  
✅ **Documentation**: Self-documenting code  
✅ **Backend Match**: Perfectly aligns with Java enum  
✅ **No Typos**: Impossible to mistype status values  

---

**Import Path**: `@/lib/websocket`  
**Type**: `enum`  
**Values**: `SENT`, `DELIVERED`, `READ`
