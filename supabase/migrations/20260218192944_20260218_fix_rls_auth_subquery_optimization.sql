/*
  # Fix RLS Auth Initialization Plan - Optimize auth.uid() calls

  ## Summary
  RLS policies calling auth.uid() directly re-evaluate per row, degrading performance.
  Wrapping in (select auth.uid()) evaluates once per query.

  This migration recreates all 301 affected policies using the optimized subquery form.

  ## Approach
  Uses a DO block with regex-based text replacement to find policies where auth.uid()
  appears WITHOUT a preceding SELECT keyword, and wraps them in (SELECT auth.uid()).
*/

DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  role_str TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check, roles, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual ~ '(?<![Ee][Cc][Tt] )auth\.uid\(\)')
        OR (with_check ~ '(?<![Ee][Cc][Tt] )auth\.uid\(\)')
        OR (qual ~ '(?<![Ee][Cc][Tt] )auth\.role\(\)')
        OR (with_check ~ '(?<![Ee][Cc][Tt] )auth\.role\(\)')
      )
  LOOP
    new_qual := r.qual;
    IF new_qual IS NOT NULL THEN
      -- Replace auth.uid() not preceded by "ECT " (i.e., not already SELECT auth.uid())
      new_qual := regexp_replace(new_qual, '(?<![Ee][Cc][Tt] )auth\.uid\(\)', '( SELECT auth.uid() AS uid)', 'g');
      new_qual := regexp_replace(new_qual, '(?<![Ee][Cc][Tt] )auth\.role\(\)', '( SELECT auth.role() AS role)', 'g');
    END IF;

    new_check := r.with_check;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, '(?<![Ee][Cc][Tt] )auth\.uid\(\)', '( SELECT auth.uid() AS uid)', 'g');
      new_check := regexp_replace(new_check, '(?<![Ee][Cc][Tt] )auth\.role\(\)', '( SELECT auth.role() AS role)', 'g');
    END IF;

    role_str := array_to_string(r.roles, ', ');

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    IF r.cmd = 'ALL' THEN
      IF new_check IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR ALL TO %s USING (%s) WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          role_str, new_qual, new_check
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR ALL TO %s USING (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          role_str, new_qual
        );
      END IF;
    ELSIF r.cmd = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR SELECT TO %s USING (%s)',
        r.policyname, r.schemaname, r.tablename,
        CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        role_str, new_qual
      );
    ELSIF r.cmd = 'INSERT' THEN
      IF new_check IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR INSERT TO %s WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          role_str, new_check
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR INSERT TO %s WITH CHECK (true)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          role_str
        );
      END IF;
    ELSIF r.cmd = 'UPDATE' THEN
      IF new_check IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          role_str, new_qual, new_check
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR UPDATE TO %s USING (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          role_str, new_qual
        );
      END IF;
    ELSIF r.cmd = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR DELETE TO %s USING (%s)',
        r.policyname, r.schemaname, r.tablename,
        CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        role_str, new_qual
      );
    END IF;
  END LOOP;
END $$;
