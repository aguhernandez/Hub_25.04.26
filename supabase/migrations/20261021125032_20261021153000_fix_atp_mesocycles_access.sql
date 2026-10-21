/*
# Fix ATP mesocycle access control

1. Purpose
- Restore mesocycle loading and creation for users who are authorized to manage the parent annual training plan.
- The previous insert policy only accepted the coach_id, so athlete-owned ATPs returned HTTP 403 when creating a mesocycle.

2. Modified table
- `public.atp_mesocycles`
- No columns, rows, or relationships are changed.
- Existing mesocycle data is preserved.

3. Security changes
- Replaces the previous mesocycle policies with four separate CRUD policies.
- Access is inherited from the parent `annual_training_plans` row.
- Authorized users are the assigned coach, the ATP athlete, an administrator, or an athlete who belongs to the ATP team.
- RLS remains enabled and no public or anonymous access is granted.

4. Important notes
- This migration changes only authorization predicates.
- It does not grant access to unrelated ATPs or allow users to change the parent ATP relationship.
*/

ALTER TABLE public.atp_mesocycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view mesocycles of accessible ATPs" ON public.atp_mesocycles;
DROP POLICY IF EXISTS "Coaches can manage mesocycles of their ATPs" ON public.atp_mesocycles;
DROP POLICY IF EXISTS "Coaches can update mesocycles of their ATPs" ON public.atp_mesocycles;
DROP POLICY IF EXISTS "Coaches can delete mesocycles of their ATPs" ON public.atp_mesocycles;
DROP POLICY IF EXISTS "Admins can manage all mesocycles" ON public.atp_mesocycles;
DROP POLICY IF EXISTS "ATP participants can view mesocycles" ON public.atp_mesocycles;
DROP POLICY IF EXISTS "ATP participants can insert mesocycles" ON public.atp_mesocycles;
DROP POLICY IF EXISTS "ATP participants can update mesocycles" ON public.atp_mesocycles;
DROP POLICY IF EXISTS "ATP participants can delete mesocycles" ON public.atp_mesocycles;

CREATE POLICY "ATP participants can view mesocycles"
ON public.atp_mesocycles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.annual_training_plans p
    WHERE p.id = atp_mesocycles.atp_id
      AND (
        p.coach_id = auth.uid()
        OR p.athlete_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = auth.uid() AND pr.role = 'admin'
        )
        OR (
          p.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = p.team_id AND tm.athlete_id = auth.uid()
          )
        )
      )
  )
);

CREATE POLICY "ATP participants can insert mesocycles"
ON public.atp_mesocycles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.annual_training_plans p
    WHERE p.id = atp_mesocycles.atp_id
      AND (
        p.coach_id = auth.uid()
        OR p.athlete_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = auth.uid() AND pr.role = 'admin'
        )
        OR (
          p.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = p.team_id AND tm.athlete_id = auth.uid()
          )
        )
      )
  )
);

CREATE POLICY "ATP participants can update mesocycles"
ON public.atp_mesocycles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.annual_training_plans p
    WHERE p.id = atp_mesocycles.atp_id
      AND (
        p.coach_id = auth.uid()
        OR p.athlete_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = auth.uid() AND pr.role = 'admin'
        )
        OR (
          p.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = p.team_id AND tm.athlete_id = auth.uid()
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.annual_training_plans p
    WHERE p.id = atp_mesocycles.atp_id
      AND (
        p.coach_id = auth.uid()
        OR p.athlete_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = auth.uid() AND pr.role = 'admin'
        )
        OR (
          p.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = p.team_id AND tm.athlete_id = auth.uid()
          )
        )
      )
  )
);

CREATE POLICY "ATP participants can delete mesocycles"
ON public.atp_mesocycles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.annual_training_plans p
    WHERE p.id = atp_mesocycles.atp_id
      AND (
        p.coach_id = auth.uid()
        OR p.athlete_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = auth.uid() AND pr.role = 'admin'
        )
        OR (
          p.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = p.team_id AND tm.athlete_id = auth.uid()
          )
        )
      )
  )
);