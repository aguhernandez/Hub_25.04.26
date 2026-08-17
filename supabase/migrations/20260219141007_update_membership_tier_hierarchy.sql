/*
  # Update Membership Tier Hierarchy

  ## Summary
  Updates the internal tier hierarchy function/mapping used in
  the ensure_single_active_membership trigger to use the new slugs.

  ## Changes
  - Maps 'intermediate' slug to level 2 (was 'asciende')
  - Keeps 'pro' at level 3
  - Keeps 'inicia' at level 1

  ## Important Notes
  1. This updates the get_membership_tier_level function if it exists
  2. Backward compatible - old 'asciende' slug maps to same level as 'intermediate'
*/

CREATE OR REPLACE FUNCTION get_membership_tier_level(slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE slug
    WHEN 'pro' THEN 3
    WHEN 'pro-elite' THEN 3
    WHEN 'intermediate' THEN 2
    WHEN 'asciende' THEN 2
    WHEN 'inicia' THEN 1
    WHEN 'start' THEN 1
    WHEN 'free' THEN 0
    ELSE 0
  END;
END;
$$;
