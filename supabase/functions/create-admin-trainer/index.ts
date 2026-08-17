import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];

    // Check if admin exists
    const { data: existingAdmin } = await supabase.auth.admin.listUsers();
    const adminExists = existingAdmin?.users?.some(u => u.email === 'admin@asciende.pro');

    if (!adminExists) {
      // Create Admin
      const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
        email: 'admin@asciende.pro',
        password: 'Admin_asciende.pro1',
        email_confirm: true,
        user_metadata: {
          full_name: 'Asciende Admin',
          role: 'admin',
        },
      });

      if (adminError) {
        results.push({ account: 'admin', status: 'error', error: adminError.message });
      } else if (adminData.user) {
        // Update profile
        await supabase.from('profiles').upsert({
          id: adminData.user.id,
          role: 'admin',
          full_name: 'Asciende Admin',
          country: 'Spain',
          sport: 'admin',
        });
        results.push({ account: 'admin', status: 'created', id: adminData.user.id });
      }
    } else {
      results.push({ account: 'admin', status: 'already_exists' });
    }

    // Check if trainer exists
    const trainerExists = existingAdmin?.users?.some(u => u.email === 'agu@asciende.pro');

    if (!trainerExists) {
      // Create Trainer (Agu)
      const { data: trainerData, error: trainerError } = await supabase.auth.admin.createUser({
        email: 'agu@asciende.pro',
        password: 'Agu_asciende.pro1',
        email_confirm: true,
        user_metadata: {
          full_name: 'Agu Trainer',
          role: 'trainer',
        },
      });

      if (trainerError) {
        results.push({ account: 'trainer', status: 'error', error: trainerError.message });
      } else if (trainerData.user) {
        // Update profile
        await supabase.from('profiles').upsert({
          id: trainerData.user.id,
          role: 'trainer',
          full_name: 'Agu Trainer',
          country: 'Spain',
          sport: 'trainer',
        });
        results.push({ account: 'trainer', status: 'created', id: trainerData.user.id });
      }
    } else {
      results.push({ account: 'trainer', status: 'already_exists' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        credentials: {
          admin: {
            email: 'admin@asciende.pro',
            password: 'Admin_asciende.pro1',
          },
          trainer: {
            email: 'agu@asciende.pro',
            password: 'Agu_asciende.pro1',
          },
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating accounts:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});