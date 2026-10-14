import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  dtstart: string;
  dtend: string;
}

const WINDOW_DAYS_BACK = 14;
const WINDOW_DAYS_FORWARD = 90;
const UPSERT_CHUNK_SIZE = 200;

function dayOffsetStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Only the scheduler holding the shared secret may trigger the auto-sync
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization") || "";
    const cronHeader = req.headers.get("x-cron-secret") || "";
    if (
      !cronSecret ||
      (authHeader !== `Bearer ${cronSecret}` && cronHeader !== cronSecret)
    ) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: missing or invalid cron secret",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Full 2-year load only when explicitly requested with body { "full": true }
    let fullLoad = false;
    try {
      const body = await req.json();
      fullLoad = body?.full === true;
    } catch {
      fullLoad = false;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const runStartedAt = Date.now();

    const windowStart = fullLoad
      ? "0000-01-01"
      : dayOffsetStr(-WINDOW_DAYS_BACK);
    const windowEnd = fullLoad
      ? "9999-12-31"
      : dayOffsetStr(WINDOW_DAYS_FORWARD);

    const { data: connections, error: connError } = await supabase
      .from("tp_connections")
      .select("id, athlete_id, ics_url")
      .eq("sync_enabled", true)
      .neq("status", "disconnected");

    if (connError) {
      throw connError;
    }

    if (!connections || connections.length === 0) {
      console.log("No active connections to sync");
      return new Response(
        JSON.stringify({
          message: "No active connections",
          events_read: 0,
          inserted: 0,
          updated: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Found ${connections.length} connections (window ${windowStart} → ${windowEnd}, full=${fullLoad})`,
    );

    let totalEventsRead = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkippedUnchanged = 0;
    let totalOutOfWindow = 0;
    let totalLinked = 0;
    let totalWriteErrors = 0;
    let totalConnectionErrors = 0;

    for (const connection of connections) {
      const athleteStartedAt = Date.now();
      try {
        const icsResponse = await fetch(connection.ics_url);

        if (!icsResponse.ok) {
          const errorMsg = `Failed to fetch ICS: ${icsResponse.status}`;
          console.error(
            `Error for athlete ${connection.athlete_id}: ${errorMsg}`,
          );

          await supabase
            .from("tp_connections")
            .update({ status: "error", last_error: errorMsg })
            .eq("id", connection.id);

          totalConnectionErrors++;
          continue;
        }

        const events = parseICS(await icsResponse.text());
        totalEventsRead += events.length;

        const inWindow = events.filter((event) => {
          const date = event.dtstart.split("T")[0];
          return date >= windowStart && date <= windowEnd;
        });
        totalOutOfWindow += events.length - inWindow.length;

        const { data: existingTp } = await supabase
          .from("athlete_workouts")
          .select(
            "id, external_id, external_title, scheduled_date, status, raw_description",
          )
          .eq("athlete_id", connection.athlete_id)
          .eq("source", "trainingpeaks");

        const byExternalId = new Map<string, any>();
        const byDateTitle = new Map<string, any>();
        (existingTp || []).forEach((w: any) => {
          if (w.external_id) byExternalId.set(w.external_id, w);
          byDateTitle.set(
            `${w.scheduled_date}::${(w.external_title || "").trim()}`,
            w,
          );
        });

        const syncedAt = new Date().toISOString();
        let inserted = 0;
        let updated = 0;
        let skippedUnchanged = 0;
        let linked = 0;
        let writeErrors = 0;
        const pendingInserts: Record<string, unknown>[] = [];
        const pendingUpdates: Array<
          { id: string; values: Record<string, unknown> }
        > = [];

        for (const event of inWindow) {
          const scheduledDate = event.dtstart.split("T")[0];
          const title = (event.summary || "").trim();
          const existingByUid = byExternalId.get(event.uid);

          if (existingByUid) {
            const unchanged =
              (existingByUid.external_title || "").trim() === title &&
              (existingByUid.raw_description || "") === event.description &&
              String(existingByUid.scheduled_date).split("T")[0] ===
                scheduledDate;
            if (unchanged) {
              skippedUnchanged++;
              continue;
            }
            // Update known rows directly so the source-scoped partial unique index
            // does not need to be inferred by PostgREST's column-only onConflict.
            pendingUpdates.push({
              id: existingByUid.id,
              values: {
                external_title: title,
                raw_description: event.description,
                scheduled_date: scheduledDate,
                synced_at: syncedAt,
                notes: `Synced from TrainingPeaks\n\n${event.description}`,
              },
            });
            continue;
          }

          const legacyMatch = byDateTitle.get(`${scheduledDate}::${title}`);
          if (legacyMatch) {
            // Row created before UIDs were tracked: stamp the UID once
            const { error: linkError } = await supabase
              .from("athlete_workouts")
              .update({ external_id: event.uid, synced_at: syncedAt })
              .eq("id", legacyMatch.id);
            if (linkError) {
              console.error(
                `UID link error for event ${event.uid}:`,
                linkError,
              );
              writeErrors++;
              continue;
            }
            byExternalId.set(event.uid, legacyMatch);
            linked++;
            continue;
          }

          pendingInserts.push({
            athlete_id: connection.athlete_id,
            external_id: event.uid,
            external_title: title,
            raw_description: event.description,
            scheduled_date: scheduledDate,
            source: "trainingpeaks",
            synced_at: syncedAt,
            status: "pending",
            notes: `Synced from TrainingPeaks\n\n${event.description}`,
          });
        }

        for (const pendingUpdate of pendingUpdates) {
          const { data, error: updateError } = await supabase
            .from("athlete_workouts")
            .update(pendingUpdate.values)
            .eq("id", pendingUpdate.id)
            .eq("athlete_id", connection.athlete_id)
            .eq("source", "trainingpeaks")
            .select("id")
            .maybeSingle();

          if (updateError || !data) {
            console.error(
              `Update error for athlete ${connection.athlete_id}, workout ${pendingUpdate.id}:`,
              updateError,
            );
            writeErrors++;
            continue;
          }
          updated++;
        }

        for (let i = 0; i < pendingInserts.length; i += UPSERT_CHUNK_SIZE) {
          const chunk = pendingInserts.slice(i, i + UPSERT_CHUNK_SIZE);
          const { error: insertError } = await supabase
            .from("athlete_workouts")
            .insert(chunk);

          if (!insertError) {
            inserted += chunk.length;
            continue;
          }

          if (insertError.code !== "23505") {
            console.error(
              `Batch insert error for athlete ${connection.athlete_id}:`,
              insertError,
            );
            writeErrors += chunk.length;
            continue;
          }

          // A concurrent sync may have inserted a UID after the initial read.
          // Retry only that exceptional batch row-by-row: insert new UIDs and
          // update a row that won the race without changing its status.
          for (const row of chunk) {
            const insertData = row as {
              athlete_id: string;
              external_id: string;
              source: string;
              external_title: string;
              raw_description: string;
              scheduled_date: string;
              synced_at: string;
              notes: string;
            };
            const { error: singleInsertError } = await supabase
              .from("athlete_workouts")
              .insert(row);

            if (!singleInsertError) {
              inserted++;
              continue;
            }
            if (singleInsertError.code !== "23505") {
              console.error(
                `Insert error for event ${insertData.external_id}:`,
                singleInsertError,
              );
              writeErrors++;
              continue;
            }

            const { data: racedRow, error: racedUpdateError } = await supabase
              .from("athlete_workouts")
              .update({
                external_title: insertData.external_title,
                raw_description: insertData.raw_description,
                scheduled_date: insertData.scheduled_date,
                synced_at: insertData.synced_at,
                notes: insertData.notes,
              })
              .eq("athlete_id", insertData.athlete_id)
              .eq("external_id", insertData.external_id)
              .eq("source", "trainingpeaks")
              .select("id")
              .maybeSingle();

            if (racedUpdateError || !racedRow) {
              console.error(
                `Concurrent upsert recovery error for event ${insertData.external_id}:`,
                racedUpdateError,
              );
              writeErrors++;
            } else {
              updated++;
            }
          }
        }

        await supabase
          .from("tp_connections")
          .update({
            status: "connected",
            last_sync_at: syncedAt,
            last_error: null,
          })
          .eq("id", connection.id);

        totalInserted += inserted;
        totalUpdated += updated;
        totalSkippedUnchanged += skippedUnchanged;
        totalLinked += linked;
        totalWriteErrors += writeErrors;

        console.log(
          `Athlete ${connection.athlete_id}: read=${inWindow.length} upserted=${inserted} ` +
            `skipped_unchanged=${skippedUnchanged} linked=${linked} out_of_window=${
              events.length - inWindow.length
            } ` +
            `errors=${writeErrors} duration_ms=${
              Date.now() - athleteStartedAt
            }`,
        );
      } catch (error: any) {
        console.error(`Error syncing athlete ${connection.athlete_id}:`, error);

        await supabase
          .from("tp_connections")
          .update({
            status: "error",
            last_error: error.message,
          })
          .eq("id", connection.id);

        totalConnectionErrors++;
      }
    }

    const durationMs = Date.now() - runStartedAt;
    console.log(
      `Auto-sync completed in ${durationMs}ms: read=${totalEventsRead} inserted=${totalInserted} updated=${totalUpdated} ` +
        `skipped_unchanged=${totalSkippedUnchanged} out_of_window=${totalOutOfWindow} ` +
        `linked=${totalLinked} write_errors=${totalWriteErrors} connection_errors=${totalConnectionErrors}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        full: fullLoad,
        window_start: windowStart,
        window_end: windowEnd,
        connections: connections.length,
        events_read: totalEventsRead,
        inserted: totalInserted,
        updated: totalUpdated,
        skipped_unchanged: totalSkippedUnchanged,
        out_of_window: totalOutOfWindow,
        linked: totalLinked,
        errors: totalWriteErrors + totalConnectionErrors,
        duration_ms: durationMs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Auto-sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
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
