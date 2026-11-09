-- =============================================
-- Upsert Email Templates for Order Notifications
-- =============================================

INSERT INTO public.email_templates (trigger_event, subject, html_body, is_active) VALUES
(
  'order_created',
  'Order Confirmed — Thank You, {{customer_name}}!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    <div style="background: #800020; padding: 20px; text-align: center;">
      <h1 style="color: #D4AF37; margin: 0;">Fashion Elegance</h1>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1A1A1A;">Thank You for Your Order!</h2>
      <p style="color: #333;">Dear {{customer_name}},</p>
      <p style="color: #333;">We''re delighted to confirm your order <strong>#{{order_id}}</strong> has been received and is being processed.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Order ID:</strong> {{order_id}}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> {{total_amount}}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> {{customer_email}}</p>
        <p style="margin: 5px 0;"><strong>Phone:</strong> {{customer_phone}}</p>
      </div>
      <p style="color: #333;">We''ll notify you once your order ships. You can track your order using the link below.</p>
      <p style="color: #800020; font-weight: bold;">Thank you for choosing Fashion Elegance!</p>
    </div>
    <div style="background: #1A1A1A; padding: 20px; text-align: center;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Fashion Elegance. All rights reserved.</p>
    </div>
  </div>',
  true
),
(
  'order_shipped',
  'Your Order #{{order_id}} Has Shipped!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    <div style="background: #800020; padding: 20px; text-align: center;">
      <h1 style="color: #D4AF37; margin: 0;">Fashion Elegance</h1>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1A1A1A;">🚚 Your Order is On Its Way!</h2>
      <p style="color: #333;">Dear {{customer_name}},</p>
      <p style="color: #333;">Great news! Your order <strong>#{{order_id}}</strong> has been shipped and is on its way to you.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Tracking Code:</strong> {{tracking_code}}</p>
        <p style="margin: 5px 0;"><strong>Order Total:</strong> {{total_amount}}</p>
      </div>
      <p style="color: #333;">You can track your package using the tracking code above. Delivery typically takes 2-5 business days.</p>
      <p style="color: #800020; font-weight: bold;">Thank you for shopping with Fashion Elegance!</p>
    </div>
    <div style="background: #1A1A1A; padding: 20px; text-align: center;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Fashion Elegance. All rights reserved.</p>
    </div>
  </div>',
  true
),
(
  'order_delivered',
  'Order #{{order_id}} Delivered — Enjoy Your Purchase!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    <div style="background: #800020; padding: 20px; text-align: center;">
      <h1 style="color: #D4AF37; margin: 0;">Fashion Elegance</h1>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1A1A1A;">✨ Your Order Has Been Delivered!</h2>
      <p style="color: #333;">Dear {{customer_name}},</p>
      <p style="color: #333;">Your order <strong>#{{order_id}}</strong> has been successfully delivered. We hope you love your new items!</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Order ID:</strong> {{order_id}}</p>
        <p style="margin: 5px 0;"><strong>Total:</strong> {{total_amount}}</p>
      </div>
      <p style="color: #333;">If you have any questions or need assistance, please don''t hesitate to reach out to our support team.</p>
      <p style="color: #333;">We''d love to hear your feedback! Consider leaving a review for your purchased items.</p>
      <p style="color: #800020; font-weight: bold;">Thank you for choosing Fashion Elegance!</p>
    </div>
    <div style="background: #1A1A1A; padding: 20px; text-align: center;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Fashion Elegance. All rights reserved.</p>
    </div>
  </div>',
  true
),
(
  'admin_new_order',
  '🛒 New Order Received — #{{order_id}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    <div style="background: #4A0404; padding: 20px; text-align: center;">
      <h1 style="color: #D4AF37; margin: 0;">Fashion Elegance — Admin Alert</h1>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1A1A1A;">📦 New Order Received!</h2>
      <p style="color: #333;">A new order has been placed on the store.</p>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Order ID:</strong> {{order_id}}</p>
        <p style="margin: 5px 0;"><strong>Customer:</strong> {{customer_name}}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> {{customer_email}}</p>
        <p style="margin: 5px 0;"><strong>Phone:</strong> {{customer_phone}}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> {{total_amount}}</p>
      </div>
      <p style="color: #333;">Please review and process this order in the admin dashboard.</p>
    </div>
    <div style="background: #1A1A1A; padding: 20px; text-align: center;">
      <p style="color: #999; font-size: 12px; margin: 0;">Fashion Elegance Admin System</p>
    </div>
  </div>',
  true
)
ON CONFLICT (trigger_event) 
DO UPDATE SET 
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- =============================================
-- Seed Products from Static Data
-- =============================================

