import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Truck,
  CheckCircle2,
  XCircle,
  PauseCircle,
  RotateCcw,
  Package,
  AlertCircle,
  Wallet,
  StickyNote,
  Hash,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WebhookEvent {
  id: string;
  consignment_id: string | null;
  tracking_code: string | null;
  courier_status: string | null;
  mapped_order_status: string | null;
  cod_collected: number | null;
  delivery_charge: number | null;
  note: string | null;
  received_at: string;
}

interface Props {
  orderId: string | null;
  orderNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_STYLES: Record<
  string,
  { label: string; icon: typeof Truck; ring: string; bg: string; text: string }
> = {
  delivered: { label: "Delivered", icon: CheckCircle2, ring: "ring-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-700" },
  partial_delivered: { label: "Partially Delivered", icon: CheckCircle2, ring: "ring-lime-500/40", bg: "bg-lime-500/10", text: "text-lime-700" },
  delivered_approval_pending: { label: "Delivered (Approval Pending)", icon: Clock, ring: "ring-sky-500/40", bg: "bg-sky-500/10", text: "text-sky-700" },
  partial_delivered_approval_pending: { label: "Partial (Approval Pending)", icon: Clock, ring: "ring-sky-500/40", bg: "bg-sky-500/10", text: "text-sky-700" },
  cancelled_approval_pending: { label: "Cancel (Approval Pending)", icon: Clock, ring: "ring-orange-500/40", bg: "bg-orange-500/10", text: "text-orange-700" },
  cancelled: { label: "Cancelled", icon: XCircle, ring: "ring-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-700" },
  hold: { label: "On Hold", icon: PauseCircle, ring: "ring-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-700" },
  returned: { label: "Returned", icon: RotateCcw, ring: "ring-fuchsia-500/40", bg: "bg-fuchsia-500/10", text: "text-fuchsia-700" },
  in_review: { label: "In Review", icon: AlertCircle, ring: "ring-indigo-500/40", bg: "bg-indigo-500/10", text: "text-indigo-700" },
  pending: { label: "Pending Pickup", icon: Package, ring: "ring-slate-400/40", bg: "bg-slate-500/10", text: "text-slate-700" },
};

const fallback = { label: "Update", icon: Truck, ring: "ring-slate-400/40", bg: "bg-slate-500/10", text: "text-slate-700" };

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  return { date, time };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function CourierWebhookTimeline({ orderId, orderNumber, open, onOpenChange }: Props) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("courier_webhook_events")
      .select("id, consignment_id, tracking_code, courier_status, mapped_order_status, cod_collected, delivery_charge, note, received_at")
      .eq("order_id", orderId)
      .order("received_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load webhook events:", error);
          setEvents([]);
        } else {
          setEvents(data || []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Steadfast Webhook Timeline
          </DialogTitle>
          <DialogDescription>
            {orderNumber ? `Order ${orderNumber} — ` : ""}
            Steadfast থেকে আসা সব automatic status update, নতুন থেকে পুরনো ক্রমে।
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">এই অর্ডারের জন্য এখনও কোনো webhook আসেনি।</p>
              <p className="text-xs mt-1">Steadfast আপডেট পাঠালে এখানে স্বয়ংক্রিয়ভাবে দেখা যাবে।</p>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {events.map((ev, idx) => {
                  const meta = STATUS_STYLES[ev.courier_status || ""] || fallback;
                  const Icon = meta.icon;
                  const { date, time } = formatDateTime(ev.received_at);
                  return (
                    <div key={ev.id} className="relative">
                      <div
                        className={cn(
                          "absolute -left-[22px] top-3 h-4 w-4 rounded-full ring-4 ring-background flex items-center justify-center",
                          meta.bg,
                          "ring",
                          meta.ring
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", meta.text.replace("text-", "bg-"))} />
                      </div>

                      <div className={cn("rounded-xl border p-4 transition-colors", idx === 0 && "shadow-sm")}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("p-2 rounded-lg shrink-0", meta.bg)}>
                              <Icon className={cn("h-4 w-4", meta.text)} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={cn("font-semibold text-sm truncate", meta.text)}>{meta.label}</h4>
                                {idx === 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Latest</Badge>
                                )}
                              </div>
                              {ev.mapped_order_status && ev.mapped_order_status !== ev.courier_status && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Order status → <span className="font-medium capitalize">{ev.mapped_order_status.replace(/_/g, " ")}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium">{time}</p>
                            <p className="text-[10px] text-muted-foreground">{date}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(ev.received_at)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {ev.cod_collected != null && (
                            <div className="flex items-center gap-2 bg-muted/40 rounded-md px-2 py-1.5">
                              <Wallet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground leading-tight">COD Collected</p>
                                <p className="font-semibold text-emerald-700">৳{ev.cod_collected}</p>
                              </div>
                            </div>
                          )}
                          {ev.delivery_charge != null && (
                            <div className="flex items-center gap-2 bg-muted/40 rounded-md px-2 py-1.5">
                              <Truck className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground leading-tight">Delivery Charge</p>
                                <p className="font-semibold text-sky-700">৳{ev.delivery_charge}</p>
                              </div>
                            </div>
                          )}
                          {ev.tracking_code && (
                            <div className="flex items-center gap-2 bg-muted/40 rounded-md px-2 py-1.5 col-span-2">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground leading-tight">Tracking</p>
                                <p className="font-mono font-medium truncate">{ev.tracking_code}</p>
                              </div>
                            </div>
                          )}
                          {ev.consignment_id && (
                            <div className="flex items-center gap-2 bg-muted/40 rounded-md px-2 py-1.5 col-span-2">
                              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground leading-tight">Consignment</p>
                                <p className="font-mono font-medium truncate">{ev.consignment_id}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {ev.note && (
                          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                            <StickyNote className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-900 leading-relaxed">{ev.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
