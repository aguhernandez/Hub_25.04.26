/*
  # Fix RLS Auth Initialization Plan - Replace auth.uid() with (select auth.uid())

  ## Summary
  RLS policies that call auth.uid() directly re-evaluate the function once per row,
  which causes significant performance degradation on large tables.
  
  Using (select auth.uid()) evaluates the expression once per query (as a subquery),
  greatly improving performance on tables with many rows.
  
  This migration recreates all affected policies using the optimized form.
  
  ## Tables Affected
  All tables with RLS policies using bare auth.uid() or auth.role() calls.
  
  ## Security Notes
  - No security behavior changes, only performance optimization
  - Policies remain functionally identical
*/

DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  cmd_str TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check, roles, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
        OR (qual LIKE '%auth.role()%' AND qual NOT LIKE '%(select auth.role())%')
        OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
        OR (with_check LIKE '%auth.role()%' AND with_check NOT LIKE '%(select auth.role())%')
      )
  LOOP
    -- Build new qual with replacement
    new_qual := r.qual;
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, '\bauth\.uid\(\)', '(select auth.uid())', 'g');
      new_qual := regexp_replace(new_qual, '\bauth\.role\(\)', '(select auth.role())', 'g');
    END IF;
    
    new_check := r.with_check;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, '\bauth\.uid\(\)', '(select auth.uid())', 'g');
      new_check := regexp_replace(new_check, '\bauth\.role\(\)', '(select auth.role())', 'g');
    END IF;

    -- Drop old policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    -- Recreate with optimized form
    IF r.cmd = 'ALL' THEN
      IF new_check IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR ALL TO %s USING (%s) WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          array_to_string(r.roles, ', '),
          new_qual, new_check
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR ALL TO %s USING (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          array_to_string(r.roles, ', '),
          new_qual
        );
      END IF;
    ELSIF r.cmd = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR SELECT TO %s USING (%s)',
        r.policyname, r.schemaname, r.tablename,
        CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        array_to_string(r.roles, ', '),
        new_qual
      );
    ELSIF r.cmd = 'INSERT' THEN
      IF new_check IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR INSERT TO %s WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          array_to_string(r.roles, ', '),
          new_check
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR INSERT TO %s WITH CHECK (true)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          array_to_string(r.roles, ', ')
        );
      END IF;
    ELSIF r.cmd = 'UPDATE' THEN
      IF new_check IS NOT NULL THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          array_to_string(r.roles, ', '),
          new_qual, new_check
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR UPDATE TO %s USING (%s)',
          r.policyname, r.schemaname, r.tablename,
          CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          array_to_string(r.roles, ', '),
          new_qual
        );
      END IF;
    ELSIF r.cmd = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR DELETE TO %s USING (%s)',
        r.policyname, r.schemaname, r.tablename,
        CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        array_to_string(r.roles, ', '),
        new_qual
      );
    END IF;
  END LOOP;
END $$;
