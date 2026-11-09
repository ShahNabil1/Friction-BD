-- Seed categories from hardcoded data in HeaderNav and FeaturedCategories

-- 1. Main Categories
INSERT INTO categories (id, name, slug, image_url, parent_id, sort_order)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Smart Watches', 'smart-watches', NULL, NULL, 1),
  ('11111111-0000-0000-0000-000000000002', 'Men''s Collection', 'mens-collection', NULL, NULL, 2),
  ('11111111-0000-0000-0000-000000000003', 'Women''s Collection', 'womens-collection', NULL, NULL, 3),
  ('11111111-0000-0000-0000-000000000004', 'Perfumes', 'perfumes', NULL, NULL, 4),
  ('11111111-0000-0000-0000-000000000005', 'Gift Sets', 'gift-sets', NULL, NULL, 5),
  ('11111111-0000-0000-0000-000000000006', 'Straps', 'straps', NULL, NULL, 6)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, sort_order = EXCLUDED.sort_order;

-- 2. Men's Collection Subcategories
INSERT INTO categories (id, name, slug, image_url, parent_id, sort_order)
VALUES
  ('22222222-0000-0000-0000-000000000001', 'Analog Watches', 'analog-watches', NULL, '11111111-0000-0000-0000-000000000002', 1),
  ('22222222-0000-0000-0000-000000000002', 'Chronograph', 'chronograph', NULL, '11111111-0000-0000-0000-000000000002', 2),
  ('22222222-0000-0000-0000-000000000003', 'Formal', 'formal', NULL, '11111111-0000-0000-0000-000000000002', 3),
  ('22222222-0000-0000-0000-000000000004', 'Sports', 'sports', NULL, '11111111-0000-0000-0000-000000000002', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order;

-- 3. Women's Collection Subcategories
INSERT INTO categories (id, name, slug, image_url, parent_id, sort_order)
VALUES
  ('33333333-0000-0000-0000-000000000001', 'Rose Gold', 'rose-gold', NULL, '11111111-0000-0000-0000-000000000003', 1),
  ('33333333-0000-0000-0000-000000000002', 'Diamond Series', 'diamond-series', NULL, '11111111-0000-0000-0000-000000000003', 2),
  ('33333333-0000-0000-0000-000000000003', 'Minimalist', 'minimalist', NULL, '11111111-0000-0000-0000-000000000003', 3),
  ('33333333-0000-0000-0000-000000000004', 'Bracelets', 'bracelets', NULL, '11111111-0000-0000-0000-000000000003', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order;

-- 4. Perfumes Subcategories
INSERT INTO categories (id, name, slug, image_url, parent_id, sort_order)
VALUES
  ('44444444-0000-0000-0000-000000000001', 'Men''s Perfumes', 'mens-perfumes', NULL, '11111111-0000-0000-0000-000000000004', 1),
  ('44444444-0000-0000-0000-000000000002', 'Women''s Perfumes', 'womens-perfumes', NULL, '11111111-0000-0000-0000-000000000004', 2),
  ('44444444-0000-0000-0000-000000000003', 'Unisex', 'unisex', NULL, '11111111-0000-0000-0000-000000000004', 3),
  ('44444444-0000-0000-0000-000000000004', 'Pocket Perfumes', 'pocket-perfumes', NULL, '11111111-0000-0000-0000-000000000004', 4),
  ('44444444-0000-0000-0000-000000000005', 'Luxury Perfumes', 'luxury-perfumes', NULL, '11111111-0000-0000-0000-000000000004', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order;