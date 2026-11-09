import { useState } from "react";
import { Building2, Package, Check, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOutletStockForOrder, useAssignOrderToOutlet } from "@/hooks/useOutletStock";
import { useOutlets } from "@/hooks/useOutlets";
import { cn } from "@/lib/utils";

interface OrderItem {
  product_id?: string | null;
  product_name: string;
  quantity: number;
  selected_variation?: { size?: string; color?: string } | null;
}

interface OrderFulfillmentSectionProps {
  orderId: string;
  currentOutletId?: string | null;
  currentStatus: string;
  orderItems: OrderItem[];
  disabled?: boolean;
  onStatusChanged?: (info?: { oldStatus: string; newStatus: string; outletName: string }) => void;
}

export function OrderFulfillmentSection({
  orderId,
  currentOutletId,
  currentStatus,
  orderItems,
  disabled = false,
  onStatusChanged,
}: OrderFulfillmentSectionProps) {
  const { toast } = useToast();
  const [selectedOutletId, setSelectedOutletId] = useState<string>(currentOutletId || "");
  
  const { data: outlets = [], isLoading: outletsLoading } = useOutlets();
  const { data: stockAvailability = [], isLoading: stockLoading } = useOutletStockForOrder(orderItems);
  const assignMutation = useAssignOrderToOutlet();

  // Don't show for already shipped/delivered/cancelled orders
  const terminalStatuses = ["shipped", "delivered", "cancelled", "returned"];
  if (terminalStatuses.includes(currentStatus)) {
    if (currentOutletId) {
      const assignedOutlet = outlets.find(o => o.id === currentOutletId);
      return (
        <div className="rounded-lg border p-3 md:p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Fulfillment Source</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Fulfilled by: <span className="font-medium text-foreground">{assignedOutlet?.name || "Unknown Outlet"}</span>
          </p>
        </div>
      );
    }
    return null;
  }

  // Get stock info for selected outlet
  const selectedOutletStock = stockAvailability.find(s => s.outlet_id === selectedOutletId);

  const handleAssignAndConfirm = async () => {
    if (!selectedOutletId) {
      toast({
        title: "Select an outlet",
        description: "Please select a fulfillment outlet before confirming",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedOutlet = outlets.find(o => o.id === selectedOutletId);
      const outletName = selectedOutlet?.name || "Selected Outlet";

      await assignMutation.mutateAsync({
        orderId,
        outletId: selectedOutletId,
        newStatus: "confirmed",
      });

      toast({
        title: "Order Confirmed & Stock Deducted",
        description: `Order assigned to ${outletName}. Inventory has been updated automatically.`,
      });

      onStatusChanged?.({ oldStatus: currentStatus, newStatus: "confirmed", outletName });
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign order",
        variant: "destructive",
      });
    }
  };

  const isLoading = outletsLoading || stockLoading;

  return (
    <div className="rounded-lg border p-3 md:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Fulfillment Source</h4>
        {currentOutletId && (
          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
            Assigned
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Outlet Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Assign to Outlet for Shipping</label>
            <Select
              value={selectedOutletId}
              onValueChange={setSelectedOutletId}
              disabled={disabled || assignMutation.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select fulfillment outlet..." />
              </SelectTrigger>
              <SelectContent>
                {stockAvailability.map((outlet) => (
                  <SelectItem key={outlet.outlet_id} value={outlet.outlet_id}>
                    <div className="flex items-center gap-2">
                      <span className="flex-1">{outlet.outlet_name}</span>
                      {outlet.is_main_branch && (
                        <Badge variant="secondary" className="text-[10px] h-4">Main</Badge>
                      )}
                      {outlet.has_all_items ? (
                        <Badge variant="outline" className="text-[10px] h-4 bg-green-50 text-green-700 border-green-200">
                          In Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 bg-amber-50 text-amber-700 border-amber-200">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {stockAvailability.length === 0 && outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    <div className="flex items-center gap-2">
                      <span>{outlet.name}</span>
                      {outlet.is_main_branch && (
                        <Badge variant="secondary" className="text-[10px] h-4">Main</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock Details for Selected Outlet */}
          {selectedOutletStock && (
            <div className="rounded-md bg-muted/50 p-2.5 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Stock at {selectedOutletStock.outlet_name}:</p>
              {selectedOutletStock.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1 mr-2">{item.product_name}</span>
                  <span className={cn(
                    "font-medium",
                    item.has_stock ? "text-green-600" : "text-amber-600"
                  )}>
                    {item.available_qty} / {item.required_qty} needed
                  </span>
                </div>
              ))}
              
              {!selectedOutletStock.has_all_items && (
                <div className="flex items-center gap-1.5 mt-2 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Some items have insufficient stock</span>
                </div>
              )}
            </div>
          )}

          {/* Confirm Button */}
          {!currentOutletId && (
            <Button
              onClick={handleAssignAndConfirm}
              disabled={!selectedOutletId || disabled || assignMutation.isPending}
              className="w-full gap-2"
              size="sm"
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirm & Assign to Outlet
                </>
              )}
            </Button>
          )}

          {currentOutletId && selectedOutletId !== currentOutletId && (
            <Button
              onClick={handleAssignAndConfirm}
              disabled={!selectedOutletId || disabled || assignMutation.isPending}
              variant="outline"
              className="w-full gap-2"
              size="sm"
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reassigning...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Reassign to Different Outlet
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
