import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

interface LocalizedText {
  es: { title: string; body: string };
  en: { title: string; body: string };
}

function getLocalizedMessages(
  table: string,
  record: Record<string, any>,
  senderName?: string
): LocalizedText | null {
  switch (table) {
    case "chat_messages":
      return {
        es: {
          title: senderName || "Tu entrenador",
          body: record.content?.slice(0, 100) || "Te ha enviado un mensaje",
        },
        en: {
          title: senderName || "Your coach",
          body: record.content?.slice(0, 100) || "Sent you a message",
        },
      };

    case "athlete_workouts":
      return {
        es: {
          title: "Nuevo entrenamiento",
          body: record.name
            ? `Se te ha asignado: ${record.name}`
            : "Tienes un nuevo entrenamiento asignado",
        },
        en: {
          title: "New workout",
          body: record.name
            ? `Assigned to you: ${record.name}`
            : "You have a new workout assigned",
        },
      };

    case "meal_plans":
      return {
        es: {
          title: "Nuevo plan de nutricion",
          body: record.name
            ? `Plan asignado: ${record.name}`
            : "Tienes un nuevo plan de nutricion",
        },
        en: {
          title: "New nutrition plan",
          body: record.name
            ? `Plan assigned: ${record.name}`
            : "You have a new nutrition plan",
        },
      };

    case "nutrition_pushed_plans":
      return {
        es: {
          title: "Nuevo plan de nutricion",
          body: "Tu entrenador te ha enviado un plan de nutricion",
        },
        en: {
          title: "New nutrition plan",
          body: "Your coach has sent you a nutrition plan",
        },
      };

    case "courses":
      return {
        es: {
          title: "Nuevo curso disponible",
          body: record.title
            ? `${record.title} ya esta disponible en Academy`
            : "Hay un nuevo curso disponible en Academy",
        },
        en: {
          title: "New course available",
          body: record.title
            ? `${record.title} is now available in Academy`
            : "There is a new course available in Academy",
        },
      };

    case "user_habits":
      return {
        es: {
          title: "Nuevo habito asignado",
          body: record.name
            ? `Nuevo habito: ${record.name}`
            : "Se te ha asignado un nuevo habito",
        },
        en: {
          title: "New habit assigned",
          body: record.name
            ? `New habit: ${record.name}`
            : "You have been assigned a new habit",
        },
      };

    case "external_endurance_plans":
      return {
        es: {
          title: "Nuevo plan de entrenamiento",
          body: record.plan_name
            ? `Plan de resistencia: ${record.plan_name}`
            : "Tu entrenador te ha enviado un plan de entrenamiento",
        },
        en: {
          title: "New training plan",
          body: record.plan_name
            ? `Endurance plan: ${record.plan_name}`
            : "Your coach has sent you a training plan",
        },
      };

    case "digest_articles":
      return {
        es: {
          title: "Nueva Performance Pill",
          body: record.title || "Hay un nuevo articulo disponible",
        },
        en: {
          title: "New Performance Pill",
          body: record.title || "A new article is available",
        },
      };

    default:
      return null;
  }
}

