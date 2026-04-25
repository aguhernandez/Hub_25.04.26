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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const results = [];
    const simplePassword = 'admin123';

    // Get users list
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const adminUser = usersData?.users?.find(u => u.email === 'admin@asciende.pro');
    const trainerUser = usersData?.users?.find(u => u.email === 'agu@asciende.pro');

    // Reset admin password
    if (adminUser) {
      const { data: adminData, error: adminError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { password: simplePassword }
      );

      if (adminError) {
        console.error('Admin password reset error:', adminError);
        results.push({ account: 'admin', status: 'error', error: adminError.message });
      } else {
        console.log('Admin password reset successful');
        results.push({ account: 'admin', status: 'password_reset', email: 'admin@asciende.pro', password: simplePassword });
      }
    } else {
      results.push({ account: 'admin', status: 'not_found' });
    }

    // Reset trainer password
    if (trainerUser) {
      const { data: trainerData, error: trainerError } = await supabase.auth.admin.updateUserById(
        trainerUser.id,
        { password: simplePassword }
      );

      if (trainerError) {
        console.error('Trainer password reset error:', trainerError);
        results.push({ account: 'trainer', status: 'error', error: trainerError.message });
      } else {
        console.log('Trainer password reset successful');
        results.push({ account: 'trainer', status: 'password_reset', email: 'agu@asciende.pro', password: simplePassword });
      }
    } else {
      results.push({ account: 'trainer', status: 'not_found' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Passwords reset successfully',
        results,
        credentials: {
          admin: {
            email: 'admin@asciende.pro',
            password: simplePassword,
          },
          trainer: {
            email: 'agu@asciende.pro',
            password: simplePassword,
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
    console.error('Error resetting passwords:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: error 
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