import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as api from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  recipientUserId?: string;
  recipientVendorOrgId?: string;
  type: string;
  message: string;
  dataId?: string;
  dataType?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsProps {
  vendorOrgId: string;
}

export default function Notifications({ vendorOrgId }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getVendorNotifications(vendorOrgId);
      setNotifications(data || []);
    } catch (err: any) {
      console.error("Failed to load notifications", err);
      setError(err?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorOrgId) {
      loadNotifications();
    }
  }, [vendorOrgId]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      toast({
        title: "Notification marked as read",
        variant: "default",
      });
    } catch (err: any) {
      toast({
        title: "Failed to mark notification as read",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "bid_accepted":
        return "🎉";
      case "new_message":
        return "💬";
      case "new_review":
        return "⭐";
      case "order_update":
        return "📦";
      case "bid_request":
        return "🔔";
      default:
        return "ℹ️";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Loading notifications...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center py-8">{error}</p>
          <div className="flex justify-center">
            <Button onClick={loadNotifications} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadNotifications}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No notifications</p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.isRead
                      ? "bg-background border-border"
                      : "bg-accent border-accent-foreground/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                          {notification.dataType && notification.dataId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.dataType}: {notification.dataId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
