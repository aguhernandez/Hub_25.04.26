import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  article_id: string;
  send_email?: boolean;
}

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

    const { article_id, send_email = false }: RequestBody = await req.json();

    if (!article_id) {
      return new Response(
        JSON.stringify({ error: 'article_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: article, error: articleError } = await supabase
      .from('digest_articles')
      .select('*, author:profiles!digest_articles_author_id_fkey(full_name)')
      .eq('id', article_id)
      .maybeSingle();

    if (articleError || !article) {
      return new Response(
        JSON.stringify({ error: 'Article not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let query = supabase
      .from('profiles')
      .select('id, full_name, email, sport, role, language, notification_preferences');

    query = query.eq('sport', article.sport);

    if (article.target_roles && article.target_roles.length > 0) {
      query = query.in('role', article.target_roles);
    }

    const { data: targetUsers, error: usersError } = await query;

    if (usersError) throw usersError;

    if (!targetUsers || targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No target users found', notified: 0, push_sent: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create in-app notification records
    const notifications = targetUsers.map((user) => ({
      user_id: user.id,
      type: 'digest_article',
      title: `New article: ${article.title}`,
      message: article.subtitle || 'Check out this new article',
      data: {
        article_id: article.id,
        category: article.category,
      },
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
    }

    // Send PUSH notifications grouped by language
    let pushResults: any[] = [];
    try {
      const usersByLang: Record<string, string[]> = { es: [], en: [] };
      for (const user of targetUsers) {
        const lang = user.language === 'es' ? 'es' : 'en';
        usersByLang[lang].push(user.id);
      }

      const localizedMessages = {
        es: {
          title: 'Nueva Performance Pill',
          body: article.title
            ? `${article.title}`
            : 'Hay un nuevo articulo disponible para ti',
        },
        en: {
          title: 'New Performance Pill',
          body: article.title
            ? `${article.title}`
            : 'There is a new article available for you',
        },
      };

      const sendUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

      for (const lang of ['es', 'en'] as const) {
        const ids = usersByLang[lang];
        if (ids.length === 0) continue;

        const msg = localizedMessages[lang];
        const response = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_ids: ids,
            title: msg.title,
            body: msg.body,
            data: { page: 'digest', article_id: article.id },
            category: 'performance_pills',
          }),
        });

        const result = await response.json();
        pushResults.push({ lang, ...result });
      }
    } catch (pushError) {
      console.error('Error sending push notifications:', pushError);
    }

    // Send emails if requested
    let emailsSent = 0;
    if (send_email) {
      const usersWithEmail = targetUsers.filter(
        (user) =>
          user.email &&
          user.notification_preferences?.email_digest !== false
      );

      for (const user of usersWithEmail) {
        try {
          const emailResponse = await fetch(
            `${supabaseUrl}/functions/v1/brevo-send-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({
                to: user.email,
                subject: `New Performance Digest: ${article.title}`,
                htmlContent: `
                  <h2>New Article Published!</h2>
                  <h3>${article.title}</h3>
                  <p>${article.subtitle || ''}</p>
                  <p><strong>Category:</strong> ${article.category}</p>
                  <p><strong>Reading time:</strong> ${article.reading_time_minutes} minutes</p>
                  <p>
                    <a href="${supabaseUrl}/digest/${article.id}"
                       style="background: #514163; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">
                      Read Article
                    </a>
                  </p>
                `,
              }),
            }
          );

          if (emailResponse.ok) {
            emailsSent++;
          }
        } catch (emailError) {
          console.error(`Error sending email to ${user.email}:`, emailError);
        }
      }

      await supabase
        .from('digest_articles')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', article_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified: targetUsers.length,
        emails_sent: emailsSent,
        push_results: pushResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in notify-new-digest-article:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
