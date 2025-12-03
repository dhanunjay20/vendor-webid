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
import { 
  webSocketService, 
  ChatMessage as WSChatMessage, 
  MessageStatus,
  ChatNotification, 
  TypingStatus, 
  UserStatus 
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
  status?: 'ONLINE' | 'OFFLINE' | 'AWAY';
  isTyping?: boolean;
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

// Current vendor user ID - Use MongoDB _id for chat system
// vendorId is the MongoDB ObjectId (_id field from vendors collection)
const CURRENT_USER_ID = localStorage.getItem("vendorId") || localStorage.getItem("id") || "";

if (!CURRENT_USER_ID) {
  console.error('Vendor MongoDB ID not found in localStorage. Chat functionality requires vendorId.');
  console.log('Available localStorage keys:', Object.keys(localStorage));
  console.log('localStorage contents:', {
    vendorId: localStorage.getItem('vendorId'),
    id: localStorage.getItem('id'),
    vendorOrganizationId: localStorage.getItem('vendorOrganizationId'),
    userId: localStorage.getItem('userId')
  });
}

export default function Messaging() {
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load chat list from backend
  const loadChatList = async () => {
    if (!CURRENT_USER_ID) {
      console.warn('Cannot load chat list: vendorId not found');
      return;
    }
    
    try {
      const chatList = await chatNotificationApi.getChatList(CURRENT_USER_ID);
      // Filter out invalid chat entries where participant ID or name is missing
      const conversations: Conversation[] = chatList
        .filter(chat => chat.otherParticipantId && chat.otherParticipantName)
        .map((chat) => ({
          id: chat.otherParticipantId,
          name: chat.otherParticipantName || 'Unknown User',
          avatar: chat.otherParticipantProfileUrl,
          lastMessage: chat.lastMessageContent || 'Start a conversation...',
          time: chat.lastMessageTimestamp 
            ? formatTimestamp(chat.lastMessageTimestamp)
            : 'Now',
          unread: chat.unreadCount || 0,
          orderId: 'Order',
          userId: chat.otherParticipantId,
          status: (chat.onlineStatus as 'ONLINE' | 'OFFLINE' | 'AWAY') || 'OFFLINE',
          isTyping: chat.isTyping || false,
        }));
      setConversationList(conversations);
    } catch (error) {
      console.error('Error loading chat list:', error);
      // Set empty list on error to prevent crashes
      setConversationList([]);
    }
  };

  // Format timestamp to readable time
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Handle incoming chat from Orders page
  useEffect(() => {
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    
    if (userId && userName) {
      // Load chat list to get the latest data
      loadChatList().then(() => {
        // Check if conversation already exists
        let existingConv = conversationList.find(c => c.userId === userId);
        
        if (!existingConv) {
          // Create new conversation
          const newConv: Conversation = {
            id: userId,
            name: decodeURIComponent(userName),
            avatar: undefined,
            lastMessage: "Start a conversation...",
            time: "Now",
            unread: 0,
            orderId: "New",
            userId: userId,
            status: 'OFFLINE',
          };
          setConversationList(prev => [newConv, ...prev]);
          existingConv = newConv;
        }
        
        // Select the conversation
        setSelectedConversation(existingConv);
      });
    }
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
    loadChatList();
    
    const pollInterval = setInterval(() => {
      loadChatList();
    }, 10000); // Poll every 10 seconds for real-time updates
    
    return () => clearInterval(pollInterval);
  }, []);

  // Connect to WebSocket on mount
  useEffect(() => {
    if (!CURRENT_USER_ID) {
      console.error('Cannot connect to WebSocket: vendorId not found');
      toast({
        title: "Connection error",
        description: "Vendor ID not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    const handleMessageReceived = (notification: ChatNotification) => {
      // Add received message to the chat
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

      // Reload chat list to get updated unread counts
      loadChatList();

      // Mark as delivered
      chatApi.markAsDelivered(notification.senderId, CURRENT_USER_ID).catch(console.error);

      // Get sender name from conversation list
      const senderName = conversationList.find(c => c.userId === notification.senderId)?.name || 'Unknown User';
      
      // Show notification
      notifyNewMessage(
        notification.senderId,
        senderName,
        notification.content.substring(0, 50) + (notification.content.length > 50 ? '...' : '')
      );
    };

    const handleTypingReceived = (typingStatus: TypingStatus) => {
      if (selectedConversation && typingStatus.senderId === selectedConversation.userId) {
        setIsTyping(typingStatus.typing);
      }
      
      // Update conversation list typing status
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.userId === typingStatus.senderId
            ? { ...conv, isTyping: typingStatus.typing }
            : conv
        )
      );
    };

    const handleReadReceived = (notification: ChatNotification) => {
      // Update message status to READ
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === CURRENT_USER_ID && msg.recipientId === notification.senderId
            ? { ...msg, status: MessageStatus.READ }
            : msg
        )
      );
    };

    const handleUserStatusReceived = (status: UserStatus) => {
      // Update user online status
      setConversationList((prev) =>
        prev.map((conv) =>
          conv.userId === status.userId ? { ...conv, status: status.status } : conv
        )
      );
    };

    const handleConnected = () => {
      setIsConnected(true);
      
      // Update online status in chat notifications backend
      chatNotificationApi.updateOnlineStatus(CURRENT_USER_ID, 'ONLINE')
        .catch(err => console.error('Failed to update online status:', err));
      
      toast({
        title: "Connected",
        description: "Real-time messaging is active",
      });
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      toast({
        title: "Connection error",
        description: "Failed to connect to messaging service",
        variant: "destructive",
      });
    };

    // Connect to WebSocket
    webSocketService.connect(
      CURRENT_USER_ID,
      handleMessageReceived,
      handleTypingReceived,
      handleReadReceived,
      handleUserStatusReceived,
      handleConnected,
      handleError
    );

    // Cleanup on unmount
    return () => {
      // Update offline status before disconnecting
      chatNotificationApi.updateOnlineStatus(CURRENT_USER_ID, 'OFFLINE')
        .catch(err => console.error('Failed to update offline status:', err));
      
      webSocketService.disconnect();
    };
  }, []);

  // Load chat history when conversation changes
  useEffect(() => {
    if (!selectedConversation) return;
    
    const loadChatHistory = async () => {
      try {
        const history = await chatApi.getChatHistory(CURRENT_USER_ID, selectedConversation.userId);
        const formattedMessages: Message[] = history.map((msg) => ({
          id: msg.id || '',
          sender: msg.senderId === CURRENT_USER_ID ? 'vendor' : 'client',
          senderId: msg.senderId,
          recipientId: msg.recipientId,
          text: msg.content,
          time: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          status: msg.status,
        }));
        setMessages(formattedMessages);

        // Mark messages as read
        await chatApi.markAsRead(selectedConversation.userId, CURRENT_USER_ID);
        
        // Mark chat notification as read
        await chatNotificationApi.markChatAsRead(CURRENT_USER_ID, selectedConversation.userId);
        
        // Reload chat list to update unread counts
        loadChatList();
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Don't show error toast for empty chat history
      }
    };

    loadChatHistory();
  }, [selectedConversation]);

  const handleSendMessage = () => {
    if (messageText.trim() && isConnected) {
      const chatMessage: WSChatMessage = {
        senderId: CURRENT_USER_ID,
        recipientId: selectedConversation.userId,
        content: messageText.trim(),
        timestamp: new Date().toISOString(),
      };

      // Send via WebSocket
      webSocketService.sendMessage(chatMessage);

      // Add to local state
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

      // Reload chat list to update last message
      loadChatList();

      setMessageText("");

      // Stop typing indicator
      webSocketService.sendTypingStatus(selectedConversation.userId, false);
    }
  };

  const handleTyping = () => {
    if (!isConnected) return;

    // Send typing indicator
    webSocketService.sendTypingStatus(selectedConversation.userId, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      webSocketService.sendTypingStatus(selectedConversation.userId, false);
    }, 3000);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ONLINE':
        return 'text-green-500';
      case 'AWAY':
        return 'text-yellow-500';
      case 'OFFLINE':
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Messaging</h1>
        <p className="text-muted-foreground">
          Communicate with your clients in real-time
          {isConnected && <span className="ml-2 text-green-500">● Connected</span>}
          {!isConnected && <span className="ml-2 text-red-500">● Disconnected</span>}
        </p>
      </div>

      {!CURRENT_USER_ID ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-2">Chat Unavailable</h2>
            <p className="text-muted-foreground mb-4">
              Vendor ID not found. Please log out and log in again.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">{/* Conversations List */}
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <div className="border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-10" />
              </div>
            </div>
            <ScrollArea className="h-[600px]">
              {conversationList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <p className="text-sm text-muted-foreground">Start chatting from the Orders page</p>
                </div>
              ) : (
                conversationList.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`flex cursor-pointer items-start gap-3 border-b p-4 transition-smooth hover:bg-accent ${
                      selectedConversation?.id === conv.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={conv.avatar} />
                        <AvatarFallback>{conv.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <Circle
                        className={`absolute bottom-0 right-0 h-3 w-3 fill-current ${getStatusColor(conv.status)}`}
                      />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{conv.name}</p>
                        <span className="text-xs text-muted-foreground">{conv.time}</span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {conv.isTyping ? (
                          <span className="italic text-primary">typing...</span>
                        ) : (
                          conv.lastMessage
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Order: {conv.orderId}</p>
                    </div>
                    {conv.unread > 0 && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {conv.unread}
                      </div>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        {selectedConversation ? (
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={selectedConversation.avatar} />
                      <AvatarFallback>{selectedConversation.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute bottom-0 right-0 h-3 w-3 fill-current ${getStatusColor(selectedConversation.status)}`}
                    />
                  </div>
                  <div>
                    <p className="font-medium">{selectedConversation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.orderId}
                      {selectedConversation.status === 'ONLINE' && ' • Online'}
                      {selectedConversation.status === 'AWAY' && ' • Away'}
                      {selectedConversation.status === 'OFFLINE' && ' • Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="h-[480px] p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === "vendor" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender === "vendor"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="text-xs opacity-70">{msg.time}</p>
                            {msg.sender === "vendor" && msg.status && (
                              <span className="text-xs opacity-70">
                                {msg.status === MessageStatus.SENT && '✓'}
                                {msg.status === MessageStatus.DELIVERED && '✓✓'}
                                {msg.status === MessageStatus.READ && '✓✓ Read'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="max-w-[70%] rounded-lg bg-muted p-3">
                        <p className="text-sm text-muted-foreground italic">typing...</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t p-4">
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
                    className="resize-none"
                    disabled={!isConnected}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    size="icon" 
                    className="h-auto"
                    disabled={!isConnected || !messageText.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardContent className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Select a conversation to start messaging</p>
                <p className="text-sm text-muted-foreground mt-2">Or click the message icon from the Orders page</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      )}
    </div>
  );
}
