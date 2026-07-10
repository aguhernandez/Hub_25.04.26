/*
# Relax UPDATE policy on external_endurance_plans

The existing "Athletes can update own external endurance plans" policy restricts updates
to auth.uid() = athlete_id. This prevents trainers from moving/rescheduling plan days
on behalf of their athletes from the Hub calendar.

Replace with a policy that allows any authenticated user to update, consistent with the
permissive DELETE policy already in place. Trainers authenticated in this app always
access the DB through the anon key with their own JWT, so this allows trainer operations
while keeping unauthenticated access blocked.
*/

DROP POLICY IF EXISTS "Athletes can update own external endurance plans" ON external_endurance_plans;
DROP POLICY IF EXISTS "authenticated_update_endurance_plans" ON external_endurance_plans;

CREATE POLICY "authenticated_update_endurance_plans"
ON external_endurance_plans FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
