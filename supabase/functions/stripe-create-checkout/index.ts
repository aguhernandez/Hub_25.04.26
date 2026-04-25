import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { membershipId, billingCycle, userId } = await req.json();

    // Get Stripe secret key from environment
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      throw new Error("Stripe not configured. Add STRIPE_SECRET_KEY to environment variables.");
    }

    // Create Stripe checkout session
    const session = await createStripeCheckout({
      stripeKey,
      membershipId,
      billingCycle,
      userId,
      successUrl: `${req.headers.get("origin")}/membership?success=true`,
      cancelUrl: `${req.headers.get("origin")}/membership?canceled=true`,
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createStripeCheckout(params: any) {
  const { stripeKey, membershipId, billingCycle, userId, successUrl, cancelUrl } = params;

  // Mock response for testing without Stripe configured
  return {
    id: "mock_session_" + Date.now(),
    url: successUrl + "&mock=true"
  };

  // Real Stripe implementation (uncomment when ready):
  /*
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: billingCycle === "monthly" ? "Monthly Membership" : "Annual Membership",
          },
          unit_amount: billingCycle === "monthly" ? 2999 : 28799,
          recurring: {
            interval: billingCycle === "monthly" ? "month" : "year",
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: {
      userId,
      membershipId,
      billingCycle,
    },
  });

  return session;
  */
}
