import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as jose from "npm:jose@5.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Planner-Token",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function resolveUserId(token: string | null) {
  if (!token?.startsWith("Bearer ")) return null;
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) return null;
  try {
    const { payload } = await jose.jwtVerify(token.slice(7), new TextEncoder().encode(secret));
    return typeof payload.user_id === "string" ? payload.user_id : null;
  } catch {
    return null;
  }
}

async function validPlannerToken(token: string | null, db: ReturnType<typeof createClient>) {
  if (!token) return false;
  const tokenHash = await hashToken(token);
  const { data: hashed } = await db
    .from("external_planner_tokens")
    .select("id")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .eq("planner_type", "endurance")
    .maybeSingle();
  if (hashed) return true;
  const { data: raw } = await db
    .from("external_planner_tokens")
    .select("id")
    .eq("token_raw", token)
    .eq("is_active", true)
    .eq("planner_type", "endurance")
    .maybeSingle();
  if (raw) return true;
  const { data: fallback } = await db.from("admin_config").select("value").eq("key", "hub_planner_token").maybeSingle();
  return fallback?.value === token;
}

async function authorizedActor(db: ReturnType<typeof createClient>, actorId: string, athleteId: string) {
  const { data: actor } = await db.from("profiles").select("id, role").eq("id", actorId).maybeSingle();
  if (!actor) return null;
  if (actor.role === "admin" || actor.id === athleteId) return actor;
  if (!["trainer", "head_coach"].includes(actor.role)) return null;
  const { data: athlete } = await db.from("profiles").select("id").eq("id", athleteId).eq("assigned_trainer_id", actor.id).maybeSingle();
  return athlete ? actor : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const plannerOk = await validPlannerToken(req.headers.get("X-Planner-Token"), db);
  const actorId = await resolveUserId(req.headers.get("Authorization"));
  const url = new URL(req.url);
  const athleteId = url.searchParams.get("athlete_id");
  if (!plannerOk || !actorId || !athleteId) return json({ error: "Planner token, Hub user and athlete_id are required" }, 401);
  const actor = await authorizedActor(db, actorId, athleteId);
  if (!actor) return json({ error: "Authorized Hub user required" }, 403);
  const endpoint = url.pathname.split("/").pop();
  const athleteCanOnlyPropose = (status: string) => actor.id === athleteId && !["proposed", "cancelled"].includes(status);

  if (endpoint === "shared-events" && req.method === "GET") {
    const { data, error } = await db.from("shared_athlete_events").select("*").eq("athlete_id", athleteId).order("event_date", { ascending: true, nullsFirst: false });
    return error ? json({ error: error.message }, 400) : json({ events: data || [] });
  }
  if (endpoint === "shared-event" && req.method === "POST") {
    const body = await req.json();
    const kind = body.event_kind || "objective";
    if (!body.title || !body.external_key || (kind !== "objective" && !body.event_date)) return json({ error: "title and external_key are required; dated events require event_date" }, 400);
    const status = body.status || (actor.id === athleteId ? "proposed" : "approved");
    if (athleteCanOnlyPropose(status)) return json({ error: "Athlete changes must remain proposed" }, 403);
    const payload = { athlete_id: athleteId, title: body.title, description: body.description ?? null, event_kind: kind, priority: body.priority ?? null, event_date: body.event_date ?? null, event_time: body.event_time ?? null, sport: body.sport ?? null, sub_discipline: body.sub_discipline ?? null, distance_km: body.distance_km ?? null, location: body.location ?? null, status, source_system: "endurance", external_key: body.external_key, source_record_id: body.source_record_id ?? null, updated_by: actor.id };
    const { data: existing } = await db.from("shared_athlete_events").select("*").eq("athlete_id", athleteId).eq("source_system", "endurance").eq("external_key", body.external_key).maybeSingle();
    const fields = ["title", "description", "event_kind", "priority", "event_date", "event_time", "sport", "sub_discipline", "distance_km", "location", "status", "source_record_id"];
    if (existing && fields.every((field) => JSON.stringify(existing[field] ?? null) === JSON.stringify(payload[field] ?? null))) return json({ event: existing });
    const query = existing ? db.from("shared_athlete_events").update({ ...payload, source_version: Number(existing.source_version || 1) + 1 }).eq("id", existing.id) : db.from("shared_athlete_events").insert({ ...payload, created_by: actor.id });
    const { data, error } = await query.select().single();
    return error ? json({ error: error.message }, 400) : json({ event: data });
  }
  if (endpoint === "availability" && req.method === "GET") {
    const { data, error } = await db.from("athlete_availability_windows").select("*").eq("athlete_id", athleteId).neq("status", "cancelled").order("available_date", { ascending: true, nullsFirst: false }).order("day_of_week", { ascending: true, nullsFirst: false });
    return error ? json({ error: error.message }, 400) : json({ availability: data || [] });
  }
  if (endpoint === "availability" && req.method === "POST") {
    const body = await req.json();
    if (!body.external_key || (body.day_of_week == null && !body.available_date)) return json({ error: "external_key and day_of_week or available_date are required" }, 400);
    const status = body.status || (actor.id === athleteId ? "proposed" : "approved");
    if (athleteCanOnlyPropose(status)) return json({ error: "Athlete changes must remain proposed" }, 403);
    const payload = { athlete_id: athleteId, day_of_week: body.day_of_week ?? null, available_date: body.available_date ?? null, start_time: body.start_time ?? null, end_time: body.end_time ?? null, max_duration_minutes: body.max_duration_minutes ?? null, is_rest_day: body.is_rest_day === true, allows_double_sessions: body.allows_double_sessions === true, preferences: body.preferences || {}, notes: body.notes ?? null, status, timezone: body.timezone || "UTC", source_system: "endurance", external_key: body.external_key, valid_from: body.valid_from ?? null, valid_until: body.valid_until ?? null, updated_by: actor.id };
    const { data: existing } = await db.from("athlete_availability_windows").select("*").eq("athlete_id", athleteId).eq("source_system", "endurance").eq("external_key", body.external_key).maybeSingle();
    const fields = ["day_of_week", "available_date", "start_time", "end_time", "max_duration_minutes", "is_rest_day", "allows_double_sessions", "preferences", "notes", "status", "timezone", "valid_from", "valid_until"];
    if (existing && fields.every((field) => JSON.stringify(existing[field] ?? null) === JSON.stringify(payload[field] ?? null))) return json({ availability: existing });
    const query = existing ? db.from("athlete_availability_windows").update({ ...payload, source_version: Number(existing.source_version || 1) + 1 }).eq("id", existing.id) : db.from("athlete_availability_windows").insert({ ...payload, created_by: actor.id });
    const { data, error } = await query.select().single();
    return error ? json({ error: error.message }, 400) : json({ availability: data });
  }
  return json({ error: "Not found" }, 404);
});
