import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Phone, Mail, Search, Circle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { WebSocketDebugPanel } from "@/components/WebSocketDebugPanel";
import {
  webSocketService,
  ChatMessage as WSChatMessage,
  MessageStatus,
  ChatNotification,
  TypingStatus,
  UserStatus,
} from "@/lib/websocket";
import { chatApi } from "@/lib/chatApi";
import { chatNotificationApi, ChatListItemDto } from "@/lib/chatNotificationApi";
import { notifyNewMessage } from "@/lib/notifications";

interface Conversation {
  id: string;
  name: string;
  avatar: string | undefined;
  lastMessage: string;
  time: string;
  unread: number;
  orderId: string;
  userId: string;
  status?: "ONLINE" | "OFFLINE" | "AWAY";
  isTyping?: boolean;
  typingSenderType?: "VENDOR" | "USER" | string;
  timestamp?: string; // For sorting
}

interface Message {
  id: string;
  sender: string;
  senderId: string; // MongoDB ObjectId
  recipientId: string; // MongoDB ObjectId
  text: string;
  time: string;
  status?: MessageStatus;
}

const Messaging: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Per-sender typing timeouts to auto-clear indicators when backend misses a stop event
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  // Debug state
  const [debugEvents, setDebugEvents] = useState<Array<{timestamp: string; type: string; data: any}>>([]);
  const [debugTypingStates, setDebugTypingStates] = useState<Record<string, boolean>>({});

  // Instead of module-level read, read user id into state so the component reacts
  const [currentUserId, setCurrentUserId] = useState<string>(
    () => localStorage.getItem("vendorId") || localStorage.getItem("id") || ""
  );

  // Keep a ref for conversationList to avoid stale closures inside websocket handlers
  const conversationListRef = useRef<Conversation[]>(conversationList);
  useEffect(() => {
    conversationListRef.current = conversationList;
  }, [conversationList]);

  // Listen to storage events so that logging in (or other tabs) updates this component
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "vendorId" || e.key === "id") {
        const newId = localStorage.getItem("vendorId") || localStorage.getItem("id") || "";
        setCurrentUserId(newId);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Request browser notification permission on component mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  // Format timestamp to readable time
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Load chat list from backend; accept optional userId (falls back to currentUserId)
  const loadChatList = async (userId = currentUserId) => {
    if (!userId) {
      console.warn("Cannot load chat list: vendorId not found");
      return;
    }

    try {
      const chatList: ChatListItemDto[] = await chatNotificationApi.getChatList(userId);
      const conversations: Conversation[] = chatList
        .filter((chat) => chat.participantId && chat.participantName)
        .map((chat) => ({
          id: chat.participantId,
          name: chat.participantName || "Unknown User",
          avatar: chat.participantProfileUrl,
          lastMessage: chat.lastMessage || "Start a conversation...",
          time: chat.lastMessageTimestamp ? formatTimestamp(chat.lastMessageTimestamp) : "Now",
          unread: chat.unreadCount || 0,
          orderId: "Order",
          userId: chat.participantId,
          status: (chat.onlineStatus as "ONLINE" | "OFFLINE" | "AWAY") || "OFFLINE",
          isTyping: chat.isTyping || false,
          timestamp: chat.lastMessageTimestamp || new Date().toISOString(),
        }));

      // Sort by latest message timestamp (most recent first)
      conversations.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });

      setConversationList(conversations);
    } catch (error) {
      console.error("Error loading chat list:", error);
      setConversationList([]);
    }
  };

  // Handle incoming chat from Orders page (via query params)
  useEffect(() => {
    const userId = searchParams.get("userId");
    const userName = searchParams.get("userName");

    if (userId && userName) {
      loadChatList().then(() => {
        // Use the ref to read latest conversation list to avoid stale closure
        let existingConv = conversationListRef.current.find((c) => c.userId === userId);

        if (!existingConv) {
          const newConv: Conversation = {
            id: userId,
            name: decodeURIComponent(userName),
            avatar: undefined,
            lastMessage: "Start a conversation...",
            time: "Now",
            unread: 0,
            orderId: "New",
            userId: userId,
            status: "OFFLINE",
            timestamp: new Date().toISOString(),
          };
          setConversationList((prev) => [newConv, ...prev]);
          existingConv = newConv;
        }

        setSelectedConversation(existingConv);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat list on mount and poll every 10 seconds
  useEffect(() => {
    // Initial load — subsequent updates come from WebSocket events
    loadChatList();

    // NOTE: polling removed to avoid frequent backend hits; WebSocket events
    // (message/typing/status) will trigger `loadChatList` when needed.
    return () => {};
    // we intentionally do not include currentUserId here to avoid rapid re-creation; loadChatList internally uses currentUserId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect to WebSocket when we have a user id
  useEffect(() => {
    if (!currentUserId) {
      console.error("Cannot connect to WebSocket: vendorId not found");
      toast({
        title: "Connection error",
        description: "Vendor ID not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    const handleMessageReceived = (notification: ChatNotification) => {
      const newMessage: Message = {
        id: notification.id,
        sender: "client",
        senderId: notification.senderId,
        recipientId: currentUserId,
        text: notification.content,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: MessageStatus.DELIVERED,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Reload chat list to get updated unread counts
      loadChatList();

      // Mark as delivered
      chatApi.markAsDelivered(notification.senderId, currentUserId).catch(console.error);

      // Get sender name from the latest conversation list ref
      const senderName =
        conversationListRef.current.find((c) => c.userId === notification.senderId)?.name || "Unknown User";

      // Show in-app notification with sound
      notifyNewMessage(
        notification.senderId,
        senderName,
        notification.content.substring(0, 50) + (notification.content.length > 50 ? "..." : "")
      );

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        const browserNotif = new Notification(`New message from ${senderName}`, {
          body: notification.content,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `msg-${notification.senderId}`,
          requireInteraction: false,
          silent: false,
        });

        browserNotif.onclick = () => {
          window.focus();
          const conv = conversationListRef.current.find((c) => c.userId === notification.senderId);
          if (conv) {
            setSelectedConversation(conv);
          }
          browserNotif.close();
        };
      }
    };

    const handleTypingReceived = (typingStatus: TypingStatus) => {
      // Debug logging
      const debugEvent = {
        timestamp: new Date().toLocaleTimeString(),
        type: 'TYPING_RECEIVED',
        data: { ...typingStatus, currentUserId, matches: typingStatus.recipientId === currentUserId }
      };
      setDebugEvents(prev => [...prev, debugEvent]);
      console.log('🔔 TYPING EVENT RECEIVED:', debugEvent);

      // Only handle typing notifications that are intended for this vendor
      if (typingStatus.recipientId && typingStatus.recipientId !== currentUserId) {
        console.warn('⚠️ Typing event ignored - not for this user', { recipientId: typingStatus.recipientId, currentUserId });
        return;
      }

      const sender = typingStatus.senderId;
      const senderType = typingStatus.senderType || undefined;
      const isTypingFlag = typeof (typingStatus as any).isTyping !== 'undefined'
        ? Boolean((typingStatus as any).isTyping)
        : Boolean(typingStatus.typing);

      // Clear any previous auto-clear timeout for this sender
      if (typingTimeoutsRef.current[sender]) {
        clearTimeout(typingTimeoutsRef.current[sender] as ReturnType<typeof setTimeout>);
        typingTimeoutsRef.current[sender] = null;
      }

      if (isTypingFlag) {
        console.log('✅ Showing typing indicator for:', sender);
        // Update debug state
        setDebugTypingStates(prev => ({ ...prev, [sender]: true }));

        // Show typing indicator for this sender
        if (selectedConversation && sender === selectedConversation.userId) {
          console.log('✅ Setting isTyping=true for selected conversation');
          setIsTyping(true);
          setSelectedConversation((prev) => (prev ? { ...prev, isTyping: true, typingSenderType: senderType } : prev));
        }

        setConversationList((prev) =>
          prev.map((conv) => (conv.userId === sender ? { ...conv, isTyping: true, typingSenderType: senderType } : conv))
        );

        // Auto-clear typing indicator after 4s if no further typing events arrive
        typingTimeoutsRef.current[sender] = setTimeout(() => {
          typingTimeoutsRef.current[sender] = null;
          setConversationList((prev) => prev.map((conv) => (conv.userId === sender ? { ...conv, isTyping: false, typingSenderType: undefined } : conv)));
          setSelectedConversation((prev) => (prev && prev.userId === sender ? { ...prev, isTyping: false, typingSenderType: undefined } : prev));
          if (selectedConversation && selectedConversation.userId === sender) {
            setIsTyping(false);
          }
        }, 4000);
      } else {
        console.log('🛑 Hiding typing indicator for:', sender);
        // Update debug state
        setDebugTypingStates(prev => ({ ...prev, [sender]: false }));

        // Explicit stop typing: clear timeout and hide indicator
        setConversationList((prev) => prev.map((conv) => (conv.userId === sender ? { ...conv, isTyping: false, typingSenderType: undefined } : conv)));
        setSelectedConversation((prev) => (prev && prev.userId === sender ? { ...prev, isTyping: false, typingSenderType: undefined } : prev));
        if (selectedConversation && selectedConversation.userId === sender) {
          setIsTyping(false);
        }
      }
    };

    const handleReadReceived = (notification: ChatNotification) => {
      setMessages((prev) =>
        prev.map((msg) =>
          // If the vendor sent the message and the other user notified read, mark read
          msg.senderId === currentUserId && msg.recipientId === notification.senderId
            ? { ...msg, status: MessageStatus.READ }
            : msg
        )
      );
    };

    const handleUserStatusReceived = (status: UserStatus) => {
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.userId === status.userId
            ? { ...conv, status: status.status }
            : conv
        )
      );
      // If the selected conversation is the one whose status changed, update it too
      setSelectedConversation((prev) =>
        prev && prev.userId === status.userId
          ? { ...prev, status: status.status }
          : prev
      );
    };

    const handleConnected = () => {
      setIsConnected(true);

      chatNotificationApi.updateOnlineStatus(currentUserId, "ONLINE").catch((err) => console.error("Failed to update online status:", err));

      toast({
        title: "Connected",
        description: "Real-time messaging is active",
      });
    };

    const handleError = (error: any) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      toast({
        title: "Connection error",
        description: "Failed to connect to messaging service",
        variant: "destructive",
      });
    };

    webSocketService.connect(
      currentUserId,
      handleMessageReceived,
      handleTypingReceived,
      handleReadReceived,
      handleUserStatusReceived,
      handleConnected,
      handleError
    );

    return () => {
      chatNotificationApi.updateOnlineStatus(currentUserId, "OFFLINE").catch((err) => console.error("Failed to update offline status:", err));
      webSocketService.disconnect();
    };
    // Only re-run when currentUserId changes (we want to connect once we have an id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // Listen for chat notifications from the notification context
  const { chatNotifications } = useNotifications();
  useEffect(() => {
    if (chatNotifications.length === 0) return;

    // Get the latest chat notification
    const latestNotification = chatNotifications[0];

    // Only process MESSAGE_SENT events (new messages)
    if (latestNotification.eventType === "MESSAGE_SENT") {
      console.log("💬 Processing chat notification from context:", latestNotification);

      // If this notification is for the currently selected conversation, add it to messages
      if (selectedConversation && latestNotification.senderId === selectedConversation.userId) {
        const newMessage: Message = {
          id: latestNotification.messageId,
          sender: selectedConversation.name,
          senderId: latestNotification.senderId,
          recipientId: latestNotification.recipientId,
          text: latestNotification.content || "",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: MessageStatus.DELIVERED,
        };

        setMessages((prev) => {
          // Avoid duplicate messages by checking if message already exists
          if (prev.find((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        // Mark as delivered via API
        chatApi.markAsDelivered(latestNotification.senderId, currentUserId).catch(console.error);
      } else {
        // Message is from a different conversation, just reload chat list
        loadChatList();
      }
    } else if (latestNotification.eventType === "MESSAGE_DELIVERED") {
      // Update message status in UI
      console.log("✓ Message delivered:", latestNotification.messageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === latestNotification.messageId ? { ...msg, status: MessageStatus.DELIVERED } : msg
        )
      );
    } else if (latestNotification.eventType === "MESSAGE_READ") {
      // Update message status in UI
      console.log("✓✓ Message read:", latestNotification.messageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === latestNotification.messageId ? { ...msg, status: MessageStatus.READ } : msg
        )
      );
    }
  }, [chatNotifications, selectedConversation, currentUserId]);

  // Load chat history when conversation changes
  useEffect(() => {
    if (!selectedConversation) return;

    const loadChatHistory = async () => {
      try {
        const history = await chatApi.getChatHistory(currentUserId, selectedConversation.userId);
        const formattedMessages: Message[] = history.map((msg: any) => ({
          id: msg.id || "",
          sender: msg.senderId === currentUserId ? "vendor" : "client",
          senderId: msg.senderId,
          recipientId: msg.recipientId,
          text: msg.content,
          time: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          status: msg.status,
        }));
        setMessages(formattedMessages);

        // Mark messages as read
        await chatApi.markAsRead(selectedConversation.userId, currentUserId);

        // Mark chat notification as read
        await chatNotificationApi.markChatAsRead(currentUserId, selectedConversation.userId);

        // Reload chat list to update unread counts
        loadChatList();
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };

    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  const handleSendMessage = () => {
    if (!selectedConversation) return;
    if (messageText.trim() && isConnected) {
      const chatMessage: WSChatMessage = {
        senderId: currentUserId,
        recipientId: selectedConversation.userId,
        content: messageText.trim(),
        timestamp: new Date().toISOString(),
      };

      webSocketService.sendMessage(chatMessage);

      const newMessage: Message = {
        id: Date.now().toString(),
        sender: "vendor",
        senderId: currentUserId,
        recipientId: selectedConversation.userId,
        text: messageText.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: MessageStatus.SENT,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Reload chat list to update last message
      loadChatList();

      setMessageText("");

      // Stop typing indicator
      webSocketService.sendTypingStatus(selectedConversation.userId, false, 'VENDOR');
    }
  };

  const handleTyping = () => {
    if (!isConnected || !selectedConversation) return;

    webSocketService.sendTypingStatus(selectedConversation.userId, true, 'VENDOR');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConversation) {
        webSocketService.sendTypingStatus(selectedConversation.userId, false, 'VENDOR');
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "ONLINE":
        return "text-green-500";
      case "AWAY":
        return "text-yellow-500";
      case "OFFLINE":
      default:
        return "text-gray-400";
    }
  };

  // Early return when vendor ID not available
  if (!currentUserId) {
    return (
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Messaging</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Communicate with your clients in real-time
            {isConnected && <span className="ml-2 text-green-500">● Connected</span>}
            {!isConnected && <span className="ml-2 text-red-500">● Disconnected</span>}
          </p>
        </div>

        <Card>
          <CardContent className="py-8 sm:py-12 text-center px-4">
            <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-red-600 mb-2">Chat Unavailable</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">Vendor ID not found. Please log out and log in again.</p>
            <Button onClick={() => (window.location.href = "/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Messaging</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Communicate with your clients in real-time
          {isConnected && <span className="ml-2 text-green-500">● Connected</span>}
          {!isConnected && <span className="ml-2 text-red-500">● Disconnected</span>}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 h-full">
        {/* Conversations List - Hidden on mobile when conversation is selected */}
        <Card className={`lg:col-span-1 flex flex-col h-full ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="border-b p-3 sm:p-4 flex-none">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-10 text-sm sm:text-base" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {conversationList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8 text-center">
                  <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">No conversations yet</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Start chatting from the Orders page</p>
                </div>
              ) : (
                conversationList.map((conv, idx) => (
                  <div
                    key={conv.id + '-' + conv.orderId + '-' + idx}
                    onClick={() => setSelectedConversation(conv)}
                    className={`flex cursor-pointer items-start gap-2 sm:gap-3 border-b p-3 sm:p-4 transition-smooth hover:bg-accent active:bg-accent/80 ${
                      selectedConversation?.id === conv.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={conv.avatar} />
                        <AvatarFallback>{conv.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <Circle className={`absolute bottom-0 right-0 h-3 w-3 fill-current ${getStatusColor(conv.status)}`} />
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm sm:text-base truncate">{conv.name}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{conv.time}</span>
                      </div>
                      <p className="truncate text-xs sm:text-sm text-muted-foreground">
                        {conv.isTyping ? <span className="italic text-primary">typing...</span> : conv.lastMessage}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">Order: {conv.orderId}</p>
                    </div>
                    {conv.unread > 0 && (
                      <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground shrink-0">
                        {conv.unread}
                      </div>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area - Full screen on mobile when conversation selected */}
        {selectedConversation ? (
          <Card className="lg:col-span-2 flex flex-col h-[calc(100vh-12rem)] sm:h-[calc(100vh-10rem)] lg:h-[600px] overflow-hidden">
            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
              {/* Chat Header - Sticky */}
              <div className="sticky top-0 z-10 bg-card flex items-center justify-between border-b p-3 sm:p-4 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {/* Back button on mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden shrink-0 h-8 w-8"
                    onClick={() => setSelectedConversation(null)}
                  >
                    ←
                  </Button>
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarImage src={selectedConversation.avatar} />
                      <AvatarFallback>{selectedConversation.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <Circle className={`absolute bottom-0 right-0 h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current ${getStatusColor(selectedConversation.status)}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{selectedConversation.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedConversation.orderId}
                      {selectedConversation.status === "ONLINE" && " • Online"}
                      {selectedConversation.status === "AWAY" && " • Away"}
                      {selectedConversation.status === "OFFLINE" && " • Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-2 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages - Only this area scrolls */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
                <div className="space-y-3 sm:space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center px-4">
                      <p className="text-sm sm:text-base text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "vendor" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] rounded-lg p-2.5 sm:p-3 break-words ${
                          msg.sender === "vendor" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{msg.text}</p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="text-xs opacity-70 whitespace-nowrap">{msg.time}</p>
                            {msg.sender === "vendor" && msg.status && (
                              <span className="text-xs opacity-70">
                                {msg.status === MessageStatus.SENT && "✓"}
                                {msg.status === MessageStatus.DELIVERED && "✓✓"}
                                {msg.status === MessageStatus.READ && "✓✓ Read"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] rounded-lg bg-muted p-2.5 sm:p-3">
                        <p className="text-xs sm:text-sm text-muted-foreground italic">
                          {selectedConversation?.typingSenderType === 'VENDOR'
                            ? `${selectedConversation?.name || 'Vendor'} is typing...`
                            : `${selectedConversation?.name || 'User'} is typing...`}
                        </p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input - Sticky at bottom */}
              <div className="sticky bottom-0 z-10 bg-card border-t p-3 sm:p-4 shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={2}
                    className="resize-none text-sm sm:text-base min-h-[44px]"
                    disabled={!isConnected}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    size="icon" 
                    className="h-auto min-h-[44px] min-w-[44px]" 
                    disabled={!isConnected || !messageText.trim()}
                  >
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="hidden lg:flex lg:col-span-2">
            <CardContent className="flex items-center justify-center h-[600px] w-full">
              <div className="text-center px-4">
                <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-base sm:text-lg font-medium text-muted-foreground">Select a conversation to start messaging</p>
                <p className="text-sm text-muted-foreground mt-2">Or click the message icon from the Orders page</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* WebSocket Debug Panel */}
      <WebSocketDebugPanel
        isConnected={isConnected}
        currentUserId={currentUserId}
        typingStatus={debugTypingStates}
        events={debugEvents}
      />
    </div>
  );
};

export default Messaging;
