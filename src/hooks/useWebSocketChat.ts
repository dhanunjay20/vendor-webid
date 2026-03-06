import { useEffect, useRef, useCallback, useState } from 'react';
import { chatWebSocketService, type MessagePayload, type WebSocketMessageType } from '../lib/websocket/ChatWebSocketService';
import { getAccessToken } from '../lib/tokenManager';
import type { MessageAttachment } from '../lib/chatApi';

// ======================================================================
// TYPES
// ======================================================================

export interface ChatHookCallbacks {
  onMessage?: (message: MessagePayload) => void;
  onTyping?: (event: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onReadReceipt?: (event: { conversationId: string; messageIds: string[] }) => void;
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

/**
 * Hook for real-time chat via WebSocket
 * 
 * - Auto-connects on mount
 * - Auto-disconnects on unmount
 * - Handles reconnection automatically
 * - Provides methods for sending messages, typing indicators, and read receipts
 * 
 * @example
 * const { isConnected, sendMessage } = useWebSocketChat(
 *   { conversationId: '123', autoConnect: true },
 *   { onMessage: (msg) => console.log(msg) }
 * );
 */
export function useWebSocketChat(
  options: ChatHookOptions,
  callbacks: ChatHookCallbacks = {}
) {
  const { conversationId, autoConnect = true, debug = false } = options;
  const {
    onMessage,
    onTyping,
    onReadReceipt,
    onConnect,
    onDisconnect,
    onError,
  } = callbacks;

  const [isConnected, setIsConnected] = useState(false);
  const unsubscribeRef = useRef<(() => void)[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Only for logging
  const log = useCallback(
    (...args: any[]) => {
      if (debug) {
        console.log('[useWebSocketChat]', ...args);
      }
    },
    [debug]
  );

  // ======================================================================
  // CONNECTION LIFECYCLE
  // ======================================================================

  const setupConnection = useCallback(() => {
    if (!conversationId) {
      const error = 'No conversation ID provided';
      log(error);
      onError?.(error);
      return;
    }

    if (!getAccessToken()) {
      const error = 'No authentication token available';
      log(error);
      onError?.(error);
      return;
    }

    (async () => {
      try {
        // Connect to WebSocket service
        await chatWebSocketService.connect();
        log('Connected to chat server');
        setIsConnected(true);
        onConnect?.();

        // Subscribe to messages for this conversation
        const unsubscribeMessages = chatWebSocketService.subscribeToConversation(
          conversationId,
          (msg: MessagePayload) => {
            log('Message received:', msg);
            onMessage?.(msg);
          }
        );
        unsubscribeRef.current.push(unsubscribeMessages);

        // Register global message handler for other event types
        const unsubscribeGlobal = chatWebSocketService.onMessage(
          (wsMessage: WebSocketMessageType) => {
            if (wsMessage.type === 'typing' && wsMessage.payload.conversationId === conversationId) {
              log('Typing indicator:', wsMessage.payload);
              onTyping?.(wsMessage.payload);
            } else if (wsMessage.type === 'read' && wsMessage.payload.conversationId === conversationId) {
              log('Read receipt:', wsMessage.payload);
              onReadReceipt?.(wsMessage.payload);
            }
          }
        );
        unsubscribeRef.current.push(unsubscribeGlobal);
      } catch (error) {
        const errorMsg = `Failed to connect: ${error instanceof Error ? error.message : String(error)}`;
        log('Connection error:', errorMsg);
        onError?.(errorMsg);
        setIsConnected(false);
      }
    })();
  }, [conversationId, debug, log, onConnect, onError, onMessage, onReadReceipt, onTyping]);

  const teardownConnection = useCallback(() => {
    log('Disconnecting from chat server');
    
    // Unsubscribe from all topics
    unsubscribeRef.current.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    unsubscribeRef.current = [];

    // Clear typing timeout
    clearTimeout(typingTimeoutRef.current);

    // Update state but don't disconnect service (it may be used by other components)
    setIsConnected(false);
    onDisconnect?.();
  }, [log, onDisconnect]);

  // ======================================================================
  // PUBLIC API - MESSAGE SENDING
  // ======================================================================

  const sendMessage = useCallback(
    async (
      message: string,
      messageType: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT'
    ) => {
      if (!chatWebSocketService.getIsConnected()) {
        const error = 'WebSocket not connected. Cannot send message.';
        log(error);
        onError?.(error);
        throw new Error(error);
      }

      try {
        log('Sending message:', { conversationId, message, messageType });
        await chatWebSocketService.sendMessage(conversationId, message, messageType);
        return true;
      } catch (error) {
        const errorMsg = `Failed to send message: ${error instanceof Error ? error.message : String(error)}`;
        log(errorMsg);
        onError?.(errorMsg);
        throw error;
      }
    },
    [conversationId, log, onError]
  );

  const sendTypingIndicator = useCallback(
    (isTyping: boolean = true) => {
      if (!chatWebSocketService.getIsConnected()) {
        log('WebSocket not connected. Cannot send typing indicator.');
        return;
      }

      try {
        log(`Sending typing indicator: ${isTyping}`);
        chatWebSocketService.sendTypingIndicator(conversationId, isTyping);

        // Auto-stop typing after 3 seconds if not continued
        if (isTyping) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            sendTypingIndicator(false);
          }, 3000);
        } else {
          clearTimeout(typingTimeoutRef.current);
        }
      } catch (error) {
        console.error('Failed to send typing indicator:', error);
      }
    },
    [conversationId, log]
  );

  const sendReadReceipt = useCallback(
    (messageIds: string[]) => {
      if (!chatWebSocketService.getIsConnected()) {
        log('WebSocket not connected. Cannot send read receipt.');
        return;
      }

      try {
        log('Sending read receipt for messages:', messageIds);
        chatWebSocketService.sendReadReceipt(conversationId, messageIds);
      } catch (error) {
        console.error('Failed to send read receipt:', error);
      }
    },
    [conversationId, log]
  );

  // ======================================================================
  // LIFECYCLE MANAGEMENT
  // ======================================================================

  useEffect(() => {
    if (autoConnect && conversationId) {
      setupConnection();
    }

    return () => {
      teardownConnection();
    };
  }, [autoConnect, conversationId, setupConnection, teardownConnection]);

  // ======================================================================
  // RETURN HOOK INTERFACE
  // ======================================================================

  return {
    isConnected,
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
  };
}
