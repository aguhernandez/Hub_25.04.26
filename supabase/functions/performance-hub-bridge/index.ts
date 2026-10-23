import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { jwtVerify } from 'npm:jose@5.2.0';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-planner-token', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Stable paging: never silently truncate an athlete's history at PostgREST's row cap.
async function all(makeQuery: () => any): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await makeQuery().order('id').range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'GET') return reply({ error: 'Method not allowed' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const token = req.headers.get('X-Planner-Token');
    const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!jwt || !token) return reply({ error: 'Hub JWT and X-Planner-Token are required' }, 401);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const { data: planner, error: tokenError } = await db.from('external_planner_tokens').select('id, planner_type').eq('token_hash', hash).eq('is_active', true).maybeSingle();
    if (tokenError) throw tokenError;
    if (!planner) return reply({ error: 'Invalid or inactive planner token' }, 401);
    if (planner.planner_type !== 'performance') return reply({ error: 'A Performance planner token is required' }, 403);
    // Hub issues both Supabase sessions and satellite JWTs (academy-auth).
    // Verify signatures; never authorize from a decoded/user-editable claim.
    let actorId: string | undefined;
    const { data: auth } = await db.auth.getUser(jwt);
    actorId = auth.user?.id;
    if (!actorId) {
      const secret = Deno.env.get('JWT_SECRET');
      if (secret) {
        try {
          const { payload } = await jwtVerify(jwt, new TextEncoder().encode(secret), { algorithms: ['HS256'], requiredClaims: ['exp', 'iat'] });
          actorId = typeof payload.user_id === 'string' ? payload.user_id : payload.sub;
        } catch { /* Invalid signature/expiry is an authentication failure. */ }
      }
    }
    if (!actorId || !uuid.test(actorId)) return reply({ error: 'Invalid or expired Hub session' }, 401);
    const url = new URL(req.url);
    const athleteId = url.searchParams.get('athlete_id');
    const email = url.searchParams.get('athlete_email')?.trim();
    if (athleteId && !uuid.test(athleteId)) return reply({ error: 'Invalid athlete_id' }, 400);
    if (!athleteId && !email) return reply({ error: 'athlete_id or athlete_email required' }, 400);
    const { data: actor, error: actorError } = await db.from('profiles').select('id, role').eq('id', actorId).maybeSingle();
    if (actorError) throw actorError;
    if (!actor) return reply({ error: 'Hub profile not found' }, 403);
    let targetQuery = db.from('profiles').select('id, email, full_name, sport, date_of_birth, gender, assigned_trainer_id');
    targetQuery = athleteId ? targetQuery.eq('id', athleteId) : targetQuery.eq('email', email!);
    const { data: athlete, error: targetError } = await targetQuery.maybeSingle();
    if (targetError) throw targetError;
    // Do not disclose whether an unrelated athlete exists.
    if (!athlete || !(actor.role === 'admin' || actorId === athlete.id || (['trainer', 'head_coach'].includes(actor.role) && athlete.assigned_trainer_id === actorId))) return reply({ error: 'Athlete access denied' }, 403);
    const id = athlete.id;
    const endpoint = url.pathname.split('/').pop();
    if (endpoint === 'streams') {
      const activityId = url.searchParams.get('activity_id');
      const source = url.searchParams.get('source') || 'external';
      if (!activityId || !uuid.test(activityId)) return reply({ error: 'Invalid activity_id' }, 400);
      if (source !== 'external' && source !== 'executed') return reply({ error: 'Unsupported stream source' }, 400);
      const { data: activity, error } = await db.from(source === 'external' ? 'external_activities' : 'executed_sessions').select(source === 'external' ? 'id, user_id, local_date, sport_type, deleted_at' : 'id, athlete_id, start_time, sport_category').eq('id', activityId).maybeSingle();
      if (error) throw error;
      if (!activity || (activity.user_id ?? activity.athlete_id) !== id || activity.deleted_at) return reply({ error: 'Activity not found' }, 404);
      if (source === 'executed') {
        // Reuse Hub's wearable provider integration; do not duplicate its storage.
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/open-wearables`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}`, 'X-Planner-Token': token, 'apikey': Deno.env.get('SUPABASE_ANON_KEY')! }, body: JSON.stringify({ action: 'get-session-timeseries', executed_session_id: activityId }) });
        return reply(await response.json(), response.status);
      }
      const { data: stream, error: streamError } = await db.from('activity_streams').select('time_stream, watts_stream, heartrate_stream, cadence_stream, velocity_smooth_stream, altitude_stream, distance_stream, latlng_stream, moving_stream').eq('activity_id', activityId).eq('user_id', id).maybeSingle();
      if (streamError) throw streamError;
      return reply({ activity_id: activityId, activity_date: activity.local_date, sport: activity.sport_type, series: stream ? { time_s: stream.time_stream ?? [], watts: stream.watts_stream, hr: stream.heartrate_stream, cadence: stream.cadence_stream, speed: stream.velocity_smooth_stream, altitude: stream.altitude_stream, distance: stream.distance_stream, latlng: stream.latlng_stream, moving: stream.moving_stream } : null });
    }
    if (endpoint !== 'context') return reply({ error: 'Unknown endpoint' }, 404);
    const from = url.searchParams.get('date_from') || '1900-01-01';
    const to = url.searchParams.get('date_to') || '2100-12-31';
    if (![from, to].every(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d))) || from > to) return reply({ error: 'Invalid date range' }, 400);
    const dated = (table: string, owner: string, date: string, select = '*') => all(() => db.from(table).select(select).eq(owner, id).gte(date, date === 'start_time' ? `${from}T00:00:00Z` : from).lte(date, date === 'start_time' ? `${to}T23:59:59.999Z` : to));
    const jobs: Record<string, () => Promise<any>> = {
      external: () => all(() => db.from('external_activities').select('id, source, external_id, sport_type, name, local_date, start_time, duration_seconds, distance_meters, elevation_gain_meters, average_power, average_watts, weighted_avg_watts, average_heartrate, max_heartrate, user_rpe, user_notes, streams_fetched, has_power, has_heartrate, fused_activity_id, imported_to_training_log_id, planned_workout_id').eq('user_id', id).is('deleted_at', null).gte('start_time', `${from}T00:00:00Z`).lte('start_time', `${to}T23:59:59.999Z`)),
      executed: () => dated('executed_sessions', 'athlete_id', 'start_time'),
      completed: () => dated('endurance_completed_workouts', 'athlete_id', 'scheduled_date'),
      strength: () => dated('athlete_workouts', 'athlete_id', 'scheduled_date', 'id, scheduled_date, status, completed_at, source, external_id, external_title, raw_description, rpe, workout:workouts(name, duration_minutes)'),
      strengthLogs: () => dated('training_logs', 'athlete_id', 'logged_at', 'id, athlete_workout_id, workout_exercise_id, reps_completed, weight_used, rir, bar_speed, logged_at, external_activity_id'),
      extra: () => dated('extra_training_logs', 'athlete_id', 'training_date'),
      passport: () => dated('biological_passports', 'athlete_id', 'measurement_date'),
      kerr: () => dated('anthropometry_kerr_results', 'athlete_id', 'measurement_date'),
      anthropometry: () => all(() => db.from('anthropometry_results').select('*').eq('user_id', id)),
      measurements: () => dated('anthropometry_measurements', 'athlete_id', 'measurement_date'),
      bioimpedance: () => dated('bioimpedance_measurements', 'user_id', 'measurement_date'),
      wellness: () => dated('wellness_checkins', 'athlete_id', 'checkin_date'),
      nutrition: () => dated('nutrition_daily_plans', 'athlete_id', 'plan_date'),
      diary: () => dated('food_diary_sessions', 'athlete_id', 'start_date'),
      nutritionPlans: () => dated('external_nutrition_plans', 'athlete_id', 'plan_date'),
      endurancePlans: () => dated('external_endurance_plans', 'athlete_id', 'week_start_date'),
      plannedEndurance: () => dated('external_endurance_workouts', 'athlete_id', 'scheduled_date'),
    };
    const entries = Object.entries(jobs);
    const results = await Promise.allSettled(entries.map(([, job]) => job()));
    const data: Record<string, any> = {};
    const errors: Record<string, string> = {};
    results.forEach((result, index) => {
      const name = entries[index][0];
      if (result.status === 'fulfilled') data[name] = result.value;
      else { errors[name] = 'No se pudo leer esta sección del Hub'; console.error(`Performance read failed: ${name}`, result.reason); }
    });
    const { error: logError } = await db.from('external_planner_access_log').insert({ planner_token_id: planner.id, athlete_id: id, action: 'read', endpoint: 'performance-context', status_code: Object.keys(errors).length ? 207 : 200 });
    if (logError) throw logError;
    const { assigned_trainer_id: _assigned, ...publicAthlete } = athlete;
    return reply({ athlete: publicAthlete, data, errors, date_from: from, date_to: to });
  } catch (error) {
    console.error('Performance Hub bridge', error);
    return reply({ error: 'No se pudo consultar el Hub' }, 500);
  }
});
