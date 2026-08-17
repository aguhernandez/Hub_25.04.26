/*
  # Add Missing Foreign Key Indexes for Performance Optimization

  ## Overview
  This migration adds missing indexes on foreign key columns to improve query performance.
  Each foreign key should have a corresponding index to optimize JOIN operations and lookups.

  ## Changes
  
  ### Foreign Key Indexes Added
  - anthropometry_records: measured_by, user_id
  - api_configurations: updated_by
  - athlete_workouts: trainer_id, workout_id
  - bookings: professional_id, user_id
  - brand_communications: related_project_id, responded_by
  - brand_partners: approved_by
  - brand_resource_offers: reviewed_by
  - chat_conversations: created_by, team_id
  - chat_messages: reply_to_id, sender_id
  - comment_reactions: user_id
  - event_registrations: user_id
  - events: created_by
  - exercises: created_by
  - food_items: created_by
  - habit_templates: created_by
  - habits: user_id
  - meal_logs: food_id
  - meal_plan_items: food_id
  - measurement_history: recorded_by
  - notification_logs: notification_id
  - notification_queue: user_id
  - notifications: sent_by
  - payments: user_id
  - performance_baselines: exercise_id
  - performance_digests: author_id
  - performance_exercise_logs: exercise_id
  - performance_sessions: workout_id
  - professional_availability: professional_id
  - shopping_list_items: food_id, list_id
  - strength_estimates: trainer_id
  - training_comments: author_id, exercise_id, parent_comment_id, workout_id
  - training_logs: athlete_id, athlete_workout_id, workout_exercise_id
  - training_metrics_config: trainer_id
  - training_programs: created_by
  - user_habits: assigned_by, habit_template_id, user_id
  - user_memberships: membership_id
  - user_programs: program_id, user_id
  - workout_exercises: workout_id
  - zoom_meetings: event_id, host_id

  ## Performance Impact
  These indexes will significantly improve query performance for:
  - JOIN operations
  - Foreign key constraint checks
  - Lookups by related entities
*/

-- anthropometry_records
CREATE INDEX IF NOT EXISTS idx_anthropometry_records_measured_by 
  ON anthropometry_records(measured_by);
CREATE INDEX IF NOT EXISTS idx_anthropometry_records_user_id 
  ON anthropometry_records(user_id);

-- api_configurations
CREATE INDEX IF NOT EXISTS idx_api_configurations_updated_by 
  ON api_configurations(updated_by);

-- athlete_workouts
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_trainer_id 
  ON athlete_workouts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_athlete_workouts_workout_id 
  ON athlete_workouts(workout_id);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_professional_id 
  ON bookings(professional_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id 
  ON bookings(user_id);

-- brand_communications
CREATE INDEX IF NOT EXISTS idx_brand_communications_related_project_id 
  ON brand_communications(related_project_id);
CREATE INDEX IF NOT EXISTS idx_brand_communications_responded_by 
  ON brand_communications(responded_by);

-- brand_partners
CREATE INDEX IF NOT EXISTS idx_brand_partners_approved_by 
  ON brand_partners(approved_by);

-- brand_resource_offers
CREATE INDEX IF NOT EXISTS idx_brand_resource_offers_reviewed_by 
  ON brand_resource_offers(reviewed_by);

-- chat_conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_by 
  ON chat_conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_team_id 
  ON chat_conversations(team_id);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_id 
  ON chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id 
  ON chat_messages(sender_id);

-- comment_reactions
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id 
  ON comment_reactions(user_id);

-- event_registrations
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id 
  ON event_registrations(user_id);

-- events
CREATE INDEX IF NOT EXISTS idx_events_created_by 
  ON events(created_by);

-- exercises
CREATE INDEX IF NOT EXISTS idx_exercises_created_by 
  ON exercises(created_by);

-- food_items
CREATE INDEX IF NOT EXISTS idx_food_items_created_by 
  ON food_items(created_by);

-- habit_templates
CREATE INDEX IF NOT EXISTS idx_habit_templates_created_by 
  ON habit_templates(created_by);

-- habits
CREATE INDEX IF NOT EXISTS idx_habits_user_id 
  ON habits(user_id);

-- meal_logs
CREATE INDEX IF NOT EXISTS idx_meal_logs_food_id 
  ON meal_logs(food_id);

-- meal_plan_items
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_food_id 
  ON meal_plan_items(food_id);

-- measurement_history
CREATE INDEX IF NOT EXISTS idx_measurement_history_recorded_by 
  ON measurement_history(recorded_by);

-- notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_id 
  ON notification_logs(notification_id);

-- notification_queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id 
  ON notification_queue(user_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_sent_by 
  ON notifications(sent_by);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id 
  ON payments(user_id);

-- performance_baselines
CREATE INDEX IF NOT EXISTS idx_performance_baselines_exercise_id 
  ON performance_baselines(exercise_id);

-- performance_digests
CREATE INDEX IF NOT EXISTS idx_performance_digests_author_id 
  ON performance_digests(author_id);

-- performance_exercise_logs
CREATE INDEX IF NOT EXISTS idx_performance_exercise_logs_exercise_id 
  ON performance_exercise_logs(exercise_id);

-- performance_sessions
CREATE INDEX IF NOT EXISTS idx_performance_sessions_workout_id 
  ON performance_sessions(workout_id);

-- professional_availability
CREATE INDEX IF NOT EXISTS idx_professional_availability_professional_id 
  ON professional_availability(professional_id);

-- shopping_list_items
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_food_id 
  ON shopping_list_items(food_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id 
  ON shopping_list_items(list_id);

-- strength_estimates
CREATE INDEX IF NOT EXISTS idx_strength_estimates_trainer_id 
  ON strength_estimates(trainer_id);

-- training_comments
CREATE INDEX IF NOT EXISTS idx_training_comments_author_id 
  ON training_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_training_comments_exercise_id 
  ON training_comments(exercise_id);
CREATE INDEX IF NOT EXISTS idx_training_comments_parent_comment_id 
  ON training_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_training_comments_workout_id 
  ON training_comments(workout_id);

-- training_logs
CREATE INDEX IF NOT EXISTS idx_training_logs_athlete_id 
  ON training_logs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_training_logs_athlete_workout_id 
  ON training_logs(athlete_workout_id);
CREATE INDEX IF NOT EXISTS idx_training_logs_workout_exercise_id 
  ON training_logs(workout_exercise_id);

-- training_metrics_config
CREATE INDEX IF NOT EXISTS idx_training_metrics_config_trainer_id 
  ON training_metrics_config(trainer_id);

-- training_programs
CREATE INDEX IF NOT EXISTS idx_training_programs_created_by 
  ON training_programs(created_by);

-- user_habits
CREATE INDEX IF NOT EXISTS idx_user_habits_assigned_by 
  ON user_habits(assigned_by);
CREATE INDEX IF NOT EXISTS idx_user_habits_habit_template_id 
  ON user_habits(habit_template_id);
CREATE INDEX IF NOT EXISTS idx_user_habits_user_id 
  ON user_habits(user_id);

-- user_memberships
CREATE INDEX IF NOT EXISTS idx_user_memberships_membership_id 
  ON user_memberships(membership_id);

-- user_programs
CREATE INDEX IF NOT EXISTS idx_user_programs_program_id 
  ON user_programs(program_id);
CREATE INDEX IF NOT EXISTS idx_user_programs_user_id 
  ON user_programs(user_id);

-- workout_exercises
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id 
  ON workout_exercises(workout_id);

-- zoom_meetings
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_event_id 
  ON zoom_meetings(event_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_host_id 
  ON zoom_meetings(host_id);
