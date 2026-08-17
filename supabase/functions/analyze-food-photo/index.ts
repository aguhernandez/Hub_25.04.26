import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FoodItem {
  name: string;
  name_es: string;
  confidence: number;
  estimated_portion_grams: number;
  estimated_kcal: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
}

interface AnalysisResult {
  success: boolean;
  confidence: number;
  food_items: FoodItem[];
  meal_type_suggestion: string;
  quality_score: number;
  needs_manual_review: boolean;
  processing_time_ms: number;
  error?: string;
}

// Hugging Face free models
const HF_MODELS = {
  captioning: "Salesforce/blip-image-captioning-large",
  food_classification: "nateraw/food",
  fallback: "microsoft/resnet-50"
};

// Standard portion sizes (grams)
const STANDARD_PORTIONS: Record<string, number> = {
  rice: 150,
  pasta: 150,
  chicken: 150,
  beef: 150,
  fish: 150,
  egg: 50,
  bread: 30,
  apple: 150,
  banana: 120,
  salad: 100,
  vegetables: 100,
  default: 100
};

// Estimated macros per 100g (fallback if not in database)
const MACRO_ESTIMATES: Record<string, { kcal: number; carbs: number; protein: number; fat: number; fiber: number }> = {
  rice: { kcal: 130, carbs: 28, protein: 2.7, fat: 0.3, fiber: 0.4 },
  pasta: { kcal: 131, carbs: 25, protein: 5, fat: 1.1, fiber: 1.8 },
  chicken: { kcal: 165, carbs: 0, protein: 31, fat: 3.6, fiber: 0 },
  beef: { kcal: 250, carbs: 0, protein: 26, fat: 15, fiber: 0 },
  fish: { kcal: 206, carbs: 0, protein: 22, fat: 12, fiber: 0 },
  egg: { kcal: 155, carbs: 1.1, protein: 13, fat: 11, fiber: 0 },
  bread: { kcal: 265, carbs: 49, protein: 9, fat: 3.2, fiber: 2.7 },
  apple: { kcal: 52, carbs: 14, protein: 0.3, fat: 0.2, fiber: 2.4 },
  banana: { kcal: 89, carbs: 23, protein: 1.1, fat: 0.3, fiber: 2.6 },
  salad: { kcal: 15, carbs: 3, protein: 1, fat: 0.2, fiber: 1.5 },
  vegetables: { kcal: 25, carbs: 5, protein: 1, fat: 0.2, fiber: 2 },
  default: { kcal: 100, carbs: 15, protein: 5, fat: 3, fiber: 1 }
};

// Food name translations
const FOOD_TRANSLATIONS: Record<string, string> = {
  'rice': 'arroz',
  'pasta': 'pasta',
  'chicken': 'pollo',
  'beef': 'carne',
  'fish': 'pescado',
  'egg': 'huevo',
  'bread': 'pan',
  'apple': 'manzana',
  'banana': 'plátano',
  'salad': 'ensalada',
  'vegetables': 'verduras'
};

