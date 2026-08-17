import { createClient } from 'npm:@supabase/supabase-js@2';

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
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface ValidateRequest {
  satellite_name: string;
  user_id?: string;
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Extract Authorization header
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No authorization token found',
          has_access: false,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token to verify authentication
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired token',
          has_access: false,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      // Validate access and log entry
      const body: ValidateRequest = await req.json();
      const { satellite_name } = body;

      if (!satellite_name) {
        return new Response(
          JSON.stringify({ success: false, error: 'satellite_name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user has access using database function
      const { data: accessCheck, error: accessError } = await supabase
        .rpc('check_satellite_access', {
          p_user_id: userId,
          p_satellite_name: satellite_name,
        });

      if (accessError) {
        console.error('Access check error:', accessError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to check satellite access',
            has_access: false,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const hasAccess = accessCheck === true;

      // If has access, log the entry
      if (hasAccess) {
        const userAgent = req.headers.get('user-agent');
        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

        const { error: logError } = await supabase
          .rpc('log_satellite_access', {
            p_user_id: userId,
            p_satellite_name: satellite_name,
            p_ip_address: ipAddress,
            p_user_agent: userAgent,
          });

        if (logError) {
          console.error('Failed to log access:', logError);
        }
      }

      // Get satellite details
      const { data: satellite } = await supabase
        .from('satellites')
        .select('id, name, display_name, url, category')
        .eq('name', satellite_name)
        .eq('is_active', true)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          has_access: hasAccess,
          satellite: satellite || null,
          message: hasAccess
            ? `Access granted to ${satellite_name}`
            : `Access denied to ${satellite_name}`,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (req.method === 'GET') {
      // Get user's accessible satellites and access history
      const { data: summary, error: summaryError } = await supabase
        .from('user_satellite_summary')
        .select('*')
        .eq('user_id', userId);

      if (summaryError) {
        console.error('Summary error:', summaryError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to get satellite summary' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For each satellite, check if user has access
      const satellitesWithAccess = await Promise.all(
        (summary || []).map(async (item) => {
          const { data: hasAccess } = await supabase
            .rpc('check_satellite_access', {
              p_user_id: userId,
              p_satellite_name: item.satellite_name,
            });

          return {
            ...item,
            has_access: hasAccess === true,
          };
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          satellites: satellitesWithAccess,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Satellite access error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
