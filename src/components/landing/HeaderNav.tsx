import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import mensFeatureImg from "@/assets/product-analog-watch.jpg";
import womensFeatureImg from "@/assets/product-smart-watch.jpg";
import perfumesFeatureImg from "@/assets/product-luxury-perfume.jpg";
import brandsFeatureImg from "@/assets/hero-luxury-collage.jpg";
import bubuLogoColor from "@/assets/bubu-logo-color.png";
import {
  ChevronDown,
  FileText,
  Gift,
  Heart,
  Menu,
  Phone,
  Search,
  ShoppingBag,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SearchDropdown } from "./SearchDropdown";
import { useSearchProducts } from "@/hooks/useSearchProducts";
import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { UserDropdown } from "@/components/auth/UserDropdown";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { SignInRequiredDialog } from "@/components/auth/SignInRequiredDialog";
import { startGoogleOAuth } from "@/lib/authRedirect";
import { toast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart } from "@/context/cart";

type NavItem = {
  label: string;
  href: string;
  children?: Array<{ label: string; href: string }>;
};

type MegaMenu = {
  groups: Array<{
    title: string;
    links: Array<{ label: string; href: string; description?: string }>;
  }>;
  featured: { title: string; subtitle: string; href: string; image: string };
};

export function HeaderNav() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { mainCategories, getSubcategories, isLoading: categoriesLoading } = useCategories();
  const { data: brands = [] } = useBrands();
  const { count } = useCart();
  
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null);
  const [showAccountSignIn, setShowAccountSignIn] = useState(false);

  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const closeTimer = useRef<number | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: results = [], isLoading: searchLoading } = useSearchProducts(debouncedQuery);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const el = searchContainerRef.current;
      if (!el) return;
      if (e.target && !el.contains(e.target as Node)) {
        setTimeout(() => {
          setShowDropdown(false);
          setActiveIndex(-1);
        }, 200);
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    const open = value.trim().length > 0;
    setShowDropdown(open);
    setActiveIndex(open ? 0 : -1);
  };

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
    setActiveIndex(-1);
  }, []);

  const goToSearchPage = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      closeDropdown();
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [closeDropdown, navigate],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && e.key === "ArrowDown" && searchQuery.trim()) {
      setShowDropdown(true);
      setActiveIndex(0);
      return;
    }

    if (e.key === "Escape") {
      closeDropdown();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.min(results.length, 6) - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      if (showDropdown && activeIndex >= 0 && activeIndex < Math.min(results.length, 6)) {
        const product = results[activeIndex];
        closeDropdown();
        navigate(`/${product.category}/${product.subcategory}/${product.slug}`);
      } else {
        goToSearchPage(searchQuery);
      }
    }
  };

  const handleSearchIconClick = () => {
    if (!searchQuery.trim()) {
      searchInputRef.current?.focus();
    } else {
      goToSearchPage(searchQuery);
    }
  };

  const handleMobileSearchIconClick = () => {
    if (!searchQuery.trim()) {
      mobileSearchInputRef.current?.focus();
    } else {
      goToSearchPage(searchQuery);
    }
  };

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];
    
    mainCategories.forEach((cat) => {
      const subs = getSubcategories(cat.id);
      items.push({
        label: cat.name,
        href: `/${cat.slug}`,
        children: subs.length > 0 
          ? subs.map((sub) => ({ label: sub.name, href: `/${cat.slug}/${sub.slug}` }))
          : undefined,
      });
    });
    
    if (brands.length > 0) {
      items.push({
        label: "Brands",
        href: "/brands",
        children: brands.slice(0, 6).map((b) => ({
          label: b.name,
          href: `/brands/${b.name.toLowerCase().replace(/\s+/g, "-")}`,
        })),
      });
    }
    
    return items;
  }, [mainCategories, getSubcategories, brands]);

  const featureImages: Record<string, string> = {
    "mens": mensFeatureImg,
    "womens": womensFeatureImg,
    "perfumes": perfumesFeatureImg,
    "brands": brandsFeatureImg,
  };

  const megaMenus = useMemo<Record<string, MegaMenu>>(() => {
    const menus: Record<string, MegaMenu> = {};
    
    mainCategories.forEach((cat) => {
      const subs = getSubcategories(cat.id);
      if (subs.length === 0) return;
      
      const featureImage = featureImages[cat.slug] || mensFeatureImg;
      
      menus[cat.name] = {
        groups: [
          {
            title: "Categories",
            links: subs.slice(0, 4).map((sub) => ({
              label: sub.name,
              href: `/${cat.slug}/${sub.slug}`,
              description: `Browse ${sub.name.toLowerCase()}`,
            })),
          },
          {
            title: "Shop by",
            links: [
              { label: "Best Sellers", href: `/${cat.slug}?sort=popular`, description: "Customer favorites" },
              { label: "New Arrivals", href: `/${cat.slug}?sort=newest`, description: "Latest drops" },
              { label: "View All", href: `/${cat.slug}`, description: `All ${cat.name.toLowerCase()}` },
            ],
          },
        ],
        featured: {
          title: cat.name,
          subtitle: "Explore our collection",
          href: `/${cat.slug}`,
          image: featureImage,
        },
      };
    });
    
    if (brands.length > 0) {
      const luxuryBrands = brands.slice(0, 4);
      const otherBrands = brands.slice(4, 7);
      
      menus["Brands"] = {
        groups: [
          {
            title: "Featured Brands",
            links: luxuryBrands.map((b) => ({
              label: b.name,
              href: `/brands/${b.name.toLowerCase().replace(/\s+/g, "-")}`,
              description: "Shop collection",
            })),
          },
          {
            title: "More Brands",
            links: [
              ...otherBrands.map((b) => ({
                label: b.name,
                href: `/brands/${b.name.toLowerCase().replace(/\s+/g, "-")}`,
                description: "Browse products",
              })),
              { label: "View All Brands", href: "/brands", description: "Browse the full lineup" },
            ],
          },
        ],
        featured: {
          title: "Brand Spotlight",
          subtitle: "Curated for you",
          href: "/brands",
          image: brandsFeatureImg,
        },
      };
    }
    
    return menus;
  }, [mainCategories, getSubcategories, brands]);

  const openMenu = (label: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpenDesktopMenu(label);
  };

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpenDesktopMenu(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  // Cart trigger element for CartDrawer
  const cartTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-10 w-10 rounded-lg hover:bg-primary/10"
      aria-label="Shopping cart"
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bubu-red text-[10px] font-bold text-bubu-red-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow-md">
      {/* Main Header Bar */}
      <div className="bg-primary">
        <div className="container">
          <div className="hidden md:flex items-center justify-between h-16 gap-6">
            {/* Logo - Left */}
            <Link
              to="/"
              className="shrink-0 transition-opacity hover:opacity-90"
            >
              <img 
                src={bubuLogoColor} 
                alt="Friction" 
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* Search Bar - Center */}
            <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  className={cn(
                    "h-10 w-full rounded-lg border-0 bg-background pl-10 pr-4",
                    "text-sm placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                  )}
                  placeholder="Search products..."
                  aria-label="Search products"
                  value={searchQuery}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowDropdown(true);
                  }}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              
              {showDropdown && (
                <SearchDropdown
                  results={results}
                  activeIndex={activeIndex}
                  query={searchQuery}
                  onHoverIndex={setActiveIndex}
                  onSelect={closeDropdown}
                />
              )}
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-1">
              {/* Hotline */}
              <a
                href="tel:+8801929110024"
                className="hidden lg:flex items-center gap-2 px-3 py-2 text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Phone className="h-4 w-4" />
                <span>01929-110024</span>
              </a>

              <div className="h-6 w-px bg-primary-foreground/20 hidden lg:block" />

              {/* Track Order */}
              <Link
                to="/track-order"
                className="hidden lg:flex items-center gap-2 px-3 py-2 text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <FileText className="h-4 w-4" />
                <span>Track Order</span>
              </Link>

              <div className="h-6 w-px bg-primary-foreground/20 hidden lg:block mx-1" />

              {/* User Account */}
              {user ? (
                <UserDropdown />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-lg text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-72 bg-background border border-border shadow-lg z-[100] p-4 rounded-xl"
                  >
                    <div className="flex flex-col gap-3">
                      <p className="text-sm font-semibold text-foreground">Sign in faster</p>
                      <GoogleOAuthButton
                        onClick={async () => {
                          const { error } = await startGoogleOAuth();
                          if (error) {
                            toast({
                              title: "Google Sign In Failed",
                              description: error,
                              variant: "destructive",
                            });
                          }
                        }}
                      />
                      <div className="relative py-2" aria-hidden="true">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-background px-2 text-xs text-muted-foreground">OR</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/auth/login")}
                        className="w-full rounded-lg"
                      >
                        Sign up with Phone
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Wishlist (placeholder) */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg text-primary-foreground hover:bg-primary-foreground/10"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </Button>

              {/* Cart */}
              <CartDrawer 
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-lg text-primary-foreground hover:bg-primary-foreground/10"
                    aria-label="Shopping cart"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    {count > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bubu-red text-[10px] font-bold text-white">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation Bar - Desktop */}
      <nav className="hidden md:block bg-background border-b border-border" aria-label="Main navigation">
        <div className="container">
          <ul className="flex items-center justify-center gap-1">
            {navItems.map((item) => {
              const hasMega = !!megaMenus[item.label];
              const isOpen = openDesktopMenu === item.label;

              return (
                <li
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => hasMega && openMenu(item.label)}
                  onMouseLeave={scheduleClose}
                >
                  <Link
                    to={item.href}
                    className={cn(
                      "inline-flex items-center gap-1 px-4 py-3 text-sm font-semibold transition-colors",
                      "hover:text-primary border-b-2 border-transparent hover:border-primary",
                      isOpen && "text-primary border-primary",
                    )}
                    onClick={() => setOpenDesktopMenu(null)}
                  >
                    {item.label}
                    {hasMega && <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />}
                  </Link>

                  {hasMega && isOpen && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-full z-50 pt-0"
                      onMouseEnter={() => openMenu(item.label)}
                      onMouseLeave={scheduleClose}
                    >
                      <div className="w-[600px] rounded-b-xl border border-t-0 border-border bg-popover p-6 shadow-lg">
                        <div className="grid grid-cols-12 gap-6">
                          <div className="col-span-8 grid grid-cols-2 gap-6">
                            {megaMenus[item.label].groups.map((group) => (
                              <div key={group.title}>
                                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                  {group.title}
                                </div>
                                <ul className="space-y-1">
                                  {group.links.map((link) => (
                                    <li key={link.href}>
                                      <Link
                                        to={link.href}
                                        onClick={() => setOpenDesktopMenu(null)}
                                        className="block rounded-lg p-2 transition-colors hover:bg-accent"
                                      >
                                        <div className="text-sm font-medium">{link.label}</div>
                                        {link.description && (
                                          <div className="text-xs text-muted-foreground">{link.description}</div>
                                        )}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>

                          <div className="col-span-4">
                            <Link
                              to={megaMenus[item.label].featured.href}
                              onClick={() => setOpenDesktopMenu(null)}
                              className="group block overflow-hidden rounded-xl border border-border bg-card"
                            >
                              <div className="aspect-[4/3] overflow-hidden">
                                <img
                                  src={megaMenus[item.label].featured.image}
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              </div>
                              <div className="p-3">
                                <div className="font-serif text-sm font-bold">{megaMenus[item.label].featured.title}</div>
                                <div className="text-xs text-muted-foreground">{megaMenus[item.label].featured.subtitle}</div>
                              </div>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden bg-primary">
        <div className="container py-3">
          <div className="flex items-center justify-between gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-primary-foreground hover:bg-primary-foreground/10" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <SheetHeader className="border-b border-border p-4">
                  <SheetTitle>
                    <img 
                      src={bubuLogoColor} 
                      alt="Friction" 
                      className="h-8 w-auto object-contain"
                    />
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-4">
                  <Accordion type="single" collapsible className="w-full">
                    {navItems.map((item) => (
                      <AccordionItem key={item.label} value={item.label} className="border-b-0">
                        {item.children ? (
                          <>
                            <AccordionTrigger className="rounded-lg py-3 text-sm font-medium hover:bg-accent hover:no-underline">
                              {item.label}
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="ml-4 space-y-1">
                                <li>
                                  <Link
                                    to={item.href}
                                    className="block rounded-lg px-3 py-2 text-sm hover:bg-accent"
                                  >
                                    View All {item.label}
                                  </Link>
                                </li>
                                {item.children.map((child) => (
                                  <li key={child.href}>
                                    <Link
                                      to={child.href}
                                      className="block rounded-lg px-3 py-2 text-sm hover:bg-accent"
                                    >
                                      {child.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </>
                        ) : (
                          <Link
                            to={item.href}
                            className="flex w-full items-center rounded-lg py-3 text-sm font-medium hover:bg-accent"
                          >
                            {item.label}
                          </Link>
                        )}
                      </AccordionItem>
                    ))}
                  </Accordion>

                  <div className="mt-6 space-y-2 border-t border-border pt-6">
                    <Link
                      to="/track-order"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                    >
                      <FileText className="h-4 w-4" />
                      Track Order
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Gift className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className="absolute left-1/2 -translate-x-1/2">
              <img 
                src={bubuLogoColor} 
                alt="Friction" 
                className="h-10 w-auto object-contain"
              />
            </Link>

            <div className="flex items-center gap-1">
              <CartDrawer 
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-lg text-primary-foreground hover:bg-primary-foreground/10"
                    aria-label="Shopping cart"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    {count > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bubu-red text-[10px] font-bold text-white">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Button>
                }
              />
            </div>
          </div>

          {/* Mobile Search */}
          <div className="mt-3">
            <div ref={searchContainerRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={mobileSearchInputRef}
                className={cn(
                  "h-10 w-full rounded-lg border-0 bg-background pl-10 pr-4",
                  "text-sm placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring",
                )}
                placeholder="Search products..."
                aria-label="Search products"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim()) setShowDropdown(true);
                }}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              
              {showDropdown && (
                <SearchDropdown
                  results={results}
                  activeIndex={activeIndex}
                  query={searchQuery}
                  onHoverIndex={setActiveIndex}
                  onSelect={closeDropdown}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <SignInRequiredDialog
        open={showAccountSignIn}
        onOpenChange={setShowAccountSignIn}
      />
    </header>
  );
}
