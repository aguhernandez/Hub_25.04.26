/*
  # Nutrition Recipes System

  ## Summary
  Implements an official recipe library for the nutrition module, following the same
  architecture as the official exercise library.

  ## New Tables

  ### nutrition_recipes
  - Stores both official (admin-created) and athlete-cloned recipes
  - `is_official = true` means admin-created, visible to all
  - `is_official = false` means athlete's personal clone (athlete_id required)
  - `parent_recipe_id` links a clone back to the original official recipe

  ### nutrition_recipe_ingredients
  - Each ingredient links to the `foods` table for nutritional data
  - Tracks quantity, unit, and display order

  ### nutrition_recipe_nutrition_snapshot
  - Precalculated macro/micro totals per recipe
  - Recalculated on ingredient mutations (insert/update/delete)
  - Per-serving values based on `servings` in the recipe

  ## Security
  - RLS enabled on all tables
  - Admins: full CRUD on official recipes
  - Athletes: read official recipes, full CRUD on own clones only
*/

-- ─── nutrition_recipes ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nutrition_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  instructions text,
  cooking_method text,
  prep_time_minutes integer DEFAULT 0,
  cook_time_minutes integer DEFAULT 0,
  servings integer NOT NULL DEFAULT 1,
  difficulty text NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  image_url text,
  tags text[] DEFAULT '{}',
  cuisine text,

  is_official boolean NOT NULL DEFAULT true,

  -- Admin who created official recipe (null for clones)
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Athlete clone fields
  athlete_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_recipe_id uuid REFERENCES nutrition_recipes(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT official_no_athlete CHECK (
    (is_official = true AND athlete_id IS NULL) OR
    (is_official = false AND athlete_id IS NOT NULL)
  )
);

ALTER TABLE nutrition_recipes ENABLE ROW LEVEL SECURITY;

-- Admin can do everything on official recipes
CREATE POLICY "Admin can select all recipes"
  ON nutrition_recipes FOR SELECT
  TO authenticated
  USING (
    is_official = true OR
    athlete_id = auth.uid() OR
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'trainer')
  );

CREATE POLICY "Admin can insert official recipes"
  ON nutrition_recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
    (is_official = false AND athlete_id = auth.uid())
  );

