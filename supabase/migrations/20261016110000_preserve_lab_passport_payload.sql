-- Preserve the full Lab passport contract, including unknown and future fields.
ALTER TABLE public.biological_passports
  ADD COLUMN IF NOT EXISTS lab_payload jsonb;

COMMENT ON COLUMN public.biological_passports.lab_payload IS
  'Complete Lab source payload. Kept intact so fields not yet modeled by Hub are not discarded.';
