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

    default:
      return null;
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
    const { type, table, record } = payload;

    if (type !== "INSERT") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Only INSERT events are handled" }),
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
        if (record.status !== "published") break;
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

    // Fetch user languages to group by locale
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
    const results: any[] = [];

    for (const lang of ["es", "en"] as const) {
      const ids = usersByLang[lang];
      if (ids.length === 0) continue;

      const msg = localizedMessages[lang];
      const response = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_ids: ids,
          title: msg.title,
          body: msg.body,
          data,
          category,
        }),
      });

      const result = await response.json();
      results.push({ lang, ...result });
    }

    return new Response(
      JSON.stringify({ success: true, table, category, results }),
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
