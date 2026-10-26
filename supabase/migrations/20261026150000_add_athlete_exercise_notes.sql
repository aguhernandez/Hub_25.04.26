CREATE TABLE IF NOT EXISTS public.exercise_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_workout_id uuid NOT NULL REFERENCES public.athlete_workouts(id) ON DELETE CASCADE,
  workout_exercise_id uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (char_length(trim(note)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_workout_id, workout_exercise_id)
);

ALTER TABLE public.exercise_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes manage own exercise notes" ON public.exercise_notes;
CREATE POLICY "Athletes manage own exercise notes"
  ON public.exercise_notes FOR ALL TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Trainers view assigned exercise notes" ON public.exercise_notes;
CREATE POLICY "Trainers view assigned exercise notes"
  ON public.exercise_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.athlete_workouts aw
      WHERE aw.id = exercise_notes.athlete_workout_id
        AND aw.trainer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_exercise_notes_workout
  ON public.exercise_notes (athlete_workout_id);

CREATE INDEX IF NOT EXISTS idx_exercise_notes_athlete
  ON public.exercise_notes (athlete_id, updated_at DESC);
