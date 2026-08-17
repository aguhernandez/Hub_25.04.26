import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Plus, X, Save, Trash2, Copy, TrendingUp, AlertCircle, Check,
  ChevronDown, ChevronRight, Sparkles, Edit2, GripVertical
} from 'lucide-react';

interface Macrocycle {
  id: string;
  phase_type: string;
  start_week: number;
  end_week: number;
  title: string | null;
  description: string | null;
  color: string;
}

interface Mesocycle {
  id: string;
  atp_id: string;
  macrocycle_id: string | null;
  title: string;
  start_week: number;
  end_week: number;
  focus: string | null;
  description: string | null;
  target_tonnage: number;
}

interface WeeklyLoad {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  focus: string | null;
  estimated_load: number;
  relative_load_percent: number | null;
  num_sessions: number;
  movement_patterns: {
    push: number;
    pull: number;
    squat: number;
    hinge: number;
    core: number;
    vertical_push: number;
    vertical_pull: number;
  };
  mesocycle_id: string | null;
  has_plan: boolean;
  actual_load: number | null;
}

interface MacrocycleEditorProps {
  atpId: string;
  athleteId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const PHASE_COLORS = {
  general_prep: '#60a5fa',
  specific_prep: '#34d399',
  pre_comp: '#fbbf24',
  competition: '#f87171',
  transition: '#9ca3af'
};

const PHASE_NAMES = {
  en: {
    general_prep: 'General Preparation',
    specific_prep: 'Specific Preparation',
    pre_comp: 'Pre-Competition',
    competition: 'Competition',
    transition: 'Transition'
  },
  es: {
    general_prep: 'Preparación General',
    specific_prep: 'Preparación Específica',
    pre_comp: 'Precompetición',
    competition: 'Competición',
    transition: 'Transición'
  }
};

const MOVEMENT_PATTERNS = [
  { key: 'push', label: { en: 'Push', es: 'Empuje' } },
  { key: 'pull', label: { en: 'Pull', es: 'Jalón' } },
  { key: 'squat', label: { en: 'Squat', es: 'Sentadilla' } },
  { key: 'hinge', label: { en: 'Hinge', es: 'Bisagra' } },
  { key: 'core', label: { en: 'Core', es: 'Core' } },
  { key: 'vertical_push', label: { en: 'V. Push', es: 'Empuje V.' } },
  { key: 'vertical_pull', label: { en: 'V. Pull', es: 'Jalón V.' } }
];

export default function MacrocycleEditor({ atpId, athleteId, onClose, onUpdate }: MacrocycleEditorProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [macrocycles, setMacrocycles] = useState<Macrocycle[]>([]);
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [weeklyLoads, setWeeklyLoads] = useState<WeeklyLoad[]>([]);
  const [expandedMacro, setExpandedMacro] = useState<string | null>(null);
  const [expandedMeso, setExpandedMeso] = useState<string | null>(null);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [loading, setLoading] = useState(true);

  const isCoachOrAdmin = profile?.role === 'trainer' || profile?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [atpId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [macroRes, mesoRes, loadRes] = await Promise.all([
        supabase.from('atp_macrocycles').select('*').eq('atp_id', atpId).order('start_week'),
        supabase.from('atp_mesocycles').select('*').eq('atp_id', atpId).order('start_week'),
        supabase.from('atp_weekly_loads').select('*').eq('atp_id', atpId).order('week_number')
      ]);

      setMacrocycles(macroRes.data || []);
      setMesocycles(mesoRes.data || []);
      setWeeklyLoads(loadRes.data || []);
    } catch (error) {
      console.error('Error loading ATP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMacrocycle = async () => {
    const lastMacro = macrocycles[macrocycles.length - 1];
    const startWeek = lastMacro ? lastMacro.end_week + 1 : 1;
    const endWeek = Math.min(startWeek + 11, 52);

    const { data, error } = await supabase
      .from('atp_macrocycles')
      .insert({
        atp_id: atpId,
        phase_type: 'general_prep',
        start_week: startWeek,
        end_week: endWeek,
        title: language === 'es' ? 'Nueva Fase' : 'New Phase',
        color: PHASE_COLORS.general_prep
      })
      .select()
      .single();

    if (!error && data) {
      setMacrocycles([...macrocycles, data]);
      setHasChanges(true);
    }
  };

  const handleAddMesocycle = async (macrocycleId: string, macroStartWeek: number, macroEndWeek: number) => {
    const macroMesocycles = mesocycles.filter(m => m.macrocycle_id === macrocycleId);
    const lastMeso = macroMesocycles[macroMesocycles.length - 1];
    const startWeek = lastMeso ? lastMeso.end_week + 1 : macroStartWeek;
    const endWeek = Math.min(startWeek + 3, macroEndWeek);

    const { data, error } = await supabase
      .from('atp_mesocycles')
      .insert({
        atp_id: atpId,
        macrocycle_id: macrocycleId,
        title: language === 'es' ? 'Mesociclo' : 'Mesocycle',
        start_week: startWeek,
        end_week: endWeek,
        target_tonnage: 0
      })
      .select()
      .single();

    if (!error && data) {
      setMesocycles([...mesocycles, data]);
      setHasChanges(true);
    }
  };

  const handleDeleteMacrocycle = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este macrociclo?' : 'Delete this macrocycle?')) return;

    const { error } = await supabase.from('atp_macrocycles').delete().eq('id', id);
    if (!error) {
      setMacrocycles(macrocycles.filter(m => m.id !== id));
      setHasChanges(true);
    }
  };

  const handleDeleteMesocycle = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este mesociclo?' : 'Delete this mesocycle?')) return;

    const { error } = await supabase.from('atp_mesocycles').delete().eq('id', id);
    if (!error) {
      setMesocycles(mesocycles.filter(m => m.id !== id));
      setHasChanges(true);
    }
  };

