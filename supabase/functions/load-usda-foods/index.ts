import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';

const COMMON_FOODS = [
  { fdcId: 171477, category: 'meat', searchName: 'Chicken, broiler, breast' },
  { fdcId: 175167, category: 'fish', searchName: 'Fish, salmon, Atlantic, wild' },
  { fdcId: 173424, category: 'egg', searchName: 'Egg, whole, raw' },
  { fdcId: 174608, category: 'meat', searchName: 'Beef, ground, 90% lean' },
  { fdcId: 168559, category: 'fish', searchName: 'Tuna, canned in water' },
  { fdcId: 170903, category: 'dairy', searchName: 'Yogurt, Greek, plain' },
  { fdcId: 171265, category: 'dairy', searchName: 'Milk, 2%' },
  { fdcId: 173410, category: 'dairy', searchName: 'Cheese, cheddar' },
  { fdcId: 168878, category: 'grain', searchName: 'Rice, brown' },
  { fdcId: 173904, category: 'grain', searchName: 'Oats' },
  { fdcId: 169716, category: 'grain', searchName: 'Quinoa' },
  { fdcId: 168874, category: 'grain', searchName: 'Bread, whole-wheat' },
  { fdcId: 169757, category: 'grain', searchName: 'Pasta, whole-wheat' },
  { fdcId: 173944, category: 'fruit', searchName: 'Bananas' },
  { fdcId: 171688, category: 'fruit', searchName: 'Apples' },
  { fdcId: 167765, category: 'fruit', searchName: 'Orange' },
  { fdcId: 174682, category: 'fruit', searchName: 'Strawberries' },
  { fdcId: 173946, category: 'fruit', searchName: 'Blueberries' },
  { fdcId: 170379, category: 'vegetable', searchName: 'Broccoli' },
  { fdcId: 169228, category: 'vegetable', searchName: 'Spinach' },
  { fdcId: 168409, category: 'vegetable', searchName: 'Sweet potato' },
  { fdcId: 170000, category: 'vegetable', searchName: 'Carrots' },
  { fdcId: 169967, category: 'vegetable', searchName: 'Tomatoes' },
  { fdcId: 170417, category: 'vegetable', searchName: 'Peppers, red' },
  { fdcId: 170567, category: 'nuts', searchName: 'Almonds' },
  { fdcId: 170187, category: 'nuts', searchName: 'Walnuts' },
  { fdcId: 170562, category: 'nuts', searchName: 'Peanut butter' },
  { fdcId: 170556, category: 'nuts', searchName: 'Chia seeds' },
  { fdcId: 173757, category: 'legume', searchName: 'Black beans' },
  { fdcId: 173758, category: 'legume', searchName: 'Chickpeas' },
  { fdcId: 174270, category: 'legume', searchName: 'Lentils' },
  { fdcId: 171413, category: 'fat', searchName: 'Olive oil' },
  { fdcId: 171705, category: 'fat', searchName: 'Avocado' },
];

const NUTRIENT_IDS = {
  calories: 1008, protein: 1003, carbs: 1005, fat: 1004,
  fiber: 1079, sugar: 2000, calcium: 1087, iron: 1089,
  magnesium: 1090, phosphorus: 1091, potassium: 1092,
  sodium: 1093, zinc: 1095, vitamin_a: 1106, vitamin_c: 1162,
  vitamin_d: 1114, vitamin_e: 1109, vitamin_k: 1185,
  vitamin_b1: 1165, vitamin_b2: 1166, vitamin_b3: 1167,
  vitamin_b6: 1175, vitamin_b12: 1178, folate: 1177,
};

function extractNutrient(foodData: any, nutrientId: number) {
  const nutrient = foodData.foodNutrients?.find((n: any) => n.nutrient.id === nutrientId);
  return nutrient?.amount || 0;
}

