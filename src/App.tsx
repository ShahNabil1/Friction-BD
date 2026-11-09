import { lazy, Suspense } from "react";
import { CartProvider } from "@/context/cart";
import { AuthProvider } from "@/context/auth";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
import ScrollToTop from "@/components/ScrollToTop";

// Eagerly loaded routes (critical path)
import Index from "./pages/Index";
import ProductPage from "./pages/Product";
import CategoryPage from "./pages/Category";
import ShopCategoryPage from "./pages/ShopCategory";
import CategoriesPage from "./pages/Categories";
import SearchPage from "./pages/Search";
import BrandsPage from "./pages/Brands";
import BrandPage from "./pages/Brand";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Callback from "./pages/auth/Callback";
import Checkout from "./pages/Checkout";
import TrackOrder from "./pages/TrackOrder";
import OrderSuccess from "./pages/OrderSuccess";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ProtectedAdminRoute } from "./components/admin/ProtectedAdminRoute";
import { ProtectedPOSRoute } from "./components/pos/ProtectedPOSRoute";

// Lazy loaded routes (user-specific, loaded on demand)
const Account = lazy(() => import("./pages/Account"));
const Orders = lazy(() => import("./pages/Orders"));

// Lazy loaded admin routes (code split for performance)
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminInventory = lazy(() => import("./pages/admin/Inventory"));
const InventoryStockIn = lazy(() => import("./pages/admin/InventoryStockIn"));
const PrintLabels = lazy(() => import("./pages/admin/PrintLabels"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminBrands = lazy(() => import("./pages/admin/Brands"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminWebsite = lazy(() => import("./pages/admin/Website"));

const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminCourier = lazy(() => import("./pages/admin/Courier"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));
const OrderReceipt = lazy(() => import("./pages/admin/OrderReceipt"));
const AdminOnboarding = lazy(() => import("./pages/admin/Onboarding"));

const AdminAbandonedCheckouts = lazy(() => import("./pages/admin/AbandonedCheckouts"));
const AdminPOS = lazy(() => import("./pages/admin/POS"));
const POSSalesHistory = lazy(() => import("./pages/admin/POSSalesHistory"));
const POSManagement = lazy(() => import("./pages/admin/POSManagement"));
const POSAdminManagement = lazy(() => import("./pages/admin/POSAdminManagement"));
const POSReturns = lazy(() => import("./pages/admin/POSReturns"));
const POSCreditPayments = lazy(() => import("./pages/admin/POSCreditPayments"));
const POSExpenseHistory = lazy(() => import("./pages/admin/POSExpenseHistory"));
const POSCRM = lazy(() => import("./pages/admin/POSCRM"));
const AdminUnauthorized = lazy(() => import("./pages/admin/Unauthorized"));

const queryClient = new QueryClient();

// Suspense fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <LoadingSpinner size="lg" className="text-primary" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <AnalyticsProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  {/* Auth routes */}
                  <Route path="/auth/login" element={<Login />} />
                  {/* Passwordless model: no separate signup/reset routes */}
                  <Route path="/auth/signup" element={<Login />} />
                  <Route path="/auth/forgot-password" element={<Login />} />
                  <Route path="/auth/callback" element={<Callback />} />
                  {/* Protected routes */}
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute>
                        <Account />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <Orders />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-success" element={<OrderSuccess />} />
                  {/* Admin routes - all lazy loaded */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedAdminRoute>
                        <AdminDashboard />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/orders"
                    element={
                      <ProtectedAdminRoute>
                        <AdminOrders />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/orders/:orderId/receipt"
                    element={
                      <ProtectedAdminRoute>
                        <OrderReceipt />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/courier"
                    element={
                      <ProtectedAdminRoute>
                        <AdminCourier />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedAdminRoute requiredPermission="/admin/users">
                        <AdminUsers />
                      </ProtectedAdminRoute>
                    }
                  />
                 <Route
                    path="/admin/products"
                    element={
                      <ProtectedAdminRoute>
                        <AdminProducts />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/brands"
                    element={
                      <ProtectedAdminRoute>
                        <AdminBrands />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/categories"
                    element={
                      <ProtectedAdminRoute>
                        <AdminCategories />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/customers"
                    element={
                      <ProtectedAdminRoute>
                        <AdminCustomers />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/reviews"
                    element={
                      <ProtectedAdminRoute>
                        <AdminReviews />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <ProtectedAdminRoute>
                        <AdminReports />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/website"
                    element={
                      <ProtectedAdminRoute>
                        <AdminWebsite />
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/abandoned-checkouts"
                    element={
                      <ProtectedAdminRoute>
                        <AdminAbandonedCheckouts />
                      </ProtectedAdminRoute>
                    }
                  />
                  {/* POS - Point of Sale terminal (standalone, no admin layout) */}
                  <Route
                    path="/pos"
                    element={
                      <ProtectedPOSRoute>
                        <AdminPOS />
                      </ProtectedPOSRoute>
                    }
                  />
                  <Route
                    path="/pos/history"
                    element={
                      <ProtectedPOSRoute>
                        <POSSalesHistory />
                      </ProtectedPOSRoute>
                    }
                  />
                  <Route
                    path="/pos/management"
                    element={
                      <ProtectedPOSRoute>
                        <POSManagement />
                      </ProtectedPOSRoute>
                    }
                  />
                 <Route
                   path="/pos/print-labels"
                   element={
                     <ProtectedPOSRoute>
                       <PrintLabels />
                     </ProtectedPOSRoute>
                   }
                 />
                 <Route
                   path="/pos/inventory"
                   element={
                     <ProtectedPOSRoute>
                       <AdminInventory />
                     </ProtectedPOSRoute>
                   }
                 />
                 <Route
                   path="/pos/returns"
                   element={
                     <ProtectedPOSRoute>
                       <POSReturns />
                     </ProtectedPOSRoute>
                    }
                  />
                  <Route
                    path="/pos/credit-payments"
                    element={
                      <ProtectedPOSRoute>
                        <POSCreditPayments />
                      </ProtectedPOSRoute>
                    }
                  />
                  <Route
                    path="/pos/expenses"
                    element={
                      <ProtectedPOSRoute>
                        <POSExpenseHistory />
                      </ProtectedPOSRoute>
                    }
                   />
                  <Route
                    path="/pos/crm"
                    element={
                      <ProtectedPOSRoute>
                        <POSCRM />
                      </ProtectedPOSRoute>
                    }
                  />
                 <Route
                    path="/pos/inventory/stock-in"
                    element={
                      <ProtectedPOSRoute>
                        <InventoryStockIn />
                      </ProtectedPOSRoute>
                    }
                  />
                  {/* Admin POS Management - For managing outlets and staff */}
                  <Route
                    path="/admin/pos-management"
                    element={
                      <ProtectedAdminRoute requiredPermission="/admin/pos-management">
                        <POSAdminManagement />
                      </ProtectedAdminRoute>
                    }
                  />
                  {/* Unauthorized page */}
                  <Route path="/admin/unauthorized" element={<AdminUnauthorized />} />
                  {/* Onboarding page - no ProtectedAdminRoute wrapper, it handles its own auth */}
                  <Route path="/admin/onboarding" element={<AdminOnboarding />} />
                  <Route path="/brands" element={<BrandsPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/brands/:slug" element={<BrandPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  {/* Legal pages */}
                  <Route path="/privacypolicy" element={<PrivacyPolicy />} />
                  <Route path="/termsofservice" element={<TermsOfService />} />
                  {/* Shop category pages (from featured categories) */}
                  <Route path="/category/:slug" element={<ShopCategoryPage />} />
                  {/* Category routes - must be before product route */}
                  <Route path="/:category" element={<CategoryPage />} />
                  <Route path="/:category/:subcategory" element={<CategoryPage />} />
                  {/* Product detail page */}
                  <Route path="/:category/:subcategory/:slug" element={<ProductPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AnalyticsProvider>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
