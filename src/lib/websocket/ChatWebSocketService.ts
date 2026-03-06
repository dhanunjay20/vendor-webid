/**
 * Chat WebSocket Service
 * 
 * Handles real-time chat messaging via WebSocket/STOMP protocol.
 * Automatically reconnects on failure, manages subscriptions, and provides
 * a clean API for sending/receiving messages.
 */

import SockJS from 'sockjs-client';
import type { IMessage, Frame } from '@stomp/stompjs';
import { Client } from '@stomp/stompjs';
import { getAuthorizationHeader } from '../tokenManager';

// ======================================================================
// TYPE DEFINITIONS
// ======================================================================

export interface MessagePayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderType: 'USER' | 'VENDOR' | 'SUPPORT';
  senderName?: string;
  message: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE';
  timestamp: string;
  createdAt?: string;
}

export interface TypingIndicatorPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ReadReceiptPayload {
  conversationId: string;
  messageIds: string[];
}

export type WebSocketMessageType = 
  | { type: 'message'; payload: MessagePayload }
  | { type: 'typing'; payload: TypingIndicatorPayload }
  | { type: 'read'; payload: ReadReceiptPayload };

export type MessageHandler = (msg: WebSocketMessageType) => void;

// ======================================================================
// WEBSOCKET SERVICE CLASS
// ======================================================================

export class ChatWebSocketService {
  private stompClient: Client | null = null;
  private isConnected = false;
  private activeSubscriptions: Map<string, string> = new Map();
  private messageHandlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageBuffer: Map<string, MessagePayload[]> = new Map();

  private get wsUrl(): string {
    const base = (import.meta.env.VITE_API_BASE || 'http://localhost:8080').replace(/\/$/, '');
    return `${base}/api/v1/ws`;
  }

  private get debug(): boolean {
    return import.meta.env.DEV === true;
  }

  /**
   * Connect to WebSocket server
   * @throws Error if connection fails after retries
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.stompClient?.connected) {
        this.log('Already connected to WebSocket');
        resolve();
        return;
      }

      this.log(`Connecting to WebSocket: ${this.wsUrl}`);

      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken') || '';
        this.stompClient = new Client({
          // Use SockJS with JWT token in query param for proper authentication
          webSocketFactory: () => {
            return new SockJS(`${this.wsUrl}?token=${encodeURIComponent(token)}`);
          },

          // Also send in STOMP connect headers as fallback
          connectHeaders: {
            Authorization: token ? `Bearer ${token}` : '',
            'X-Client-Type': 'vendor-ui',
          },

          // Debug mode for development
          debug: (msg: string) => {
            if (this.debug) {
              console.log('[WebSocket]', msg);
            }
          },

          // Reconnection settings
          reconnectDelay: this.reconnectDelay,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,

          // Connection successful
          onConnect: (frame: Frame) => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.log('✅ WebSocket connected successfully');

            // Resubscribe to any conversations that were active before disconnect
            this.resubscribeToAll();

            // Flush any buffered messages
            this.flushMessageBuffer();

            resolve();
          },

          // STOMP protocol error
          onStompError: (frame: Frame) => {
            const error = `STOMP error: ${frame.body || 'Unknown error'}`;
            this.log(`❌ ${error}`);
            this.handleDisconnect();
            reject(new Error(error));
          },

          // WebSocket connection error
          onWebSocketError: (event: Event) => {
            const error = `WebSocket error: ${event instanceof Event ? event.type : String(event)}`;
            this.log(`❌ ${error}`);
            this.handleDisconnect();
            reject(new Error(error));
          },

          // Disconnection
          onDisconnect: () => {
            this.log('⚠️  WebSocket disconnected');
            this.handleDisconnect();
          },
        });

        this.stompClient.activate();
      } catch (error) {
        this.log(`❌ Failed to initialize WebSocket: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  private handleDisconnect(): void {
    this.isConnected = false;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;

      this.log(
        `🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} ` +
        `in ${delay / 1000}s...`
      );

      setTimeout(() => {
        this.connect().catch((err) => {
          this.log(`Reconnection attempt failed: ${err.message}`);
        });
      }, delay);
    } else {
      this.log(
        '❌ Max reconnection attempts reached. Manual reconnect required.'
      );
    }
  }

  /**
   * Resubscribe to all active conversations after reconnect
   */
  private resubscribeToAll(): void {
    this.log(`Resubscribing to ${this.activeSubscriptions.size} conversations...`);

    this.activeSubscriptions.forEach((subscriptionId, conversationId) => {
      this.subscribeToConversation(conversationId, () => {
        // Handler already registered, just resubscribe
      });
    });
  }

