import { toast } from "@/hooks/use-toast";

// Notification storage interface
export interface StoredNotification {
  id: string;
  type: 'message' | 'bid' | 'order' | 'review';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  metadata?: {
    userId?: string;
    userName?: string;
    orderId?: string;
    bidId?: string;
  };
}

// In-memory notification store (in production, use backend API)
let notificationStore: StoredNotification[] = [];
let notificationListeners: Array<(notifications: StoredNotification[]) => void> = [];

// Subscribe to notification updates
export const subscribeToNotifications = (callback: (notifications: StoredNotification[]) => void) => {
  notificationListeners.push(callback);
  callback(notificationStore); // Send current notifications
  
  return () => {
    notificationListeners = notificationListeners.filter(cb => cb !== callback);
  };
};

// Add a notification to the store
const addNotification = (notification: Omit<StoredNotification, 'id' | 'timestamp' | 'read'>) => {
  const newNotification: StoredNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    read: false,
  };
  
  notificationStore = [newNotification, ...notificationStore].slice(0, 50); // Keep last 50
  notificationListeners.forEach(callback => callback(notificationStore));
  
  return newNotification;
};

// Mark notification as read
export const markNotificationAsRead = (notificationId: string) => {
  notificationStore = notificationStore.map(notif =>
    notif.id === notificationId ? { ...notif, read: true } : notif
  );
  notificationListeners.forEach(callback => callback(notificationStore));
};

// Clear all notifications
export const clearAllNotifications = () => {
  notificationStore = [];
  notificationListeners.forEach(callback => callback(notificationStore));
};

// Get unread count
export const getUnreadCount = () => {
  return notificationStore.filter(n => !n.read).length;
};

// Create audio context for notification sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Generate a pleasant notification sound
const playNotificationSound = (type: 'success' | 'info' | 'warning' = 'info') => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Different frequencies for different notification types
    const frequencies = {
      success: [523.25, 659.25, 783.99], // C-E-G chord
      info: [440, 554.37], // A-C#
      warning: [493.88, 523.25], // B-C
    };

    const freq = frequencies[type];
    
    oscillator.frequency.setValueAtTime(freq[0], ctx.currentTime);
    
    if (freq.length > 1) {
      freq.forEach((f, i) => {
        if (i > 0) {
          oscillator.frequency.setValueAtTime(f, ctx.currentTime + (i * 0.1));
        }
      });
    }

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

export const notifyBidAccepted = (bidId: string, clientName: string) => {
  playNotificationSound('success');
  toast({
    title: "🎉 Bid Accepted!",
    description: `${clientName} has accepted your bid ${bidId}. You can now confirm the order.`,
    duration: 5000,
  });
};

export const notifyNewMessage = (senderId: string, senderName: string, preview: string) => {
  playNotificationSound('info');
  
  // Add to notification store
  addNotification({
    type: 'message',
    title: `💬 New message from ${senderName}`,
    description: preview,
    metadata: {
      userId: senderId,
      userName: senderName,
    },
  });
  
  toast({
    title: `💬 New message from ${senderName}`,
    description: preview,
    duration: 4000,
  });
};

export const notifyNewReview = (clientName: string, rating: number) => {
  playNotificationSound('success');
  const stars = "⭐".repeat(rating);
  toast({
    title: `${stars} New Review!`,
    description: `${clientName} left you a ${rating}-star review`,
    duration: 5000,
  });
};

export const notifyOrderUpdate = (orderId: string, status: string) => {
  playNotificationSound('info');
  toast({
    title: "📦 Order Status Update",
    description: `Order ${orderId} is now ${status}`,
    duration: 4000,
  });
};

export const notifyNewBidRequest = (clientName: string, eventType: string) => {
  playNotificationSound('info');
  toast({
    title: "🔔 New Bid Request",
    description: `${clientName} is requesting quotes for ${eventType}`,
    duration: 4000,
  });
};

// Simulate real-time notifications for demo
export const startNotificationDemo = () => {
  const notifications = [
    () => notifyBidAccepted("BID-001", "Sarah Chen"),
    () => notifyNewMessage("Mike Johnson", "When can you deliver the order?"),
    () => notifyNewReview("Lisa Martinez", 5),
    () => notifyOrderUpdate("ORD-1003", "delivered"),
    () => notifyNewBidRequest("David Lee", "Corporate Event"),
  ];

  let index = 0;
  const interval = setInterval(() => {
    notifications[index]();
    index = (index + 1) % notifications.length;
  }, 10000); // Show a notification every 10 seconds

  return () => clearInterval(interval);
};
