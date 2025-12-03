import axios from 'axios';
import { ChatMessage } from './websocket';

const API_BASE_URL = 'http://localhost:8080/api';

/**
 * Chat API Client
 * 
 * IMPORTANT: All user IDs must be MongoDB ObjectIds (_id field)
 * - For vendors: Use localStorage.getItem("vendorId") - This is the _id from vendors collection
 * - For customers: Use the _id from users collection (customerId field in orders)
 * 
 * Do NOT use vendorOrganizationId - it's not a MongoDB _id
 */
export const chatApi = {
  /**
   * Fetch chat history between two users
   */
  getChatHistory: async (senderId: string, recipientId: string): Promise<ChatMessage[]> => {
    try {
      const response = await axios.get<ChatMessage[]>(
        `${API_BASE_URL}/messages/${senderId}/${recipientId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  },

  /**
   * Get unique chat ID for two users
   */
  getChatId: async (senderId: string, recipientId: string): Promise<string> => {
    try {
      const response = await axios.get<string>(
        `${API_BASE_URL}/messages/chatId/${senderId}/${recipientId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting chat ID:', error);
      throw error;
    }
  },

  /**
   * Mark messages as delivered
   */
  markAsDelivered: async (senderId: string, recipientId: string): Promise<number> => {
    try {
      const response = await axios.put<number>(
        `${API_BASE_URL}/messages/delivered/${senderId}/${recipientId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error marking messages as delivered:', error);
      throw error;
    }
  },

  /**
   * Mark messages as read
   */
  markAsRead: async (senderId: string, recipientId: string): Promise<number> => {
    try {
      const response = await axios.put<number>(
        `${API_BASE_URL}/messages/read/${senderId}/${recipientId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },
};
