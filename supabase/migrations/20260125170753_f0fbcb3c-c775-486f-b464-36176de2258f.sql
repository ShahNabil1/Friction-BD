-- Clear all cached fraud data to force fresh API calls
TRUNCATE TABLE public.fraud_check_cache;