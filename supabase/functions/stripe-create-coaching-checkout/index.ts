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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { product_id } = await req.json();
    if (!product_id) throw new Error('Missing product_id');

    const { data: product, error: productError } = await supabaseClient
      .from('stripe_products')
      .select('*')
      .eq('id', product_id)
      .eq('type', 'coaching')
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found: ${productError?.message || 'Unknown error'}`);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('Stripe is not configured. Please contact the administrator.');

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || '';
    const isRecurring = product.billing_cycle === 'monthly' || product.billing_cycle === 'yearly';
    const mode: 'subscription' | 'payment' = isRecurring ? 'subscription' : 'payment';

    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (product.stripe_price_id) {
      sessionParams = {
        customer_email: profile?.email || user.email,
        line_items: [{ price: product.stripe_price_id, quantity: 1 }],
        mode,
        allow_promotion_codes: true,
        success_url: `${origin}/services?coaching_success=true&product=${product_id}`,
        cancel_url: `${origin}/services?coaching_canceled=true`,
        metadata: {
          user_id: user.id,
          product_id: product_id,
          type: 'coaching',
          category: product.category,
        },
      };
    } else {
      const intervalMap: Record<string, 'month' | 'year'> = { monthly: 'month', yearly: 'year' };
      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
        currency: 'eur',
        product_data: { name: product.name, description: product.description || undefined },
        unit_amount: Math.round(product.price * 100),
        ...(isRecurring ? { recurring: { interval: intervalMap[product.billing_cycle] } } : {}),
      };

      sessionParams = {
        customer_email: profile?.email || user.email,
        line_items: [{ price_data: priceData, quantity: 1 }],
        mode,
        allow_promotion_codes: true,
        success_url: `${origin}/services?coaching_success=true&product=${product_id}`,
        cancel_url: `${origin}/services?coaching_canceled=true`,
        metadata: {
          user_id: user.id,
          product_id: product_id,
          type: 'coaching',
          category: product.category,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    const message = error?.raw?.message || error?.message || 'Unknown error';
    console.error('Coaching checkout error:', message, JSON.stringify(error?.raw || {}));
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
