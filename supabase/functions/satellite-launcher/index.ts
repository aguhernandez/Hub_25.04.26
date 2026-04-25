Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const satellite = url.searchParams.get('satellite');

    if (!token || !satellite) {
      return new Response('Missing token or satellite parameter', {
        status: 400,
      });
    }

    const satelliteUrls: Record<string, string> = {
      endurance:   'https://endurance.asciende.pro',
      nutrition:   'https://nutrition.asciende.pro',
      academy:     'https://academy.asciende.pro',
      lab:         'https://lab.asciende.pro',
      biomechanic: 'https://motion.asciende.pro',
      performance: 'https://performance.asciende.pro',
    };

    const targetUrl = satelliteUrls[satellite];
    if (!targetUrl) {
      return new Response('Invalid satellite', {
        status: 400,
      });
    }

    const redirectUrl = `${targetUrl}?session_token=${token}`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error: unknown) {
    console.error('Launcher error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: errorMessage,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
