/*
  # Add external_lab to passport_source enum

  Adds the value "external_lab" to the passport_source enum so that lab satellites
  can push passport data using that source identifier without errors.
*/

ALTER TYPE passport_source ADD VALUE IF NOT EXISTS 'external_lab';
