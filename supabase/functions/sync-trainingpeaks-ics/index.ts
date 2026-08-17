import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, athlete_id } = await req.json();
    const targetAthleteId = athlete_id || user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwnProfile = targetAthleteId === user.id;
    const isTrainerOrAdmin = profile?.role === "trainer" || profile?.role === "admin";

    if (!isOwnProfile && !isTrainerOrAdmin) {
      throw new Error("Forbidden: Cannot sync other athlete's data");
    }

    const { data: connection, error: connError } = await supabase
      .from("tp_connections")
      .select("*")
      .eq("athlete_id", targetAthleteId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No TrainingPeaks connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!connection.sync_enabled) {
      return new Response(
        JSON.stringify({ error: "Sync is disabled for this connection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching ICS feed...");
    const icsResponse = await fetch(connection.ics_url);

    if (!icsResponse.ok) {
      const errorMsg = `Failed to fetch ICS feed: ${icsResponse.status} ${icsResponse.statusText}`;
      await supabase
        .from("tp_connections")
        .update({
          status: "error",
          last_error: errorMsg
        })
        .eq("id", connection.id);

      throw new Error(errorMsg);
    }

    const icsText = await icsResponse.text();
    console.log("ICS feed fetched, parsing...");

    const events = parseICS(icsText);
    console.log(`Parsed ${events.length} events`);

    let syncedCount = 0;
    let errorCount = 0;
    const now = new Date().toISOString();

    for (const event of events) {
      try {
        console.log(`Processing: ${event.summary} (${event.dtstart.split("T")[0]})`);

        const { data: existing, error: existingError } = await supabase
          .from("athlete_workouts")
          .select("id")
          .eq("athlete_id", targetAthleteId)
          .eq("external_id", event.uid)
          .maybeSingle();

        if (existingError) {
          console.error(`Error checking existing event:`, existingError);
          errorCount++;
          continue;
        }

        const enhancedDescription = enhanceTPDescription(event.description || "");

        const workoutData = {
          athlete_id: targetAthleteId,
          external_id: event.uid,
          external_title: event.summary,
          raw_description: enhancedDescription,
          scheduled_date: event.dtstart.split("T")[0],
          source: "trainingpeaks",
          synced_at: now,
          status: "pending",
          notes: enhancedDescription ? `Synced from TrainingPeaks\n\n${enhancedDescription}` : "Synced from TrainingPeaks"
        };

        if (existing) {
          console.log(`Updating existing workout: ${existing.id}`);
          const { error: updateError } = await supabase
            .from("athlete_workouts")
            .update(workoutData)
            .eq("id", existing.id);

          if (updateError) {
            console.error(`Update error:`, updateError);
            errorCount++;
            continue;
          }
        } else {
          console.log(`Inserting new workout`);
          const { error: insertError } = await supabase
            .from("athlete_workouts")
            .insert(workoutData);

          if (insertError) {
            console.error(`Insert error:`, insertError);
            errorCount++;
            continue;
          }
        }

        syncedCount++;
        console.log(`✓ Synced successfully`);
      } catch (error) {
        console.error(`Exception syncing event ${event.uid}:`, error);
        errorCount++;
      }
    }

    await supabase
      .from("tp_connections")
      .update({
        status: "connected",
        last_sync_at: now,
        last_error: errorCount > 0 ? `${errorCount} events failed to sync` : null
      })
      .eq("id", connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        errors: errorCount,
        total: events.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Sync error:", error);
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
    const line = lines[i];

    if (line.startsWith(" ") || line.startsWith("\t")) {
      currentValue += line.substring(1);
      continue;
    }

    if (currentField && currentEvent) {
      processField(currentEvent, currentField, currentValue);
      currentField = "";
      currentValue = "";
    }

    const trimmedLine = line.trim();

    if (trimmedLine === "BEGIN:VEVENT") {
      currentEvent = {};
    } else if (trimmedLine === "END:VEVENT") {
      if (currentField && currentEvent) {
        processField(currentEvent, currentField, currentValue);
        currentField = "";
        currentValue = "";
      }

      if (currentEvent && currentEvent.uid && currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent as ICSEvent);
      }
      currentEvent = null;
    } else if (currentEvent && trimmedLine.includes(":")) {
      const colonIndex = trimmedLine.indexOf(":");
      currentField = trimmedLine.substring(0, colonIndex);
      currentValue = trimmedLine.substring(colonIndex + 1);
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
      let decoded = value
        .replace(/\\n/g, "\n")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\\\/g, "\\");

      event.description = decoded;
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

function enhanceTPDescription(description: string): string {
  if (!description) return "";

  const sections: string[] = [];
  let workoutType = "";
  let plannedTime = "";
  let mainContent = description;

  const workoutTypeMatch = mainContent.match(/Workout type:\s*(.+?)(?:\n|$)/i);
  if (workoutTypeMatch) {
    workoutType = workoutTypeMatch[1].trim();
    mainContent = mainContent.replace(/Workout type:\s*.+?(?:\n|$)/i, "");
  }

  const plannedTimeMatch = mainContent.match(/Planned Time:\s*(.+?)(?:\n|$)/i);
  if (plannedTimeMatch) {
    plannedTime = plannedTimeMatch[1].trim();
    mainContent = mainContent.replace(/Planned Time:\s*.+?(?:\n|$)/i, "");
  }

  if (workoutType) {
    sections.push("═══════════════════════════════════════════");
    sections.push(`🏋️ WORKOUT TYPE: ${workoutType.toUpperCase()}`);
    sections.push("═══════════════════════════════════════════");
    sections.push("");
  }

  if (plannedTime) {
    sections.push(`⏱️  DURATION: ${plannedTime}`);
    sections.push("");
  }

  mainContent = mainContent.trim();
  if (mainContent.length > 0) {
    sections.push("───────────────────────────────────────────");
    sections.push("📋 WORKOUT DETAILS");
    sections.push("───────────────────────────────────────────");
    sections.push("");

    const intervalPattern = /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(minutes?|min|seconds?|sec)/gi;
    let match;
    const intervals: string[] = [];

    while ((match = intervalPattern.exec(mainContent)) !== null) {
      const [_, reps, duration, unit] = match;
      intervals.push(`🔄 ${reps} × ${duration} ${unit}`);
    }

    const recoveryPattern = /\((\d+(?:\.\d+)?)[- ]*(minute|min|second|sec)[s]?\s+recover(?:y|ies)\)/gi;
    const recoveries: string[] = [];

    while ((match = recoveryPattern.exec(mainContent)) !== null) {
      const [_, duration, unit] = match;
      recoveries.push(`⏸️  ${duration} ${unit} recovery`);
    }

    const hrZonePattern = /(?:to|in|at|the)\s+heart\s+rate\s+(\S+)\s+zone/gi;
    const hrZones: string[] = [];

    while ((match = hrZonePattern.exec(mainContent)) !== null) {
      const [_, zone] = match;
      hrZones.push(`❤️  HR Zone: ${zone.toUpperCase()}`);
    }

    const powerZonePattern = /power\s+zone\s+(\d+)/gi;
    const powerZones: string[] = [];

    while ((match = powerZonePattern.exec(mainContent)) !== null) {
      const [_, zone] = match;
      powerZones.push(`⚡ Power Zone: ${zone}`);
    }

    const ftpPattern = /(\d+)(?:-(\d+))?%\s*(?:of\s*)?FTP/gi;
    const ftpValues: string[] = [];

    while ((match = ftpPattern.exec(mainContent)) !== null) {
      const [_, lower, upper] = match;
      const range = upper ? `${lower}-${upper}%` : `${lower}%`;
      ftpValues.push(`⚡ ${range} FTP`);
    }

    const rpmPattern = /(\d+)\+?\s*rpm/gi;
    const rpms: string[] = [];

    while ((match = rpmPattern.exec(mainContent)) !== null) {
      const [_, value] = match;
      rpms.push(`🔄 ${value}+ RPM`);
    }

    if (intervals.length > 0) {
      sections.push("INTERVALS:");
      intervals.forEach(i => sections.push(`  ${i}`));
      sections.push("");
    }

    if (recoveries.length > 0) {
      sections.push("RECOVERY:");
      recoveries.forEach(r => sections.push(`  ${r}`));
      sections.push("");
    }

    if (hrZones.length > 0) {
      sections.push("INTENSITY:");
      hrZones.forEach(z => sections.push(`  ${z}`));
      sections.push("");
    }

    if (powerZones.length > 0 || ftpValues.length > 0) {
      sections.push("POWER TARGET:");
      powerZones.forEach(p => sections.push(`  ${p}`));
      ftpValues.forEach(f => sections.push(`  ${f}`));
      sections.push("");
    }

    if (rpms.length > 0) {
      sections.push("CADENCE:");
      rpms.forEach(r => sections.push(`  ${r}`));
      sections.push("");
    }

    sections.push("INSTRUCTIONS:");
    const highlighted = mainContent
      .replace(/\b(warm(?:ing)?[- ]?up)/gi, "🌡️  WARM-UP")
      .replace(/\b(cool(?:ing)?[- ]?down)/gi, "❄️  COOL-DOWN")
      .replace(/\b(easy|recovery)\b/gi, "💚 EASY")
      .replace(/\b(hard|threshold)\b/gi, "🔥 HARD")
      .replace(/\b(tempo)\b/gi, "🟡 TEMPO")
      .replace(/\b(steady)\b/gi, "🟢 STEADY");

    sections.push(highlighted);
  }

  return sections.join("\n").trim();
}
