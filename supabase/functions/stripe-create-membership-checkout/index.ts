import Stripe from 'npm:stripe@14.21.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('Authentication failed: No user found');
      throw new Error('Not authenticated');
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    console.log('Request body:', body);

    const { membership_id, billing_cycle } = body;

    if (!membership_id || !billing_cycle) {
      console.error('Missing fields:', { membership_id, billing_cycle });
      throw new Error('Missing required fields: membership_id and billing_cycle are required');
    }

    // Get membership details
    const { data: membership, error: membershipError } = await adminClient
      .from('memberships')
      .select('*')
      .eq('id', membership_id)
      .in('slug', ['inicia', 'pro'])
      .eq('is_active', true)
      .eq('is_published', true)
      .eq('is_open', true)
      .maybeSingle();

    if (membershipError || !membership) {
      console.error('Membership lookup error:', membershipError);
      throw new Error(`Membership not found: ${membershipError?.message || 'Unknown error'}`);
    }

    console.log('Membership found:', membership.name);

    // Check if already has active membership
    const { data: existingAccess, error: accessError } = await adminClient
      .from('membership_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('membership_id', membership_id)
      .eq('status', 'active')
      .maybeSingle();

    if (accessError) {
      console.error('Error checking existing access:', accessError);
    }

    if (existingAccess) {
      console.error('User already has active membership:', existingAccess);
      throw new Error('You already have an active membership for this tier');
    }

    // Get Stripe price ID
    const priceField = billing_cycle === 'monthly'
      ? 'stripe_price_id_monthly'
      : 'stripe_price_id_annual';

    const priceId = membership[priceField];

    console.log('Looking for price field:', priceField, 'Value:', priceId);

    if (!priceId) {
      console.error(`Missing Stripe price ID for ${billing_cycle} billing`);
      throw new Error(
        `This membership doesn't have a ${billing_cycle} plan configured in Stripe. Please contact the administrator to set it up.`
      );
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      throw new Error('Stripe is not configured. Please contact the administrator.');
    }

    const isTestKey = stripeKey.startsWith('sk_test_');
    console.log('Stripe key mode:', isTestKey ? 'TEST' : 'LIVE');

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Retrieve the price from Stripe; if it's inactive (archived), auto-resolve the active price
    let activePriceId = priceId;
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log('Stripe price retrieved:', JSON.stringify({
        id: price.id, active: price.active, type: price.type,
        currency: price.currency, livemode: price.livemode, product: price.product,
      }));

      if (!price.active) {
        console.log(`Price ${priceId} is archived, searching for active replacement...`);
        const productId = typeof price.product === 'string' ? price.product : price.product.id;
        const interval = billing_cycle === 'monthly' ? 'month' : 'year';

        const activePrices = await stripe.prices.list({
          product: productId,
          active: true,
          limit: 100,
        });

        const match = activePrices.data.find(
          (p) => p.active && p.recurring?.interval === interval
        );

        if (!match) {
          throw new Error(
            `The ${billing_cycle} price for this membership was archived and no active ` +
            `${interval}ly replacement was found. Please create a new ${billing_cycle} ` +
            `price in Stripe for product ${productId}.`
          );
        }

        activePriceId = match.id;
        console.log(`Found active replacement price: ${activePriceId} (was ${priceId})`);

        // Persist the new price ID back to the database
        const updateField = billing_cycle === 'monthly'
          ? 'stripe_price_id_monthly'
          : 'stripe_price_id_annual';
        await adminClient
          .from('memberships')
          .update({ [updateField]: activePriceId })
          .eq('id', membership_id);
        console.log(`Updated membership ${membership_id} ${updateField} to ${activePriceId}`);
      }
    } catch (priceErr: any) {
      if (priceErr?.message?.includes('archived') || priceErr?.message?.includes('replacement')) {
        throw priceErr;
      }
      console.error('Failed to retrieve price from Stripe:', priceErr?.message);
      throw new Error(
        `Price ${priceId} could not be found with the configured Stripe key ` +
        `(mode: ${isTestKey ? 'TEST' : 'LIVE'}). ` +
        `Stripe error: ${priceErr?.message || 'unknown'}`
      );
    }

    // Get user email
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Could not load your athlete profile');
    }
    if (profile?.role !== 'athlete') {
      throw new Error('Only athlete accounts can purchase an athlete membership');
    }

    // Get custom success/cancel URLs if provided
    const customSuccessUrl = body.success_url;
    const customCancelUrl = body.cancel_url;
    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || '';
    const returnUrl = `${origin}/settings?section=membership`;

    // Create checkout session
    console.log('Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer_email: profile?.email || user.email,
      line_items: [
        {
          price: activePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: customSuccessUrl || `${returnUrl}&membership_success=true`,
      cancel_url: customCancelUrl || `${returnUrl}&membership_canceled=true`,
      metadata: {
        user_id: user.id,
        membership_id: membership_id,
        billing_cycle: billing_cycle,
        price_id: activePriceId,
        type: 'membership_subscription',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          membership_id: membership_id,
          billing_cycle: billing_cycle,
          price_id: activePriceId,
          type: 'membership_subscription',
        },
      },
    }).catch((stripeError: any) => {
      console.error('Stripe API error:', JSON.stringify(stripeError, null, 2));
      const msg = stripeError?.message || 'Unknown Stripe error';
      throw new Error(`Stripe: ${msg}`);
    });

    console.log('Stripe session created successfully:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});