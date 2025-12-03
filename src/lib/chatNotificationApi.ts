import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}/api`;

/**
 * Chat Notification API Client
 * 
 * IMPORTANT: All user IDs must be MongoDB ObjectIds (_id field)
 * - For vendors: Use localStorage.getItem("vendorId") - This is the _id from vendors collection
 * - For customers: Use the _id from users collection
 * 
 * These endpoints manage chat metadata (unread counts, last messages, online status)
 */

export interface ChatListItemDto {
  userId: string;
  participantId: string;           // Backend uses participantId, not otherParticipantId
  participantName: string;         // Backend uses participantName, not otherParticipantName
  participantType: string;         // Backend uses participantType, not otherParticipantType
  participantProfileUrl?: string;  // Backend uses participantProfileUrl, not otherParticipantProfileUrl
  chatId: string;
  lastMessage: string;             // Backend uses lastMessage, not lastMessageContent
  lastMessageSenderId: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  onlineStatus: string;
  isTyping: boolean;
}

export interface UnreadCountDto {
  userId: string;
  totalUnreadCount: number;
  unreadChatsCount: number;
}

export const chatNotificationApi = {
  /**
   * Get chat list for a user/vendor
   */
  getChatList: async (userId: string): Promise<ChatListItemDto[]> => {
    try {
      const response = await axios.get<ChatListItemDto[]>(
        `${API_BASE_URL}/chat-notifications/${userId}/chats`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching chat list:', error);
      throw error;
    }
  },

  /**
   * Get total unread message count
   */
  getUnreadCount: async (userId: string): Promise<UnreadCountDto> => {
    try {
      const response = await axios.get<UnreadCountDto>(
        `${API_BASE_URL}/chat-notifications/${userId}/unread-count`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  /**
   * Mark a chat as read
   */
  markChatAsRead: async (userId: string, otherParticipantId: string): Promise<void> => {
    try {
      await axios.put(
        `${API_BASE_URL}/chat-notifications/${userId}/mark-read/${otherParticipantId}`
      );
    } catch (error) {
      console.error('Error marking chat as read:', error);
      throw error;
    }
  },

  /**
   * Delete a chat notification
   */
  deleteChat: async (userId: string, otherParticipantId: string): Promise<void> => {
    try {
      await axios.delete(
        `${API_BASE_URL}/chat-notifications/${userId}/chats/${otherParticipantId}`
      );
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  },

  /**
   * Update online status
   */
  updateOnlineStatus: async (userId: string, status: string): Promise<void> => {
    try {
      await axios.put(
        `${API_BASE_URL}/chat-notifications/${userId}/status`,
        null,
        { params: { status } }
      );
    } catch (error) {
      console.error('Error updating online status:', error);
      throw error;
    }
  },

  /**
   * Refresh participant info
   */
  refreshParticipantInfo: async (participantId: string): Promise<void> => {
    try {
      await axios.put(
        `${API_BASE_URL}/chat-notifications/${participantId}/refresh`
      );
    } catch (error) {
      console.error('Error refreshing participant info:', error);
      throw error;
    }
  },
};
