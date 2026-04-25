/*
  # Fix Admin and Trainer Program Permissions

  1. Changes
    - Add DELETE policy for admins on program_products
    - Add UPDATE policy for admins on program_products
    - Ensure trainers can manage their own programs
  
  2. Security
    - Admins can delete/update any program
    - Trainers can only delete/update their own programs
*/

-- Add admin DELETE policy
DROP POLICY IF EXISTS "Admins can delete any program" ON program_products;
CREATE POLICY "Admins can delete any program"
  ON program_products
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Add admin UPDATE policy
DROP POLICY IF EXISTS "Admins can update any program" ON program_products;
CREATE POLICY "Admins can update any program"
  ON program_products
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );
