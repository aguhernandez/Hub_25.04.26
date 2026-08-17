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

    const { program_product_id, name, description, price, currency } = await req.json();

    if (!program_product_id || !name || price === undefined) {
      throw new Error('Missing required fields: program_product_id, name, price');
    }

    const stripeCurrency = (currency || 'usd').toLowerCase();

    const stripeProduct = await stripe.products.create({
      name,
      description: description || undefined,
      metadata: {
        program_product_id,
        source: 'asciende_hub',
      },
    });

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(price * 100),
      currency: stripeCurrency,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      success_url: `${Deno.env.get('SITE_URL') || 'https://asciende.pro'}/programs?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('SITE_URL') || 'https://asciende.pro'}/programs`,
      metadata: {
        program_product_id,
      },
    });

    const { error: updateError } = await supabase
      .from('program_products')
      .update({
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
        checkout_url: session.url,
      })
      .eq('id', program_product_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
        checkout_url: session.url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating Stripe product for program:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
