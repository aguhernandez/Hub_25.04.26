/*
  # Fix Function Search Path Mutability (v2 - correct signatures)

  ## Summary
  Sets search_path = '' on all public functions without a fixed search_path.
  This prevents search_path injection attacks by requiring fully-qualified object names.
*/

ALTER FUNCTION public.auto_calculate_measurement_stats() SET search_path = '';
ALTER FUNCTION public.calculate_bioimpedance_values() SET search_path = '';
ALTER FUNCTION public.calculate_error_pct(v1 numeric, v2 numeric, v3 numeric) SET search_path = '';
ALTER FUNCTION public.calculate_invoice_totals(invoice_uuid uuid) SET search_path = '';
ALTER FUNCTION public.calculate_load_from_1rm(p_one_rm numeric, p_percentage numeric) SET search_path = '';
ALTER FUNCTION public.calculate_macro_similarity(food1_id uuid, food2_id uuid) SET search_path = '';
ALTER FUNCTION public.calculate_median(v1 numeric, v2 numeric, v3 numeric) SET search_path = '';
ALTER FUNCTION public.calculate_menu_template_totals(template_id_param uuid) SET search_path = '';
ALTER FUNCTION public.calculate_std_dev(v1 numeric, v2 numeric, v3 numeric) SET search_path = '';
ALTER FUNCTION public.calculate_weekly_compliance(p_atp_id uuid, p_week_number integer) SET search_path = '';
ALTER FUNCTION public.create_default_notification_preferences() SET search_path = '';
ALTER FUNCTION public.deactivate_old_anamnesis() SET search_path = '';
ALTER FUNCTION public.delete_old_notification_logs() SET search_path = '';
ALTER FUNCTION public.ensure_single_active_membership() SET search_path = '';
ALTER FUNCTION public.find_equivalent_foods(target_food_id uuid, tolerance_percent numeric) SET search_path = '';
ALTER FUNCTION public.find_substitute_foods(target_calories numeric, target_protein numeric, target_carbs numeric, target_fats numeric, food_category text, filter_origin text, filter_preferences text[]) SET search_path = '';
ALTER FUNCTION public.generate_article_summary(article_content text) SET search_path = '';
ALTER FUNCTION public.generate_compliance_alerts(p_atp_id uuid, p_week_number integer) SET search_path = '';
ALTER FUNCTION public.generate_invoice_number() SET search_path = '';
ALTER FUNCTION public.generate_project_slug(project_title text, athlete_id uuid) SET search_path = '';
ALTER FUNCTION public.get_articles_with_read_status(user_profile_id uuid, filter_sport text, filter_category text, filter_published boolean) SET search_path = '';
ALTER FUNCTION public.get_athlete_sports(athlete_user_id uuid) SET search_path = '';
ALTER FUNCTION public.get_unread_articles_count(user_profile_id uuid) SET search_path = '';
ALTER FUNCTION public.get_user_active_plans(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
ALTER FUNCTION public.recalculate_invoice_totals() SET search_path = '';
ALTER FUNCTION public.set_digest_article_week_year() SET search_path = '';
ALTER FUNCTION public.set_invoice_number() SET search_path = '';
ALTER FUNCTION public.set_meal_plan_created_by() SET search_path = '';
ALTER FUNCTION public.set_video_expiration() SET search_path = '';
ALTER FUNCTION public.update_adherence_summary(athlete_id_param uuid, week_start date) SET search_path = '';
ALTER FUNCTION public.update_ai_usage_metrics_updated_at() SET search_path = '';
ALTER FUNCTION public.update_anthro_updated_at() SET search_path = '';
ALTER FUNCTION public.update_anthropometry_measurements_updated_at() SET search_path = '';
ALTER FUNCTION public.update_api_configurations_updated_at() SET search_path = '';
ALTER FUNCTION public.update_atp_updated_at() SET search_path = '';
ALTER FUNCTION public.update_conversation_last_message() SET search_path = '';
ALTER FUNCTION public.update_digest_articles_updated_at() SET search_path = '';
ALTER FUNCTION public.update_external_activities_updated_at() SET search_path = '';
ALTER FUNCTION public.update_extra_training_logs_updated_at() SET search_path = '';
ALTER FUNCTION public.update_invoices_updated_at() SET search_path = '';
ALTER FUNCTION public.update_notification_preferences_updated_at() SET search_path = '';
ALTER FUNCTION public.update_nutrition_anamnesis_updated_at() SET search_path = '';
ALTER FUNCTION public.update_nutrition_updated_at() SET search_path = '';
ALTER FUNCTION public.update_profile_details_updated_at() SET search_path = '';
ALTER FUNCTION public.update_recipe_updated_at() SET search_path = '';
ALTER FUNCTION public.update_teams_updated_at() SET search_path = '';
ALTER FUNCTION public.update_tp_connections_updated_at() SET search_path = '';
ALTER FUNCTION public.update_trainer_about_timestamp() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.update_user_subscriptions_updated_at() SET search_path = '';
