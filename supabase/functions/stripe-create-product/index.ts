import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

    const { product_id, name, description, price, billing_cycle } = await req.json();

    console.log('📦 Creating Stripe product for:', name);

    // Create product in Stripe
    const stripeProduct = await stripe.products.create({
      name,
      description: description || undefined,
      metadata: {
        product_id,
      },
    });

    console.log('✅ Stripe product created:', stripeProduct.id);

    // Create price in Stripe
    const priceData: any = {
      product: stripeProduct.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: 'eur',
    };

    if (billing_cycle === 'monthly' || billing_cycle === 'yearly') {
      priceData.recurring = {
        interval: billing_cycle === 'monthly' ? 'month' : 'year',
      };
    }

    const stripePrice = await stripe.prices.create(priceData);

    console.log('✅ Stripe price created:', stripePrice.id);

    // Create checkout session to get checkout URL
    const session = await stripe.checkout.sessions.create({
      mode: billing_cycle === 'one_time' ? 'payment' : 'subscription',
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      success_url: 'https://asciende.pro/thank-you?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://asciende.pro/programs',
    });

    const checkoutUrl = session.url;

    // Update product in Supabase with Stripe IDs
    const { error: updateError } = await supabase
      .from('stripe_products')
      .update({
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
        checkout_url: checkoutUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product_id);

    if (updateError) {
      console.error('❌ Error updating product:', updateError);
      throw updateError;
    }

    console.log('✅ Product updated in database');

    return new Response(
      JSON.stringify({
        success: true,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
        checkout_url: checkoutUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
