import { createClient } from 'npm:@supabase/supabase-js@2';
import * as jose from 'npm:jose@5.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwtSecret = Deno.env.get('JWT_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, trainer_role_type')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role || 'athlete';
    const trainerRoleType = (profile as any)?.trainer_role_type || null;

    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('product, plan')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const activePlans = subscriptions?.map(sub => `${sub.product}_${sub.plan}`) || [];

    // Get active membership from membership_access table
    const { data: membershipAccess } = await supabase
      .from('membership_access')
      .select('memberships(slug, name)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const membershipSlug = (membershipAccess?.memberships as any)?.slug || 'inicia';
    const membershipName = (membershipAccess?.memberships as any)?.name || 'Asciende Inicia';

    let managedAthletes: Array<{ athlete_id: string; role_type: string }> = [];
    let assignedTrainers: Array<{ trainer_id: string; role_type: string; is_primary: boolean }> = [];

    if (role === 'trainer' || role === 'admin') {
      const { data: athleteRows } = await supabase
        .from('athlete_trainers')
        .select('athlete_id, role_type')
        .eq('trainer_id', user.id);
      managedAthletes = athleteRows || [];
    } else if (role === 'athlete') {
      const { data: trainerRows } = await supabase
        .from('athlete_trainers')
        .select('trainer_id, role_type, is_primary')
        .eq('athlete_id', user.id);
      assignedTrainers = trainerRows || [];
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 7 * 24 * 60 * 60;

    const jwtPayload: Record<string, unknown> = {
      user_id: user.id,
      email: user.email,
      role: role,
      active_plan: activePlans,
      membership_slug: membershipSlug,
      membership_name: membershipName,
    };

    if (trainerRoleType) jwtPayload.trainer_role_type = trainerRoleType;
    if (managedAthletes.length > 0) jwtPayload.managed_athletes = managedAthletes;
    if (assignedTrainers.length > 0) jwtPayload.assigned_trainers = assignedTrainers;

    const hubToken = await new jose.SignJWT(jwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(secret);

    return new Response(
      JSON.stringify({
        success: true,
        token: hubToken,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Token generation error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