INSERT INTO public.products (title, brand, category, subcategory, slug, shop_category, badge, price_cents, compare_at_price_cents, images, rating, review_count, color_options, size_options, description, specs, faq, tags, status, stock) VALUES
-- ANALOG WATCHES
('Regal Chrono — Steel & Gold', 'Rolex', 'men', 'watches', 'regal-chrono-gold', 'analog-watches', 'Deal', 14999, 17999, 
 '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"]',
 4.7, 312, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["40mm", "42mm", "44mm"]', 'A premium chronograph with a refined two-tone finish — engineered for daily wear.',
 '[{"label": "Case", "value": "Stainless steel"}, {"label": "Finish", "value": "Steel & Gold"}, {"label": "Movement", "value": "Quartz chronograph"}, {"label": "Water resistance", "value": "5 ATM"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}, {"q": "How fast is shipping?", "a": "Ships in 24h. Delivery takes 2–5 business days."}]',
 ARRAY['watch', 'luxury', 'chronograph', 'men'], 'active', 50),

('Classic Silver Dial — Minimalist', 'Tissot', 'men', 'watches', 'classic-silver-dial', 'analog-watches', NULL, 8999, 10999,
 '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.6, 189, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["38mm", "40mm"]', 'A timeless minimalist design with a clean silver dial — perfect for everyday elegance.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['watch', 'minimalist', 'men'], 'active', 75),

('Heritage Leather — Brown Strap', 'Seiko', 'men', 'watches', 'heritage-leather-brown', 'analog-watches', 'New', 11999, NULL,
 '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600"]',
 4.8, 234, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["40mm", "42mm"]', 'A heritage-inspired timepiece with premium brown leather strap — classic sophistication.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['watch', 'leather', 'heritage', 'men'], 'active', 40),

('Royal Gold — Premium Edition', 'Rolex', 'men', 'watches', 'royal-gold-premium', 'analog-watches', 'Limited', 24999, 29999,
 '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"]',
 4.9, 156, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["42mm", "44mm"]', 'A luxurious gold-finished timepiece for those who appreciate the finest craftsmanship.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['watch', 'luxury', 'gold', 'limited', 'men'], 'active', 20),

('Executive Black — Formal', 'Tissot', 'men', 'watches', 'executive-black-formal', 'analog-watches', NULL, 9499, NULL,
 '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"]',
 4.5, 203, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["38mm", "40mm", "42mm"]', 'A sophisticated black dial watch designed for the modern executive.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['watch', 'formal', 'executive', 'men'], 'active', 60),

('Vintage Rose Gold — Ladies', 'Gucci', 'women', 'watches', 'vintage-rose-gold-ladies', 'analog-watches', NULL, 13999, 16999,
 '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"]',
 4.7, 287, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["32mm", "36mm"]', 'An elegant rose gold timepiece with vintage charm — designed for the modern woman.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['watch', 'vintage', 'rose-gold', 'women'], 'active', 45),

-- SMART WATCHES
('Signature Smart Watch — Midnight', 'Casio', 'watches', 'smart', 'signature-smart-watch-midnight', 'smart-watches', NULL, 12999, 15999,
 '["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.5, 198, '[{"name": "Midnight", "swatch": "black", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Gold", "swatch": "gold", "imageIndex": 2}]',
 '["40mm", "44mm"]', 'A sleek smart watch that blends modern utility with a polished silhouette.',
 '[{"label": "Display", "value": "AMOLED"}, {"label": "Battery", "value": "Up to 48h"}, {"label": "Water resistance", "value": "5 ATM"}, {"label": "Connectivity", "value": "Bluetooth"}]',
 '[{"q": "Does it work with iPhone/Android?", "a": "Yes — pairs via Bluetooth with both."}, {"q": "Is it water resistant?", "a": "Yes — rated 5 ATM."}, {"q": "How do I charge it?", "a": "Magnetic charging cable included."}]',
 ARRAY['smartwatch', 'tech', 'fitness'], 'active', 80),

('FitPro Ultra — Sports Edition', 'Casio', 'watches', 'smart', 'fitpro-ultra-sports', 'smart-watches', 'Best Seller', 15999, 18999,
 '["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"]',
 4.7, 456, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["42mm", "46mm"]', 'Advanced fitness tracking with GPS, heart rate monitoring, and 7-day battery life.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['smartwatch', 'fitness', 'sports', 'gps'], 'active', 100),

('Elite Series — Titanium', 'Tissot', 'watches', 'smart', 'elite-series-titanium', 'smart-watches', 'Premium', 22999, NULL,
 '["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.8, 234, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["44mm", "48mm"]', 'Titanium-crafted smart watch with premium features and sapphire crystal display.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['smartwatch', 'titanium', 'premium'], 'active', 30),

('Wellness Pro — Health Monitor', 'Seiko', 'watches', 'smart', 'wellness-pro-health', 'smart-watches', NULL, 11499, NULL,
 '["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.4, 312, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["40mm", "44mm"]', 'Comprehensive health monitoring including blood oxygen, sleep tracking, and stress analysis.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['smartwatch', 'health', 'wellness'], 'active', 65),

('Active Pulse — Fitness Tracker', 'Casio', 'watches', 'smart', 'active-pulse-fitness', 'smart-watches', NULL, 7999, 9999,
 '["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"]',
 4.3, 567, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["38mm", "42mm"]', 'Affordable fitness tracker with all essential features — steps, calories, and notifications.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['fitness', 'tracker', 'budget'], 'active', 120),

-- LUXURY PERFUMES
('Eau de Luxe — 100ml', 'Gucci', 'perfumes', 'women', 'eau-de-luxe', 'luxury-perfumes', 'Top', 6999, 8499,
 '["https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.8, 641, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["50ml", "100ml"]', 'A luminous signature scent with a modern finish — balanced and long-lasting.',
 '[{"label": "Type", "value": "Eau de Parfum"}, {"label": "Profile", "value": "Floral / Gourmand"}, {"label": "Longevity", "value": "6–8 hours"}, {"label": "Occasion", "value": "Night / Events"}]',
 '[{"q": "Is this EDP or EDT?", "a": "This is Eau de Parfum for longer wear."}, {"q": "Can I gift it?", "a": "Yes — ships in gift-ready packaging."}]',
 ARRAY['perfume', 'luxury', 'women', 'floral'], 'active', 90),

('Noir Intense — Mens Cologne', 'Versace', 'perfumes', 'men', 'noir-intense-mens', 'luxury-perfumes', 'New', 8999, NULL,
 '["https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600"]',
 4.7, 423, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["50ml", "100ml", "150ml"]', 'A bold, masculine fragrance with notes of leather, amber, and dark woods.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['perfume', 'men', 'cologne', 'woody'], 'active', 70),

('Rose Eternal — Feminine', 'Gucci', 'perfumes', 'women', 'rose-eternal-feminine', 'luxury-perfumes', NULL, 7499, 8999,
 '["https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.9, 534, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["30ml", "50ml", "100ml"]', 'A romantic floral bouquet with Bulgarian rose and delicate musk undertones.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['perfume', 'women', 'rose', 'floral'], 'active', 85),

('Ocean Breeze — Unisex', 'Tissot', 'perfumes', 'unisex', 'ocean-breeze-unisex', 'luxury-perfumes', NULL, 5999, NULL,
 '["https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600"]',
 4.5, 289, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["50ml", "100ml"]', 'Fresh aquatic notes blended with citrus and sea salt — perfect for everyday wear.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['perfume', 'unisex', 'fresh', 'aquatic'], 'active', 95),

('Oud Royal — Premium', 'Versace', 'perfumes', 'men', 'oud-royal-premium', 'luxury-perfumes', 'Exclusive', 12999, 15999,
 '["https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.8, 178, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["50ml", "100ml"]', 'An opulent oud fragrance with saffron and rose — for the distinguished gentleman.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['perfume', 'men', 'oud', 'luxury'], 'active', 35),

('Velvet Nights — Seductive', 'Gucci', 'perfumes', 'women', 'velvet-nights-seductive', 'luxury-perfumes', NULL, 9499, NULL,
 '["https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600"]',
 4.6, 345, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["30ml", "75ml"]', 'A sensual evening fragrance with vanilla, amber, and exotic spices.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['perfume', 'women', 'evening', 'vanilla'], 'active', 55),

-- POCKET PERFUMES
('Pocket Perfume Atomizer — Travel', 'Versace', 'perfumes', 'travel', 'pocket-perfume-atomizer', 'pocket-perfumes', NULL, 1999, 2499,
 '["https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.4, 87, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Black", "swatch": "black", "imageIndex": 1}, {"name": "Silver", "swatch": "silver", "imageIndex": 2}]',
 '["10ml"]', 'A travel-ready atomizer designed for quick refills and effortless touch-ups.',
 '[{"label": "Capacity", "value": "10ml"}, {"label": "Use", "value": "Travel / Daily carry"}, {"label": "Material", "value": "Aluminum shell"}]',
 '[{"q": "Does it come filled?", "a": "No — ships empty for your favorite fragrance."}, {"q": "Is it TSA friendly?", "a": "Yes — 10ml is carry-on friendly."}]',
 ARRAY['travel', 'atomizer', 'pocket'], 'active', 150),

('Mini Fresh — Citrus Burst', 'Tissot', 'perfumes', 'travel', 'mini-fresh-citrus', 'pocket-perfumes', 'Popular', 2499, NULL,
 '["https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.5, 234, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["8ml", "15ml"]', 'A refreshing citrus blend perfect for on-the-go freshness throughout the day.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['travel', 'citrus', 'fresh'], 'active', 180),

('Travel Musk — Subtle', 'Gucci', 'perfumes', 'travel', 'travel-musk-subtle', 'pocket-perfumes', NULL, 2999, NULL,
 '["https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"]',
 4.3, 156, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["10ml", "20ml"]', 'A subtle musk fragrance that is perfect for quick refreshes between meetings.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['travel', 'musk', 'subtle'], 'active', 130),

('Pocket Luxe — Rose Gold', 'Versace', 'perfumes', 'travel', 'pocket-luxe-rose-gold', 'pocket-perfumes', 'New', 3499, NULL,
 '["https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.6, 98, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["12ml"]', 'A luxurious rose gold atomizer with a built-in mirror — elegance on the go.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['travel', 'rose-gold', 'luxe'], 'active', 75),

('Essential Oil Set — 3 Pack', 'Seiko', 'perfumes', 'travel', 'essential-oil-set', 'pocket-perfumes', NULL, 4999, 5999,
 '["https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"]',
 4.7, 189, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["3x10ml"]', 'Three essential oil blends in travel-size bottles — Lavender, Mint, and Citrus.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['essential-oil', 'set', 'travel'], 'active', 110),

-- STRAPS
('Leather Strap Set — Classic', 'Seiko', 'accessories', 'straps', 'leather-strap-set-classic', 'straps', NULL, 2499, 3199,
 '["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600"]',
 4.6, 154, '[{"name": "Black", "swatch": "black", "imageIndex": 0}, {"name": "Gold", "swatch": "gold", "imageIndex": 1}, {"name": "Silver", "swatch": "silver", "imageIndex": 2}]',
 '["18mm", "20mm", "22mm"]', 'A classic leather strap set with premium texture and comfortable fit.',
 '[{"label": "Material", "value": "Genuine leather"}, {"label": "Buckle", "value": "Stainless steel"}, {"label": "Includes", "value": "2 straps + tool"}]',
 '[{"q": "Will this fit my watch?", "a": "Check lug width (18/20/22mm)."}, {"q": "Does it include tools?", "a": "Yes — strap tool included."}]',
 ARRAY['strap', 'leather', 'classic'], 'active', 200),

('Metal Link Bracelet — Silver', 'Rolex', 'accessories', 'straps', 'metal-link-silver', 'straps', 'Premium', 4999, NULL,
 '["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.8, 123, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["20mm", "22mm"]', 'A premium stainless steel link bracelet with quick-release deployment clasp.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['strap', 'metal', 'premium'], 'active', 80),

('NATO Canvas — Military', 'Casio', 'accessories', 'straps', 'nato-canvas-military', 'straps', NULL, 1499, NULL,
 '["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"]',
 4.4, 289, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["18mm", "20mm", "22mm", "24mm"]', 'Durable canvas NATO strap in military green — rugged and comfortable.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['strap', 'nato', 'military'], 'active', 250),

('Silicone Sport — Waterproof', 'Casio', 'accessories', 'straps', 'silicone-sport-waterproof', 'straps', 'Best Seller', 1999, 2499,
 '["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.5, 456, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["20mm", "22mm"]', 'Soft silicone sport strap — waterproof and perfect for active lifestyles.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['strap', 'silicone', 'sport', 'waterproof'], 'active', 300),

('Crocodile Leather — Luxury', 'Gucci', 'accessories', 'straps', 'crocodile-leather-luxury', 'straps', 'Exclusive', 7999, NULL,
 '["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]',
 4.9, 67, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["18mm", "20mm"]', 'Genuine crocodile leather strap with hand-stitched edges — ultimate luxury.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['strap', 'crocodile', 'luxury'], 'active', 25),

('Mesh Milanese — Rose Gold', 'Tissot', 'accessories', 'straps', 'mesh-milanese-rose-gold', 'straps', NULL, 3499, NULL,
 '["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"]',
 4.6, 178, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["18mm", "20mm"]', 'Elegant rose gold Milanese mesh bracelet with magnetic closure.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['strap', 'milanese', 'rose-gold'], 'active', 140),

-- GIFT SETS
('Gift Box Duo — Watch + Perfume', 'Tissot', 'gifts', 'sets', 'gift-box-duo-watch-perfume', 'gift-sets', 'Limited', 18999, 21999,
 '["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"]',
 4.9, 76, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["Standard"]', 'A limited gift-ready duo combining a premium watch and signature scent.',
 '[{"label": "Bundle", "value": "Watch + Perfume"}, {"label": "Packaging", "value": "Gift-ready box"}, {"label": "Includes", "value": "Gift card"}]',
 '[{"q": "Is gift wrapping included?", "a": "Yes — gift-ready packaging included."}, {"q": "Can I return a gift set?", "a": "Yes — within 14 days if unused."}]',
 ARRAY['gift', 'set', 'watch', 'perfume'], 'active', 30),

('His and Hers — Couple Set', 'Rolex', 'gifts', 'sets', 'his-hers-couple-set', 'gift-sets', 'Popular', 29999, 35999,
 '["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"]',
 4.8, 145, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["Standard"]', 'Matching his and hers watches in a premium presentation box — perfect for anniversaries.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['gift', 'couple', 'anniversary'], 'active', 20),

('Fragrance Collection — 5 Miniatures', 'Gucci', 'gifts', 'sets', 'fragrance-collection-5', 'gift-sets', NULL, 8999, NULL,
 '["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600"]',
 4.7, 234, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["5x15ml"]', 'Discover five signature fragrances in travel-size bottles — perfect for gifting.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['gift', 'fragrance', 'collection'], 'active', 60),

('Gentlemans Essential — Complete Kit', 'Versace', 'gifts', 'sets', 'gentlemans-essential-kit', 'gift-sets', 'Best Seller', 15999, 19999,
 '["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"]',
 4.6, 312, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["Standard"]', 'Watch, cologne, and leather strap in a sophisticated gift box — everything he needs.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['gift', 'gentleman', 'complete'], 'active', 45),

('Birthday Luxe — Premium Box', 'Tissot', 'gifts', 'sets', 'birthday-luxe-premium', 'gift-sets', 'New', 12999, NULL,
 '["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"]',
 4.5, 89, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["Standard"]', 'A curated birthday gift box with watch, perfume sample, and personalized card.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['gift', 'birthday', 'premium'], 'active', 55),

('Anniversary Special — Platinum', 'Rolex', 'gifts', 'sets', 'anniversary-special-platinum', 'gift-sets', 'Exclusive', 45999, 52999,
 '["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"]',
 4.9, 45, '[{"name": "Gold", "swatch": "gold", "imageIndex": 0}, {"name": "Silver", "swatch": "silver", "imageIndex": 1}, {"name": "Black", "swatch": "black", "imageIndex": 2}]',
 '["Standard"]', 'The ultimate anniversary gift — platinum watch and exclusive perfume in a vault box.',
 '[{"label": "Material", "value": "Premium quality"}, {"label": "Warranty", "value": "1 year"}]',
 '[{"q": "Is this product authentic?", "a": "Yes. We verify authenticity before dispatch."}, {"q": "Can I return it?", "a": "Yes. Returns accepted within 14 days if unused."}]',
 ARRAY['gift', 'anniversary', 'platinum', 'exclusive'], 'active', 10)
ON CONFLICT (slug) DO NOTHING;