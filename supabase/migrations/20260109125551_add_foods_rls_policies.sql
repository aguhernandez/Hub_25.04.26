/*
  # Add RLS Policies for Foods Table

  1. Security
    - Allow public read access to all foods (needed for meal planning)
    - Allow authenticated users to read foods
    - Allow service role to insert/update/delete foods (for USDA imports)
    - Admins can manage all foods
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view foods" ON foods;
DROP POLICY IF EXISTS "Admins can insert foods" ON foods;
DROP POLICY IF EXISTS "Admins can update foods" ON foods;
DROP POLICY IF EXISTS "Admins can delete foods" ON foods;

-- Public read access for all users (needed for meal planning)
CREATE POLICY "Anyone can view foods"
  ON foods
  FOR SELECT
  TO public
  USING (true);

-- Admin insert policy
CREATE POLICY "Admins can insert foods"
  ON foods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin update policy
CREATE POLICY "Admins can update foods"
  ON foods
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin delete policy
CREATE POLICY "Admins can delete foods"
  ON foods
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
