/*
  # Add bilingual title and description fields to program_products

  ## Summary
  Adds separate Spanish and English title/description columns to `program_products`
  so trainers can enter content in both languages. The UI language selector then
  shows the appropriate version to users.

  ## Changes
  - `program_products`:
    - Added `title_es` (text, nullable) — Spanish title
    - Added `title_en` (text, nullable) — English title
    - Added `description_es` (text, nullable) — Spanish description
    - Added `description_en` (text, nullable) — English description

  ## Notes
  - Existing `title` and `description` columns are kept as fallbacks
  - The UI will show `title_es`/`title_en` if filled, falling back to `title`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_products' AND column_name = 'title_es'
  ) THEN
    ALTER TABLE program_products ADD COLUMN title_es text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_products' AND column_name = 'title_en'
  ) THEN
    ALTER TABLE program_products ADD COLUMN title_en text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_products' AND column_name = 'description_es'
  ) THEN
    ALTER TABLE program_products ADD COLUMN description_es text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_products' AND column_name = 'description_en'
  ) THEN
    ALTER TABLE program_products ADD COLUMN description_en text;
  END IF;
END $$;
