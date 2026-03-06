import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const withAuth = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("accessToken") || localStorage.getItem("authToken") || ""}`,
    "Content-Type": "application/json",
  },
});

// ======================================================================
// TYPES & INTERFACES - Per Backend API Documentation
// ======================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string | null;
  data: T;
  pageInfo?: PageInfo;
}

export interface PageInfo {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Conversation DTO - Backend returns participants array
 * Per API: /conversations response structure
 */
export interface ConversationDto {
  id?: string;  // MongoDB ID
  conversationId: string;
  participants: Participant[];
  lastMessage?: {
    message: string;
    senderId: string;
    timestamp: string;
  } | null;
  unreadCount: Record<string, number>;  // userId -> unread count map
  conversationType: "USER_VENDOR" | "USER_SUPPORT" | "VENDOR_SUPPORT";
  relatedTo?: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  createdAt: string;
  updatedAt?: string;
  // Computed fields (added by frontend - kept for backward compatibility)
  otherUserId?: string;
  otherUserName?: string;
}

export interface Participant {
  userId: string;
  userType: "USER" | "VENDOR" | "SUPPORT";
  name: string;
  profilePictureUrl?: string;
}

/**
 * Message DTO - Backend uses 'message' field (not 'content')
 * Per API: /conversations/{id}/messages response structure
 */
export interface MessageDto {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderType?: "USER" | "VENDOR" | "SUPPORT";
  senderName?: string;
  message: string;  // Backend field name (NOT 'content')
  messageType: "TEXT" | "IMAGE" | "FILE";
  attachments?: MessageAttachment[];
  timestamp: string;
  // Frontend-only fields
  isRead?: boolean;
  readAt?: string;
  createdAt?: string;
}

export interface MessageAttachment {
  fileName?: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}

export interface CreateConversationRequest {
  otherUserId: string;
  type: "USER_VENDOR" | "USER_SUPPORT" | "VENDOR_SUPPORT";
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;  // Backend field name (NOT 'content')
  messageType: "TEXT" | "IMAGE" | "FILE";
  attachments?: MessageAttachment[];
}

export interface FileUploadResponse {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}

// ======================================================================
// REST API ENDPOINTS
// ======================================================================

export const chatApi = {
  /**
   * A. Create or Get Conversation
   * POST /chat/conversations
   * Creates new or returns existing conversation between two users
   */
  createConversation: async (
    request: CreateConversationRequest
  ): Promise<ApiResponse<ConversationDto>> => {
    try {
      const { data } = await axios.post<ApiResponse<ConversationDto>>(
        `${API_BASE}/chat/conversations`,
        request,
        withAuth()
      );
      console.log("[Chat API] Conversation created/retrieved:", data.data?.conversationId);
      return data;
    } catch (error: any) {
      console.error("[Chat API] Create conversation failed:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        request,
      });
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null as any,
      };
    }
  },

 /**
   * B. Get My Conversations
   * GET /chat/conversations?page=0&size=20
   * Retrieves all conversations for the logged-in user
   */
  getConversations: async (
    page: number = 0,
    size: number = 20
  ): Promise<ApiResponse<ConversationDto[]>> => {
    try {
      const { data } = await axios.get<ApiResponse<ConversationDto[]>>(
        `${API_BASE}/chat/conversations`,
        {
          ...withAuth(),
          params: { page, size },
        }
      );
      
      // Transform backend response to compute convenience fields
      if (data.success && data.data) {
        const userId = localStorage.getItem("webid_user_id") || "";
        data.data = data.data.map((conv) => {
          const otherParticipant = conv.participants?.find((p) => p.userId !== userId);
          return {
            ...conv,
            otherUserId: otherParticipant?.userId,
            otherUserName: otherParticipant?.name,
          };
        });
      }
      
      console.log("[Chat API] Loaded conversations:", data.data?.length || 0);
      return data;
    } catch (error: any) {
      console.error("[Chat API] Get conversations failed:", error.message);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  },

  /**
   * C. Get Message History
   * GET /chat/conversations/{conversationId}/messages?page=0&size=50
   * Loads past messages for a specific conversation
   */
  getMessages: async (
    conversationId: string,
    page: number = 0,
    size: number = 50
  ): Promise<ApiResponse<MessageDto[]>> => {
    try {
      const { data } = await axios.get<ApiResponse<MessageDto[]>>(
        `${API_BASE}/chat/conversations/${conversationId}/messages`,
        {
          ...withAuth(),
          params: { page, size },
        }
      );
      console.log("[Chat API] Loaded messages:", data.data?.length || 0);
      return data;
    } catch (error: any) {
      console.error("[Chat API] Get messages failed:", error.message);
      return {
        success: false,
        message: error.message,
        data: [],
      };
    }
  },

  /**
   * D. Mark Conversation as Read
   * PUT /chat/conversations/{conversationId}/read
   * Marks all messages as read; triggers WebSocket event to other user
   */
  markAsRead: async (conversationId: string): Promise<ApiResponse<any>> => {
    try {
      const { data } = await axios.put<ApiResponse<any>>(
        `${API_BASE}/chat/conversations/${conversationId}/read`,
        {},
        withAuth()
      );
      console.log("[Chat API] Conversation marked as read:", conversationId);
      return data;
    } catch (error: any) {
      console.error("[Chat API] Mark as read failed:", error.message);
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  },

  /**
   * E. Upload File for Chat
   * POST /upload/image or /upload/document
   * Upload image or document for chat messages
   */
  uploadFile: async (file: File): Promise<ApiResponse<FileUploadResponse>> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "CHAT");

      const isDocument = !file.type.startsWith("image/");
      const endpoint = isDocument ? `${API_BASE}/upload/document` : `${API_BASE}/upload/image`;

      const { data } = await axios.post<ApiResponse<FileUploadResponse>>(
        endpoint,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken") || localStorage.getItem("authToken") || ""}`,
          },
        }
      );
      console.log("[Chat API] File uploaded:", data.data?.fileName);
      return data;
    } catch (error: any) {
      console.error("[Chat API] File upload failed:", error.message);
      return {
        success: false,
        message: error.message,
        data: null as any,
      };
    }
  },

  /**
   * Send Message via REST (fallback when WebSocket unavailable)
   * POST /chat/conversations/{conversationId}/messages
   */
  sendMessage: async (
    request: SendMessageRequest
  ): Promise<ApiResponse<MessageDto>> => {
    try {
      const { data } = await axios.post<ApiResponse<MessageDto>>(
        `${API_BASE}/chat/conversations/${request.conversationId}/messages`,
        {
          message: request.message,
          messageType: request.messageType,
          fileUrl: request.attachments?.[0]?.fileUrl,
        },
        withAuth()
      );
      console.log("[Chat API] Message sent (REST fallback):", data.data?.messageId);
      return data;
    } catch (error: any) {
      console.error("[Chat API] Send message failed:", error.message);
      return {
        success: false,
        message: error.message,
        data: null as any,
      };
    }
  },

  /**
   * Register FCM Token for Push Notifications
   * PUT /users/me/fcm-token
   */
  registerFCMToken: async (fcmToken: string): Promise<ApiResponse<void>> => {
    try {
      const { data } = await axios.put<ApiResponse<void>>(
        `${API_BASE}/users/me/fcm-token`,
        { fcmToken },
        withAuth()
      );
      console.log("[Chat API] FCM token registered");
      return data;
    } catch (error: any) {
      console.error("[Chat API] FCM token registration failed:", error.message);
      return {
        success: false,
        message: error.message,
        data: undefined,
      };
    }
  },
};

