/*
  # Fix Anthropometry Kerr Results RLS for Trainer Access

  1. Changes
    - Add policy for trainers to view all Kerr results (matching anthropometry_measurements access)
    - Ensures consistency between measurements and results access patterns

  2. Security
    - Trainers need to see all Kerr results to analyze any athlete
    - Maintains existing athlete and admin access
*/

-- Drop the restrictive trainer policy
DROP POLICY IF EXISTS "Trainers view assigned athletes Kerr results" ON anthropometry_kerr_results;

-- Create new policy for trainers to view all Kerr results
CREATE POLICY "Trainers can view all Kerr results"
  ON anthropometry_kerr_results
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'trainer'
    OR (auth.jwt() ->> 'user_role') = 'admin'
  );
