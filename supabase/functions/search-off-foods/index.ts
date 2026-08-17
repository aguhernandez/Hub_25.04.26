import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OFF_API_BASE = 'https://world.openfoodfacts.org';
const OFF_SEARCH_ENDPOINT = '/cgi/search.pl';
const REQUEST_TIMEOUT = 10000;

const MAX_RESULTS = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OFFProduct {
  code: string;
  product_name: string;
  brands?: string;
  categories_tags?: string[];
  nova_group?: number;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'carbohydrates_100g'?: number;
    'fat_100g'?: number;
    'fiber_100g'?: number;
    'sugars_100g'?: number;
    'sodium_100g'?: number;
    'salt_100g'?: number;
    'saturated-fat_100g'?: number;
  };
}

function hasValidNutrition(product: OFFProduct): boolean {
  if (!product.product_name || product.product_name.trim().length === 0) {
    return false;
  }

  const nutriments = product.nutriments || {};
  const calories = nutriments['energy-kcal_100g'] ?? 0;
  const protein = nutriments['proteins_100g'] ?? 0;
  const carbs = nutriments['carbohydrates_100g'] ?? 0;
  const fat = nutriments['fat_100g'] ?? 0;

  return calories > 0 || protein > 0 || carbs > 0 || fat > 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '20', 10);

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const params = new URLSearchParams({
      search_terms: query.trim(),
      search_simple: '1',
      action: 'process',
      json: '1',
      page: page.toString(),
      page_size: Math.min(pageSize, 50).toString(),
      lc: 'es',
      fields: [
        'code',
        'product_name',
        'brands',
        'categories_tags',
        'nova_group',
        'nutriments'
      ].join(',')
    });

    const offUrl = `${OFF_API_BASE}${OFF_SEARCH_ENDPOINT}?${params}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(offUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Asciende - Nutrition Management Platform - contact@asciende.app'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('OFF API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'OFF API request failed' }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const allProducts = data.products || [];

    const validProducts = allProducts
      .filter((product: OFFProduct) => hasValidNutrition(product))
      .slice(0, MAX_RESULTS);

    return new Response(
      JSON.stringify({
        products: validProducts,
        count: validProducts.length,
        page: page,
        page_size: validProducts.length,
        total_results_before_filter: allProducts.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in search-off-foods:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});