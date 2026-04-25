import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  dtstart: string;
  dtend: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting auto-sync for all TrainingPeaks connections...");

    // Get all active connections
    const { data: connections, error: connError } = await supabase
      .from("tp_connections")
      .select("*")
      .eq("sync_enabled", true)
      .neq("status", "disconnected");

    if (connError) {
      throw connError;
    }

    if (!connections || connections.length === 0) {
      console.log("No active connections to sync");
      return new Response(
        JSON.stringify({ message: "No active connections", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${connections.length} connections to sync`);

    let totalSynced = 0;
    let totalErrors = 0;

    // Sync each connection
    for (const connection of connections) {
      try {
        console.log(`Syncing athlete ${connection.athlete_id}...`);

        // Fetch ICS feed
        const icsResponse = await fetch(connection.ics_url);
        
        if (!icsResponse.ok) {
          const errorMsg = `Failed to fetch ICS: ${icsResponse.status}`;
          console.error(`Error for athlete ${connection.athlete_id}: ${errorMsg}`);
          
          await supabase
            .from("tp_connections")
            .update({ status: "error", last_error: errorMsg })
            .eq("id", connection.id);
          
          totalErrors++;
          continue;
        }

        const icsText = await icsResponse.text();
        const events = parseICS(icsText);
        console.log(`Parsed ${events.length} events for athlete ${connection.athlete_id}`);

        // Sync events
        const now = new Date().toISOString();
        let syncedCount = 0;

        for (const event of events) {
          try {
            const { data: existing } = await supabase
              .from("athlete_workouts")
              .select("id")
              .eq("athlete_id", connection.athlete_id)
              .eq("external_id", event.uid)
              .single();

            const workoutData = {
              athlete_id: connection.athlete_id,
              external_id: event.uid,
              external_title: event.summary,
              raw_description: event.description,
              scheduled_date: event.dtstart.split("T")[0],
              source: "trainingpeaks",
              synced_at: now,
              status: "pending",
              notes: `Synced from TrainingPeaks\n\n${event.description}`
            };

            if (existing) {
              await supabase
                .from("athlete_workouts")
                .update(workoutData)
                .eq("id", existing.id);
            } else {
              await supabase
                .from("athlete_workouts")
                .insert(workoutData);
            }
            
            syncedCount++;
          } catch (error) {
            console.error(`Error syncing event ${event.uid}:`, error);
          }
        }

        // Update connection status
        await supabase
          .from("tp_connections")
          .update({
            status: "connected",
            last_sync_at: now,
            last_error: null
          })
          .eq("id", connection.id);

        totalSynced += syncedCount;
        console.log(`Synced ${syncedCount} workouts for athlete ${connection.athlete_id}`);

      } catch (error: any) {
        console.error(`Error syncing athlete ${connection.athlete_id}:`, error);
        
        await supabase
          .from("tp_connections")
          .update({
            status: "error",
            last_error: error.message
          })
          .eq("id", connection.id);
        
        totalErrors++;
      }
    }

    console.log(`Auto-sync completed: ${totalSynced} workouts synced, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        connections: connections.length,
        synced: totalSynced,
        errors: totalErrors
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Auto-sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseICS(icsText: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const lines = icsText.split(/\r?\n/);
  
  let currentEvent: Partial<ICSEvent> | null = null;
  let currentField = "";
  let currentValue = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith(" ") || line.startsWith("\t")) {
      currentValue += line.substring(1);
      continue;
    }

    if (currentField && currentEvent) {
      processField(currentEvent, currentField, currentValue);
    }

    if (line === "BEGIN:VEVENT") {
      currentEvent = {};
    } else if (line === "END:VEVENT" && currentEvent) {
      if (currentEvent.uid && currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent as ICSEvent);
      }
      currentEvent = null;
    } else if (currentEvent && line.includes(":")) {
      const colonIndex = line.indexOf(":");
      currentField = line.substring(0, colonIndex);
      currentValue = line.substring(colonIndex + 1);
    }
  }

  return events;
}

function processField(event: Partial<ICSEvent>, field: string, value: string) {
  const baseField = field.split(";")[0];
  
  switch (baseField) {
    case "UID":
      event.uid = value;
      break;
    case "SUMMARY":
      event.summary = value;
      break;
    case "DESCRIPTION":
      event.description = value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
      break;
    case "DTSTART":
      event.dtstart = parseICSDate(value);
      break;
    case "DTEND":
      event.dtend = parseICSDate(value);
      break;
  }
}

function parseICSDate(icsDate: string): string {
  if (icsDate.includes("T")) {
    const [datePart, timePart] = icsDate.split("T");
    const year = datePart.substring(0, 4);
    const month = datePart.substring(4, 6);
    const day = datePart.substring(6, 8);
    const hour = timePart.substring(0, 2);
    const minute = timePart.substring(2, 4);
    const second = timePart.substring(4, 6);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }
  const year = icsDate.substring(0, 4);
  const month = icsDate.substring(4, 6);
  const day = icsDate.substring(6, 8);
  return `${year}-${month}-${day}T00:00:00Z`;
}