  /**
   * Subscribe to messages for a specific conversation
   * @param conversationId The conversation ID to subscribe to
   * @param handler Callback when message is received
   * @returns Unsubscribe function
   */
  subscribeToConversation(
    conversationId: string,
    handler?: (msg: MessagePayload) => void
  ): () => void {
    if (!this.stompClient?.connected) {
      this.log(
        `⚠️  WebSocket not connected. Subscription queued for ${conversationId}`
      );

      // Queue attempt to subscribe when connection is ready
      const retryInterval = setInterval(() => {
        if (this.stompClient?.connected) {
          clearInterval(retryInterval);
          this.subscribeToConversation(conversationId, handler);
        }
      }, 1000);

      return () => clearInterval(retryInterval);
    }

    const topic = `/topic/conversations.${conversationId}`;
    this.log(`Subscribing to topic: ${topic}`);

    try {
      const subscription = this.stompClient.subscribe(topic, (message: IMessage) => {
        try {
          const payload: MessagePayload = JSON.parse(message.body);

          this.log(`📨 Message received from conversation ${conversationId}`);

          // Call specific handler
          handler?.(payload);

          // Call all registered global handlers
          this.messageHandlers.forEach((globalHandler) => {
            globalHandler({
              type: 'message',
              payload,
            });
          });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          console.error('Raw message body:', message.body);
        }
      });

      // Store subscription for cleanup
      this.activeSubscriptions.set(conversationId, subscription.id);

      // Return unsubscribe function
      return () => {
        this.log(`Unsubscribing from topic: ${topic}`);
        subscription.unsubscribe();
        this.activeSubscriptions.delete(conversationId);
      };
    } catch (error) {
      this.log(`❌ Failed to subscribe to ${topic}: ${error}`);
      throw error;
    }
  }

  /**
   * Send message via WebSocket
   * @param conversationId The conversation to send message to
   * @param message The message text
   * @param messageType The type of message (TEXT, IMAGE, FILE)
   * @throws Error if WebSocket is not connected
   */
  async sendMessage(
    conversationId: string,
    message: string,
    messageType: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT'
  ): Promise<void> {
    if (!this.stompClient?.connected) {
      const error = 'WebSocket not connected. Cannot send message.';
      this.log(`❌ ${error}`);
      throw new Error(error);
    }

    return new Promise((resolve, reject) => {
      try {
        this.log(`📤 Sending message to conversation ${conversationId}`);

        const payload = {
          conversationId,
          message,
          messageType,
        };

        this.stompClient!.publish({
          destination: '/app/chat.sendMessage',
          body: JSON.stringify(payload),
        });

        // Message published immediately
        this.log('✅ Message published to server');
        resolve();
      } catch (error) {
        this.log(`❌ Exception while sending message: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Send typing indicator to notify other participants
   * @param conversationId The conversation ID
   * @param isTyping Whether user is currently typing
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    if (!this.stompClient?.connected) {
      this.log('⚠️  WebSocket not connected. Cannot send typing indicator.');
      return;
    }

    try {
      const payload = {
        conversationId,
        isTyping,
      };

      this.stompClient.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify(payload),
      });

      this.log(`✍️  Typing indicator sent: ${isTyping ? 'typing' : 'stopped'}`);
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  /**
   * Send read receipt for messages
   * @param conversationId The conversation ID
   * @param messageIds Array of message IDs that were read
   */
  sendReadReceipt(conversationId: string, messageIds: string[]): void {
    if (!this.stompClient?.connected) {
      this.log('⚠️  WebSocket not connected. Cannot send read receipt.');
      return;
    }

    try {
      const payload = {
        conversationId,
        messageIds,
      };

      this.stompClient.publish({
        destination: '/app/chat.markRead',
        body: JSON.stringify(payload),
      });

      this.log(`✓ Read receipt sent for ${messageIds.length} messages`);
    } catch (error) {
      console.error('Failed to send read receipt:', error);
    }
  }

  /**
   * Register a handler for all incoming WebSocket messages
   * @param handler Callback for all messages
   * @returns Unsubscribe function
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    this.log(`Registered message handler (total: ${this.messageHandlers.length})`);

    // Return unsubscribe function
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
      this.log(`Unregistered message handler (total: ${this.messageHandlers.length})`);
    };
  }

  /**
   * Get current connection status
   */
  getIsConnected(): boolean {
    return this.isConnected && this.stompClient?.connected === true;
  }

  /**
   * Get number of active subscriptions
   */
  getActiveSubscriptionCount(): number {
    return this.activeSubscriptions.size;
  }

  /**
   * Disconnect from WebSocket and clean up
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.stompClient) {
        resolve();
        return;
      }

      // Unsubscribe from all conversations
      this.activeSubscriptions.forEach((subscriptionId) => {
        try {
          this.stompClient?.unsubscribe(subscriptionId);
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });

      this.activeSubscriptions.clear();
      this.messageHandlers = [];

      try {
        this.stompClient.deactivate();
        this.isConnected = false;
        this.log('✅ WebSocket disconnected cleanly');
        resolve();
      } catch (error) {
        console.error('Error disconnecting:', error);
        resolve();
      }
    });
  }

  /**
   * Buffer a message if connection is down (for offline support)
   * @param conversationId The conversation ID
   * @param message The message to buffer
   */
  private bufferMessage(conversationId: string, message: MessagePayload): void {
    if (!this.messageBuffer.has(conversationId)) {
      this.messageBuffer.set(conversationId, []);
    }
    this.messageBuffer.get(conversationId)!.push(message);
    this.log(`📦 Buffered message for conversation ${conversationId}`);
  }

  /**
   * Flush all buffered messages
   */
  private flushMessageBuffer(): void {
    this.messageBuffer.forEach((messages, conversationId) => {
      this.log(`🔄 Flushing ${messages.length} buffered messages for ${conversationId}`);

      messages.forEach((msg) => {
        this.messageHandlers.forEach((handler) => {
          handler({
            type: 'message',
            payload: msg,
          });
        });
      });
    });

    this.messageBuffer.clear();
  }

  /**
   * Utility method for logging (respects debug flag)
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[ChatWebSocket] ${message}`);
    }
  }
}

// ======================================================================
// SINGLETON INSTANCE
// ======================================================================

export const chatWebSocketService = new ChatWebSocketService();

export default chatWebSocketService;
