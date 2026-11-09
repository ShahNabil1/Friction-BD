import { format } from "date-fns";
import { Clock, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useOrderStatusHistory } from "@/hooks/useOrderStatusHistory";

interface OrderStatusTimelineProps {
  orderId: string;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  hold: "On Hold",
  confirmed: "Confirmed",
  packaging: "Packaging",
  shipped: "Shipped",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  hold: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  confirmed: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  packaging: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  ready_for_delivery: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  delivered: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
  returned: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function OrderStatusTimeline({ orderId }: OrderStatusTimelineProps) {
  const { history, isLoading } = useOrderStatusHistory(orderId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Status History</h4>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          No status changes recorded yet
        </p>
      ) : (
        <ScrollArea className="max-h-[250px]">
          <div className="relative space-y-0">
            {/* Timeline Line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />

            {history.map((entry, index) => (
              <div key={entry.id} className="relative flex gap-3 pb-4">
                {/* Timeline Dot */}
                <div
                  className={`relative z-10 mt-1.5 h-[22px] w-[22px] rounded-full flex items-center justify-center ${
                    index === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted border-2 border-border"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.old_status && (
                      <>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            statusColors[entry.old_status] || "bg-muted"
                          }`}
                        >
                          {statusLabels[entry.old_status] || entry.old_status}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        statusColors[entry.new_status] || "bg-muted"
                      }`}
                    >
                      {statusLabels[entry.new_status] || entry.new_status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{entry.changed_by_name || "System"}</span>
                    <span className="mx-1">•</span>
                    <span>
                      {format(new Date(entry.changed_at), "MMM dd, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  {entry.note && (
                    <div className="mt-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-1.5 text-xs text-foreground/90 whitespace-pre-wrap break-words">
                      {entry.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
