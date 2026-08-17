import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature',
};

interface StripeEvent {
  id: string;
  type: string;
  data: { object: any };
}

// ── Structured logger ──────────────────────────────────────────────────────────
function log(level: 'INFO' | 'WARN' | 'ERROR', step: string, data?: any) {
  const entry = { level, step, ts: new Date().toISOString(), ...(data ?? {}) };
  if (level === 'ERROR') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  log('INFO', 'webhook_received', { method: req.method });

  const body = await req.text();
  log('INFO', 'body_read', { bytes: body.length });

  // ── Signature verification ─────────────────────────────────────────────────
  const signature = req.headers.get('stripe-signature');
  if (webhookSecret) {
    if (!signature) {
      log('ERROR', 'signature_missing');
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    log('INFO', 'signature_present', { sig_prefix: signature.slice(0, 20) });
  } else {
    log('WARN', 'signature_check_skipped', { reason: 'STRIPE_WEBHOOK_SECRET not configured' });
  }

  // ── Parse event ────────────────────────────────────────────────────────────
  let event: StripeEvent;
  try {
    event = JSON.parse(body);
  } catch (parseErr: any) {
    log('ERROR', 'body_parse_failed', { error: parseErr.message });
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  log('INFO', 'event_parsed', { event_id: event.id, event_type: event.type });

  // ── Idempotency: skip already-processed events ─────────────────────────────
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('id, processed')
    .eq('event_id', event.id)
    .maybeSingle();

  if (existing?.processed) {
    log('INFO', 'event_already_processed', { event_id: event.id });
    return new Response(
      JSON.stringify({ received: true, skipped: 'already processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Log event to DB (upsert for retries) ──────────────────────────────────
  await supabase.from('stripe_webhook_events').upsert(
    { event_id: event.id, event_type: event.type, raw_payload: event, processed: false },
    { onConflict: 'event_id' },
  );

  // ── Route event ────────────────────────────────────────────────────────────
  let processingError: string | null = null;
  try {
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
        log('INFO', 'event_unhandled', { event_type: event.type });
    }
  } catch (err: any) {
    processingError = `${err.message}\n${err.stack ?? ''}`;
    log('ERROR', 'event_processing_failed', {
      event_id: event.id,
      event_type: event.type,
      error: err.message,
      stack: err.stack,
    });
  }

  // ── Mark event processed (or store error) ─────────────────────────────────
  await supabase
    .from('stripe_webhook_events')
    .update({
      processed: !processingError,
      processed_at: processingError ? null : new Date().toISOString(),
      error_message: processingError,
    })
    .eq('event_id', event.id);

  // Always return 200 so Stripe doesn't retry on processing errors
  log('INFO', 'webhook_complete', { event_id: event.id, success: !processingError });
  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

// ── checkout.session.completed ─────────────────────────────────────────────────
async function handleCheckoutCompleted(supabase: any, event: StripeEvent) {
  const session = event.data.object;
  log('INFO', 'checkout_session_received', {
    session_id: session.id,
    customer_id: session.customer,
    customer_email: session.customer_email || session.customer_details?.email,
    metadata: session.metadata,
    amount_total: session.amount_total,
    currency: session.currency,
  });

  if (session.metadata?.type === 'program_purchase') {
    await handleProgramPurchaseCompleted(supabase, session);
    return;
  }
  if (session.metadata?.type === 'membership_subscription') {
    await handleMembershipSubscriptionCreated(supabase, session);
    return;
  }

  // Generic product purchase path
  const customerEmail = session.customer_email || session.customer_details?.email;
  const priceId = session.line_items?.data?.[0]?.price?.id || session.metadata?.price_id;

  if (!customerEmail) {
    log('ERROR', 'checkout_no_email', { session_id: session.id });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', customerEmail)
    .maybeSingle();

  if (profileError) {
    log('ERROR', 'checkout_profile_lookup_failed', { error: profileError.message });
    return;
  }

  let userId = profile?.id;

  if (!userId) {
    log('INFO', 'checkout_creating_user', { email: customerEmail });
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
      log('ERROR', 'checkout_user_create_failed', { error: authError.message });
      return;
    }
    userId = authData.user.id;
    log('INFO', 'checkout_user_created', { user_id: userId });
  }

  const { data: product, error: productError } = await supabase
    .from('stripe_products')
    .select('*')
    .eq('stripe_price_id', priceId)
    .maybeSingle();

  if (productError || !product) {
    log('ERROR', 'checkout_product_not_found', { price_id: priceId, error: productError?.message });
    return;
  }

  log('INFO', 'checkout_product_found', { product_id: product.id, product_name: product.name, type: product.type });

  let endDate = null;
  let nextBillingDate = null;
  if (product.type === 'program' && product.duration_weeks) {
    const start = new Date();
    endDate = new Date(start);
    endDate.setDate(endDate.getDate() + product.duration_weeks * 7);
  } else if (product.type === 'membership') {
    nextBillingDate = new Date();
    if (product.billing_cycle === 'monthly') nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    else if (product.billing_cycle === 'yearly') nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  }

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
    log('ERROR', 'checkout_purchase_insert_failed', { error: purchaseError.message });
    return;
  }

  log('INFO', 'checkout_generic_purchase_activated', { user_id: userId, product_id: product.id });
}

// ── Program purchase flow ──────────────────────────────────────────────────────
async function handleProgramPurchaseCompleted(supabase: any, session: any) {
  const { purchase_id, program_id, athlete_id } = session.metadata ?? {};

  log('INFO', 'program_purchase_start', {
    session_id: session.id,
    purchase_id,
    program_id,
    athlete_id,
    payment_intent: session.payment_intent,
    amount_total: session.amount_total,
  });

  if (!purchase_id || !program_id || !athlete_id) {
    log('ERROR', 'program_purchase_missing_metadata', {
      has_purchase_id: !!purchase_id,
      has_program_id: !!program_id,
      has_athlete_id: !!athlete_id,
    });
    return;
  }

  // ── Idempotency: skip if already completed ─────────────────────────────────
  const { data: existingPurchase, error: fetchErr } = await supabase
    .from('program_purchases')
    .select('id, status')
    .eq('id', purchase_id)
    .maybeSingle();

  if (fetchErr) {
    log('ERROR', 'program_purchase_fetch_failed', { error: fetchErr.message, purchase_id });
    throw fetchErr;
  }

  if (!existingPurchase) {
    log('ERROR', 'program_purchase_not_found', { purchase_id });
    return;
  }

  if (existingPurchase.status === 'completed') {
    log('INFO', 'program_purchase_already_completed', { purchase_id });
    return;
  }

  // ── Fetch program details ──────────────────────────────────────────────────
  const { data: program, error: programErr } = await supabase
    .from('program_products')
    .select('id, title, duration_weeks, trainer_id')
    .eq('id', program_id)
    .maybeSingle();

  if (programErr || !program) {
    log('ERROR', 'program_product_not_found', { program_id, error: programErr?.message });
    throw new Error(`Program ${program_id} not found: ${programErr?.message}`);
  }

  log('INFO', 'program_product_found', {
    program_id: program.id,
    title: program.title,
    duration_weeks: program.duration_weeks,
    trainer_id: program.trainer_id,
  });

  // ── Verify athlete exists ──────────────────────────────────────────────────
  const { data: athlete, error: athleteErr } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', athlete_id)
    .maybeSingle();

  if (athleteErr || !athlete) {
    log('ERROR', 'athlete_not_found', { athlete_id, error: athleteErr?.message });
    throw new Error(`Athlete ${athlete_id} not found`);
  }

  log('INFO', 'athlete_found', { athlete_id: athlete.id, email: athlete.email });

  // ── Update program_purchases to completed ──────────────────────────────────
  const { error: updateErr } = await supabase
    .from('program_purchases')
    .update({
      status: 'completed',
      payment_id: session.payment_intent || session.id,
      purchase_date: new Date().toISOString(),
    })
    .eq('id', purchase_id);

  if (updateErr) {
    log('ERROR', 'program_purchase_update_failed', { error: updateErr.message, purchase_id });
    throw updateErr;
  }

  log('INFO', 'program_purchase_updated', { purchase_id, status: 'completed' });

  // ── Upsert athlete_programs (idempotent) ───────────────────────────────────
  const startDate = new Date().toISOString().split('T')[0];
  const { data: athleteProgram, error: apErr } = await supabase
    .from('athlete_programs')
    .upsert(
      {
        athlete_id,
        program_product_id: program_id,
        purchase_id,
        trainer_id: program.trainer_id ?? null,
        start_date: startDate,
        assigned_date: startDate,
        status: 'active',
      },
      { onConflict: 'athlete_id,program_product_id,assigned_date', ignoreDuplicates: true },
    )
    .select('id')
    .maybeSingle();

  if (apErr) {
    log('ERROR', 'athlete_program_upsert_failed', { error: apErr.message });
    throw apErr;
  }

  log('INFO', 'athlete_program_upserted', { athlete_program_id: athleteProgram?.id });

  // ── Copy workouts to athlete_workouts ──────────────────────────────────────
  const workedOut = await copyProgramWorkouts(supabase, program_id, program.title, startDate, athlete_id, program.trainer_id);
  log('INFO', 'program_workouts_copied', { days_created: workedOut });

  // ── Create invoice ─────────────────────────────────────────────────────────
  await createInvoice(supabase, {
    user_id: athlete_id,
    amount: (session.amount_total ?? 0) / 100,
    currency: session.currency || 'usd',
    description: `${program.title} — Training Program`,
    payment_id: session.payment_intent || session.id,
  });

  log('INFO', 'program_purchase_flow_complete', {
    purchase_id,
    program_id,
    athlete_id,
    days_created: workedOut,
  });
}

// ── Copy program workouts to athlete_workouts ──────────────────────────────────
async function copyProgramWorkouts(
  supabase: any,
  programId: string,
  programTitle: string,
  startDateStr: string,
  athleteId: string,
  trainerId: string | null,
): Promise<number> {
  // Idempotency: skip if already copied
  const { count: existing } = await supabase
    .from('athlete_workouts')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_id', athleteId)
    .eq('source', 'program')
    .gte('scheduled_date', startDateStr);

  const { data: weeks } = await supabase
    .from('program_weeks')
    .select(`
      id, week_number,
      program_days(id, day_number, day_name,
        program_day_workouts(id, exercise_id, sets, reps, rir, rest_seconds, notes, order_index, load)
      )
    `)
    .eq('program_product_id', programId)
    .order('week_number');

  if (!weeks?.length) {
    log('WARN', 'workouts_copy_no_weeks', { program_id: programId });
    return 0;
  }

  const start = new Date(startDateStr + 'T12:00:00');
  let daysCreated = 0;

  for (const week of weeks) {
    const weekOffset = (week.week_number - 1) * 7;
    for (const day of (week.program_days ?? [])) {
      if (!day.program_day_workouts?.length) continue;

      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + weekOffset + (day.day_number - 1));
      const scheduledDate = dayDate.toISOString().split('T')[0];

      // Idempotency per day: skip if this exact day already exists
      const { count: dayExists } = await supabase
        .from('athlete_workouts')
        .select('id', { count: 'exact', head: true })
        .eq('athlete_id', athleteId)
        .eq('source', 'program')
        .eq('scheduled_date', scheduledDate);

      if ((dayExists ?? 0) > 0) continue;

      // Create the workout definition
      const { data: workout, error: wErr } = await supabase
        .from('workouts')
        .insert({
          trainer_id: trainerId,
          name: day.day_name || `Week ${week.week_number} - Day ${day.day_number}`,
          description: `${programTitle} — Week ${week.week_number}`,
        })
        .select('id')
        .single();

      if (wErr || !workout) {
        log('ERROR', 'workouts_copy_insert_failed', {
          error: wErr?.message,
          week: week.week_number,
          day: day.day_number,
        });
        continue;
      }

      // Link workout to athlete
      const { error: awErr } = await supabase.from('athlete_workouts').insert({
        athlete_id: athleteId,
        workout_id: workout.id,
        scheduled_date: scheduledDate,
        status: 'pending',
        source: 'program',
        trainer_id: trainerId,
        assignment_type: 'individual',
      });

      if (awErr) {
        log('ERROR', 'athlete_workouts_insert_failed', { error: awErr.message, scheduled_date: scheduledDate });
        continue;
      }

      // Copy exercises
      const exercises = day.program_day_workouts.map((pdw: any, idx: number) => ({
        workout_id: workout.id,
        exercise_id: pdw.exercise_id,
        sets: pdw.sets ?? 3,
        reps: pdw.reps != null ? String(pdw.reps) : '8-10',
        rest_seconds: pdw.rest_seconds ?? 90,
        notes: pdw.notes ?? null,
        order_index: pdw.order_index ?? idx,
        rir: pdw.rir ?? null,
      }));

      if (exercises.length > 0) {
        const { error: exErr } = await supabase.from('workout_exercises').insert(exercises);
        if (exErr) {
          log('WARN', 'workout_exercises_insert_failed', { error: exErr.message, workout_id: workout.id });
        }
      }

      daysCreated++;
    }
  }

  return daysCreated;
}

// ── Membership subscription created ───────────────────────────────────────────
async function handleMembershipSubscriptionCreated(supabase: any, session: any) {
  log('INFO', 'membership_subscription_start', {
    session_id: session.id,
    metadata: session.metadata,
  });

  const { user_id, membership_id, billing_cycle } = session.metadata ?? {};

  if (!user_id || !membership_id) {
    log('ERROR', 'membership_subscription_missing_metadata', { user_id, membership_id });
    return;
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('name, price, currency')
    .eq('id', membership_id)
    .maybeSingle();

  const { error: accessError } = await supabase.from('membership_access').insert({
    membership_id,
    user_id,
    assigned_by: user_id,
    start_date: new Date().toISOString(),
    status: 'active',
    source: 'stripe',
    stripe_customer_id: session.customer,
    stripe_subscription_id: session.subscription,
    stripe_checkout_session_id: session.id,
    notes: `Subscribed via Stripe (${billing_cycle})`,
  });

  if (accessError) {
    log('ERROR', 'membership_access_insert_failed', { error: accessError.message });
    throw accessError;
  }

  log('INFO', 'membership_access_created', { user_id, membership_id });

  await createInvoice(supabase, {
    user_id,
    amount: session.amount_total / 100,
    currency: session.currency || membership?.currency || 'usd',
    description: `${membership?.name || 'Membership'} subscription - ${billing_cycle}`,
    payment_id: session.id,
  });

  log('INFO', 'membership_subscription_complete', { user_id, membership_id });
}

// ── Subscription updated ───────────────────────────────────────────────────────
async function handleSubscriptionUpdated(supabase: any, event: StripeEvent) {
  const subscription = event.data.object;
  log('INFO', 'subscription_updated', { subscription_id: subscription.id });

  const { error } = await supabase
    .from('user_purchases')
    .update({ next_billing_date: new Date(subscription.current_period_end * 1000).toISOString() })
    .eq('stripe_subscription_id', subscription.id);

  if (error) log('ERROR', 'subscription_update_failed', { error: error.message });
}

// ── Subscription active (invoice.paid) ────────────────────────────────────────
async function handleSubscriptionActive(supabase: any, event: StripeEvent) {
  const subscription = event.data.object;
  log('INFO', 'subscription_active', { subscription_id: subscription.id });

  if (subscription.metadata?.membership_id || subscription.metadata?.type === 'membership_subscription') {
    const { error } = await supabase
      .from('membership_access')
      .update({
        status: 'active',
        end_date: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) log('ERROR', 'membership_access_update_failed', { error: error.message });
    else log('INFO', 'membership_access_renewed', { subscription_id: subscription.id });
  }
}

// ── Subscription canceled ─────────────────────────────────────────────────────
async function handleSubscriptionCanceled(supabase: any, event: StripeEvent) {
  const subscription = event.data.object;
  const stripeSubId = subscription.id || subscription.subscription;
  log('INFO', 'subscription_canceled', { subscription_id: stripeSubId, event_type: event.type });

  if (subscription.metadata?.membership_id || subscription.metadata?.type === 'membership_subscription') {
    const { data: accessRow } = await supabase
      .from('membership_access')
      .select('user_id')
      .eq('stripe_subscription_id', stripeSubId)
      .maybeSingle();

    if (accessRow?.user_id) {
      await supabase
        .from('membership_access')
        .update({ status: 'canceled', end_date: new Date().toISOString() })
        .eq('stripe_subscription_id', stripeSubId);

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
        log('INFO', 'membership_reverted_to_inicia', { user_id: accessRow.user_id });
      }
    } else {
      log('WARN', 'subscription_canceled_no_access_row', { subscription_id: stripeSubId });
    }
    return;
  }

  const { error } = await supabase
    .from('user_purchases')
    .update({ status: 'canceled', end_date: new Date().toISOString() })
    .eq('stripe_subscription_id', stripeSubId);

  if (error) log('ERROR', 'user_purchase_cancel_failed', { error: error.message });
}

// ── Invoice creation ───────────────────────────────────────────────────────────
async function createInvoice(supabase: any, data: {
  user_id: string;
  amount: number;
  currency: string;
  description: string;
  payment_id?: string;
}) {
  log('INFO', 'invoice_create_start', { user_id: data.user_id, amount: data.amount });

  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  const today = new Date().toISOString().split('T')[0];

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      issued_by: data.user_id,
      issued_to: data.user_id,
      issue_date: today,
      due_date: today,
      status: 'paid',
      subtotal: data.amount,
      tax_rate: 0,
      tax_amount: 0,
      total: data.amount,
      currency: data.currency.toUpperCase(),
      payment_method: 'stripe',
      payment_date: today,
      notes: data.description,
    })
    .select('id')
    .single();

  if (invoiceError) {
    log('ERROR', 'invoice_insert_failed', { error: invoiceError.message });
    return null;
  }

  await supabase.from('invoice_items').insert({
    invoice_id: invoice.id,
    description: data.description,
    quantity: 1,
    unit_price: data.amount,
    total: data.amount,
  });

  log('INFO', 'invoice_created', { invoice_number: invoiceNumber, invoice_id: invoice.id });
  return invoice;
}
