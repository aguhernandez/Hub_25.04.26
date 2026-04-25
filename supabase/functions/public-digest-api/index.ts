import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const url = new URL(req.url);
    const params = url.searchParams;

    const limit = parseInt(params.get('limit') || '10');
    const language = params.get('language') || null;
    const category = params.get('category') || null;
    const sport = params.get('sport') || null;
    const articleId = params.get('id') || null;

    if (articleId) {
      const { data: article, error } = await supabase
        .from('digest_articles')
        .select(`
          id,
          title,
          subtitle,
          content,
          image_url,
          category,
          sport,
          article_language,
          reading_time_minutes,
          published_date,
          view_count,
          author:profiles!digest_articles_author_id_fkey(full_name)
        `)
        .eq('id', articleId)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;

      if (!article) {
        return new Response(
          JSON.stringify({ error: 'Article not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      await supabase.rpc('increment_digest_views', {
        article_uuid: articleId,
      });

      return new Response(
        JSON.stringify({
          ...article,
          author_name: article.author?.full_name || 'Unknown',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let query = supabase
      .from('digest_articles')
      .select(`
        id,
        title,
        subtitle,
        image_url,
        category,
        sport,
        article_language,
        reading_time_minutes,
        published_date,
        view_count,
        is_premium,
        author:profiles!digest_articles_author_id_fkey(full_name)
      `)
      .eq('is_published', true)
      .order('published_date', { ascending: false })
      .limit(limit);

    if (language) {
      query = query.eq('article_language', language);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (sport) {
      query = query.eq('sport', sport);
    }

    const { data: articles, error } = await query;

    if (error) throw error;

    const articlesWithAuthor = articles?.map((article: any) => ({
      ...article,
      author_name: article.author?.full_name || 'Unknown',
      preview: article.subtitle || article.title,
    })) || [];

    return new Response(
      JSON.stringify({
        articles: articlesWithAuthor,
        count: articlesWithAuthor.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in public-digest-api:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
