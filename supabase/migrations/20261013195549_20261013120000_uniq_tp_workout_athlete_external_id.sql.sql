/*
# Unique index for TrainingPeaks workouts (athlete_id + external_id)

1. Purpose
   - Enables the batched upsert in the auto-sync-trainingpeaks edge function
     with conflict key (athlete_id, external_id), replacing row-by-row writes.
   - Does NOT modify or delete any existing data.

2. Changes
   - New partial unique index: uniq_tp_workout_athlete_external_id
     ON athlete_workouts (athlete_id, external_id)
     WHERE source = 'trainingpeaks' AND external_id IS NOT NULL.
   - The existing uniq_tp_workout_athlete_date_title index is preserved.

3. Pre-check executed before applying (read-only)
   - Duplicate scan over (athlete_id, external_id) for all sources returned 0 rows.
*/

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tp_workout_athlete_external_id
ON athlete_workouts (athlete_id, external_id)
WHERE source = 'trainingpeaks' AND external_id IS NOT NULL;
