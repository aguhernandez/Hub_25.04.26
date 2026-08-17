/*
  # Nutrition Planning System - Step 2: RLS Policies
  
  Adds Row Level Security policies for all nutrition tables.
*/

-- RLS for food_items
CREATE POLICY "food_items_select" ON food_items FOR SELECT TO authenticated USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "food_items_insert" ON food_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "food_items_update" ON food_items FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "food_items_delete" ON food_items FOR DELETE TO authenticated USING (created_by = auth.uid());

-- RLS for meal_plans
CREATE POLICY "meal_plans_select" ON meal_plans FOR SELECT TO authenticated USING (athlete_id = auth.uid() OR coach_id = auth.uid());
CREATE POLICY "meal_plans_insert" ON meal_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "meal_plans_update" ON meal_plans FOR UPDATE TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "meal_plans_delete" ON meal_plans FOR DELETE TO authenticated USING (coach_id = auth.uid());

-- RLS for meal_plan_meals
CREATE POLICY "meal_plan_meals_select" ON meal_plan_meals FOR SELECT TO authenticated USING (true);
CREATE POLICY "meal_plan_meals_insert" ON meal_plan_meals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "meal_plan_meals_update" ON meal_plan_meals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "meal_plan_meals_delete" ON meal_plan_meals FOR DELETE TO authenticated USING (true);

-- RLS for meal_plan_items
CREATE POLICY "meal_plan_items_select" ON meal_plan_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "meal_plan_items_insert" ON meal_plan_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "meal_plan_items_update" ON meal_plan_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "meal_plan_items_delete" ON meal_plan_items FOR DELETE TO authenticated USING (true);

-- RLS for shopping_lists
CREATE POLICY "shopping_lists_select" ON shopping_lists FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "shopping_lists_insert" ON shopping_lists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "shopping_lists_update" ON shopping_lists FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "shopping_lists_delete" ON shopping_lists FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS for shopping_list_items
CREATE POLICY "shopping_list_items_select" ON shopping_list_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "shopping_list_items_insert" ON shopping_list_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shopping_list_items_update" ON shopping_list_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shopping_list_items_delete" ON shopping_list_items FOR DELETE TO authenticated USING (true);

-- RLS for athlete_preferences
CREATE POLICY "athlete_preferences_select" ON athlete_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "athlete_preferences_insert" ON athlete_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "athlete_preferences_update" ON athlete_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "athlete_preferences_delete" ON athlete_preferences FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_nutrition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON food_items FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();
CREATE TRIGGER update_meal_plan_meals_updated_at BEFORE UPDATE ON meal_plan_meals FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();
CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();
CREATE TRIGGER update_athlete_preferences_updated_at BEFORE UPDATE ON athlete_preferences FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();
