import { Home, Grid3X3, ShoppingBag, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/context/cart";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";
import { CartDrawer } from "@/components/cart/CartDrawer";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Grid3X3, label: "Categories", path: "/categories" },
  { icon: ShoppingBag, label: "Cart", path: "/checkout", isCart: true },
  { icon: User, label: "Profile", path: "/account", authRequired: true },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { count } = useCart();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path === "/" && location.pathname === "/");
          const href = item.authRequired && !user ? "/auth/login" : item.path;

          // Cart item opens drawer instead of navigating
          if (item.isCart) {
            return (
              <CartDrawer
                key={item.label}
                trigger={
                  <button
                    type="button"
                    className={cn(
                      "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                      "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5" />
                      {count > 0 && (
                        <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </button>
                }
              />
            );
          }

          return (
            <Link
              key={item.label}
              to={href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
