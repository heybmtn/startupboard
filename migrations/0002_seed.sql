-- Seed the 24 starting territories. All begin available.
-- Pricing mix: 12 x £49, 8 x £99, 3 x £149, 1 x £249 (premium)

INSERT INTO territories (name, slug, description, price_pence, colour, position, status) VALUES
  ('AI',              'ai',               'Artificial intelligence & machine learning products.', 24900, '#f59e0b', 0,  'available'),
  ('Fintech',         'fintech',          'Banking, payments and money-moving startups.',          14900, '#10b981', 1,  'available'),
  ('SaaS',            'saas',             'Software-as-a-service and B2B platforms.',              14900, '#3b82f6', 2,  'available'),
  ('Consumer',        'consumer',         'Direct-to-consumer apps and products.',                  9900, '#ec4899', 3,  'available'),
  ('Developer Tools', 'developer-tools',  'Tools built for engineers, by engineers.',              14900, '#6366f1', 4,  'available'),
  ('E-commerce',      'ecommerce',        'Online retail, marketplaces and commerce infra.',        9900, '#f97316', 5,  'available'),
  ('Climate',         'climate',          'Climate tech and sustainability ventures.',              4900, '#22c55e', 6,  'available'),
  ('Health',          'health',           'Digital health, biotech and wellness.',                  9900, '#14b8a6', 7,  'available'),
  ('Education',       'education',        'Edtech and learning platforms.',                         4900, '#0ea5e9', 8,  'available'),
  ('Creator',         'creator',          'Tools and platforms for the creator economy.',           4900, '#a855f7', 9,  'available'),
  ('Cybersecurity',   'cybersecurity',    'Security, privacy and infrastructure protection.',       9900, '#64748b', 10, 'available'),
  ('Robotics',        'robotics',         'Robotics, hardware and automation.',                     4900, '#f43f5e', 11, 'available'),
  ('Gaming',          'gaming',           'Games, game infra and interactive entertainment.',       9900, '#8b5cf6', 12, 'available'),
  ('Marketing',       'marketing',        'Martech, growth and advertising tools.',                 4900, '#eab308', 13, 'available'),
  ('Productivity',    'productivity',     'Tools that help teams get more done.',                   4900, '#06b6d4', 14, 'available'),
  ('Media',           'media',            'Publishing, streaming and digital media.',               9900, '#d946ef', 15, 'available'),
  ('Travel',          'travel',           'Travel booking and hospitality startups.',               4900, '#84cc16', 16, 'available'),
  ('Real Estate',     'real-estate',      'Proptech and real estate marketplaces.',                 4900, '#78716c', 17, 'available'),
  ('Careers',         'careers',          'Hiring, recruiting and career platforms.',               4900, '#0891b2', 18, 'available'),
  ('Design',          'design',           'Design tools and creative software.',                    9900, '#e11d48', 19, 'available'),
  ('Investing',       'investing',        'Investment platforms and wealth tech.',                  9900, '#16a34a', 20, 'available'),
  ('Future Tech',     'future-tech',      'Frontier tech: space, quantum, and beyond.',             4900, '#4f46e5', 21, 'available'),
  ('Startups',        'startups',         'General-purpose startups of all stripes.',               4900, '#f59e0b', 22, 'available'),
  ('London',          'london',           'Startups building out of London.',                       4900, '#334155', 23, 'available');
