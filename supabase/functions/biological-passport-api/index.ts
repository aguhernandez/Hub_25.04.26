import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // pathParts[0] = 'biological-passport-api'
    // pathParts[1] = action: 'active', 'history', 'create', 'public'
    // pathParts[2] = athlete_id (for get routes)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');

    // For public endpoint, use anon client; for protected, use user JWT
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const action = pathParts[1];
    const athleteId = pathParts[2];

    // ──────────────────────────────────────────────
    // PUBLIC endpoint: GET /biological-passport-api/public/:athlete_id
    // Returns only visibility-permitted fields
    // ──────────────────────────────────────────────
    if (action === 'public' && athleteId && req.method === 'GET') {
      const { data: passport, error } = await supabaseAdmin
        .from('biological_passports')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('status', 'active')
        .eq('public_visible', true)
        .maybeSingle();

      if (error) throw error;
      if (!passport) {
        return new Response(JSON.stringify({ data: null, message: 'No public passport available' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build response based on visibility flags
      const publicData: Record<string, unknown> = {
        athlete_id: passport.athlete_id,
        version_number: passport.version_number,
        measurement_date: passport.measurement_date,
        sport_context: passport.sport_context,
        athlete_level: passport.athlete_level,
        training_age_years: passport.training_age_years,
      };

      if (passport.share_vo2) {
        publicData.vo2max = passport.vo2max;
        publicData.lt1_hr = passport.lt1_hr;
        publicData.lt2_hr = passport.lt2_hr;
        publicData.ftp_watts = passport.ftp_watts;
        publicData.running_threshold_pace = passport.running_threshold_pace;
      }

      if (passport.share_zones) {
        publicData.power_zones_json = passport.power_zones_json;
        publicData.hr_zones_json = passport.hr_zones_json;
        publicData.rpe_zones_json = passport.rpe_zones_json;
      }

      if (passport.share_body_comp) {
        publicData.height_cm = passport.height_cm;
        publicData.weight_kg = passport.weight_kg;
        publicData.body_fat_percent = passport.body_fat_percent;
        publicData.muscle_mass_kg = passport.muscle_mass_kg;
        publicData.lean_mass_kg = passport.lean_mass_kg;
      }

      return new Response(JSON.stringify({ data: publicData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All other routes require authentication
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

    const userRole = user.app_metadata?.role;

    // ──────────────────────────────────────────────
    // GET /biological-passport-api/active/:athlete_id
    // ──────────────────────────────────────────────
    if (action === 'active' && athleteId && req.method === 'GET') {
      const targetId = athleteId === 'me' ? user.id : athleteId;

      // Athletes can only get their own; trainers/admins can get others
      if (targetId !== user.id && !['trainer', 'admin'].includes(userRole)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('biological_passports')
        .select('*')
        .eq('athlete_id', targetId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ──────────────────────────────────────────────
    // GET /biological-passport-api/history/:athlete_id
    // ──────────────────────────────────────────────
    if (action === 'history' && athleteId && req.method === 'GET') {
      const targetId = athleteId === 'me' ? user.id : athleteId;

      if (targetId !== user.id && !['trainer', 'admin'].includes(userRole)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data, error, count } = await supabaseAdmin
        .from('biological_passports')
        .select('*', { count: 'exact' })
        .eq('athlete_id', targetId)
        .order('version_number', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return new Response(JSON.stringify({ data, total: count }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ──────────────────────────────────────────────
    // POST /biological-passport-api/create
    // ──────────────────────────────────────────────
    if (action === 'create' && req.method === 'POST') {
      if (!['trainer', 'admin'].includes(userRole)) {
        return new Response(JSON.stringify({ error: 'Only trainers and admins can create passport versions' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { athlete_id, source, ...passportData } = body;

      if (!athlete_id) {
        return new Response(JSON.stringify({ error: 'athlete_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const VALID_SOURCES = ['lab', 'manual', 'imported', 'external_lab'];
      const safeSource = VALID_SOURCES.includes(source) ? source : 'lab';

      const { data, error } = await supabaseAdmin
        .from('biological_passports')
        .insert({
          athlete_id,
          ...passportData,
          source: safeSource,
          created_by: user.id,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data, message: 'Biological passport created successfully' }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ──────────────────────────────────────────────
    // PUT /biological-passport-api/visibility/:passport_id
    // Update visibility flags only
    // ──────────────────────────────────────────────
    if (action === 'visibility' && pathParts[2] && req.method === 'PUT') {
      const passportId = pathParts[2];
      const body = await req.json();
      const { public_visible, share_vo2, share_zones, share_body_comp } = body;

      // Fetch passport to check ownership
      const { data: passport, error: fetchError } = await supabaseAdmin
        .from('biological_passports')
        .select('athlete_id, status')
        .eq('id', passportId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!passport) {
        return new Response(JSON.stringify({ error: 'Passport not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isOwner = passport.athlete_id === user.id;
      const isAuthorized = isOwner || ['trainer', 'admin'].includes(userRole);

      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('biological_passports')
        .update({ public_visible, share_vo2, share_zones, share_body_comp })
        .eq('id', passportId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
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
