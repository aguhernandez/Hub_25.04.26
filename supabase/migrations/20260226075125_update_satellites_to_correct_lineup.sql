/*
  # Update Satellites to Correct Lineup

  ## Summary
  Replaces the old satellite entries with the 6 official Asciende satellites.

  ## Changes
  - Deletes old satellites (cycling, running, strength, anthropometry)
  - Upserts the 6 correct satellites with proper URLs and categories:
    1. endurance - endurance.asciende.pro (training)
    2. nutrition - nutrition.asciende.pro (nutrition)
    3. academy - academy.asciende.pro (education)
    4. lab - lab.asciende.pro (medical)
    5. biomechanic - motion.asciende.pro (analysis)
    6. performance - performance.asciende.pro (analysis)

  ## Notes
  - The token flow (get-session-token) is already working correctly
  - The satellite URL is stored both in the DB and hardcoded in the frontend
  - All satellites use the same JWT token mechanism for SSO
*/

DELETE FROM satellites WHERE name IN ('cycling', 'running', 'strength', 'anthropometry');

INSERT INTO satellites (name, display_name, description, url, category, is_active, requires_special_permission)
VALUES
  ('endurance',    'Endurance Planner',        'Training planning and analysis for endurance sports (cycling, triathlon, running, swimming)', 'https://endurance.asciende.pro', 'training',   true, false),
  ('nutrition',    'Nutrition & Race Planner',  'Nutritional planning, diet tracking and race day nutrition strategy',                         'https://nutrition.asciende.pro', 'nutrition',  true, false),
  ('academy',      'Academy',                   'Learning center for the Asciende ecosystem and performance improvement methodologies',        'https://academy.asciende.pro',   'education',  true, false),
  ('lab',          'Physiology Lab',            'Physiological testing, metabolic analysis and lab result interpretation',                      'https://lab.asciende.pro',       'medical',    true, false),
  ('biomechanic',  'Biomechanic',               'Biomechanics analysis, bike fitting, gait analysis and video movement analysis',              'https://motion.asciende.pro',    'analysis',   true, false),
  ('performance',  'Performance Vector',        'Mathematical modelling and physiological performance prediction (similar to WKO5)',            'https://performance.asciende.pro','analysis',  true, false)
ON CONFLICT (name) DO UPDATE SET
  display_name                = EXCLUDED.display_name,
  description                 = EXCLUDED.description,
  url                         = EXCLUDED.url,
  category                    = EXCLUDED.category,
  is_active                   = EXCLUDED.is_active,
  requires_special_permission = EXCLUDED.requires_special_permission;
