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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

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
      .select('id, full_name, email, sport, role, notification_preferences');

    query = query.eq('sport', article.sport);

    if (article.target_roles && article.target_roles.length > 0) {
      query = query.in('role', article.target_roles);
    }

    const { data: targetUsers, error: usersError } = await query;

    if (usersError) throw usersError;

    if (!targetUsers || targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No target users found', notified: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/brevo-send-email`,
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
                    <a href="${Deno.env.get('SUPABASE_URL')}/digest/${article.id}" 
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
