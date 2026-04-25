# COMPLETE BACKUP RESTORATION GUIDE

## Backup Information
- **Date:** 2026-01-15T09:03:50.039Z
- **Total Tables:** 128
- **Total Records:** 25
- **Migrations:** 231 files
- **Edge Functions:** 28 functions
- **Config Files:** 7 files

## What's Included in This Backup

### 1. Data (./data/)
- 25 records across 128 tables
- Complete JSON exports of all table data

### 2. Schema (./schema/)
- Table structures and column definitions
- Database indexes
- Database functions and stored procedures
- Triggers
- Storage bucket configurations

### 3. Migrations (./migrations/)
- 231 SQL migration files
- Complete history of database schema changes
- RLS policies, triggers, and functions

### 4. Edge Functions (./functions/)
- 28 Supabase Edge Functions
- All function code and dependencies

### 5. Configuration (./config/)
- package.json with all dependencies
- vite.config.ts
- tailwind.config.js
- Environment variable templates

## How to Restore

### Option A: Fresh Installation (Recommended)

1. **Create New Supabase Project**
   ```bash
   # Go to https://supabase.com/dashboard
   # Create new project and note your credentials
   ```

2. **Clone/Create Project Directory**
   ```bash
   mkdir my-project
   cd my-project
   ```

3. **Restore Configuration Files**
   ```bash
   cp <backup>/config/* ./
   ```

4. **Set Environment Variables**
   ```bash
   # Create .env file
   echo "VITE_SUPABASE_URL=your-project-url" > .env
   echo "VITE_SUPABASE_ANON_KEY=your-anon-key" >> .env
   ```

5. **Install Dependencies**
   ```bash
   npm install
   ```

6. **Restore Database Schema**
   ```bash
   # Copy migrations
   mkdir -p supabase/migrations
   cp <backup>/migrations/* supabase/migrations/

   # Apply migrations via Supabase dashboard
   # Or use Supabase CLI: supabase db push
   ```

7. **Restore Edge Functions**
   ```bash
   # Copy functions
   mkdir -p supabase/functions
   cp -r <backup>/functions/* supabase/functions/

   # Deploy via Supabase dashboard
   # Or use CLI to deploy each function
   ```

8. **Restore Data**
   ```bash
   # Use the restore-backup.js script
   node restore-backup.js <backup>/data
   ```

### Option B: Quick Data Restore (Existing Project)

If you just need to restore data to an existing project:

```bash
# Run the restore script
node restore-backup.js <backup>/data
```

## Important Notes

### Storage/Files
- **Not included:** Actual uploaded files (avatars, images, etc.)
- **To backup files:** Use Supabase Dashboard → Storage → Export
- **To restore files:** Manually upload to respective buckets

### Secrets & API Keys
- **Not included:** Actual API keys and secrets
- You'll need to reconfigure:
  - Stripe keys
  - Strava API credentials
  - TrainingPeaks credentials
  - OpenAI API keys
  - Any other third-party integrations

### Authentication
- User passwords are hashed and safe in the backup
- Auth settings (email templates, providers) need to be reconfigured in Supabase Dashboard

### Edge Function Secrets
- Edge function environment variables need to be set via Supabase Dashboard
- Go to Edge Functions → Your Function → Settings → Secrets

## Verification After Restore

1. **Check Tables**
   ```sql
   SELECT COUNT(*) FROM profiles;
   -- Should return 25 total across all tables
   ```

2. **Test Authentication**
   - Try logging in with existing user
   - Test signup flow

3. **Test Edge Functions**
   - Check all functions are deployed
   - Test critical endpoints

4. **Verify RLS Policies**
   - Test data access as different user roles
   - Ensure security policies are working

## Backup Details

