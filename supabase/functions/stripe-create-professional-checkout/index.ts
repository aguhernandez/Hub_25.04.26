import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

type CatalogRow = {
  module_key: string;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  requires_modules: string[];
  available: boolean;
  trial_days: number;
  kind: 'module' | 'pack';
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return response({}, 200);
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return response({ error: 'Not authenticated' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return response({ error: 'Not authenticated' }, 401);

    const body = await req.json() as { interval?: 'monthly' | 'yearly'; modules?: string[]; extra_athletes?: number };
    const interval = body.interval ?? 'monthly';
    if (interval !== 'monthly' && interval !== 'yearly') return response({ error: 'Invalid interval' }, 400);
    const modules = [...new Set(body.modules ?? [])];
    if (modules.length === 0) return response({ error: 'Select at least one module' }, 400);
    const extraAthletes = Math.min(10, Math.max(0, Math.floor(body.extra_athletes ?? 0)));
    if (extraAthletes > 0 && !modules.includes('extra_athletes')) modules.push('extra_athletes');

    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'professional_checkout_enabled').maybeSingle();
    if (setting?.value !== true && setting?.value !== 'true') return response({ error: 'Professional checkout is not enabled yet' }, 409);
    const { data: catalog, error: catalogError } = await supabase.from('module_catalog').select('module_key, stripe_price_id_monthly, stripe_price_id_annual, requires_modules, available, trial_days, kind').in('module_key', modules);
    if (catalogError) return response({ error: 'Could not load module catalog' }, 500);
    const rows = (catalog ?? []) as CatalogRow[];
    if (rows.length !== modules.length || rows.some(row => !row.available)) return response({ error: 'One or more modules are unavailable' }, 400);
    if (modules.includes('all_access') && modules.length > 1) return response({ error: 'All Access cannot be combined with individual modules' }, 400);
    if (extraAthletes > 0 && !modules.some(module => module !== 'extra_athletes')) return response({ error: 'Extra athlete packs require a professional module' }, 400);
    for (const row of rows) {
      for (const required of row.requires_modules) {
        if (!modules.includes(required) && !(await supabase.rpc('has_module', { p_user_id: user.id, p_module_key: required })).data) {
          return response({ error: `${row.module_key} requires ${required}` }, 400);
        }
      }
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return response({ error: 'Stripe is not configured' }, 503);
    const { data: existingSub } = await supabase.from('professional_subscriptions').select('stripe_customer_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const prices = rows.map(row => ({ price: interval === 'monthly' ? row.stripe_price_id_monthly : row.stripe_price_id_annual, quantity: row.module_key === 'extra_athletes' ? extraAthletes : 1 })).filter(item => item.price);
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('payment_method_collection', 'always');
    params.set('success_url', `${Deno.env.get('SITE_URL') ?? 'https://hub.asciende.pro'}/confirm-email?professional_payment=success`);
    params.set('cancel_url', `${Deno.env.get('SITE_URL') ?? 'https://hub.asciende.pro'}/confirm-email?professional_payment=cancelled`);
    params.set('client_reference_id', user.id);
    params.set('customer_email', user.email ?? '');
    params.set('automatic_tax[enabled]', 'true');
    params.set('tax_id_collection[enabled]', 'true');
    params.set('billing_address_collection', 'required');
    params.set('allow_promotion_codes', 'true');
    params.set('metadata[user_id]', user.id);
    params.set('metadata[modules]', JSON.stringify(modules));
    params.set('metadata[extra_athletes]', String(extraAthletes));
    if (existingSub?.stripe_customer_id) params.set('customer', existingSub.stripe_customer_id);
    prices.forEach((item, index) => { params.set(`line_items[${index}][price]`, item.price!); params.set(`line_items[${index}][quantity]`, String(item.quantity)); });
    const endurance = rows.find(row => row.module_key === 'endurance_planner');
    if (endurance?.trial_days && !existingSub) params.set('subscription_data[trial_period_days]', String(endurance.trial_days));

    const checkoutResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
    const checkout = await checkoutResponse.json() as { url?: string; error?: { message?: string } };
    if (!checkoutResponse.ok || !checkout.url) return response({ error: checkout.error?.message ?? 'Could not create checkout session' }, 502);
    return response({ url: checkout.url });
  } catch (error: unknown) {
    return response({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
