import SockJS from "sockjs-client";
import { Client, IMessage } from "@stomp/stompjs";

export interface BidUpdateNotification {
  bidId: string;
  orderId: string;
  vendorId: string; // MongoDB _id of the vendor
  vendorOrganizationId: string; // Business organization ID (backward compatibility)
  status: "requested" | "quoted" | "accepted" | "rejected";
  eventType: "BID_CREATED" | "BID_UPDATED" | "BID_DELETED" | "BID_QUOTED" | "BID_ACCEPTED" | "BID_REJECTED";
  message: string;
  proposedTotalPrice: number;
  customerName: string;
  vendorBusinessName: string;
  eventName: string;
  timestamp: string;
}

export interface OrderUpdateNotification {
  orderId: string;
  customerId: string;
  vendorId: string; // MongoDB _id of the vendor
  vendorOrganizationId: string; // Business organization ID (backward compatibility)
  eventName: string;
  eventDate: string;
  eventLocation: string;
  guestCount: number;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  totalPrice: number;
  eventType: "ORDER_CREATED" | "ORDER_UPDATED" | "ORDER_DELETED" | "ORDER_STATUS_CHANGED";
  message: string;
  timestamp: string;
}

export interface ChatUpdateNotification {
  messageId: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  content?: string;
  eventType: "MESSAGE_SENT" | "MESSAGE_DELIVERED" | "MESSAGE_READ";
  messageStatus: "SENT" | "DELIVERED" | "READ";
  timestamp?: string;
}

type BidNotificationCallback = (notification: BidUpdateNotification) => void;
type OrderNotificationCallback = (notification: OrderUpdateNotification) => void;
type ChatNotificationCallback = (notification: ChatUpdateNotification) => void;

class NotificationWebSocketService {
  private client: Client | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  private bidCallbacks: BidNotificationCallback[] = [];
  private orderCallbacks: OrderNotificationCallback[] = [];
  private chatCallbacks: ChatNotificationCallback[] = [];
  
  private onConnectedCallback: (() => void) | null = null;
  private onDisconnectedCallback: (() => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;

  connect(
    vendorId: string, // MongoDB _id instead of vendorOrganizationId
    onBidUpdate: BidNotificationCallback,
    onOrderUpdate: OrderNotificationCallback,
    onChatUpdate: ChatNotificationCallback,
    onConnected?: () => void,
    onDisconnected?: () => void,
    onError?: (error: any) => void
  ): void {
    if (this.client?.connected || this.isConnecting) {
      console.log("WebSocket already connected or connecting");
      return;
    }

    this.isConnecting = true;
    this.bidCallbacks.push(onBidUpdate);
    this.orderCallbacks.push(onOrderUpdate);
    this.chatCallbacks.push(onChatUpdate);
    
    if (onConnected) this.onConnectedCallback = onConnected;
    if (onDisconnected) this.onDisconnectedCallback = onDisconnected;
    if (onError) this.onErrorCallback = onError;

    const socket = new SockJS(`${import.meta.env.VITE_API_URL || "http://localhost:8080"}/ws`);
    
    this.client = new Client({
      webSocketFactory: () => socket as any,
      debug: (str) => {
        console.log("STOMP Debug:", str);
      },
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      console.log("Notification WebSocket Connected");
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Subscribe to vendor-specific topics using MongoDB ID
      this.subscribeToVendorTopics(vendorId);

      // Subscribe to broadcast topics
      this.subscribeToBroadcastTopics();

      if (this.onConnectedCallback) {
        this.onConnectedCallback();
      }
    };

    this.client.onStompError = (frame) => {
      console.error("STOMP error:", frame.headers["message"]);
      console.error("Details:", frame.body);
      this.isConnecting = false;

      if (this.onErrorCallback) {
        this.onErrorCallback(frame);
      }

      this.handleReconnect(vendorId);
    };

    this.client.onWebSocketClose = () => {
      console.log("WebSocket connection closed");
      this.isConnecting = false;

      if (this.onDisconnectedCallback) {
        this.onDisconnectedCallback();
      }

      this.handleReconnect(vendorId);
    };

    this.client.activate();
  }

  private subscribeToVendorTopics(vendorId: string): void {
    if (!this.client?.connected) return;

    // Subscribe to vendor-specific bid notifications using MongoDB ID
    this.client.subscribe(`/topic/vendor/${vendorId}/bids`, (message: IMessage) => {
      const notification: BidUpdateNotification = JSON.parse(message.body);
      console.log("Bid notification received:", notification);
      this.bidCallbacks.forEach((callback) => callback(notification));
    });

    // Subscribe to vendor-specific order notifications using MongoDB ID
    this.client.subscribe(`/topic/vendor/${vendorId}/orders`, (message: IMessage) => {
      const notification: OrderUpdateNotification = JSON.parse(message.body);
      console.log("Order notification received:", notification);
      this.orderCallbacks.forEach((callback) => callback(notification));
    });

    // Subscribe to vendor-specific chat notifications using MongoDB ID
    this.client.subscribe(`/topic/vendor/${vendorId}/chats`, (message: IMessage) => {
      const notification: ChatUpdateNotification = JSON.parse(message.body);
      console.log("Chat notification received:", notification);
      this.chatCallbacks.forEach((callback) => callback(notification));
    });

    console.log(`Subscribed to vendor topics for: ${vendorId}`);
  }

  private subscribeToBroadcastTopics(): void {
    if (!this.client?.connected) return;

    // Subscribe to broadcast bid updates
    this.client.subscribe("/topic/bids", (message: IMessage) => {
      const notification: BidUpdateNotification = JSON.parse(message.body);
      console.log("Broadcast bid notification:", notification);
      this.bidCallbacks.forEach((callback) => callback(notification));
    });

    // Subscribe to broadcast order updates
    this.client.subscribe("/topic/orders", (message: IMessage) => {
      const notification: OrderUpdateNotification = JSON.parse(message.body);
      console.log("Broadcast order notification:", notification);
      this.orderCallbacks.forEach((callback) => callback(notification));
    });

    // Subscribe to broadcast chat updates
    this.client.subscribe("/topic/chats", (message: IMessage) => {
      const notification: ChatUpdateNotification = JSON.parse(message.body);
      console.log("Broadcast chat notification:", notification);
      this.chatCallbacks.forEach((callback) => callback(notification));
    });

    console.log("Subscribed to broadcast topics");
  }

  private handleReconnect(vendorId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      if (!this.client?.connected) {
        this.isConnecting = false;
        this.connect(
          vendorId,
          this.bidCallbacks[0],
          this.orderCallbacks[0],
          this.chatCallbacks[0],
          this.onConnectedCallback || undefined,
          this.onDisconnectedCallback || undefined,
          this.onErrorCallback || undefined
        );
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect(): void {
    if (this.client?.connected) {
      this.client.deactivate();
    }
    this.client = null;
    this.isConnecting = false;
    this.bidCallbacks = [];
    this.orderCallbacks = [];
    this.chatCallbacks = [];
    this.reconnectAttempts = 0;
    console.log("Notification WebSocket disconnected");
  }

  isConnected(): boolean {
    return this.client?.connected || false;
  }
}

export const notificationWebSocketService = new NotificationWebSocketService();
