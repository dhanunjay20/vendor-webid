// Alternative implementation using the custom useWebSocket hook
// This is a cleaner approach for the Messaging component

import { useState, useEffect, useRef } from "react";
import { Send, Phone, Mail, Search, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { ChatNotification, TypingStatus, UserStatus, ChatMessage as WSChatMessage, MessageStatus } from "@/lib/websocket";
import { chatApi } from "@/lib/chatApi";

interface Conversation {
  id: number;
  name: string;
  avatar: string | undefined;
  lastMessage: string;
  time: string;
  unread: number;
  orderId: string;
  userId: string;          // MongoDB ObjectId
  status?: 'ONLINE' | 'OFFLINE' | 'AWAY';
}

interface Message {
  id: string;
  sender: string;
  senderId: string;        // MongoDB ObjectId
  recipientId: string;     // MongoDB ObjectId
  text: string;
  time: string;
  status?: MessageStatus;
}

const conversations: Conversation[] = [
  {
    id: 1,
    name: "Sarah Chen",
    avatar: undefined,
    lastMessage: "Thanks for the quick response!",
    time: "2m ago",
    unread: 2,
    orderId: "ORD-1001",
    userId: "client-001",
    status: 'ONLINE',
  },
  {
    id: 2,
    name: "Mike Johnson",
    avatar: undefined,
    lastMessage: "Can we discuss the menu options?",
    time: "1h ago",
    unread: 0,
    orderId: "ORD-1002",
    userId: "client-002",
    status: 'OFFLINE',
  },
  {
    id: 3,
    name: "Emma Wilson",
    avatar: undefined,
    lastMessage: "Looking forward to the event!",
    time: "3h ago",
    unread: 1,
    orderId: "BID-003",
    userId: "client-003",
    status: 'AWAY',
  },
];

// Current vendor user ID (in real app, get from auth context)
const CURRENT_USER_ID = "vendor-001";

export default function MessagingWithHook() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation>(conversations[0]);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationList, setConversationList] = useState<Conversation[]>(conversations);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Use the custom WebSocket hook
  const {
    isConnected,
    sendMessage,
    sendTypingStatus,
    sendReadReceipt,
  } = useWebSocket({
    userId: CURRENT_USER_ID,
    onMessageReceived: (notification: ChatNotification) => {
      const newMessage: Message = {
        id: notification.id,
        sender: 'client',
        senderId: notification.senderId,
        recipientId: CURRENT_USER_ID,
        text: notification.content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: MessageStatus.DELIVERED,
      };

      setMessages((prev) => [...prev, newMessage]);
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.userId === notification.senderId
            ? { ...conv, lastMessage: notification.content, time: 'Just now', unread: conv.unread + 1 }
            : conv
        )
      );

      chatApi.markAsDelivered(notification.senderId, CURRENT_USER_ID).catch(console.error);

      toast({
        title: "New message",
        description: `From ${conversationList.find(c => c.userId === notification.senderId)?.name || 'Unknown'}`,
      });
    },
    onTypingReceived: (typingStatus: TypingStatus) => {
      if (typingStatus.senderId === selectedConversation.userId) {
        setIsTyping(typingStatus.typing);
      }
    },
    onReadReceived: (notification: ChatNotification) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === CURRENT_USER_ID && msg.recipientId === notification.senderId
            ? { ...msg, status: MessageStatus.READ }
            : msg
        )
      );
    },
    onUserStatusReceived: (status: UserStatus) => {
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.userId === status.userId ? { ...conv, status: status.status } : conv
        )
      );
    },
  });

  const handleSendMessage = () => {
    if (messageText.trim() && isConnected) {
      const chatMessage: WSChatMessage = {
        senderId: CURRENT_USER_ID,
        recipientId: selectedConversation.userId,
        content: messageText.trim(),
        timestamp: new Date().toISOString(),
      };

      sendMessage(chatMessage);

      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'vendor',
        senderId: CURRENT_USER_ID,
        recipientId: selectedConversation.userId,
        text: messageText.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: MessageStatus.SENT,
      };

      setMessages((prev) => [...prev, newMessage]);
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? { ...conv, lastMessage: messageText.trim(), time: 'Just now' }
            : conv
        )
      );

      setMessageText("");
      sendTypingStatus(selectedConversation.userId, false);
    }
  };

  const handleTyping = () => {
    if (!isConnected) return;

    sendTypingStatus(selectedConversation.userId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(selectedConversation.userId, false);
    }, 3000);
  };

  // ... (rest of the component implementation)
}
