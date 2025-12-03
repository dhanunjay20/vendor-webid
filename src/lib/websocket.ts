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
  recipientId: string;
  typing: boolean;
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

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: {},
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

      // Subscribe to private message queue
      this.client?.subscribe(`/user/${userId}/queue/messages`, (message) => {
        const notification: ChatNotification = JSON.parse(message.body);
        console.log('Message received:', notification);
        onMessageReceived(notification);
      });

      // Subscribe to typing indicators
      this.client?.subscribe(`/user/${userId}/queue/typing`, (message) => {
        const typingStatus: TypingStatus = JSON.parse(message.body);
        console.log('Typing status received:', typingStatus);
        onTypingReceived(typingStatus);
      });

      // Subscribe to read receipts
      this.client?.subscribe(`/user/${userId}/queue/read`, (message) => {
        const readNotification: ChatNotification = JSON.parse(message.body);
        console.log('Read receipt received:', readNotification);
        onReadReceived(readNotification);
      });

      // Subscribe to user status updates
      this.client?.subscribe('/topic/status', (message) => {
        const userStatus: UserStatus = JSON.parse(message.body);
        console.log('User status received:', userStatus);
        onUserStatusReceived(userStatus);
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

  sendTypingStatus(recipientId: string, isTyping: boolean) {
    if (this.client && this.connected) {
      const typingStatus: TypingStatus = {
        senderId: this.userId,
        recipientId: recipientId,
        typing: isTyping,
      };
      this.client.publish({
        destination: '/app/typing',
        body: JSON.stringify(typingStatus),
      });
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
