import { createClient } from 'npm:@supabase/supabase-js@2';
import * as jose from 'npm:jose@5.2.0';

function getCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://ngkcbygyoobqhlmlnuvl.supabase.co',
    'https://asciende.pro',
    'https://www.asciende.pro',
    'https://hub.asciende.pro',
    'https://lab.asciende.pro',
    'https://endurance.asciende.pro',
    'https://nutrition.asciende.pro',
    'https://academy.asciende.pro',
    'https://motion.asciende.pro',
    'https://performance.asciende.pro',
  ];

  const requestOrigin = origin || '';

  // Allow all asciende.pro subdomains
  const isAllowed = allowedOrigins.some(allowed => requestOrigin === allowed)
    || requestOrigin.includes('webcontainer')
    || requestOrigin.includes('.asciende.pro')
    || requestOrigin.endsWith('asciende.pro')
    || requestOrigin.includes('localhost')
    || requestOrigin.includes('127.0.0.1');

  const allowOrigin = isAllowed ? requestOrigin : '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, Cookie',
    'Access-Control-Allow-Credentials': isAllowed ? 'true' : 'false',
  };
}

function parseCookie(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);
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
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get JWT token from Authorization header OR cookie
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;

    // Try Authorization header first (for satellite apps)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('✅ Token found in Authorization header');
    } else {
      // Fall back to cookie (for HUB)
      const cookieHeader = req.headers.get('cookie');
      const cookies = parseCookie(cookieHeader);
      token = cookies['asciende_auth'];
      if (token) {
        console.log('✅ Token found in cookie');
      }
    }

    if (!token) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          error: 'No authentication token found in Authorization header or cookie'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwtSecret = Deno.env.get('JWT_SECRET')!;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(jwtSecret);

    try {
      const { payload } = await jose.jwtVerify(token, secret);

      // Return user information including membership fields
      return new Response(
        JSON.stringify({
          authenticated: true,
          user: {
            id: payload.user_id,
            email: payload.email,
            role: payload.role,
            active_plan: payload.active_plan || [],
            membership_slug: payload.membership_slug || 'inicia',
            membership_name: payload.membership_name || 'Asciende Inicia',
            issued_at: payload.iat,
            expires_at: payload.exp,
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
    } catch (jwtError) {
      // Token is invalid or expired
      return new Response(
        JSON.stringify({
          authenticated: false,
          error: 'Invalid or expired token'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Auth validation error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        authenticated: false,
        error: 'Internal server error',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
