import { createClient } from 'npm:@supabase/supabase-js@2';
import * as jose from 'npm:jose@5.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, password, full_name } = body;
    console.log('🚀 AUTH-SIGNUP - Request for:', email);
    console.log('📋 Request body keys:', Object.keys(body));

    if (!email || !password) {
      console.error('❌ Missing credentials - email:', !!email, 'password:', !!password);
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      console.error('❌ Password too short');
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwtSecret = Deno.env.get('JWT_SECRET');

    if (!supabaseUrl || !serviceKey) {
      console.error('❌ Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('1️⃣ Creating auth user via Admin API...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || '' },
    });

    if (authError) {
      console.error('❌ Admin API error:', authError.message);

      if (authError.message?.includes('already been registered') ||
          authError.message?.includes('already exists') ||
          authError.message?.includes('duplicate')) {
        return new Response(
          JSON.stringify({
            error: 'An account with this email already exists. Please sign in instead.',
            code: 'USER_EXISTS'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: authError.message || 'Failed to create user',
          code: 'AUTH_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authUser?.user) {
      console.error('❌ No user returned from Admin API');
      return new Response(
        JSON.stringify({ error: 'Failed to create user - no user returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authUser.user.id;
    console.log('✅ Auth user created:', userId);
    console.log('⏳ Waiting for trigger to create profile...');
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('2️⃣ Assigning free "Start" membership...');
    const { error: membershipError } = await supabase
      .from('user_memberships')
      .insert({
        user_id: userId,
        membership_id: '9df88b01-4f72-474c-be22-b53e6c9f9472',
        status: 'active',
        started_at: new Date().toISOString(),
      });

    if (membershipError) {
      console.warn('⚠️ Warning: Could not assign membership:', membershipError.message);
    } else {
      console.log('✅ Free membership assigned');
    }

    let token = null;
    if (jwtSecret) {
      console.log('3️⃣ Generating JWT token...');
      const secret = new TextEncoder().encode(jwtSecret);
      token = await new jose.SignJWT({
        user_id: userId,
        email: email,
        role: 'athlete',
        active_plan: [],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);
    }

    console.log('✅ Signup complete!');

    return new Response(
      JSON.stringify({
        success: true,
        token: token,
        user: {
          id: userId,
          email: email,
          role: 'athlete',
          active_plan: [],
        },
        message: 'Account created successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 EXCEPTION:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: 'Server exception: ' + errorMsg,
        code: 'EXCEPTION'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
