import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Tags,
  FileText,
  Globe,
  UserCircle,
  Building2,
  LogOut,
  FolderTree,
  Truck,
  Star,
  PhoneCall,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface AdminMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// All menu items grouped
const menuGroups = [
  {
    label: "ANALYTICS",
    items: [
      { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
      { path: "/admin/reports", label: "Reports", icon: FileText, permission: "reports" },
    ],
  },
  {
    label: "ORDERS",
    items: [
      { path: "/admin/orders", label: "Orders", icon: ShoppingCart, permission: "orders" },
      
      { path: "/admin/courier", label: "Courier", icon: Truck, permission: "courier" },
    ],
  },
  {
    label: "CATALOG",
    items: [
      { path: "/admin/products", label: "Products", icon: Tags, permission: "products" },
      { path: "/admin/inventory", label: "Inventory", icon: Package, permission: "inventory" },
      { path: "/admin/categories", label: "Categories", icon: FolderTree, permission: "categories" },
      { path: "/admin/brands", label: "Brands", icon: Building2, permission: "brands" },
    ],
  },
  {
    label: "CUSTOMERS",
    items: [
      { path: "/admin/customers", label: "Customers", icon: UserCircle, permission: "customers" },
      { path: "/admin/reviews", label: "Reviews", icon: Star, permission: "reviews" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { path: "/admin/users", label: "User Management", icon: Users, superAdminOnly: true },
      { path: "/admin/website", label: "Website", icon: Globe, permission: "website" },
    ],
  },
];

export function AdminMobileMenu({ isOpen, onClose }: AdminMobileMenuProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role, isSuperAdmin, userPermissions } = useUserRole();

  const hasAccess = (item: { permission?: string; superAdminOnly?: boolean }) => {
    if (isSuperAdmin) return true;
    if (item.superAdminOnly) return false;
    if (item.permission) {
      return userPermissions.includes(item.permission);
    }
    return false;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Items in bottom nav, page headers, or desktop-only features - exclude from mobile menu
  const bottomNavPaths = [
    "/admin/dashboard",
    "/admin/orders", 
    "/admin/products",
    "/admin/abandoned-checkouts",
    "/admin/brands",
    "/admin/categories",
    "/admin/inventory",
    "/admin/courier",
    "/admin/website",
  ];

  // Filter groups to only show items user has access to AND not in bottom nav
  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => hasAccess(item) && !bottomNavPaths.includes(item.path)
      ),
    }))
    .filter((group) => group.items.length > 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      {/* Slide-up Panel */}
      <div 
        className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300 md:hidden"
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="rounded-t-3xl bg-background border-t border-border shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {user?.email?.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {role?.replace("_", " ")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Menu Items - Scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 touch-pan-y">
            <div className="space-y-6 pb-4">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => handleNavigate(item.path)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="flex-1 font-medium text-foreground">
                            {item.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sign Out */}
          <div className="border-t border-border p-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 rounded-xl py-6 text-bubu-red hover:bg-bubu-red/10 hover:text-bubu-red"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </Button>
          </div>

          {/* Safe area for home indicator */}
          <div className="h-safe-area-inset-bottom bg-background" />
        </div>
      </div>
    </>
  );
}
