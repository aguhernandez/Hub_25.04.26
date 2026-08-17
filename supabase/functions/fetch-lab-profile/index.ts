import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const LAB_BASE_URL = 'https://lab.asciende.pro';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userRole = user.app_metadata?.role;
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[1];

    // GET /fetch-lab-profile/preview/:athlete_id
    // Fetches lab data WITHOUT saving — for preview before import
    if (action === 'preview' && req.method === 'GET') {
      const athleteId = pathParts[2];
      if (!athleteId) {
        return new Response(JSON.stringify({ error: 'athlete_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isOwner = athleteId === user.id;
      const isAuthorized = isOwner || ['trainer', 'admin'].includes(userRole);
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const labData = await fetchFromLab(athleteId, anonKey, authHeader);
      if (!labData) {
        return new Response(JSON.stringify({ data: null, message: 'No active profile found in the lab for this athlete' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: mapLabToPassport(labData, athleteId) }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /fetch-lab-profile/import
    // Fetches lab data and creates a new passport version
    if (action === 'import' && req.method === 'POST') {
      const body = await req.json();
      const { athlete_id, sport_context } = body;

      if (!athlete_id) {
        return new Response(JSON.stringify({ error: 'athlete_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isOwner = athlete_id === user.id;
      const isAuthorized = isOwner || ['trainer', 'admin'].includes(userRole);
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const labData = await fetchFromLab(athlete_id, anonKey, authHeader);
      if (!labData) {
        return new Response(JSON.stringify({ error: 'No active profile found in the lab for this athlete' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const passportPayload = {
        ...mapLabToPassport(labData, athlete_id),
        sport_context: sport_context || 'other',
        created_by: user.id,
        status: 'active',
      };

      const { data, error } = await supabaseAdmin
        .from('biological_passports')
        .insert(passportPayload)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data, message: 'Lab profile imported successfully' }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /fetch-lab-profile/history/:athlete_id
    // Fetches full version history from the lab
    if (action === 'history' && req.method === 'GET') {
      const athleteId = pathParts[2];
      if (!athleteId) {
        return new Response(JSON.stringify({ error: 'athlete_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isOwner = athleteId === user.id;
      const isAuthorized = isOwner || ['trainer', 'admin'].includes(userRole);
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const labResponse = await fetch(
        `${LAB_BASE_URL}/functions/v1/biological-passport/athlete/${athleteId}/history`,
        { headers: { 'Apikey': anonKey } }
      );

      if (!labResponse.ok) {
        return new Response(JSON.stringify({ error: 'Lab unreachable or returned error', status: labResponse.status }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const labData = await labResponse.json();
      return new Response(JSON.stringify({ data: labData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Route not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchFromLab(athleteId: string, anonKey: string, authHeader: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(
    `${LAB_BASE_URL}/functions/v1/biological-passport-api/active/${athleteId}`,
    {
      headers: {
        'Apikey': anonKey,
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) return null;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;

  const json = await response.json();
  if (!json || json.error) return null;

  return (json.data ?? json) as Record<string, unknown>;
}

function mapLabToPassport(labData: Record<string, unknown>, athleteId: string): Record<string, unknown> {
  // The lab satellite stores passports in the same flat schema as the hub.
  // labData is the raw passport row from the lab's biological_passports table.
  // We pick only the fields we need and remap athlete_id to the hub's athlete.

  const pick = (key: string) => labData[key] ?? null;

  return {
    athlete_id: athleteId,
    source: 'external_lab',
    source_satellite: 'lab',
    source_test_type: (pick('source_test_type') as string) || null,
    measurement_date: (pick('measurement_date') as string) || new Date().toISOString().split('T')[0],
    lab_record_id: (pick('id') as string) || null,
    sport_context: (pick('sport_context') as string) || null,

    // Physiological — aerobic capacity
    vo2max: pick('vo2max'),
    lt1_power: pick('lt1_power'),
    lt2_power: pick('lt2_power'),
    lt1_hr: pick('lt1_hr'),
    lt2_hr: pick('lt2_hr'),
    ftp_watts: pick('ftp_watts'),
    critical_power: pick('critical_power'),
    anaerobic_capacity_kj: pick('anaerobic_capacity_kj'),
    running_threshold_pace: pick('running_threshold_pace') as string | null,
    vam: pick('vam'),
    pam: pick('pam'),

    // Training zones
    power_zones_json: pick('power_zones_json'),
    hr_zones_json: pick('hr_zones_json'),
    rpe_zones_json: pick('rpe_zones_json'),
    training_zones: pick('training_zones'),

    // Anthropometry
    height_cm: pick('height_cm'),
    weight_kg: pick('weight_kg'),
    body_fat_percent: pick('body_fat_percent'),
    muscle_mass_kg: pick('muscle_mass_kg'),
    lean_mass_kg: pick('lean_mass_kg'),
    bone_mass_kg: pick('bone_mass_kg'),
    skinfold_sum_6: pick('skinfold_sum_6'),
    muscle_bone_index: pick('muscle_bone_index'),
    z_adipose: pick('z_adipose'),
    z_muscle: pick('z_muscle'),
    z_bone: pick('z_bone'),

    // Athletic profile
    training_age_years: pick('training_age_years'),
    athlete_level: pick('athlete_level') as string | null,

    // Lab modules
    hydration: pick('hydration'),
    heat_adaptation: pick('heat_adaptation'),
    force_velocity: pick('force_velocity'),

    notes: (pick('notes') as string) || null,
  };
}
