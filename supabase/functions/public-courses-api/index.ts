import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Planner-Token',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const plannerToken = req.headers.get('X-Planner-Token');
    if (plannerToken) {
      const { data: tokenRow } = await supabase
        .from('external_planner_tokens')
        .select('id, is_active')
        .eq('token_raw', plannerToken)
        .eq('planner_type', 'academy')
        .maybeSingle();

      if (!tokenRow?.is_active) {
        return new Response(
          JSON.stringify({ error: 'Invalid or inactive token' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = req.method === 'POST' ? await req.json() : {};

      if (body.athlete?.id && body.athlete?.email) {
        const upsertPayload = {
          athlete_id: body.athlete.id,
          athlete_email: body.athlete.email,
          full_name: body.athlete.full_name || null,
          sport: body.athlete.sport || null,
          role: body.athlete.role || null,
          hub_tags: Array.isArray(body.tags) ? body.tags : [],
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase
          .from('hub_athlete_profiles')
          .upsert(upsertPayload, { onConflict: 'athlete_id' });

        if (upsertErr) {
          console.error('hub_athlete_profiles upsert error:', upsertErr.message);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, courses: [], total: 0, message: 'Courses live in Academy satellite. No local courses stored in Hub.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('public-courses-api error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
