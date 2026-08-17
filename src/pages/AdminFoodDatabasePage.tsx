import { useEffect, useState } from 'react';
import { Users, Activity, Settings, TrendingUp, Download, Loader2, Search, Plus, CreditCard as Edit, Trash2, Languages, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';

export default function AdminFoodDatabasePage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useToast();

  const navigate = (page: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };
  const [totalFoods, setTotalFoods] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingUSDA, setLoadingUSDA] = useState(false);
  const [usdaResult, setUsdaResult] = useState<any>(null);
  const [showUSDASearch, setShowUSDASearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFoods, setSelectedFoods] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [expandedFood, setExpandedFood] = useState<number | null>(null);
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [customFood, setCustomFood] = useState({
    name: '',
    name_es: '',
    brand: '',
    serving_size: 100,
    serving_unit: 'g',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    category: 'supplement'
  });

  // Manage USDA Foods State
  const [showManageUSDA, setShowManageUSDA] = useState(false);
  const [usdaFoods, setUsdaFoods] = useState<any[]>([]);
  const [loadingUsdaFoods, setLoadingUsdaFoods] = useState(false);
  const [usdaSearchQuery, setUsdaSearchQuery] = useState('');
  const [editingFood, setEditingFood] = useState<any>(null);
  const [translating, setTranslating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const [editingNutrition, setEditingNutrition] = useState<any>(null);
  const [savingNutrition, setSavingNutrition] = useState(false);

  useEffect(() => {
    loadFoodStats();
  }, []);

  const loadFoodStats = async () => {
    setLoading(true);
    try {
      const { count } = await supabase
        .from('foods')
        .select('id', { count: 'exact', head: true });

      setTotalFoods(count || 0);
    } catch (error) {
      console.error('Error loading food stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUSDAFoods = async () => {
    setLoadingUSDA(true);
    setUsdaResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/load-usda-foods`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ deleteExisting: true }),
        }
      );

      const result = await response.json();
      setUsdaResult(result);

      if (result.success) {
        await loadFoodStats();
        showToast(
          language === 'es'
            ? `${result.loaded} alimentos cargados exitosamente`
            : `${result.loaded} foods loaded successfully`,
          'success'
        );
      } else {
        showToast(
          language === 'es'
            ? `Error: ${result.error}`
            : `Error: ${result.error}`,
          'error'
        );
      }
    } catch (error: any) {
      showToast(
        language === 'es'
          ? `Error al cargar alimentos: ${error.message}`
          : `Error loading foods: ${error.message}`,
        'error'
      );
    } finally {
      setLoadingUSDA(false);
    }
  };

  const searchUSDAFoods = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${import.meta.env.VITE_USDA_API_KEY || 'LAkz2nH6h7T67pbNCjDeelAfo2M0oxsBirZIQfsY'}&query=${encodeURIComponent(searchQuery)}&pageSize=50`
      );

      const data = await response.json();
      setSearchResults(data.foods || []);
    } catch (error) {
      showToast(
        language === 'es' ? 'Error al buscar alimentos' : 'Error searching foods',
        'error'
      );
    } finally {
      setSearching(false);
    }
  };

  const toggleFoodSelection = (fdcId: number) => {
    const newSelected = new Set(selectedFoods);
    if (newSelected.has(fdcId)) {
      newSelected.delete(fdcId);
    } else {
      newSelected.add(fdcId);
    }
    setSelectedFoods(newSelected);
  };

  const getMacrosFromFood = (food: any) => {
    const nutrients = food.foodNutrients || [];
    const protein = nutrients.find((n: any) => n.nutrientName === 'Protein')?.value || 0;
    const carbs = nutrients.find((n: any) => n.nutrientName === 'Carbohydrate, by difference')?.value || 0;
    const fat = nutrients.find((n: any) => n.nutrientName === 'Total lipid (fat)')?.value || 0;
    const calories = nutrients.find((n: any) => n.nutrientName === 'Energy')?.value || 0;
    return { protein, carbs, fat, calories };
  };

  const saveCustomFood = async () => {
    if (!customFood.name.trim()) {
      showToast(
        language === 'es' ? 'El nombre es requerido' : 'Name is required',
        'error'
      );
      return;
    }

    try {
      const { error } = await supabase.from('foods').insert({
        name: customFood.name,
        name_en: customFood.name,
        name_es: customFood.name_es || customFood.name,
        brand: customFood.brand || null,
        serving_size: customFood.serving_size,
        serving_unit: customFood.serving_unit,
        calories: customFood.calories,
        calories_per_100g: (customFood.calories / customFood.serving_size) * 100,
        protein: customFood.protein,
        protein_per_100g: (customFood.protein / customFood.serving_size) * 100,
        carbs: customFood.carbs,
        carbs_per_100g: (customFood.carbs / customFood.serving_size) * 100,
        fat: customFood.fat,
        fat_per_100g: (customFood.fat / customFood.serving_size) * 100,
        fiber: customFood.fiber,
        category: customFood.category,
        is_verified: true
      });

      if (error) throw error;

      await loadFoodStats();
      showToast(
        language === 'es' ? 'Alimento creado exitosamente' : 'Food created successfully',
        'success'
      );
      setShowCustomFoodModal(false);
      setCustomFood({
        name: '',
        name_es: '',
        brand: '',
        serving_size: 100,
        serving_unit: 'g',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        category: 'supplement'
      });
    } catch (error: any) {
      showToast(
        language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`,
        'error'
      );
    }
  };

  const loadUsdaFoods = async (page = 1) => {
    setLoadingUsdaFoods(true);
    try {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('foods')
        .select('*', { count: 'exact' })
        .eq('source', 'usda')
        .order('name_en', { ascending: true })
        .range(from, to);

      if (usdaSearchQuery.trim()) {
        query = query.or(`name_en.ilike.%${usdaSearchQuery}%,name_es.ilike.%${usdaSearchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setUsdaFoods(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setCurrentPage(page);
    } catch (error: any) {
      showToast(
        language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`,
        'error'
      );
    } finally {
      setLoadingUsdaFoods(false);
    }
  };

  const deleteFood = async (foodId: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este alimento?' : 'Delete this food?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', foodId);

      if (error) throw error;

      showToast(
        language === 'es' ? 'Alimento eliminado' : 'Food deleted',
        'success'
      );
      loadUsdaFoods(currentPage);
      loadFoodStats();
    } catch (error: any) {
      showToast(
        language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`,
        'error'
      );
    }
  };

  const saveTranslation = async () => {
    if (!editingFood) return;

    try {
      const { error } = await supabase
        .from('foods')
        .update({ name_es: editingFood.name_es })
        .eq('id', editingFood.id);

      if (error) throw error;

      showToast(
        language === 'es' ? 'Traducción guardada' : 'Translation saved',
        'success'
      );
      setEditingFood(null);
      loadUsdaFoods(currentPage);
    } catch (error: any) {
      showToast(
        language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`,
        'error'
      );
    }
  };

  const saveNutritionData = async () => {
    if (!editingNutrition) return;

    setSavingNutrition(true);
    try {
      const { error } = await supabase
        .from('foods')
        .update({
          calories: editingNutrition.calories || 0,
          protein: editingNutrition.protein || 0,
          carbs: editingNutrition.carbs || 0,
          fat: editingNutrition.fat || 0,
          fiber: editingNutrition.fiber || 0,
          sugar_per_100g: editingNutrition.sugar_per_100g || 0,
          calories_per_100g: editingNutrition.calories_per_100g || 0,
          protein_per_100g: editingNutrition.protein_per_100g || 0,
          carbs_per_100g: editingNutrition.carbs_per_100g || 0,
          fat_per_100g: editingNutrition.fat_per_100g || 0,
          fiber_per_100g: editingNutrition.fiber_per_100g || 0,
          vitamin_a_mcg: editingNutrition.vitamin_a_mcg || 0,
          vitamin_b1_mg: editingNutrition.vitamin_b1_mg || 0,
          vitamin_b2_mg: editingNutrition.vitamin_b2_mg || 0,
          vitamin_b3_mg: editingNutrition.vitamin_b3_mg || 0,
          vitamin_b6_mg: editingNutrition.vitamin_b6_mg || 0,
          vitamin_b12_mcg: editingNutrition.vitamin_b12_mcg || 0,
          vitamin_c_mg: editingNutrition.vitamin_c_mg || 0,
          vitamin_d_mcg: editingNutrition.vitamin_d_mcg || 0,
          vitamin_e_mg: editingNutrition.vitamin_e_mg || 0,
          vitamin_k_mcg: editingNutrition.vitamin_k_mcg || 0,
          folate_mcg: editingNutrition.folate_mcg || 0,
          calcium_mg: editingNutrition.calcium_mg || 0,
          iron_mg: editingNutrition.iron_mg || 0,
          magnesium_mg: editingNutrition.magnesium_mg || 0,
          phosphorus_mg: editingNutrition.phosphorus_mg || 0,
          potassium_mg: editingNutrition.potassium_mg || 0,
          sodium_mg: editingNutrition.sodium_mg || 0,
          zinc_mg: editingNutrition.zinc_mg || 0,
        })
        .eq('id', editingNutrition.id);

      if (error) throw error;

      showToast(
        language === 'es' ? 'Datos nutricionales guardados' : 'Nutrition data saved',
        'success'
      );
      setEditingNutrition(null);
      loadUsdaFoods(currentPage);
    } catch (error: any) {
      showToast(
        language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`,
        'error'
      );
    } finally {
      setSavingNutrition(false);
    }
  };

  const autoTranslate = async (food: any) => {
    setTranslating(true);
    try {
      // Simple translation dictionary for common food terms
      const translations: { [key: string]: string } = {
        'apple': 'manzana',
        'banana': 'plátano',
        'chicken': 'pollo',
        'beef': 'carne de res',
        'pork': 'cerdo',
        'fish': 'pescado',
        'salmon': 'salmón',
        'rice': 'arroz',
        'bread': 'pan',
        'milk': 'leche',
        'cheese': 'queso',
        'egg': 'huevo',
        'eggs': 'huevos',
        'carrot': 'zanahoria',
        'potato': 'papa',
        'tomato': 'tomate',
        'onion': 'cebolla',
        'orange': 'naranja',
        'strawberry': 'fresa',
        'yogurt': 'yogur',
        'butter': 'mantequilla',
        'oil': 'aceite',
        'sugar': 'azúcar',
        'salt': 'sal',
        'pepper': 'pimienta',
        'pasta': 'pasta',
        'beans': 'frijoles',
        'lentils': 'lentejas',
        'spinach': 'espinaca',
        'broccoli': 'brócoli',
        'lettuce': 'lechuga',
        'cucumber': 'pepino',
        'corn': 'maíz',
        'peas': 'guisantes',
        'mushroom': 'champiñón',
        'garlic': 'ajo',
        'lime': 'lima',
        'lemon': 'limón',
        'avocado': 'aguacate',
        'peanut': 'cacahuate',
        'almond': 'almendra',
        'walnut': 'nuez',
        'cashew': 'anacardo',
        'honey': 'miel',
        'chocolate': 'chocolate',
        'coffee': 'café',
        'tea': 'té',
        'water': 'agua',
        'juice': 'jugo'
      };

      let translated = food.name_en.toLowerCase();

      // Try to find matching words
      Object.keys(translations).forEach(english => {
        const regex = new RegExp(`\\b${english}\\b`, 'gi');
        translated = translated.replace(regex, translations[english]);
      });

      // Capitalize first letter
      translated = translated.charAt(0).toUpperCase() + translated.slice(1);

      setEditingFood({ ...food, name_es: translated });

      showToast(
        language === 'es'
          ? 'Traducción automática aplicada. Verifica y edita si es necesario.'
          : 'Auto-translation applied. Please review and edit if needed.',
        'success'
      );
    } catch (error: any) {
      showToast(
        language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`,
        'error'
      );
    } finally {
      setTranslating(false);
    }
  };

  const importSelectedFoods = async () => {
    if (selectedFoods.size === 0) {
      showToast(
        language === 'es' ? 'Selecciona al menos un alimento' : 'Select at least one food',
        'error'
      );
      return;
    }

    setImporting(true);
    console.log('🔄 Starting import for FDC IDs:', Array.from(selectedFoods));

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/load-usda-foods`;
      console.log('📡 Calling edge function:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          deleteExisting: false,
          fdcIds: Array.from(selectedFoods),
        }),
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Import error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Import result:', result);

      if (result.success) {
        await loadFoodStats();

        if (result.loaded > 0) {
          const newCount = result.new || 0;
          const updatedCount = result.updated || 0;
          const failedCount = result.failed || 0;

          let message = '';
          if (language === 'es') {
            const parts = [];
            if (newCount > 0) parts.push(`${newCount} nuevo${newCount > 1 ? 's' : ''}`);
            if (updatedCount > 0) parts.push(`${updatedCount} actualizado${updatedCount > 1 ? 's' : ''}`);
            if (failedCount > 0) parts.push(`${failedCount} fallido${failedCount > 1 ? 's' : ''}`);
            message = parts.join(', ');
          } else {
            const parts = [];
            if (newCount > 0) parts.push(`${newCount} new`);
            if (updatedCount > 0) parts.push(`${updatedCount} updated`);
            if (failedCount > 0) parts.push(`${failedCount} failed`);
            message = parts.join(', ');
          }

          showToast(message, failedCount > 0 ? 'error' : 'success');
        } else if (result.failed > 0) {
          console.error('❌ Import failed:', result.results);
          const errorDetails = result.results.map((r: any) => `${r.food}: ${r.message || r.details?.message || 'Unknown error'}`).join('\n');
          console.error('Error details:', errorDetails);
          showToast(
            language === 'es'
              ? `Error: ${errorDetails}`
              : `Error: ${errorDetails}`,
            'error'
          );
        } else {
          showToast(
            language === 'es'
              ? 'No se importaron alimentos'
              : 'No foods were imported',
            'error'
          );
        }

        setSelectedFoods(new Set());
        setSearchResults([]);
        setSearchQuery('');
        setShowUSDASearch(false);
      } else {
        console.error('❌ Import failed:', result.error);
        showToast(
          language === 'es' ? `Error: ${result.error}` : `Error: ${result.error}`,
          'error'
        );
      }
    } catch (error: any) {
      console.error('❌ Import error details:', error);
      showToast(
        language === 'es'
          ? `Error al importar: ${error.message}`
          : `Import error: ${error.message}`,
        'error'
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout currentPage="admin-foods">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {language === 'es' ? 'Base de Datos de Alimentos' : 'Food Database'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {language === 'es' ? 'Gestiona alimentos desde USDA, OFF o crea personalizados' : 'Manage foods from USDA, OFF or create custom ones'}
          </p>
        </div>

      <div className="mb-8">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 mb-2">
                {language === 'es' ? 'Total de Alimentos en Base de Datos' : 'Total Foods in Database'}
              </p>
              <h2 className="text-5xl font-bold">{totalFoods}</h2>
            </div>
            <div className="p-4 bg-white/20 rounded-xl">
              <Activity className="w-12 h-12" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-green-600" />
            {language === 'es' ? 'Base de Datos USDA' : 'USDA Database'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {language === 'es'
              ? 'Carga 33 alimentos con datos nutricionales completos desde USDA FoodData Central.'
              : 'Load 33 foods with complete nutritional data from USDA FoodData Central.'}
          </p>
          <button
            onClick={loadUSDAFoods}
            disabled={loadingUSDA}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loadingUSDA ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {language === 'es' ? 'Cargando...' : 'Loading...'}
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                {language === 'es' ? 'Cargar Alimentos USDA' : 'Load USDA Foods'}
              </>
            )}
          </button>
          {usdaResult && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                ✅ {usdaResult.loaded}/{usdaResult.total} {language === 'es' ? 'alimentos cargados' : 'foods loaded'}
              </p>
              {usdaResult.failed > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  ❌ {usdaResult.failed} {language === 'es' ? 'fallos' : 'failed'}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <button
              onClick={() => setShowUSDASearch(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-green-500 text-green-600 dark:text-green-400 rounded-lg font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
            >
              <Search className="w-4 h-4" />
              {language === 'es' ? 'Buscar Más Alimentos' : 'Search More Foods'}
            </button>
            <button
              onClick={() => setShowCustomFoodModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              {language === 'es' ? 'Agregar Alimento Personalizado' : 'Add Custom Food'}
            </button>
            <button
              onClick={() => {
                setShowManageUSDA(true);
                loadUsdaFoods(1);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-purple-500 text-purple-600 dark:text-purple-400 rounded-lg font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
            >
              <Settings className="w-4 h-4" />
              {language === 'es' ? 'Gestionar Alimentos USDA' : 'Manage USDA Foods'}
            </button>
          </div>
        </div>

      </div>

      {/* USDA Search Modal */}
      {showUSDASearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUSDASearch(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Search className="w-6 h-6 text-green-600" />
                  {language === 'es' ? 'Buscar Alimentos USDA' : 'Search USDA Foods'}
                </h2>
                <button
                  onClick={() => setShowUSDASearch(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUSDAFoods()}
                  placeholder={language === 'es' ? 'Buscar por nombre (ej: chicken, apple, rice)...' : 'Search by name (e.g., chicken, apple, rice)...'}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                />
                <button
                  onClick={searchUSDAFoods}
                  disabled={searching || !searchQuery.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {searching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  {language === 'es' ? 'Buscar' : 'Search'}
                </button>
              </div>

              {selectedFoods.size > 0 && (
                <div className="mt-4 flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    {selectedFoods.size} {language === 'es' ? 'alimentos seleccionados' : 'foods selected'}
                  </p>
                  <button
                    onClick={importSelectedFoods}
                    disabled={importing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {language === 'es' ? 'Importando...' : 'Importing...'}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {language === 'es' ? 'Importar Seleccionados' : 'Import Selected'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {searchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">
                    {language === 'es'
                      ? 'Busca alimentos en la base de datos de USDA'
                      : 'Search for foods in the USDA database'}
                  </p>
                  <p className="text-sm mt-2">
                    {language === 'es'
                      ? 'Más de 350,000 alimentos disponibles'
                      : 'Over 350,000 foods available'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((food) => {
                    const macros = getMacrosFromFood(food);
                    const isExpanded = expandedFood === food.fdcId;
                    return (
                      <div
                        key={food.fdcId}
                        className={`border-2 rounded-lg transition-all ${
                          selectedFoods.has(food.fdcId)
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div
                          onClick={() => toggleFoodSelection(food.fdcId)}
                          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  checked={selectedFoods.has(food.fdcId)}
                                  onChange={() => {}}
                                  className="w-5 h-5 text-green-600 rounded"
                                />
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {food.description}
                                </h3>
                              </div>
                              {food.brandOwner && (
                                <p className="text-sm text-gray-500 ml-7 mb-2">{food.brandOwner}</p>
                              )}
                              <div className="grid grid-cols-4 gap-3 ml-7">
                                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs text-gray-500">Calories</p>
                                  <p className="font-bold text-gray-900 dark:text-white">{macros.calories.toFixed(0)}</p>
                                </div>
                                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs text-red-500">Protein</p>
                                  <p className="font-bold text-gray-900 dark:text-white">{macros.protein.toFixed(1)}g</p>
                                </div>
                                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs text-green-500">Carbs</p>
                                  <p className="font-bold text-gray-900 dark:text-white">{macros.carbs.toFixed(1)}g</p>
                                </div>
                                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs text-yellow-500">Fat</p>
                                  <p className="font-bold text-gray-900 dark:text-white">{macros.fat.toFixed(1)}g</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                                {food.dataType}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedFood(isExpanded ? null : food.fdcId);
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {isExpanded ? 'Hide details' : 'Show details'}
                              </button>
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 ml-7">
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm">
                              <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">All Nutrients:</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {food.foodNutrients?.slice(0, 20).map((nutrient: any, idx: number) => (
                                  <div key={idx} className="flex justify-between text-gray-700 dark:text-gray-300">
                                    <span>{nutrient.nutrientName}:</span>
                                    <span className="font-medium">{nutrient.value?.toFixed(2)} {nutrient.unitName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Food Modal */}
      {showCustomFoodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCustomFoodModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-600" />
                {language === 'es' ? 'Agregar Alimento Personalizado' : 'Add Custom Food'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {language === 'es' ? 'Ideal para suplementos, productos específicos o alimentos no encontrados en USDA' : 'Ideal for supplements, specific products, or foods not found in USDA'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Nombre (Inglés)' : 'Name (English)'} *
                  </label>
                  <input
                    type="text"
                    value={customFood.name}
                    onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    placeholder="Whey Protein"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Nombre (Español)' : 'Name (Spanish)'}
                  </label>
                  <input
                    type="text"
                    value={customFood.name_es}
                    onChange={(e) => setCustomFood({ ...customFood, name_es: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    placeholder="Proteína de Suero"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Marca' : 'Brand'}
                </label>
                <input
                  type="text"
                  value={customFood.brand}
                  onChange={(e) => setCustomFood({ ...customFood, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="Optimum Nutrition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Tamaño de porción' : 'Serving Size'}
                  </label>
                  <input
                    type="number"
                    value={customFood.serving_size}
                    onChange={(e) => setCustomFood({ ...customFood, serving_size: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Unidad' : 'Unit'}
                  </label>
                  <select
                    value={customFood.serving_unit}
                    onChange={(e) => setCustomFood({ ...customFood, serving_unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="scoop">scoop</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  {language === 'es' ? 'Información Nutricional (por porción)' : 'Nutritional Information (per serving)'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Calorías' : 'Calories'}
                    </label>
                    <input
                      type="number"
                      value={customFood.calories}
                      onChange={(e) => setCustomFood({ ...customFood, calories: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Proteína (g)' : 'Protein (g)'}
                    </label>
                    <input
                      type="number"
                      value={customFood.protein}
                      onChange={(e) => setCustomFood({ ...customFood, protein: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Carbohidratos (g)' : 'Carbs (g)'}
                    </label>
                    <input
                      type="number"
                      value={customFood.carbs}
                      onChange={(e) => setCustomFood({ ...customFood, carbs: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Grasas (g)' : 'Fat (g)'}
                    </label>
                    <input
                      type="number"
                      value={customFood.fat}
                      onChange={(e) => setCustomFood({ ...customFood, fat: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Fibra (g)' : 'Fiber (g)'}
                    </label>
                    <input
                      type="number"
                      value={customFood.fiber}
                      onChange={(e) => setCustomFood({ ...customFood, fiber: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Categoría' : 'Category'}
                    </label>
                    <select
                      value={customFood.category}
                      onChange={(e) => setCustomFood({ ...customFood, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                    >
                      <option value="supplement">Supplement</option>
                      <option value="meat">Meat</option>
                      <option value="fish">Fish</option>
                      <option value="egg">Egg</option>
                      <option value="dairy">Dairy</option>
                      <option value="grain">Grain</option>
                      <option value="fruit">Fruit</option>
                      <option value="vegetable">Vegetable</option>
                      <option value="legume">Legume</option>
                      <option value="oil">Oil</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCustomFoodModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={saveCustomFood}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {language === 'es' ? 'Crear Alimento' : 'Create Food'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage USDA Foods Modal */}
      {showManageUSDA && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowManageUSDA(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-purple-600" />
                  {language === 'es' ? 'Gestionar Alimentos USDA' : 'Manage USDA Foods'}
                </h2>
                <button
                  onClick={() => setShowManageUSDA(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={usdaSearchQuery}
                  onChange={(e) => setUsdaSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadUsdaFoods(1)}
                  placeholder={language === 'es' ? 'Buscar alimento...' : 'Search food...'}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <button
                  onClick={() => loadUsdaFoods(1)}
                  disabled={loadingUsdaFoods}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingUsdaFoods ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  {language === 'es' ? 'Buscar' : 'Search'}
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {language === 'es'
                  ? `Mostrando ${usdaFoods.length} alimentos - Página ${currentPage} de ${totalPages}`
                  : `Showing ${usdaFoods.length} foods - Page ${currentPage} of ${totalPages}`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsdaFoods ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
                </div>
              ) : usdaFoods.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">
                    {language === 'es'
                      ? 'No se encontraron alimentos USDA'
                      : 'No USDA foods found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {usdaFoods.map((food) => (
                    <div
                      key={food.id}
                      className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Languages className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">EN:</span>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {food.name_en}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">ES:</span>
                                <p className={`text-sm ${food.name_es === food.name_en ? 'text-yellow-600 dark:text-yellow-400 italic' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {food.name_es || (language === 'es' ? 'Sin traducir' : 'Not translated')}
                                </p>
                              </div>
                            </div>
                          </div>

                          {food.brand && (
                            <p className="text-sm text-gray-500 ml-8 mb-2">{food.brand}</p>
                          )}

                          <p className="text-xs text-gray-400 ml-8 mb-1">
                            {language === 'es' ? 'Valores por 100g:' : 'Values per 100g:'}
                          </p>

                          <div className="grid grid-cols-4 gap-2 ml-8">
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              <p className="text-xs text-gray-500">Cal</p>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">
                                {(food.calories_per_100g || food.calories)?.toFixed(0) || 0}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <p className="text-xs text-red-500">Pro</p>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">
                                {(food.protein_per_100g || food.protein)?.toFixed(1) || 0}g
                              </p>
                            </div>
                            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <p className="text-xs text-green-500">Carbs</p>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">
                                {(food.carbs_per_100g || food.carbs)?.toFixed(1) || 0}g
                              </p>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <p className="text-xs text-yellow-600">Fat</p>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">
                                {(food.fat_per_100g || food.fat)?.toFixed(1) || 0}g
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4 flex-col">
                          <button
                            onClick={() => setEditingFood(food)}
                            className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                            title={language === 'es' ? 'Editar traducción' : 'Edit translation'}
                          >
                            <Languages className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingNutrition({
                                ...food,
                                calories: food.calories || food.calories_per_100g || 0,
                                protein: food.protein || food.protein_per_100g || 0,
                                carbs: food.carbs || food.carbs_per_100g || 0,
                                fat: food.fat || food.fat_per_100g || 0,
                                fiber: food.fiber || food.fiber_per_100g || 0,
                              });
                            }}
                            className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-all"
                            title={language === 'es' ? 'Editar macros/micros' : 'Edit macros/micros'}
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteFood(food.id)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                            title={language === 'es' ? 'Eliminar' : 'Delete'}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2">
                <button
                  onClick={() => loadUsdaFoods(currentPage - 1)}
                  disabled={currentPage === 1 || loadingUsdaFoods}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {language === 'es' ? 'Anterior' : 'Previous'}
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => loadUsdaFoods(currentPage + 1)}
                  disabled={currentPage === totalPages || loadingUsdaFoods}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {language === 'es' ? 'Siguiente' : 'Next'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Translation Modal */}
      {editingFood && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setEditingFood(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Languages className="w-6 h-6 text-blue-600" />
                {language === 'es' ? 'Editar Traducción' : 'Edit Translation'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Nombre en Inglés (Original)' : 'English Name (Original)'}
                </label>
                <input
                  type="text"
                  value={editingFood.name_en}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Nombre en Español (Traducción)' : 'Spanish Name (Translation)'}
                </label>
                <input
                  type="text"
                  value={editingFood.name_es || ''}
                  onChange={(e) => setEditingFood({ ...editingFood, name_es: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={language === 'es' ? 'Escribe la traducción...' : 'Type the translation...'}
                />
              </div>

              <button
                onClick={() => autoTranslate(editingFood)}
                disabled={translating}
                className="w-full px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {translating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === 'es' ? 'Traduciendo...' : 'Translating...'}
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4" />
                    {language === 'es' ? 'Traducción Automática' : 'Auto Translate'}
                  </>
                )}
              </button>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  {language === 'es'
                    ? 'La traducción automática es básica. Revisa y edita manualmente para mayor precisión.'
                    : 'Auto-translation is basic. Review and edit manually for accuracy.'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingFood(null)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={saveTranslation}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Languages className="w-5 h-5" />
                  {language === 'es' ? 'Guardar Traducción' : 'Save Translation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Nutrition Modal */}
      {editingNutrition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setEditingNutrition(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit className="w-6 h-6 text-green-600" />
                  {language === 'es' ? 'Editar Información Nutricional' : 'Edit Nutrition Information'}
                </h2>
                <button
                  onClick={() => setEditingNutrition(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {editingNutrition.name_en} {editingNutrition.name_es && `(${editingNutrition.name_es})`}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Macronutrients Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-red-500 rounded"></div>
                  {language === 'es' ? 'Macronutrientes' : 'Macronutrients'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Calorías' : 'Calories'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.calories || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, calories: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Proteína (g)' : 'Protein (g)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.protein || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, protein: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Carbohidratos (g)' : 'Carbs (g)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.carbs || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, carbs: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Grasas (g)' : 'Fat (g)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.fat || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, fat: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Fibra (g)' : 'Fiber (g)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.fiber || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, fiber: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Azúcar/100g (g)' : 'Sugar/100g (g)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.sugar_per_100g || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, sugar_per_100g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Per 100g Values */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-orange-500 rounded"></div>
                  {language === 'es' ? 'Valores por 100g' : 'Per 100g Values'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Cal/100g' : 'Cal/100g'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.calories_per_100g || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, calories_per_100g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Pro/100g' : 'Pro/100g'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.protein_per_100g || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, protein_per_100g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Carbs/100g' : 'Carbs/100g'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.carbs_per_100g || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, carbs_per_100g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Fat/100g' : 'Fat/100g'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.fat_per_100g || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, fat_per_100g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Fibra/100g' : 'Fiber/100g'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.fiber_per_100g || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, fiber_per_100g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Vitamins Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-yellow-500 rounded"></div>
                  {language === 'es' ? 'Vitaminas' : 'Vitamins'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit A (mcg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.vitamin_a_mcg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_a_mcg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit B1 (mg)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={editingNutrition.vitamin_b1_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_b1_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit B2 (mg)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={editingNutrition.vitamin_b2_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_b2_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit B3 (mg)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editingNutrition.vitamin_b3_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_b3_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit B6 (mg)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={editingNutrition.vitamin_b6_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_b6_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit B12 (mcg)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editingNutrition.vitamin_b12_mcg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_b12_mcg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit C (mg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.vitamin_c_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_c_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit D (mcg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.vitamin_d_mcg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_d_mcg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit E (mg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.vitamin_e_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_e_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vit K (mcg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.vitamin_k_mcg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, vitamin_k_mcg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Folato (mcg)' : 'Folate (mcg)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.folate_mcg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, folate_mcg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Minerals Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-500 rounded"></div>
                  {language === 'es' ? 'Minerales' : 'Minerals'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Calcio (mg)' : 'Calcium (mg)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.calcium_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, calcium_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Hierro (mg)' : 'Iron (mg)'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={editingNutrition.iron_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, iron_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Magnesio (mg)' : 'Magnesium (mg)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.magnesium_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, magnesium_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Fósforo (mg)' : 'Phosphorus (mg)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.phosphorus_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, phosphorus_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Potasio (mg)' : 'Potassium (mg)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.potassium_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, potassium_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Sodio (mg)' : 'Sodium (mg)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingNutrition.sodium_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, sodium_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'es' ? 'Zinc (mg)' : 'Zinc (mg)'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={editingNutrition.zinc_mg || ''}
                      onChange={(e) => setEditingNutrition({ ...editingNutrition, zinc_mg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                <button
                  onClick={() => setEditingNutrition(null)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={saveNutritionData}
                  disabled={savingNutrition}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingNutrition ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {language === 'es' ? 'Guardando...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Edit className="w-5 h-5" />
                      {language === 'es' ? 'Guardar Cambios' : 'Save Changes'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
