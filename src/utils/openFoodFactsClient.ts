const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const OFF_EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/search-off-foods`;

const REQUEST_TIMEOUT = 15000;

export interface OFFProduct {
  code: string;
  product_name: string;
  brands?: string;
  quantity?: string;
  image_url?: string;
  categories_tags?: string[];
  nova_group?: number;
  nutriments: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'carbohydrates_100g'?: number;
    'fat_100g'?: number;
    'fiber_100g'?: number;
    'sugars_100g'?: number;
    'sodium_100g'?: number;
    'salt_100g'?: number;
    'saturated-fat_100g'?: number;
    'calcium_100g'?: number;
    'iron_100g'?: number;
    'vitamin-c_100g'?: number;
    'vitamin-a_100g'?: number;
    'vitamin-d_100g'?: number;
  };
}

export interface OFFSearchResult {
  products: OFFProduct[];
  count: number;
  page: number;
  page_size: number;
  total_results_before_filter?: number;
}

export async function fetchOpenFoodFacts(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<OFFSearchResult | null> {
  if (!query || query.trim().length < 2) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      query: query.trim(),
      page: page.toString(),
      page_size: pageSize.toString()
    });

    const url = `${OFF_EDGE_FUNCTION_URL}?${params}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('OFF Edge Function error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    return {
      products: data.products || [],
      count: data.count || 0,
      page: data.page || 1,
      page_size: data.page_size || pageSize,
      total_results_before_filter: data.total_results_before_filter
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('OFF API request timeout');
    } else {
      console.error('Error fetching from Open Food Facts:', error);
    }
    return null;
  }
}

export async function fetchOpenFoodFactsProduct(
  barcode: string
): Promise<OFFProduct | null> {
  if (!barcode || barcode.trim().length === 0) {
    return null;
  }

  try {
    const url = `${OFF_API_BASE}${OFF_PRODUCT_ENDPOINT}/${barcode.trim()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Asciende - Nutrition Management Platform - contact@asciende.app'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('OFF Product API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.status === 1 && data.product) {
      return data.product;
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('OFF Product API request timeout');
    } else {
      console.error('Error fetching product from Open Food Facts:', error);
    }
    return null;
  }
}
