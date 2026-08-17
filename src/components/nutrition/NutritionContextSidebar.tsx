import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, Dumbbell, Info, X, ChevronRight } from 'lucide-react';

interface TrainingInfo {
  workout_name: string;
  scheduled_date: string;
  difficulty: string;
  duration_minutes: number;
  status: string;
  notes: string;
}

interface AnthropometryInfo {
  weight_kg: number;
  height_cm: number;
  body_fat_percent: number;
  muscle_mass_percent: number;
  measurement_date: string;
}

interface NutritionTarget {
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  main_goal: string;
}

interface Props {
  athleteId: string;
  selectedDate?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NutritionContextSidebar({ athleteId, selectedDate, isOpen, onClose }: Props) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [trainingInfo, setTrainingInfo] = useState<TrainingInfo | null>(null);
  const [anthropometry, setAnthropometry] = useState<AnthropometryInfo | null>(null);
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTarget | null>(null);
  const [anamnesis, setAnamnesis] = useState<any>(null);

  useEffect(() => {
    if (isOpen && athleteId) {
      loadContextData();
    }
  }, [isOpen, athleteId, selectedDate]);

  const loadContextData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTrainingInfo(),
        loadAnthropometry(),
        loadNutritionTarget(),
        loadAnamnesis()
      ]);
    } catch (error) {
      console.error('Error loading context:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingInfo = async () => {
    const date = selectedDate || new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('athlete_workouts')
      .select(`
        scheduled_date,
        status,
        notes,
        workouts (
          name,
          difficulty,
          duration_minutes
        )
      `)
      .eq('athlete_id', athleteId)
      .eq('scheduled_date', date)
      .maybeSingle();

    if (data && data.workouts) {
      setTrainingInfo({
        workout_name: (data.workouts as any).name,
        scheduled_date: data.scheduled_date,
        difficulty: (data.workouts as any).difficulty || 'moderate',
        duration_minutes: (data.workouts as any).duration_minutes || 0,
        status: data.status,
        notes: data.notes || ''
      });
    } else {
      setTrainingInfo(null);
    }
  };

  const loadAnthropometry = async () => {
    const { data } = await supabase
      .from('bioimpedance_measurements')
      .select('weight, height, adipose_tissue_percent, muscle_mass_percent, measurement_date')
      .eq('user_id', athleteId)
      .order('measurement_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setAnthropometry({
        weight_kg: (data as any).weight || 0,
        height_cm: (data as any).height || 0,
        body_fat_percent: (data as any).adipose_tissue_percent || 0,
        muscle_mass_percent: (data as any).muscle_mass_percent || 0,
        measurement_date: (data as any).measurement_date
      });
    }
  };

  const loadNutritionTarget = async () => {
    const { data } = await supabase
      .from('nutrition_targets')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setNutritionTarget({
        target_calories: data.target_calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        main_goal: data.notes || ''
      });
    }
  };

  const loadAnamnesis = async () => {
    const { data } = await supabase
      .from('nutrition_anamnesis')
      .select('main_goal')
      .eq('athlete_id', athleteId)
      .maybeSingle();

    setAnamnesis(data);
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      hard: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      very_hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[difficulty as keyof typeof colors] || colors.moderate;
  };

  const getGoalLabel = (goal: string) => {
    const goals: any = {
      performance: language === 'es' ? 'Rendimiento' : 'Performance',
      muscle_gain: language === 'es' ? 'Ganancia Muscular' : 'Muscle Gain',
      fat_loss: language === 'es' ? 'Pérdida de Grasa' : 'Fat Loss',
      recovery: language === 'es' ? 'Recuperación' : 'Recovery',
      maintenance: language === 'es' ? 'Mantenimiento' : 'Maintenance'
    };
    return goals[goal] || goal;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: any = {
      easy: language === 'es' ? 'Fácil' : 'Easy',
      moderate: language === 'es' ? 'Moderado' : 'Moderate',
      hard: language === 'es' ? 'Difícil' : 'Hard',
      very_hard: language === 'es' ? 'Muy Difícil' : 'Very Hard'
    };
    return labels[difficulty] || difficulty;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`
        fixed lg:sticky top-0 right-0 h-screen w-80
        bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700
        shadow-xl lg:shadow-none z-50
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        overflow-y-auto
      `}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-[#fdda36]" />
            {language === 'es' ? 'Contexto del Atleta' : 'Athlete Context'}
          </h3>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fdda36] mx-auto"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {language === 'es' ? 'Cargando...' : 'Loading...'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Training Info */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Entrenamiento del Día' : "Today's Training"}
                </h4>
              </div>

              {trainingInfo ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {trainingInfo.workout_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(trainingInfo.difficulty)}`}>
                        {getDifficultyLabel(trainingInfo.difficulty)}
                      </span>
                      {trainingInfo.duration_minutes > 0 && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {trainingInfo.duration_minutes} min
                        </span>
                      )}
                    </div>
                  </div>

                  {trainingInfo.notes && (
                    <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2">
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {trainingInfo.notes}
                      </p>
                    </div>
                  )}

                  {/* Training Intensity Indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {language === 'es' ? 'Carga de carbos recomendada:' : 'Recommended carb load:'}
                    </span>
                    <div className="flex gap-1">
                      {trainingInfo.difficulty === 'easy' && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        </>
                      )}
                      {trainingInfo.difficulty === 'moderate' && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        </>
                      )}
                      {(trainingInfo.difficulty === 'hard' || trainingInfo.difficulty === 'very_hard') && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Sin entrenamiento programado' : 'No training scheduled'}
                </p>
              )}
            </div>

            {/* Anthropometry Info */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Antropometría' : 'Anthropometry'}
                </h4>
              </div>

              {anthropometry ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {language === 'es' ? 'Peso' : 'Weight'}
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {anthropometry.weight_kg.toFixed(1)} kg
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {language === 'es' ? 'Altura' : 'Height'}
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {anthropometry.height_cm.toFixed(0)} cm
                      </p>
                    </div>
                  </div>

                  {anthropometry.body_fat_percent > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {language === 'es' ? '% Grasa' : '% Fat'}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {anthropometry.body_fat_percent.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {language === 'es' ? '% Músculo' : '% Muscle'}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {anthropometry.muscle_mass_percent.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {language === 'es' ? 'Última medición:' : 'Last measurement:'}{' '}
                    {new Date(anthropometry.measurement_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Sin datos antropométricos' : 'No anthropometry data'}
                </p>
              )}
            </div>

            {/* Nutrition Target */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Objetivos Nutricionales' : 'Nutrition Targets'}
                </h4>
              </div>

              {nutritionTarget ? (
                <div className="space-y-2">
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {language === 'es' ? 'Objetivo' : 'Goal'}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {getGoalLabel(anamnesis?.main_goal || '')}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {language === 'es' ? 'Calorías' : 'Calories'}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {nutritionTarget.target_calories?.toFixed(0)} kcal
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-red-600 dark:text-red-400">
                          {language === 'es' ? 'Proteína' : 'Protein'}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {nutritionTarget.protein_g?.toFixed(0)}g
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600 dark:text-green-400">
                          {language === 'es' ? 'Carbos' : 'Carbs'}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {nutritionTarget.carbs_g?.toFixed(0)}g
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-yellow-600 dark:text-yellow-400">
                          {language === 'es' ? 'Grasas' : 'Fats'}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {nutritionTarget.fat_g?.toFixed(0)}g
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Sin objetivos calculados' : 'No targets calculated'}
                </p>
              )}
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                💡 {language === 'es' ? 'Sugerencias' : 'Tips'}
              </h4>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                {trainingInfo?.difficulty === 'hard' && (
                  <li className="flex items-start gap-1">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {language === 'es'
                      ? 'Aumenta carbohidratos pre y post entrenamiento'
                      : 'Increase pre and post-workout carbs'}
                  </li>
                )}
                {anamnesis?.main_goal === 'muscle_gain' && (
                  <li className="flex items-start gap-1">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {language === 'es'
                      ? 'Prioriza proteína en cada comida'
                      : 'Prioritize protein in each meal'}
                  </li>
                )}
                <li className="flex items-start gap-1">
                  <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {language === 'es'
                    ? 'Mantén hidratación constante'
                    : 'Maintain consistent hydration'}
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
