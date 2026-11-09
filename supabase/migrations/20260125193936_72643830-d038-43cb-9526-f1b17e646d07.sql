-- Add hero_slides column to store_settings table
ALTER TABLE public.store_settings
ADD COLUMN hero_slides jsonb DEFAULT '[
  {
    "id": "1",
    "image": "",
    "title": "Timeless Elegance on Your Wrist",
    "subtitle": "Discover our premium analog collection.",
    "buttonText": "Shop Watches",
    "link": "#mens"
  },
  {
    "id": "2",
    "image": "",
    "title": "Scents that Define You",
    "subtitle": "Long-lasting authentic fragrances.",
    "buttonText": "Explore Scents",
    "link": "#perfumes"
  }
]'::jsonb;