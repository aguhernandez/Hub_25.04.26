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

    const nodeEnv = Deno.env.get('NODE_ENV') || 'development';
    const cookieDomain = nodeEnv === 'production' ? '.asciende.pro' : 'localhost';
    const isSecure = nodeEnv === 'production';

    // Clear the cookie by setting Max-Age to 0
    const cookieValue = [
      'asciende_auth=',
      `Domain=${cookieDomain}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
      isSecure ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Logged out successfully',
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
    console.error('Logout error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
