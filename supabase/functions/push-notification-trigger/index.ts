import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * This function is called as a Supabase Database Webhook.
 * It detects the type of event and sends push notifications to the appropriate users.
 *
 * Supported triggers:
 * 1. New chat message -> notify recipient (category: trainer_messages)
 * 2. New workout assigned -> notify athlete (category: new_training_plan)
 * 3. New meal plan assigned -> notify athlete (category: new_nutrition_plan)
 * 4. New course published -> notify all athletes (category: new_academy_course)
 * 5. New habit assigned -> notify athlete (category: new_habit)
 */

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
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
    let title = "";
    let body = "";
    let category = "";
    let data: Record<string, string> = {};

    switch (table) {
      case "chat_messages": {
        // New chat message: notify the other participant
        const conversationId = record.conversation_id;
        const senderId = record.sender_id;

        // Get conversation participants
        const { data: participants } = await supabase
          .from("chat_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", senderId);

        if (participants) {
          targetUserIds = participants.map((p: any) => p.user_id);
        }

        // Get sender name
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", senderId)
          .maybeSingle();

        const senderName = senderProfile?.full_name || "Tu entrenador";
        title = senderName;
        body = record.content?.slice(0, 100) || "Te ha enviado un mensaje";
        category = "trainer_messages";
        data = { page: "chat" };
        break;
      }

      case "athlete_workouts": {
        // New workout assigned to athlete
        const athleteId = record.athlete_id;
        if (!athleteId) break;

        targetUserIds = [athleteId];
        title = "Nuevo entrenamiento";
        body = record.name
          ? `Se te ha asignado: ${record.name}`
          : "Tienes un nuevo entrenamiento asignado";
        category = "new_training_plan";
        data = { page: "training" };
        break;
      }

      case "meal_plans": {
        // New meal plan assigned to athlete
        const athleteId = record.athlete_id;
        if (!athleteId) break;

        targetUserIds = [athleteId];
        title = "Nuevo plan de nutricion";
        body = record.name
          ? `Plan asignado: ${record.name}`
          : "Tienes un nuevo plan de nutricion";
        category = "new_nutrition_plan";
        data = { page: "nutrition-dashboard" };
        break;
      }

      case "nutrition_pushed_plans": {
        // Nutrition plan pushed to athlete
        const athleteId = record.athlete_id;
        if (!athleteId) break;

        targetUserIds = [athleteId];
        title = "Nuevo plan de nutricion";
        body = "Tu entrenador te ha enviado un plan de nutricion";
        category = "new_nutrition_plan";
        data = { page: "nutrition-dashboard" };
        break;
      }

      case "courses": {
        // New course published - notify all athletes
        if (record.status !== "published") break;

        const { data: athletes } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "athlete");

        if (athletes) {
          targetUserIds = athletes.map((a: any) => a.id);
        }

        title = "Nuevo curso disponible";
        body = record.title
          ? `${record.title} ya esta disponible en Academy`
          : "Hay un nuevo curso disponible en Academy";
        category = "new_academy_course";
        data = { page: "dashboard" };
        break;
      }

      case "user_habits": {
        // New habit assigned to user
        const userId = record.user_id;
        if (!userId) break;

        // Only notify if someone else assigned it (trainer)
        const createdBy = record.created_by;
        if (createdBy && createdBy === userId) break;

        targetUserIds = [userId];
        title = "Nuevo habito asignado";
        body = record.name
          ? `Nuevo habito: ${record.name}`
          : "Se te ha asignado un nuevo habito";
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

    if (targetUserIds.length === 0 || !title) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No target users or empty notification" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the send-push-notification function
    const sendUrl = `${supabaseUrl}/functions/v1/send-push-notification`;
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_ids: targetUserIds,
        title,
        body,
        data,
        category,
      }),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, table, category, ...result }),
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
