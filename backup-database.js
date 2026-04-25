import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'profiles', 'training_logs', 'workouts', 'workout_exercises',
  'exercises', 'training_programs', 'athlete_workouts', 'user_memberships',
  'memberships', 'anthropometry_records', 'anthropometry_measurements',
  'anthropometry_results', 'anthropometry_kerr_results', 'meals', 'meal_plans',
  'meal_plan_items', 'food_diary_entries', 'habits', 'habit_logs',
  'notifications', 'invoices', 'invoice_items', 'stripe_products',
  'payments', 'events', 'event_registrations', 'teams', 'team_members',
  'chat_conversations', 'chat_messages', 'performance_digests',
  'digest_articles', 'annual_training_plans', 'atp_macrocycles',
  'atp_events', 'courses', 'nutrition_anamnesis', 'nutrition_targets',
  'api_configurations', 'athlete_support_projects', 'brand_partners',
  'brand_projects', 'bookings', 'zooom_appointments', 'training_templates',
  'extra_training_logs', 'bioimpedance_measurements', 'athlete_preferences',
  'athlete_messages', 'admin_messages', 'admin_communications_log',
  'ai_usage_metrics', 'performance_exercise_logs', 'performance_sessions',
  'performance_insights', 'performance_baselines', 'strength_estimates',
  'post_training_feedback', 'food_substitutions', 'foods',
  'food_database', 'shopping_lists', 'shopping_list_items',
  'meal_templates', 'meal_template_items', 'menu_templates',
  'menu_template_meals', 'menu_template_items', 'menu_assignments',
  'weekly_menus', 'meal_adherence', 'meal_logs', 'meal_logs_v2',
  'program_products', 'program_purchases', 'program_weeks',
  'program_days', 'program_day_workouts', 'training_metrics_config',
  'training_set_lines', 'trainer_about', 'professional_availability',
  'contact_submissions', 'newsletter_subscriptions', 'brand_communications',
  'brand_offers', 'brand_resource_offers', 'brand_project_follows',
  'sponsorship_messages', 'chat_attachments', 'coach_technique_notes',
  'training_comments', 'comment_reactions', 'project_proposals',
  'project_transparency_updates', 'athelete_profile_details',
  'notification_preferences', 'notification_queue', 'notification_logs',
  'one_rm_update_notifications', 'profile_update_notifications',
  'stripe_membership_mappings', 'stripe_webhook_events',
  'stripe_webhook_logs', 'measurement_history', 'membership_subscriptions',
  'membership_access', 'user_programs', 'athlete_programs',
  'team_digest_content', 'weekly_performance_digests', 'digest_article_reads',
  'digest_article_conversions', 'tp_connections', 'atp_weekly_loads',
  'atp_weekly_aggregates', 'atp_compliance_alerts', 'adherence_summary',
  'athlete_goals', 'anthropometry_population_data', 'anthropometry_indices',
  'kerr_body_composition', 'food_categories', 'habit_templates',
  'user_habits', 'habit_skills', 'strava_connections',
  'strava_webhook_logs', 'athlete_free_mode', 'foods_metadata',
  'user_subscriptions', 'satellite_integrations', 'external_app_access'
];

async function backupDatabase() {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, 'backups', timestamp);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Starting backup for ${timestamp}...`);
  const backupSummary = {
    timestamp: new Date().toISOString(),
    tables: {},
    totalRecords: 0,
    status: 'pending'
  };

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(100000);

      if (error && error.code !== 'PGRST116') {
        console.log(`⚠️  Skipping ${table}: ${error.message}`);
        continue;
      }

      const records = data || [];
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2));

      backupSummary.tables[table] = {
        records: records.length,
        file: `${table}.json`
      };
      backupSummary.totalRecords += records.length;

      console.log(`✅ ${table}: ${records.length} records`);
    } catch (error) {
      console.log(`❌ Error backing up ${table}: ${error.message}`);
    }
  }

  backupSummary.status = 'completed';
  const summaryPath = path.join(backupDir, '_backup_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(backupSummary, null, 2));

  console.log(`\n✅ Backup completed: ${backupDir}`);
  console.log(`Total records backed up: ${backupSummary.totalRecords}`);
}

backupDatabase().catch(error => {
  console.error('Backup failed:', error);
  process.exit(1);
});
