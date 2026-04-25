import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret) {
      const expectedAuth = `Bearer ${cronSecret}`;
      const receivedToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
      const expectedToken = cronSecret.trim();
      
      if (!authHeader || receivedToken !== expectedToken) {
        console.error('Auth failed:', {
          received_header: authHeader,
          received_token: receivedToken,
          expected_token_length: expectedToken.length,
          received_token_length: receivedToken?.length || 0,
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized',
            hint: 'Check that Authorization header is set to: Bearer YOUR_SECRET'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      console.warn('CRON_SECRET not set - allowing all requests');
    }

    const now = new Date().toISOString();

    const { data: articlesToPublish, error: fetchError } = await supabase
      .from('digest_articles')
      .select('id, title, sport, target_roles')
      .eq('is_published', false)
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', now);

    if (fetchError) throw fetchError;

    if (!articlesToPublish || articlesToPublish.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No articles to publish', 
          published: 0 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    for (const article of articlesToPublish) {
      const { error: updateError } = await supabase
        .from('digest_articles')
        .update({
          is_published: true,
          published_date: now,
          auto_published: true,
        })
        .eq('id', article.id);

      if (updateError) {
        console.error(`Error publishing article ${article.id}:`, updateError);
        results.push({
          id: article.id,
          title: article.title,
          success: false,
          error: updateError.message,
        });
        continue;
      }

      try {
        await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-new-digest-article`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              article_id: article.id,
              send_email: true,
            }),
          }
        );

        results.push({
          id: article.id,
          title: article.title,
          success: true,
          notified: true,
        });
      } catch (notifyError: any) {
        console.error(`Error notifying for article ${article.id}:`, notifyError);
        results.push({
          id: article.id,
          title: article.title,
          success: true,
          notified: false,
          notify_error: notifyError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        published: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in auto-publish-scheduled-articles:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
