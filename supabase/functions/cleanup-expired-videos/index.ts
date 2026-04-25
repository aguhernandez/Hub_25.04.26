import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    const { data: expiredVideos, error: fetchError } = await supabase
      .from("chat_attachments")
      .select("*")
      .eq("file_type", "video")
      .not("expires_at", "is", null)
      .lt("expires_at", now);

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredVideos || expiredVideos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No expired videos found",
          deleted: 0
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let deletedCount = 0;
    const errors = [];

    for (const video of expiredVideos) {
      try {
        const urlParts = video.file_url.split("/");
        const filePath = urlParts.slice(-2).join("/");

        const { error: storageError } = await supabase.storage
          .from("chat-attachments")
          .remove([filePath]);

        if (storageError) {
          errors.push({
            id: video.id,
            error: storageError.message
          });
          continue;
        }

        const { error: dbError } = await supabase
          .from("chat_attachments")
          .delete()
          .eq("id", video.id);

        if (dbError) {
          errors.push({
            id: video.id,
            error: dbError.message
          });
        } else {
          deletedCount++;
        }
      } catch (err) {
        errors.push({
          id: video.id,
          error: String(err)
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup completed`,
        total: expiredVideos.length,
        deleted: deletedCount,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error)
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});