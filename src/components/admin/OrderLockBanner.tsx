import { AlertTriangle, Clock, Lock } from "lucide-react";
import { format } from "date-fns";

interface OrderLockBannerProps {
  lockedByName: string;
  lockExpiration: Date | null;
}

export const OrderLockBanner = ({ lockedByName, lockExpiration }: OrderLockBannerProps) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 mb-4">
      <div className="rounded-full bg-amber-500/20 p-2">
        <Lock className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-amber-700 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Order Currently Being Processed
        </div>
        <p className="text-sm text-amber-600 mt-1">
          This order is being handled by <span className="font-bold">{lockedByName}</span>
          {lockExpiration && (
            <>
              {" "}until{" "}
              <span className="font-medium">
                {format(lockExpiration, "h:mm a")}
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-amber-600">
        <Clock className="h-3.5 w-3.5" />
        <span>
          {lockExpiration && (
            <>Unlocks in {Math.max(0, Math.ceil((lockExpiration.getTime() - Date.now()) / 60000))} min</>
          )}
        </span>
      </div>
    </div>
  );
};
