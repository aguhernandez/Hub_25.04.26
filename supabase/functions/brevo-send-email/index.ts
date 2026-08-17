import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const { to, subject, htmlContent, content, type } = await req.json();

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    // Support both content and htmlContent parameters
    const emailContent = htmlContent || content;

    // Convert to array if single email provided
    const recipients = Array.isArray(to) ? to : [to];

    console.log(`Processing email send to ${recipients.length} recipients`);
    console.log(`API Key found: ${brevoApiKey ? 'YES' : 'NO'}`);

    if (!brevoApiKey) {
      console.warn("⚠️ BREVO_API_KEY not configured - Email NOT sent (mock mode)");
      console.log("Would send:", { recipients: recipients.length, subject });
      return new Response(
        JSON.stringify({
          success: false,
          mock: true,
          message: "Brevo API key not configured. Email not sent.",
          recipients: recipients.length
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Brevo API (supports up to 50 recipients per request)
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    let totalSent = 0;
    const errors = [];

    for (const batch of batches) {
      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: "Asciende Team",
              email: "info@asciende.pro",
            },
            to: batch.map(email => ({ email })),
            subject: subject,
            htmlContent: emailContent,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Brevo API error: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        totalSent += batch.length;
        console.log(`✅ Batch sent successfully: ${batch.length} emails`);
      } catch (error) {
        console.error(`❌ Batch failed:`, error);
        errors.push({ batch: batch.length, error: error.message });
      }
    }

    if (errors.length > 0 && totalSent === 0) {
      throw new Error(`All batches failed: ${errors.map(e => e.error).join(', ')}`);
    }

    const response = {
      success: true,
      totalRecipients: recipients.length,
      sent: totalSent,
      failed: recipients.length - totalSent,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`📧 Email send complete:`, response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Brevo email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});