  const handleUpdateWeek = async (weekId: string, updates: Partial<WeeklyLoad>) => {
    const { error } = await supabase
      .from('atp_weekly_loads')
      .update(updates)
      .eq('id', weekId);

    if (!error) {
      setWeeklyLoads(weeklyLoads.map(w => w.id === weekId ? { ...w, ...updates } : w));
      setHasChanges(true);
    }
  };

  const handleDuplicateWeek = async (week: WeeklyLoad) => {
    const targetWeek = week.week_number + 1;
    const target = weeklyLoads.find(w => w.week_number === targetWeek);

    if (target) {
      await handleUpdateWeek(target.id, {
        estimated_load: week.estimated_load,
        num_sessions: week.num_sessions,
        movement_patterns: week.movement_patterns,
        focus: week.focus
      });
    }
  };

  const handleGenerateProgression = async (mesocycleId: string, type: 'linear' | 'undulating' | 'block') => {
    const mesocycle = mesocycles.find(m => m.id === mesocycleId);
    if (!mesocycle) return;

    const mesoWeeks = weeklyLoads.filter(
      w => w.week_number >= mesocycle.start_week && w.week_number <= mesocycle.end_week
    );

    const baseLoad = mesoWeeks[0]?.estimated_load || 1000;
    let updates: Array<{ id: string; estimated_load: number }> = [];

    if (type === 'linear') {
      mesoWeeks.forEach((week, idx) => {
        updates.push({
          id: week.id,
          estimated_load: baseLoad * (1 + 0.05 * idx)
        });
      });
    } else if (type === 'undulating') {
      const pattern = [0.5, 0.75, 1.0];
      mesoWeeks.forEach((week, idx) => {
        updates.push({
          id: week.id,
          estimated_load: baseLoad * pattern[idx % 3]
        });
      });
    } else if (type === 'block') {
      mesoWeeks.forEach((week, idx) => {
        const isDeload = (idx + 1) % 4 === 0;
        updates.push({
          id: week.id,
          estimated_load: isDeload ? baseLoad * 0.6 : baseLoad * 1.1
        });
      });
    }

    for (const update of updates) {
      await supabase
        .from('atp_weekly_loads')
        .update({ estimated_load: update.estimated_load })
        .eq('id', update.id);
    }

    loadData();
    setHasChanges(true);
  };

  const handleAIGenerate = async () => {
    alert(language === 'es'
      ? 'Generación AI: Esta función creará macrociclos y mesociclos basados en el perfil del atleta. Próximamente.'
      : 'AI Generation: This feature will create macrocycles and mesocycles based on athlete profile. Coming soon.');
  };

  const getComplianceBadge = (week: WeeklyLoad) => {
    if (!week.actual_load) return null;
    const percent = (week.actual_load / week.estimated_load) * 100;
    if (percent >= 90) return <div className="w-2 h-2 rounded-full bg-green-500" />;
    if (percent >= 70) return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
    return <div className="w-2 h-2 rounded-full bg-red-500" />;
  };

