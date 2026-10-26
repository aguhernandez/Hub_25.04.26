import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const { email, password, full_name, role, username, phone, first_name, last_name, date_of_birth, gender, bio, tagline, country, terms_accepted, sport, billing_cycle } = body;
    const allowedRoles = ['athlete', 'trainer', 'nutritionist', 'head_coach', 'biomechanist'] as const;
    const requestedRole = role || 'athlete';
    const effectiveRole = 'athlete';
    console.log('🚀 AUTH-SIGNUP - Request for:', email, 'requested role:', requestedRole);
    console.log('📋 Request body keys:', Object.keys(body));

    if (!email || !password) {
      console.error('❌ Missing credentials - email:', !!email, 'password:', !!password);
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allowedRoles.includes(requestedRole)) {
      return new Response(
        JSON.stringify({ error: 'Invalid account role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (username !== undefined && (!/^[a-z0-9_]{3,30}$/.test(username) || username !== username.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Username must be 3-30 characters using lowercase letters, numbers, or underscores' }),
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

    if (username) {
      const { data: existingUsername, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (usernameError) {
        return new Response(
          JSON.stringify({ error: 'Unable to validate username' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (existingUsername) {
        return new Response(
          JSON.stringify({ error: 'That username is already taken', code: 'USERNAME_EXISTS' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('1️⃣ Creating auth user via Admin API...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: full_name || '',
        requested_role: requestedRole === 'athlete' ? undefined : requestedRole,
        ...(billing_cycle === 'monthly' || billing_cycle === 'yearly' ? { billing_cycle } : {}),
      },
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

    console.log('1b️⃣ Updating profile with server-assigned role/username/phone...');
    const profileUpdates: Record<string, unknown> = {
      role: effectiveRole,
      requested_role: requestedRole === 'athlete' ? null : requestedRole,
    };
    if (sport) profileUpdates.sport = sport;
    if (username) profileUpdates.username = username;
    if (phone) profileUpdates.phone = phone;
    if (first_name) profileUpdates.first_name = first_name;
    if (last_name) profileUpdates.last_name = last_name;
    if (date_of_birth) {
      profileUpdates.date_of_birth = date_of_birth;
      const birthDate = new Date(date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      if (Number.isFinite(age) && age >= 0) profileUpdates.age = age;
    }
    if (gender) profileUpdates.gender = gender;
    if (bio) profileUpdates.bio = bio;
    if (tagline) profileUpdates.tagline = tagline;
    if (country) profileUpdates.country = country;
    if (terms_accepted) {
      profileUpdates.terms_accepted = true;
      profileUpdates.terms_accepted_at = new Date().toISOString();
      profileUpdates.privacy_accepted = true;
      profileUpdates.privacy_accepted_at = new Date().toISOString();
      profileUpdates.profile_completed = true;
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (profileUpdateError) {
      console.warn('⚠️ Warning: Could not update profile:', profileUpdateError.message);
    } else {
      console.log('✅ Profile updated with effective role:', effectiveRole, 'requested role:', requestedRole);
    }

    if (requestedRole !== 'athlete') {
      const { error: requestError } = await supabase
        .from('professional_role_requests')
        .upsert({ user_id: userId, role: requestedRole, source: 'signup', updated_at: new Date().toISOString() });
      if (requestError) {
        console.warn('⚠️ Warning: Could not persist professional role request:', requestError.message);
      }
    }

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

    console.log('✅ Signup complete!');

    return new Response(
      JSON.stringify({
        success: true,
        confirmation_required: true,
        user: {
          id: userId,
          email: email,
          role: effectiveRole,
          requested_role: requestedRole === 'athlete' ? null : requestedRole,
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
