import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature',
};

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🎯 Webhook called! Method:', req.method);
    console.log('🔑 Headers:', Object.fromEntries(req.headers.entries()));

    // Get raw body as text for signature verification
    const body = await req.text();
    console.log('📦 Body length:', body.length);

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('stripe-signature');
      if (!signature) {
        console.error('❌ No Stripe signature found');
        return new Response(
          JSON.stringify({ error: 'No signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Note: For production, implement proper signature verification with Stripe library
      console.log('✅ Webhook signature present');
    }

    // Parse the event
    const event: StripeEvent = JSON.parse(body);

    console.log('📨 Received Stripe event:', event.type, 'ID:', event.id);

    // Log the event to database
    await supabase.from('stripe_webhook_events').insert({
      event_id: event.id,
      event_type: event.type,
      raw_payload: event,
      processed: false,
    });

    // Process different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event);
        break;
      
      case 'customer.subscription.created':
      case 'invoice.paid':
        await handleSubscriptionActive(supabase, event);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event);
        break;
      
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed':
        await handleSubscriptionCanceled(supabase, event);
        break;
      
      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    // Mark event as processed
    await supabase
      .from('stripe_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('event_id', event.id);

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Webhook error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCheckoutCompleted(supabase: any, event: StripeEvent) {
  const session = event.data.object;
  console.log('💰 Processing checkout completion:', session.id);

  // Check if this is a program purchase
  if (session.metadata?.type === 'program_purchase') {
    await handleProgramPurchaseCompleted(supabase, session);
    return;
  }

  // Check if this is a membership subscription
  if (session.metadata?.type === 'membership_subscription') {
    await handleMembershipSubscriptionCreated(supabase, session);
    return;
  }

  const customerEmail = session.customer_email || session.customer_details?.email;
  const priceId = session.line_items?.data?.[0]?.price?.id || session.metadata?.price_id;

  if (!customerEmail) {
    console.error('❌ No customer email found');
    return;
  }

  // Find user by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', customerEmail)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Error finding user:', profileError);
    return;
  }

  let userId = profile?.id;

  // If user doesn't exist, create one
  if (!userId) {
    console.log('👤 Creating new user for:', customerEmail);
    
    // Create auth user with temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: customerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: session.customer_details?.name || customerEmail.split('@')[0],
        needs_password_reset: true,
      },
    });

    if (authError) {
      console.error('❌ Error creating user:', authError);
      return;
    }

    userId = authData.user.id;
    console.log('✅ User created:', userId);
  }

  // Find product by price_id
  const { data: product, error: productError } = await supabase
    .from('stripe_products')
    .select('*')
    .eq('stripe_price_id', priceId)
    .maybeSingle();

  if (productError || !product) {
    console.error('❌ Product not found for price_id:', priceId);
    return;
  }

  console.log('📦 Found product:', product.name, 'Type:', product.type);

  // Calculate end_date based on product type
  let endDate = null;
  let nextBillingDate = null;

  if (product.type === 'program' && product.duration_weeks) {
    const start = new Date();
    endDate = new Date(start);
    endDate.setDate(endDate.getDate() + (product.duration_weeks * 7));
  } else if (product.type === 'membership') {
    if (product.billing_cycle === 'monthly') {
      nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (product.billing_cycle === 'yearly') {
      nextBillingDate = new Date();
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }
  }

  // Create purchase record
  const { error: purchaseError } = await supabase.from('user_purchases').insert({
    user_id: userId,
    product_id: product.id,
    stripe_customer_id: session.customer,
    stripe_subscription_id: session.subscription,
    stripe_session_id: session.id,
    status: 'active',
    start_date: new Date().toISOString(),
    end_date: endDate?.toISOString(),
    next_billing_date: nextBillingDate?.toISOString(),
    metadata: {
      customer_name: session.customer_details?.name,
      amount_paid: session.amount_total / 100,
      currency: session.currency,
    },
  });

  if (purchaseError) {
    console.error('❌ Error creating purchase:', purchaseError);
    return;
  }

  console.log('✅ Purchase activated for user:', userId);

  // TODO: Send notification/email to user
}

