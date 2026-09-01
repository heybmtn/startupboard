-- Territories now stay 'sold' forever once first claimed. A "takeover" is
-- tracked via pending_* columns so the current owner's listing stays live
-- and unaffected until a challenger's payment is actually confirmed by the
-- Stripe webhook. price_pence becomes the "price to beat": the base
-- gradient price while available, and the last confirmed payment amount
-- once sold — the floor the next challenger's step-up price is computed
-- from.

ALTER TABLE territories ADD COLUMN pending_owner_name TEXT;
ALTER TABLE territories ADD COLUMN pending_company_name TEXT;
ALTER TABLE territories ADD COLUMN pending_owner_description TEXT;
ALTER TABLE territories ADD COLUMN pending_website_url TEXT;
ALTER TABLE territories ADD COLUMN pending_logo_url TEXT;

-- Repriced from fixed category tiers to a straight gradient: £2 at the
-- cheapest spot up to £50 for the top spot (AI), in 50p steps.
UPDATE territories SET price_pence = 200  WHERE slug = 'climate';
UPDATE territories SET price_pence = 400  WHERE slug = 'education';
UPDATE territories SET price_pence = 600  WHERE slug = 'creator';
UPDATE territories SET price_pence = 850  WHERE slug = 'robotics';
UPDATE territories SET price_pence = 1050 WHERE slug = 'marketing';
UPDATE territories SET price_pence = 1250 WHERE slug = 'productivity';
UPDATE territories SET price_pence = 1450 WHERE slug = 'travel';
UPDATE territories SET price_pence = 1650 WHERE slug = 'real-estate';
UPDATE territories SET price_pence = 1850 WHERE slug = 'careers';
UPDATE territories SET price_pence = 2100 WHERE slug = 'future-tech';
UPDATE territories SET price_pence = 2300 WHERE slug = 'startups';
UPDATE territories SET price_pence = 2500 WHERE slug = 'london';
UPDATE territories SET price_pence = 2700 WHERE slug = 'consumer';
UPDATE territories SET price_pence = 2900 WHERE slug = 'ecommerce';
UPDATE territories SET price_pence = 3100 WHERE slug = 'health';
UPDATE territories SET price_pence = 3350 WHERE slug = 'cybersecurity';
UPDATE territories SET price_pence = 3550 WHERE slug = 'gaming';
UPDATE territories SET price_pence = 3750 WHERE slug = 'media';
UPDATE territories SET price_pence = 3950 WHERE slug = 'design';
UPDATE territories SET price_pence = 4150 WHERE slug = 'investing';
UPDATE territories SET price_pence = 4350 WHERE slug = 'fintech';
UPDATE territories SET price_pence = 4600 WHERE slug = 'saas';
UPDATE territories SET price_pence = 4800 WHERE slug = 'developer-tools';
UPDATE territories SET price_pence = 5000 WHERE slug = 'ai';