async function callHuggingFace(imageBase64: string, model: string): Promise<any> {
  const HF_TOKEN = Deno.env.get('HUGGING_FACE_TOKEN');
  
  // If no token, use public inference API (rate limited but free)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (HF_TOKEN) {
    headers['Authorization'] = `Bearer ${HF_TOKEN}`;
  }

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ inputs: imageBase64 })
    }
  );

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.statusText}`);
  }

  return await response.json();
}

async function analyzeImageWithHuggingFace(imageBase64: string): Promise<{ description: string; confidence: number }> {
  try {
    // Try image captioning first
    const captionResult = await callHuggingFace(imageBase64, HF_MODELS.captioning);
    
    if (captionResult && captionResult[0]?.generated_text) {
      return {
        description: captionResult[0].generated_text,
        confidence: 0.75 // Caption models don't return confidence
      };
    }
  } catch (error) {
    console.error('Captioning failed:', error);
  }

  // Fallback to food classification
  try {
    const classResult = await callHuggingFace(imageBase64, HF_MODELS.food_classification);
    
    if (classResult && classResult[0]) {
      return {
        description: classResult[0].label,
        confidence: classResult[0].score
      };
    }
  } catch (error) {
    console.error('Classification failed:', error);
  }

  throw new Error('All AI models failed');
}

function extractFoodItems(description: string, confidence: number): FoodItem[] {
  const lowerDesc = description.toLowerCase();
  const items: FoodItem[] = [];

  // Parse description to find food items
  const foodKeywords = Object.keys(STANDARD_PORTIONS);
  
  for (const keyword of foodKeywords) {
    if (lowerDesc.includes(keyword)) {
      const portionGrams = STANDARD_PORTIONS[keyword] || STANDARD_PORTIONS.default;
      const macros = MACRO_ESTIMATES[keyword] || MACRO_ESTIMATES.default;
      
      // Calculate for the portion size
      const factor = portionGrams / 100;
      
      items.push({
        name: keyword,
        name_es: FOOD_TRANSLATIONS[keyword] || keyword,
        confidence: confidence * 0.9, // Slightly lower confidence for extraction
        estimated_portion_grams: portionGrams,
        estimated_kcal: Math.round(macros.kcal * factor),
        carbs_g: Math.round(macros.carbs * factor * 10) / 10,
        protein_g: Math.round(macros.protein * factor * 10) / 10,
        fat_g: Math.round(macros.fat * factor * 10) / 10,
        fiber_g: Math.round(macros.fiber * factor * 10) / 10
      });
    }
  }

  // If no specific food found, create a generic item
  if (items.length === 0) {
    const portionGrams = STANDARD_PORTIONS.default;
    const macros = MACRO_ESTIMATES.default;
    const factor = portionGrams / 100;
    
    items.push({
      name: description.split(' ').slice(0, 3).join(' '),
      name_es: description.split(' ').slice(0, 3).join(' '),
      confidence: confidence * 0.6,
      estimated_portion_grams: portionGrams,
      estimated_kcal: Math.round(macros.kcal * factor),
      carbs_g: Math.round(macros.carbs * factor * 10) / 10,
      protein_g: Math.round(macros.protein * factor * 10) / 10,
      fat_g: Math.round(macros.fat * factor * 10) / 10,
      fiber_g: Math.round(macros.fiber * factor * 10) / 10
    });
  }

  return items;
}

function suggestMealType(): string {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  if (hour >= 18 && hour < 23) return 'dinner';
  
  return 'snack';
}

async function logMetrics(supabase: any, userId: string, success: boolean, processingTime: number, confidence: number) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create today's metrics
    const { data: existing } = await supabase
      .from('ai_usage_metrics')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      // Update existing
      const totalRequests = existing.total_requests + 1;
      const successfulRequests = existing.successful_requests + (success ? 1 : 0);
      const failedRequests = existing.failed_requests + (success ? 0 : 1);
      const avgProcessingTime = ((existing.avg_processing_time_ms * existing.total_requests) + processingTime) / totalRequests;
      const avgConfidence = success 
        ? ((existing.avg_confidence * existing.successful_requests) + confidence) / successfulRequests
        : existing.avg_confidence;

      await supabase
        .from('ai_usage_metrics')
        .update({
          total_requests: totalRequests,
          successful_requests: successfulRequests,
          failed_requests: failedRequests,
          avg_processing_time_ms: avgProcessingTime,
          avg_confidence: avgConfidence
        })
        .eq('id', existing.id);
    } else {
      // Create new
      await supabase
        .from('ai_usage_metrics')
        .insert({
          date: today,
          total_requests: 1,
          successful_requests: success ? 1 : 0,
          failed_requests: success ? 0 : 1,
          avg_processing_time_ms: processingTime,
          avg_confidence: success ? confidence : 0,
          phase_active: 'huggingface'
        });
    }

    // Check for alerts (700 and 950 thresholds)
    if (existing && existing.total_requests === 700) {
      // Send notification to admin
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'system',
          title: 'AI Usage Warning',
          message: '700 daily AI requests reached. Consider preparing Phase 2 migration.',
          priority: 'medium'
        });
    }

    if (existing && existing.total_requests === 950) {
      // Send urgent notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'system',
          title: 'AI Usage Alert',
          message: '950 daily AI requests reached. Phase 2 migration recommended soon.',
          priority: 'high'
        });
    }
  } catch (error) {
    console.error('Failed to log metrics:', error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { image } = await req.json();
    if (!image) {
      throw new Error('Missing image data');
    }

    // Analyze image with AI
    const { description, confidence } = await analyzeImageWithHuggingFace(image);
    
    // Extract food items
    const foodItems = extractFoodItems(description, confidence);
    
    // Calculate quality score based on confidence
    const qualityScore = confidence;
    const needsManualReview = confidence < 0.6;
    
    const processingTime = Date.now() - startTime;

    const result: AnalysisResult = {
      success: true,
      confidence,
      food_items: foodItems,
      meal_type_suggestion: suggestMealType(),
      quality_score: qualityScore,
      needs_manual_review: needsManualReview,
      processing_time_ms: processingTime
    };

    // Log metrics asynchronously
    logMetrics(supabase, user.id, true, processingTime, confidence);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error analyzing food photo:', error);

    // Try to log failed attempt
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          logMetrics(supabase, user.id, false, processingTime, 0);
        }
      }
    } catch (e) {
      console.error('Failed to log error metrics:', e);
    }

    const result: AnalysisResult = {
      success: false,
      confidence: 0,
      food_items: [],
      meal_type_suggestion: suggestMealType(),
      quality_score: 0,
      needs_manual_review: true,
      processing_time_ms: processingTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200, // Return 200 even on error so frontend can handle gracefully
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});