### Successful Tables (128)
- profiles: 3 records
- exercises: 0 records
- workouts: 0 records
- workout_exercises: 0 records
- athlete_workouts: 0 records
- training_programs: 2 records
- program_weeks: 0 records
- program_days: 0 records
- training_logs: 0 records
- extra_training_logs: 0 records
- strength_estimates: 0 records
- training_templates: 0 records
- training_set_lines: 0 records
- training_comments: 0 records
- coach_technique_notes: 0 records
- annual_training_plans: 0 records
- atp_macrocycles: 0 records
- atp_events: 0 records
- atp_weekly_loads: 0 records
- atp_weekly_aggregates: 0 records
- atp_compliance_alerts: 0 records
- anthropometry_measurements: 0 records
- anthropometry_records: 0 records
- anthropometry_results: 0 records
- anthropometry_indices: 0 records
- anthropometry_kerr_results: 0 records
- anthropometry_population_data: 0 records
- bioimpedance_measurements: 0 records
- kerr_body_composition: 0 records
- measurement_history: 0 records
- foods: 17 records
- food_database: 0 records
- food_items: 0 records
- food_categories: 0 records
- food_substitutions: 0 records
- nutrition_anamnesis: 0 records
- nutrition_targets: 0 records
- meal_plans: 0 records
- meal_plan_items: 0 records
- meal_plan_meals: 0 records
- meal_templates: 0 records
- meal_template_items: 0 records
- menu_templates: 0 records
- menu_template_items: 0 records
- menu_template_meals: 0 records
- food_diary_entries: 0 records
- food_diary_sessions: 0 records
- meal_logs: 0 records
- meal_logs_v2: 0 records
- meal_adherence: 0 records
- shopping_lists: 0 records
- shopping_list_items: 0 records
- weekly_menus: 0 records
- menu_assignments: 0 records
- habits: 0 records
- habit_logs: 0 records
- habit_templates: 0 records
- user_habits: 0 records
- teams: 0 records
- team_members: 0 records
- team_digest_content: 0 records
- digest_articles: 0 records
- digest_article_reads: 0 records
- digest_article_conversions: 0 records
- admin_communications_log: 0 records
- admin_messages: 0 records
- athlete_messages: 0 records
- brand_communications: 0 records
- sponsorship_messages: 0 records
- chat_conversations: 0 records
- chat_messages: 0 records
- chat_attachments: 0 records
- contact_submissions: 0 records
- program_products: 0 records
- program_purchases: 0 records
- program_workouts: 0 records
- program_day_workouts: 0 records
- athlete_programs: 0 records
- user_programs: 0 records
- memberships: 3 records
- membership_subscriptions: 0 records
- membership_access: 0 records
- user_memberships: 0 records
- stripe_products: 0 records
- stripe_membership_mappings: 0 records
- stripe_webhook_events: 0 records
- stripe_webhook_logs: 0 records
- athlete_support_projects: 0 records
- brand_projects: 0 records
- brand_partners: 0 records
- brand_offers: 0 records
- brand_resource_offers: 0 records
- brand_project_follows: 0 records
- project_proposals: 0 records
- project_transparency_updates: 0 records
- performance_digests: 0 records
- performance_sessions: 0 records
- performance_exercise_logs: 0 records
- performance_insights: 0 records
- performance_baselines: 0 records
- weekly_performance_digests: 0 records
- adherence_summary: 0 records
- notifications: 0 records
- notification_preferences: 0 records
- notification_queue: 0 records
- notification_logs: 0 records
- one_rm_update_notifications: 0 records
- profile_update_notifications: 0 records
- api_configurations: 0 records
- ai_usage_metrics: 0 records
- invoices: 0 records
- invoice_items: 0 records
- payments: 0 records
- user_purchases: 0 records
- events: 0 records
- event_registrations: 0 records
- bookings: 0 records
- courses: 0 records
- newsletter_subscriptions: 0 records
- athlete_profile_details: 0 records
- athlete_preferences: 0 records
- trainer_about: 0 records
- professional_availability: 0 records
- tp_connections: 0 records
- zoom_meetings: 0 records
- zoom_appointments: 0 records
- training_metrics_config: 0 records
- comment_reactions: 0 records



### Edge Functions
- analyze-food-photo
- auth-signup
- auto-publish-scheduled-articles
- auto-sync-trainingpeaks
- brevo-send-email
- calculate-kerr-results
- cleanup-expired-videos
- create-admin-trainer
- delete-account
- generate-weekly-digest
- load-usda-foods
- notify-new-digest-article
- public-digest-api
- reset-admin-trainer-passwords
- reset-demo-passwords
- search-off-foods
- strava-oauth-callback
- strava-sync-activities
- strava-webhook
- stripe-create-checkout
- stripe-create-membership-checkout
- stripe-create-membership-product
- stripe-create-product
- stripe-create-program-checkout
- stripe-webhook
- sync-trainingpeaks-ics
- trainer-create-athlete
- zoom-create-meeting

## Support

If you encounter issues during restoration:
1. Check Supabase logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure migrations are applied in correct order
4. Check RLS policies are enabled and correct

---

**Backup completed:** 2026-01-15T09:03:50.039Z
**Backup location:** /tmp/cc-agent/58022607/project/complete-backups/2026-01-15_1768467804674
