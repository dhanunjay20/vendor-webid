import { useEffect, useState, useCallback } from 'react';
import { 
  webSocketService, 
  ChatMessage,
  MessageStatus,
  ChatNotification, 
  TypingStatus, 
  UserStatus 
} from '@/lib/websocket';

interface UseWebSocketOptions {
  userId: string;
  onMessageReceived?: (notification: ChatNotification) => void;
  onTypingReceived?: (typing: TypingStatus) => void;
  onReadReceived?: (notification: ChatNotification) => void;
  onUserStatusReceived?: (status: UserStatus) => void;
  autoConnect?: boolean;
}

export function useWebSocket({
  userId,
  onMessageReceived,
  onTypingReceived,
  onReadReceived,
  onUserStatusReceived,
  autoConnect = true,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<any>(null);

  const connect = useCallback(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleError = (err: any) => {
      setIsConnected(false);
      setError(err);
    };

    webSocketService.connect(
      userId,
      onMessageReceived || (() => {}),
      onTypingReceived || (() => {}),
      onReadReceived || (() => {}),
      onUserStatusReceived || (() => {}),
      handleConnected,
      handleError
    );
  }, [userId, onMessageReceived, onTypingReceived, onReadReceived, onUserStatusReceived]);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: ChatMessage) => {
    webSocketService.sendMessage(message);
  }, []);

  const sendTypingStatus = useCallback((recipientId: string, isTyping: boolean) => {
    // Infer sender type from local storage (vendor app uses `vendorId`)
    const vendorId = localStorage.getItem("vendorId");
    const senderType: 'VENDOR' | 'USER' = vendorId ? 'VENDOR' : 'USER';
    webSocketService.sendTypingStatus(recipientId, isTyping, senderType);
  }, []);

  const sendReadReceipt = useCallback((senderId: string, messageId: string) => {
    webSocketService.sendReadReceipt(senderId, messageId);
  }, []);

  const sendUserStatus = useCallback((status: 'ONLINE' | 'OFFLINE' | 'AWAY') => {
    webSocketService.sendUserStatus(status);
  }, []);

  useEffect(() => {
    if (autoConnect && userId) {
      connect();
    }

    return () => {
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, userId, connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    sendTypingStatus,
    sendReadReceipt,
    sendUserStatus,
  };
}
