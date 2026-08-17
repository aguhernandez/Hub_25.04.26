import { OFFProduct } from './openFoodFactsClient';

export interface NormalizedFoodData {
  name: string;
  name_es: string;
  name_en: string;
  brand?: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturated_fat?: number;
  calcium?: number;
  iron?: number;
  vitamin_c?: number;
  vitamin_a?: number;
  vitamin_d?: number;
  source: 'OFF';
  off_product_id: string;
  off_last_sync: string;
  is_verified: boolean;
}

export function normalizeOpenFoodFactsData(product: OFFProduct): NormalizedFoodData | null {
  if (!product || !product.code || !product.product_name) {
    return null;
  }

  const nutriments = product.nutriments || {};

  const calories = nutriments['energy-kcal_100g'] ?? 0;
  const protein = nutriments['proteins_100g'] ?? 0;
  const carbs = nutriments['carbohydrates_100g'] ?? 0;
  const fat = nutriments['fat_100g'] ?? 0;

  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
    return null;
  }

  let sodiumMg = 0;
  if (nutriments['sodium_100g'] !== undefined) {
    sodiumMg = nutriments['sodium_100g'] * 1000;
  } else if (nutriments['salt_100g'] !== undefined) {
    sodiumMg = (nutriments['salt_100g'] / 2.5) * 1000;
  }

  const productName = product.product_name.trim();

  const normalized: NormalizedFoodData = {
    name: productName,
    name_es: productName,
    name_en: productName,
    brand: product.brands?.trim() || undefined,
    serving_size: '100 g',
    calories: Math.round(calories * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round((nutriments['fiber_100g'] ?? 0) * 10) / 10,
    sugar: Math.round((nutriments['sugars_100g'] ?? 0) * 10) / 10,
    sodium: Math.round(sodiumMg * 10) / 10,
    source: 'OFF',
    off_product_id: product.code,
    off_last_sync: new Date().toISOString(),
    is_verified: false
  };

  if (nutriments['saturated-fat_100g'] !== undefined) {
    normalized.saturated_fat = Math.round(nutriments['saturated-fat_100g'] * 10) / 10;
  }

  if (nutriments['calcium_100g'] !== undefined) {
    normalized.calcium = Math.round(nutriments['calcium_100g'] * 1000 * 10) / 10;
  }

  if (nutriments['iron_100g'] !== undefined) {
    normalized.iron = Math.round(nutriments['iron_100g'] * 1000 * 10) / 10;
  }

  if (nutriments['vitamin-c_100g'] !== undefined) {
    normalized.vitamin_c = Math.round(nutriments['vitamin-c_100g'] * 1000 * 10) / 10;
  }

  if (nutriments['vitamin-a_100g'] !== undefined) {
    normalized.vitamin_a = Math.round(nutriments['vitamin-a_100g'] * 1000000 * 10) / 10;
  }

  if (nutriments['vitamin-d_100g'] !== undefined) {
    normalized.vitamin_d = Math.round(nutriments['vitamin-d_100g'] * 1000000 * 10) / 10;
  }

  return normalized;
}

export async function saveOFFProductToDatabase(
  supabase: any,
  normalizedData: NormalizedFoodData
): Promise<{ id: string } | null> {
  try {
    const { data: existing } = await supabase
      .from('foods')
      .select('id')
      .eq('off_product_id', normalizedData.off_product_id)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('foods')
      .insert({
        name: normalizedData.name,
        name_es: normalizedData.name_es,
        name_en: normalizedData.name_en,
        brand: normalizedData.brand,
        serving_size: normalizedData.serving_size,
        calories: normalizedData.calories,
        protein: normalizedData.protein,
        carbs: normalizedData.carbs,
        fat: normalizedData.fat,
        fiber: normalizedData.fiber,
        sugar: normalizedData.sugar,
        sodium: normalizedData.sodium,
        saturated_fat: normalizedData.saturated_fat,
        calcium: normalizedData.calcium,
        iron: normalizedData.iron,
        vitamin_c: normalizedData.vitamin_c,
        vitamin_a: normalizedData.vitamin_a,
        vitamin_d: normalizedData.vitamin_d,
        source: normalizedData.source,
        off_product_id: normalizedData.off_product_id,
        off_last_sync: normalizedData.off_last_sync,
        is_verified: normalizedData.is_verified
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving OFF product to database:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in saveOFFProductToDatabase:', error);
    return null;
  }
}
