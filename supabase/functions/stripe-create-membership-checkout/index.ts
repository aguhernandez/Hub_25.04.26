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

    const body = await req.json();
    console.log('Request body:', body);

    const { membership_id, billing_cycle } = body;

    if (!membership_id || !billing_cycle) {
      console.error('Missing fields:', { membership_id, billing_cycle });
      throw new Error('Missing required fields: membership_id and billing_cycle are required');
    }

    // Get membership details
    const { data: membership, error: membershipError } = await supabaseClient
      .from('memberships')
      .select('*')
      .eq('id', membership_id)
      .single();

    if (membershipError || !membership) {
      console.error('Membership lookup error:', membershipError);
      throw new Error(`Membership not found: ${membershipError?.message || 'Unknown error'}`);
    }

    console.log('Membership found:', membership.name);

    // Check if already has active membership
    const { data: existingAccess, error: accessError } = await supabaseClient
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

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Get user email
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Get custom success/cancel URLs if provided
    const customSuccessUrl = body.success_url;
    const customCancelUrl = body.cancel_url;
    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || '';

    // Create checkout session
    console.log('Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer_email: profile?.email || user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: customSuccessUrl || `${origin}/memberships?success=true`,
      cancel_url: customCancelUrl || `${origin}/memberships?canceled=true`,
      metadata: {
        user_id: user.id,
        membership_id: membership_id,
        billing_cycle: billing_cycle,
        type: 'membership_subscription',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          membership_id: membership_id,
          billing_cycle: billing_cycle,
        },
      },
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