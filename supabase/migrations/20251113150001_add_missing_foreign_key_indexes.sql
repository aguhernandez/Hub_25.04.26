/*
  # Add Missing Foreign Key Indexes for Performance

  1. Purpose
    - Add indexes to all foreign key columns that don't have covering indexes
    - Improves query performance and prevents table scans on JOIN operations

  2. Changes
    - Creates indexes on foreign key columns in 12 tables
    - All indexes use standard naming: idx_tablename_columnname

  3. Security
    - No RLS changes
    - Performance optimization only
*/

-- adherence_summary
CREATE INDEX IF NOT EXISTS idx_adherence_summary_assignment_id
  ON adherence_summary(assignment_id);

-- anthropometry_population_data
CREATE INDEX IF NOT EXISTS idx_anthropometry_population_data_created_by
  ON anthropometry_population_data(created_by);

-- meal_adherence
CREATE INDEX IF NOT EXISTS idx_meal_adherence_meal_id
  ON meal_adherence(meal_id);

-- meal_logs_v2
CREATE INDEX IF NOT EXISTS idx_meal_logs_v2_assignment_id
  ON meal_logs_v2(assignment_id);

CREATE INDEX IF NOT EXISTS idx_meal_logs_v2_template_meal_id
  ON meal_logs_v2(template_meal_id);

-- meal_plans
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_by
  ON meal_plans(created_by);

-- membership_subscriptions
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_program_product_id
  ON membership_subscriptions(program_product_id);

-- menu_assignments
CREATE INDEX IF NOT EXISTS idx_menu_assignments_template_id
  ON menu_assignments(template_id);

-- menu_template_items
CREATE INDEX IF NOT EXISTS idx_menu_template_items_food_id
  ON menu_template_items(food_id);

-- program_workouts
CREATE INDEX IF NOT EXISTS idx_program_workouts_workout_template_id
  ON program_workouts(workout_template_id);

-- zoom_appointments
CREATE INDEX IF NOT EXISTS idx_zoom_appointments_purchase_id
  ON zoom_appointments(purchase_id);

CREATE INDEX IF NOT EXISTS idx_zoom_appointments_subscription_id
  ON zoom_appointments(subscription_id);
