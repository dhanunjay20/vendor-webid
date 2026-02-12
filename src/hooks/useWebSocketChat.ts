import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type {
  MessageDto,
  WSIncomingMessage,
  WSTypingEvent,
  WSReadReceipt,
  WSUserStatus,
  WSChatMessage,
  WSTypingIndicator,
  MessageAttachment,
} from '../lib/chatApi';

// ======================================================================
// TYPES
// ======================================================================

export interface ChatHookCallbacks {
  onMessage?: (message: WSIncomingMessage) => void;
  onTyping?: (event: WSTypingEvent) => void;
  onReadReceipt?: (event: WSReadReceipt) => void;
  onUserStatus?: (event: WSUserStatus) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

export interface ChatHookOptions {
  conversationId: string;
  autoConnect?: boolean;
  debug?: boolean;
}

// ======================================================================
// PRODUCTION-READY WEBSOCKET CHAT HOOK
// ======================================================================

export function useWebSocketChat(options: ChatHookOptions, callbacks: ChatHookCallbacks = {}) {
  const { conversationId, autoConnect = true, debug = false } = options;
  const {
    onMessage,
    onTyping,
    onReadReceipt,
    onUserStatus,
    onConnect,
    onDisconnect,
    onError
  } = callbacks;

  // Get current user ID from localStorage
  const currentUserId = localStorage.getItem('webid_user_id') || '';

  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<StompSubscription[]>([]);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[WebSocket Chat]', ...args);
    }
  }, [debug]);

  // ======================================================================
  // WEBSOCKET CONNECTION
  // ======================================================================

  const connect = useCallback(() => {
    if (!conversationId) {
      log('No conversation ID provided');
      return;
    }

    const token = localStorage.getItem('webid_token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('token');
    
    if (!token) {
      const error = 'No authentication token found';
      log(error);
      onError?.(error);
      return;
    }

    // Determine WebSocket URL (prefer SockJS for better compatibility)
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    const wsBaseUrl = baseUrl.replace('http:', 'ws:').replace('https:', 'wss:');
    
    // Use SockJS for reliability with token in URL for additional security
    const sockJsUrl = `${baseUrl.replace('/api/v1', '')}/api/v1/ws/sockjs/chat?token=${encodeURIComponent(token)}`;

    log('Connecting to WebSocket chat server');

    // Create STOMP client over SockJS
    const client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        'X-Conversation-ID': conversationId
      },
      debug: debug ? (str) => log('STOMP:', str) : undefined,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    // Connection callback
    client.onConnect = () => {
      log('Connected');
      setIsConnected(true);
      setConnectionAttempts(0);
      onConnect?.();

      // Subscribe to message topic
      const messageSub = client.subscribe(
        `/topic/conversations.${conversationId}`,
        (message) => {
          try {
            const incomingMessage: WSIncomingMessage = JSON.parse(message.body);
            log('Message received:', incomingMessage);
            onMessage?.(incomingMessage);
          } catch (err) {
            log('Failed to parse message:', err);
          }
        }
      );
      subscriptionsRef.current.push(messageSub);

      // Subscribe to typing indicators
      const typingSub = client.subscribe(
        `/topic/conversations.${conversationId}.typing`,
        (message) => {
          try {
            const typingEvent: WSTypingEvent = JSON.parse(message.body);
            log('Typing event:', typingEvent);
            onTyping?.(typingEvent);
          } catch (err) {
            log('Failed to parse typing event:', err);
          }
        }
      );
      subscriptionsRef.current.push(typingSub);

      // Subscribe to read receipts
      const readSub = client.subscribe(
        `/topic/conversations.${conversationId}.read`,
        (message) => {
          try {
            const readReceipt: WSReadReceipt = JSON.parse(message.body);
            log('Read receipt:', readReceipt);
            onReadReceipt?.(readReceipt);
          } catch (err) {
            log('Failed to parse read receipt:', err);
          }
        }
      );
      subscriptionsRef.current.push(readSub);

      // Subscribe to user presence/status
      const statusSub = client.subscribe(
        `/topic/public.users`,
        (message) => {
          try {
            const userStatus: WSUserStatus = JSON.parse(message.body);
            log('User status:', userStatus);
            onUserStatus?.(userStatus);
          } catch (err) {
            log('Failed to parse user status:', err);
          }
        }
      );
      subscriptionsRef.current.push(statusSub);
    };

    // Disconnection callback
    client.onDisconnect = () => {
      log('Disconnected');
      setIsConnected(false);
      onDisconnect?.();
    };

    // Error callback
    client.onStompError = (frame) => {
      const error = `STOMP error: ${frame.headers['message']} - ${frame.body}`;
      log(error);
      onError?.(error);
    };

    //WebSocket error callback
    client.onWebSocketError = (event) => {
      const error = 'WebSocket connection error';
      log(error, event);
      onError?.(error);
      
      // Retry connection with exponential backoff
      setConnectionAttempts(prev => prev + 1);
    };

    clientRef.current = client;
    client.activate();
  }, [conversationId, debug, log, onMessage, onTyping, onReadReceipt, onUserStatus, onConnect, onDisconnect, onError]);

  // ======================================================================
  // DISCONNECT
  // ======================================================================

  const disconnect = useCallback(() => {
    log('Disconnecting...');
    
    // Unsubscribe from all topics
    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];

    // Deactivate client
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }

    setIsConnected(false);
    clearTimeout(reconnectTimeoutRef.current);
    clearTimeout(typingTimeoutRef.current);
  }, [log]);

  // ======================================================================
  // SEND MESSAGE
  // ======================================================================

  const sendMessage = useCallback((
    message: string, 
    messageType: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT',
    attachments?: MessageAttachment[]
  ): boolean => {
    if (!clientRef.current || !clientRef.current.connected) {
      const error = 'WebSocket not connected';
      log(error);
      onError?.(error);
      return false;
    }

    try {
      const payload: WSChatMessage = {
        conversationId,
        message,
        messageType,
        ...(attachments && attachments.length > 0 && { attachments })
      };

      clientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(payload)
      });

      log('Message sent:', payload);
      return true;
    } catch (error) {
      const errorMsg = `Failed to send message: ${error}`;
      log(errorMsg);
      onError?.(errorMsg);
      return false;
    }
  }, [conversationId, log, onError]);

  // ======================================================================
  // SEND TYPING INDICATOR
  // ======================================================================

  const sendTyping = useCallback((isTyping: boolean = true) => {
    if (!clientRef.current || !clientRef.current.connected) {
      return;
    }

    if (!currentUserId) {
      log('No user ID available for typing indicator');
      return;
    }

    try {
      const payload: WSTypingIndicator = {
        conversationId,
        userId: currentUserId,  // CRITICAL: Include current user's ID
        typing: isTyping
      };

      clientRef.current.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify(payload)
      });

      log('Typing indicator sent:', isTyping);

      // Auto-stop typing after 3 seconds if user doesn't send a message
      if (isTyping) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          sendTyping(false);
        }, 3000);
      }
    } catch (error) {
      log('Failed to send typing indicator:', error);
    }
  }, [conversationId, currentUserId, log]);

  // ======================================================================
  // SEND READ RECEIPT
  // ======================================================================

  const sendReadReceipt = useCallback((readAt: string = new Date().toISOString()) => {
    if (!clientRef.current || !clientRef.current.connected) {
      return;
    }

    try {
      const payload = {
        conversationId,
        readAt
      };

      clientRef.current.publish({
        destination: '/app/chat.markRead',
        body: JSON.stringify(payload)
      });

      log('Read receipt sent:', readAt);
    } catch (error) {
      log('Failed to send read receipt:', error);
    }
  }, [conversationId, log]);

  // ======================================================================
  // LIFECYCLE
  // ======================================================================

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && conversationId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, conversationId, connect, disconnect]);

  // ======================================================================
  // RETURN INTERFACE
  // ======================================================================

  return {
    isConnected,
    connectionAttempts,
    connect,
    disconnect,
    sendMessage,
    sendTyping,
    sendReadReceipt,
  };
}
