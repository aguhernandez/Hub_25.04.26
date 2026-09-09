import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function log(level: 'INFO' | 'WARN' | 'ERROR', step: string, data?: Record<string, unknown>) {
  const entry = { level, step, ts: new Date().toISOString(), ...(data ?? {}) };
  if (level === 'ERROR') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) throw new Error('User profile not found');
    if (profile.role !== 'athlete') throw new Error('Only athlete accounts can access membership billing');

    const { data: access, error: accessError } = await supabaseClient
      .from('membership_access')
      .select('id, stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('source', 'stripe')
      .eq('status', 'active')
      .not('stripe_customer_id', 'is', null)
      .order('start_date', { ascending: false })
      .maybeSingle();

    if (accessError) throw new Error('Failed to load membership');
    if (!access?.stripe_customer_id) {
      log('ERROR', 'membership_portal_missing_customer', { user_id: user.id });
      throw new Error('Your membership is not linked to a Stripe customer');
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('Stripe is not configured');

    const customerResponse = await fetch(
      `https://api.stripe.com/v1/customers/${encodeURIComponent(access.stripe_customer_id)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    if (!customerResponse.ok) {
      log('ERROR', 'membership_portal_customer_not_found', {
        user_id: user.id,
        customer_id: access.stripe_customer_id,
        status: customerResponse.status,
      });
      throw new Error('Stripe customer could not be found');
    }
    const customer = await customerResponse.json();
    if (customer.deleted) throw new Error('Stripe customer could not be found');

    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || '';
    const returnUrl = `${origin}/settings?section=membership&portal_return=true`;
    const sessionResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ customer: access.stripe_customer_id, return_url: returnUrl }),
    });

    if (!sessionResponse.ok) {
      const details = await sessionResponse.text();
      log('ERROR', 'membership_portal_session_failed', {
        user_id: user.id,
        customer_id: access.stripe_customer_id,
        status: sessionResponse.status,
        details,
      });
      throw new Error('Could not open membership billing portal');
    }

    const session = await sessionResponse.json();
    if (!session.url) throw new Error('Stripe did not return a billing portal URL');
    log('INFO', 'membership_portal_session_created', { user_id: user.id, session_id: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not open membership billing portal';
    log('ERROR', 'membership_portal_error', { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
