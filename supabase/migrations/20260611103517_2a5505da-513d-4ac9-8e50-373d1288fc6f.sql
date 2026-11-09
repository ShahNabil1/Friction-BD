
-- 1) Profiles privilege escalation guard
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    NEW.role := OLD.role;
    NEW.permissions := OLD.permissions;
    NEW.can_access_pos := OLD.can_access_pos;
    NEW.assigned_outlet_id := OLD.assigned_outlet_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) Coupons: only expose active coupons publicly
DROP POLICY IF EXISTS "Coupons are viewable by everyone" ON public.coupons;
CREATE POLICY "Active coupons are viewable by everyone"
ON public.coupons FOR SELECT
USING (is_active = true);

-- 3) Move buying_price out of products into admin-only product_costs
CREATE TABLE IF NOT EXISTS public.product_costs (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  buying_price integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_costs TO authenticated;
GRANT ALL ON public.product_costs TO service_role;
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read product costs" ON public.product_costs;
CREATE POLICY "Admins read product costs"
ON public.product_costs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage product costs" ON public.product_costs;
CREATE POLICY "Admins manage product costs"
ON public.product_costs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER product_costs_set_updated_at
BEFORE UPDATE ON public.product_costs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.product_costs (product_id, buying_price)
SELECT id, buying_price FROM public.products WHERE buying_price IS NOT NULL
ON CONFLICT (product_id) DO UPDATE SET buying_price = EXCLUDED.buying_price;

ALTER TABLE public.products DROP COLUMN IF EXISTS buying_price;

-- 4) Move meta_conversion_token out of store_settings into admin-only secure_settings
CREATE TABLE IF NOT EXISTS public.secure_settings (
  key text PRIMARY KEY,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secure_settings TO authenticated;
GRANT ALL ON public.secure_settings TO service_role;
ALTER TABLE public.secure_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read secure settings" ON public.secure_settings;
CREATE POLICY "Admins read secure settings"
ON public.secure_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage secure settings" ON public.secure_settings;
CREATE POLICY "Admins manage secure settings"
ON public.secure_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER secure_settings_set_updated_at
BEFORE UPDATE ON public.secure_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.secure_settings (key, value)
SELECT 'meta_conversion_token', meta_conversion_token
FROM public.store_settings
WHERE meta_conversion_token IS NOT NULL
LIMIT 1
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

ALTER TABLE public.store_settings DROP COLUMN IF EXISTS meta_conversion_token;

-- 5) Outlet master PIN: hash and gate access via RPCs
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS master_pin_hash text;

UPDATE public.outlets
SET master_pin_hash = crypt(master_pin, gen_salt('bf'))
WHERE master_pin IS NOT NULL AND master_pin_hash IS NULL;

ALTER TABLE public.outlets DROP COLUMN IF EXISTS master_pin;

CREATE OR REPLACE FUNCTION public.set_outlet_master_pin(p_outlet_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_pin IS NULL OR length(p_pin) = 0 THEN
    UPDATE public.outlets SET master_pin_hash = NULL WHERE id = p_outlet_id;
  ELSE
    UPDATE public.outlets SET master_pin_hash = crypt(p_pin, gen_salt('bf')) WHERE id = p_outlet_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_outlet_master_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_outlet_master_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_outlet_master_pin(p_outlet_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT master_pin_hash INTO v_hash FROM public.outlets WHERE id = p_outlet_id;
  IF v_hash IS NULL THEN
    RETURN false;
  END IF;
  RETURN crypt(p_pin, v_hash) = v_hash;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_outlet_master_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_outlet_master_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.outlet_has_master_pin(p_outlet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outlets
    WHERE id = p_outlet_id AND master_pin_hash IS NOT NULL
  );
$$;
REVOKE EXECUTE ON FUNCTION public.outlet_has_master_pin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.outlet_has_master_pin(uuid) TO authenticated;

-- Block clients from reading the new hash column
REVOKE SELECT (master_pin_hash) ON public.outlets FROM anon, authenticated;

-- 6) Add deny-by-default policies on rate-limit tables
DROP POLICY IF EXISTS "Service role only" ON public.sms_rate_limits;
CREATE POLICY "Service role only" ON public.sms_rate_limits FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service role only" ON public.sms_ip_rate_limits;
CREATE POLICY "Service role only" ON public.sms_ip_rate_limits FOR ALL USING (false) WITH CHECK (false);

-- 7) Restrict execute on privileged security-definer RPCs
REVOKE EXECUTE ON FUNCTION public.create_manual_order(uuid, uuid, text, text, text, jsonb, integer, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_manual_order(uuid, uuid, text, text, text, jsonb, integer, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.swap_order_item_variant(uuid, uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.swap_order_item_variant(uuid, uuid, uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_inventory_transfer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_inventory_transfer(uuid) TO authenticated;
