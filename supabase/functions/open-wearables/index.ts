import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildMatchDecisions,
  calculatePowerMetrics,
  calculateZoneSeconds,
  calculateDerivedAnalysis,
  localDate,
  normalizeSport,
  normalizeZones,
  plannedZoneSeconds,
  resolveEnduranceCompletions,
  type TimedSample,
} from '../_shared/endurance-session-analysis.ts';

const CONSENT_VERSION = '2026-10-10-v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function apiBase() {
  const base = Deno.env.get('OW_BASE_URL')?.replace(/\/+$/, '');
  if (!base) throw new Error('OW_BASE_URL is not configured');
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}

async function ow(path: string, init: RequestInit = {}) {
  const key = Deno.env.get('OW_API_KEY');
  if (!key) throw new Error('OW_API_KEY is not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const result = await fetch(`${apiBase()}${path}`, { ...init, signal: controller.signal, headers: { 'X-Open-Wearables-API-Key': key, 'Content-Type': 'application/json', ...init.headers } });
    const text = await result.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!result.ok) throw Object.assign(new Error(`Open Wearables returned ${result.status}`), { status: result.status, raw: data });
    return data;
  } finally { clearTimeout(timeout); }
}

function errorBody(error: unknown) {
  const e = error as { message?: string; status?: number; raw?: unknown };
  return { error: e.message || 'Open Wearables request failed', status: e.status ?? 502, raw: e.raw ?? null };
}

async function runLimited<T, R>(items: T[], concurrency: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) { const i = next++; try { out[i] = await work(items[i]); } catch (error) { out[i] = { error: errorBody(error) } as R; } }
  }));
  return out;
}

function normalizeDataTypes(raw: unknown) {
  const result: Array<{ type: string; last_data_at: string | null }> = [];
  const visit = (value: unknown, path: string[] = []) => {
    if (Array.isArray(value)) { value.forEach((item, index) => visit(item, [...path, String(index)])); return; }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    const dateKey = Object.keys(object).find(key => /^(last|latest|most_recent).*(at|date|time)$/i.test(key) || /^(last_data_at|latest_data_at)$/i.test(key));
    const typeValue = object.data_type || object.type || object.category || object.metric_type;
    if (dateKey || typeValue) {
      const type = typeof typeValue === 'string' ? typeValue : (path[path.length - 1] || 'unknown');
      const date = dateKey && typeof object[dateKey] === 'string' ? object[dateKey] as string : null;
      if (!result.some(item => item.type === type && item.last_data_at === date)) result.push({ type, last_data_at: date });
    }
    for (const [key, child] of Object.entries(object)) {
      if (child && typeof child === 'object') visit(child, [...path, key]);
    }
  };
  visit(raw);
  return result;
}

function firstValue(event: Record<string, unknown>, keys: string[]) {
  for (const key of keys) if (event[key] !== undefined && event[key] !== null) return event[key];
  return null;
}

function numericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function eventRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  if (!value || typeof value !== 'object') return [];
  const obj = value as Record<string, unknown>;
  for (const key of ['items', 'events', 'workouts', 'data', 'results']) {
    if (Array.isArray(obj[key])) return (obj[key] as unknown[]).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  }
  return [];
}

function cursorFrom(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  for (const key of ['next_cursor', 'nextCursor', 'next_page_token', 'nextPageToken']) {
    if (typeof obj[key] === 'string' && obj[key]) return obj[key] as string;
  }
  if (obj.has_more === true && typeof obj.cursor === 'string' && obj.cursor) return obj.cursor;
  return null;
}

async function fetchSyncRoute(provider: string, owUserId: string) {
  const configured = Deno.env.get('OW_BASE_URL')?.replace(/\/+$/, '');
  if (!configured) throw new Error('OW_BASE_URL is not configured');
  const root = configured.replace(/\/api\/v1$/i, '');
  const key = Deno.env.get('OW_API_KEY');
  const result = await fetch(`${root}/openapi.json`, { headers: key ? { 'X-Open-Wearables-API-Key': key } : {} });
  if (!result.ok) throw Object.assign(new Error(`Could not validate sync route: instance /openapi.json returned ${result.status}`), { status: 502 });
  const spec = await result.json() as { paths?: Record<string, Record<string, unknown>> };
  const candidates = Object.entries(spec.paths || {}).filter(([path, methods]) =>
    /providers?\/\{[^}]+\}\/users?\/\{[^}]+\}\/sync(?:\/|$)/i.test(path) &&
    Object.keys(methods || {}).some(method => method.toLowerCase() === 'post')
  );
  if (!candidates.length) throw Object.assign(new Error('The Open Wearables instance OpenAPI does not publish a provider user sync POST route'), { status: 501 });
  const [template] = candidates[0];
  const resolved = template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    if (/provider/i.test(name)) return encodeURIComponent(provider);
    if (/user/i.test(name)) return encodeURIComponent(owUserId);
    return _match;
  });
  if (/[{]/.test(resolved)) throw new Error(`Unsupported placeholder in Open Wearables sync route: ${template}`);
  return resolved.replace(/^\/api\/v1/i, '');
}

async function getOpenApiSpec() {
  const configured = Deno.env.get('OW_BASE_URL')?.replace(/\/+$/, '');
  if (!configured) throw new Error('OW_BASE_URL is not configured');
  const root = configured.replace(/\/api\/v1$/i, '');
  const key = Deno.env.get('OW_API_KEY');
  const result = await fetch(`${root}/openapi.json`, { headers: key ? { 'X-Open-Wearables-API-Key': key } : {} });
  if (!result.ok) throw Object.assign(new Error(`Open Wearables /openapi.json returned ${result.status}`), { status: 502 });
  return await result.json() as { paths?: Record<string, Record<string, unknown>>; components?: { schemas?: Record<string, unknown> } };
}

function resolveSchemaEnum(schema: unknown, components: Record<string, unknown>, depth = 0): string[] {
  if (!schema || typeof schema !== 'object' || depth > 5) return [];
  const value = schema as Record<string, unknown>;
  if (Array.isArray(value.enum)) return value.enum.filter((item): item is string => typeof item === 'string');
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
    const target = components[value.$ref.split('/').pop()!];
    return resolveSchemaEnum(target, components, depth + 1);
  }
  for (const key of ['items', 'anyOf', 'oneOf', 'allOf']) {
    const child = value[key];
    if (Array.isArray(child)) {
      const enums = child.flatMap(item => resolveSchemaEnum(item, components, depth + 1));
      if (enums.length) return enums;
    } else {
      const enums = resolveSchemaEnum(child, components, depth + 1);
      if (enums.length) return enums;
    }
  }
  return [];
}

function resolveSchemaType(schema: unknown, components: Record<string, unknown>, depth = 0): string | null {
  if (!schema || typeof schema !== 'object' || depth > 5) return null;
  const value = schema as Record<string, unknown>;
  if (typeof value.type === 'string') return value.type;
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) return resolveSchemaType(components[value.$ref.split('/').pop()!], components, depth + 1);
  for (const key of ['items', 'anyOf', 'oneOf', 'allOf']) {
    const child = value[key];
    if (Array.isArray(child)) { for (const item of child) { const type = resolveSchemaType(item, components, depth + 1); if (type) return type; } }
    else { const type = resolveSchemaType(child, components, depth + 1); if (type) return type; }
  }
  return null;
}

function timeseriesContract(spec: Awaited<ReturnType<typeof getOpenApiSpec>>) {
  const match = Object.entries(spec.paths || {}).find(([path, methods]) =>
    /\/users\/\{[^}]+\}\/timeseries\/?$/i.test(path) && Object.keys(methods || {}).some(method => method.toLowerCase() === 'get')
  );
  if (!match) throw Object.assign(new Error('Open Wearables OpenAPI does not publish GET /api/v1/users/{user_id}/timeseries'), { status: 501 });
  const [template, methods] = match;
  const operation = Object.entries(methods).find(([method]) => method.toLowerCase() === 'get')?.[1] as Record<string, unknown>;
  const parameters = (operation?.parameters || []) as Array<Record<string, unknown>>;
  const queries = parameters.filter(parameter => parameter.in === 'query');
  const name = (pattern: RegExp) => String(queries.find(parameter => pattern.test(String(parameter.name)))?.name || '');
  const startName = name(/^start_time$/i);
  const endName = name(/^end_time$/i);
  const typeParameter = queries.find(parameter => /^(types?|series_types?|data_types?|record_type|data_type)$/i.test(String(parameter.name)));
  const cursorName = name(/^(cursor|page_token|next_token)$/i);
  const pageName = name(/^(page|page_number)$/i);
  const offsetName = name(/^offset$/i);
  const limitName = name(/^(limit|page_size)$/i);
  if (!startName || !endName || !typeParameter) throw Object.assign(new Error('The instance timeseries contract does not expose required start_time/end_time and a series type filter; refusing to fetch unrelated health data'), { status: 501 });
  const typeSchema = typeParameter.schema || {};
  const allowed = resolveSchemaEnum(typeSchema, spec.components?.schemas || {});
  if (!allowed.length) throw Object.assign(new Error('The instance OpenAPI does not declare the timeseries type enum; refusing to guess series names'), { status: 501 });
  const available = allowed;
  const hrType = available.find(type => /heart.?rate|^hr(?:_|$)/i.test(type));
  const powerType = available.find(type => /cycling.?power/i.test(type)) || available.find(type => /power/i.test(type) && !/heart/i.test(type));
  return {
    template,
    startName,
    endName,
    typeName: String(typeParameter.name),
    typeIsArray: resolveSchemaType(typeSchema, spec.components?.schemas || {}) === 'array',
    hrType,
    powerType,
    allowedTypes: available,
    cursorName: cursorName || null,
    pageName: pageName || null,
    offsetName: offsetName || null,
    limitName: limitName || null,
  };
}

