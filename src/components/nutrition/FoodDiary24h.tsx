import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Clock, Plus, CreditCard as Edit, Trash2, Save, X, CheckCircle, Loader, Camera, Upload, Sparkles } from 'lucide-react';

interface FoodDiaryEntry {
  id?: string;
  entry_time: string;
  meal_type: string;
  entry_method: string;
  food_description: string;
  estimated_calories: number;
  estimated_carbs_g: number;
  estimated_protein_g: number;
  estimated_fat_g: number;
  additional_notes: string;
}

interface FoodDiarySession {
  id?: string;
  athlete_id: string;
  period_hours: number;
  start_date: string;
  day_of_week: string;
  status: string;
  entries: FoodDiaryEntry[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function FoodDiary24h({ isOpen, onClose }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [step, setStep] = useState<'config' | 'logging' | 'summary'>('config');
  const [periodHours, setPeriodHours] = useState<24 | 48>(24);
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [currentSession, setCurrentSession] = useState<FoodDiarySession | null>(null);
  const [entries, setEntries] = useState<FoodDiaryEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodDiaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<any>(null);

  const [formData, setFormData] = useState<FoodDiaryEntry>({
    entry_time: '08:00',
    meal_type: 'breakfast',
    entry_method: 'manual',
    food_description: '',
    estimated_calories: 0,
    estimated_carbs_g: 0,
    estimated_protein_g: 0,
    estimated_fat_g: 0,
    additional_notes: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealTypes = [
    { value: 'breakfast', label: language === 'es' ? 'Desayuno' : 'Breakfast' },
    { value: 'lunch', label: language === 'es' ? 'Almuerzo' : 'Lunch' },
    { value: 'dinner', label: language === 'es' ? 'Cena' : 'Dinner' },
    { value: 'snack', label: language === 'es' ? 'Snack' : 'Snack' },
    { value: 'other', label: language === 'es' ? 'Otro' : 'Other' }
  ];

  const startSession = async () => {
    if (!profile?.id) {
      alert(language === 'es' ? 'Error: Usuario no autenticado' : 'Error: User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('food_diary_sessions')
        .insert([{
          athlete_id: profile.id,
          period_hours: periodHours,
          start_date: new Date().toISOString().split('T')[0],
          day_of_week: dayOfWeek,
          status: 'in_progress'
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating session:', error);
        const errorMsg = error.message || 'Failed to create session';
        throw new Error(language === 'es' ? `Error al crear sesión: ${errorMsg}` : `Error creating session: ${errorMsg}`);
      }

      if (!data) {
        throw new Error(language === 'es' ? 'No se pudo crear la sesión' : 'Failed to create session');
      }

      setCurrentSession(data);
      setStep('logging');
    } catch (error: any) {
      console.error('Error starting session:', error);
      alert(error.message || (language === 'es' ? 'Error desconocido al iniciar' : 'Unknown error starting'));
    } finally {
      setLoading(false);
    }
  };


  const saveEntry = async () => {
    if (!currentSession?.id) return;
    if (!formData.food_description.trim()) {
      alert(language === 'es' ? 'Debes agregar una descripción de alimentos' : 'You must add a food description');
      return;
    }

    setLoading(true);
    try {
      if (editingEntry?.id) {
        // Update existing entry
        const { error } = await supabase
          .from('food_diary_entries')
          .update({
            entry_time: formData.entry_time,
            meal_type: formData.meal_type,
            entry_method: formData.entry_method,
            food_description: formData.food_description,
            estimated_calories: formData.estimated_calories,
            estimated_carbs_g: formData.estimated_carbs_g,
            estimated_protein_g: formData.estimated_protein_g,
            estimated_fat_g: formData.estimated_fat_g,
            additional_notes: formData.additional_notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEntry.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('food_diary_entries')
          .insert([{
            session_id: currentSession.id,
            ...formData
          }]);

        if (error) throw error;
      }

      await loadEntries();
      setShowAddModal(false);
      setEditingEntry(null);
      resetForm();
    } catch (error: any) {
      console.error('Error saving entry:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    if (!currentSession?.id) return;

    const { data, error } = await supabase
      .from('food_diary_entries')
      .select('*')
      .eq('session_id', currentSession.id)
      .order('entry_time', { ascending: true });

    if (!error && data) {
      setEntries(data);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar esta entrada?' : 'Delete this entry?')) return;

    const { error } = await supabase
      .from('food_diary_entries')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadEntries();
    }
  };

  const completeSession = async () => {
    if (!currentSession?.id) return;

    setLoading(true);
    try {
      // Calculate totals
      const totals = entries.reduce((acc, entry) => ({
        calories: acc.calories + (entry.estimated_calories || 0),
        carbs: acc.carbs + (entry.estimated_carbs_g || 0),
        protein: acc.protein + (entry.estimated_protein_g || 0),
        fat: acc.fat + (entry.estimated_fat_g || 0)
      }), { calories: 0, carbs: 0, protein: 0, fat: 0 });

      // Generate AI observations (simplified)
      const observations = [];
      if (totals.protein < 100) observations.push(language === 'es' ? 'Bajo consumo proteico' : 'Low protein intake');
      if (totals.carbs > totals.protein * 4) observations.push(language === 'es' ? 'Alta proporción de carbohidratos' : 'High carb proportion');

      const { error } = await supabase
        .from('food_diary_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_calories: totals.calories,
          total_carbs_g: totals.carbs,
          total_protein_g: totals.protein,
          total_fat_g: totals.fat,
          ai_observations: observations
        })
        .eq('id', currentSession.id);

      if (error) {
        console.error('Supabase error completing session:', error);
        const errorMsg = error.message || 'Failed to complete session';
        throw new Error(language === 'es' ? `Error al completar: ${errorMsg}` : `Error completing: ${errorMsg}`);
      }

      setStep('summary');
    } catch (error: any) {
      console.error('Error completing session:', error);
      alert(error.message || (language === 'es' ? 'Error desconocido al completar' : 'Unknown error completing'));
    } finally {
      setLoading(false);
    }
  };

  const analyzePhoto = async (file: File) => {
    setAnalyzingPhoto(true);
    setPhotoAnalysisResult(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-food-photo`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64Image })
          }
        );

        const result = await response.json();

        if (result.success && result.food_items.length > 0) {
          setPhotoAnalysisResult(result);

          // Auto-fill form with AI results
          const totalKcal = result.food_items.reduce((sum: number, item: any) => sum + item.estimated_kcal, 0);
          const totalCarbs = result.food_items.reduce((sum: number, item: any) => sum + item.carbs_g, 0);
          const totalProtein = result.food_items.reduce((sum: number, item: any) => sum + item.protein_g, 0);
          const totalFat = result.food_items.reduce((sum: number, item: any) => sum + item.fat_g, 0);

          const foodDescription = result.food_items
            .map((item: any) => {
              const name = language === 'es' ? (item.name_es || item.name_en || item.name) : (item.name_en || item.name_es || item.name);
              return `${name} (${item.estimated_portion_grams}g)`;
            })
            .join('\n');

          setFormData({
            ...formData,
            entry_method: 'ai_photo',
            food_description: foodDescription,
            estimated_calories: Math.round(totalKcal),
            estimated_carbs_g: Math.round(totalCarbs * 10) / 10,
            estimated_protein_g: Math.round(totalProtein * 10) / 10,
            estimated_fat_g: Math.round(totalFat * 10) / 10,
            meal_type: result.meal_type_suggestion || formData.meal_type,
            additional_notes: result.needs_manual_review
              ? (language === 'es' ? '⚠️ Revisar y ajustar valores' : '⚠️ Please review and adjust values')
              : (language === 'es' ? '✅ Analizado con IA' : '✅ AI analyzed')
          });
        } else {
          alert(result.error || (language === 'es' ? 'No se pudo analizar la foto' : 'Could not analyze photo'));
        }
      };
    } catch (error: any) {
      console.error('Error analyzing photo:', error);
      alert(error.message || (language === 'es' ? 'Error al analizar foto' : 'Error analyzing photo'));
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(language === 'es' ? 'La foto debe ser menor a 5MB' : 'Photo must be less than 5MB');
        return;
      }
      analyzePhoto(file);
    }
  };

  const resetForm = () => {
    setFormData({
      entry_time: '08:00',
      meal_type: 'breakfast',
      entry_method: 'manual',
      food_description: '',
      estimated_calories: 0,
      estimated_carbs_g: 0,
      estimated_protein_g: 0,
      estimated_fat_g: 0,
      additional_notes: ''
    });
    setPhotoAnalysisResult(null);
  };

  useEffect(() => {
    if (currentSession?.id) {
      loadEntries();
    }
  }, [currentSession]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold">
                {language === 'es' ? 'Diario Alimentario 24-48h' : '24-48h Food Diary'}
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {step === 'config' && (language === 'es' ? 'Configuración inicial' : 'Initial setup')}
                {step === 'logging' && (language === 'es' ? 'Registrando comidas' : 'Logging meals')}
                {step === 'summary' && (language === 'es' ? 'Resumen completado' : 'Summary completed')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Step 1: Configuration */}
            {step === 'config' && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-blue-800 dark:text-blue-400">
                    {language === 'es'
                      ? 'Configura tu período de registro y comienza a documentar tus comidas con alimentos, cantidades y horarios.'
                      : 'Set up your logging period and start documenting your meals with foods, quantities and times.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? '¿Cuántas horas querés registrar?' : 'How many hours do you want to log?'}
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPeriodHours(24)}
                      className={`p-4 rounded-xl border-2 font-medium transition-all ${
                        periodHours === 24
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-300 text-gray-900 dark:text-white'
                      }`}
                    >
                      24 {language === 'es' ? 'horas' : 'hours'}
                    </button>
                    <button
                      onClick={() => setPeriodHours(48)}
                      className={`p-4 rounded-xl border-2 font-medium transition-all ${
                        periodHours === 48
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-300 text-gray-900 dark:text-white'
                      }`}
                    >
                      48 {language === 'es' ? 'horas' : 'hours'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? '¿Qué día estás registrando?' : 'What day are you logging?'}
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  >
                    {daysOfWeek.map(day => (
                      <option key={day} value={day}>
                        {language === 'es' ? {
                          'Monday': 'Lunes',
                          'Tuesday': 'Martes',
                          'Wednesday': 'Miércoles',
                          'Thursday': 'Jueves',
                          'Friday': 'Viernes',
                          'Saturday': 'Sábado',
                          'Sunday': 'Domingo'
                        }[day] : day}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={startSession}
                  disabled={loading}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {language === 'es' ? 'Iniciando...' : 'Starting...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {language === 'es' ? 'Comenzar Registro' : 'Start Logging'}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 2: Logging */}
            {step === 'logging' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {language === 'es' ? 'Tus Comidas' : 'Your Meals'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {periodHours}h • {dayOfWeek} • {entries.length} {language === 'es' ? 'entradas' : 'entries'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      resetForm();
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    {language === 'es' ? 'Añadir' : 'Add'}
                  </button>
                </div>

                {entries.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-xl">
                    <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {language === 'es' ? 'No hay comidas registradas aún' : 'No meals logged yet'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                      {language === 'es' ? 'Haz clic en "Añadir" para comenzar' : 'Click "Add" to start'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-green-600">
                                {entry.entry_time}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                                {mealTypes.find(m => m.value === entry.meal_type)?.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-2">
                              {entry.food_description}
                            </p>
                            <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                              <span>≈ {entry.estimated_calories} kcal</span>
                              <span>{entry.estimated_carbs_g}g CHO</span>
                              <span>{entry.estimated_protein_g}g PRO</span>
                              <span>{entry.estimated_fat_g}g FAT</span>
                            </div>
                            {entry.additional_notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2 italic">
                                {entry.additional_notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingEntry(entry);
                                setFormData(entry);
                                setShowAddModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id!)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={completeSession}
                  disabled={loading || entries.length === 0}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {language === 'es' ? 'Finalizando...' : 'Completing...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {language === 'es' ? 'Finalizar Registro' : 'Complete Log'}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 3: Summary */}
            {step === 'summary' && currentSession && (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {language === 'es' ? '¡Registro Completado!' : 'Log Completed!'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {language === 'es'
                      ? 'Tu diario alimentario ha sido guardado y está disponible para tu entrenador.'
                      : 'Your food diary has been saved and is available to your trainer.'}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4">
                    {language === 'es' ? 'Resumen Nutricional' : 'Nutritional Summary'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{currentSession.total_calories}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">kcal</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{currentSession.total_carbs_g}g</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">CHO</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{currentSession.total_protein_g}g</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">PRO</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{currentSession.total_fat_g}g</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">FAT</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                >
                  {language === 'es' ? 'Cerrar' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Entry Modal */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={() => {
              setShowAddModal(false);
              setEditingEntry(null);
              resetForm();
            }}
          ></div>

          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 text-white p-4 rounded-t-2xl flex items-center justify-between z-10">
                <h3 className="text-xl font-bold">
                  {editingEntry
                    ? (language === 'es' ? 'Editar Comida' : 'Edit Meal')
                    : (language === 'es' ? 'Añadir Comida' : 'Add Meal')}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEntry(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* AI Photo Analysis Section */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border-2 border-dashed border-purple-300 dark:border-purple-700">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">
                        {language === 'es' ? '🤖 Análisis con IA' : '🤖 AI Analysis'}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {language === 'es' ? 'Toma una foto y la IA estimará los alimentos y macros' : 'Take a photo and AI will estimate foods and macros'}
                      </p>
                    </div>
                  </div>

                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      disabled={analyzingPhoto}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-medium transition-all cursor-pointer ${
                        analyzingPhoto
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                      }`}
                    >
                      {analyzingPhoto ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          {language === 'es' ? 'Analizando...' : 'Analyzing...'}
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5" />
                          {language === 'es' ? 'Tomar / Subir Foto' : 'Take / Upload Photo'}
                        </>
                      )}
                    </label>
                  </label>

                  {photoAnalysisResult && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          {language === 'es' ? 'Análisis completado' : 'Analysis completed'}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({Math.round(photoAnalysisResult.confidence * 100)}% {language === 'es' ? 'confianza' : 'confidence'})
                        </span>
                      </div>
                      {photoAnalysisResult.needs_manual_review && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          ⚠️ {language === 'es' ? 'Por favor revisa y ajusta los valores abajo' : 'Please review and adjust values below'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Time and Meal Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'es' ? 'Hora' : 'Time'}
                    </label>
                    <input
                      type="time"
                      value={formData.entry_time}
                      onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'es' ? 'Tipo' : 'Type'}
                    </label>
                    <select
                      value={formData.meal_type}
                      onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      {mealTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Food Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Descripción de alimentos' : 'Food description'}
                  </label>
                  <textarea
                    value={formData.food_description}
                    onChange={(e) => setFormData({ ...formData, food_description: e.target.value })}
                    rows={4}
                    placeholder={language === 'es'
                      ? '2 tostadas integrales (60g)\n1 huevo revuelto (60g)\n...'
                      : '2 whole wheat toasts (60g)\n1 scrambled egg (60g)\n...'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Nutritional Estimates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kcal
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_calories}
                      onChange={(e) => setFormData({ ...formData, estimated_calories: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CHO (g)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_carbs_g}
                      onChange={(e) => setFormData({ ...formData, estimated_carbs_g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PRO (g)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_protein_g}
                      onChange={(e) => setFormData({ ...formData, estimated_protein_g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      FAT (g)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_fat_g}
                      onChange={(e) => setFormData({ ...formData, estimated_fat_g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Notas adicionales' : 'Additional notes'}
                  </label>
                  <textarea
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                    rows={2}
                    placeholder={language === 'es'
                      ? 'Pre-entrenamiento, con mucha hambre, etc.'
                      : 'Pre-workout, very hungry, etc.'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={saveEntry}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {language === 'es' ? 'Guardando...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {language === 'es' ? 'Guardar' : 'Save'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
