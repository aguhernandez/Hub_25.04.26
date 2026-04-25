/*
  # Add 'superseded' to passport_status enum

  The planner-hub-api push-lab-passport endpoint tries to mark previous
  passports as 'superseded' before inserting a new one, but this value
  did not exist in the enum. This migration adds it.

  Changes:
  - Add 'superseded' label to passport_status enum
*/

ALTER TYPE passport_status ADD VALUE IF NOT EXISTS 'superseded';
