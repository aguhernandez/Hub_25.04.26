import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface FeedbackRequest {
  name: string;
  email: string;
  type: 'bug' | 'suggestion' | 'improvement' | 'other';
  description: string;
  timestamp: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'bug': 'Report a bug',
    'suggestion': 'Suggestion',
    'improvement': 'Feature improvement',
    'other': 'Other'
  };
  return typeMap[type] || 'Other';
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const feedback: FeedbackRequest = await req.json();

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoApiKey) {
      console.warn("⚠️ BREVO_API_KEY not configured - Feedback email NOT sent (mock mode)");
      return new Response(
        JSON.stringify({
          success: false,
          mock: true,
          message: "Brevo API key not configured. Email not sent.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeLabel = getTypeLabel(feedback.type);
    const formattedDate = new Date(feedback.timestamp).toLocaleString('es-ES', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const htmlContent = `
      <h2 style="color: #333; margin-bottom: 20px;">Nuevo Feedback desde Asciende</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; font-family: Arial, sans-serif;">
        <p><strong>Nombre:</strong> ${feedback.name || 'No proporcionado'}</p>
        <p><strong>Email:</strong> ${feedback.email || 'No proporcionado'}</p>
        <p><strong>Tipo:</strong> ${typeLabel}</p>
        <p><strong>Fecha y Hora:</strong> ${formattedDate}</p>

        <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px;">
          <p><strong>Descripción:</strong></p>
          <p style="white-space: pre-wrap; color: #555;">
            ${feedback.description}
          </p>
        </div>
      </div>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        to: [
          {
            email: "asciendepro@gmail.com",
            name: "Asciende Feedback"
          }
        ],
        sender: {
          email: "noreply@asciende.com",
          name: "Asciende"
        },
        subject: "Nuevo Feedback desde Asciende",
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Brevo API error:", response.status, errorData);
      throw new Error(`Brevo API error: ${response.status}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Feedback sent successfully",
        messageId: result.messageId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error processing feedback:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
