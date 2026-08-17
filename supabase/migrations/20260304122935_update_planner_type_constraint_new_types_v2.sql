/*
  # Update planner_type constraint with new satellite types

  Replaces the old planner type constraint with the new set:
  lab, endurance, nutrition, academy, motion, performance

  Old values removed: strength, other
  New values added: lab, academy, motion, performance
  
  Existing 'strength' and 'other' tokens are migrated to 'performance'.
*/

ALTER TABLE external_planner_tokens
  DROP CONSTRAINT IF EXISTS external_planner_tokens_planner_type_check;

UPDATE external_planner_tokens
SET planner_type = 'performance'
WHERE planner_type IN ('strength', 'other');

ALTER TABLE external_planner_tokens
  ADD CONSTRAINT external_planner_tokens_planner_type_check
  CHECK (planner_type = ANY (ARRAY[
    'lab'::text,
    'endurance'::text,
    'nutrition'::text,
    'academy'::text,
    'motion'::text,
    'performance'::text
  ]));
