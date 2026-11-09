-- Insert default store settings if none exist
INSERT INTO public.store_settings (
  delivery_inside_dhaka,
  delivery_outside_dhaka,
  is_free_shipping_active,
  trust_badges
) 
SELECT 
  60,
  100,
  false,
  '[{"title":"১ বছরের ওয়ারেন্টি","subtitle":"1 Year Warranty","icon":"Award"},{"title":"ব্যাগ এন্ড বক্স ফ্রি","subtitle":"Free Bag & Box","icon":"Box"},{"title":"১০০% অরিজিনাল","subtitle":"100% Original","icon":"Shield"},{"title":"৭ দিনের রিপ্লেসমেন্ট","subtitle":"7 Days Replacement","icon":"RefreshCw"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);