-- Keep the hardened empty search_path while schema-qualifying every table
-- referenced by the INSERT trigger. Without the public. qualifier, inserting
-- an anamnesis fails with SQLSTATE 42P01 even though the table exists.
CREATE OR REPLACE FUNCTION public.deactivate_old_anamnesis()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.nutrition_anamnesis
    SET is_active = false
    WHERE athlete_id = NEW.athlete_id
      AND id <> NEW.id
      AND is_active = true;

    NEW.version_number := COALESCE(
      (
        SELECT MAX(anamnesis.version_number) + 1
        FROM public.nutrition_anamnesis AS anamnesis
        WHERE anamnesis.athlete_id = NEW.athlete_id
      ),
      1
    );
  END IF;

  RETURN NEW;
END;
$$;
