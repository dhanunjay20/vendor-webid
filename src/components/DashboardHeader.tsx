import { Bell, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/contexts/NotificationContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardHeaderProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export default function DashboardHeader({ theme, toggleTheme }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { 
    isConnected, 
    bidNotifications, 
    orderNotifications, 
    clearBidNotifications, 
    clearOrderNotifications,
    toggleSoundMute,
    isSoundMuted
  } = useNotifications();

  const handleLogout = () => {
    // Clear auth data and navigate to login
    try {
      // Clear authentication-related storage
      localStorage.removeItem("authToken");
      localStorage.removeItem("tokenType");
      localStorage.removeItem("vendorOrganizationId");
      localStorage.removeItem("vendorId");
      localStorage.removeItem("userType");
      localStorage.removeItem("userId");
      localStorage.removeItem("id");
      localStorage.removeItem("profileUrl");
    } catch (e) {
      console.warn("Failed to clear auth storage", e);
    }
    // Prefer router navigation, but fallback to full redirect if that doesn't work
    try {
      navigate("/login", { replace: true });
      // if router doesn't navigate (rare), force a location change after a short delay
      setTimeout(() => {
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 150);
    } catch (e) {
      // final fallback
      window.location.href = "/login";
    }
  };

  const totalNotifications = bidNotifications.length + orderNotifications.length;
  const allNotifications = [...bidNotifications, ...orderNotifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 10); // Show last 10 notifications

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
            <span className="text-xl font-bold text-primary-foreground">W</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">WEBID Catering</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="transition-smooth hover:bg-muted"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSoundMute}
            className="transition-smooth hover:bg-muted"
            title={isSoundMuted ? "Unmute notifications" : "Mute notifications"}
          >
            {isSoundMuted ? (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative transition-smooth">
                <Bell className="h-5 w-5" />
                {totalNotifications > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-destructive p-0 text-[10px]">
                    {totalNotifications > 9 ? "9+" : totalNotifications}
                  </Badge>
                )}
                {isConnected && (
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-background"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <div className="flex items-center gap-2">
                  {isConnected && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      Live
                    </Badge>
                  )}
                  {totalNotifications > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        clearBidNotifications();
                        clearOrderNotifications();
                      }}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[400px]">
                {allNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You'll be notified about bids and orders
                    </p>
                  </div>
                ) : (
                  allNotifications.map((notification, index) => {
                    const isBid = "bidId" in notification;
                    return (
                      <DropdownMenuItem 
                        key={index} 
                        className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                        onClick={() => navigate(isBid ? "/dashboard/bids" : "/dashboard/orders")}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-sm">
                            {isBid 
                              ? `${notification.eventType.replace("BID_", "").replace(/_/g, " ")}`
                              : `${notification.eventType.replace("ORDER_", "").replace(/_/g, " ")}`
                            }
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.timestamp).toLocaleTimeString([], { 
                              hour: "2-digit", 
                              minute: "2-digit" 
                            })}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </span>
                        {isBid && "proposedTotalPrice" in notification && notification.proposedTotalPrice > 0 && (
                          <span className="text-xs font-medium text-primary">
                            ₹{notification.proposedTotalPrice.toLocaleString()}
                          </span>
                        )}
                        {!isBid && "totalPrice" in notification && notification.totalPrice > 0 && (
                          <span className="text-xs font-medium text-primary">
                            ₹{notification.totalPrice.toLocaleString()}
                          </span>
                        )}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </ScrollArea>
              {allNotifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-center justify-center text-primary cursor-pointer"
                    onClick={() => navigate("/dashboard/notifications")}
                  >
                    View All Notifications
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 transition-smooth">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={localStorage.getItem("profileUrl") || undefined} />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block">Admin</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
