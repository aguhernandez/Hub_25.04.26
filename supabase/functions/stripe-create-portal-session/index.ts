import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function log(level: 'INFO' | 'WARN' | 'ERROR', step: string, data?: any) {
  const entry = { level, step, ts: new Date().toISOString(), ...(data ?? {}) };
  if (level === 'ERROR') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) throw new Error('User profile not found');

    const isProfessional = profile.role === 'trainer' || profile.role === 'nutritionist';
    if (!isProfessional) throw new Error('Only professional accounts can access billing');

    const { data: subscription, error: subError } = await supabaseClient
      .from('professional_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (subError) throw new Error('Failed to load subscription');
    if (!subscription) throw new Error('No subscription found');
    if (!subscription.stripe_customer_id) {
      log('ERROR', 'portal_no_customer_id', { user_id: user.id });
      throw new Error('Subscription is not linked to a Stripe customer');
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('Stripe is not configured');

    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || '';
    const returnUrl = `${origin}/settings/subscription`;

    log('INFO', 'portal_session_creating', {
      user_id: user.id,
      customer_id: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    const sessionResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl,
      }),
    });

    if (!sessionResponse.ok) {
      const errBody = await sessionResponse.text();
      log('ERROR', 'portal_session_failed', {
        status: sessionResponse.status,
        body: errBody,
      });
      throw new Error('Could not open billing portal');
    }

    const session = await sessionResponse.json();
    log('INFO', 'portal_session_created', { session_id: session.id });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    log('ERROR', 'portal_session_error', { error: message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
