/*
  # Add 'lab' to external_planner_tokens planner_type constraint

  The push-lab-passport endpoint requires planner_type = 'lab' but the
  check constraint only allowed: nutrition, endurance, strength, other.
  
  This migration:
  1. Drops the old check constraint
  2. Recreates it with 'lab' included
  3. Updates the existing lab satellite token to planner_type = 'lab'
*/

ALTER TABLE external_planner_tokens
  DROP CONSTRAINT IF EXISTS external_planner_tokens_planner_type_check;

ALTER TABLE external_planner_tokens
  ADD CONSTRAINT external_planner_tokens_planner_type_check
  CHECK (planner_type = ANY (ARRAY['nutrition'::text, 'endurance'::text, 'strength'::text, 'lab'::text, 'other'::text]));

UPDATE external_planner_tokens
SET planner_type = 'lab'
WHERE id = 'd4bf6498-5727-4ecb-8a4c-2c7f00541297';
