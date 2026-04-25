/*
  # Remove Recursive Policy from Teams
  
  1. Problem
    - "Members view their teams" policy in teams table does subquery to team_members
    - This causes infinite recursion
  
  2. Solution
    - Drop this problematic policy completely
    - Members will see teams through other policies (official/public teams)
*/

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Members view their teams" ON teams;