function seriesRecords(raw: unknown, fallbackType: string): TimedSample[] {
  const output: TimedSample[] = [];
  const add = (item: unknown, type = fallbackType) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    const timestamp = row.timestamp ?? row.time ?? row.recorded_at ?? row.date_time;
    const value = row.value ?? row.measurement ?? row.data;
    const milliseconds = typeof timestamp === 'number' ? (timestamp < 1e12 ? timestamp * 1000 : timestamp) : Date.parse(String(timestamp || ''));
    const numeric = Number(value);
    if (Number.isFinite(milliseconds) && Number.isFinite(numeric)) output.push({ timestamp: milliseconds, value: numeric, type: String(row.type || row.data_type || row.series_type || type) });
  };
  const visit = (value: unknown, type = fallbackType) => {
    if (Array.isArray(value)) { value.forEach(item => visit(item, type)); return; }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if (('timestamp' in object || 'time' in object || 'recorded_at' in object) && ('value' in object || 'measurement' in object)) { add(object, type); return; }
    const nestedType = String(object.type || object.data_type || object.series_type || type);
    const generic = new Set(['data', 'records', 'items', 'samples', 'results', 'values', 'timeseries', 'series']);
    for (const [key, child] of Object.entries(object)) {
      if (child && typeof child === 'object') visit(child, generic.has(key.toLowerCase()) ? nestedType : key);
    }
  };
  visit(raw);
  return output;
}

