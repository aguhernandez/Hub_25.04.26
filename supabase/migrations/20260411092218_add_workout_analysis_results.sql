/*
  # Add Workout Analysis Results Table

  ## Summary
  Stores the post-workout analysis result returned by the Endurance Satellite
  (or generated locally as a fallback). Each row links to an external activity
  and optionally to the planned workout it corresponds to.

  ## New Tables
  - `workout_analysis_results`
    - `id` - Primary key
    - `athlete_id` - FK to profiles
    - `activity_id` - UUID of the external/GPS activity (from external_endurance_workouts or save-activity)
    - `planned_workout_id` - Optional FK to athlete_workouts
    - `final_score` - 0-100 score
    - `classification` - green | yellow | red
    - `insights` - array of insight strings
    - `quick_feedback` - Hub-generated immediate feedback (non-physiological)
    - `duration_pct` - completed duration as % of planned
    - `intensity_deviation` - qualitative: on_target | slightly_above | slightly_below | above | below
    - `satellite_response_raw` - full JSON from satellite
    - `source` - 'satellite' | 'local_fallback'
    - `created_at`

  ## Security
  - RLS enabled
  - Athlete can read/write own records
  - Trainer can read records for assigned athletes
*/

CREATE TABLE IF NOT EXISTS workout_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id uuid,
  planned_workout_id uuid,
  final_score numeric(5,2),
  classification text CHECK (classification IN ('green', 'yellow', 'red')),
  insights text[] DEFAULT '{}',
  quick_feedback text,
  duration_pct numeric(5,1),
  intensity_deviation text CHECK (intensity_deviation IN ('on_target','slightly_above','slightly_below','above','below')),
  satellite_response_raw jsonb,
  source text NOT NULL DEFAULT 'local_fallback' CHECK (source IN ('satellite', 'local_fallback')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_analysis_athlete_id ON workout_analysis_results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_workout_analysis_activity_id ON workout_analysis_results(activity_id);
CREATE INDEX IF NOT EXISTS idx_workout_analysis_created_at ON workout_analysis_results(created_at DESC);

ALTER TABLE workout_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can read own analysis results"
  ON workout_analysis_results FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can insert own analysis results"
  ON workout_analysis_results FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own analysis results"
  ON workout_analysis_results FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Trainers can read athlete analysis results"
  ON workout_analysis_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('trainer', 'admin')
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles ap
      WHERE ap.id = workout_analysis_results.athlete_id
      AND ap.assigned_trainer_id = auth.uid()
    )
  );
