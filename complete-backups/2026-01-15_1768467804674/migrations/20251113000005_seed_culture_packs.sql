/*
  # Seed Initial Culture Food Packs

  Creates default regional food packs for:
  - International (USDA baseline)
  - Latin America
  - Mediterranean
  - North America
  - Asia Pacific
  - Middle East
  - Nordic Countries

  Note: This creates the packs but doesn't populate foods yet.
  Foods will be added via the app interface or future migrations.
*/

-- Insert default culture packs
INSERT INTO culture_food_packs (pack_name, region, description, emoji_flag, is_default) VALUES
  ('International', 'Global', 'Universal foods found worldwide (USDA database)', '🌍', true),
  ('Latin America', 'Americas', 'Traditional foods from Mexico, Central and South America - rice, beans, corn, plantain, tropical fruits', '🌎', false),
  ('Mediterranean', 'Europe', 'Greek, Italian, Spanish cuisine - olive oil, fish, whole grains, vegetables, legumes', '🇬🇷', false),
  ('North America', 'Americas', 'USA and Canada staples - chicken, beef, potatoes, dairy, bread', '🇺🇸', false),
  ('Asia Pacific', 'Asia', 'East and Southeast Asian foods - rice, noodles, soy products, fish, vegetables', '🌏', false),
  ('Middle East', 'Middle East', 'Arab and Persian cuisine - hummus, falafel, rice, lamb, dates, nuts', '🇸🇦', false),
  ('Nordic Countries', 'Europe', 'Scandinavian diet - fish, rye bread, dairy, root vegetables, berries', '🇸🇪', false),
  ('Indian Subcontinent', 'Asia', 'South Asian cuisine - lentils, rice, chapati, curry, yogurt, spices', '🇮🇳', false),
  ('African', 'Africa', 'Pan-African staples - millet, cassava, yams, plantain, groundnuts', '🌍', false),
  ('Plant-Based', 'Global', 'Vegan and vegetarian friendly foods from all regions', '🌱', false)
ON CONFLICT (pack_name) DO NOTHING;
