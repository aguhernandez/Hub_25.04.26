ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS circuit_instance_id text,
  ADD COLUMN IF NOT EXISTS circuit_id uuid REFERENCES public.circuits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS circuit_name text,
  ADD COLUMN IF NOT EXISTS circuit_type text CHECK (circuit_type IS NULL OR circuit_type IN ('rounds', 'amrap')),
  ADD COLUMN IF NOT EXISTS circuit_rounds integer,
  ADD COLUMN IF NOT EXISTS circuit_amrap_minutes integer;

CREATE INDEX IF NOT EXISTS workout_exercises_circuit_instance_idx
  ON public.workout_exercises (workout_id, circuit_instance_id)
  WHERE circuit_instance_id IS NOT NULL;

COMMENT ON COLUMN public.workout_exercises.circuit_instance_id IS
  'Builder-local circuit occurrence. Groups circuit exercises without conflating repeated uses of the same saved circuit.';
