import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Loader2, AlertTriangle, Save, ArrowLeft, Plus, Building2, AlertCircle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useOutlets, useUserOutlet } from "@/hooks/useOutlets";
import { useUserRole } from "@/hooks/useUserRole";
import { useOutletInventoryList, useAdjustOutletStock } from "@/hooks/useOutletInventory";
import { supabase } from "@/integrations/supabase/client";

const LARGE_STOCK_CHANGE_THRESHOLD = 50;
const INVENTORY_KEY_SEPARATOR = "::";
 
 export default function AdminInventory() {
   const { toast } = useToast();
   const navigate = useNavigate();
   const { isSuperAdmin, role } = useUserRole();
   const { data: allOutlets = [] } = useOutlets();
   const { data: userOutlet } = useUserOutlet();
   const adjustStock = useAdjustOutletStock();
   const { logActivity } = useActivityLog();
   const { createNotification } = useAdminNotifications();
 
   // Outlet selection logic
   const canSelectOutlet = isSuperAdmin || role === "admin";
   const lockedOutletId = !canSelectOutlet ? userOutlet?.outletId : null;
   const [selectedOutletId, setSelectedOutletId] = useState<string>("");
 
   // Auto-set outlet for locked users or first outlet
   useEffect(() => {
     if (lockedOutletId) {
       setSelectedOutletId(lockedOutletId);
     } else if (canSelectOutlet && allOutlets.length > 0 && !selectedOutletId) {
       const mainBranch = allOutlets.find(o => o.is_main_branch);
       setSelectedOutletId(mainBranch?.id || allOutlets[0].id);
     }
   }, [lockedOutletId, canSelectOutlet, allOutlets, selectedOutletId]);
 
   const effectiveOutletId = lockedOutletId || selectedOutletId;
   const selectedOutlet = allOutlets.find(o => o.id === effectiveOutletId);
 
   // Fetch inventory for selected outlet
   const { data: outletInventory = [], isLoading: inventoryLoading } = useOutletInventoryList(effectiveOutletId || null);
 
   const [searchTerm, setSearchTerm] = useState("");
   const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
   const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
   const tableRef = useRef<HTMLTableSectionElement>(null);
 
   const handleStockChange = (key: string, value: string) => {
     const numValue = parseInt(value) || 0;
     setEditedStocks((prev) => ({
       ...prev,
       [key]: Math.max(0, numValue),
     }));
   };
 
   const handleSaveAll = async () => {
     const updates = Object.entries(editedStocks);
     if (updates.length === 0 || !effectiveOutletId) return;
 
     try {
        for (const [key, newQuantity] of updates) {
          const [productId, variantId] = key.split(INVENTORY_KEY_SEPARATOR);
         const item = outletInventory.find((i: any) => 
           i.product_id === productId && 
           (i.variant_id || "null") === variantId
         );
         
         await adjustStock.mutateAsync({
           outletId: effectiveOutletId,
           productId,
           variantId: variantId === "null" ? null : variantId,
           newQuantity,
           reason: "Manual adjustment from inventory page",
         });
 
         if (item) {
           const oldQty = item.quantity || 0;
           await logActivity({
             actionType: "stock_adjusted",
             entityType: "outlet_inventory",
             entityId: productId,
             details: {
               outlet_id: effectiveOutletId,
               outlet_name: selectedOutlet?.name,
               product_title: item.product?.title,
               variant: item.variant ? `${item.variant.size || ""} ${item.variant.color || ""}`.trim() : null,
               old_quantity: oldQty,
               new_quantity: newQuantity,
               change: newQuantity - oldQty,
             },
           });
 
           const changeAmount = Math.abs(newQuantity - oldQty);
           if (changeAmount >= LARGE_STOCK_CHANGE_THRESHOLD) {
             await createNotification({
               type: "large_stock_change",
               title: "Large Stock Adjustment",
               message: `${item.product?.title}: Stock adjusted by ${changeAmount} units at ${selectedOutlet?.name}`,
               entityType: "product",
               entityId: productId,
               severity: "warning",
             });
           }
         }
       }
 
       setEditedStocks({});
       toast({
         title: "Inventory Updated",
         description: `Updated ${updates.length} item(s) at ${selectedOutlet?.name}`,
       });
     } catch (error) {
       toast({
         title: "Error",
         description: "Failed to save some inventory changes",
         variant: "destructive",
       });
     }
   };
 
    // Group inventory by product_id + variant_id to merge duplicates
    const groupedInventory = useMemo(() => {
      const groups = new Map<string, {
        key: string;
        product_id: string;
        variant_id: string | null;
        product: any;
        variant: any;
        totalQuantity: number;
        rows: any[];
        hasDuplicates: boolean;
      }>();
      
      for (const item of outletInventory as any[]) {
         const key = `${item.product_id}${INVENTORY_KEY_SEPARATOR}${item.variant_id || "null"}`;
        const existing = groups.get(key);
        
        if (existing) {
          existing.totalQuantity += item.quantity || 0;
          existing.rows.push(item);
          existing.hasDuplicates = true;
        } else {
          groups.set(key, {
            key,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product: item.product,
            variant: item.variant,
            totalQuantity: item.quantity || 0,
            rows: [item],
            hasDuplicates: false,
          });
        }
      }
      
      return Array.from(groups.values());
    }, [outletInventory]);

    // Check if there are any duplicates
    const hasDuplicateRows = useMemo(() => 
      groupedInventory.some(g => g.hasDuplicates), 
      [groupedInventory]
    );

    const filteredInventory = groupedInventory.filter((item) =>
      item.product?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.variant?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const lowStockItems = groupedInventory.filter((item) => {
      const currentStock = editedStocks[item.key] ?? item.totalQuantity;
      return currentStock <= 10 && currentStock > 0;
    });

    const outOfStockItems = groupedInventory.filter((item) => {
      const currentStock = editedStocks[item.key] ?? item.totalQuantity;
      return currentStock === 0;
    });

    // Cleanup duplicates function
    const [isCleaningUp, setIsCleaningUp] = useState(false);
    const handleCleanupDuplicates = async () => {
      if (!effectiveOutletId) return;
      setIsCleaningUp(true);
      
      try {
        const { data, error } = await supabase.functions.invoke("cleanup-inventory-duplicates", {
          body: { outlet_id: effectiveOutletId },
        });
        
        if (error) throw error;
        
        toast({
          title: "Cleanup Complete",
          description: `Merged ${data?.merged_count || 0} duplicate entries`,
        });
        
        // Refresh inventory
        window.location.reload();
      } catch (error: any) {
        toast({
          title: "Cleanup Failed",
          description: error.message || "Failed to cleanup duplicates",
          variant: "destructive",
        });
      } finally {
        setIsCleaningUp(false);
      }
    };
 
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get effective price: variant price takes priority over product price
  const getEffectivePrice = (item: any) => {
    const variantPrice = item.variant?.price_cents;
    const productPrice = item.product?.price_cents || 0;
    return (variantPrice && variantPrice > 0) ? variantPrice : productPrice;
  };
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       {/* Header */}
       <header className="sticky top-0 z-50 bg-card border-b">
         <div className="flex items-center justify-between px-4 py-3">
           <div className="flex items-center gap-3">
             <Button
               variant="ghost"
               size="icon"
               onClick={() => navigate("/pos/management")}
               className="h-8 w-8"
             >
               <ArrowLeft className="h-4 w-4" />
             </Button>
             <div className="flex items-center gap-2">
               <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                 <Package className="h-4 w-4 text-primary" />
               </div>
               <div>
                 <h1 className="text-base font-semibold">Inventory Management</h1>
                 <p className="text-xs text-muted-foreground">
                   {selectedOutlet?.name || "Select outlet"}
                 </p>
               </div>
             </div>
           </div>
            <div className="flex items-center gap-2">
              {hasDuplicateRows && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCleanupDuplicates}
                        disabled={isCleaningUp}
                        className="gap-1 border-amber-500 text-amber-600 hover:bg-amber-50"
                      >
                        {isCleaningUp ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wrench className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Fix Data</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Merge duplicate inventory rows</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/pos/inventory/stock-in")}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Stock In</span>
              </Button>
              {Object.keys(editedStocks).length > 0 && (
                <Button onClick={handleSaveAll} disabled={adjustStock.isPending} size="sm">
                  {adjustStock.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-4 w-4" />
                  )}
                  Save ({Object.keys(editedStocks).length})
                </Button>
              )}
            </div>
         </div>
       </header>
 
       <div className="flex-1 overflow-auto p-4 space-y-4">
         {/* Outlet Selector (Super Admin only) */}
         {canSelectOutlet && (
           <Card className="border-border/50">
             <CardContent className="p-4">
               <div className="flex items-center gap-4">
                 <Building2 className="h-5 w-5 text-muted-foreground" />
                 <div className="flex-1">
                   <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                     <SelectTrigger className="w-full sm:w-64">
                       <SelectValue placeholder="Select outlet to manage" />
                     </SelectTrigger>
                     <SelectContent>
                       {allOutlets.map((outlet) => (
                         <SelectItem key={outlet.id} value={outlet.id}>
                           <div className="flex items-center gap-2">
                             {outlet.name}
                             {outlet.is_main_branch && (
                               <Badge variant="secondary" className="text-xs">Main</Badge>
                             )}
                           </div>
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               </div>
             </CardContent>
           </Card>
         )}
 
         {/* Stats */}
         <div className="grid gap-4 grid-cols-3">
           <Card className="border-border/50">
             <CardContent className="flex items-center gap-3 p-4">
               <div className="rounded-lg bg-primary/10 p-2">
                 <Package className="h-4 w-4 text-primary" />
               </div>
               <div>
                 <p className="text-xs text-muted-foreground">Items</p>
                 <p className="text-lg font-bold">{outletInventory.length}</p>
               </div>
             </CardContent>
           </Card>
 
           <Card className="border-border/50">
             <CardContent className="flex items-center gap-3 p-4">
               <div className="rounded-lg bg-amber-100 p-2">
                 <AlertTriangle className="h-4 w-4 text-amber-600" />
               </div>
               <div>
                 <p className="text-xs text-muted-foreground">Low</p>
                 <p className="text-lg font-bold">{lowStockItems.length}</p>
               </div>
             </CardContent>
           </Card>
 
           <Card className="border-border/50">
             <CardContent className="flex items-center gap-3 p-4">
               <div className="rounded-lg bg-destructive/10 p-2">
                 <Package className="h-4 w-4 text-destructive" />
               </div>
               <div>
                 <p className="text-xs text-muted-foreground">Out</p>
                 <p className="text-lg font-bold">{outOfStockItems.length}</p>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* Search */}
         <div className="relative">
           <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
           <Input
             placeholder="Search by product name or SKU..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-10"
           />
         </div>
 
         {/* Inventory Table */}
         <Card className="border-border/50">
           <CardContent className="p-0">
             {inventoryLoading || !effectiveOutletId ? (
               <div className="flex items-center justify-center py-20">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
             ) : filteredInventory.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20">
                 <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
                 <p className="text-muted-foreground">No inventory at this outlet</p>
                 <Button
                   variant="outline"
                   size="sm"
                   className="mt-4"
                   onClick={() => navigate("/pos/inventory/stock-in")}
                 >
                   <Plus className="mr-2 h-4 w-4" />
                   Add Stock
                 </Button>
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Product</TableHead>
                       <TableHead>Variant</TableHead>
                       <TableHead>Price</TableHead>
                       <TableHead>Stock</TableHead>
                       <TableHead>Status</TableHead>
                     </TableRow>
                   </TableHeader>
                    <TableBody ref={tableRef}>
                      {filteredInventory.map((item) => {
                        const currentStock = editedStocks[item.key] ?? item.totalQuantity;
                        const isEdited = editedStocks[item.key] !== undefined;
  
                        return (
                          <TableRow 
                            key={item.key}
                            id={`inventory-row-${item.key}`}
                            className={highlightedProductId === item.product_id ? "bg-primary/10 animate-pulse" : ""}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {item.product?.images?.[0] ? (
                                  <img
                                    src={item.product.images[0]}
                                    alt={item.product.title}
                                    className="h-10 w-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0 flex items-center gap-2">
                                  <div>
                                    <p className="font-medium text-sm truncate">{item.product?.title || "Unknown"}</p>
                                    <code className="text-xs text-muted-foreground">
                                      {item.variant?.sku || item.product?.sku || "-"}
                                    </code>
                                  </div>
                                  {item.hasDuplicates && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <AlertCircle className="h-4 w-4 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{item.rows.length} duplicate rows detected</p>
                                          <p className="text-xs text-muted-foreground">Click "Fix Data" to merge</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.variant ? (
                                <Badge variant="outline" className="text-xs">
                                  {[item.variant.size, item.variant.color].filter(Boolean).join(" / ")}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Default</span>
                              )}
                            </TableCell>
                             <TableCell className="font-semibold text-primary text-sm">
                               {formatCurrency(getEffectivePrice(item))}
                             </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={currentStock}
                                onChange={(e) => handleStockChange(item.key, e.target.value)}
                                className={`w-20 h-8 text-sm ${
                                  isEdited ? "border-primary ring-1 ring-primary" : ""
                                }`}
                              />
                            </TableCell>
                            <TableCell>
                              {currentStock === 0 ? (
                                <Badge variant="destructive" className="text-xs">Out</Badge>
                              ) : currentStock <= 10 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs"
                                >
                                  Low
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-green-500/10 text-green-600 border-green-500/20 text-xs"
                                >
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                 </Table>
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     </div>
   );
 }