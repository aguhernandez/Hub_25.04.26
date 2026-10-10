/*
# Restrict wearable_links grants to authenticated only

1. Security Changes
- Revoke ALL privileges from `anon` role on `wearable_links`.
- Keep SELECT, INSERT, UPDATE, DELETE for `authenticated` only.
- The Edge Function uses the service role key (bypasses RLS), so authenticated-only grants are sufficient.
- Policies remain unchanged: users read their own row, admins manage all rows.
*/

REVOKE ALL ON public.wearable_links FROM anon;
GRANT SELECT ON public.wearable_links TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wearable_links TO authenticated;
