import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req) => {
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
      throw new Error('Not authenticated');
    }

    const { program_id, athlete_id } = await req.json();

    if (!program_id || !athlete_id) {
      throw new Error('Missing required fields');
    }

    // Get program details
    const { data: program, error: programError } = await supabaseClient
      .from('program_products')
      .select('*')
      .eq('id', program_id)
      .single();

    if (programError || !program) {
      throw new Error('Program not found');
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabaseClient
      .from('program_purchases')
      .select('*')
      .eq('athlete_id', athlete_id)
      .eq('program_product_id', program_id)
      .single();

    if (existingPurchase) {
      throw new Error('Program already purchased');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create pending purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('program_purchases')
      .insert({
        athlete_id,
        program_product_id: program_id,
        amount_paid: Math.round(program.price * 100),
        currency: program.currency.toLowerCase(),
        status: 'pending',
      })
      .select()
      .single();

    if (purchaseError) {
      throw purchaseError;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: program.currency.toLowerCase(),
            product_data: {
              name: program.title,
              description: program.description || undefined,
              images: program.image_url ? [program.image_url] : undefined,
            },
            unit_amount: Math.round(program.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/programs?success=true`,
      cancel_url: `${req.headers.get('origin')}/programs?canceled=true`,
      metadata: {
        purchase_id: purchase.id,
        program_id: program_id,
        athlete_id: athlete_id,
        type: 'program_purchase',
      },
    });

    // Update purchase with checkout session ID
    await supabaseClient
      .from('program_purchases')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', purchase.id);

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
