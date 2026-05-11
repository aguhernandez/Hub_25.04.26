import { createClient } from 'npm:@supabase/supabase-js@2';
import * as jose from 'npm:jose@5.2.0';
import { crypto } from 'jsr:@std/crypto';

interface LoginRequest {
  email: string;
  password: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password }: LoginRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwtSecret = Deno.env.get('JWT_SECRET')!;

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
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    const role = profile?.role || 'athlete';
    const fullName = profile?.full_name || authData.user.email?.split('@')[0] || 'User';

    // Get active membership from membership_access table
    const { data: membershipAccess } = await supabase
      .from('membership_access')
      .select('memberships(slug, name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const membershipSlug = (membershipAccess?.memberships as any)?.slug || 'inicia';
    const membershipName = (membershipAccess?.memberships as any)?.name || 'Asciende Inicia';

    // Generate JWT token with 7-day expiration
    const secret = new TextEncoder().encode(jwtSecret);
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 7 * 24 * 60 * 60;

    const jwtPayload = {
      user_id: userId,
      email: authData.user.email,
      role: role,
      membership_slug: membershipSlug,
      membership_name: membershipName,
      iat: issuedAt,
      exp: expiresAt,
    };

    const token = await new jose.SignJWT(jwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(secret);

    // Get active biological passport
    let passportToken: string | null = null;
    const { data: activePassport } = await supabase
      .from('biological_passports')
      .select('id')
      .eq('athlete_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (activePassport) {
      // Generate a secure random token for passport access
      const passportTokenRaw = crypto.getRandomValues(new Uint8Array(32));
      const passportTokenHex = Array.from(passportTokenRaw)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Hash the token before storing
      const encoder = new TextEncoder();
      const data = encoder.encode(passportTokenHex);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Store token hash in database
      const { error: tokenError } = await supabase
        .from('biological_passport_tokens')
        .insert({
          athlete_id: userId,
          biological_passport_id: activePassport.id,
          token_hash: tokenHash,
          is_active: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });

      if (!tokenError) {
        passportToken = passportTokenHex;
      }
    }

    return new Response(
      JSON.stringify({
        token: token,
        passport_token: passportToken,
        user: {
          id: userId,
          email: authData.user.email,
          name: fullName,
          role: role,
          membership_slug: membershipSlug,
          membership_name: membershipName,
        },
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
    console.error('Academy auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