async function translateName(englishName: string) {
  const translations: any = {
    'Chicken': 'Pollo', 'breast': 'pechuga', 'thigh': 'muslo', 'wing': 'ala',
    'Fish': 'Pescado', 'salmon': 'salmón', 'tuna': 'atún', 'cod': 'bacalao',
    'tilapia': 'tilapia', 'trout': 'trucha', 'sardine': 'sardina',
    'Egg': 'Huevo', 'white': 'clara', 'yolk': 'yema', 'whole': 'entero',
    'Beef': 'Res', 'Pork': 'Cerdo', 'Turkey': 'Pavo', 'Duck': 'Pato',
    'ground': 'molida', 'steak': 'bistec', 'loin': 'lomo', 'rib': 'costilla',
    'Yogurt': 'Yogur', 'Greek': 'Griego', 'plain': 'natural', 'vanilla': 'vainilla',
    'Milk': 'Leche', 'whole': 'entera', 'skim': 'descremada', '2%': '2%',
    'Cheese': 'Queso', 'cheddar': 'cheddar', 'mozzarella': 'mozzarella', 'parmesan': 'parmesano',
    'Rice': 'Arroz', 'brown': 'integral', 'white': 'blanco', 'wild': 'salvaje',
    'Oats': 'Avena', 'Quinoa': 'Quinua', 'Bread': 'Pan', 'Pasta': 'Pasta',
    'wheat': 'trigo', 'grain': 'grano', 'flour': 'harina',
    'Banana': 'Plátano', 'Bananas': 'Plátanos', 'Apple': 'Manzana', 'Apples': 'Manzanas',
    'Orange': 'Naranja', 'Strawberry': 'Fresa', 'Strawberries': 'Fresas',
    'Blueberry': 'Arándano', 'Blueberries': 'Arándanos', 'Raspberry': 'Frambuesa',
    'Blackberry': 'Mora', 'Grape': 'Uva', 'Grapes': 'Uvas', 'Watermelon': 'Sandía',
    'Melon': 'Melón', 'Pineapple': 'Piña', 'Mango': 'Mango', 'Papaya': 'Papaya',
    'Kiwi': 'Kiwi', 'Pear': 'Pera', 'Peach': 'Durazno', 'Cherry': 'Cereza',
    'Broccoli': 'Brócoli', 'Spinach': 'Espinaca', 'Lettuce': 'Lechuga',
    'Tomato': 'Tomate', 'Tomatoes': 'Tomates', 'Carrot': 'Zanahoria', 'Carrots': 'Zanahorias',
    'Pepper': 'Pimiento', 'Peppers': 'Pimientos', 'Onion': 'Cebolla', 'Garlic': 'Ajo',
    'Potato': 'Papa', 'Potatoes': 'Papas', 'Sweet potato': 'Batata', 'Yam': 'Ñame',
    'Cucumber': 'Pepino', 'Zucchini': 'Calabacín', 'Squash': 'Calabaza',
    'Cauliflower': 'Coliflor', 'Cabbage': 'Repollo', 'Celery': 'Apio',
    'Asparagus': 'Espárrago', 'Mushroom': 'Champiñón', 'Eggplant': 'Berenjena',
    'Almond': 'Almendra', 'Almonds': 'Almendras', 'Walnut': 'Nuez', 'Walnuts': 'Nueces',
    'Cashew': 'Anacardo', 'Cashews': 'Anacardos', 'Pistachio': 'Pistacho',
    'Peanut': 'Maní', 'Peanuts': 'Maníes', 'butter': 'mantequilla',
    'Seed': 'Semilla', 'seeds': 'semillas', 'Chia': 'Chía', 'Flax': 'Linaza',
    'Sunflower': 'Girasol', 'Pumpkin': 'Calabaza',
    'Bean': 'Frijol', 'beans': 'frijoles', 'Black': 'Negro', 'Kidney': 'Rojo',
    'Pinto': 'Pinto', 'Navy': 'Blanco', 'Chickpea': 'Garbanzo', 'Chickpeas': 'Garbanzos',
    'Lentil': 'Lenteja', 'Lentils': 'Lentejas', 'Pea': 'Guisante', 'Peas': 'Guisantes',
    'Oil': 'Aceite', 'oil': 'aceite', 'Olive': 'Oliva', 'Coconut': 'Coco',
    'Avocado': 'Aguacate', 'Butter': 'Mantequilla',
    'raw': 'crudo', 'cooked': 'cocido', 'boiled': 'hervido', 'baked': 'horneado',
    'fried': 'frito', 'grilled': 'asado', 'roasted': 'tostado', 'steamed': 'al vapor',
    'fresh': 'fresco', 'frozen': 'congelado', 'canned': 'enlatado', 'dried': 'seco',
    'salted': 'salado', 'unsalted': 'sin sal', 'sweetened': 'endulzado',
    'unsweetened': 'sin azúcar', 'organic': 'orgánico', 'wild': 'salvaje',
    'lean': 'magro', 'fat-free': 'sin grasa', 'low-fat': 'bajo en grasa',
    'reduced': 'reducido', 'enriched': 'enriquecido', 'fortified': 'fortificado',
    'cup': 'taza', 'piece': 'pieza', 'slice': 'rebanada', 'serving': 'porción',
    'medium': 'mediano', 'large': 'grande', 'small': 'pequeño',
  };

  let spanish = englishName;
  Object.entries(translations).forEach(([en, es]) => {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    spanish = spanish.replace(regex, (match) => {
      if (match[0] === match[0].toUpperCase()) {
        return (es as string).charAt(0).toUpperCase() + (es as string).slice(1);
      }
      return es as string;
    });
  });

  return spanish;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const USDA_API_KEY = Deno.env.get('USDA_API_KEY');
    if (!USDA_API_KEY) {
      throw new Error('USDA_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { deleteExisting, fdcIds } = await req.json().catch(() => ({ deleteExisting: true, fdcIds: null }));

    if (deleteExisting) {
      await supabaseClient.from('foods').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const results = [];
    let newCount = 0;
    let updateCount = 0;

    const foodsToLoad = fdcIds
      ? fdcIds.map((id: number) => ({ fdcId: id, searchName: `FDC ${id}`, category: 'other' }))
      : COMMON_FOODS;

    console.log(`📦 Processing ${foodsToLoad.length} foods...`);

    for (const food of foodsToLoad) {
      console.log(`🔍 Fetching FDC ID: ${food.fdcId}`);
      const usdaUrl = `${USDA_API_URL}/food/${food.fdcId}?api_key=${USDA_API_KEY}`;
      const usdaResponse = await fetch(usdaUrl);

      if (!usdaResponse.ok) {
        const errorMsg = `USDA API error: ${usdaResponse.status} ${usdaResponse.statusText}`;
        console.error(`❌ ${errorMsg} for FDC ${food.fdcId}`);
        results.push({ food: food.searchName, status: 'error', message: errorMsg });
        continue;
      }

      const usdaData = await usdaResponse.json();
      const name_en = usdaData.description || food.searchName;
      const name_es = await translateName(name_en);

      let category = food.category || 'other';
      if (!fdcIds) {
        category = food.category;
      } else {
        const foodGroup = usdaData.foodCategory?.toLowerCase() || '';
        if (foodGroup.includes('poultry') || foodGroup.includes('meat')) category = 'meat';
        else if (foodGroup.includes('fish') || foodGroup.includes('seafood')) category = 'fish';
        else if (foodGroup.includes('dairy')) category = 'dairy';
        else if (foodGroup.includes('egg')) category = 'egg';
        else if (foodGroup.includes('grain') || foodGroup.includes('cereal')) category = 'grain';
        else if (foodGroup.includes('fruit')) category = 'fruit';
        else if (foodGroup.includes('vegetable')) category = 'vegetable';
        else if (foodGroup.includes('nut') || foodGroup.includes('seed')) category = 'nuts';
        else if (foodGroup.includes('legume') || foodGroup.includes('bean')) category = 'legume';
        else if (foodGroup.includes('oil') || foodGroup.includes('fat')) category = 'fat';
      }

      const foodRecord = {
        name: name_en,
        name_en,
        name_es,
        category,
        brand: null,
        serving_size: 100,
        source: 'usda',
        calories_per_100g: extractNutrient(usdaData, NUTRIENT_IDS.calories),
        protein_per_100g: extractNutrient(usdaData, NUTRIENT_IDS.protein),
        carbs_per_100g: extractNutrient(usdaData, NUTRIENT_IDS.carbs),
        fat_per_100g: extractNutrient(usdaData, NUTRIENT_IDS.fat),
        fiber_per_100g: extractNutrient(usdaData, NUTRIENT_IDS.fiber),
        sugar_per_100g: extractNutrient(usdaData, NUTRIENT_IDS.sugar),
        vitamin_a_mcg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_a),
        vitamin_b1_mg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_b1),
        vitamin_b2_mg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_b2),
        vitamin_b3_mg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_b3),
        vitamin_b6_mg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_b6),
        vitamin_b12_mcg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_b12),
        vitamin_c_mg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_c),
        vitamin_d_mcg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_d),
        vitamin_e_mg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_e),
        vitamin_k_mcg: extractNutrient(usdaData, NUTRIENT_IDS.vitamin_k),
        folate_mcg: extractNutrient(usdaData, NUTRIENT_IDS.folate),
        calcium_mg: extractNutrient(usdaData, NUTRIENT_IDS.calcium),
        iron_mg: extractNutrient(usdaData, NUTRIENT_IDS.iron),
        magnesium_mg: extractNutrient(usdaData, NUTRIENT_IDS.magnesium),
        phosphorus_mg: extractNutrient(usdaData, NUTRIENT_IDS.phosphorus),
        potassium_mg: extractNutrient(usdaData, NUTRIENT_IDS.potassium),
        sodium_mg: extractNutrient(usdaData, NUTRIENT_IDS.sodium),
        zinc_mg: extractNutrient(usdaData, NUTRIENT_IDS.zinc),
        usda_fdc_id: food.fdcId.toString(),
      };

      console.log(`💾 Inserting/Updating: ${name_en} (${name_es})`);

      const { data: existingFood } = await supabaseClient
        .from('foods')
        .select('id')
        .eq('usda_fdc_id', food.fdcId.toString())
        .maybeSingle();

      let data, error;

      if (existingFood) {
        console.log(`🔄 Updating existing food with FDC ID ${food.fdcId}`);
        const result = await supabaseClient
          .from('foods')
          .update(foodRecord)
          .eq('id', existingFood.id)
          .select();
        data = result.data;
        error = result.error;
        if (!error) updateCount++;
      } else {
        console.log(`➕ Inserting new food with FDC ID ${food.fdcId}`);
        const result = await supabaseClient
          .from('foods')
          .insert(foodRecord)
          .select();
        data = result.data;
        error = result.error;
        if (!error) newCount++;
      }

      if (error) {
        console.error(`❌ Error for ${name_en}:`, error);
        results.push({ food: name_en, status: 'error', message: error.message, details: error });
      } else {
        console.log(`✅ Success: ${name_en} (${existingFood ? 'updated' : 'new'})`);
        results.push({ food: name_en, spanish: name_es, status: 'success', action: existingFood ? 'updated' : 'new' });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = foodsToLoad.length - successCount;

    console.log(`📊 Final results: ${newCount} new, ${updateCount} updated, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total: foodsToLoad.length,
        loaded: successCount,
        new: newCount,
        updated: updateCount,
        failed: failedCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});