import { LayoutDashboard, FileText, ShoppingCart, MessageSquare, Star, User, Utensils, Bell, Moon, Sun, LifeBuoy } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/ThemeProvider";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Bids", href: "/dashboard/bids", icon: FileText },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Menu", href: "/dashboard/menu", icon: Utensils },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Messaging", href: "/dashboard/messaging", icon: MessageSquare },
  { name: "Reviews", href: "/dashboard/reviews", icon: Star },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Support", href: "/dashboard/support", icon: LifeBuoy },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 border-r border-orange-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl
        transition-transform duration-300 ease-in-out
        lg:sticky lg:top-16 lg:z-0 lg:shadow-none lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <nav className="h-full overflow-y-auto p-3 space-y-1">
          {/* Mobile-only quick controls */}
          <div className="mb-4 flex items-center justify-between gap-2 lg:hidden pb-4 border-b border-orange-100">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-orange-600">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <NavLink to="/dashboard/notifications" onClick={onClose} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-orange-50 text-orange-600 transition">
                <Bell className="h-4 w-4" />
                <span className="text-sm">Notifications</span>
              </NavLink>
            </div>
            <NavLink to="/dashboard/profile" onClick={onClose} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-orange-50 transition">
              <Avatar className="h-8 w-8">
                <AvatarImage src={localStorage.getItem("profileUrl") || undefined} />
                <AvatarFallback className="bg-orange-600 text-white text-xs">
                  {localStorage.getItem("firstName")?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </NavLink>
          </div>
          
          {/* Navigation items */}
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === "/dashboard"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-orange-600 text-white shadow-md"
                    : "text-gray-700 dark:text-gray-300 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-gray-800 dark:hover:text-orange-400"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
