import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * Message delivery status enum matching backend
 */
export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

/**
 * ChatMessage interface matching backend entity
 */
export interface ChatMessage {
  id?: string;
  chatId?: string;
  senderId: string;        // MongoDB ObjectId of sender
  recipientId: string;     // MongoDB ObjectId of recipient
  content: string;
  timestamp?: string;      // ISO 8601 format
  status?: MessageStatus;
}

export interface ChatNotification {
  id: string;
  senderId: string;
  content: string;
}

export interface TypingStatus {
  senderId: string;
  recipientId?: string;
  vendorId?: string;
  senderType?: 'VENDOR' | 'USER';
  typing: boolean;
  isTyping?: boolean;
}

export interface UserStatus {
  userId: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
}

class WebSocketService {
  private client: Client | null = null;
  private connected: boolean = false;
  private reconnectDelay: number = 5000;
  private userId: string = '';

  constructor() {
    this.client = null;
    this.connected = false;
  }

  /**
   * Connect to WebSocket server
   * @param userId - MongoDB ObjectId (_id) of the vendor from vendors collection
   * @param onMessageReceived - Callback for new messages
   * @param onTypingReceived - Callback for typing indicators
   * @param onReadReceived - Callback for read receipts
   * @param onUserStatusReceived - Callback for user status updates
   * @param onConnected - Callback when connection is established
   * @param onError - Callback for errors
   */
  connect(
    userId: string,
    onMessageReceived: (notification: ChatNotification) => void,
    onTypingReceived: (typing: TypingStatus) => void,
    onReadReceived: (notification: ChatNotification) => void,
    onUserStatusReceived: (status: UserStatus) => void,
    onConnected?: () => void,
    onError?: (error: any) => void
  ) {
    this.userId = userId;

    const WS_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8080';
    
    // Attempt to include Authorization header from localStorage so server can map Principal
    const token = (typeof window !== 'undefined')
      ? (localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('idToken') || localStorage.getItem('jwt'))
      : null;

    const connectHeaders: Record<string, string> = {};
    if (token) connectHeaders['Authorization'] = `Bearer ${token}`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${WS_BASE_URL}/ws`),
      connectHeaders,
      debug: (str) => {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      console.log('WebSocket Connected');
      this.connected = true;

      // Subscribe to private message queue (use /user/queue/... - server routes to the authenticated user)
      this.client?.subscribe(`/user/queue/messages`, (message) => {
        const notification: ChatNotification = JSON.parse(message.body);
        console.log('Message received:', notification);
        onMessageReceived(notification);
      });

      // Subscribe to typing indicators on multiple possible destinations
      const typingHandler = (message: any) => {
        try {
          const raw = JSON.parse(message.body);

          // Normalize typing payload
          const toBool = (v: any) => {
            if (v === undefined || v === null) return undefined;
            if (typeof v === 'boolean') return v;
            if (typeof v === 'number') return v !== 0;
            const s = String(v).trim().toLowerCase();
            if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true;
            if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false;
            return false;
          };

          const rawIsTyping = (typeof raw.isTyping !== 'undefined') ? toBool(raw.isTyping) : toBool(raw.typing);

          const normalized: TypingStatus = {
            senderId: raw.senderId || raw.userId || raw.participantId || "",
            recipientId: raw.recipientId || raw.to || raw.recipient || undefined,
            vendorId: raw.vendorId || raw.vendor || undefined,
            senderType: raw.senderType || (raw.vendorId && raw.vendorId === this.userId ? 'VENDOR' : raw.senderType) || undefined,
            typing: !!rawIsTyping,
            isTyping: rawIsTyping,
          };

          console.log('Typing status received (normalized):', normalized, 'raw:', raw);
          onTypingReceived(normalized);
        } catch (err) {
          console.error('Failed to parse typing message:', err, message.body);
        }
      };

      this.client?.subscribe(`/user/queue/typing`, typingHandler);
      this.client?.subscribe(`/queue/typing`, typingHandler);
      this.client?.subscribe(`/topic/typing`, typingHandler);

      // Subscribe to read receipts
      this.client?.subscribe(`/user/queue/read`, (message) => {
        const readNotification: ChatNotification = JSON.parse(message.body);
        console.log('Read receipt received:', readNotification);
        onReadReceived(readNotification);
      });

      // Subscribe to user status updates
      this.client?.subscribe('/topic/status', (message) => {
        try {
          const raw = JSON.parse(message.body);

          // Normalize payload: backend may send different field names (userId, participantId, vendorId, id)
          const normalized: UserStatus = {
            userId: raw.userId || raw.participantId || raw.vendorId || raw.user || raw.id || "",
            status: (raw.status || raw.onlineStatus || raw.state || raw.connectionStatus || 'OFFLINE') as 'ONLINE' | 'OFFLINE' | 'AWAY',
          };

          console.log('User status received (normalized):', normalized, 'raw:', raw);
          if (onUserStatusReceived) onUserStatusReceived(normalized);
        } catch (err) {
          console.error('Failed to parse user status message:', err, message.body);
        }
      });

      // Send online status
      this.sendUserStatus('ONLINE');

      if (onConnected) {
        onConnected();
      }
    };

    this.client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
      if (onError) {
        onError(frame);
      }
    };

    this.client.onWebSocketError = (error) => {
      console.error('WebSocket error:', error);
      if (onError) {
        onError(error);
      }
    };

    this.client.activate();
  }

  sendMessage(chatMessage: ChatMessage) {
    if (this.client && this.connected) {
      this.client.publish({
        destination: '/app/chat',
        body: JSON.stringify(chatMessage),
      });
      console.log('Message sent:', chatMessage);
    } else {
      console.error('WebSocket is not connected');
    }
  }

  sendTypingStatus(recipientId: string, isTyping: boolean, senderType: 'VENDOR' | 'USER' = 'VENDOR') {
    if (this.client && this.connected) {
      const typingStatus: TypingStatus = {
        senderId: this.userId,
        recipientId: recipientId,
        vendorId: this.userId,
        senderType: senderType,
        // Provide both legacy `typing` and the newer `isTyping` property
        typing: isTyping,
        // @ts-ignore - allow extra field when serializing
        // include `isTyping` to match backend DTO JsonProperty
        isTyping: isTyping,
      };
      this.client.publish({
        destination: '/app/typing',
        body: JSON.stringify(typingStatus),
      });
      console.log('Typing status sent:', typingStatus);
    }
  }

  sendReadReceipt(senderId: string, messageId: string) {
    if (this.client && this.connected) {
      const readReceipt: ChatNotification = {
        id: messageId,
        senderId: senderId,
        content: 'READ',
      };
      this.client.publish({
        destination: '/app/read',
        body: JSON.stringify(readReceipt),
      });
    }
  }

  sendUserStatus(status: 'ONLINE' | 'OFFLINE' | 'AWAY') {
    if (this.client && this.connected) {
      const userStatus: UserStatus = {
        userId: this.userId,
        status: status,
      };
      this.client.publish({
        destination: '/app/status',
        body: JSON.stringify(userStatus),
      });
    }
  }

  disconnect() {
    if (this.client) {
      this.sendUserStatus('OFFLINE');
      this.client.deactivate();
      this.connected = false;
      console.log('WebSocket Disconnected');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const webSocketService = new WebSocketService();
