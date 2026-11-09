-- Update product images with high-quality Unsplash images (optimized URLs)
UPDATE products SET images = '["https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80", "https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=800&q=80"]'::jsonb
WHERE id = '86aa1603-7050-43f2-9cc4-adc6ec8b17a8';

UPDATE products SET images = '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80", "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80"]'::jsonb
WHERE id = '480e4baa-d7ad-4e68-870d-87872d140b01';

UPDATE products SET images = '["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80", "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80", "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80"]'::jsonb
WHERE id = 'e3b33459-fd72-40c8-bf67-e68a62ff3bb4';

UPDATE products SET images = '["https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&q=80", "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&q=80"]'::jsonb
WHERE id = 'dee0f569-509c-47d5-9008-37a6f66acc97';

UPDATE products SET images = '["https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80", "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800&q=80", "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&q=80"]'::jsonb
WHERE id = 'f493e93b-4bc6-4f90-8816-6b3089d3e3b2';

UPDATE products SET images = '["https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=800&q=80", "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80"]'::jsonb
WHERE id = 'bc835aa5-9b2f-43de-8036-bfc249ac9e70';

UPDATE products SET images = '["https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80", "https://images.unsplash.com/photo-1605733513597-a8f8341084e6?w=800&q=80", "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=800&q=80"]'::jsonb
WHERE id = '3077ec0f-ae27-4119-99d2-1cc6ce3fb9a2';

UPDATE products SET images = '["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80", "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80", "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80"]'::jsonb
WHERE id = 'a5f31a45-6c1f-433b-bd22-f08b83d4cf8f';

UPDATE products SET images = '["https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80", "https://images.unsplash.com/photo-1465877783223-4eba513e27c6?w=800&q=80"]'::jsonb
WHERE id = '3554d6b3-f647-4e41-b1fa-917b135052b8';

UPDATE products SET images = '["https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80", "https://images.unsplash.com/photo-1562183241-b937e95585b6?w=800&q=80"]'::jsonb
WHERE id = '21fe61f8-f802-407b-8f9a-ed9bbf8d33ea';

-- Update category images with high-quality images
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&q=80' WHERE slug = 'mens';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80' WHERE slug = 'womens';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&q=80' WHERE slug = 'sneakers';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80' WHERE slug = 'sports';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=600&q=80' WHERE slug = 'formal';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=600&q=80' WHERE slug = 'boots';