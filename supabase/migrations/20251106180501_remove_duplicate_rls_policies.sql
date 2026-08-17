/*
  # Remove Duplicate RLS Policies

  This migration removes duplicate RLS policies that provide the same access control.
  Having multiple identical policies is redundant and adds unnecessary overhead.

  ## Duplicates Removed
  
  ### habit_logs table
  - Removing older policies in favor of clearer naming
  - Keeping: "Users can create/view/update own habit logs"
  - Removing: "Users insert/view/update own logs" (duplicates)
  
  ### training_logs table  
  - Removing older policies in favor of clearer naming
  - Keeping: "Athletes can insert/view own training logs"
  - Removing: "Athletes can create/view own logs" (duplicates)

  ## Impact
  - Reduces policy evaluation overhead
  - Improves database performance
  - Maintains exact same security posture
*/

-- Remove duplicate habit_logs policies
DROP POLICY IF EXISTS "Users insert own logs" ON habit_logs;
DROP POLICY IF EXISTS "Users update own logs" ON habit_logs;
DROP POLICY IF EXISTS "Users view own logs" ON habit_logs;

-- Remove duplicate training_logs policies
DROP POLICY IF EXISTS "Athletes can create own logs" ON training_logs;
DROP POLICY IF EXISTS "Athletes can view own logs" ON training_logs;