function buildEmailHtml(title: string, body: string, lang: string): string {
  const footerText =
    lang === "es"
      ? "Abre la app Asciende para ver los detalles."
      : "Open the Asciende app to view the details.";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
            <p style="color:#64748b;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:2px;">ASCIENDE</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
            <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px 0;">${title}</h1>
            <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px 0;">${body}</p>
            <p style="color:#94a3b8;font-size:13px;margin:0;">${footerText}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmailNotifications(
  supabase: any,
  supabaseUrl: string,
  userIds: string[],
  localizedMessages: LocalizedText,
  category: string
): Promise<void> {
  // Respect same preferences as push notifications
  let eligibleUserIds = userIds;
  if (category) {
    const { data: prefs } = await supabase
      .from("push_notification_preferences")
      .select(`user_id, ${category}`)
      .in("user_id", userIds);

    if (prefs && prefs.length > 0) {
      const disabledUsers = new Set(
        prefs.filter((p: any) => p[category] === false).map((p: any) => p.user_id)
      );
      eligibleUserIds = userIds.filter((id) => !disabledUsers.has(id));
    }
  }

  if (eligibleUserIds.length === 0) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, language")
    .in("id", eligibleUserIds);

  if (!profiles || profiles.length === 0) return;

  const emailsByLang: Record<"es" | "en", string[]> = { es: [], en: [] };
  for (const profile of profiles) {
    if (!profile.email) continue;
    const lang = profile.language === "es" ? "es" : "en";
    emailsByLang[lang].push(profile.email);
  }

  const emailUrl = `${supabaseUrl}/functions/v1/brevo-send-email`;

  for (const lang of ["es", "en"] as const) {
    const emails = emailsByLang[lang];
    if (emails.length === 0) continue;

    const msg = localizedMessages[lang];
    await fetch(emailUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: emails,
        subject: msg.title,
        htmlContent: buildEmailHtml(msg.title, msg.body, lang),
      }),
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    const { type, table, record, old_record } = payload;

    // Allow UPDATE only for meaningful publish events
    if (type === "UPDATE") {
      const isCoursePublished =
        table === "courses" &&
        record.is_published === true &&
        old_record?.is_published !== true;
      const isArticlePublished =
        table === "digest_articles" &&
        record.is_published === true &&
        old_record?.is_published !== true;

      if (!isCoursePublished && !isArticlePublished) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "UPDATE not a publish event" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (type === "DELETE") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "DELETE not handled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetUserIds: string[] = [];
    let category = "";
    let data: Record<string, string> = {};
    let senderName: string | undefined;

    switch (table) {
      case "chat_messages": {
        const conversationId = record.conversation_id;
        const senderId = record.sender_id;

        const { data: participants } = await supabase
          .from("chat_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", senderId);

        if (participants) {
          targetUserIds = participants.map((p: any) => p.user_id);
        }

        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", senderId)
          .maybeSingle();

        senderName = senderProfile?.full_name || undefined;
        category = "trainer_messages";
        data = { page: "chat" };
        break;
      }

      case "athlete_workouts": {
        const athleteId = record.athlete_id;
        if (!athleteId) break;
        targetUserIds = [athleteId];
        category = "new_training_plan";
        data = { page: "training" };
        break;
      }

      case "meal_plans": {
        const athleteId = record.athlete_id;
        if (!athleteId) break;
        targetUserIds = [athleteId];
        category = "new_nutrition_plan";
        data = { page: "nutrition-dashboard" };
        break;
      }

      case "nutrition_pushed_plans": {
        const athleteId = record.athlete_id;
        if (!athleteId) break;
        targetUserIds = [athleteId];
        category = "new_nutrition_plan";
        data = { page: "nutrition-dashboard" };
        break;
      }

      case "courses": {
        // Fire on INSERT (if already published) or UPDATE (when published)
        if (!record.is_published && !record.is_active) break;
        const { data: athletes } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "athlete");

        if (athletes) {
          targetUserIds = athletes.map((a: any) => a.id);
        }
        category = "new_academy_course";
        data = { page: "dashboard" };
        break;
      }

      case "user_habits": {
        const userId = record.user_id;
        if (!userId) break;
        const createdBy = record.created_by;
        if (createdBy && createdBy === userId) break;
        targetUserIds = [userId];
        category = "new_habit";
        data = { page: "habits" };
        break;
      }

      case "external_endurance_plans": {
        const athleteId = record.athlete_id;
        if (!athleteId) break;
        targetUserIds = [athleteId];
        category = "new_training_plan";
        data = { page: "training" };
        break;
      }

      case "digest_articles": {
        if (!record.is_published) break;
        const { data: athletes } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "athlete");

        if (athletes) {
          targetUserIds = athletes.map((a: any) => a.id);
        }
        category = "performance_pills";
        data = { page: "digest" };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ skipped: true, reason: `Table '${table}' not handled` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No target users" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const localizedMessages = getLocalizedMessages(table, record, senderName);
    if (!localizedMessages) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No messages for table" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group target users by preferred language
    const { data: userProfiles } = await supabase
      .from("profiles")
      .select("id, language")
      .in("id", targetUserIds);

    const usersByLang: Record<string, string[]> = { es: [], en: [] };
    for (const userId of targetUserIds) {
      const profile = userProfiles?.find((p: any) => p.id === userId);
      const lang = profile?.language === "es" ? "es" : "en";
      usersByLang[lang].push(userId);
    }

    const sendUrl = `${supabaseUrl}/functions/v1/send-push-notification`;
    const pushResults: any[] = [];

    // Send push notifications (grouped by language)
    for (const lang of ["es", "en"] as const) {
      const ids = usersByLang[lang];
      if (ids.length === 0) continue;

      const msg = localizedMessages[lang];
      const response = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: ids,
          title: msg.title,
          body: msg.body,
          data,
          category,
        }),
      });

      const result = await response.json();
      pushResults.push({ lang, ...result });
    }

    // Send email notifications (fire-and-forget, same preference gates)
    sendEmailNotifications(
      supabase,
      supabaseUrl,
      targetUserIds,
      localizedMessages,
      category
    ).catch((err) => console.error("Email notification error:", err));

    return new Response(
      JSON.stringify({ success: true, table, type, category, push: pushResults }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("push-notification-trigger error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
