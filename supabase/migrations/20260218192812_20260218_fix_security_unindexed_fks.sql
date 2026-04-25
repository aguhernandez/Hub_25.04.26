/*
  # Fix Security Issues - Part 1: Unindexed Foreign Keys

  Adds covering indexes for all unindexed foreign key columns to improve
  query performance and satisfy database advisor recommendations.

  ## Indexes Added
  1. athlete_support_projects.verified_by
  2. culture_food_packs.created_by
  3. declared_supports.approved_by
  4. food_diary_sessions.reviewed_by
  5. meal_plans.validated_by_user_id
  6. nutrition_daily_plans.based_on_template_id
  7. nutrition_feedback.meal_id
  8. nutrition_menu_templates.created_by
  9. nutrition_recipes.created_by
  10. user_satellite_permissions.disabled_by
  11. user_satellite_permissions.granted_by
*/

CREATE INDEX IF NOT EXISTS idx_athlete_support_projects_verified_by
  ON public.athlete_support_projects (verified_by);

CREATE INDEX IF NOT EXISTS idx_culture_food_packs_created_by
  ON public.culture_food_packs (created_by);

CREATE INDEX IF NOT EXISTS idx_declared_supports_approved_by
  ON public.declared_supports (approved_by);

CREATE INDEX IF NOT EXISTS idx_food_diary_sessions_reviewed_by
  ON public.food_diary_sessions (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_meal_plans_validated_by_user_id
  ON public.meal_plans (validated_by_user_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_daily_plans_based_on_template_id
  ON public.nutrition_daily_plans (based_on_template_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_feedback_meal_id
  ON public.nutrition_feedback (meal_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_menu_templates_created_by
  ON public.nutrition_menu_templates (created_by);

CREATE INDEX IF NOT EXISTS idx_nutrition_recipes_created_by
  ON public.nutrition_recipes (created_by);

CREATE INDEX IF NOT EXISTS idx_user_satellite_permissions_disabled_by
  ON public.user_satellite_permissions (disabled_by);

CREATE INDEX IF NOT EXISTS idx_user_satellite_permissions_granted_by
  ON public.user_satellite_permissions (granted_by);
