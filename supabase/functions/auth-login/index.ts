import { createClient } from 'npm:@supabase/supabase-js@2';
import * as jose from 'npm:jose@5.2.0';

interface LoginRequest {
  email: string;
  password: string;
  redirect_url?: string;
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://ngkcbygyoobqhlmlnuvl.supabase.co',
    'https://asciende.pro',
    'https://www.asciende.pro',
  ];

  const requestOrigin = origin || '';

  const isAllowed = allowedOrigins.some(allowed => requestOrigin.includes(allowed))
    || requestOrigin.includes('webcontainer')
    || requestOrigin.includes('.asciende.pro')
    || requestOrigin.endsWith('asciende.pro');

  const allowOrigin = isAllowed ? requestOrigin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    'Access-Control-Allow-Credentials': 'true',
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, redirect_url }: LoginRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate redirect URL
    if (redirect_url) {
      const allowedDomains = [
        'localhost',
        '127.0.0.1',
        'asciende.pro',
        'webcontainer',
      ];

      const isValidRedirect = allowedDomains.some(domain =>
        redirect_url.includes(domain)
      );

      if (!isValidRedirect) {
        return new Response(
          JSON.stringify({ error: 'Invalid redirect URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwtSecret = Deno.env.get('JWT_SECRET')!;
    const nodeEnv = Deno.env.get('NODE_ENV') || 'development';

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: authError?.message || 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, trainer_role_type')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    const role = profile?.role || 'athlete';
    const trainerRoleType = (profile as any)?.trainer_role_type || null;

    // Get active subscriptions
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('product, plan')
      .eq('user_id', userId)
      .eq('status', 'active');

    const activePlans = subscriptions?.map(sub => `${sub.product}_${sub.plan}`) || [];

    // Get active membership from membership_access table
    const { data: membershipAccess } = await supabase
      .from('membership_access')
      .select('memberships(slug, name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const membershipSlug = (membershipAccess?.memberships as any)?.slug || 'inicia';
    const membershipName = (membershipAccess?.memberships as any)?.name || 'Asciende Inicia';

    // If trainer/admin: fetch list of athletes they manage
    // If athlete: fetch list of trainers assigned to them
    let managedAthletes: Array<{ athlete_id: string; role_type: string }> = [];
    let assignedTrainers: Array<{ trainer_id: string; role_type: string; is_primary: boolean }> = [];

    if (role === 'trainer' || role === 'admin') {
      const { data: athleteRows } = await supabase
        .from('athlete_trainers')
        .select('athlete_id, role_type')
        .eq('trainer_id', userId);
      managedAthletes = athleteRows || [];
    } else if (role === 'athlete') {
      const { data: trainerRows } = await supabase
        .from('athlete_trainers')
        .select('trainer_id, role_type, is_primary')
        .eq('athlete_id', userId);
      assignedTrainers = trainerRows || [];
    }

    // Generate JWT token
    const secret = new TextEncoder().encode(jwtSecret);
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 7 * 24 * 60 * 60; // 7 days

    const jwtPayload: Record<string, unknown> = {
      user_id: userId,
      email: authData.user.email,
      role: role,
      active_plan: activePlans,
      membership_slug: membershipSlug,
      membership_name: membershipName,
    };

    if (trainerRoleType) jwtPayload.trainer_role_type = trainerRoleType;
    if (managedAthletes.length > 0) jwtPayload.managed_athletes = managedAthletes;
    if (assignedTrainers.length > 0) jwtPayload.assigned_trainers = assignedTrainers;

    const token = await new jose.SignJWT(jwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(secret);

    // Set cookie with appropriate domain
    const cookieDomain = nodeEnv === 'production' ? '.asciende.pro' : 'localhost';
    const isSecure = nodeEnv === 'production';

    const cookieValue = [
      `asciende_auth=${token}`,
      `Domain=${cookieDomain}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${7 * 24 * 60 * 60}`,
      isSecure ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    return new Response(
      JSON.stringify({
        success: true,
        token: token,
        user: {
          id: userId,
          email: authData.user.email,
          role: role,
          trainer_role_type: trainerRoleType,
          active_plan: activePlans,
          membership_slug: membershipSlug,
          membership_name: membershipName,
          managed_athletes: managedAthletes,
          assigned_trainers: assignedTrainers,
        },
        redirect_url: redirect_url || null,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Set-Cookie': cookieValue,
        },
      }
    );
  } catch (error: unknown) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
