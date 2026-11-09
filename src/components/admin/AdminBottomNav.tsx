import { LayoutDashboard, ShoppingCart, Package, MoreHorizontal } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNewOrdersCount } from "@/hooks/useNewOrdersCount";
import { Badge } from "@/components/ui/badge";

interface AdminBottomNavProps {
  onMenuClick: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: ShoppingCart, label: "Orders", path: "/admin/orders", showBadge: true },
  { icon: Package, label: "Products", path: "/admin/products" },
];

export function AdminBottomNav({ onMenuClick }: AdminBottomNavProps) {
  const location = useLocation();
  const { newOrdersCount } = useNewOrdersCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const showBadge = item.showBadge && newOrdersCount > 0;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {showBadge && (
                  <Badge 
                    className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center p-0 text-[10px] font-bold bg-bubu-red text-white border-0"
                  >
                    {newOrdersCount > 99 ? "99+" : newOrdersCount}
                  </Badge>
                )}
              </div>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
        
        {/* Menu Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="font-medium">More</span>
        </button>
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
