-- Create store_settings table for global checkout configuration
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_inside_dhaka integer NOT NULL DEFAULT 60,
  delivery_outside_dhaka integer NOT NULL DEFAULT 100,
  is_free_shipping_active boolean NOT NULL DEFAULT false,
  trust_badges jsonb NOT NULL DEFAULT '[
    {"title": "১ বছরের ওয়ারেন্টি", "subtitle": "1 Year Warranty", "icon": "Award"},
    {"title": "ব্যাগ এন্ড বক্স ফ্রি", "subtitle": "Free Bag & Box", "icon": "Box"},
    {"title": "১০০% অরিজিনাল", "subtitle": "100% Original", "icon": "Shield"},
    {"title": "৭ দিনের রিপ্লেসমেন্ট", "subtitle": "7 Days Replacement", "icon": "RefreshCw"}
  ]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view store settings (needed for checkout page)
CREATE POLICY "Anyone can view store settings"
  ON public.store_settings
  FOR SELECT
  USING (true);

-- Only admins can manage store settings
CREATE POLICY "Admins can manage store settings"
  ON public.store_settings
  FOR ALL
  USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row if table is empty
INSERT INTO public.store_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);