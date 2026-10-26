-- Daily push reminders for user habits. The habit time and reminder time are
-- separate so athletes can plan a habit at 07:00 and be prompted at 08:30.
ALTER TABLE public.user_habits
  ADD COLUMN IF NOT EXISTS scheduled_time time,
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_time time,
  ADD COLUMN IF NOT EXISTS reminder_timezone text NOT NULL DEFAULT 'UTC';

CREATE TABLE IF NOT EXISTS public.habit_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.user_habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reminder_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, reminder_date)
);

ALTER TABLE public.habit_reminder_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own habit reminder deliveries" ON public.habit_reminder_deliveries;
CREATE POLICY "Users can view own habit reminder deliveries"
  ON public.habit_reminder_deliveries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_habits_due_reminders
  ON public.user_habits (reminder_enabled, reminder_time)
  WHERE reminder_enabled = true;
