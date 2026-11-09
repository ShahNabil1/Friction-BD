import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  FolderTree,
  Truck,
  Star,
  Tag,
  ChevronDown,
  PhoneCall,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNewOrdersCount } from "@/hooks/useNewOrdersCount";
import { supabase } from "@/integrations/supabase/client";
import { getPermissionFromPath, getFirstAllowedPath } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { AdminBottomNav } from "./AdminBottomNav";
import { AdminMobileMenu } from "./AdminMobileMenu";
import bubuLogoWhite from "@/assets/bubu-logo-white.png";
import bubuIconWhite from "@/assets/bubu-icon-white.png";

interface AdminLayoutProps {
  children: ReactNode;
}

// Grouped navigation structure
const navGroups = [
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
      { path: "/admin/pos-management", label: "POS Management", icon: Store, superAdminOnly: true },
      { path: "/admin/website", label: "Website", icon: Globe, permission: "website" },
    ],
  },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role, isLoading, isAdmin, isSuperAdmin, userPermissions, error: roleError, retry: retryRole } = useUserRole();
  const { newOrdersCount, markOrdersAsSeen } = useNewOrdersCount();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["ANALYTICS", "ORDERS", "CATALOG", "CUSTOMERS", "SETTINGS"]);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  // Mark orders as seen when visiting the orders page
  useEffect(() => {
    if (location.pathname === "/admin/orders") {
      markOrdersAsSeen();
    }
  }, [location.pathname, markOrdersAsSeen]);

  // Auth guard: redirect customers to home
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [isLoading, isAdmin, navigate]);

  // Check onboarding status for non-super admins
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || isLoading || isSuperAdmin) {
        setIsOnboarded(true); // Super admins skip onboarding
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("is_onboarded")
        .eq("id", user.id)
        .maybeSingle();

      const onboarded = data?.is_onboarded ?? false;
      setIsOnboarded(onboarded);

      // Redirect to onboarding if not onboarded
      if (!onboarded && location.pathname !== "/admin/onboarding") {
        navigate("/admin/onboarding", { replace: true });
      }
    };

    if (isAdmin && !isLoading) {
      checkOnboarding();
    }
  }, [user, isLoading, isAdmin, isSuperAdmin, navigate, location.pathname]);

  // Permission guard: check if moderator/admin has access to current page
  useEffect(() => {
    if (isLoading || !isAdmin) return;
    if (isSuperAdmin) return;

    const currentPath = location.pathname;
    const currentPermission = getPermissionFromPath(currentPath);

    if (currentPath === "/admin/users") {
      const firstAllowed = getFirstAllowedPath(userPermissions);
      navigate(firstAllowed, { replace: true });
      return;
    }

    if (currentPermission && !userPermissions.includes(currentPermission)) {
      const firstAllowed = getFirstAllowedPath(userPermissions);
      navigate(firstAllowed, { replace: true });
    }
  }, [isLoading, isAdmin, isSuperAdmin, userPermissions, location.pathname, navigate]);

  const hasAccess = (item: { permission?: string; superAdminOnly?: boolean }) => {
    if (isSuperAdmin) return true;
    if (item.superAdminOnly) return false;
    if (item.permission) {
      return userPermissions.includes(item.permission);
    }
    return false;
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading || isOnboarded === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" className="text-primary" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (roleError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-destructive font-medium">{roleError}</p>
          <Button onClick={retryRole} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Filter groups to only show items user has access to
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasAccess(item)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out",
          "bg-primary",
          "border-r border-primary/20",
          "hidden md:block",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Logo Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          {!collapsed && (
            <Link
              to="/admin/dashboard"
              className="flex items-center"
            >
              <img 
                src={bubuLogoWhite} 
                alt="Friction" 
                className="h-8 w-auto object-contain"
              />
            </Link>
          )}
          {collapsed && (
            <Link
              to="/admin/dashboard"
              className="flex items-center justify-center w-full"
            >
              <img 
                src={bubuIconWhite} 
                alt="Friction" 
                className="h-8 w-8 object-contain"
              />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hidden text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground md:flex transition-all duration-300 rounded-xl",
              collapsed && "absolute right-2"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="space-y-2 p-3">
            {filteredGroups.map((group) => (
              <Collapsible
                key={group.label}
                open={!collapsed && openGroups.includes(group.label)}
                onOpenChange={() => !collapsed && toggleGroup(group.label)}
              >
                {!collapsed && (
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/50 hover:text-bubu-green transition-all duration-300">
                    {group.label}
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform duration-300",
                        openGroups.includes(group.label) && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>
                )}

                <CollapsibleContent className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    const showBadge = item.path === "/admin/orders" && newOrdersCount > 0;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-in-out",
                          isActive
                            ? "bg-bubu-green text-bubu-green-foreground font-semibold"
                            : "text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground hover:pl-4"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300 relative",
                            isActive
                              ? "bg-bubu-green-foreground/10"
                              : "bg-white/5 group-hover:bg-white/10"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 transition-all duration-300",
                              isActive
                                ? "text-bubu-green-foreground"
                                : "text-primary-foreground/70 group-hover:text-primary-foreground group-hover:scale-110"
                            )}
                          />
                          {/* Badge on icon for orders */}
                          {showBadge && (
                            <Badge 
                              className="absolute -top-1.5 -right-1.5 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-bubu-red text-white border-0 animate-pulse"
                            >
                              {newOrdersCount > 99 ? "99+" : newOrdersCount}
                            </Badge>
                          )}
                        </div>
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.label}
                            {/* Badge inline with text */}
                            {showBadge && (
                              <Badge 
                                variant="secondary"
                                className="h-5 px-1.5 text-[10px] font-bold bg-bubu-red text-white border-0"
                              >
                                {newOrdersCount > 99 ? "99+" : newOrdersCount}
                              </Badge>
                            )}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </CollapsibleContent>

                {/* Collapsed mode - just show icons */}
                {collapsed && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      const showBadge = item.path === "/admin/orders" && newOrdersCount > 0;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          title={item.label}
                          className={cn(
                            "group relative flex items-center justify-center rounded-xl p-2.5 transition-all duration-300 ease-in-out",
                            isActive
                              ? "bg-bubu-green"
                              : "text-primary-foreground/70 hover:bg-white/10"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 transition-all duration-300",
                              isActive
                                ? "text-bubu-green-foreground"
                                : "text-primary-foreground/70 group-hover:text-primary-foreground group-hover:scale-110"
                            )}
                          />
                          {/* Badge on collapsed icon */}
                          {showBadge && (
                            <Badge 
                              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-bubu-red text-white border-0 animate-pulse"
                            >
                              {newOrdersCount > 99 ? "99+" : newOrdersCount}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Collapsible>
            ))}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-primary/90 backdrop-blur-sm p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl p-2 transition-all duration-300 hover:bg-white/10",
              collapsed && "justify-center"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bubu-green text-sm font-bold text-bubu-green-foreground shadow-md">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-primary-foreground">
                  {user?.email?.split("@")[0]}
                </p>
                <p className="truncate text-xs text-primary-foreground/60 capitalize">
                  {role?.replace("_", " ")}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
              className="shrink-0 text-primary-foreground/70 hover:bg-white/10 hover:text-bubu-red transition-all duration-300 rounded-xl"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 min-w-0 w-full transition-all duration-300",
          collapsed
            ? "md:ml-[72px] md:w-[calc(100%-72px)]"
            : "md:ml-64 md:w-[calc(100%-16rem)]"
        )}
      >

        {/* Add padding-bottom on mobile for bottom nav */}
        <div className="min-h-[calc(100vh-3.5rem)] p-4 pb-24 md:p-6 md:pb-6 overflow-x-hidden">
          {/* Page content with smooth fade-in animation - keyed to pathname for transition on route change */}
          <div 
            key={location.pathname}
            className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out"
          >
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <AdminBottomNav onMenuClick={() => setMobileMenuOpen(true)} />
      
      {/* Mobile Menu Overlay */}
      <AdminMobileMenu 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
    </div>
  );
};

// Permission helpers are now imported from @/lib/permissions