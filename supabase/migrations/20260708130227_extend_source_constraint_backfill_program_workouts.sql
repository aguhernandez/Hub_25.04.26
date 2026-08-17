
/*
# Extend athlete_workouts source constraint and backfill program workouts

## Summary
1. Adds 'program' as a valid source value in athlete_workouts.source CHECK constraint.
2. Backfills athlete_workouts + workouts for all active athlete_program assignments
   that have no program-sourced workouts yet.

## Notes
- program_day_workouts.reps is INTEGER; workout_exercises.reps is TEXT — cast on copy.
- primary_metric/secondary_metric/primary_value don't exist on program_day_workouts — set NULL.
- assignment_type defaults to 'individual' to satisfy the CHECK constraint.
- Idempotent: skips assignments that already have program-sourced workouts.
*/

ALTER TABLE athlete_workouts DROP CONSTRAINT IF EXISTS athlete_workouts_source_check;
ALTER TABLE athlete_workouts ADD CONSTRAINT athlete_workouts_source_check
  CHECK (source = ANY (ARRAY['asciende'::text, 'trainingpeaks'::text, 'program'::text]));

DO $$
DECLARE
  r_ap   RECORD;
  r_week RECORD;
  r_day  RECORD;
  v_start     DATE;
  v_day_date  DATE;
  v_workout_id UUID;
  v_existing  INT;
BEGIN
  FOR r_ap IN
    SELECT ap.athlete_id, ap.program_product_id, ap.start_date::date, ap.trainer_id, pp.title
    FROM athlete_programs ap
    JOIN program_products pp ON pp.id = ap.program_product_id
    WHERE ap.status = 'active'
  LOOP
    v_start := r_ap.start_date;

    SELECT COUNT(*) INTO v_existing
    FROM athlete_workouts aw
    JOIN workouts w ON w.id = aw.workout_id
    WHERE aw.athlete_id = r_ap.athlete_id
      AND aw.source = 'program'
      AND aw.scheduled_date >= v_start
      AND w.description LIKE r_ap.title || '%';

    IF v_existing > 0 THEN
      CONTINUE;
    END IF;

    FOR r_week IN
      SELECT pw.id AS week_id, pw.week_number
      FROM program_weeks pw
      WHERE pw.program_product_id = r_ap.program_product_id
      ORDER BY pw.week_number
    LOOP
      FOR r_day IN
        SELECT pd.id AS day_id, pd.day_number, pd.day_name
        FROM program_days pd
        WHERE pd.program_week_id = r_week.week_id
          AND EXISTS (SELECT 1 FROM program_day_workouts pdw WHERE pdw.program_day_id = pd.id)
        ORDER BY pd.day_number
      LOOP
        v_day_date := v_start + ((r_week.week_number - 1) * 7) + (r_day.day_number - 1);

        INSERT INTO workouts (trainer_id, name, description)
        VALUES (
          r_ap.trainer_id,
          COALESCE(NULLIF(r_day.day_name, ''), 'Week ' || r_week.week_number || ' - Day ' || r_day.day_number),
          r_ap.title || ' — Week ' || r_week.week_number
        )
        RETURNING id INTO v_workout_id;

        INSERT INTO athlete_workouts (athlete_id, workout_id, scheduled_date, status, source, trainer_id, assignment_type)
        VALUES (r_ap.athlete_id, v_workout_id, v_day_date, 'pending', 'program', r_ap.trainer_id, 'individual');

        INSERT INTO workout_exercises
          (workout_id, exercise_id, sets, reps, rest_seconds, notes, order_index, rir)
        SELECT
          v_workout_id,
          pdw.exercise_id,
          COALESCE(pdw.sets, 3),
          COALESCE(pdw.reps::text, '8-10'),
          COALESCE(pdw.rest_seconds, 90),
          pdw.notes,
          (ROW_NUMBER() OVER (ORDER BY pdw.order_index, pdw.id) - 1)::int,
          pdw.rir
        FROM program_day_workouts pdw
        WHERE pdw.program_day_id = r_day.day_id;

      END LOOP;
    END LOOP;
  END LOOP;
END $$;
