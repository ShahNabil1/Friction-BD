import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface FraudCacheData {
  phone: string;
  total_order: number;
  success_delivery: number;
  cancel_order: number;
  success_ratio: number;
}

interface InlineFraudBadgeProps {
  data: FraudCacheData | null;
  compact?: boolean;
}

export function InlineFraudBadge({ data, compact = true }: InlineFraudBadgeProps) {
  // No cached data available - show nothing
  if (!data) return null;

  const successRatio = data.success_ratio ?? 0;

  // Determine risk level and styling
  const getRiskConfig = (ratio: number) => {
    if (ratio >= 80) {
      return {
        icon: ShieldCheck,
        label: "Safe",
        className:
          "bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20",
      };
    }
    if (ratio >= 50) {
      return {
        icon: AlertTriangle,
        label: "Caution",
        className:
          "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20",
      };
    }
    return {
      icon: ShieldAlert,
      label: "Risk",
      className:
        "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20",
    };
  };

  const config = getRiskConfig(successRatio);
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn("gap-1 cursor-help", config.className)}
          >
            <Icon className="h-3 w-3" />
            {compact ? (
              <span className="text-xs font-semibold">{successRatio}%</span>
            ) : (
              <>
                <span className="text-xs font-semibold">{successRatio}%</span>
                <span className="text-xs hidden sm:inline">{config.label}</span>
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <p className="font-medium">Delivery Reliability: {successRatio}%</p>
            <p>📦 Total: {data.total_order}</p>
            <p>✅ Delivered: {data.success_delivery}</p>
            <p>❌ Cancelled: {data.cancel_order}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