async function handleSubscriptionUpdated(supabase: any, event: StripeEvent) {
  console.log('🔄 Processing subscription update');
  const subscription = event.data.object;
  
  const { error } = await supabase
    .from('user_purchases')
    .update({
      next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('❌ Error updating subscription:', error);
  }
}

async function handleProgramPurchaseCompleted(supabase: any, session: any) {
  console.log('🎓 Processing program purchase completion');

  const { purchase_id, program_id, athlete_id } = session.metadata;

  if (!purchase_id || !program_id || !athlete_id) {
    console.error('❌ Missing metadata for program purchase');
    return;
  }

  // Update purchase status to completed
  const { error: updateError } = await supabase
    .from('program_purchases')
    .update({
      status: 'completed',
      stripe_payment_intent_id: session.payment_intent,
      purchased_at: new Date().toISOString(),
    })
    .eq('id', purchase_id);

  if (updateError) {
    console.error('❌ Error updating program purchase:', updateError);
    return;
  }

  console.log('✅ Program purchase completed:', purchase_id);
  // The trigger will automatically create the athlete_program record
}

async function handleMembershipSubscriptionCreated(supabase: any, session: any) {
  console.log('💎 Processing membership subscription creation');

  const { user_id, membership_id, billing_cycle } = session.metadata;

  if (!user_id || !membership_id) {
    console.error('❌ Missing metadata for membership subscription');
    return;
  }

  // Get subscription details
  const subscriptionId = session.subscription;

  // Get membership details for invoice
  const { data: membership } = await supabase
    .from('memberships')
    .select('name, price, currency')
    .eq('id', membership_id)
    .maybeSingle();

  // Create membership access record
  const { error: accessError } = await supabase
    .from('membership_access')
    .insert({
      membership_id: membership_id,
      user_id: user_id,
      assigned_by: user_id, // Self-assigned via purchase
      start_date: new Date().toISOString(),
      status: 'active',
      source: 'stripe',
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscriptionId,
      stripe_checkout_session_id: session.id,
      notes: `Subscribed via Stripe (${billing_cycle})`,
    });

  if (accessError) {
    console.error('❌ Error creating membership access:', accessError);
    return;
  }

  console.log('✅ Membership access created for user:', user_id);

  // Create invoice
  await createInvoice(supabase, {
    user_id,
    amount: session.amount_total / 100,
    currency: session.currency || membership?.currency || 'usd',
    description: `${membership?.name || 'Membership'} subscription - ${billing_cycle}`,
    stripe_session_id: session.id,
    stripe_subscription_id: subscriptionId,
    metadata: {
      membership_id,
      billing_cycle,
      customer_name: session.customer_details?.name,
    }
  });

  console.log('✅ Invoice created for membership subscription');
}

async function handleSubscriptionActive(supabase: any, event: StripeEvent) {
  console.log('🔄 Processing subscription activation');

  const subscription = event.data.object;
  const metadata = subscription.metadata;

  if (metadata?.type === 'membership_subscription' || metadata?.membership_id) {
    // Membership stays active — end_date is informational only, does not expire membership
    const { error } = await supabase
      .from('membership_access')
      .update({
        status: 'active',
        end_date: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('❌ Error updating membership access:', error);
    } else {
      console.log('✅ Membership access updated for subscription:', subscription.id);
    }
  }
}

async function handleSubscriptionCanceled(supabase: any, event: StripeEvent) {
  console.log('❌ Processing subscription cancellation');
  const subscription = event.data.object;

  // For membership subscriptions: cancel the paid tier and revert user to Inicia (free)
  if (subscription.metadata?.membership_id || subscription.metadata?.type === 'membership_subscription') {
    const stripeSubId = subscription.id || subscription.subscription;

    // Find the user this subscription belongs to
    const { data: accessRow } = await supabase
      .from('membership_access')
      .select('user_id')
      .eq('stripe_subscription_id', stripeSubId)
      .maybeSingle();

    if (accessRow?.user_id) {
      // Cancel the paid membership record
      await supabase
        .from('membership_access')
        .update({
          status: 'canceled',
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', stripeSubId);

      // Revert user to Inicia free tier
      const { data: iniciaData } = await supabase
        .from('memberships')
        .select('id')
        .eq('slug', 'inicia')
        .maybeSingle();

      if (iniciaData?.id) {
        await supabase.from('membership_access').insert({
          user_id: accessRow.user_id,
          membership_id: iniciaData.id,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: null,
          source: 'manual',
          notes: 'Reverted to Inicia after Stripe subscription canceled',
        });
        console.log('✅ User reverted to Inicia after cancellation:', accessRow.user_id);
      }
    } else {
      console.log('⚠️ No membership_access found for subscription:', stripeSubId);
    }
    return;
  }

  // Non-membership subscriptions (programs, etc.)
  const { error } = await supabase
    .from('user_purchases')
    .update({
      status: 'canceled',
      end_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id || subscription.subscription);

  if (error) {
    console.error('❌ Error canceling subscription:', error);
  }
}

async function createInvoice(supabase: any, invoiceData: {
  user_id: string;
  amount: number;
  currency: string;
  description: string;
  stripe_session_id?: string;
  stripe_subscription_id?: string;
  metadata?: any;
}) {
  console.log('📄 Creating invoice for user:', invoiceData.user_id);

  // Get user profile for invoice details
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', invoiceData.user_id)
    .maybeSingle();

  // Generate invoice number
  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const today = new Date().toISOString().split('T')[0];

  // Create invoice with correct column names
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      issued_by: invoiceData.user_id,
      issued_to: invoiceData.user_id,
      issue_date: today,
      due_date: today,
      status: 'paid',
      subtotal: invoiceData.amount,
      tax_rate: 0,
      tax_amount: 0,
      total: invoiceData.amount,
      currency: invoiceData.currency.toUpperCase(),
      payment_method: 'stripe',
      payment_date: today,
      notes: invoiceData.description,
    })
    .select()
    .single();

  if (invoiceError) {
    console.error('❌ Error creating invoice:', invoiceError);
    return null;
  }

  // Create invoice items with correct column names
  const { error: itemError } = await supabase
    .from('invoice_items')
    .insert({
      invoice_id: invoice.id,
      description: invoiceData.description,
      quantity: 1,
      unit_price: invoiceData.amount,
      total: invoiceData.amount,
    });

  if (itemError) {
    console.error('❌ Error creating invoice items:', itemError);
  }

  console.log('✅ Invoice created:', invoiceNumber);
  return invoice;
}
