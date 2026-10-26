import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: habits, error } = await db.from("user_habits")
    .select("id, user_id, name, reminder_time, reminder_timezone")
    .eq("reminder_enabled", true).not("reminder_time", "is", null);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const claimed: any[] = [];
  for (const habit of habits || []) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: habit.reminder_timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(now).reduce((a: Record<string, string>, p) => { a[p.type] = p.value; return a; }, {});
    if (`${parts.hour}:${parts.minute}:00` !== String(habit.reminder_time).slice(0, 8)) continue;
    const reminderDate = `${parts.year}-${parts.month}-${parts.day}`;
    const { data: delivery } = await db.from("habit_reminder_deliveries")
      .insert({ habit_id: habit.id, user_id: habit.user_id, reminder_date: reminderDate }).select("id").maybeSingle();
    if (delivery) claimed.push({ ...habit, reminderDate });
  }
  const profiles = claimed.length ? (await db.from("profiles").select("id, language").in("id", claimed.map(h => h.user_id))).data || [] : [];
  const results = [];
  for (const habit of claimed) {
    const es = profiles.find(p => p.id === habit.user_id)?.language === "es";
    const response = await fetch(`${url}/functions/v1/send-push-notification`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: habit.user_id, title: es ? "Recordatorio de hábito" : "Habit reminder", body: es ? `¿Hiciste ${habit.name}?` : `Did you do ${habit.name}?`, category: "new_habit", data: { page: "habits", type: "habit_reminder", habit_id: habit.id, reminder_date: habit.reminderDate } }) });
    results.push({ habit_id: habit.id, sent: response.ok });
  }
  return new Response(JSON.stringify({ processed: results.length, results }), { headers: { "Content-Type": "application/json" } });
});
