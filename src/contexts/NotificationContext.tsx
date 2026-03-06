import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  notificationWebSocketService,
  BidUpdateNotification,
  OrderUpdateNotification,
  ChatUpdateNotification,
} from "@/lib/notificationWebSocket";
import { notificationSound } from "@/lib/notificationSound";
import { initializePushNotifications } from "@/lib/firebase";

interface NotificationContextType {
  isConnected: boolean;
  bidNotifications: BidUpdateNotification[];
  orderNotifications: OrderUpdateNotification[];
  chatNotifications: ChatUpdateNotification[];
  clearBidNotifications: () => void;
  clearOrderNotifications: () => void;
  clearChatNotifications: () => void;
  toggleSoundMute: () => boolean;
  isSoundMuted: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [bidNotifications, setBidNotifications] = useState<BidUpdateNotification[]>([]);
  const [orderNotifications, setOrderNotifications] = useState<OrderUpdateNotification[]>([]);
  const [chatNotifications, setChatNotifications] = useState<ChatUpdateNotification[]>([]);
  const [isSoundMuted, setIsSoundMuted] = useState(notificationSound.isSoundMuted());
  const { toast } = useToast();

  useEffect(() => {
    // Get vendor ID from localStorage - use MongoDB _id for WebSocket subscriptions
    const vendorId = localStorage.getItem("vendorId");

    if (!vendorId) {
      return;
    }

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Handle bid updates
    const handleBidUpdate = (notification: BidUpdateNotification) => {
      // Add to notification list
      setBidNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50

      // Play sound
      notificationSound.play();

      // Show toast notification
      toast({
        title: getEventTypeTitle(notification.eventType),
        description: notification.message,
        duration: 5000,
      });

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        const browserNotif = new Notification(getEventTypeTitle(notification.eventType), {
          body: notification.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `bid-${notification.bidId}`,
          requireInteraction: false,
          silent: false,
        });

        browserNotif.onclick = () => {
          window.focus();
          // Navigate to bids page
          window.location.href = "/dashboard/bids";
          browserNotif.close();
        };
      }
    };

    // Handle order updates
    const handleOrderUpdate = (notification: OrderUpdateNotification) => {
      // Add to notification list
      setOrderNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50

      // Play sound
      notificationSound.play();

      // Show toast notification
      toast({
        title: getOrderEventTypeTitle(notification.eventType),
        description: notification.message,
        duration: 5000,
      });

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        const browserNotif = new Notification(getOrderEventTypeTitle(notification.eventType), {
          body: notification.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `order-${notification.orderId}`,
          requireInteraction: false,
          silent: false,
        });

        browserNotif.onclick = () => {
          window.focus();
          // Navigate to orders page
          window.location.href = "/dashboard/orders";
          browserNotif.close();
        };
      }
    };

    // Handle chat updates
    const handleChatUpdate = (notification: ChatUpdateNotification) => {
      // Add to notification list
      setChatNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50

      // Show toast for MESSAGE_SENT only (for new messages)
      if (notification.eventType === "MESSAGE_SENT") {
        // Play sound
        notificationSound.play();

        toast({
          title: "💬 New Message",
          description: notification.content || "You have a new message",
          duration: 5000,
        });

        // Show browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          const browserNotif = new Notification("New Message", {
            body: notification.content || "You have a new message",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: `chat-${notification.chatId}`,
            requireInteraction: false,
            silent: false,
          });

          browserNotif.onclick = () => {
            window.focus();
            // Navigate to messaging page
            window.location.href = "/dashboard/messaging";
            browserNotif.close();
          };
        }
      }
      // Handle MESSAGE_DELIVERED and MESSAGE_READ silently (no sound/toast)
      else if (notification.eventType === "MESSAGE_DELIVERED") {
      } else if (notification.eventType === "MESSAGE_READ") {
      }
    };

    // Connect to WebSocket using vendorId (MongoDB _id)
    notificationWebSocketService.connect(
      vendorId,
      handleBidUpdate,
      handleOrderUpdate,
      handleChatUpdate,
      () => {
        setIsConnected(true);
        toast({
          title: "Connected",
          description: "Real-time notifications are active",
        });
      },
      () => {
        setIsConnected(false);
      },
      (error) => {
        toast({
          title: "Connection Error",
          description: "Failed to connect to notification service",
          variant: "destructive",
        });
      }
    );

    // Initialize Firebase push notifications (foreground + background)
    initializePushNotifications((payload) => {
      const notifType: string = payload.data?.notificationType || payload.notification?.title || "";
      const title = payload.notification?.title || "New Notification";
      const body = payload.notification?.body || "";

      notificationSound.play();
      toast({ title, description: body, duration: 5000 });

      if (notifType.startsWith("BID")) {
        setBidNotifications((prev) => [
          { eventType: notifType, message: body, bidId: payload.data?.bidId || "", timestamp: new Date().toISOString() } as BidUpdateNotification,
          ...prev,
        ].slice(0, 50));
      } else if (notifType.startsWith("ORDER")) {
        setOrderNotifications((prev) => [
          { eventType: notifType, message: body, orderId: payload.data?.orderId || "", timestamp: new Date().toISOString() } as OrderUpdateNotification,
          ...prev,
        ].slice(0, 50));
      } else if (notifType.startsWith("MESSAGE")) {
        setChatNotifications((prev) => [
          { eventType: notifType, content: body, chatId: payload.data?.conversationId || "", timestamp: new Date().toISOString() } as ChatUpdateNotification,
          ...prev,
        ].slice(0, 50));
      }
    });

    // Cleanup on unmount
    return () => {
      notificationWebSocketService.disconnect();
    };
  }, [toast]);

  const clearBidNotifications = () => {
    setBidNotifications([]);
  };

  const clearOrderNotifications = () => {
    setOrderNotifications([]);
  };

  const clearChatNotifications = () => {
    setChatNotifications([]);
  };

  const toggleSoundMute = () => {
    const newMutedState = notificationSound.toggleMute();
    setIsSoundMuted(newMutedState);
    return newMutedState;
  };

  const value: NotificationContextType = {
    isConnected,
    bidNotifications,
    orderNotifications,
    chatNotifications,
    clearBidNotifications,
    clearOrderNotifications,
    clearChatNotifications,
    toggleSoundMute,
    isSoundMuted,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// Helper functions for event type titles
function getEventTypeTitle(eventType: string): string {
  switch (eventType) {
    case "BID_CREATED":
      return "🆕 New Bid Request";
    case "BID_QUOTED":
      return "💰 Quote Submitted";
    case "BID_ACCEPTED":
      return "✅ Bid Accepted";
    case "BID_REJECTED":
      return "❌ Bid Rejected";
    case "BID_DELETED":
      return "🗑️ Bid Deleted";
    default:
      return "📢 Bid Update";
  }
}

function getOrderEventTypeTitle(eventType: string): string {
  switch (eventType) {
    case "ORDER_CREATED":
      return "🆕 New Order";
    case "ORDER_STATUS_CHANGED":
      return "🔄 Order Status Updated";
    case "ORDER_DELETED":
      return "🗑️ Order Deleted";
    default:
      return "📢 Order Update";
  }
}
