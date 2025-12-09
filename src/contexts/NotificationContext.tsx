import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  notificationWebSocketService,
  BidUpdateNotification,
  OrderUpdateNotification,
} from "@/lib/notificationWebSocket";
import { notificationSound } from "@/lib/notificationSound";

interface NotificationContextType {
  isConnected: boolean;
  bidNotifications: BidUpdateNotification[];
  orderNotifications: OrderUpdateNotification[];
  clearBidNotifications: () => void;
  clearOrderNotifications: () => void;
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
  const [isSoundMuted, setIsSoundMuted] = useState(notificationSound.isSoundMuted());
  const { toast } = useToast();

  useEffect(() => {
    // Get vendor ID from localStorage
    const vendorOrgId = localStorage.getItem("vendorOrganizationId");
    const vendorId = localStorage.getItem("vendorId");

    if (!vendorOrgId || !vendorId) {
      console.warn("Vendor information not found. Notifications will not be enabled.");
      return;
    }

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }

    // Handle bid updates
    const handleBidUpdate = (notification: BidUpdateNotification) => {
      console.log("📢 Bid notification received:", notification);

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
      console.log("📢 Order notification received:", notification);

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

    // Connect to WebSocket
    notificationWebSocketService.connect(
      vendorOrgId,
      handleBidUpdate,
      handleOrderUpdate,
      () => {
        setIsConnected(true);
        console.log("✅ Notification service connected");
        toast({
          title: "Connected",
          description: "Real-time notifications are active",
        });
      },
      () => {
        setIsConnected(false);
        console.log("❌ Notification service disconnected");
      },
      (error) => {
        console.error("❌ Notification service error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to notification service",
          variant: "destructive",
        });
      }
    );

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

  const toggleSoundMute = () => {
    const newMutedState = notificationSound.toggleMute();
    setIsSoundMuted(newMutedState);
    return newMutedState;
  };

  const value: NotificationContextType = {
    isConnected,
    bidNotifications,
    orderNotifications,
    clearBidNotifications,
    clearOrderNotifications,
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
