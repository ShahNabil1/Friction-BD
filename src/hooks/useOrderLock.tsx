import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface LockInfo {
  locked_by: string | null;
  locked_by_name: string | null;
  lock_expiration: string | null;
}

interface UseOrderLockOptions {
  orderId: string | null;
  onLockAcquired?: () => void;
  onLockLost?: () => void;
}

interface UseOrderLockReturn {
  isLocked: boolean;
  isLockedByMe: boolean;
  lockedByName: string | null;
  lockExpiration: Date | null;
  isAcquiringLock: boolean;
  acquireLock: () => Promise<boolean>;
  releaseLock: () => Promise<void>;
  refreshLockStatus: () => Promise<void>;
}

const LOCK_DURATION_MINUTES = 8;

export const useOrderLock = ({
  orderId,
  onLockAcquired,
  onLockLost,
}: UseOrderLockOptions): UseOrderLockReturn => {
  const { user } = useAuth();
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const previouslyLockedByMe = useRef(false);

  // Compute lock status
  const now = new Date();
  const lockExpiration = lockInfo?.lock_expiration ? new Date(lockInfo.lock_expiration) : null;
  const isLockExpired = lockExpiration ? lockExpiration <= now : true;
  const isLockedByMe = lockInfo?.locked_by === user?.id && !isLockExpired;
  const isLocked = !!lockInfo?.locked_by && !isLockExpired;
  const lockedByOther = isLocked && !isLockedByMe;

  // Fetch current lock status
  const refreshLockStatus = useCallback(async () => {
    if (!orderId) return;

    const { data, error } = await supabase
      .from("orders")
      .select("locked_by, locked_by_name, lock_expiration")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching lock status:", error);
      return;
    }

    setLockInfo(data);
  }, [orderId]);

  // Acquire lock for current user
  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!orderId || !user) return false;

    setIsAcquiringLock(true);

    try {
      // First check current lock status
      const { data: currentLock } = await supabase
        .from("orders")
        .select("locked_by, lock_expiration")
        .eq("id", orderId)
        .maybeSingle();

      // Check if someone else has a valid lock
      if (currentLock?.locked_by && currentLock.locked_by !== user.id) {
        const expiration = new Date(currentLock.lock_expiration || 0);
        if (expiration > new Date()) {
          // Order is locked by someone else
          await refreshLockStatus();
          return false;
        }
      }

      // Get user's name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      const userName = profile?.full_name || profile?.email || user.email || "Unknown";

      // Set lock expiration
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + LOCK_DURATION_MINUTES);

      // Acquire the lock
      const { error } = await supabase
        .from("orders")
        .update({
          locked_by: user.id,
          locked_by_name: userName,
          lock_expiration: expirationTime.toISOString(),
        })
        .eq("id", orderId);

      if (error) {
        console.error("Error acquiring lock:", error);
        return false;
      }

      await refreshLockStatus();
      onLockAcquired?.();
      return true;
    } catch (error) {
      console.error("Error acquiring lock:", error);
      return false;
    } finally {
      setIsAcquiringLock(false);
    }
  }, [orderId, user, refreshLockStatus, onLockAcquired]);

  // Release lock
  const releaseLock = useCallback(async () => {
    if (!orderId || !user) return;

    // Only release if we own the lock
    const { data: currentLock } = await supabase
      .from("orders")
      .select("locked_by")
      .eq("id", orderId)
      .maybeSingle();

    if (currentLock?.locked_by !== user.id) return;

    try {
      await supabase
        .from("orders")
        .update({
          locked_by: null,
          locked_by_name: null,
          lock_expiration: null,
        })
        .eq("id", orderId);
    } catch (error) {
      console.error("Error releasing lock:", error);
    }
  }, [orderId, user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!orderId) {
      setLockInfo(null);
      return;
    }

    // Initial fetch
    refreshLockStatus();

    // Subscribe to changes
    channelRef.current = supabase
      .channel(`order-lock-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newData = payload.new as LockInfo;
          setLockInfo({
            locked_by: newData.locked_by,
            locked_by_name: newData.locked_by_name,
            lock_expiration: newData.lock_expiration,
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orderId, refreshLockStatus]);

  // Detect if we lost the lock to ANOTHER user (not self-release)
  useEffect(() => {
    if (previouslyLockedByMe.current && !isLockedByMe) {
      // Only notify if someone else actively took over the lock
      if (lockInfo?.locked_by && lockInfo.locked_by !== user?.id && !isLockExpired) {
        onLockLost?.();
      }
    }
    previouslyLockedByMe.current = isLockedByMe;
  }, [isLockedByMe, onLockLost, lockInfo, user?.id, isLockExpired]);

  // Auto-refresh lock status periodically to handle expiration
  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(() => {
      // Force re-render to update isLockExpired
      setLockInfo((prev) => (prev ? { ...prev } : null));
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [orderId]);

  return {
    isLocked,
    isLockedByMe,
    lockedByName: lockedByOther ? lockInfo?.locked_by_name || null : null,
    lockExpiration,
    isAcquiringLock,
    acquireLock,
    releaseLock,
    refreshLockStatus,
  };
};
