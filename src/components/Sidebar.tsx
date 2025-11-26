import { LayoutDashboard, FileText, ShoppingCart, MessageSquare, Star, User, Utensils } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Bids", href: "/dashboard/bids", icon: FileText },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Menu", href: "/dashboard/menu", icon: Utensils },
  { name: "Messaging", href: "/dashboard/messaging", icon: MessageSquare },
  { name: "Reviews", href: "/dashboard/reviews", icon: Star },
  { name: "Profile", href: "/dashboard/profile", icon: User },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card">
      <nav className="space-y-1 p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === "/dashboard"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-smooth",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
