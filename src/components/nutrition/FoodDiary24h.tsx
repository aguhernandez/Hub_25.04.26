import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Save, X, CheckCircle, Loader, Camera, Send, FileEdit, PencilLine } from 'lucide-react';

interface FoodDiaryEntry {
  id?: string;
  entry_time: string;
  meal_type: string;
  entry_method: string;
  food_description: string;
  consumption_reason: string;
  estimated_calories: number;
  estimated_carbs_g: number;
  estimated_protein_g: number;
  estimated_fat_g: number;
  additional_notes: string;
}

interface FoodDiarySession {
  id: string;
  athlete_id: string;
  start_date: string;
  day_of_week: string;
  status: string;
  total_calories: number | null;
  total_carbs_g: number | null;
  total_protein_g: number | null;
  total_fat_g: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  logDate: string;
  existingSession: FoodDiarySession | null;
  onSaved: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayName = (dateStr: string) => DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()];

export default function FoodDiary24h({ isOpen, onClose, logDate, existingSession, onSaved }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const es = language === 'es';
  const [step, setStep] = useState<'logging' | 'summary'>('logging');
  const [currentSession, setCurrentSession] = useState<FoodDiarySession | null>(null);
  const [entries, setEntries] = useState<FoodDiaryEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodDiaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [totals, setTotals] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });

  const [formData, setFormData] = useState<FoodDiaryEntry>({
    entry_time: '08:00',
    meal_type: 'breakfast',
    entry_method: 'manual',
    food_description: '',
    consumption_reason: '',
    estimated_calories: 0,
    estimated_carbs_g: 0,
    estimated_protein_g: 0,
    estimated_fat_g: 0,
    additional_notes: ''
  });

  const mealTypes = [
    { value: 'breakfast', label: es ? 'Desayuno' : 'Breakfast' },
    { value: 'lunch', label: es ? 'Almuerzo' : 'Lunch' },
    { value: 'dinner', label: es ? 'Cena' : 'Dinner' },
    { value: 'snack', label: es ? 'Snack' : 'Snack' },
    { value: 'other', label: es ? 'Otro' : 'Other' }
  ];

  useEffect(() => {
    if (!isOpen) return;
    setStep('logging');
    setToastMsg(null);
    setPhotoAnalysisResult(null);
    setEditingEntry(null);
    if (existingSession) {
      setCurrentSession(existingSession);
      loadEntries(existingSession.id);
    } else {
      setCurrentSession(null);
      setEntries([]);
    }
    resetForm();
  }, [isOpen, existingSession]);

  const loadEntries = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('food_diary_entries')
      .select('*')
      .eq('session_id', sessionId)
      .order('entry_time', { ascending: true });
    if (!error && data) {
      setEntries(data);
    }
  };

  const ensureSession = async (): Promise<string | null> => {
    if (currentSession) return currentSession.id;
    if (!profile?.id) {
      alert(es ? 'Error: Usuario no autenticado' : 'Error: User not authenticated');
      return null;
    }
    const { data, error } = await supabase
      .from('food_diary_sessions')
      .insert({
        athlete_id: profile.id,
        period_hours: 24,
        start_date: logDate,
        day_of_week: dayName(logDate),
        status: 'draft'
      })
      .select()
      .single();
    if (error || !data) {
      console.error('Error creating diary session:', error);
      alert(es ? 'No se pudo crear el registro' : 'Could not create the log');
      return null;
    }
    setCurrentSession(data);
    return data.id;
  };

  const saveMeal = async () => {
    if (!formData.food_description.trim()) {
      alert(es ? 'Debes agregar una descripción de alimentos' : 'You must add a food description');
      return;
    }

    setLoading(true);
    try {
      const sessionId = await ensureSession();
      if (!sessionId) return;

      if (editingEntry?.id) {
        const { error } = await supabase
          .from('food_diary_entries')
          .update({
            entry_time: formData.entry_time,
            meal_type: formData.meal_type,
            entry_method: formData.entry_method,
            food_description: formData.food_description,
            consumption_reason: formData.consumption_reason,
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
        const { error } = await supabase
          .from('food_diary_entries')
          .insert({ session_id: sessionId, ...formData });
        if (error) throw error;
      }

      await loadEntries(sessionId);
      setShowAddModal(false);
      setEditingEntry(null);
      resetForm();
    } catch (error: any) {
      console.error('Error saving meal:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async (id: string) => {
    if (!confirm(es ? '¿Eliminar esta comida?' : 'Delete this meal?')) return;
    const { error } = await supabase.from('food_diary_entries').delete().eq('id', id);
    if (!error && currentSession) {
      await loadEntries(currentSession.id);
    }
  };

  const computeTotals = (list: FoodDiaryEntry[]) => list.reduce((acc, entry) => ({
    calories: acc.calories + (entry.estimated_calories || 0),
    carbs: acc.carbs + (entry.estimated_carbs_g || 0),
    protein: acc.protein + (entry.estimated_protein_g || 0),
    fat: acc.fat + (entry.estimated_fat_g || 0)
  }), { calories: 0, carbs: 0, protein: 0, fat: 0 });

  const saveDraft = async (keepOpen: boolean) => {
    if (entries.length === 0) {
      alert(es ? 'Agrega al menos una comida antes de guardar' : 'Add at least one meal before saving');
      return;
    }
    setLoading(true);
    try {
      const sessionId = await ensureSession();
      if (!sessionId) return;
      const { error } = await supabase
        .from('food_diary_sessions')
        .update({ status: 'draft' })
        .eq('id', sessionId);
      if (error) throw error;
      if (keepOpen) {
        setToastMsg(es ? 'Borrador guardado' : 'Draft saved');
        setTimeout(() => setToastMsg(null), 2500);
      } else {
        onSaved();
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving draft:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const finalizeLog = async () => {
    if (entries.length === 0) {
      alert(es ? 'Agrega al menos una comida antes de enviar' : 'Add at least one meal before sending');
      return;
    }
    if (!confirm(es ? '¿Enviar y finalizar este registro del día?' : 'Send and finalize this day log?')) return;

    setLoading(true);
    try {
      const sessionId = await ensureSession();
      if (!sessionId) return;

      const t = computeTotals(entries);
      const { error } = await supabase
        .from('food_diary_sessions')
        .update({
          status: 'finalized',
          completed_at: new Date().toISOString(),
          total_calories: t.calories,
          total_carbs_g: t.carbs,
          total_protein_g: t.protein,
          total_fat_g: t.fat
        })
        .eq('id', sessionId);
      if (error) throw error;

      setTotals(t);
      setStep('summary');
      onSaved();
    } catch (error: any) {
      console.error('Error finalizing log:', error);
      alert(error.message || (es ? 'Error desconocido al finalizar' : 'Unknown error finalizing'));
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

          const totalKcal = result.food_items.reduce((sum: number, item: any) => sum + item.estimated_kcal, 0);
          const totalCarbs = result.food_items.reduce((sum: number, item: any) => sum + item.carbs_g, 0);
          const totalProtein = result.food_items.reduce((sum: number, item: any) => sum + item.protein_g, 0);
          const totalFat = result.food_items.reduce((sum: number, item: any) => sum + item.fat_g, 0);

          const foodDescription = result.food_items
            .map((item: any) => {
              const name = es ? (item.name_es || item.name_en || item.name) : (item.name_en || item.name_es || item.name);
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
              ? (es ? '⚠️ Revisar y ajustar valores' : '⚠️ Please review and adjust values')
              : (es ? '✅ Analizado con IA' : '✅ AI analyzed')
          });
        } else {
          alert(result.error || (es ? 'No se pudo analizar la foto' : 'Could not analyze photo'));
        }
      };
    } catch (error: any) {
      console.error('Error analyzing photo:', error);
      alert(error.message || (es ? 'Error al analizar foto' : 'Error analyzing photo'));
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(es ? 'La foto debe ser menor a 5MB' : 'Photo must be less than 5MB');
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
      consumption_reason: '',
      estimated_calories: 0,
      estimated_carbs_g: 0,
      estimated_protein_g: 0,
      estimated_fat_g: 0,
      additional_notes: ''
    });
    setPhotoAnalysisResult(null);
  };

  if (!isOpen) return null;

  const dateLabel = new Date(logDate + 'T12:00:00').toLocaleDateString(es ? 'es-ES' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold">
                {existingSession
                  ? (es ? 'Editar Registro 24h' : 'Edit 24h Log')
                  : (es ? 'Nuevo Registro 24h' : 'New 24h Log')}
              </h2>
              <p className="text-green-100 text-sm mt-1 capitalize">{dateLabel}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Step: Logging */}
            {step === 'logging' && (
              <div className="space-y-6">
                {existingSession?.status === 'finalized' && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      {es ? 'Este registro ya fue enviado. Puedes seguir editándolo o eliminarlo desde la vista del día.'
                          : 'This log was already sent. You can keep editing it or delete it from the day view.'}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {es ? 'Tus Comidas' : 'Your Meals'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {entries.length} {es ? 'comidas registradas' : 'meals logged'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      resetForm();
                      setEditingEntry(null);
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    {es ? 'Añadir' : 'Add'}
                  </button>
                </div>

                {entries.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <PencilLine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {es ? 'No hay comidas registradas aún' : 'No meals logged yet'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      {es ? 'Haz clic en "Añadir" para comenzar' : 'Click "Add" to start'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-green-600">{entry.entry_time}</span>
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                                {mealTypes.find(m => m.value === entry.meal_type)?.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-2">
                              {entry.food_description}
                            </p>
                            {entry.consumption_reason && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                <span className="font-medium">{es ? 'Motivo' : 'Reason'}:</span>{' '}
                                {entry.consumption_reason}
                              </p>
                            )}
                            <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                              <span>≈ {entry.estimated_calories} kcal</span>
                              <span>{entry.estimated_carbs_g}g CHO</span>
                              <span>{entry.estimated_protein_g}g PRO</span>
                              <span>{entry.estimated_fat_g}g FAT</span>
                            </div>
                            {entry.additional_notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
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
                              onClick={() => entry.id && deleteMeal(entry.id)}
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

                {/* Three-state save flow */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                  {toastMsg && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{toastMsg}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => saveDraft(false)}
                      disabled={loading}
                      className="py-3.5 px-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:border-green-500 dark:hover:border-green-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      {es ? 'Guardar' : 'Save'}
                    </button>
                    <button
                      onClick={() => saveDraft(true)}
                      disabled={loading}
                      className="py-3.5 px-4 bg-white dark:bg-gray-700 border-2 border-green-500 text-green-700 dark:text-green-400 rounded-xl font-bold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <FileEdit className="w-5 h-5" />
                      {es ? 'Continuar Editando' : 'Continue Editing'}
                    </button>
                    <button
                      onClick={finalizeLog}
                      disabled={loading}
                      className="py-3.5 px-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      {es ? 'Enviar / Finalizar' : 'Send & Finalize'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {es
                      ? '"Guardar" guarda como borrador y cierra. "Continuar Editando" guarda el borrador y deja el formulario abierto. "Enviar / Finalizar" confirma el registro del día.'
                      : '"Save" stores a draft and closes. "Continue Editing" saves the draft and keeps the form open. "Send & Finalize" confirms the day log.'}
                  </p>
                </div>
              </div>
            )}

            {/* Step: Summary */}
            {step === 'summary' && (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {es ? '¡Registro Enviado!' : 'Log Sent!'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {es
                      ? 'Tu registro de 24 horas ha sido finalizado y está disponible para tu profesional.'
                      : 'Your 24-hour log has been finalized and is available to your professional.'}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4">
                    {es ? 'Resumen Nutricional' : 'Nutritional Summary'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{totals.calories}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">kcal</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{totals.carbs}g</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">CHO</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{totals.protein}g</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">PRO</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{totals.fat}g</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">FAT</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                >
                  {es ? 'Cerrar' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Meal Modal */}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between z-10">
                <h3 className="text-xl font-bold">
                  {editingEntry
                    ? (es ? 'Editar Comida' : 'Edit Meal')
                    : (es ? 'Añadir Comida' : 'Add Meal')}
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
                {/* AI Photo Analysis */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border-2 border-dashed border-purple-300 dark:border-purple-700">
                  <div className="flex items-center gap-3 mb-3">
                    <Camera className="w-6 h-6 text-purple-600" />
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">
                        {es ? 'Análisis con IA' : 'AI Analysis'}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {es ? 'Toma una foto y la IA estimará los alimentos y macros' : 'Take a photo and AI will estimate foods and macros'}
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
                          {es ? 'Analizando...' : 'Analyzing...'}
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5" />
                          {es ? 'Tomar / Subir Foto' : 'Take / Upload Photo'}
                        </>
                      )}
                    </label>
                  </label>

                  {photoAnalysisResult && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          {es ? 'Análisis completado' : 'Analysis completed'}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({Math.round(photoAnalysisResult.confidence * 100)}% {es ? 'confianza' : 'confidence'})
                        </span>
                      </div>
                      {photoAnalysisResult.needs_manual_review && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          ⚠️ {es ? 'Por favor revisa y ajusta los valores abajo' : 'Please review and adjust values below'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Time and Meal Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {es ? 'Hora' : 'Time'}
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
                      {es ? 'Tipo' : 'Type'}
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
                    {es ? 'Descripción de alimentos' : 'Food description'}
                  </label>
                  <textarea
                    value={formData.food_description}
                    onChange={(e) => setFormData({ ...formData, food_description: e.target.value })}
                    rows={4}
                    placeholder={es
                      ? '2 tostadas integrales (60g)\n1 huevo revuelto (60g)\n...'
                      : '2 whole wheat toasts (60g)\n1 scrambled egg (60g)\n...'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Consumption Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {es ? 'Motivo de consumo' : 'Consumption reason'}
                  </label>
                  <input
                    type="text"
                    value={formData.consumption_reason}
                    onChange={(e) => setFormData({ ...formData, consumption_reason: e.target.value })}
                    placeholder={es
                      ? 'Ej.: pre-entrenamiento, hambre, antojo, recuperación'
                      : 'E.g.: pre-workout, hunger, craving, recovery'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Nutritional Estimates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kcal</label>
                    <input
                      type="number"
                      value={formData.estimated_calories}
                      onChange={(e) => setFormData({ ...formData, estimated_calories: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CHO (g)</label>
                    <input
                      type="number"
                      value={formData.estimated_carbs_g}
                      onChange={(e) => setFormData({ ...formData, estimated_carbs_g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PRO (g)</label>
                    <input
                      type="number"
                      value={formData.estimated_protein_g}
                      onChange={(e) => setFormData({ ...formData, estimated_protein_g: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">FAT (g)</label>
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
                    {es ? 'Notas adicionales' : 'Additional notes'}
                  </label>
                  <textarea
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                    rows={2}
                    placeholder={es ? 'Pre-entrenamiento, con mucha hambre, etc.' : 'Pre-workout, very hungry, etc.'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Save Meal Button */}
                <button
                  onClick={saveMeal}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {es ? 'Guardando...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {es ? 'Guardar Comida' : 'Save Meal'}
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
