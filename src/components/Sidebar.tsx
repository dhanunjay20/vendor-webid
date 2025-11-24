import { LayoutDashboard, FileText, ShoppingCart, MessageSquare, Star, User, Utensils } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Bids", href: "/bids", icon: FileText },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Menu", href: "/menu", icon: Utensils },
  { name: "Messaging", href: "/messaging", icon: MessageSquare },
  { name: "Reviews", href: "/reviews", icon: Star },
  { name: "Profile", href: "/profile", icon: User },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card">
      <nav className="space-y-1 p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === "/"}
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
