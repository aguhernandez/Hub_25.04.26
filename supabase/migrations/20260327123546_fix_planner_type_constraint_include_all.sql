/*
  # Fix planner_type CHECK constraint to include all existing values

  Current rows have: nutrition, endurance, lab, academy, performance
  The constraint must allow all of them plus 'strength' and 'other'.
*/

ALTER TABLE external_planner_tokens
  DROP CONSTRAINT IF EXISTS external_planner_tokens_planner_type_check;

ALTER TABLE external_planner_tokens
  ADD CONSTRAINT external_planner_tokens_planner_type_check
  CHECK (planner_type = ANY (ARRAY[
    'nutrition'::text,
    'endurance'::text,
    'strength'::text,
    'lab'::text,
    'academy'::text,
    'performance'::text,
    'other'::text
  ]));
