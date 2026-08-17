/*
  # Allow anonymous read of course_completions for public landing pages

  The public athlete landing page (accessible without auth) needs to read
  course completions to show the certification section.
  
  This policy allows anyone (including unauthenticated visitors) to read
  course completions, since the landing page is designed to be public.
*/

CREATE POLICY "Anyone can view course completions"
  ON course_completions FOR SELECT
  TO anon
  USING (true);