async function readTimeseries(
  owUserId: string,
  startTime: string,
  endTime: string,
  types: string[],
  contract: ReturnType<typeof timeseriesContract>,
) {
  const path = contract.template.replace(/\{([^}]+)\}/g, (_match, name: string) => /user/i.test(name) ? encodeURIComponent(owUserId) : _match).replace(/^\/api\/v1/i, '');
  const samples: TimedSample[] = [];
  for (const type of types) {
    let cursor: string | null = null;
    const seen = new Set<string>();
    for (let page = 0; page < 25; page++) {
      const query = new URLSearchParams({ [contract.startName]: startTime, [contract.endName]: endTime });
      if (contract.typeIsArray) query.append(contract.typeName, type);
      else query.set(contract.typeName, type);
      if (contract.limitName) query.set(contract.limitName, '100');
      if (cursor && contract.cursorName) query.set(contract.cursorName, cursor);
      if (contract.pageName) query.set(contract.pageName, String(page + 1));
      if (contract.offsetName) query.set(contract.offsetName, String(page * 100));
      let responseData: unknown;
      let lastError: unknown;
      for (let retry = 0; retry < 3; retry++) {
        try { responseData = await ow(`${path}?${query}`); lastError = null; break; }
        catch (error) { lastError = error; if (retry < 2) await new Promise(resolve => setTimeout(resolve, 250 * (retry + 1))); }
      }
      if (lastError) throw lastError;
      samples.push(...seriesRecords(responseData, type));
      if (samples.length > 20000) throw new Error('Open Wearables timeseries exceeded the 20,000 sample safety limit for one workout');
      const object = responseData && typeof responseData === 'object' ? responseData as Record<string, unknown> : {};
      const next = [object.next_cursor, object.nextCursor, object.next_page_token, object.nextPageToken].find(value => typeof value === 'string' && value) as string | undefined;
      const hasMore = object.has_more === true || object.has_next === true || object.hasNext === true;
      if (next) {
        if (!contract.cursorName) throw new Error('Open Wearables timeseries advertises a cursor but the OpenAPI has no cursor query parameter');
        if (seen.has(next)) throw new Error('Open Wearables repeated a timeseries cursor');
        seen.add(next); cursor = next;
      } else if (hasMore && (contract.pageName || contract.offsetName)) {
        // The page or offset was advanced at the top of the next iteration.
      } else if (hasMore) throw new Error('Open Wearables timeseries has more pages but its OpenAPI exposes no supported pagination parameter');
      else break;
      if (page === 24) throw new Error('Open Wearables timeseries exceeded 25 pages for one workout');
    }
  }
  return samples;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return response({ error: 'Authentication required' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return response({ error: 'Invalid session' }, 401);
    const admin = createClient(url, service);
    const { data: profile } = await admin.from('profiles').select('id, email, full_name, role, timezone, assigned_trainer_id').eq('id', authData.user.id).maybeSingle();
    if (!profile) return response({ error: 'Profile not found' }, 403);
    const body = await req.json();
    const action = body.action as string;
    const requireAdmin = () => { if (profile.role !== 'admin') throw Object.assign(new Error('Admin access required'), { status: 403 }); };
    const getLink = async (userId = profile.id) => {
      const { data, error } = await admin.from('wearable_links').select('*').eq('asciende_user_id', userId).maybeSingle();
      if (error) throw error;
      return data;
    };
    const ensureUser = async (userId = profile.id) => {
      const link = await getLink(userId);
      if (link) return link;
      const { data: target } = await admin.from('profiles').select('id, email, full_name').eq('id', userId).maybeSingle();
      if (!target) throw new Error('Asciende profile not found');
      // external_user_id is deprecated for data reads, but the users list still supports
      // it as a lookup, which lets retries recover an upstream create safely.
      const existingResult = await ow(`/users?external_user_id=${encodeURIComponent(target.id)}&limit=1`) as { items?: Array<{ id?: string }> };
      const existingId = existingResult?.items?.[0]?.id;
      if (existingId) {
        const { data, error } = await admin.from('wearable_links').insert({ asciende_user_id: userId, ow_user_id: existingId }).select().single();
        if (error) {
          const existing = await getLink(userId);
          if (existing) return existing;
          throw error;
        }
        return data;
      }
      const [first_name, ...rest] = (target.full_name || '').trim().split(/\s+/);
      const created = await ow('/users', { method: 'POST', body: JSON.stringify({ email: target.email, external_user_id: target.id, first_name: first_name || null, last_name: rest.join(' ') || null }) }) as { id?: string };
      if (!created?.id) throw new Error('Open Wearables create-user response did not include id');
      const { data, error } = await admin.from('wearable_links').insert({ asciende_user_id: userId, ow_user_id: created.id }).select().single();
      if (error) {
        // A concurrent request may have created the link; do not create another upstream user.
        const existing = await getLink(userId);
        if (existing) return existing;
        throw error;
      }
      return data;
    };
    const requireConsent = async () => {
      const link = await getLink();
      if (!link?.consent_at || !link?.consent_version) throw Object.assign(new Error('Consent is required before connecting a provider'), { status: 409 });
      return link;
    };
    const ingestWorkouts = async (userId = profile.id) => {
      const link = await getLink(userId);
      if (!link) return { linked: false, imported_count: 0, total_count: 0, last_import_at: null };
      const { data: lastStarted, error: lastStartedError } = await admin.from('executed_sessions').select('start_time').eq('athlete_id', userId).not('start_time', 'is', null).order('start_time', { ascending: false }).limit(1).maybeSingle();
      if (lastStartedError) throw lastStartedError;
      const { data: lastIngested, error: lastIngestedError } = await admin.from('executed_sessions').select('ingested_at').eq('athlete_id', userId).order('ingested_at', { ascending: false }).limit(1).maybeSingle();
      if (lastIngestedError) throw lastIngestedError;
      const now = new Date();
      const start = lastStarted?.start_time ? new Date(new Date(lastStarted.start_time).getTime() - 2 * 86400000) : new Date(now.getTime() - 30 * 86400000);
      const baseQuery = new URLSearchParams({ start_date: start.toISOString(), end_date: now.toISOString(), limit: '100' });
      const records = new Map<string, Record<string, unknown>>();
      let cursor: string | null = null;
      const seenCursors = new Set<string>();
      for (let page = 0; page < 100; page++) {
        const query = new URLSearchParams(baseQuery);
        if (cursor) query.set('cursor', cursor);
        const pageData = await ow(`/users/${encodeURIComponent(link.ow_user_id)}/events/workouts?${query}`);
        for (const event of eventRows(pageData)) {
          const id = firstValue(event, ['id', 'event_id', 'uuid']);
          if (typeof id === 'string' || typeof id === 'number') records.set(String(id), event);
          else throw Object.assign(new Error('A workout event from Open Wearables did not include an event ID; nothing was imported'), { status: 502 });
        }
        const next = cursorFrom(pageData);
        const hasMore = !!pageData && typeof pageData === 'object' && (pageData as Record<string, unknown>).has_more === true;
        if (hasMore && !next) throw new Error('Open Wearables indicated more workout pages but did not return a cursor');
        if (!next) break;
        if (seenCursors.has(next)) throw new Error('Open Wearables repeated a workout cursor; import stopped to avoid truncating results');
        seenCursors.add(next); cursor = next;
        if (page === 99) throw new Error('Open Wearables workout pagination exceeded 100 pages');
      }
      const ingestedAt = new Date().toISOString();
      const rows = [...records.entries()].map(([eventId, event]) => ({
        athlete_id: userId,
        ow_event_id: eventId,
        provider: firstValue(event, ['provider', 'source']) as string | null,
        sport_raw: firstValue(event, ['subtype', 'sport', 'sport_type', 'activity_type', 'type']) as string | null,
        sport_category: normalizeSport(firstValue(event, ['subtype', 'sport', 'sport_type', 'activity_type', 'type'])),
        start_time: firstValue(event, ['start_time', 'start_date', 'started_at']) as string | null,
        end_time: firstValue(event, ['end_time', 'end_date', 'ended_at']) as string | null,
        duration_seconds: numericValue(firstValue(event, ['duration_seconds', 'duration'])),
        distance_m: numericValue(firstValue(event, ['distance_meters', 'distance_m', 'distance'])),
        avg_hr: numericValue(firstValue(event, ['avg_hr', 'average_heart_rate', 'average_heart_rate_bpm'])),
        max_hr: numericValue(firstValue(event, ['max_hr', 'max_heart_rate', 'max_heart_rate_bpm'])),
        calories: numericValue(firstValue(event, ['calories', 'calories_kcal', 'active_calories'])),
        raw: event,
        ingested_at: ingestedAt,
        updated_at: ingestedAt,
      }));
      if (rows.length) {
        const { error } = await admin.from('executed_sessions').upsert(rows, { onConflict: 'athlete_id,ow_event_id' });
        if (error) throw error;
      }
      const { error: importStampError } = await admin.from('wearable_links').update({ last_imported_at: ingestedAt }).eq('asciende_user_id', userId);
      if (importStampError) throw importStampError;
      const [{ count, error: countError }, { data: latest, error: latestError }] = await Promise.all([
        admin.from('executed_sessions').select('id', { count: 'exact', head: true }).eq('athlete_id', userId),
        admin.from('executed_sessions').select('ingested_at').eq('athlete_id', userId).order('ingested_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (countError) throw countError;
      if (latestError) throw latestError;
      return { linked: true, imported_count: rows.length, total_count: count || 0, last_import_at: ingestedAt || latest?.ingested_at || lastIngested?.ingested_at };
    };
    const logAccess = async (athleteId: string, section: string, start?: string | null, end?: string | null) => {
      if (athleteId === profile.id) return;
      const { error } = await admin.from('wearable_access_log').insert({ viewer_user_id: profile.id, athlete_user_id: athleteId, section, range_start: start || null, range_end: end || null });
      if (error) throw error;
    };
    const canReadAthlete = async (athleteId: string) => {
      if (profile.role === 'admin' || athleteId === profile.id) return true;
      if (!['trainer', 'head_coach'].includes(profile.role)) return false;
      const { data, error } = await admin.from('profiles').select('id').eq('id', athleteId).eq('assigned_trainer_id', profile.id).maybeSingle();
      if (error) throw error;
      return !!data;
    };
    const getPassport = async (athleteId: string) => {
      const { data, error } = await admin.from('biological_passports')
        .select('id, measurement_date, ftp_watts, critical_power, lt1_power, lt2_power, lt1_hr, lt2_hr, power_zones_json, hr_zones_json, training_zones')
        .eq('athlete_id', athleteId).eq('status', 'active').maybeSingle();
      if (error) throw error;
      const training = data?.training_zones && typeof data.training_zones === 'object' ? data.training_zones as Record<string, unknown> : {};
      const zones = (kind: 'hr' | 'power', count: 5 | 7) => {
        const keys = kind === 'hr' ? [`zones${count}_hr`, `hr_zones_${count}`, `hr_zones${count}`, `heart_rate_zones_${count}`] : [`zones${count}_power`, `power_zones_${count}`, `power_zones${count}`];
        for (const key of keys) { const found = normalizeZones(training[key]); if (found?.length === count) return found; }
        const nested = training[`zones${count}`];
        if (nested && typeof nested === 'object') {
          const obj = nested as Record<string, unknown>;
          const found = normalizeZones(obj[kind] ?? obj[kind === 'hr' ? 'heart_rate' : 'watts']);
          if (found?.length === count) return found;
        }
        const legacy = normalizeZones(kind === 'hr' ? data?.hr_zones_json : data?.power_zones_json);
        return legacy?.length === count ? legacy : null;
      };
      return { passport_id: data?.id || null, measurement_date: data?.measurement_date || null, ftp: numericValue(data?.ftp_watts), critical_power: numericValue(data?.critical_power), lt1_power: numericValue(data?.lt1_power), lt2_power: numericValue(data?.lt2_power), lt1_hr: numericValue(data?.lt1_hr), lt2_hr: numericValue(data?.lt2_hr), zones5: { hr: zones('hr', 5), power: zones('power', 5) }, zones7: { hr: zones('hr', 7), power: zones('power', 7) }, source: 'biological_passports.active' };
    };
    const resolveCompletions = async (athleteId: string, rangeStart?: string | null, rangeEnd?: string | null): Promise<Array<Record<string, any>>> => {
      let sessionsQuery = admin.from('executed_sessions').select('id, athlete_id, provider, sport_raw, sport_category, start_time, end_time, duration_seconds, distance_m, avg_hr, max_hr, calories').eq('athlete_id', athleteId);
      let gpsQuery = admin.from('external_activities').select('id, planned_workout_id, plan_week_id, plan_day_index, sport_type, name, start_time, duration_seconds, distance_meters, average_heartrate, calories, raw_data, user_notes, perceived_exertion').eq('user_id', athleteId).eq('source', 'asciende_gps');
      let manualQuery = admin.from('endurance_completed_workouts').select('id, planned_workout_id, plan_week_id, plan_day_index, scheduled_date, sport, workout_name, duration_seconds, time_in_zones, intervals, rpe, effort, source, wellness, notes, created_at').eq('athlete_id', athleteId);
      if (rangeStart) {
        sessionsQuery = sessionsQuery.gte('start_time', rangeStart);
        gpsQuery = gpsQuery.gte('start_time', rangeStart);
        manualQuery = manualQuery.gte('scheduled_date', rangeStart.slice(0, 10));
      }
      if (rangeEnd) {
        sessionsQuery = sessionsQuery.lte('start_time', rangeEnd);
        gpsQuery = gpsQuery.lte('start_time', rangeEnd);
        manualQuery = manualQuery.lte('scheduled_date', rangeEnd.slice(0, 10));
      }
      sessionsQuery = sessionsQuery.order('start_time', { ascending: false });
      gpsQuery = gpsQuery.order('start_time', { ascending: false });
      manualQuery = manualQuery.order('created_at', { ascending: false });
      const [sessionsResult, gpsResult, manualResult] = await Promise.all([sessionsQuery, gpsQuery, manualQuery]);
      if (sessionsResult.error) throw sessionsResult.error;
      if (gpsResult.error) throw gpsResult.error;
      if (manualResult.error) throw manualResult.error;
      const ids = (sessionsResult.data || []).map(row => row.id);
      const { data: matches, error: matchesError } = ids.length ? await admin.from('session_matches').select('executed_session_id, planned_workout_id, status').in('executed_session_id', ids) : { data: [], error: null };
      if (matchesError) throw matchesError;
      const matchBySession = new Map((matches || []).map(row => [row.executed_session_id, row]));
      const candidates = [
        ...(sessionsResult.data || []).map(row => { const match = matchBySession.get(row.id); return { source: 'watch' as const, id: row.id, planned_workout_id: match && ['auto_matched', 'manual_matched'].includes(match.status) ? match.planned_workout_id : null, priority_status: match?.status || null, start_time: row.start_time, duration_seconds: numericValue(row.duration_seconds), ...row }; }),
        ...(gpsResult.data || []).map(row => ({ source: 'gps' as const, id: row.id, planned_workout_id: row.planned_workout_id || (row.plan_week_id && row.plan_day_index !== null ? `endurance-plan-${row.plan_week_id}-${row.plan_day_index}` : null), start_time: row.start_time, duration_seconds: numericValue(row.duration_seconds), distance_m: numericValue(row.distance_meters), avg_hr: numericValue(row.average_heartrate), calories: numericValue(row.calories), sport: row.sport_type, name: row.name, notes: row.user_notes, rpe: numericValue(row.perceived_exertion), gps_activity_id: (row.raw_data as any)?.activity_id })),
        ...(manualResult.data || []).map(row => ({ source: 'manual' as const, id: row.id, planned_workout_id: row.planned_workout_id || (row.plan_week_id && row.plan_day_index !== null ? `endurance-plan-${row.plan_week_id}-${row.plan_day_index}` : null), start_time: row.scheduled_date ? `${row.scheduled_date}T12:00:00Z` : row.created_at, duration_seconds: numericValue(row.duration_seconds), sport: row.sport, name: row.workout_name, rpe: row.rpe, effort: row.effort, notes: row.notes || (row.wellness as any)?.notes || (row.wellness as any)?.feedback_notes || null, wellness: row.wellness, intervals: row.intervals, time_in_zones: row.time_in_zones, log_source: row.source })),
      ];
      const resolved = resolveEnduranceCompletions(candidates as any[]);
      return resolved.map(chosen => {
        const chosenRow = chosen as Record<string, any>;
        const manual = candidates.filter(row => row.source === 'manual' && chosen.planned_workout_id && row.planned_workout_id === chosen.planned_workout_id).sort((a, b) => String(b.start_time || '').localeCompare(String(a.start_time || '')))[0];
        return { ...chosenRow, athlete_feedback: manual ? { rpe: manual.rpe ?? null, comments: manual.notes ?? null, effort: manual.effort ?? null, wellness: manual.wellness ?? null, intervals: manual.intervals ?? null, time_in_zones: manual.time_in_zones ?? null, source: manual.log_source } : chosen.source === 'manual' ? { rpe: chosenRow.rpe ?? null, comments: chosenRow.notes ?? null, effort: chosenRow.effort ?? null, wellness: chosenRow.wellness ?? null, time_in_zones: chosenRow.time_in_zones ?? null } : null };
      });
    };
    const recomputeMetrics = async (athleteId: string, owUserId: string, sessionIds?: string[], force = false) => {
      let query = admin.from('executed_sessions').select('id, sport_category, start_time, end_time, duration_seconds').eq('athlete_id', athleteId).not('start_time', 'is', null).not('end_time', 'is', null);
      if (sessionIds?.length) query = query.in('id', sessionIds);
      const { data: sessions, error } = await query.order('start_time', { ascending: true }).limit(250);
      if (error) throw error;
      if (!sessions?.length) return { computed: 0 };
      let metricsQuery = admin.from('executed_session_metrics').select('executed_session_id').in('executed_session_id', sessions.map(row => row.id));
      const { data: existing, error: metricsError } = await metricsQuery;
      if (metricsError) throw metricsError;
      const computed = new Set((existing || []).map(row => row.executed_session_id));
      const pending = force ? sessions : sessions.filter(row => !computed.has(row.id));
      if (!pending.length) return { computed: 0, skipped: sessions.length };
      const spec = await getOpenApiSpec();
      const contract = timeseriesContract(spec);
      const passport = await getPassport(athleteId);
      const results = await runLimited(pending, 2, async (session) => {
        const duration = numericValue(session.duration_seconds) ?? (Date.parse(session.end_time) - Date.parse(session.start_time)) / 1000;
        const samples = await readTimeseries(owUserId, session.start_time, session.end_time, [contract.hrType, session.sport_category === 'cycling' ? contract.powerType : null].filter((value): value is string => !!value), contract);
        const hr = samples.filter(sample => /heart.?rate|^hr(?:_|$)/i.test(sample.type));
        const power = samples.filter(sample => sample.type.toLowerCase().includes('power') && !sample.type.toLowerCase().includes('heart'));
        const powerMetrics = session.sport_category === 'cycling' && power.length ? calculatePowerMetrics(power, duration, passport.ftp, passport.zones5.power || passport.zones7.power) : null;
        const zonePair = (series: TimedSample[], kind: 'hr' | 'power') => ({
          zones5: calculateZoneSeconds(series, passport.zones5[kind]),
          zones7: calculateZoneSeconds(series, passport.zones7[kind]),
        });
        const hrZones = hr.length ? zonePair(hr, 'hr') : { zones5: null, zones7: null };
        const powerZones = power.length && session.sport_category === 'cycling' ? zonePair(power, 'power') : { zones5: null, zones7: null };
        return {
          executed_session_id: session.id,
          has_hr: hr.length > 0,
          has_power: session.sport_category === 'cycling' && power.length > 0,
          sample_count: samples.length,
          coverage_pct: powerMetrics?.coverage_pct ?? null,
          avg_power: powerMetrics?.avg_power ?? null,
          max_power: powerMetrics?.max_power ?? null,
          normalized_power: powerMetrics?.normalized_power ?? null,
          variability_index: powerMetrics?.variability_index ?? null,
          intensity_factor: powerMetrics?.intensity_factor ?? null,
          tss: powerMetrics?.tss ?? null,
          power_zone_seconds: power.length ? powerZones : null,
          hr_zone_seconds: hr.length ? hrZones : null,
          ftp_used: passport.ftp,
          zones_used: { source: passport.source, ftp_watts: passport.ftp, critical_power: passport.critical_power, lt1_power: passport.lt1_power, lt2_power: passport.lt2_power, lt1_hr: passport.lt1_hr, lt2_hr: passport.lt2_hr, zones5: passport.zones5, zones7: passport.zones7 },
          computed_at: new Date().toISOString(),
        };
      });
      const rows = results.filter(item => !!item && !('error' in item)) as Array<Record<string, unknown>>;
      if (rows.length) {
        const { error: upsertError } = await admin.from('executed_session_metrics').upsert(rows, { onConflict: 'executed_session_id' });
        if (upsertError) throw upsertError;
      }
      return { computed: rows.length, failed: results.length - rows.length };
    };
    const refreshMatches = async (athleteId: string) => {
      const [{ data: athlete, error: athleteError }, { data: sessions, error: sessionError }, { data: existing, error: matchError }] = await Promise.all([
        admin.from('profiles').select('timezone').eq('id', athleteId).maybeSingle(),
        admin.from('executed_sessions').select('id, athlete_id, start_time, duration_seconds, sport_raw').eq('athlete_id', athleteId).not('start_time', 'is', null).order('start_time').limit(500),
        admin.from('session_matches').select('executed_session_id, planned_workout_id, status').in('executed_session_id', (await admin.from('executed_sessions').select('id').eq('athlete_id', athleteId).limit(500)).data?.map(row => row.id) || []),
      ]);
      if (athleteError) throw athleteError; if (sessionError) throw sessionError; if (matchError) throw matchError;
      if (!sessions?.length) return { matched: 0 };
      const localDays = sessions.map(row => localDate(row.start_time!, athlete?.timezone || 'UTC')).sort();
      const from = new Date(`${localDays[0]}T00:00:00Z`); from.setUTCDate(from.getUTCDate() - 1);
      const to = new Date(`${localDays[localDays.length - 1]}T00:00:00Z`); to.setUTCDate(to.getUTCDate() + 2);
      const { data: plans, error: planError } = await admin.from('external_endurance_workouts').select('id, athlete_id, scheduled_date, scheduled_time, estimated_duration_minutes, sport, sub_discipline').eq('athlete_id', athleteId).gte('scheduled_date', from.toISOString().slice(0, 10)).lt('scheduled_date', to.toISOString().slice(0, 10));
      if (planError) throw planError;
      const protectedRows = (existing || []).filter(row => ['manual_matched', 'dismissed'].includes(row.status));
      const decisions = buildMatchDecisions(sessions as any, plans || [], protectedRows as any, athlete?.timezone || 'UTC');
      const mutableIds = (existing || []).filter(row => !['manual_matched', 'dismissed'].includes(row.status)).map(row => row.executed_session_id);
      if (mutableIds.length) { const { error: deleteError } = await admin.from('session_matches').delete().in('executed_session_id', mutableIds); if (deleteError) throw deleteError; }
      if (decisions.length) {
        const { error: upsertError } = await admin.from('session_matches').upsert(decisions.map(row => ({ ...row, matched_by: null, updated_at: new Date().toISOString() })), { onConflict: 'executed_session_id' });
        if (upsertError) throw upsertError;
      }
      return { matched: decisions.length };
    };
    const scheduleAnalysis = (athleteId: string, owUserId: string) => {
      const work = Promise.allSettled([refreshMatches(athleteId), recomputeMetrics(athleteId, owUserId)]);
      const edgeRuntime = (globalThis as any).EdgeRuntime;
      if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(work);
    };
    if (action === 'consent') {
      const { error } = await admin.from('wearable_links').upsert({ asciende_user_id: profile.id, ow_user_id: (await ensureUser()).ow_user_id, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION }, { onConflict: 'asciende_user_id' });
      if (error) throw error;
      return response({ consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION });
    }
    if (action === 'ensure-user') return response({ link: await ensureUser() });
    if (action === 'providers') return response(await ow('/oauth/providers'));
    if (action === 'connect-start') {
      if (typeof body.provider !== 'string' || !body.provider) return response({ error: 'provider is required' }, 400);
      const link = await requireConsent();
      const redirectOrigin = 'https://hub.asciende.pro';
      const redirect = new URL('/settings', redirectOrigin);
      redirect.searchParams.set('section', 'wearables');
      redirect.searchParams.set('wearable', 'success');
      const query = new URLSearchParams({ user_id: link.ow_user_id, redirect_uri: redirect.toString() });
      const authorization = await ow(`/oauth/${encodeURIComponent(body.provider)}/authorize?${query}`);
      const object = authorization as Record<string, unknown>;
      const authorization_url = object.authorization_url || object.url;
      if (!authorization_url) return response({ error: 'Authorization response has no URL', raw: authorization }, 502);
      return response({ authorization_url, raw: authorization });
    }
    if (action === 'connections') {
      const link = await getLink();
      if (!link) return response({ linked: false, connections: [], summary: null });
      const [connections, summaryResult] = await Promise.allSettled([
        ow(`/users/${link.ow_user_id}/connections`),
        ow(`/users/${link.ow_user_id}/data-summary`),
      ]);
      if (connections.status === 'rejected') throw connections.reason;
      const summary = summaryResult.status === 'fulfilled' ? normalizeDataTypes(summaryResult.value) : null;
      return response({ linked: true, connections: connections.value, data_types: summary, summary_error: summaryResult.status === 'rejected' ? errorBody(summaryResult.reason) : null });
    }
    if (action === 'disconnect') {
      // Disconnect is a privacy control and must remain available even when consent
      // has been withdrawn or the account was linked by an administrator.
      const link = await getLink();
      if (!link) return response({ error: 'No Open Wearables user is linked' }, 404);
      if (!body.provider) return response({ error: 'provider is required' }, 400);
      return response(await ow(`/users/${link.ow_user_id}/connections/${encodeURIComponent(body.provider)}`, { method: 'DELETE' }));
    }
    if (action === 'ow-ingest-workouts') {
      const link = await requireConsent();
      const imported = await ingestWorkouts();
      scheduleAnalysis(profile.id, link.ow_user_id);
      return response(imported);
    }
    if (action === 'ow-ingest-if-stale') {
      const link = await getLink();
      if (!link) return response({ linked: false, skipped: true, total_count: 0, last_import_at: null });
      const latest = link.last_imported_at;
      if (latest && Date.now() - new Date(latest).getTime() < 15 * 60 * 1000) {
        const { count, error: countError } = await admin.from('executed_sessions').select('id', { count: 'exact', head: true }).eq('athlete_id', profile.id);
        if (countError) throw countError;
        return response({ skipped: true, total_count: count || 0, last_import_at: latest });
      }
      const consentedLink = await requireConsent();
      const imported = await ingestWorkouts();
      scheduleAnalysis(profile.id, consentedLink.ow_user_id);
      return response({ ...imported, skipped: false });
    }
    if (action === 'ow-sync-now') {
      const link = await requireConsent();
      if (!link) return response({ error: 'No Open Wearables user is linked' }, 404);
      const now = new Date();
      const cutoff = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      const { data: claimed, error: claimError } = await admin.from('wearable_links').update({ last_sync_requested_at: now.toISOString() }).eq('asciende_user_id', profile.id).or(`last_sync_requested_at.is.null,last_sync_requested_at.lt.${cutoff}`).select('last_sync_requested_at').maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) {
        const { data: current, error } = await admin.from('wearable_links').select('last_sync_requested_at').eq('asciende_user_id', profile.id).maybeSingle();
        if (error) throw error;
        const remaining = Math.max(1, Math.ceil((5 * 60 * 1000 - (Date.now() - new Date(current?.last_sync_requested_at || now).getTime())) / 60000));
        return response({ error: `Please wait ${remaining} minute${remaining === 1 ? '' : 's'} before syncing again.`, retry_after_minutes: remaining }, 429);
      }
      const rawConnections = await ow(`/users/${encodeURIComponent(link.ow_user_id)}/connections`);
      const connections = Array.isArray(rawConnections) ? rawConnections : ((rawConnections as Record<string, unknown>)?.items as unknown[] || (rawConnections as Record<string, unknown>)?.connections as unknown[] || []);
      const active = (connections as Array<Record<string, unknown>>).filter(connection => ['active', 'connected'].includes(String(connection.status || '').toLowerCase()) && typeof connection.provider === 'string');
      if (!active.length) {
        const imported = await ingestWorkouts();
        scheduleAnalysis(profile.id, link.ow_user_id);
        return response({ synced_providers: [], ...imported });
      }
      const syncResults = await Promise.allSettled(active.map(async connection => {
        const provider = String(connection.provider);
        const route = await fetchSyncRoute(provider, link.ow_user_id);
        await ow(route, { method: 'POST' });
        return provider;
      }));
      const outcomes = syncResults.filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled').map(result => result.value);
      const syncErrors = syncResults.filter((result): result is PromiseRejectedResult => result.status === 'rejected').map(result => errorBody(result.reason));
      const imported = await ingestWorkouts();
      scheduleAnalysis(profile.id, link.ow_user_id);
      return response({ synced_providers: outcomes, sync_errors: syncErrors, ...imported });
    }
    if (action === 'profile-timezone') return response({ timezone: profile.timezone || 'UTC' });
    if (action === 'update-timezone') {
      if (typeof body.timezone !== 'string') return response({ error: 'timezone is required' }, 400);
      try { new Intl.DateTimeFormat('en', { timeZone: body.timezone }); } catch { return response({ error: 'Invalid timezone' }, 400); }
      const { error } = await admin.from('profiles').update({ timezone: body.timezone }).eq('id', profile.id);
      if (error) throw error;
      return response({ timezone: body.timezone });
    }
    if (action === 'get-session-analysis') {
      const plannedId = typeof body.planned_workout_id === 'string' ? body.planned_workout_id : null;
      const sessionId = typeof body.executed_session_id === 'string' ? body.executed_session_id : null;
      if (!plannedId && !sessionId) return response({ error: 'planned_workout_id or executed_session_id is required' }, 400);
      const weeklyPlanMatch = plannedId?.match(/^endurance-plan-([0-9a-f-]{36})-(\d+)$/i) || null;
      let weeklyPlanRow: Record<string, any> | null = null;
      let weeklyPlanDay: Record<string, any> | null = null;
      let planIdentity: { id: string; athlete_id: string } | null = null;
      if (plannedId && weeklyPlanMatch) {
        const { data, error } = await admin.from('external_endurance_plans').select('id, athlete_id, plan_data').eq('id', weeklyPlanMatch[1]).maybeSingle();
        if (error) throw error;
        const day = (data?.plan_data as any)?.days?.[Number(weeklyPlanMatch[2])];
        if (data && day) { weeklyPlanRow = data as any; weeklyPlanDay = day; planIdentity = { id: plannedId, athlete_id: data.athlete_id }; }
      } else if (plannedId) {
        const { data, error } = await admin.from('external_endurance_workouts').select('id, athlete_id').eq('id', plannedId).maybeSingle();
        if (error) throw error;
        planIdentity = data;
      }
      const { data: sessionIdentity, error: sessionError } = sessionId ? await admin.from('executed_sessions').select('id, athlete_id').eq('id', sessionId).maybeSingle() : { data: null, error: null };
      if (sessionError) throw sessionError;
      if (plannedId && !planIdentity) return response({ error: 'Planned workout not found' }, 404);
      if (sessionId && !sessionIdentity) return response({ error: 'Executed session not found' }, 404);
      const athleteId = planIdentity?.athlete_id || sessionIdentity?.athlete_id;
      if (planIdentity && sessionIdentity && planIdentity.athlete_id !== sessionIdentity.athlete_id) return response({ error: 'Session and plan belong to different athletes' }, 400);
      if (!await canReadAthlete(athleteId)) return response({ error: 'Athlete access denied' }, 403);
      await logAccess(athleteId, 'session_analysis');
      const link = await getLink(athleteId);
      if (!link?.consent_at || !link.consent_version) return response({ error: 'Registered consent is required' }, 403);
      let plan: Record<string, any> | null = null;
      if (weeklyPlanDay && weeklyPlanRow) plan = { id: plannedId, athlete_id: athleteId, scheduled_date: String(weeklyPlanDay.date || '').slice(0, 10), scheduled_time: weeklyPlanDay.time || null, estimated_duration_minutes: numericValue(weeklyPlanDay.planned_duration_minutes ?? weeklyPlanDay.duration_min), sport: weeklyPlanDay.sport || null, sub_discipline: weeklyPlanDay.sub_discipline || null, steps: Array.isArray(weeklyPlanDay.steps) ? weeklyPlanDay.steps : [], intensity_basis: weeklyPlanDay.intensity_basis || null };
      else if (plannedId) {
        const { data, error } = await admin.from('external_endurance_workouts').select('id, athlete_id, scheduled_date, scheduled_time, estimated_duration_minutes, sport, sub_discipline, steps, intensity_basis').eq('id', plannedId).maybeSingle();
        if (error) throw error;
        plan = data;
      }
      const { data: session, error: fullSessionError } = sessionId ? await admin.from('executed_sessions').select('id, athlete_id, provider, sport_raw, sport_category, start_time, end_time, duration_seconds, distance_m, avg_hr, max_hr, calories').eq('id', sessionId).maybeSingle() : { data: null, error: null };
      if (fullSessionError) throw fullSessionError;
      const reviewQuery = weeklyPlanMatch
        ? Promise.resolve({ data: [], error: null })
        : (plannedId
          ? admin.from('session_reviews').select('id, status, comment, reviewer_id, visible_to_athlete, created_at').eq('athlete_id', athleteId).eq('visible_to_athlete', true).eq('planned_workout_id', plannedId).order('created_at', { ascending: false }).limit(1)
          : admin.from('session_reviews').select('id, status, comment, reviewer_id, visible_to_athlete, created_at').eq('athlete_id', athleteId).eq('visible_to_athlete', true).eq('executed_session_id', sessionId!).order('created_at', { ascending: false }).limit(1));
      const planRangeStart = plan?.scheduled_date ? new Date(`${plan.scheduled_date}T00:00:00Z`) : null;
      const planRangeEnd = plan?.scheduled_date ? new Date(`${plan.scheduled_date}T00:00:00Z`) : null;
      if (planRangeStart) planRangeStart.setUTCDate(planRangeStart.getUTCDate() - 1);
      if (planRangeEnd) planRangeEnd.setUTCDate(planRangeEnd.getUTCDate() + 1);
      const [resolved, passport, reviewResult] = await Promise.all([
        resolveCompletions(athleteId, session?.start_time || planRangeStart?.toISOString(), session?.end_time || planRangeEnd?.toISOString()),
        getPassport(athleteId),
        reviewQuery,
      ]);
      if (reviewResult.error) throw reviewResult.error;
      const completion = resolved.find(row => (plannedId && row.planned_workout_id === plannedId) || (sessionId && row.source === 'watch' && row.id === sessionId) || (sessionId && row.id === sessionId)) || null;
      const metricsSessionId = sessionId || (completion?.source === 'watch' ? completion.id : null);
      const metricsResult = metricsSessionId ? await admin.from('executed_session_metrics').select('has_hr, has_power, sample_count, coverage_pct, avg_power, max_power, normalized_power, variability_index, intensity_factor, tss, power_zone_seconds, hr_zone_seconds, zones_used, computed_at').eq('executed_session_id', metricsSessionId).maybeSingle() : { data: null, error: null };
      if (metricsResult.error) throw metricsResult.error;
      let gps = completion?.source === 'gps';
      let altitude = false;
      if (completion?.source === 'gps' && completion.gps_activity_id) {
        const { data: points, error } = await admin.from('activity_gps_points').select('altitude_m').eq('activity_id', completion.gps_activity_id).limit(2000);
        if (error) throw error;
        gps = !!points?.length;
        altitude = !!points?.some(point => point.altitude_m !== null);
      }
      const metrics = metricsResult.data;
      const diagnostics = ['GPS, altitude, cadence and lap availability are not verified for this watch session; capabilities remain false unless local GPS track data exists.'];
      if (completion?.source === 'watch' && metrics?.has_hr == null) diagnostics.push('Heart-rate series availability has not been verified for this session.');
      const safeCompletion = completion ? { source: completion.source, id: completion.id, planned_workout_id: completion.planned_workout_id || null, start_time: completion.start_time || null, duration_seconds: completion.duration_seconds ?? null, distance_m: completion.distance_m ?? null, avg_hr: completion.avg_hr ?? null, max_hr: completion.max_hr ?? null, calories: completion.calories ?? null, sport: completion.sport || completion.sport_raw || null, name: completion.name || null, athlete_feedback: completion.athlete_feedback ? { rpe: completion.athlete_feedback.rpe ?? null, comments: completion.athlete_feedback.comments ?? null, effort: completion.athlete_feedback.effort ?? null, intervals: completion.athlete_feedback.intervals ?? null, time_in_zones: completion.athlete_feedback.time_in_zones ?? null } : null } : null;
      return response({ planned: plan ? { id: plan.id, scheduled_date: plan.scheduled_date, scheduled_time: plan.scheduled_time, duration_minutes: plan.estimated_duration_minutes, sport: plan.sport, sub_discipline: plan.sub_discipline, steps: plan.steps, intensity_basis: plan.intensity_basis } : null, planned_zone_time: plan ? { zones5: plannedZoneSeconds(plan, passport.zones5.hr, passport.zones5.power), zones7: plannedZoneSeconds(plan, passport.zones7.hr, passport.zones7.power) } : null, completion: safeCompletion, metrics: metrics || null, zones_used: metrics?.zones_used || null, biological_passport_date: passport.measurement_date, capabilities: { hr: !!metrics?.has_hr || !!completion?.avg_hr, power: !!metrics?.has_power, gps, altitude, cadence: false, laps: false }, coach_comment: reviewResult.data?.[0] ? { comment: reviewResult.data[0].comment, created_at: reviewResult.data[0].created_at } : null, diagnostics });
    }
    if (action === 'get-session-timeseries') {
      let sessionId = typeof body.executed_session_id === 'string' && body.executed_session_id !== 'none' ? body.executed_session_id : '';
      const plannedId = typeof body.planned_workout_id === 'string' ? body.planned_workout_id : null;
      if (!sessionId && plannedId) {
        const weeklyMatch = plannedId.match(/^endurance-plan-([0-9a-f-]{36})-(\d+)$/i);
        let planAthleteId: string | null = null;
        let scheduledDate: string | null = null;
        if (weeklyMatch) {
          const { data: week, error } = await admin.from('external_endurance_plans').select('athlete_id, plan_data').eq('id', weeklyMatch[1]).maybeSingle();
          if (error) throw error;
          const day = (week?.plan_data as any)?.days?.[Number(weeklyMatch[2])];
          if (week && day?.date) { planAthleteId = week.athlete_id; scheduledDate = String(day.date).slice(0, 10); }
        } else {
          const { data: plan, error } = await admin.from('external_endurance_workouts').select('athlete_id, scheduled_date').eq('id', plannedId).maybeSingle();
          if (error) throw error;
          if (plan) { planAthleteId = plan.athlete_id; scheduledDate = plan.scheduled_date; }
        }
        if (!planAthleteId || !scheduledDate) return response({ error: 'Planned workout not found' }, 404);
        if (!await canReadAthlete(planAthleteId)) return response({ error: 'Athlete access denied' }, 403);
        await logAccess(planAthleteId, 'session_timeseries');
        const link = await getLink(planAthleteId);
        if (!link?.consent_at || !link.consent_version) return response({ error: 'Registered consent is required' }, 403);
        const rangeStart = new Date(`${scheduledDate}T00:00:00Z`); rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
        const rangeEnd = new Date(`${scheduledDate}T00:00:00Z`); rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);
        const resolved = await resolveCompletions(planAthleteId, rangeStart.toISOString(), rangeEnd.toISOString());
        const completion = resolved.find(row => row.planned_workout_id === plannedId);
        if (completion?.source === 'gps' && typeof completion.gps_activity_id === 'string') {
          const { data: points, error } = await admin.from('activity_gps_points').select('latitude, longitude, altitude_m, timestamp, sequence_order').eq('activity_id', completion.gps_activity_id).order('sequence_order', { ascending: true }).limit(50000);
          if (error) throw error;
          const all = points || [];
          const route = all.length <= 2000 ? all : Array.from({ length: 2000 }, (_, i) => all[Math.floor(i * (all.length - 1) / 1999)]);
          const altitude = all.some(point => point.altitude_m !== null);
          const seriesDerived = calculateDerivedAnalysis([], [], Number(completion.duration_seconds) || 0);
          return response({ executed_session_id: null, source: 'gps', window: { start_time: completion.start_time, duration_seconds: completion.duration_seconds }, series: {}, route: route.map(point => ({ latitude: point.latitude, longitude: point.longitude, altitude_m: point.altitude_m, timestamp: point.timestamp })), coverage: { gps_point_count: all.length }, derived: seriesDerived, capabilities: { gps: all.length > 0, altitude }, diagnostics: ['GPS route is read from Asciende GPS points. Heart-rate and power series are not stored in this source.'] });
        }
        if (completion?.source === 'watch') sessionId = completion.id;
        else return response({ executed_session_id: null, source: completion?.source || null, window: null, series: {}, route: null, derived: calculateDerivedAnalysis([], [], Number(completion?.duration_seconds) || 0), capabilities: { gps: false, altitude: false }, diagnostics: ['No time-series source is stored for this manual completion.'] });
      }
      if (!sessionId) return response({ error: 'executed_session_id or planned_workout_id is required' }, 400);
      const { data: sessionIdentity, error: identityError } = await admin.from('executed_sessions').select('athlete_id').eq('id', sessionId).maybeSingle();
      if (identityError) throw identityError;
      if (!sessionIdentity) return response({ error: 'Executed session not found' }, 404);
      if (!await canReadAthlete(sessionIdentity.athlete_id)) return response({ error: 'Athlete access denied' }, 403);
      await logAccess(sessionIdentity.athlete_id, 'session_timeseries');
      const link = await getLink(sessionIdentity.athlete_id);
      if (!link?.consent_at || !link.consent_version) return response({ error: 'Registered consent is required' }, 403);
      const [{ data: session, error }, { data: match, error: matchError }] = await Promise.all([
        admin.from('executed_sessions').select('id, athlete_id, start_time, end_time, duration_seconds').eq('id', sessionId).maybeSingle(),
        admin.from('session_matches').select('status').eq('executed_session_id', sessionId).maybeSingle(),
      ]);
      if (error) throw error; if (matchError) throw matchError;
      if (!session) return response({ error: 'Executed session not found' }, 404);
      if (!session.start_time || !session.end_time) return response({ error: 'Session start_time and end_time are required' }, 422);
      const requested = Array.isArray(body.types) ? body.types : [];
      if (!requested.length || requested.some((type: unknown) => typeof type !== 'string')) return response({ error: 'types must be a non-empty array of Open Wearables series type strings' }, 400);
      const spec = await getOpenApiSpec(); const contract = timeseriesContract(spec);
      const invalid = requested.filter((type: string) => !contract.allowedTypes.includes(type));
      if (invalid.length) return response({ error: 'Requested series type is not allowed by the instance OpenAPI', invalid_types: invalid, allowed_types: contract.allowedTypes }, 400);
      const samples = await readTimeseries(link.ow_user_id, session.start_time, session.end_time, requested, contract);
      const hr = samples.filter(sample => /heart.?rate|^hr(?:_|$)/i.test(sample.type));
      const power = samples.filter(sample => /power/i.test(sample.type) && !/heart/i.test(sample.type));
      const pace = samples.filter(sample => /pace|speed|velocity/i.test(sample.type));
      const duration = numericValue(session.duration_seconds) || (Date.parse(session.end_time) - Date.parse(session.start_time)) / 1000;
      const derived = calculateDerivedAnalysis(hr, power, duration, { paceSamples: pace, continuous: true });
      const reduce = (rows: TimedSample[]) => {
        if (rows.length <= 2000) return rows;
        const sortedRows = [...rows].sort((a, b) => a.timestamp - b.timestamp);
        const binSize = sortedRows.length / 2000;
        return Array.from({ length: 2000 }, (_, index) => {
          const bin = sortedRows.slice(Math.floor(index * binSize), Math.floor((index + 1) * binSize));
          const point = { timestamp: bin.reduce((sum, row) => sum + row.timestamp, 0) / bin.length, value: bin.reduce((sum, row) => sum + row.value, 0) / bin.length, type: bin[0]?.type };
          return /power/i.test(bin[0]?.type || '') ? { ...point, peak_value: Math.max(...bin.map(row => row.value)) } : point;
        }).filter(Boolean);
      };
      return response({ executed_session_id: sessionId, window: { start_time: session.start_time, end_time: session.end_time }, series: Object.fromEntries([...new Set(samples.map(row => row.type))].map(type => [type, reduce(samples.filter(row => row.type === type))])), route: null, derived, diagnostics: ['Route geometry and altitude from Open Wearables are not verified by its published timeseries contract in this response; request native GPS only when capabilities confirms availability.', ...(match?.status ? [] : ['This watch session has no planned-session match.'])] });
    }
    if (action === 'list-review-inbox') {
      if (!['trainer', 'head_coach', 'admin'].includes(profile.role)) return response({ error: 'Coach or admin role is required' }, 403);
      let athletesQuery = admin.from('profiles').select('id, full_name, assigned_trainer_id');
      if (profile.role !== 'admin') athletesQuery = athletesQuery.eq('assigned_trainer_id', profile.id);
      const { data: athletes, error: athletesError } = await athletesQuery.limit(500);
      if (athletesError) throw athletesError;
      const inbox: Array<Record<string, unknown>> = [];
      for (const athlete of athletes || []) {
        await logAccess(athlete.id, 'review_inbox');
        const link = await getLink(athlete.id);
        if (!link?.consent_at || !link.consent_version) continue;
        const { data: latestReview, error: reviewError } = await admin.from('session_reviews').select('created_at').eq('athlete_id', athlete.id).eq('reviewer_id', profile.id).eq('status', 'reviewed').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (reviewError) throw reviewError;
        const { data: sessions, error: sessionsError } = await admin.from('executed_sessions').select('id, start_time, duration_seconds, sport_raw').eq('athlete_id', athlete.id).gt('start_time', latestReview?.created_at || '1970-01-01T00:00:00Z').order('start_time', { ascending: false }).limit(200);
        if (sessionsError) throw sessionsError;
        const start = latestReview?.created_at || sessions?.at(-1)?.start_time || null;
        await logAccess(athlete.id, 'metrics', start, null);
        const completions = await resolveCompletions(athlete.id, start, null);
        const passport = await getPassport(athlete.id);
        for (const item of completions) {
          const plannedId = typeof item.planned_workout_id === 'string' ? item.planned_workout_id : null;
          let planned: Record<string, unknown> | null = null;
          let compliance: number | null = null;
          let zoneDeviation: number | null = null;
          if (plannedId) {
            const { data, error } = await admin.from('external_endurance_workouts').select('id, sport, estimated_duration_minutes, steps, intensity_basis').eq('id', plannedId).maybeSingle();
            if (error) throw error;
            planned = data;
            if (data?.estimated_duration_minutes && item.duration_seconds != null) compliance = Number(item.duration_seconds) / (Number(data.estimated_duration_minutes) * 60) * 100;
            if (data) {
              const target = plannedZoneSeconds(data, passport.zones5.hr, passport.zones5.power);
              let actual: Record<string, number> | null = null;
              if (item.source === 'watch') {
                const { data: metric, error: metricError } = await admin.from('executed_session_metrics').select('hr_zone_seconds, power_zone_seconds').eq('executed_session_id', item.id).maybeSingle();
                if (metricError) throw metricError;
                const basis = String(data.intensity_basis || '').toLowerCase();
                const zones = basis === 'power' ? metric?.power_zone_seconds : metric?.hr_zone_seconds;
                const set = zones && typeof zones === 'object' ? (zones as any).zones5 : null;
                actual = set && typeof set === 'object' ? set : null;
              } else {
                const set = item.athlete_feedback?.time_in_zones;
                actual = set && typeof set === 'object' ? set as Record<string, number> : null;
              }
              const expected = target.seconds;
              if (expected && actual) {
                const normalize = (key: string) => key.startsWith('zone_') ? key : `zone_${key.replace(/^z/i, '').replace(/_seconds$/, '')}_seconds`;
                const expectedEntries = Object.entries(expected);
                const totalTarget = expectedEntries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
                const actualNormalized = Object.fromEntries(Object.entries(actual).map(([key, value]) => [normalize(key), value]));
                const difference = expectedEntries.reduce((sum, [key, value]) => sum + Math.abs(Number(value || 0) - Number(actual?.[key] ?? actualNormalized[normalize(key)] ?? 0)), 0);
                if (totalTarget > 0) zoneDeviation = difference / totalTarget * 100;
              }
            }
          }
          const deviationRank = compliance !== null && compliance < 80 ? 0 : !plannedId ? 1 : zoneDeviation !== null && zoneDeviation > 25 ? 2 : compliance !== null && compliance > 120 ? 3 : 4;
          inbox.push({ athlete_id: athlete.id, athlete_name: athlete.full_name, completion: item, planned, compliance_pct: compliance, time_in_zone_deviation_pct: zoneDeviation, deviation_rank: deviationRank, review_since: latestReview?.created_at || null });
        }
      }
      inbox.sort((a, b) => Number(a.deviation_rank) - Number(b.deviation_rank) || String((b.completion as any).start_time || '').localeCompare(String((a.completion as any).start_time || '')));
      return response({ items: inbox });
    }
    if (action === 'save-review') {
      if (!['trainer', 'head_coach', 'admin'].includes(profile.role)) return response({ error: 'Coach or admin role is required' }, 403);
      const athleteId = typeof body.athlete_id === 'string' ? body.athlete_id : '';
      const plannedId = typeof body.planned_workout_id === 'string' ? body.planned_workout_id : null;
      const sessionId = typeof body.executed_session_id === 'string' ? body.executed_session_id : null;
      const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
      if (!athleteId || (!plannedId && !sessionId) || !comment) return response({ error: 'athlete_id, planned_workout_id or executed_session_id, and comment are required' }, 400);
      if (!await canReadAthlete(athleteId)) return response({ error: 'Athlete access denied' }, 403);
      await logAccess(athleteId, 'save_review');
      const link = await getLink(athleteId);
      if (!link?.consent_at || !link.consent_version) return response({ error: 'Registered consent is required' }, 403);
      if (plannedId) {
        const { data, error } = await admin.from('external_endurance_workouts').select('id').eq('id', plannedId).eq('athlete_id', athleteId).maybeSingle();
        if (error) throw error; if (!data) return response({ error: 'Planned workout does not belong to athlete' }, 403);
      }
      if (sessionId) {
        const { data, error } = await admin.from('executed_sessions').select('id').eq('id', sessionId).eq('athlete_id', athleteId).maybeSingle();
        if (error) throw error; if (!data) return response({ error: 'Executed session does not belong to athlete' }, 403);
      }
      const status = body.status === 'pending' ? 'pending' : 'reviewed';
      const { data, error } = await admin.from('session_reviews').insert({ athlete_id: athleteId, planned_workout_id: plannedId, executed_session_id: sessionId, reviewer_id: profile.id, status, comment, visible_to_athlete: body.visible_to_athlete !== false }).select().single();
      if (error) throw error;
      return response({ review: data });
    }
    if (action === 'analysis-calendar') {
      const athleteId = typeof body.athlete_id === 'string' ? body.athlete_id : profile.id;
      if (!await canReadAthlete(athleteId)) return response({ error: 'Athlete access denied' }, 403);
      await logAccess(athleteId, 'analysis_calendar');
      const link = await getLink(athleteId);
      if (!link?.consent_at || !link.consent_version) return response({ linked: false, sessions: [], matches: [], metrics: [] });
      const [connectionsResult, latestImportResult] = await Promise.allSettled([
        ow(`/users/${encodeURIComponent(link.ow_user_id)}/connections`),
        admin.from('wearable_links').select('last_imported_at').eq('asciende_user_id', athleteId).maybeSingle(),
      ]);
      if (latestImportResult.status === 'rejected') throw latestImportResult.reason;
      if (latestImportResult.value.error) throw latestImportResult.value.error;
      const latestImport = latestImportResult.value;
      const connections = connectionsResult.status === 'fulfilled' ? connectionsResult.value : [];
      const connRows = Array.isArray(connections) ? connections : (connections as any)?.items || (connections as any)?.connections || [];
      const active = connRows.some((row: any) => ['active', 'connected'].includes(String(row.status || '').toLowerCase()));
      const start = typeof body.range_start === 'string' ? body.range_start : null;
      const end = typeof body.range_end === 'string' ? body.range_end : null;
      await logAccess(athleteId, 'executed_sessions', start, end);
      let sessionQuery = admin.from('executed_sessions').select('id, athlete_id, ow_event_id, provider, sport_raw, sport_category, start_time, end_time, duration_seconds, distance_m, avg_hr, max_hr, calories').eq('athlete_id', athleteId).order('start_time', { ascending: false }).limit(500);
      if (start) sessionQuery = sessionQuery.gte('start_time', start);
      if (end) sessionQuery = sessionQuery.lte('start_time', end);
      const { data: sessions, error: sessionsError } = await sessionQuery;
      if (sessionsError) throw sessionsError;
      const ids = (sessions || []).map(row => row.id);
      await logAccess(athleteId, 'metrics', start, end);
      await logAccess(athleteId, 'gps_activities', start, end);
      await logAccess(athleteId, 'manual_endurance_logs', start, end);
      const [{ data: matches, error: matchesError }, { data: metrics, error: metricsError }] = await Promise.all([
        ids.length ? admin.from('session_matches').select('*').in('executed_session_id', ids) : Promise.resolve({ data: [], error: null }),
        ids.length ? admin.from('executed_session_metrics').select('id, executed_session_id, has_hr, has_power, sample_count, coverage_pct, avg_power, max_power, normalized_power, variability_index, intensity_factor, tss, power_zone_seconds, hr_zone_seconds, computed_at').in('executed_session_id', ids) : Promise.resolve({ data: [], error: null }),
      ]);
      if (matchesError) throw matchesError; if (metricsError) throw metricsError;
      const planIds = [...new Set((matches || []).map(row => row.planned_workout_id).filter((id): id is string => !!id))];
      const { data: plans, error: plansError } = planIds.length ? await admin.from('external_endurance_workouts').select('id, intensity_basis, steps').in('id', planIds) : { data: [], error: null };
      if (plansError) throw plansError;
      const passport = await getPassport(athleteId);
      const planById = new Map((plans || []).map(plan => [plan.id, plan]));
      const enrichedMatches = (matches || []).map(match => {
        const plan = match.planned_workout_id ? planById.get(match.planned_workout_id) : null;
        return { ...match, planned_comparison: plan && passport ? {
          zones5: plannedZoneSeconds(plan, passport.zones5.hr, passport.zones5.power),
          zones7: plannedZoneSeconds(plan, passport.zones7.hr, passport.zones7.power),
        } : null };
      });
      const completions = await resolveCompletions(athleteId, start, end);
      return response({ linked: true, active: true, provider_active: active, provider_connection_error: connectionsResult.status === 'rejected' ? errorBody(connectionsResult.reason) : null, timezone: profile.timezone || 'UTC', biological_passport_date: passport.measurement_date, sessions: (sessions || []).map(row => ({ ...row, local_date: row.start_time ? localDate(row.start_time, profile.timezone || 'UTC') : null })), matches: enrichedMatches, metrics: metrics || [], completions, last_imported_at: latestImport.data?.last_imported_at || null });
    }
    if (action === 'analysis-match-now') {
      const athleteId = typeof body.athlete_id === 'string' ? body.athlete_id : profile.id;
      if (!await canReadAthlete(athleteId)) return response({ error: 'Athlete access denied' }, 403);
      const link = await getLink(athleteId);
      if (!link?.consent_at || !link.consent_version) return response({ error: 'Active consent required' }, 409);
      await logAccess(athleteId, 'executed_sessions');
      return response(await refreshMatches(athleteId));
    }
    if (action === 'analysis-update-match') {
      const sessionId = String(body.executed_session_id || '');
      const { data: session, error: sessionError } = await admin.from('executed_sessions').select('id, athlete_id, sport_raw').eq('id', sessionId).maybeSingle();
      if (sessionError) throw sessionError;
      if (!session) return response({ error: 'Executed session not found' }, 404);
      if (!await canReadAthlete(session.athlete_id)) return response({ error: 'Athlete access denied' }, 403);
      await logAccess(session.athlete_id, 'executed_sessions');
      const status = body.status;
      if (!['manual_matched', 'dismissed', 'unplanned'].includes(status)) return response({ error: 'Invalid match status' }, 400);
      const plannedId = typeof body.planned_workout_id === 'string' ? body.planned_workout_id : null;
      if (status === 'manual_matched') {
        if (!plannedId) return response({ error: 'planned_workout_id is required' }, 400);
        const { data: plan, error } = await admin.from('external_endurance_workouts').select('id, athlete_id, sport, sub_discipline').eq('id', plannedId).maybeSingle();
        if (error) throw error;
        if (!plan || plan.athlete_id !== session.athlete_id) return response({ error: 'Planned workout does not belong to this athlete' }, 400);
        const actualSport = normalizeSport(session.sport_raw);
        if (actualSport === 'other' || actualSport !== normalizeSport(plan.sport, plan.sub_discipline)) return response({ error: 'The workout sports are not compatible' }, 400);
        const { data: conflict, error: conflictError } = await admin.from('session_matches').select('executed_session_id, status').eq('planned_workout_id', plannedId).neq('executed_session_id', sessionId).maybeSingle();
        if (conflictError) throw conflictError;
        if (conflict?.status === 'manual_matched') return response({ error: 'This planned workout is already linked manually to another session' }, 409);
        if (conflict) {
          const { error: releaseError } = await admin.from('session_matches').update({ planned_workout_id: null, status: 'unplanned', score: null, matched_by: null, updated_at: new Date().toISOString() }).eq('executed_session_id', conflict.executed_session_id);
          if (releaseError) throw releaseError;
        }
      }
      const { data, error } = await admin.from('session_matches').upsert({ executed_session_id: sessionId, planned_workout_id: status === 'manual_matched' ? plannedId : null, status, score: null, matched_by: profile.id, updated_at: new Date().toISOString() }, { onConflict: 'executed_session_id' }).select().single();
      if (error) throw error;
      return response({ match: data });
    }
    if (action === 'admin-read-imports') {
      requireAdmin();
      const athleteId = String(body.athlete_id || '');
      if (!athleteId) return response({ error: 'athlete_id is required' }, 400);
      const start = typeof body.range_start === 'string' ? body.range_start : null;
      const end = typeof body.range_end === 'string' ? body.range_end : null;
      const includeRaw = body.include_raw === true;
      await logAccess(athleteId, includeRaw ? 'raw' : 'executed_sessions', start, end);
      await logAccess(athleteId, 'metrics', start, end);
      let query = admin.from('executed_sessions').select(includeRaw ? '*' : 'id, athlete_id, provider, sport_raw, sport_category, start_time, end_time, duration_seconds, distance_m, avg_hr, max_hr, calories').eq('athlete_id', athleteId).order('start_time', { ascending: false }).limit(300);
      if (start) query = query.gte('start_time', start);
      if (end) query = query.lte('start_time', end);
      const { data: sessions, error } = await query;
      if (error) throw error;
      const ids = (sessions || []).map(row => row.id);
      const [{ data: metrics, error: metricsError }, { data: matches, error: matchesError }] = await Promise.all([
        ids.length ? admin.from('executed_session_metrics').select('*').in('executed_session_id', ids) : Promise.resolve({ data: [], error: null }),
        ids.length ? admin.from('session_matches').select('*').in('executed_session_id', ids) : Promise.resolve({ data: [], error: null }),
      ]);
      if (metricsError) throw metricsError; if (matchesError) throw matchesError;
      const unmapped = [...new Set((sessions || []).filter(row => row.sport_category === 'other').map(row => row.sport_raw).filter(Boolean))];
      return response({ sessions: sessions || [], metrics: metrics || [], matches: matches || [], unmapped_sports: unmapped });
    }
    if (action === 'admin-recalculate-metrics') {
      requireAdmin();
      const athleteId = typeof body.athlete_id === 'string' ? body.athlete_id : null;
      const sessionId = typeof body.executed_session_id === 'string' ? body.executed_session_id : null;
      const rangeStart = typeof body.range_start === 'string' ? body.range_start : null;
      const rangeEnd = typeof body.range_end === 'string' ? body.range_end : null;
      if (!athleteId && !sessionId) return response({ error: 'athlete_id or executed_session_id is required' }, 400);
      let target = athleteId;
      let sessionIds: string[] | undefined;
      if (sessionId) {
        const { data, error } = await admin.from('executed_sessions').select('id, athlete_id').eq('id', sessionId).maybeSingle();
        if (error) throw error; if (!data) return response({ error: 'Executed session not found' }, 404);
        target = data.athlete_id; sessionIds = [sessionId];
      } else if (rangeStart || rangeEnd) {
        let rangeQuery = admin.from('executed_sessions').select('id').eq('athlete_id', target!);
        if (rangeStart) rangeQuery = rangeQuery.gte('start_time', rangeStart);
        if (rangeEnd) rangeQuery = rangeQuery.lte('start_time', rangeEnd);
        const { data, error } = await rangeQuery.order('start_time').limit(1000);
        if (error) throw error;
        sessionIds = (data || []).map(row => row.id);
      }
      await logAccess(target!, 'executed_sessions', rangeStart, rangeEnd);
      await logAccess(target!, 'metrics', rangeStart, rangeEnd);
      const link = await getLink(target!);
      if (!link) return response({ error: 'No Open Wearables link for this athlete' }, 404);
      const work = recomputeMetrics(target!, link.ow_user_id, sessionIds, true);
      const edgeRuntime = (globalThis as any).EdgeRuntime;
      if (edgeRuntime?.waitUntil) { edgeRuntime.waitUntil(work); return response({ queued: true }); }
      return response(await work);
    }
    if (action === 'admin-overview') {
      requireAdmin();
      const { data: links, error: linkError } = await admin.from('wearable_links').select('asciende_user_id, ow_user_id, consent_at, consent_version, created_at');
      if (linkError) throw linkError;
      const profilesById = new Map<string, unknown>();
      if (links?.length) {
        const ids = links.map((link) => link.asciende_user_id);
        const { data: users, error } = await admin.from('profiles').select('id, email, full_name, role').in('id', ids);
        if (error) throw error;
        users?.forEach((user) => profilesById.set(user.id, user));
      }
      const linked = await runLimited(links || [], 4, async (link) => {
        try {
          const [connections, summaryResult] = await Promise.allSettled([
            ow(`/users/${link.ow_user_id}/connections`),
            ow(`/users/${link.ow_user_id}/data-summary`),
          ]);
          if (connections.status === 'rejected') throw connections.reason;
          return { user: profilesById.get(link.asciende_user_id), link, connections: connections.value, data_types: summaryResult.status === 'fulfilled' ? normalizeDataTypes(summaryResult.value) : null, summary_error: summaryResult.status === 'rejected' ? errorBody(summaryResult.reason) : null };
        } catch (error) {
          return { user: profilesById.get(link.asciende_user_id), link, connections: null, data_types: null, error: errorBody(error) };
        }
      });
      const value = { users: linked };
      return response(value);
    }
    if (action === 'admin-list-ow-users') {
      requireAdmin();
      const items: unknown[] = [];
      for (let page = 1; page <= 100; page++) {
        const result = await ow(`/users?page=${page}&limit=100`) as { items?: unknown[]; has_next?: boolean };
        items.push(...(result.items || []));
        if (!result.has_next) break;
      }
      return response({ items });
    }
    if (action === 'admin-link') {
      requireAdmin();
      if (typeof body.asciende_user_id !== 'string' || typeof body.ow_user_id !== 'string') return response({ error: 'Both user ids are required' }, 400);
      const { data: target, error: targetError } = await admin.from('profiles').select('id').eq('id', body.asciende_user_id).maybeSingle();
      if (targetError || !target) return response({ error: 'Asciende user not found' }, 404);
      const { data: exists, error: existsError } = await admin.from('wearable_links').select('asciende_user_id').eq('ow_user_id', body.ow_user_id).maybeSingle();
      if (existsError) throw existsError;
      if (exists && exists.asciende_user_id !== body.asciende_user_id) return response({ error: 'Open Wearables user is already linked to another Asciende user' }, 409);
      const current = await getLink(body.asciende_user_id);
      if (current && current.ow_user_id !== body.ow_user_id) return response({ error: 'This Asciende user is already linked. Unlink it before replacing the link.' }, 409);
      const { data, error } = await admin.from('wearable_links').upsert({ asciende_user_id: body.asciende_user_id, ow_user_id: body.ow_user_id }, { onConflict: 'asciende_user_id' }).select().single();
      if (error) throw error;
      return response({ link: data });
    }
    if (action === 'admin-unlink') {
      requireAdmin();
      if (typeof body.asciende_user_id !== 'string') return response({ error: 'asciende_user_id is required' }, 400);
      const { error } = await admin.from('wearable_links').delete().eq('asciende_user_id', body.asciende_user_id);
      if (error) throw error;
      return response({ ok: true });
    }
    if (action === 'admin-raw') {
      requireAdmin();
      const link = await getLink(body.asciende_user_id);
      if (!link) return response({ linked: false });
      const raw = await Promise.allSettled([
        ow(`/users/${link.ow_user_id}`),
        ow(`/users/${link.ow_user_id}/connections`),
      ]);
      return response({ link, raw });
    }
    return response({ error: 'Unknown action' }, 400);
  } catch (error) {
    const result = errorBody(error);
    return response(result, result.status);
  }
});
