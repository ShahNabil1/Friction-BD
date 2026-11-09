import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeadStatus {
  value: string;
  label: string;
  count: number;
  color: string;
}

interface LeadStatusFilterDrawerProps {
  statuses: LeadStatus[];
  selectedStatus: string;
  onApplyFilter: (status: string) => void;
  trigger?: React.ReactNode;
}

export function LeadStatusFilterDrawer({
  statuses,
  selectedStatus,
  onApplyFilter,
  trigger,
}: LeadStatusFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState(selectedStatus);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTempStatus(selectedStatus);
    }
  };

  const handleApply = () => {
    onApplyFilter(tempStatus);
    setOpen(false);
  };

  const handleClear = () => {
    setTempStatus("pending");
  };

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle>Filter by Status</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <DrawerDescription>
            Select a status to filter leads
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4">
          <div className="space-y-2">
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => setTempStatus(status.value)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                  tempStatus === status.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="font-medium">{status.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {status.count}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <DrawerFooter className="pt-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={handleClear}>
              Reset
            </Button>
            <Button className="flex-1" onClick={handleApply}>
              Apply Filter
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
