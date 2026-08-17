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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const newPassword = 'demo123';
    const results = [];

    // Admin account
    const adminId = 'a1111111-1111-1111-1111-111111111111';
    const { data: adminData, error: adminError } = await supabase.auth.admin.updateUserById(
      adminId,
      { password: newPassword }
    );

    if (adminError) {
      console.error('Admin error:', adminError);
      results.push({ email: 'admin@asciende.com', status: 'error', error: adminError.message });
    } else {
      console.log('Admin password updated');
      results.push({ email: 'admin@asciende.com', status: 'success', password: newPassword });
    }

    // Trainer account
    const trainerId = 'b2222222-2222-2222-2222-222222222222';
    const { data: trainerData, error: trainerError } = await supabase.auth.admin.updateUserById(
      trainerId,
      { password: newPassword }
    );

    if (trainerError) {
      console.error('Trainer error:', trainerError);
      results.push({ email: 'trainer@asciende.com', status: 'error', error: trainerError.message });
    } else {
      console.log('Trainer password updated');
      results.push({ email: 'trainer@asciende.com', status: 'success', password: newPassword });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Passwords reset to demo123',
        results,
        credentials: [
          {
            role: 'Admin',
            email: 'admin@asciende.com',
            password: newPassword
          },
          {
            role: 'Trainer',
            email: 'trainer@asciende.com',
            password: newPassword
          }
        ]
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
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