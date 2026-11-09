import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FraudCacheData {
  phone: string;
  total_order: number;
  success_delivery: number;
  cancel_order: number;
  success_ratio: number;
}

// Batch fetch fraud cache for multiple phone numbers
export function useFraudCache(phoneNumbers: (string | null | undefined)[]) {
  const [cache, setCache] = useState<Map<string, FraudCacheData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const fetchCache = useCallback(async () => {
    // Get unique, valid phone numbers
    const validPhones = [...new Set(
      phoneNumbers
        .filter((p): p is string => !!p)
        .map((p) => p.replace(/[\s\-\(\)]/g, ""))
    )];

    if (validPhones.length === 0) return;

    setIsLoading(true);

    try {
      // Cache expiry: 24 hours
      const cacheExpiry = new Date();
      cacheExpiry.setHours(cacheExpiry.getHours() - 24);

      const { data, error } = await supabase
        .from("fraud_check_cache")
        .select("phone, total_order, success_delivery, cancel_order, success_ratio")
        .in("phone", validPhones)
        .gte("checked_at", cacheExpiry.toISOString());

      if (error) {
        console.error("Error fetching fraud cache:", error);
        return;
      }

      // Build the cache map
      const newCache = new Map<string, FraudCacheData>();
      (data || []).forEach((item) => {
        newCache.set(item.phone, {
          phone: item.phone,
          total_order: item.total_order ?? 0,
          success_delivery: item.success_delivery ?? 0,
          cancel_order: item.cancel_order ?? 0,
          success_ratio: item.success_ratio ?? 0,
        });
      });

      setCache(newCache);
    } catch (err) {
      console.error("Fraud cache fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumbers.join(",")]);

  useEffect(() => {
    fetchCache();
  }, [fetchCache]);

  // Get cached data for a specific phone
  const getCacheForPhone = useCallback(
    (phone: string | null | undefined): FraudCacheData | null => {
      if (!phone) return null;
      const normalized = phone.replace(/[\s\-\(\)]/g, "");
      return cache.get(normalized) || null;
    },
    [cache]
  );

  return { cache, getCacheForPhone, isLoading, refetch: fetchCache };
}
