import { format } from "date-fns";
import { Eye, History, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineFraudBadge } from "@/components/admin/InlineFraudBadge";
import { useAuth } from "@/context/auth";

interface OrderItem {
  id: string;
  order_number?: string;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  user_id?: string | null;
  total_amount: number;
  status: string;
  locked_by?: string | null;
  locked_by_name?: string | null;
  lock_expiration?: string | null;
  courier_consignment_id?: string | null;
}

interface FraudCacheData {
  phone: string;
  success_ratio: number | null;
  total_order: number | null;
  success_delivery: number | null;
  cancel_order: number | null;
}

interface OrderMobileCardProps {
  order: OrderItem;
  isSelected: boolean;
  isEligibleForBulk: boolean;
  fraudData?: FraudCacheData | null;
  isSuperAdmin: boolean;
  onSelect: (orderId: string, checked: boolean) => void;
  onViewDetails: (order: OrderItem) => void;
  onViewCustomerHistory: (userId: string) => void;
  onDelete: (order: OrderItem) => void;
  getStatusColor: (status: string) => string;
  formatCurrency: (amount: number) => string;
}

export function OrderMobileCard({
  order,
  isSelected,
  isEligibleForBulk,
  fraudData,
  isSuperAdmin,
  onSelect,
  onViewDetails,
  onViewCustomerHistory,
  onDelete,
  getStatusColor,
  formatCurrency,
}: OrderMobileCardProps) {
  const { user } = useAuth();
  const isLockActive = !!order.locked_by &&
    !!order.lock_expiration &&
    new Date(order.lock_expiration) > new Date();
  const isLockedByOther = isLockActive && order.locked_by !== user?.id;
  const isOrderLocked = isLockedByOther;

  return (
    <div 
      className={`rounded-xl border bg-card p-4 shadow-sm transition-colors ${
        isOrderLocked ? "border-amber-300 bg-amber-500/5" : "border-border"
      }`}
    >
      {/* Top Row: Checkbox, Order ID & Date */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          {isEligibleForBulk ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(order.id, !!checked)}
              aria-label={`Select order ${order.order_number || order.id.slice(0, 8)}`}
            />
          ) : (
            <div className="w-4" />
          )}
          <div>
            <span className="font-semibold text-foreground">
              #{order.order_number || order.id.slice(0, 8)}
            </span>
            {!order.user_id && (
              <Badge variant="outline" className="ml-2 text-[10px] py-0">Guest</Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), "MMM dd, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), "hh:mm a")}
          </p>
        </div>
      </div>

      {/* Customer Name Row */}
      <div className="mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground text-base">
            {order.customer_name || "Guest Customer"}
          </span>
          <InlineFraudBadge data={fraudData} compact />
        </div>
        {order.customer_phone && (
          <p className="text-sm text-muted-foreground mt-0.5">{order.customer_phone}</p>
        )}
      </div>

      {/* Total & Status Row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-bold text-primary">
          {formatCurrency(order.total_amount)}
        </span>
        <div className="flex items-center gap-2">
          {isOrderLocked && (
            <div className="flex items-center gap-1 text-amber-600">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {order.locked_by_name?.split(" ")[0] || "Locked"}
              </span>
            </div>
          )}
          <Badge
            variant="outline"
            className={getStatusColor(order.status)}
          >
            {order.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-lg"
          onClick={() => onViewDetails(order)}
        >
          <Eye className="h-4 w-4 mr-1.5" />
          View
        </Button>
        {order.user_id && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => onViewCustomerHistory(order.user_id as string)}
          >
            <History className="h-4 w-4" />
          </Button>
        )}
        {isSuperAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={() => onDelete(order)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface OrderMobileListProps {
  orders: OrderItem[];
  selectedOrderIds: Set<string>;
  isSuperAdmin: boolean;
  getCacheForPhone: (phone?: string | null) => FraudCacheData | null | undefined;
  onSelectOrder: (orderId: string, checked: boolean) => void;
  onViewDetails: (order: OrderItem) => void;
  onViewCustomerHistory: (userId: string) => void;
  onDelete: (order: OrderItem) => void;
  getStatusColor: (status: string) => string;
  formatCurrency: (amount: number) => string;
}

export function OrderMobileList({
  orders,
  selectedOrderIds,
  isSuperAdmin,
  getCacheForPhone,
  onSelectOrder,
  onViewDetails,
  onViewCustomerHistory,
  onDelete,
  getStatusColor,
  formatCurrency,
}: OrderMobileListProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:hidden">
      {orders.map((order) => {
        const isEligibleForBulk =
          !order.courier_consignment_id &&
          order.status !== "cancelled" &&
          order.status !== "delivered";

        return (
          <OrderMobileCard
            key={order.id}
            order={order}
            isSelected={selectedOrderIds.has(order.id)}
            isEligibleForBulk={isEligibleForBulk}
            fraudData={getCacheForPhone(order.customer_phone)}
            isSuperAdmin={isSuperAdmin}
            onSelect={onSelectOrder}
            onViewDetails={onViewDetails}
            onViewCustomerHistory={onViewCustomerHistory}
            onDelete={onDelete}
            getStatusColor={getStatusColor}
            formatCurrency={formatCurrency}
          />
        );
      })}
    </div>
  );
}
