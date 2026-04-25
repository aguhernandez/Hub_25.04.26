
/*
  # Fix endurance plan dates shifted by -1 day

  The endurance planner satellite was sending dates as JavaScript Date objects
  serialized with .toISOString() which converts local time to UTC. In UTC-3
  (Argentina), midnight local = 03:00 UTC the same day, but .toISOString()
  returns the UTC representation which substring(0,10) cuts to the previous day.

  This migration adds 1 day to all dates stored in plan_data->days[].date
  inside external_endurance_plans to correct the off-by-one error.

  Also corrects week_start_date if it is also off by one.
*/

DO $$
DECLARE
  rec RECORD;
  updated_days jsonb;
  day_item jsonb;
  corrected_date text;
BEGIN
  FOR rec IN SELECT id, plan_data FROM external_endurance_plans LOOP
    IF rec.plan_data IS NULL OR rec.plan_data->'days' IS NULL THEN
      CONTINUE;
    END IF;

    updated_days := '[]'::jsonb;

    FOR day_item IN SELECT jsonb_array_elements(rec.plan_data->'days') LOOP
      IF day_item->>'date' IS NOT NULL THEN
        corrected_date := (
          (day_item->>'date')::date + interval '1 day'
        )::date::text;
        day_item := jsonb_set(day_item, '{date}', to_jsonb(corrected_date));
      END IF;
      updated_days := updated_days || day_item;
    END LOOP;

    UPDATE external_endurance_plans
    SET plan_data = jsonb_set(plan_data, '{days}', updated_days),
        updated_at = now()
    WHERE id = rec.id;
  END LOOP;
END $$;
