import { createClient } from 'npm:@supabase/supabase-js@2';

const CONSENT_VERSION = '2026-10-10-v1';
const cache = new Map<string, { expires: number; value: unknown }>();

function response(body: unknown, status = 200, origin: string | null = null) {
  const allowed = origin && (origin.endsWith('.asciende.pro') || origin === 'https://asciende.pro' || origin.includes('localhost')) ? origin : 'https://hub.asciende.pro';
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' } });
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return response({}, 200, origin);
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin);

  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return response({ error: 'Authentication required' }, 401, origin);
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return response({ error: 'Invalid session' }, 401, origin);
    const admin = createClient(url, service);
    const { data: profile } = await admin.from('profiles').select('id, email, full_name, role').eq('id', authData.user.id).maybeSingle();
    if (!profile) return response({ error: 'Profile not found' }, 403, origin);
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
    if (action === 'consent') {
      const { error } = await admin.from('wearable_links').upsert({ asciende_user_id: profile.id, ow_user_id: (await ensureUser()).ow_user_id, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION }, { onConflict: 'asciende_user_id' });
      if (error) throw error;
      return response({ consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION }, 200, origin);
    }
    if (action === 'ensure-user') return response({ link: await ensureUser() }, 200, origin);
    if (action === 'providers') return response(await ow('/providers'), 200, origin);
    if (action === 'connect-start') {
      if (typeof body.provider !== 'string' || !body.provider) return response({ error: 'provider is required' }, 400, origin);
      const link = await requireConsent();
      const redirectOrigin = origin && (origin.endsWith('.asciende.pro') || origin === 'https://asciende.pro' || origin.includes('localhost')) ? origin : 'https://hub.asciende.pro';
      const redirect = new URL('/settings', redirectOrigin);
      redirect.searchParams.set('section', 'wearables');
      redirect.searchParams.set('wearable', 'success');
      const query = new URLSearchParams({ user_id: link.ow_user_id, redirect_uri: redirect.toString() });
      const authorization = await ow(`/oauth/${encodeURIComponent(body.provider)}/authorize?${query}`);
      const object = authorization as Record<string, unknown>;
      const authorization_url = object.authorization_url || object.url;
      if (!authorization_url) return response({ error: 'Authorization response has no URL', raw: authorization }, 502, origin);
      return response({ authorization_url, raw: authorization }, 200, origin);
    }
    if (action === 'connections') {
      const link = await getLink();
      if (!link) return response({ linked: false, connections: [], summary: null }, 200, origin);
      const [connections, summaryResult] = await Promise.allSettled([
        ow(`/users/${link.ow_user_id}/connections`),
        ow(`/users/${link.ow_user_id}/data-summary`),
      ]);
      if (connections.status === 'rejected') throw connections.reason;
      const summary = summaryResult.status === 'fulfilled' ? normalizeDataTypes(summaryResult.value) : null;
      return response({ linked: true, connections: connections.value, data_types: summary, summary_error: summaryResult.status === 'rejected' ? errorBody(summaryResult.reason) : null }, 200, origin);
    }
    if (action === 'disconnect') {
      // Disconnect is a privacy control and must remain available even when consent
      // has been withdrawn or the account was linked by an administrator.
      const link = await getLink();
      if (!link) return response({ error: 'No Open Wearables user is linked' }, 404, origin);
      if (!body.provider) return response({ error: 'provider is required' }, 400, origin);
      return response(await ow(`/users/${link.ow_user_id}/connections/${encodeURIComponent(body.provider)}`, { method: 'DELETE' }), 200, origin);
    }
    if (action === 'admin-overview') {
      requireAdmin();
      const now = Date.now();
      const cached = cache.get('admin-overview');
      if (cached && cached.expires > now) return response(cached.value, 200, origin);
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
      cache.set('admin-overview', { expires: now + 60_000, value });
      return response(value, 200, origin);
    }
    if (action === 'admin-list-ow-users') {
      requireAdmin();
      const items: unknown[] = [];
      for (let page = 1; page <= 100; page++) {
        const result = await ow(`/users?page=${page}&limit=100`) as { items?: unknown[]; has_next?: boolean };
        items.push(...(result.items || []));
        if (!result.has_next) break;
      }
      return response({ items }, 200, origin);
    }
    if (action === 'admin-link') {
      requireAdmin();
      if (typeof body.asciende_user_id !== 'string' || typeof body.ow_user_id !== 'string') return response({ error: 'Both user ids are required' }, 400, origin);
      const { data: target, error: targetError } = await admin.from('profiles').select('id').eq('id', body.asciende_user_id).maybeSingle();
      if (targetError || !target) return response({ error: 'Asciende user not found' }, 404, origin);
      const { data: exists, error: existsError } = await admin.from('wearable_links').select('asciende_user_id').eq('ow_user_id', body.ow_user_id).maybeSingle();
      if (existsError) throw existsError;
      if (exists && exists.asciende_user_id !== body.asciende_user_id) return response({ error: 'Open Wearables user is already linked to another Asciende user' }, 409, origin);
      const current = await getLink(body.asciende_user_id);
      if (current && current.ow_user_id !== body.ow_user_id) return response({ error: 'This Asciende user is already linked. Unlink it before replacing the link.' }, 409, origin);
      const { data, error } = await admin.from('wearable_links').upsert({ asciende_user_id: body.asciende_user_id, ow_user_id: body.ow_user_id }, { onConflict: 'asciende_user_id' }).select().single();
      if (error) throw error;
      cache.delete('admin-overview');
      return response({ link: data }, 200, origin);
    }
    if (action === 'admin-unlink') {
      requireAdmin();
      if (typeof body.asciende_user_id !== 'string') return response({ error: 'asciende_user_id is required' }, 400, origin);
      const { error } = await admin.from('wearable_links').delete().eq('asciende_user_id', body.asciende_user_id);
      if (error) throw error;
      cache.delete('admin-overview');
      return response({ ok: true }, 200, origin);
    }
    if (action === 'admin-raw') {
      requireAdmin();
      const link = await getLink(body.asciende_user_id);
      if (!link) return response({ linked: false }, 200, origin);
      const raw = await Promise.allSettled([
        ow(`/users/${link.ow_user_id}`),
        ow(`/users/${link.ow_user_id}/connections`),
      ]);
      return response({ link, raw }, 200, origin);
    }
    return response({ error: 'Unknown action' }, 400, origin);
  } catch (error) {
    const result = errorBody(error);
    return response(result, result.status, origin);
  }
});