  const getMiniSparkline = (weeks: WeeklyLoad[]) => {
    if (weeks.length === 0) return null;
    const max = Math.max(...weeks.map(w => w.estimated_load), 1);
    return (
      <div className="flex items-end gap-0.5 h-8">
        {weeks.map((week, idx) => (
          <div
            key={idx}
            className="flex-1 bg-[#fdda36] rounded-t"
            style={{ height: `${(week.estimated_load / max) * 100}%`, minHeight: '2px' }}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {language === 'es' ? 'Editor de Macrociclos' : 'Macrocycle Editor'}
              {hasChanges && <span className="text-sm text-[#fdda36]">*</span>}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {language === 'es'
                ? 'Gestiona fases, mesociclos y progresiones de carga'
                : 'Manage phases, mesocycles, and load progressions'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isCoachOrAdmin && (
              <button
                onClick={handleAIGenerate}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {language === 'es' ? 'Generar IA' : 'AI Generate'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {macrocycles.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {language === 'es' ? 'No hay macrociclos' : 'No macrocycles'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {language === 'es'
                    ? 'Comienza agregando tu primera fase de entrenamiento'
                    : 'Start by adding your first training phase'}
                </p>
                {isCoachOrAdmin && (
                  <button
                    onClick={handleAddMacrocycle}
                    className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {language === 'es' ? 'Agregar Macrociclo' : 'Add Macrocycle'}
                  </button>
                )}
              </div>
            ) : (
              macrocycles.map((macro) => {
                const macroWeeks = weeklyLoads.filter(
                  w => w.week_number >= macro.start_week && w.week_number <= macro.end_week
                );
                const macroMesocycles = mesocycles.filter(m => m.macrocycle_id === macro.id);
                const isExpanded = expandedMacro === macro.id;
                const totalLoad = macroWeeks.reduce((sum, w) => sum + w.estimated_load, 0);
                const totalSessions = macroWeeks.reduce((sum, w) => sum + w.num_sessions, 0);

                return (
                  <div
                    key={macro.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                    style={{ borderLeftColor: macro.color, borderLeftWidth: '6px' }}
                  >
                    {/* Macrocycle Header */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <button
                            onClick={() => setExpandedMacro(isExpanded ? null : macro.id)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                              {PHASE_NAMES[language][macro.phase_type as keyof typeof PHASE_NAMES['en']]}
                            </h4>
                          </button>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>
                              {language === 'es' ? 'Semanas' : 'Weeks'} {macro.start_week}-{macro.end_week}
                            </span>
                            <span>
                              {totalLoad.toFixed(0)} {language === 'es' ? 'kg total' : 'kg total'}
                            </span>
                            <span>
                              {totalSessions} {language === 'es' ? 'sesiones' : 'sessions'}
                            </span>
                          </div>
                          <div className="mt-3 w-64">
                            {getMiniSparkline(macroWeeks)}
                          </div>
                        </div>
                        {isCoachOrAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAddMesocycle(macro.id, macro.start_week, macro.end_week)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title={language === 'es' ? 'Agregar Mesociclo' : 'Add Mesocycle'}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMacrocycle(macro.id)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title={language === 'es' ? 'Eliminar' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mesocycles */}
                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {macroMesocycles.length === 0 ? (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                            {language === 'es'
                              ? 'No hay mesociclos. Agrega uno para organizar las semanas.'
                              : 'No mesocycles. Add one to organize weeks.'}
                          </p>
                        ) : (
                          macroMesocycles.map((meso) => {
                            const mesoWeeks = weeklyLoads.filter(
                              w => w.week_number >= meso.start_week && w.week_number <= meso.end_week
                            );
                            const isMesoExpanded = expandedMeso === meso.id;

                            return (
                              <div key={meso.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                {/* Mesocycle Header */}
                                <div className="bg-white dark:bg-gray-800 p-3 flex items-center justify-between">
                                  <button
                                    onClick={() => setExpandedMeso(isMesoExpanded ? null : meso.id)}
                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                  >
                                    {isMesoExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {meso.title} ({language === 'es' ? 'Sem' : 'Wk'} {meso.start_week}-{meso.end_week})
                                    </span>
                                  </button>
                                  <div className="flex items-center gap-2">
                                    {isCoachOrAdmin && (
                                      <>
                                        <button
                                          onClick={() => handleGenerateProgression(meso.id, 'linear')}
                                          className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                          title="Linear +5%"
                                        >
                                          Linear
                                        </button>
                                        <button
                                          onClick={() => handleGenerateProgression(meso.id, 'undulating')}
                                          className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                                          title="Undulating 50/75/100%"
                                        >
                                          Undulating
                                        </button>
                                        <button
                                          onClick={() => handleGenerateProgression(meso.id, 'block')}
                                          className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                          title="Block 3:1"
                                        >
                                          Block
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMesocycle(meso.id)}
                                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                        >
                                          <Trash2 className="w-3 h-3 text-red-600" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Weeks Grid */}
                                {isMesoExpanded && (
                                  <div className="p-3 bg-gray-50 dark:bg-gray-900/30">
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {mesoWeeks.map((week) => (
                                        <div
                                          key={week.id}
                                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <GripVertical className="w-4 h-4 text-gray-400" />
                                              <span className="font-bold text-gray-900 dark:text-white">
                                                {language === 'es' ? 'Sem' : 'Wk'} {week.week_number}
                                              </span>
                                              {getComplianceBadge(week)}
                                            </div>
                                            {isCoachOrAdmin && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() => handleDuplicateWeek(week)}
                                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                  title={language === 'es' ? 'Duplicar' : 'Duplicate'}
                                                >
                                                  <Copy className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => setEditingWeek(week.id === editingWeek ? null : week.id)}
                                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {editingWeek === week.id ? (
                                            <div className="space-y-2">
                                              <input
                                                type="number"
                                                value={week.estimated_load}
                                                onChange={(e) => handleUpdateWeek(week.id, { estimated_load: parseFloat(e.target.value) })}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                                placeholder="Load (kg)"
                                              />
                                              <input
                                                type="number"
                                                value={week.num_sessions}
                                                onChange={(e) => handleUpdateWeek(week.id, { num_sessions: parseInt(e.target.value) })}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                                placeholder="Sessions"
                                              />
                                              <div className="grid grid-cols-2 gap-1">
                                                {MOVEMENT_PATTERNS.map((mp) => (
                                                  <input
                                                    key={mp.key}
                                                    type="number"
                                                    value={week.movement_patterns[mp.key as keyof typeof week.movement_patterns]}
                                                    onChange={(e) => handleUpdateWeek(week.id, {
                                                      movement_patterns: {
                                                        ...week.movement_patterns,
                                                        [mp.key]: parseInt(e.target.value) || 0
                                                      }
                                                    })}
                                                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                                                    placeholder={mp.label[language]}
                                                  />
                                                ))}
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                  {language === 'es' ? 'Carga:' : 'Load:'}
                                                </span>
                                                <span className="font-semibold text-gray-900 dark:text-white ml-2">
                                                  {week.estimated_load.toFixed(0)} kg
                                                </span>
                                              </div>
                                              <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                  {language === 'es' ? 'Sesiones:' : 'Sessions:'}
                                                </span>
                                                <span className="font-semibold text-gray-900 dark:text-white ml-2">
                                                  {week.num_sessions}
                                                </span>
                                              </div>
                                              <div className="grid grid-cols-4 gap-1 text-xs">
                                                {MOVEMENT_PATTERNS.slice(0, 4).map((mp) => (
                                                  <div key={mp.key} className="text-center p-1 bg-gray-100 dark:bg-gray-700 rounded">
                                                    <div className="text-gray-600 dark:text-gray-400 text-[10px]">
                                                      {mp.label[language]}
                                                    </div>
                                                    <div className="font-semibold text-gray-900 dark:text-white">
                                                      {week.movement_patterns[mp.key as keyof typeof week.movement_patterns]}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {isCoachOrAdmin && macrocycles.length > 0 && (
            <button
              onClick={handleAddMacrocycle}
              className="w-full mt-4 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-[#fdda36] hover:bg-[#fdda36]/10 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#fdda36]"
            >
              <Plus className="w-5 h-5" />
              {language === 'es' ? 'Agregar Macrociclo' : 'Add Macrocycle'}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {hasChanges && (
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#fdda36]" />
                {language === 'es' ? 'Cambios guardados automáticamente' : 'Changes saved automatically'}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                onUpdate();
                onClose();
              }}
              className="px-6 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              {language === 'es' ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
