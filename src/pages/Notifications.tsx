import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, Filter, Package, FileText, Star, MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import { 
  subscribeToNotifications, 
  markNotificationAsRead as markLocalNotificationAsRead,
  StoredNotification 
} from "@/lib/notifications";

interface Notification {
  notificationId: string;
  userId?: string;
  title: string;
  message: string;
  type: string;
  channel?: string;
  isRead: boolean;
  data?: Record<string, string>;
  createdAt: string;
}

const notificationIcons: Record<string, any> = {
  BID_RECEIVED: FileText,
  BID_ACCEPTED: Check,
  BID_REJECTED: AlertCircle,
  ORDER_STATUS: Package,
  ORDER_CREATED: Package,
  NEW_REVIEW: Star,
  NEW_MESSAGE: MessageSquare,
  default: Bell,
};

const notificationColors: Record<string, string> = {
  BID_RECEIVED: "text-blue-600 bg-blue-50",
  BID_ACCEPTED: "text-green-600 bg-green-50",
  BID_REJECTED: "text-red-600 bg-red-50",
  ORDER_STATUS: "text-orange-600 bg-orange-50",
  ORDER_CREATED: "text-purple-600 bg-purple-50",
  NEW_REVIEW: "text-yellow-600 bg-yellow-50",
  NEW_MESSAGE: "text-cyan-600 bg-cyan-50",
  default: "text-gray-600 bg-gray-50",
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [localNotifications, setLocalNotifications] = useState<StoredNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  // Subscribe to local notifications (from WebSocket)
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notifs) => {
      setLocalNotifications(notifs);
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    // Set up polling for real-time updates every 30 seconds
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    applyFilter();
  }, [notifications, filter]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getVendorNotifications();
      
      // Handle different response formats
      let notifications: Notification[] = [];
      if (Array.isArray(data)) {
        notifications = data;
      } else if (data?.content && Array.isArray(data.content)) {
        // Paginated response format
        notifications = data.content;
      } else if (data?.data && Array.isArray(data.data)) {
        // Wrapped response format
        notifications = data.data;
      }
      
      setNotifications(notifications);
    } catch (err: any) {
      setError(err?.message || "Failed to load notifications");
      toast({
        title: "Error",
        description: err?.message || "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === "all") {
      setFilteredNotifications(notifications);
    } else if (filter === "unread") {
      setFilteredNotifications(notifications.filter((n) => !n.isRead));
    } else if (filter === "read") {
      setFilteredNotifications(notifications.filter((n) => n.isRead));
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
      );
      toast({
        title: "Marked as read",
        description: "Notification has been marked as read",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to mark as read",
        variant: "destructive",
      });
    }
  };

  const handleLocalNotificationClick = (notification: StoredNotification) => {
    // Mark as read
    markLocalNotificationAsRead(notification.id);
    
    // Navigate based on type
    if (notification.type === 'message' && notification.metadata?.userId) {
      navigate(`/dashboard/messaging?userId=${notification.metadata.userId}&userName=${encodeURIComponent(notification.metadata.userName || 'User')}`);
    } else if (notification.type === 'order' && notification.metadata?.orderId) {
      navigate('/dashboard/orders');
    } else if (notification.type === 'bid' && notification.metadata?.bidId) {
      navigate('/dashboard/bids');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast({
        title: "All marked as read",
        description: "All notifications have been marked as read",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to mark all as read",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const localUnreadCount = localNotifications.filter((n) => !n.read).length;
  const totalUnreadCount = unreadCount + localUnreadCount;

  return (
    <div className="min-h-screen bg-gray-50">
    <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:gap-6 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 md:py-8">
      {/* Local Notifications Section (Real-time WebSocket notifications) */}
      {localNotifications.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground px-2 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Real-time Updates
          </h3>
          {localNotifications
            .filter(n => {
              if (filter === 'unread') return !n.read;
              if (filter === 'read') return n.read;
              return true;
            })
            .map((notif) => (
              <Card
                key={notif.id}
                className={`cursor-pointer transition-all hover:shadow-md border border-orange-100 bg-white ${
                  !notif.read ? "border-l-4 border-l-orange-500" : "opacity-70"
                }`}
                onClick={() => handleLocalNotificationClick(notif)}
              >
                <CardContent className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4">
                  <div className="rounded-full p-2 sm:p-2.5 text-orange-600 bg-orange-100">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-xs sm:text-sm leading-relaxed">
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <Badge className="shrink-0 bg-orange-600 text-[10px] sm:text-xs px-1.5 sm:px-2 h-5 sm:h-auto">New</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {notif.description}
                    </p>
                    <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                      {formatTime(notif.timestamp.toISOString())}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-orange-100 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-orange-100">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
              Stay updated with your latest activities
            </p>
          </div>
        </div>
        {totalUnreadCount > 0 && (
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Badge className="h-7 sm:h-8 rounded-full bg-orange-600 px-3 sm:px-4 text-xs sm:text-sm font-semibold">
              {totalUnreadCount} new
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="gap-1.5 sm:gap-2 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4 border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Mark all</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-orange-100 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
              }`}
            >
              {tab === 'all' && `All (${notifications.length + localNotifications.length})`}
              {tab === 'unread' && `Unread (${totalUnreadCount})`}
              {tab === 'read' && `Read (${notifications.length + localNotifications.length - totalUnreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8 sm:py-12">
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-3 sm:border-4 border-primary border-t-transparent" />
              <p className="text-xs sm:text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 sm:gap-3 py-3 sm:py-4 px-3 sm:px-6">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 shrink-0" />
            <p className="text-xs sm:text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      {!isLoading && !error && filteredNotifications.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 sm:gap-4 py-12 sm:py-16 px-4">
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-sm sm:text-base">No notifications</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xs">
                {filter === "unread"
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredNotifications.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || notificationIcons.default;
            const colorClass = notificationColors[notification.type] || notificationColors.default;

            return (
              <Card
                key={notification.notificationId}
                className={`transition-all duration-200 hover:shadow-md border border-orange-100 bg-white ${
                  !notification.isRead
                    ? "border-l-4 border-l-orange-500"
                    : ""
                }`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${colorClass}`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-0.5 sm:space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground text-xs sm:text-sm md:text-base">
                            {notification.title || notification.type.replace(/_/g, " ")}
                          </h4>
                          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground break-words">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-full bg-orange-600 mt-1" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 pt-1.5 sm:pt-2 flex-wrap">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                          {notification.type && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs h-5 sm:h-auto px-1.5 sm:px-2">
                            {notification.type.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notification.notificationId)}
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full touch-manipulation"
                        >
                          <Check className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
}
