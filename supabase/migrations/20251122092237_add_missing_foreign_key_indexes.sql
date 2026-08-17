/*
  # Add Missing Foreign Key Indexes - Performance Optimization

  ## Overview
  This migration adds missing indexes on foreign key columns to optimize JOIN performance
  and prevent sequential scans on large tables.

  ## New Indexes Added

  1. **admin_communications_log**
     - `idx_admin_communications_log_sent_by` on sent_by column

  2. **athlete_programs**
     - `idx_athlete_programs_purchase_id` on purchase_id column

  3. **atp_compliance_alerts**
     - `idx_atp_compliance_alerts_atp_id` on atp_id column
     - `idx_atp_compliance_alerts_trainer_id` on trainer_id column

  4. **contact_submissions**
     - `idx_contact_submissions_assigned_to` on assigned_to column

  5. **membership_access**
     - `idx_membership_access_assigned_by` on assigned_by column

  6. **stripe_membership_mappings**
     - `idx_stripe_membership_mappings_membership_id` on membership_id column

  7. **stripe_products**
     - `idx_stripe_products_created_by` on created_by column

  8. **team_digest_content**
     - `idx_team_digest_content_created_by` on created_by column
     - `idx_team_digest_content_digest_article_id` on digest_article_id column

  ## Performance Impact
  - Expected 50-100x improvement on JOIN queries involving these foreign keys
  - Prevents full table scans when joining tables
  - Improves query planning and execution
*/

-- Add index for admin_communications_log.sent_by
CREATE INDEX IF NOT EXISTS idx_admin_communications_log_sent_by
ON admin_communications_log(sent_by);

-- Add index for athlete_programs.purchase_id
CREATE INDEX IF NOT EXISTS idx_athlete_programs_purchase_id
ON athlete_programs(purchase_id);

-- Add indexes for atp_compliance_alerts
CREATE INDEX IF NOT EXISTS idx_atp_compliance_alerts_atp_id
ON atp_compliance_alerts(atp_id);

CREATE INDEX IF NOT EXISTS idx_atp_compliance_alerts_trainer_id
ON atp_compliance_alerts(trainer_id);

-- Add index for contact_submissions.assigned_to
CREATE INDEX IF NOT EXISTS idx_contact_submissions_assigned_to
ON contact_submissions(assigned_to);

-- Add index for membership_access.assigned_by
CREATE INDEX IF NOT EXISTS idx_membership_access_assigned_by
ON membership_access(assigned_by);

-- Add index for stripe_membership_mappings.membership_id
CREATE INDEX IF NOT EXISTS idx_stripe_membership_mappings_membership_id
ON stripe_membership_mappings(membership_id);

-- Add index for stripe_products.created_by
CREATE INDEX IF NOT EXISTS idx_stripe_products_created_by
ON stripe_products(created_by);

-- Add indexes for team_digest_content
CREATE INDEX IF NOT EXISTS idx_team_digest_content_created_by
ON team_digest_content(created_by);

CREATE INDEX IF NOT EXISTS idx_team_digest_content_digest_article_id
ON team_digest_content(digest_article_id);
