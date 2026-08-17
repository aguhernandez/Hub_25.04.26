/*
  # Seed Initial Culture Food Packs

  This migration seeds the culture_food_packs table with initial regional food cultures.
  These packs help athletes choose foods based on their cultural preferences.
*/

-- Insert default culture packs
INSERT INTO culture_food_packs (pack_name, region, description, emoji_flag, is_default)
VALUES
  ('International', 'Global', 'Common foods available worldwide', '🌍', true),
  ('Latin America', 'Americas', 'Traditional Latin American foods', '🌎', true),
  ('Mediterranean', 'Europe', 'Mediterranean diet staples', '🇬🇷', true),
  ('Asian', 'Asia', 'Asian cuisine basics', '🍜', true),
  ('North American', 'North America', 'North American staples', '🇺🇸', true),
  ('Middle Eastern', 'Middle East', 'Middle Eastern traditional foods', '🧆', true)
ON CONFLICT (pack_name) DO NOTHING;
