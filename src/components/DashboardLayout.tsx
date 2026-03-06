import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { Bell, Moon, Sun, User, Menu, X } from "lucide-react";
import bidzaroLogo from "@/assets/bidzaro_logo1.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    try {
      // Clear all local storage on logout
      localStorage.clear();
    } catch (e) {
    }
    try {
      navigate("/", { replace: true });
      setTimeout(() => {
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }, 150);
    } catch (e) {
      window.location.href = "/";
    }
  };

  // Demo notifications removed to avoid fake notifications in dashboard

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 z-50 border-b border-orange-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Logo on desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <img src={bidzaroLogo} alt="Bidzaro" className="h-10 w-auto object-contain" />
          </div>

          {/* Mobile menu toggle + brand */}
          <div className="lg:hidden flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-orange-600"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
            <img src={bidzaroLogo} alt="Bidzaro" className="h-8 w-auto object-contain" />
          </div>

          {/* Desktop controls */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                >
                  <Bell className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-orange-600">Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-gray-500">No new notifications</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/notifications")} className="text-orange-600">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={localStorage.getItem("profileUrl") || undefined}
                    />
                    <AvatarFallback className="bg-orange-600 text-white">
                      {localStorage.getItem("firstName")?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {localStorage.getItem("firstName") || "Account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile profile + logout */}
          <div className="lg:hidden flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={localStorage.getItem("profileUrl") || undefined}
                    />
                    <AvatarFallback className="bg-orange-600 text-white text-xs">
                      {localStorage.getItem("firstName")?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  navigate("/dashboard/profile");
                  setIsMobileMenuOpen(false);
                }}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Layout container */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
