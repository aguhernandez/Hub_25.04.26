Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const satellite = url.searchParams.get('satellite');

    if (!code || !satellite) {
      return new Response('Missing code or satellite parameter', {
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

    const redirectUrl = `${targetUrl}#sso_code=${encodeURIComponent(code)}`;

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
