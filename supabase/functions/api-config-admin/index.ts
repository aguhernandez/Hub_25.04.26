import { createClient } from 'npm:@supabase/supabase-js@2';

const HUB_ORIGINS = new Set(['https://asciende.pro', 'https://www.asciende.pro', 'https://hub.asciende.pro', 'http://localhost:5173', 'http://127.0.0.1:5173']);
const SENSITIVE_FIELDS: Record<string, string[]> = {
  brevo: ['api_key'], stripe: ['secret_key', 'webhook_secret'],
  zoom: ['client_secret'], openai: ['api_key'],
};

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && HUB_ORIGINS.has(origin) ? origin : 'https://asciende.pro',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  const corsHeaders = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401, corsHeaders);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.slice(7));
    if (authError || !user) return json({ error: 'Invalid session' }, 401, corsHeaders);
    const { data: profile } = await admin.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin' || profile.is_active === false) return json({ error: 'Admin access required' }, 403, corsHeaders);

    if (req.method === 'GET') {
      const { data, error } = await admin.from('api_configurations')
        .select('id, service_name, config_key, config_value, encrypted_value, is_active, updated_at').order('service_name');
      if (error) throw error;
      const configs = (data || []).map((row) => {
        const sensitive = SENSITIVE_FIELDS[row.service_name]?.includes(row.config_key) || false;
        return {
          id: row.id, service_name: row.service_name, config_key: row.config_key,
          config_value: sensitive ? null : row.config_value, encrypted_value: null,
          is_sensitive: sensitive, is_configured: Boolean(row.encrypted_value || row.config_value),
          is_active: row.is_active, updated_at: row.updated_at,
        };
      });
      return json({ configs }, 200, corsHeaders);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const serviceName = String(body.serviceName || '');
      const configKey = String(body.configKey || '');
      const configValue = body.configValue == null ? '' : String(body.configValue);
      if (!serviceName || !configKey) return json({ error: 'Invalid configuration key' }, 400, corsHeaders);

      const sensitive = SENSITIVE_FIELDS[serviceName]?.includes(configKey) || false;
      const { data: existing } = await admin.from('api_configurations').select('id, encrypted_value, config_value')
        .eq('service_name', serviceName).eq('config_key', configKey).maybeSingle();
      if (sensitive && !configValue && (existing?.encrypted_value || existing?.config_value)) {
        return json({ success: true, preserved: true }, 200, corsHeaders);
      }

      let plainValue: string | null = configValue || null;
      let encryptedValue: string | null = null;
      if (sensitive && configValue) {
        const key = Deno.env.get('API_ENCRYPTION_KEY') || Deno.env.get('JWT_SECRET');
        if (!key) throw new Error('API_ENCRYPTION_KEY is not configured');
        const { data: encrypted, error } = await admin.rpc('encrypt_api_config', { p_value: configValue, p_key: key });
        if (error || !encrypted) throw error || new Error('Could not encrypt configuration');
        encryptedValue = encrypted;
        plainValue = null;
      }

      const values = {
        service_name: serviceName, config_key: configKey, config_value: plainValue,
        encrypted_value: encryptedValue, is_active: body.isActive !== false && Boolean(configValue),
        updated_by: user.id, updated_at: new Date().toISOString(),
      };
      const query = existing?.id
        ? admin.from('api_configurations').update(values).eq('id', existing.id)
        : admin.from('api_configurations').insert(values);
      const { error } = await query;
      if (error) throw error;
      return json({ success: true }, 200, corsHeaders);
    }
    return json({ error: 'Method not allowed' }, 405, corsHeaders);
  } catch (error) {
    console.error('api-config-admin error', error);
    return json({ error: 'Could not update API configuration' }, 500, corsHeaders);
  }
});
