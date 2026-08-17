/*
  # Insert Predefined Habit Tags

  Inserts a fixed set of curated tags specifically for the Habits section.
  These tags are the only ones available for habit tagging — no free creation allowed.

  ## Tags inserted (with bilingual names and categories):

  ### Sleep
  - low_sleep, poor_sleep_quality, good_sleep

  ### Mental / Stress
  - high_stress, mental_fatigue, good_mental_state

  ### Energy
  - low_energy, good_energy

  ### Nutrition
  - poor_nutrition, balanced_nutrition, hydration_focus

  ### Body / Recovery
  - muscle_soreness, body_discomfort, good_recovery

  ### Habits
  - high_protein, train_habit, read_habit, meditate, stretch_habit, mobility_habit, health

  All tags are inserted with `is_habit_tag = true` flag (column added if not exists).
  Uses INSERT ... ON CONFLICT DO NOTHING to be idempotent.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'is_habit_tag'
  ) THEN
    ALTER TABLE tags ADD COLUMN is_habit_tag boolean NOT NULL DEFAULT false;
  END IF;
END $$;

INSERT INTO tags (name, name_es, slug, category, is_habit_tag)
VALUES
  ('Low Sleep',           'Poco sueño',             'low_sleep',            'recovery', true),
  ('Poor Sleep Quality',  'Mala calidad de sueño',  'poor_sleep_quality',   'recovery', true),
  ('Good Sleep',          'Buen sueño',              'good_sleep',           'recovery', true),
  ('High Stress',         'Alto estrés',             'high_stress',          'mindset',  true),
  ('Mental Fatigue',      'Fatiga mental',           'mental_fatigue',       'mindset',  true),
  ('Good Mental State',   'Buen estado mental',      'good_mental_state',    'mindset',  true),
  ('Low Energy',          'Baja energía',            'low_energy',           'mindset',  true),
  ('Good Energy',         'Buena energía',           'good_energy',          'mindset',  true),
  ('Poor Nutrition',      'Mala nutrición',          'poor_nutrition',       'nutrition',true),
  ('Balanced Nutrition',  'Nutrición equilibrada',   'balanced_nutrition',   'nutrition',true),
  ('Hydration Focus',     'Hidratación',             'hydration_focus',      'nutrition',true),
  ('Muscle Soreness',     'Dolor muscular',          'muscle_soreness',      'recovery', true),
  ('Body Discomfort',     'Malestar corporal',       'body_discomfort',      'recovery', true),
  ('Good Recovery',       'Buena recuperación',      'good_recovery',        'recovery', true),
  ('High Protein',        'Alta proteína',           'high_protein',         'nutrition',true),
  ('Train Habit',         'Hábito de entrenamiento', 'train_habit',          'training', true),
  ('Read Habit',          'Hábito de lectura',       'read_habit',           'mindset',  true),
  ('Meditate',            'Meditar',                 'meditate',             'mindset',  true),
  ('Stretch Habit',       'Hábito de estiramiento',  'stretch_habit',        'training', true),
  ('Mobility Habit',      'Hábito de movilidad',     'mobility_habit',       'training', true),
  ('Health',              'Salud',                   'health',               'other',    true)
ON CONFLICT (slug) DO UPDATE SET
  is_habit_tag = true,
  name_es = EXCLUDED.name_es;
