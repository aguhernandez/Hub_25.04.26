
ALTER TABLE public.external_planner_tokens
  DROP CONSTRAINT external_planner_tokens_planner_type_check;

ALTER TABLE public.external_planner_tokens
  ADD CONSTRAINT external_planner_tokens_planner_type_check
  CHECK (planner_type = ANY (ARRAY[
    'nutrition'::text,
    'endurance'::text,
    'strength'::text,
    'lab'::text,
    'academy'::text,
    'performance'::text,
    'motion'::text,
    'biomechanic'::text,
    'other'::text
  ]));
