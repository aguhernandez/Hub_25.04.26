/*
# Add block_instance_id to workout_exercises

## Purpose
Allows duplicate workout sections (e.g. two "Main Work" blocks) to persist as separate
sections. Previously only `section_title` (a display name) was stored, so two blocks with
the same name merged into one on reload.

## Changes
1. New column: `workout_exercises.block_instance_id` (text, nullable)
   - Stores a unique identifier per block instance within a workout
   - NULL for legacy rows (treated as a single implicit block per section_title)

2. No RLS policy changes — the column is application-managed, not security-sensitive.
*/

ALTER TABLE workout_exercises
  ADD COLUMN IF NOT EXISTS block_instance_id text;
