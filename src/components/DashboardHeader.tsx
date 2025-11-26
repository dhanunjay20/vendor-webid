import { Bell, Moon, Sun } from "lucide-react";
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

interface DashboardHeaderProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export default function DashboardHeader({ theme, toggleTheme }: DashboardHeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear auth data and navigate to login
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("tokenType");
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative transition-smooth">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-destructive p-0 text-[10px]">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">New Order Request</span>
                <span className="text-xs text-muted-foreground">
                  Wedding reception for 150 guests
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">Bid Accepted</span>
                <span className="text-xs text-muted-foreground">
                  Corporate event catering approved
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">New Review</span>
                <span className="text-xs text-muted-foreground">
                  5-star rating from Sarah Johnson
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 transition-smooth">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
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
