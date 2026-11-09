-- Add signature_section and offer_banner columns to store_settings
ALTER TABLE public.store_settings
ADD COLUMN signature_section jsonb DEFAULT '{
  "isEnabled": true,
  "image": "",
  "badge": "Signature Drop",
  "title": "The Classic Signature Watch",
  "desc": "Crafted for those who appreciate timeless elegance with modern functionality.",
  "price": "12,999",
  "features": ["Water-resistant up to 100m", "Sapphire crystal glass", "Swiss automatic movement", "2-year warranty"],
  "link": "#"
}'::jsonb,
ADD COLUMN offer_banner jsonb DEFAULT '{
  "isEnabled": true,
  "image": "",
  "badge": "Seasonal Collection",
  "title": "Exclusive Season Offer",
  "desc": "Get up to 30% off on selected items this season.",
  "btnText": "Shop Offers",
  "link": "#offers"
}'::jsonb;