CREATE POLICY "Admin can update official recipes"
  ON nutrition_recipes FOR UPDATE
  TO authenticated
  USING (
    (is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
    (is_official = false AND athlete_id = auth.uid())
  )
  WITH CHECK (
    (is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
    (is_official = false AND athlete_id = auth.uid())
  );

CREATE POLICY "Admin can delete official recipes"
  ON nutrition_recipes FOR DELETE
  TO authenticated
  USING (
    (is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
    (is_official = false AND athlete_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_recipes_official ON nutrition_recipes(is_official);
CREATE INDEX IF NOT EXISTS idx_nutrition_recipes_athlete_id ON nutrition_recipes(athlete_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_recipes_parent ON nutrition_recipes(parent_recipe_id);

-- ─── nutrition_recipe_ingredients ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nutrition_recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES nutrition_recipes(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  quantity numeric(10, 2) NOT NULL DEFAULT 100,
  unit text NOT NULL DEFAULT 'g',
  order_index integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nutrition_recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select ingredients for accessible recipes"
  ON nutrition_recipe_ingredients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_recipes r
      WHERE r.id = recipe_id
        AND (
          r.is_official = true OR
          r.athlete_id = auth.uid() OR
          (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'trainer')
        )
    )
  );

CREATE POLICY "Users can insert ingredients for own recipes"
  ON nutrition_recipe_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutrition_recipes r
      WHERE r.id = recipe_id
        AND (
          (r.is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
          (r.is_official = false AND r.athlete_id = auth.uid())
        )
    )
  );

CREATE POLICY "Users can update ingredients for own recipes"
  ON nutrition_recipe_ingredients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_recipes r
      WHERE r.id = recipe_id
        AND (
          (r.is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
          (r.is_official = false AND r.athlete_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutrition_recipes r
      WHERE r.id = recipe_id
        AND (
          (r.is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
          (r.is_official = false AND r.athlete_id = auth.uid())
        )
    )
  );

CREATE POLICY "Users can delete ingredients for own recipes"
  ON nutrition_recipe_ingredients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_recipes r
      WHERE r.id = recipe_id
        AND (
          (r.is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
          (r.is_official = false AND r.athlete_id = auth.uid())
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON nutrition_recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_food_id ON nutrition_recipe_ingredients(food_id);

-- ─── nutrition_recipe_nutrition_snapshot ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS nutrition_recipe_nutrition_snapshot (
  recipe_id uuid PRIMARY KEY REFERENCES nutrition_recipes(id) ON DELETE CASCADE,

  -- Per serving
  calories_per_serving numeric(10, 2) DEFAULT 0,
  protein_per_serving numeric(10, 2) DEFAULT 0,
  carbs_per_serving numeric(10, 2) DEFAULT 0,
  fat_per_serving numeric(10, 2) DEFAULT 0,
  fiber_per_serving numeric(10, 2) DEFAULT 0,

  -- Total recipe (all servings)
  calories_total numeric(10, 2) DEFAULT 0,
  protein_total numeric(10, 2) DEFAULT 0,
  carbs_total numeric(10, 2) DEFAULT 0,
  fat_total numeric(10, 2) DEFAULT 0,
  fiber_total numeric(10, 2) DEFAULT 0,

  -- Micros per serving
  calcium_mg numeric(10, 2) DEFAULT 0,
  iron_mg numeric(10, 2) DEFAULT 0,
  magnesium_mg numeric(10, 2) DEFAULT 0,
  potassium_mg numeric(10, 2) DEFAULT 0,
  sodium_mg numeric(10, 2) DEFAULT 0,
  zinc_mg numeric(10, 2) DEFAULT 0,
  vitamin_a_mcg numeric(10, 2) DEFAULT 0,
  vitamin_c_mg numeric(10, 2) DEFAULT 0,
  vitamin_d_mcg numeric(10, 2) DEFAULT 0,
  vitamin_b12_mcg numeric(10, 2) DEFAULT 0,
  vitamin_e_mg numeric(10, 2) DEFAULT 0,
  vitamin_k_mcg numeric(10, 2) DEFAULT 0,
  folate_mcg numeric(10, 2) DEFAULT 0,
  phosphorus_mg numeric(10, 2) DEFAULT 0,

  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nutrition_recipe_nutrition_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select snapshot for accessible recipes"
  ON nutrition_recipe_nutrition_snapshot FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_recipes r
      WHERE r.id = recipe_id
        AND (
          r.is_official = true OR
          r.athlete_id = auth.uid() OR
          (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'trainer')
        )
    )
  );

CREATE POLICY "System can upsert snapshot"
  ON nutrition_recipe_nutrition_snapshot FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutrition_recipes r
      WHERE r.id = recipe_id
        AND (
          (r.is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
          (r.is_official = false AND r.athlete_id = auth.uid())
        )
    )
  );

CREATE POLICY "System can update snapshot"
  ON nutrition_recipe_nutrition_snapshot FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_recipes r
      WHERE r.id = recipe_id
        AND (
          (r.is_official = true AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR
          (r.is_official = false AND r.athlete_id = auth.uid())
        )
    )
  )
  WITH CHECK (true);

-- ─── Trigger: auto-update recipe updated_at ───────────────────────────────────

CREATE OR REPLACE FUNCTION update_recipe_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recipe_updated_at'
  ) THEN
    CREATE TRIGGER trg_recipe_updated_at
      BEFORE UPDATE ON nutrition_recipes
      FOR EACH ROW EXECUTE FUNCTION update_recipe_updated_at();
  END IF;
END $$;

-- ─── Seed a few official sample recipes ───────────────────────────────────────

INSERT INTO nutrition_recipes (name, description, instructions, cooking_method, prep_time_minutes, cook_time_minutes, servings, difficulty, tags, cuisine, is_official)
VALUES
  (
    'Avena con Frutas y Frutos Secos',
    'Desayuno completo de avena cocida con plátano, manzana y un mix de frutos secos. Rico en carbohidratos de liberación lenta, fibra y grasas saludables.',
    E'1. Hervir 250ml de agua o leche.\n2. Agregar 80g de avena y cocinar a fuego medio por 5 minutos revolviendo constantemente.\n3. Retirar del fuego y agregar el plátano en rodajas.\n4. Servir en un bowl y decorar con la manzana cortada en cubos y los frutos secos.\n5. Opcional: agregar una cucharadita de miel.',
    'Stovetop',
    5, 7, 1, 'easy',
    ARRAY['desayuno', 'breakfast', 'carbohidratos', 'pre-entreno'],
    'Internacional',
    true
  ),
  (
    'Pollo a la Plancha con Vegetales',
    'Pechuga de pollo a la plancha acompañada de brócoli al vapor y batata asada. Comida de alto rendimiento deportivo, baja en grasa y alta en proteína.',
    E'1. Sazonar la pechuga de pollo con sal, pimienta, ajo en polvo y páprika.\n2. Calentar una sartén con aceite de oliva a fuego alto.\n3. Cocinar el pollo 6-7 minutos por cada lado hasta dorar.\n4. Paralelamente, cortar el brócoli en floretes y cocer al vapor 8 minutos.\n5. Asar la batata cortada en cubos en horno a 200°C por 25 minutos con aceite de oliva.\n6. Servir todo junto.',
    'Grill + Oven',
    10, 30, 1, 'medium',
    ARRAY['almuerzo', 'lunch', 'proteína', 'post-entreno', 'carbohidratos'],
    'Internacional',
    true
  ),
  (
    'Batido de Recuperación',
    'Batido post-entrenamiento con proteína de suero, plátano, espinaca y mantequilla de maní. Ideal para recuperación muscular y reposición glucogénica.',
    E'1. Colocar todos los ingredientes en la licuadora.\n2. Agregar 200ml de leche o bebida vegetal.\n3. Licuar a alta velocidad por 60 segundos hasta obtener una mezcla homogénea.\n4. Servir inmediatamente.',
    'No-cook',
    5, 0, 1, 'easy',
    ARRAY['batido', 'smoothie', 'post-entreno', 'recuperación', 'proteína'],
    'Internacional',
    true
  ),
  (
    'Ensalada Mediterránea de Atún',
    'Ensalada fresca con atún, garbanzos, tomate cherry, pepino y aceite de oliva. Ideal como almuerzo ligero de alto aporte proteico y antiinflamatorio.',
    E'1. Escurrir bien el atún y reservar.\n2. En un bowl grande mezclar los garbanzos cocidos, el tomate cherry cortado a la mitad y el pepino en rodajas.\n3. Agregar el atún y la rúcula.\n4. Aliñar con aceite de oliva, limón exprimido, sal y orégano.\n5. Mezclar suavemente y servir frío.',
    'No-cook',
    10, 0, 1, 'easy',
    ARRAY['almuerzo', 'lunch', 'proteína', 'ensalada', 'mediterráneo'],
    'Mediterránea',
    true
  ),
  (
    'Tortilla de Claras con Espinaca',
    'Tortilla ligera de claras de huevo con espinaca fresca, queso cottage y tomate. Baja en calorías, alta en proteína. Perfecta para fase de definición.',
    E'1. Batir 6 claras de huevo con sal y pimienta.\n2. Calentar una sartén antiadherente con unas gotas de aceite de oliva.\n3. Agregar la espinaca fresca y saltear 1 minuto hasta marchitar.\n4. Verter las claras sobre la espinaca.\n5. Cocinar a fuego medio-bajo hasta que los bordes estén firmes.\n6. Doblar la tortilla y servir con queso cottage y tomate fresco.',
    'Stovetop',
    5, 8, 1, 'easy',
    ARRAY['desayuno', 'breakfast', 'proteína', 'definición', 'bajo en calorías'],
    'Internacional',
    true
  )
ON CONFLICT DO NOTHING;
