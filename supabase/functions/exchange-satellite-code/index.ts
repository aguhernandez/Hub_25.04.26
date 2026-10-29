import { createClient } from 'npm:@supabase/supabase-js@2';

const SATELLITE_HOSTS = new Set([
  'lab.asciende.pro', 'endurance.asciende.pro', 'nutrition.asciende.pro',
  'academy.asciende.pro', 'motion.asciende.pro', 'performance.asciende.pro',
]);

function originHost(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && SATELLITE_HOSTS.has(parsed.hostname) ? parsed.hostname : null;
  } catch { return null; }
}

function response(body: unknown, status: number, origin: string | null) {
  const host = originHost(origin);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': host ? `https://${host}` : 'https://asciende.pro',
      'Access-Control-Allow-Headers': 'content-type, apikey',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Vary': 'Origin',
    },
  });
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return response({}, 200, origin);
  const host = originHost(origin);
  if (!host) return response({ error: 'Invalid satellite origin' }, 403, origin);
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin);

  try {
    const { code } = await req.json();
    if (typeof code !== 'string' || code.length < 32) return response({ error: 'Invalid code' }, 400, origin);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const now = new Date().toISOString();
    const { data, error } = await admin.from('satellite_sso_codes')
      .delete()
      .eq('code_hash', await sha256(code))
      .eq('target_host', host)
      .gt('expires_at', now)
      .select('session_token')
      .maybeSingle();
    if (error) throw error;
    if (!data?.session_token) return response({ error: 'Code expired or already used' }, 401, origin);
    return response({ success: true, token: data.session_token }, 200, origin);
  } catch (error) {
    console.error('SSO code exchange failed', error);
    return response({ error: 'Could not exchange code' }, 500, origin);
  }
});
