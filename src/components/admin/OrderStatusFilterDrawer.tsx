import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface StatusOption {
  value: string;
  label: string;
  color: string;
  count: number;
}

interface OrderStatusFilterDrawerProps {
  statuses: StatusOption[];
  selectedStatuses: string[];
  onApplyFilters: (statuses: string[]) => void;
  totalOrders: number;
  /** Optional custom trigger element */
  trigger?: React.ReactNode;
}

export function OrderStatusFilterDrawer({
  statuses,
  selectedStatuses,
  onApplyFilters,
  totalOrders,
  trigger,
}: OrderStatusFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>(selectedStatuses);

  // Reset temp selection when drawer opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTempSelected(selectedStatuses);
    }
    setOpen(isOpen);
  };

  const toggleStatus = (status: string) => {
    setTempSelected((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handleApply = () => {
    onApplyFilters(tempSelected);
    setOpen(false);
  };

  const handleClear = () => {
    setTempSelected([]);
  };

  const handleSelectAll = () => {
    setTempSelected(statuses.map((s) => s.value));
  };

  // Count how many filters are active (excluding "all" equivalent)
  const activeFilterCount = selectedStatuses.length;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="relative gap-2 rounded-xl md:hidden"
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <Badge className="absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full bg-primary p-0 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </DrawerTrigger>

      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold">
              Filter Orders by Status
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto p-4">
          <div className="space-y-2">
            {statuses.map((status) => {
              const isSelected = tempSelected.includes(status.value);

              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => toggleStatus(status.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-4 transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("capitalize", status.color)}
                      >
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {status.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <DrawerFooter className="border-t border-border pt-4">
          <Button
            onClick={handleApply}
            className="w-full rounded-xl py-6 text-base font-semibold"
          >
            Show Orders
            {tempSelected.length > 0 && tempSelected.length < statuses.length && (
              <span className="ml-2">
                ({tempSelected.length} {tempSelected.length === 1 ? "status" : "statuses"})
              </span>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
