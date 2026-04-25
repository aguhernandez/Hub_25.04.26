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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Check if user is admin or trainer
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'trainer'].includes(profile.role)) {
      throw new Error('Unauthorized');
    }

    const { membership_id, billing_cycle } = await req.json();

    if (!membership_id || !billing_cycle) {
      throw new Error('Missing required fields');
    }

    // Get membership details
    const { data: membership, error: membershipError } = await supabaseClient
      .from('memberships')
      .select('*')
      .eq('id', membership_id)
      .single();

    if (membershipError || !membership) {
      throw new Error('Membership not found');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    let productId = membership.stripe_product_id;

    // Create Stripe product if it doesn't exist
    if (!productId) {
      const product = await stripe.products.create({
        name: membership.name,
        description: membership.description || undefined,
        images: membership.image_url ? [membership.image_url] : undefined,
        metadata: {
          membership_id: membership_id,
          type: 'membership',
        },
      });

      productId = product.id;

      // Update membership with product ID
      await supabaseClient
        .from('memberships')
        .update({ stripe_product_id: productId })
        .eq('id', membership_id);
    }

    // Determine price based on billing cycle
    const priceAmount = billing_cycle === 'monthly'
      ? membership.price_monthly
      : membership.price_annual;

    if (!priceAmount || priceAmount <= 0) {
      throw new Error(`Cannot create Stripe product for free membership. Price must be greater than 0.`);
    }

    // Check if price already exists for this billing cycle
    const updateField = billing_cycle === 'monthly'
      ? 'stripe_price_id_monthly'
      : 'stripe_price_id_annual';

    const existingPriceId = membership[updateField];

    // If recreating, deactivate old price in Stripe (can't delete, only archive)
    if (existingPriceId) {
      try {
        await stripe.prices.update(existingPriceId, { active: false });
        console.log('Archived old price:', existingPriceId);
      } catch (error) {
        console.log('Could not archive old price (may not exist):', error);
      }

      // Remove old mapping
      await supabaseClient
        .from('stripe_membership_mappings')
        .delete()
        .eq('stripe_price_id', existingPriceId);
    }

    // Create new Stripe price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(priceAmount * 100),
      currency: membership.currency.toLowerCase() || 'usd',
      recurring: {
        interval: billing_cycle === 'monthly' ? 'month' : 'year',
      },
      metadata: {
        membership_id: membership_id,
        billing_cycle: billing_cycle,
      },
    });

    console.log('Created new price:', price.id);

    // Save new mapping
    await supabaseClient
      .from('stripe_membership_mappings')
      .insert({
        stripe_price_id: price.id,
        stripe_product_id: productId,
        membership_id: membership_id,
        billing_cycle: billing_cycle,
      });

    // Update membership with new price ID
    await supabaseClient
      .from('memberships')
      .update({ [updateField]: price.id })
      .eq('id', membership_id);

    // Generate checkout link
    const checkoutUrl = `${req.headers.get('origin')}/membership/${membership.slug}?checkout=true`;

    return new Response(
      JSON.stringify({
        success: true,
        product_id: productId,
        price_id: price.id,
        checkout_url: checkoutUrl,
      }),
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