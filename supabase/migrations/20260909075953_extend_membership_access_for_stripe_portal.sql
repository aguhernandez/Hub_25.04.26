/*
# Extend athlete membership billing state for Stripe Customer Portal

1. New Columns
- `membership_access.billing_cycle` stores whether the paid membership renews monthly or annually.
- `membership_access.stripe_price_id` stores the Stripe Price used by the subscription.
- `membership_access.trial_end` stores the Stripe-managed trial end, when present.
- `membership_access.current_period_end` stores the current Stripe billing period end.
- `membership_access.cancel_at_period_end` records a scheduled cancellation without revoking access early.

2. Modified Tables
- `membership_access` gains billing synchronization fields while retaining existing membership ownership and Stripe identifiers.

3. Security
- No new table or policy is created. Existing row-level security policies remain unchanged.

4. Important Notes
- Existing rows receive safe null/false defaults and are not deleted or rewritten.
- Stripe webhooks remain the source of truth for future values.
*/

ALTER TABLE membership_access
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
