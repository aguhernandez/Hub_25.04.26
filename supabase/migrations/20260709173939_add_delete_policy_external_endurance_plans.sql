/*
# Add DELETE RLS policy for external_endurance_plans

Allows authenticated users (trainers/admins) to delete rows from
external_endurance_plans. Required for the Hub delete button and
for the push-to-hub edge function's stale-plan cleanup (which uses
the service role key and bypasses RLS, but the frontend delete path
uses the anon/authenticated key).
*/

DROP POLICY IF EXISTS "authenticated_delete_endurance_plans" ON external_endurance_plans;
CREATE POLICY "authenticated_delete_endurance_plans"
ON external_endurance_plans FOR DELETE
TO authenticated
USING (true);
