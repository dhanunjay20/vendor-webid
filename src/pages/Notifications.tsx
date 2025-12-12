import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, Filter, Package, FileText, Star, MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import { 
  subscribeToNotifications, 
  markNotificationAsRead as markLocalNotificationAsRead,
  StoredNotification 
} from "@/lib/notifications";

interface Notification {
  id: string;
  recipientUserId?: string;
  recipientVendorOrgId?: string;
  type: string;
  message: string;
  dataId?: string;
  dataType?: string;
  read: boolean;
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

  const vendorOrganizationId = localStorage.getItem("vendorOrganizationId") || "";

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
  }, [vendorOrganizationId]);

  useEffect(() => {
    applyFilter();
  }, [notifications, filter]);

  const fetchNotifications = async () => {
    if (!vendorOrganizationId) {
      setError("Vendor organization ID not found");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getVendorNotifications(vendorOrganizationId);
      setNotifications(data || []);
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
      setFilteredNotifications(notifications.filter((n) => !n.read));
    } else if (filter === "read") {
      setFilteredNotifications(notifications.filter((n) => n.read));
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
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
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      await Promise.all(unreadIds.map((id) => api.markNotificationAsRead(id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast({
        title: "All marked as read",
        description: `${unreadIds.length} notifications marked as read`,
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

  const unreadCount = notifications.filter((n) => !n.read).length;
  const localUnreadCount = localNotifications.filter((n) => !n.read).length;
  const totalUnreadCount = unreadCount + localUnreadCount;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      {/* Local Notifications Section (Real-time WebSocket notifications) */}
      {localNotifications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground px-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
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
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notif.read ? "border-l-4 border-l-blue-500 bg-blue-50/30" : "opacity-70"
                }`}
                onClick={() => handleLocalNotificationClick(notif)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="rounded-full p-2.5 text-cyan-600 bg-cyan-50">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-relaxed">
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <Badge className="shrink-0 bg-blue-500 text-xs">New</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {notif.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatTime(notif.timestamp.toISOString())}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
      
      {/* Header */}
      <Card className="border-none bg-gradient-to-r from-blue-50 via-white to-purple-50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Notifications</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stay updated with your latest activities
                </p>
              </div>
            </div>
            {totalUnreadCount > 0 && (
              <div className="flex items-center gap-3">
                <Badge className="h-8 rounded-full bg-red-500 px-4 text-sm font-semibold">
                  {totalUnreadCount} new
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="gap-2 rounded-full"
                >
                  <Check className="h-4 w-4" />
                  Mark all read
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Filter Tabs */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-3 rounded-full bg-muted/50 p-1">
              <TabsTrigger value="all" className="rounded-full">
                All ({notifications.length + localNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="rounded-full">
                Unread ({totalUnreadCount})
              </TabsTrigger>
              <TabsTrigger value="read" className="rounded-full">
                Read ({notifications.length + localNotifications.length - totalUnreadCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Loading & Error States */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      {!isLoading && !error && filteredNotifications.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">No notifications</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === "unread"
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredNotifications.length > 0 && (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || notificationIcons.default;
            const colorClass = notificationColors[notification.type] || notificationColors.default;

            return (
              <Card
                key={notification.id}
                className={`transition-all duration-200 hover:shadow-md ${
                  !notification.read
                    ? "border-l-4 border-l-blue-500 bg-blue-50/30"
                    : "border-l-4 border-l-transparent"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {notification.type.replace(/_/g, " ")}
                          </h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-3 w-3 shrink-0 rounded-full bg-blue-600" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                        {notification.dataType && (
                          <Badge variant="outline" className="text-xs">
                            {notification.dataType}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="h-8 w-8 rounded-full"
                        >
                          <Check className="h-4 w-4" />
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
  );
}
