import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  ChevronDown, ChevronUp, Plus, Edit, Trash2, CheckCircle,
  Clock, Loader, CalendarDays, FileEdit
} from 'lucide-react';
import FoodDiary24h from './FoodDiary24h';

interface DiaryEntry {
  id: string;
  entry_time: string;
  meal_type: string;
  food_description: string;
  estimated_calories: number;
  estimated_carbs_g: number;
  estimated_protein_g: number;
  estimated_fat_g: number;
}

interface DiarySession {
  id: string;
  athlete_id: string;
  start_date: string;
  day_of_week: string;
  status: string;
  total_calories: number | null;
  total_carbs_g: number | null;
  total_protein_g: number | null;
  total_fat_g: number | null;
  entries?: DiaryEntry[];
}

interface DayLog {
  date: string;
  sessions: DiarySession[];
}

interface Props {
  onChanged?: () => void;
}

const DAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function FoodDiaryWeekView({ onChanged }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const es = language === 'es';

  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [logs, setLogs] = useState<Record<string, DiarySession[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [entriesLoading, setEntriesLoading] = useState<string | null>(null);

  // Form state: date + existing session to edit (null = new entry)
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<string>(isoDate(new Date()));
  const [formSession, setFormSession] = useState<DiarySession | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const loadWeek = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const from = isoDate(days[0]);
      const to = isoDate(days[6]);
      const { data, error } = await supabase
        .from('food_diary_sessions')
        .select('*')
        .eq('athlete_id', profile.id)
        .gte('start_date', from)
        .lte('start_date', to)
        .order('created_at', { ascending: true });
      if (!error && data) {
        const map: Record<string, DiarySession[]> = {};
        for (const s of data as DiarySession[]) {
          (map[s.start_date] = map[s.start_date] || []).push(s);
        }
        setLogs(map);
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.id, weekStart]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  const openDay = async (date: string) => {
    if (expandedDay === date) {
      setExpandedDay(null);
      return;
    }
    setExpandedDay(date);
    const sessions = logs[date];
    if (!sessions?.length || sessions[0].entries) return;
    setEntriesLoading(date);
    try {
      const { data } = await supabase
        .from('food_diary_entries')
        .select('*')
        .in('session_id', sessions.map(s => s.id))
        .order('entry_time', { ascending: true });
      if (data) {
        const bySession: Record<string, DiaryEntry[]> = {};
        for (const e of data as DiaryEntry[] & { session_id: string }[]) {
          (bySession[e.session_id] = bySession[e.session_id] || []).push(e);
        }
        setLogs(prev => ({
          ...prev,
          [date]: sessions.map(s => ({ ...s, entries: bySession[s.id] || [] }))
        }));
      }
    } finally {
      setEntriesLoading(null);
    }
  };

  const deleteSession = async (session: DiarySession, date: string) => {
    const msg = es
      ? `¿Eliminar este registro completo del ${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}? Esta acción no se puede deshacer.`
      : `Delete this entire log from ${new Date(date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}? This cannot be undone.`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from('food_diary_sessions').delete().eq('id', session.id);
    if (!error) {
      setLogs(prev => {
        const next = { ...prev };
        next[date] = (next[date] || []).filter(s => s.id !== session.id);
        return next;
      });
      onChanged?.();
    }
  };

  const handleSaved = () => {
    loadWeek();
    onChanged?.();
  };

  const openNewEntry = (date: string) => {
    setFormDate(date);
    setFormSession(null);
    setFormOpen(true);
  };

  const openEditEntry = (session: DiarySession, date: string) => {
    setFormDate(date);
    setFormSession(session);
    setFormOpen(true);
  };

  const weekLabel = `${new Date(days[0]).toLocaleDateString(es ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })} — ${new Date(days[6]).toLocaleDateString(es ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const isToday = (date: string) => date === isoDate(new Date());

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
        <button
          onClick={() => { setExpandedDay(null); setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); }}
          className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label={es ? 'Semana anterior' : 'Previous week'}
        >
          <ChevronDown className="w-5 h-5 -rotate-90" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
              {es ? 'Mi Semana' : 'My Week'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{weekLabel}</p>
          </div>
        </div>
        <button
          onClick={() => { setExpandedDay(null); setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); }}
          className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label={es ? 'Semana siguiente' : 'Next week'}
        >
          <ChevronUp className="w-5 h-5 -rotate-90" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => {
            const date = isoDate(day);
            const sessions = logs[date] || [];
            const hasLogs = sessions.length > 0;
            const finalizedCount = sessions.filter(s => s.status === 'finalized').length;
            const draftCount = sessions.length - finalizedCount;
            const isExpanded = expandedDay === date;
            const today = isToday(date);

            return (
              <div key={date} className="bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden transition-all" style={{ borderColor: isExpanded ? 'rgb(16,185,129)' : undefined }}>
                <button
                  onClick={() => openDay(date)}
                  className={`w-full p-4 flex items-center gap-4 text-left transition-colors min-h-[64px] ${
                    isExpanded ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {/* Day badge */}
                  <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 ${
                    today
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                      : hasLogs
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-gray-100 dark:bg-gray-700/50'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${today ? 'text-emerald-100' : hasLogs ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {day.toLocaleDateString(es ? 'es-ES' : 'en-US', { weekday: 'short' })}
                    </span>
                    <span className={`text-lg font-bold leading-none ${today ? 'text-white' : hasLogs ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Day info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-sm capitalize ${today ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'}`}>
                        {day.toLocaleDateString(es ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      {today && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wide">
                          {es ? 'Hoy' : 'Today'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {hasLogs ? (
                        <>
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {sessions.length} {sessions.length === 1 ? (es ? 'registro' : 'log') : (es ? 'registros' : 'logs')}
                          </span>
                          {finalizedCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3 h-3" /> {finalizedCount}
                            </span>
                          )}
                          {draftCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              <Clock className="w-3 h-3" /> {draftCount}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {es ? 'Sin registros — toca para añadir' : 'No logs — tap to add'}
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                </button>

                {/* Expanded day content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    {entriesLoading === date ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : sessions.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        {es ? 'Todavía no registraste comidas este día.' : 'No meals logged for this day yet.'}
                      </p>
                    ) : (
                      sessions.map(session => {
                        const isFinalized = session.status === 'finalized';
                        const dayTotals = session.entries?.reduce((acc, e) => ({
                          kcal: acc.kcal + (e.estimated_calories || 0),
                          carbs: acc.carbs + (e.estimated_carbs_g || 0),
                          protein: acc.protein + (e.estimated_protein_g || 0),
                          fat: acc.fat + (e.estimated_fat_g || 0)
                        }), { kcal: 0, carbs: 0, protein: 0, fat: 0 });

                        return (
                          <div key={session.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            {/* Entry header */}
                            <div className="px-4 py-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isFinalized ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40'
                                }`}>
                                  {isFinalized
                                    ? <CheckCircle className="w-4.5 h-4.5 w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    : <FileEdit className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {es ? 'Registro' : 'Log'} · {(session.entries?.length ?? 0)} {es ? (session.entries?.length === 1 ? 'comida' : 'comidas') : (session.entries?.length === 1 ? 'meal' : 'meals')}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isFinalized
                                      ? (session.total_calories
                                          ? `${session.total_calories} kcal · P ${session.total_protein_g}g · C ${session.total_carbs_g}g · G ${session.total_fat_g}g`
                                          : (es ? 'Enviado' : 'Sent'))
                                      : (es ? 'Borrador — sin enviar' : 'Draft — not sent')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => openEditEntry(session, date)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  aria-label={es ? 'Editar registro' : 'Edit log'}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteSession(session, date)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  aria-label={es ? 'Eliminar registro' : 'Delete log'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Meals summary */}
                            {session.entries && session.entries.length > 0 && (
                              <div className="px-4 pb-3 space-y-1.5">
                                {session.entries.map(e => (
                                  <div key={e.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 w-11 flex-shrink-0">{e.entry_time}</span>
                                    <span className="truncate flex-1">{e.food_description.split('\n')[0]}</span>
                                    <span className="flex-shrink-0 font-medium text-gray-500 dark:text-gray-400">{e.estimated_calories} kcal</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* New entry button */}
                    <button
                      onClick={() => openNewEntry(date)}
                      className="w-full py-3 border-2 border-dashed border-emerald-400 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {es ? '+ Nueva Entrada' : '+ New Entry'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Log form modal */}
      <FoodDiary24h
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        logDate={formDate}
        existingSession={formSession}
        onSaved={handleSaved}
      />
    </div>
  );
}
