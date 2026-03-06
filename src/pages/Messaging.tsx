import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, Lock, Loader2, Menu, Paperclip, Image as ImageIcon, FileText, X,
  Check, CheckCheck, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  chatApi,
  type ConversationDto,
  type MessageDto,
  type WSIncomingMessage,
  type WSTypingEvent,
  type WSReadReceipt,
  type WSUserStatus,
} from "@/lib/chatApi";
import { useWebSocketChat, type ChatHookCallbacks } from "@/hooks/useWebSocketChat";
import { toast } from "sonner";

// ======================================================================
// MESSAGE BUBBLE COMPONENT
// ======================================================================

const MessageBubble = ({ message, isOwn, index }: { message: MessageDto; isOwn: boolean; index: number }) => {
  const isImage = message.messageType === "IMAGE";
  const isFile = message.messageType === "FILE";

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-slide-up`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-3 md:p-4 shadow-sm ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-card border border-border/50 rounded-tl-none"
        }`}
      >
        {!isOwn && message.senderName && (
          <p className="font-bold text-xs mb-1 text-primary">{message.senderName}</p>
        )}

        {isImage && message.attachments?.[0]?.fileUrl ? (
          <img
            src={message.attachments[0].fileUrl}
            alt="Shared image"
            className="rounded-lg max-w-full h-auto max-h-96 mb-2"
          />
        ) : isFile && message.attachments?.[0]?.fileUrl ? (
          <div className="flex items-center gap-2 p-2 bg-background/10 rounded-lg mb-2">
            <FileText className="h-6 w-6" />
            <a href={message.attachments[0].fileUrl} target="_blank" rel="noopener noreferrer" className="underline text-sm hover:opacity-80">
              {message.attachments[0].fileName || "File"}
            </a>
          </div>
        ) : (
          <p className="leading-relaxed break-words">{message.message}</p>
        )}

        <div className="flex items-center gap-2 justify-between mt-2">
          <span className={`text-[10px] ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isOwn && (
            <span className="text-[10px] text-primary-foreground/70">
              {message.isRead ? <CheckCheck className="h-3 w-3 inline text-blue-300" /> : <Check className="h-3 w-3 inline" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ======================================================================
// CONVERSATION LIST ITEM COMPONENT
// ======================================================================

const ConversationListItem = ({
  conversation,
  isSelected,
  isOnline,
  onClick,
  otherParticipant,
}: {
  conversation: ConversationDto;
  isSelected: boolean;
  isOnline: boolean;
  onClick: () => void;
  otherParticipant: { name: string; userId: string };
}) => {
  const unreadCount = conversation.unreadCount ? Object.values(conversation.unreadCount)[0] || 0 : 0;
  
  // Safely extract last message text from lastMessage object
  const lastMessageText = (() => {
    if (!conversation.lastMessage) return "No messages yet";
    if (typeof conversation.lastMessage === "object" && "message" in conversation.lastMessage) {
      return conversation.lastMessage.message;
    }
    return "No messages yet";
  })();

  return (
    <div onClick={onClick} className={`p-4 border-b border-border/30 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar className="h-12 w-12 border-2 border-background">
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {otherParticipant.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </Avatar>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background transition-colors ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold truncate">{otherParticipant.name || "Unknown"}</h3>
            {unreadCount > 0 && <Badge variant="default" className="ml-2 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs">{unreadCount}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {lastMessageText.substring(0, 50)}
          </p>
        </div>
      </div>
    </div>
  );
};

// ======================================================================
// MAIN MESSAGING PAGE COMPONENT (VENDOR)
// ======================================================================

const Messaging = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State: Conversations & Selection
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDto | null>(null);
  const [showChatList, setShowChatList] = useState(true);

  // State: Messages
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // State: Real-time indicators
  const [typingUserName, setTypingUserName] = useState<string | null>(null);
  const [recipientStatus, setRecipientStatus] = useState<"ONLINE" | "OFFLINE">("OFFLINE");

  // State: File upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // State: UI
  const [loading, setLoading] = useState(true);

  // Current user info
  const currentUserId = localStorage.getItem("webid_user_id") || "";
  const currentUserName = localStorage.getItem("webid_user_name") || "You";

  // ======================================================================
  // UTILITY FUNCTIONS
  // ======================================================================

  /**
   * Extract the USER participant from conversation
   * Vendor website (vendor-webid) always shows the USER in the conversation
   */
  const getOtherParticipant = useCallback((conversation: ConversationDto) => {
    if (!conversation.participants || conversation.participants.length === 0) {
      return { name: "Unknown", userId: "" };
    }
    const userParticipant = conversation.participants.find(
      (p) => p.userType === "USER"
    );
    return userParticipant || { name: "Unknown", userId: "" };
  }, []);

  // ======================================================================
  // WEBSOCKET CALLBACKS
  // ======================================================================

  const handleIncomingMessage = useCallback((wsMessage: WSIncomingMessage) => {
    console.log("[Messaging] Received message:", wsMessage.messageId);

    const messageDto: MessageDto = {
      messageId: wsMessage.messageId,
      conversationId: wsMessage.conversationId,
      senderId: wsMessage.senderId,
      senderType: wsMessage.senderType,
      senderName: wsMessage.senderName,
      message: typeof wsMessage.message === "string" ? wsMessage.message : String(wsMessage.message),
      messageType: wsMessage.messageType,
      attachments: wsMessage.attachments,
      timestamp: wsMessage.timestamp,
      isRead: wsMessage.senderId === currentUserId,
      createdAt: wsMessage.timestamp,
    };

    setMessages((prev) => {
      if (!prev.some((m) => m.messageId === messageDto.messageId)) {
        return [...prev, messageDto];
      }
      return prev;
    });

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  }, [currentUserId]);

  const handleTypingEvent = useCallback((event: { conversationId: string; userId: string; isTyping: boolean }) => {
    if (event.userId === currentUserId) return;

    if (event.isTyping && selectedConversation) {
      const otherParticipant = getOtherParticipant(selectedConversation);
      setTypingUserName(otherParticipant.name || "Someone");
    } else {
      setTypingUserName(null);
    }
  }, [currentUserId, selectedConversation, getOtherParticipant]);

  const handleReadReceipt = useCallback((event: { conversationId: string; messageIds: string[] }) => {
    console.log("[Messaging] Read receipt received");
    setMessages((prev) =>
      prev.map((msg) =>
        msg.senderId === currentUserId ? { ...msg, isRead: true } : msg
      )
    );
  }, [currentUserId]);

  const handleUserStatus = useCallback((event: any) => {
    if (!selectedConversation) return;

    const otherParticipant = getOtherParticipant(selectedConversation);
    
    // Update online status if the event is for the recipient (user)
    if (event.userId === otherParticipant.userId) {
      setRecipientStatus(event.status === "ONLINE" ? "ONLINE" : "OFFLINE");
      console.log(`[Messaging] ${otherParticipant.name} is now ${event.status}`);
    }
  }, [selectedConversation, getOtherParticipant]);

  // WebSocket hook
  const wsCallbacks: ChatHookCallbacks = {
    onMessage: handleIncomingMessage,
    onTyping: handleTypingEvent,
    onReadReceipt: handleReadReceipt,
  };

  const { isConnected, sendMessage, sendTypingIndicator, sendReadReceipt } = useWebSocketChat(
    {
      conversationId: selectedConversation?.conversationId || "",
      autoConnect: Boolean(selectedConversation),
      debug: true,
    },
    wsCallbacks
  );

  // ======================================================================
  // DATA LOADING
  // ======================================================================

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatApi.getConversations(0, 50);

      if (response.success && response.data) {
        setConversations(response.data);
        console.log("[Messaging] Loaded conversations:", response.data.length);
      } else {
        toast.error(response.message || "Failed to load conversations");
      }
    } catch (error: any) {
      console.error("[Messaging] Error loading conversations:", error);
      toast.error("Error loading conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await chatApi.getMessages(conversationId, 0, 50);

      if (response.success && response.data) {
        setMessages(response.data);
        console.log("[Messaging] Loaded messages:", response.data.length);
      } else {
        toast.error("Failed to load message history");
      }
    } catch (error: any) {
      console.error("[Messaging] Error loading messages:", error);
      toast.error("Error loading messages");
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const markAsRead = useCallback(async () => {
    if (!selectedConversation) return;

    try {
      await chatApi.markAsRead(selectedConversation.conversationId);
    } catch (error) {
      console.error("[Messaging] Error marking as read:", error);
    }
  }, [selectedConversation]);

  // ======================================================================
  // USER INTERACTIONS
  // ======================================================================

  const handleSelectConversation = useCallback((conversation: ConversationDto) => {
    console.log("[Messaging] Selected conversation:", conversation.conversationId);
    setSelectedConversation(conversation);
    setShowChatList(false);
    setTypingUserName(null);
  }, []);

  const handleTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setMessageInput(text);
      if (text.length > 0) {
        sendTypingIndicator(true);
      }
    },
    [sendTypingIndicator]
  );

  const handleSendMessage = useCallback(async () => {
    if (!selectedConversation) {
      toast.error("No conversation selected");
      return;
    }

    const messageText = messageInput.trim();
    if (!messageText && !selectedFile) return;

    try {
      setUploadingFile(true);

      // Handle file upload
      let attachments: any[] = [];
      if (selectedFile) {
        const uploadResponse = await chatApi.uploadFile(selectedFile);
        if (!uploadResponse.success) {
          toast.error("File upload failed");
          return;
        }

        const fileData = uploadResponse.data;
        attachments = [
          {
            fileName: fileData.fileName,
            fileUrl: fileData.fileUrl,
            fileType: fileData.fileType,
            fileSize: fileData.fileSize,
          },
        ];
      }

      const messageType = selectedFile ? (selectedFile.type.startsWith("image/") ? "IMAGE" : "FILE") : "TEXT";

      // Create optimistic message
      const optimisticMessage: MessageDto = {
        messageId: `temp-${Date.now()}`,
        conversationId: selectedConversation.conversationId,
        senderId: currentUserId,
        senderName: currentUserName,
        message: messageText || "[File sent]",
        messageType: messageType as "TEXT" | "IMAGE" | "FILE",
        attachments,
        timestamp: new Date().toISOString(),
        isRead: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setMessageInput("");
      setSelectedFile(null);
      sendTypingIndicator(false); // Stop typing indicator

      // Send via WebSocket
      if (isConnected) {
        const sent = await sendMessage(messageText || "", messageType as "TEXT" | "IMAGE" | "FILE");
        if (!sent) {
          // Fallback to REST
          const response = await chatApi.sendMessage({
            conversationId: selectedConversation.conversationId,
            message: messageText || "",
            messageType,
            attachments,
          });

          if (!response.success) {
            toast.error("Failed to send message");
          }
        }
      } else {
        // REST fallback
        const response = await chatApi.sendMessage({
          conversationId: selectedConversation.conversationId,
          message: messageText || "",
          messageType,
          attachments,
        });

        if (!response.success) {
          toast.error("Failed to send message");
          setMessages((prev) => prev.slice(0, -1));
        }
      }
    } catch (error: any) {
      console.error("[Messaging] Error sending message:", error);
      toast.error("Error sending message");
    } finally {
      setUploadingFile(false);
    }
  }, [selectedConversation, messageInput, selectedFile, currentUserId, currentUserName, isConnected, sendMessage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ======================================================================
  // EFFECTS
  // ======================================================================

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.conversationId);
      markAsRead();
    }
  }, [selectedConversation, loadMessages, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ======================================================================
  // RENDER
  // ======================================================================

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full md:px-4 md:py-4">
          <div className="flex-1 flex overflow-hidden md:border md:border-border/50 md:rounded-lg md:shadow-xl">
            {/* Left Sidebar - Conversations List */}
            <div className={`${showChatList ? "flex" : "hidden"} md:flex flex-col w-full md:w-96 border-r border-border/50 bg-card`}>
              <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Messages</h2>
                  <Button variant="ghost" size="icon" onClick={() => navigate("/vendor/bids")} className="md:hidden">
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </div>
                {conversations.length > 0 && <p className="text-sm text-muted-foreground mt-2">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>}
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const otherParticipant = getOtherParticipant(conv);
                    return (
                      <ConversationListItem
                        key={conv.conversationId}
                        conversation={conv}
                        isSelected={selectedConversation?.conversationId === conv.conversationId}
                        isOnline={recipientStatus === "ONLINE"}
                        otherParticipant={otherParticipant}
                        onClick={() => handleSelectConversation(conv)}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Side - Chat */}
            <div className={`${showChatList ? "hidden" : "flex"} md:flex flex-col flex-1 bg-background min-h-0`}>
              {!selectedConversation ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Lock className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Select a chat to start messaging</h3>
                  <p className="text-muted-foreground max-w-md">Choose a conversation from the list to view messages</p>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                      <Button variant="ghost" size="icon" onClick={() => setShowChatList(true)} className="md:hidden">
                        <Menu className="h-5 w-5" />
                      </Button>

                      <Avatar className="h-12 w-12 border-2 border-background">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {getOtherParticipant(selectedConversation).name?.charAt(0).toUpperCase() || "U"}
                        </div>
                      </Avatar>

                      <div className="min-w-0">
                        <h2 className="font-bold text-lg leading-none mb-1">{getOtherParticipant(selectedConversation).name || "Unknown"}</h2>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5 bg-primary/10 text-primary">
                            <Lock className="h-2.5 w-2.5" />
                            Encrypted
                          </Badge>
                          <span className="text-xs text-muted-foreground">{isConnected ? "Connected" : "Connecting..."}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-muted/5 min-h-0">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Send className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg, index) => (
                        <MessageBubble key={msg.messageId} message={msg} isOwn={msg.senderId === currentUserId} index={index} />
                      ))
                    )}

                    {typingUserName && (
                      <div className="flex justify-start animate-slide-up">
                        <div className="max-w-[85%] md:max-w-[75%] rounded-2xl p-3 md:p-4 shadow-sm bg-card border border-border/50 rounded-tl-none">
                          <p className="text-sm text-muted-foreground italic">{typingUserName} is typing...</p>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-3 md:p-4 bg-card border-t border-border/50 shrink-0">
                    {selectedFile && (
                      <div className="mb-2 p-2 bg-muted/50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedFile.type.startsWith("image/") ? (
                            <ImageIcon className="h-5 w-5 text-primary" />
                          ) : (
                            <FileText className="h-5 w-5 text-primary" />
                          )}
                          <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-6 w-6">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2 md:gap-3 items-end">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!isConnected || uploadingFile}
                        className="h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>

                      <Input
                        placeholder="Type your message..."
                        value={messageInput}
                        onChange={handleTyping}
                        onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                        disabled={!isConnected || uploadingFile}
                        className="min-h-[44px] md:min-h-[50px] py-3 rounded-xl bg-muted/30 border-muted-foreground/20"
                      />

                      <Button
                        onClick={handleSendMessage}
                        size="icon"
                        disabled={!isConnected || uploadingFile || (!messageInput.trim() && !selectedFile)}
                        className="h-[44px] w-[44px] md:h-[50px] md:w-[50px] rounded-xl shrink-0"
                      >
                        {uploadingFile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messaging;