// ======================================================================
// WEBSOCKET MESSAGE TYPES - Per Backend API Documentation
// ======================================================================

/**
 * Send to /app/chat.sendMessage
 * Payload for sending a message via WebSocket
 */
export interface WSChatMessage {
  conversationId: string;
  message: string;  // Backend field name
  messageType: "TEXT" | "IMAGE" | "FILE";
  attachments?: MessageAttachment[];
}

/**
 * Send to /app/chat.typing
 * Payload for sending typing indicator - MUST include userId per backend spec
 */
export interface WSTypingIndicator {
  conversationId: string;
  userId: string;  // CRITICAL: Must send current user's ID
  typing: boolean;
}

/**
 * Receive from /topic/conversations.{id}
 * Incoming message from WebSocket
 */
export interface WSIncomingMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderType?: "USER" | "VENDOR" | "SUPPORT";
  senderName?: string;
  message: string;  // Backend field name (NOT 'content')
  messageType: "TEXT" | "IMAGE" | "FILE";
  attachments?: MessageAttachment[];
  timestamp: string;
}

/**
 * Receive from /topic/conversations.{id}.typing
 * Typing indicator event
 */
export interface WSTypingEvent {
  conversationId: string;
  userId: string;
  typing: boolean;
}

/**
 * Receive from /topic/conversations.{id}.read
 * Read receipt notification
 */
export interface WSReadReceipt {
  conversationId: string;
  userId: string;
  readAt: string;
}

/**
 * Receive from /topic/public.users
 * User online status change
 */
export interface WSUserStatus {
  userId: string;
  status: "ONLINE" | "OFFLINE" | "AWAY";
}
