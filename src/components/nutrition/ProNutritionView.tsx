import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  Search, User, Users, BarChart3, BookOpen, ClipboardList, CheckCircle,
  Clock, AlertCircle, X, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Eye, RefreshCw, Loader2,
} from 'lucide-react';

type Tab = 'dashboard' | 'diary' | 'anamnesis';

interface AthleteOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  sport: string | null;
  is_direct: boolean;
}

interface DiarySession {
  id: string;
  athlete_id: string;
  period_hours: number;
  start_date: string;
  day_of_week: string;
  status: string;
  total_calories: number;
  total_carbs_g: number;
  total_protein_g: number;
  total_fat_g: number;
  completed_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  adherence_score: number | null;
}

interface DiaryEntry {
  id: string;
  entry_time: string;
  meal_type: string;
  food_description: string;
  consumption_reason: string;
  estimated_calories: number;
  estimated_carbs_g: number;
  estimated_protein_g: number;
  estimated_fat_g: number;
  additional_notes: string;
}

interface AnamnesisRow {
  id: string;
  athlete_id: string;
  is_complete: boolean;
  section_progress: number | null;
  updated_at: string;
}

interface PendingTask {
  id: string;
  type: 'diary' | 'anamnesis';
  athleteId: string;
  athleteName: string;
  avatarUrl: string | null;
  date: string;
  label: string;
  detail: string;
}

interface RecentActivity {
  id: string;
  athleteId: string;
  athleteName: string;
  avatarUrl: string | null;
  date: string;
  kind: 'diary' | 'anamnesis';
  status: string;
  detail: string;
}

const dateFmt = (lang: string, dateStr: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(`${dateStr}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', opts);

export default function ProNutritionView() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => language === 'es' ? es : en;

  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [athletesLoading, setAthletesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Dashboard filters
  const [dashAthleteFilter, setDashAthleteFilter] = useState('');
  const [dashFrom, setDashFrom] = useState('');
  const [dashTo, setDashTo] = useState('');
  // Diary filters
  const [diaryAthleteFilter, setDiaryAthleteFilter] = useState('');
  const [diaryDateFilter, setDiaryDateFilter] = useState('');
  // Anamnesis filters
  const [anaSearchFilter, setAnaSearchFilter] = useState('');

  const [allSessions, setAllSessions] = useState<DiarySession[]>([]);
  const [allAnamnesis, setAllAnamnesis] = useState<AnamnesisRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Selected athlete detail state
  const [sessions, setSessions] = useState<DiarySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<DiarySession | null>(null);
  const [sessionEntries, setSessionEntries] = useState<DiaryEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [anamnesisData, setAnamnesisData] = useState<any>(null);
  const [anamnesisLoading, setAnamnesisLoading] = useState(false);

  // Global diary tab: inline accordion expansion + per-session entry cache
  const [expandedDiaryId, setExpandedDiaryId] = useState<string | null>(null);
  const [entriesBySession, setEntriesBySession] = useState<Record<string, DiaryEntry[]>>({});
  const [entryLoadingId, setEntryLoadingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    loadRoster();
  }, [profile?.id]);

  useEffect(() => {
    if (athletes.length > 0) loadAllData();
  }, [athletes]);

  const loadRoster = async () => {
    if (!profile) return;
    setAthletesLoading(true);
    try {
      let direct: AthleteOption[] = [];
      if (profile.role === 'head_coach' || profile.role === 'admin') {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, sport')
          .eq('role', 'athlete')
          .order('full_name');
        direct = (data || []).map(a => ({ ...a, is_direct: false }));
      } else if (profile.role === 'nutritionist') {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, sport')
          .eq('assigned_nutritionist_id', profile.id)
          .eq('role', 'athlete')
          .order('full_name');
        direct = (data || []).map(a => ({ ...a, is_direct: true }));
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, sport')
          .eq('assigned_trainer_id', profile.id)
          .eq('role', 'athlete')
          .order('full_name');
        direct = (data || []).map(a => ({ ...a, is_direct: true }));
      }

      const seen = new Set(direct.map(a => a.id));
      let team: AthleteOption[] = [];
      if (profile.role !== 'nutritionist') {
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('athlete_id, teams!inner(coach_id)')
          .eq('teams.coach_id', profile.id);
        const teamIds = (teamMembers || []).map((m: any) => m.athlete_id).filter((id: string) => !seen.has(id));
        if (teamIds.length > 0) {
          const { data: teamAthletes } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email, sport')
            .in('id', teamIds)
            .eq('role', 'athlete')
            .order('full_name');
          team = (teamAthletes || []).map(a => ({ ...a, is_direct: false }));
        }
      }

      setAthletes([...direct, ...team]);
    } finally {
      setAthletesLoading(false);
    }
  };

  const loadAllData = async () => {
    setDataLoading(true);
    try {
      const ids = athletes.map(a => a.id);
      const { data: sessionsData } = await supabase
        .from('food_diary_sessions')
        .select('*')
        .in('athlete_id', ids)
        .order('start_date', { ascending: false })
        .limit(200);
      setAllSessions(sessionsData || []);

      const { data: anaData } = await supabase
        .from('nutrition_anamnesis')
        .select('id, athlete_id, is_complete, section_progress, updated_at')
        .in('athlete_id', ids)
        .order('updated_at', { ascending: false });
      setAllAnamnesis(anaData || []);
    } finally {
      setDataLoading(false);
    }
  };

  const athleteName = (id: string) => athletes.find(a => a.id === id)?.full_name ?? t('Atleta', 'Athlete');
  const athleteAvatar = (id: string) => athletes.find(a => a.id === id)?.avatar_url ?? null;

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId) ?? null;

  // Latest anamnesis per athlete
  const latestAnamnesisByAthlete = useMemo(() => {
    const map = new Map<string, AnamnesisRow>();
    for (const row of allAnamnesis) {
      if (!map.has(row.athlete_id)) map.set(row.athlete_id, row);
    }
    return map;
  }, [allAnamnesis]);

  const pendingTasks = useMemo(() => {
    const tasks: PendingTask[] = [];
    const now = new Date().toISOString().slice(0, 10);
    for (const session of allSessions) {
      if (session.status === 'finalized') {
        tasks.push({
          id: `diary-${session.id}`,
          type: 'diary',
          athleteId: session.athlete_id,
          athleteName: athleteName(session.athlete_id),
          avatarUrl: athleteAvatar(session.athlete_id),
          date: session.start_date,
          label: t('Diario 24h sin completar', 'Incomplete 24h diary'),
          detail: `${t('iniciado', 'started')} ${dateFmt(language, session.start_date, { day: 'numeric', month: 'short' })}`,
        });
      }
    }
    for (const athlete of athletes) {
      const ana = latestAnamnesisByAthlete.get(athlete.id);
      if (!ana || !ana.is_complete) {
        tasks.push({
          id: `ana-${athlete.id}`,
          type: 'anamnesis',
          athleteId: athlete.id,
          athleteName: athlete.full_name,
          avatarUrl: athlete.avatar_url,
          date: ana?.updated_at?.slice(0, 10) ?? now,
          label: t('Anamnesis pendiente', 'Pending anamnesis'),
          detail: ana
            ? `${t('Secciones completadas', 'Sections completed')}: ${ana.section_progress ?? 0}/4`
            : t('El atleta no ha comenzado la evaluación', 'Athlete has not started the assessment'),
        });
      }
    }
    return tasks.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [allSessions, athletes, latestAnamnesisByAthlete, language]);

  const recentActivity = useMemo(() => {
    const items: RecentActivity[] = [];
    for (const session of allSessions.filter(s => s.status === 'finalized')) {
      items.push({
        id: session.id,
        athleteId: session.athlete_id,
        athleteName: athleteName(session.athlete_id),
        avatarUrl: athleteAvatar(session.athlete_id),
        date: session.start_date,
        kind: 'diary',
        status: session.reviewed_at ? t('Revisado', 'Reviewed') : t('Sin revisar', 'Unreviewed'),
        detail: `${session.total_calories} kcal · P ${session.total_protein_g}g · C ${session.total_carbs_g}g · G ${session.total_fat_g}g`,
      });
    }
    for (const [athleteId, ana] of latestAnamnesisByAthlete) {
      if (ana.is_complete) {
        items.push({
          id: ana.id,
          athleteId,
          athleteName: athleteName(athleteId),
          avatarUrl: athleteAvatar(athleteId),
          date: ana.updated_at.slice(0, 10),
          kind: 'anamnesis',
          status: t('Completa', 'Complete'),
          detail: t('Evaluación nutricional completada', 'Nutritional assessment completed'),
        });
      }
    }
    return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 50);
  }, [allSessions, latestAnamnesisByAthlete, athletes, language]);

  const filteredPending = useMemo(() => pendingTasks.filter(task => {
    if (dashAthleteFilter && !task.athleteName.toLowerCase().includes(dashAthleteFilter.toLowerCase())) return false;
    if (dashFrom && task.date < dashFrom) return false;
    if (dashTo && task.date > dashTo) return false;
    return true;
  }), [pendingTasks, dashAthleteFilter, dashFrom, dashTo]);

  const filteredRecent = useMemo(() => recentActivity.filter(item => {
    if (dashAthleteFilter && !item.athleteName.toLowerCase().includes(dashAthleteFilter.toLowerCase())) return false;
    if (dashFrom && item.date < dashFrom) return false;
    if (dashTo && item.date > dashTo) return false;
    return true;
  }), [recentActivity, dashAthleteFilter, dashFrom, dashTo]);

  const filteredDiaryList = useMemo(() => allSessions.filter(session => {
    const name = athleteName(session.athlete_id);
    if (diaryAthleteFilter && !name.toLowerCase().includes(diaryAthleteFilter.toLowerCase())) return false;
    if (diaryDateFilter && session.start_date !== diaryDateFilter) return false;
    return true;
  }), [allSessions, diaryAthleteFilter, diaryDateFilter, athletes, language]);

  const loadAthleteSessions = async (athleteId: string) => {
    setSessionsLoading(true);
    try {
      const { data } = await supabase
        .from('food_diary_sessions')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('start_date', { ascending: false })
        .limit(50);
      setSessions(data || []);
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadAnamnesis = async (athleteId: string) => {
    setAnamnesisLoading(true);
    try {
      const { data } = await supabase
        .from('nutrition_anamnesis')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setAnamnesisData(data);
    } finally {
      setAnamnesisLoading(false);
    }
  };

  const selectAthlete = (id: string) => {
    setSelectedAthleteId(id);
    setActiveTab('dashboard');
    setSessions([]);
    setAnamnesisData(null);
    setSelectedSession(null);
    loadAthleteSessions(id);
    loadAnamnesis(id);
  };

  const toggleDiaryRow = async (session: DiarySession) => {
    if (expandedDiaryId === session.id) {
      setExpandedDiaryId(null);
      return;
    }
    setExpandedDiaryId(session.id);
    if (entriesBySession[session.id]) return;
    setEntryLoadingId(session.id);
    try {
      const { data } = await supabase
        .from('food_diary_entries')
        .select('*')
        .eq('session_id', session.id)
        .order('entry_time', { ascending: true });
      setEntriesBySession(prev => ({ ...prev, [session.id]: (data || []) as DiaryEntry[] }));
    } finally {
      setEntryLoadingId(null);
    }
  };

  const confirmDiaryReview = async (session: DiarySession) => {
    if (!profile || confirmingId) return;
    setConfirmingId(session.id);
    try {
      const { error } = await supabase
        .from('food_diary_sessions')
        .update({ reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
        .eq('id', session.id);
      if (!error) {
        setAllSessions(prev => prev.map(s =>
          s.id === session.id ? { ...s, reviewed_by: profile.id, reviewed_at: new Date().toISOString() } : s
        ));
        if (selectedSession?.id === session.id) {
          setSelectedSession(prev => prev ? { ...prev, reviewed_by: profile.id, reviewed_at: new Date().toISOString() } : prev);
        }
        setSessions(prev => prev.map(s =>
          s.id === session.id ? { ...s, reviewed_by: profile.id, reviewed_at: new Date().toISOString() } : s
        ));
      }
    } finally {
      setConfirmingId(null);
    }
  };

  const clearAthlete = () => {
    setSelectedAthleteId(null);
    setSelectedSession(null);
    setSessions([]);
    setAnamnesisData(null);
  };

  const openSession = async (session: DiarySession) => {
    setSelectedSession(session);
    setEntriesLoading(true);
    try {
      const { data } = await supabase
        .from('food_diary_entries')
        .select('*')
        .eq('session_id', session.id)
        .order('entry_time', { ascending: true });
      setSessionEntries(data || []);
    } finally {
      setEntriesLoading(false);
    }
  };

  const mealTypeLabel = (type: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      breakfast: { es: 'Desayuno', en: 'Breakfast' },
      lunch: { es: 'Almuerzo', en: 'Lunch' },
      dinner: { es: 'Cena', en: 'Dinner' },
      snack: { es: 'Snack', en: 'Snack' },
      other: { es: 'Otro', en: 'Other' },
    };
    return labels[type]?.[language as 'es' | 'en'] ?? type;
  };

  const filteredAthletes = useMemo(() => athletes.filter(a =>
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  ), [athletes, searchQuery]);

  const tabs: { key: Tab; label: string; icon: typeof BarChart3; activeCls: string }[] = [
    { key: 'dashboard', label: t('Panel', 'Dashboard'), icon: BarChart3, activeCls: 'border-[#514163] dark:border-[#514163]' },
    { key: 'diary', label: t('24h', '24h'), icon: BookOpen, activeCls: 'border-emerald-500 dark:border-emerald-500' },
    { key: 'anamnesis', label: t('Anamnesis', 'Anamnesis'), icon: ClipboardList, activeCls: 'border-blue-500 dark:border-blue-500' },
  ];

  const renderAvatar = (url: string | null, name: string, size = 'w-9 h-9') => (
    <div className={`${size} rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#514163] to-[#3a2f4a] flex-shrink-0`}>
      {url ? <img src={url} alt={name} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-white" />}
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-5">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('Filtrar por atleta...', 'Filter by athlete...')}
              value={dashAthleteFilter}
              onChange={e => setDashAthleteFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#514163]/30 focus:border-[#514163] transition-all"
            />
          </div>
          <div className="flex gap-3">
            <label className="flex-1 sm:flex-none">
              <span className="sr-only">{t('Desde', 'From')}</span>
              <input
                type="date"
                value={dashFrom}
                onChange={e => setDashFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#514163]/30 focus:border-[#514163]"
              />
            </label>
            <label className="flex-1 sm:flex-none">
              <span className="sr-only">{t('Hasta', 'To')}</span>
              <input
                type="date"
                value={dashTo}
                onChange={e => setDashTo(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#514163]/30 focus:border-[#514163]"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: pendingTasks.length, label: t('Pendientes', 'Pending'), cls: 'text-amber-600 dark:text-amber-400' },
          { value: allSessions.filter(s => s.status === 'finalized' && !s.reviewed_at).length, label: t('Sin revisar', 'Unreviewed diaries'), cls: 'text-[#fdda36]' },
          { value: allSessions.filter(s => s.status === 'finalized').length, label: t('Diarios completos', 'Completed diaries'), cls: 'text-emerald-600 dark:text-emerald-400' },
          { value: athletes.filter(a => latestAnamnesisByAthlete.get(a.id)?.is_complete).length + '/' + athletes.length, label: t('Anamnesis completas', 'Anamnesis complete'), cls: 'text-blue-600 dark:text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className={`text-2xl font-bold ${stat.cls}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          {t('Tareas pendientes', 'Pending tasks')}
        </h3>
        {dataLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-7 h-7 border-2 border-[#514163] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('Todo al día. Sin tareas pendientes.', 'All caught up. No pending tasks.')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPending.slice(0, 15).map(task => (
              <button
                key={task.id}
                onClick={() => { selectAthlete(task.athleteId); setActiveTab(task.type === 'diary' ? 'diary' : 'anamnesis'); }}
                className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 p-3.5 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  {renderAvatar(task.avatarUrl, task.athleteName)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{task.athleteName}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${task.type === 'diary' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                        {task.type === 'diary' ? t('Diario', 'Diary') : t('Anamnesis', 'Anamnesis')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{task.label} · {task.detail}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#514163] transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#514163]" />
          {t('Actividad reciente', 'Recent activity')}
        </h3>
        {filteredRecent.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('Sin actividad reciente', 'No recent activity')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecent.slice(0, 15).map(item => (
              <button
                key={item.id}
                onClick={() => { selectAthlete(item.athleteId); setActiveTab(item.kind === 'diary' ? 'diary' : 'anamnesis'); }}
                className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#514163] p-3.5 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  {renderAvatar(item.avatarUrl, item.athleteName)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{item.athleteName}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.kind === 'diary' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                        {item.kind === 'diary' ? t('Diario', 'Diary') : t('Anamnesis', 'Anamnesis')}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${item.status === t('Revisado', 'Reviewed') || item.status === t('Completa', 'Complete') ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {dateFmt(language, item.date)} · {item.detail}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#514163] transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDiaryTab = () => (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('Filtrar por atleta...', 'Filter by athlete...')}
              value={diaryAthleteFilter}
              onChange={e => setDiaryAthleteFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
          </div>
          <label className="sm:flex-none">
            <span className="sr-only">{t('Filtrar por fecha', 'Filter by date')}</span>
            <input
              type="date"
              value={diaryDateFilter}
              onChange={e => setDiaryDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </label>
        </div>
      </div>

      {filteredDiaryList.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('No hay diarios que coincidan con los filtros', 'No diaries match the filters')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDiaryList.map(session => {
            const isExpanded = expandedDiaryId === session.id;
            const sessionEntriesList = entriesBySession[session.id];
            return (
              <div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all" style={{ borderColor: isExpanded ? 'rgb(16,185,129)' : undefined }}>
                <button
                  onClick={() => toggleDiaryRow(session)}
                  className={`w-full p-3.5 text-left transition-all group ${isExpanded ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                >
                  <div className="flex items-center gap-3">
                    {renderAvatar(athleteAvatar(session.athlete_id), athleteName(session.athlete_id))}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{athleteName(session.athlete_id)}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${session.status === 'finalized' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                          {session.status === 'finalized' ? t('Completo', 'Complete') : t('Borrador', 'Draft')}
                        </span>
                        {session.reviewed_at && (
                          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                            <Eye className="w-3 h-3" /> {t('Revisado', 'Reviewed')}{session.adherence_score ? ` ${session.adherence_score}/100` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {dateFmt(language, session.start_date)}
                        {session.status === 'finalized' && ` · ${session.total_calories} kcal · P ${session.total_protein_g}g · C ${session.total_carbs_g}g · G ${session.total_fat_g}g`}
                      </p>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3.5 pb-3.5 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    {session.status === 'finalized' && (
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'kcal', value: session.total_calories, cls: 'text-orange-600 dark:text-orange-400' },
                          { label: 'CHO', value: `${session.total_carbs_g}g`, cls: 'text-amber-600 dark:text-amber-400' },
                          { label: 'PRO', value: `${session.total_protein_g}g`, cls: 'text-blue-600 dark:text-blue-400' },
                          { label: 'FAT', value: `${session.total_fat_g}g`, cls: 'text-rose-600 dark:text-rose-400' },
                        ].map(m => (
                          <div key={m.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 text-center">
                            <p className={`text-base font-bold ${m.cls}`}>{m.value}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {entryLoadingId === session.id ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : !sessionEntriesList || sessionEntriesList.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        {t('Sin entradas en esta sesión', 'No entries in this session')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sessionEntriesList.map(entry => (
                          <div key={entry.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{entry.entry_time}</span>
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                  {mealTypeLabel(entry.meal_type)}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">≈ {entry.estimated_calories} kcal</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{entry.food_description}</p>
                            {entry.consumption_reason && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                <span className="font-semibold">{t('Motivo de consumo', 'Consumption reason')}:</span> {entry.consumption_reason}
                              </p>
                            )}
                            <div className="flex gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <span>{entry.estimated_carbs_g}g CHO</span>
                              <span>{entry.estimated_protein_g}g PRO</span>
                              <span>{entry.estimated_fat_g}g FAT</span>
                            </div>
                            {entry.additional_notes && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 italic">{entry.additional_notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {session.status === 'finalized' && (
                      session.reviewed_at ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                          <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                            {t('Registro visto', 'Log seen')}
                            {session.reviewed_at && ` — ${dateFmt(language, session.reviewed_at.slice(0, 10))}`}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => confirmDiaryReview(session)}
                          disabled={confirmingId === session.id}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          {confirmingId === session.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Eye className="w-4 h-4" />}
                          {confirmingId === session.id
                            ? t('Confirmando...', 'Confirming...')
                            : t('Confirmar que vi este registro', 'Confirm I have seen this log')}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-green-600 text-white p-5 rounded-t-2xl flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-bold">
                    {t('Diario Alimentario', 'Food Diary')} — {dateFmt(language, selectedSession.start_date)}
                  </h2>
                  <p className="text-green-100 text-sm mt-0.5">
                    {athleteName(selectedSession.athlete_id)}
                  </p>
                </div>
                <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-5">
                {selectedSession.status === 'finalized' && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'kcal', value: selectedSession.total_calories, bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
                      { label: 'CHO', value: `${selectedSession.total_carbs_g}g`, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
                      { label: 'PRO', value: `${selectedSession.total_protein_g}g`, bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
                      { label: 'FAT', value: `${selectedSession.total_fat_g}g`, bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400' },
                    ].map(m => (
                      <div key={m.label} className={`${m.bg} rounded-xl p-3 text-center`}>
                        <p className={`text-xl font-bold ${m.text}`}>{m.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                {selectedSession.reviewed_at && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                      {t('Revisado', 'Reviewed')}
                      {selectedSession.adherence_score && ` — ${t('Adherencia', 'Adherence')}: ${selectedSession.adherence_score}/100`}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                    {t('Comidas Registradas', 'Logged Meals')}
                  </h3>
                  {entriesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : sessionEntries.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                      {t('Sin entradas en esta sesión', 'No entries in this session')}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sessionEntries.map(entry => (
                        <div key={entry.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{entry.entry_time}</span>
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                {mealTypeLabel(entry.meal_type)}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">≈ {entry.estimated_calories} kcal</span>
                          </div>
                          {entry.food_description && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{entry.food_description}</p>
                          )}
                          {entry.consumption_reason && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                              <span className="font-semibold">{t('Motivo de consumo', 'Consumption reason')}:</span> {entry.consumption_reason}
                            </p>
                          )}
                          <div className="flex gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{entry.estimated_carbs_g}g CHO</span>
                            <span>{entry.estimated_protein_g}g PRO</span>
                            <span>{entry.estimated_fat_g}g FAT</span>
                          </div>
                          {entry.additional_notes && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 italic">{entry.additional_notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderAnamnesisTab = () => {
    const filtered = athletes.filter(a =>
      a.full_name.toLowerCase().includes(anaSearchFilter.toLowerCase())
    );
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('Filtrar por atleta...', 'Filter by athlete...')}
              value={anaSearchFilter}
              onChange={e => setAnaSearchFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map(athlete => {
            const ana = latestAnamnesisByAthlete.get(athlete.id);
            const complete = ana?.is_complete;
            return (
              <button
                key={athlete.id}
                onClick={() => { selectAthlete(athlete.id); setActiveTab('anamnesis'); }}
                className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 p-3.5 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  {renderAvatar(athlete.avatar_url, athlete.full_name)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{athlete.full_name}</p>
                      {complete ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {t('Anamnesis completa', 'Anamnesis complete')}
                        </span>
                      ) : ana ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {t('Incompleta', 'Incomplete')} ({ana.section_progress ?? 0}/4)
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          {t('Sin anamnesis', 'No anamnesis')}
                        </span>
                      )}
                    </div>
                    {ana && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('Actualizada', 'Updated')}: {dateFmt(language, ana.updated_at.slice(0, 10))}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAthleteDetail = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={clearAthlete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-500 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('Todos los atletas', 'All athletes')}
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {renderAvatar(selectedAthlete?.avatar_url ?? null, selectedAthlete?.full_name ?? '', 'w-9 h-9')}
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white truncate">{selectedAthlete?.full_name}</p>
            {selectedAthlete?.sport && <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{selectedAthlete.sport}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? `${tab.activeCls} text-gray-900 dark:text-white`
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <SelectedAthleteSummary sessions={sessions} sessionsLoading={sessionsLoading} anamnesisData={anamnesisData} anamnesisLoading={anamnesisLoading} />}
      {activeTab === 'diary' && (
        sessionsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('Este atleta todavía no ha registrado diarios.', 'This athlete has not logged any diaries yet.')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => openSession(session)}
                className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-400 p-3.5 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${session.status === 'finalized' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                    {session.status === 'finalized' ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{dateFmt(language, session.start_date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {session.status === 'finalized' && ` · ${session.total_calories} kcal · P ${session.total_protein_g}g · C ${session.total_carbs_g}g · G ${session.total_fat_g}g`}
                    </p>
                  </div>
                  {session.reviewed_at && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      {t('Revisado', 'Reviewed')}{session.adherence_score ? ` ${session.adherence_score}/100` : ''}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )
      )}
      {activeTab === 'anamnesis' && <SelectedAthleteAnamnesis data={anamnesisData} loading={anamnesisLoading} language={language} t={t} />}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Athlete search bar — always first visible element, mobile & desktop */}
      {!selectedAthleteId && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('Buscar atleta...', 'Search athlete...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-base text-gray-900 dark:text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#514163]/30 focus:border-[#514163] transition-all"
          />
        </div>
      )}

      {selectedAthleteId ? (
        renderAthleteDetail()
      ) : athletesLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#514163] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : athletes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('Sin atletas asignados aún', 'No athletes assigned yet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAthletes.map(athlete => {
            const ana = latestAnamnesisByAthlete.get(athlete.id);
            return (
              <button
                key={athlete.id}
                onClick={() => selectAthlete(athlete.id)}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#514163] dark:hover:border-[#514163] p-4 text-left transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  {renderAvatar(athlete.avatar_url, athlete.full_name, 'w-10 h-10')}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{athlete.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{athlete.email}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#514163] transition-colors" />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {ana?.is_complete ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {t('Anamnesis', 'Anamnesis')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {t('Anamnesis pendiente', 'Anamnesis pending')}
                    </span>
                  )}
                  {athlete.is_direct && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#fdda36]/20 text-[#8a7a2a] dark:text-[#fdda36]">
                      {t('Directo', 'Direct')}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectedAthleteSummary({ sessions, sessionsLoading, anamnesisData, anamnesisLoading }: {
  sessions: DiarySession[];
  sessionsLoading: boolean;
  anamnesisData: any;
  anamnesisLoading: boolean;
}) {
  const { language } = useLanguage();
  const t = (es: string, en: string) => language === 'es' ? es : en;
  const completed = sessions.filter(s => s.status === 'finalized');
  const avg = (fn: (s: DiarySession) => number) => completed.length ? Math.round(completed.reduce((acc, s) => acc + fn(s), 0) / completed.length) : null;

  return (
    <div className="space-y-4">
      {sessionsLoading || anamnesisLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#514163] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: sessions.length, label: t('Diarios', 'Diaries'), cls: 'text-gray-900 dark:text-white' },
              { value: avg(s => s.total_calories) ?? '—', label: t('kcal promedio', 'avg kcal'), cls: 'text-orange-600 dark:text-orange-400' },
              { value: avg(s => s.total_protein_g) != null ? `${avg(s => s.total_protein_g)}g` : '—', label: t('Proteína prom.', 'avg protein'), cls: 'text-blue-600 dark:text-blue-400' },
              { value: anamnesisData?.is_complete ? t('Completa', 'Complete') : t('Pendiente', 'Pending'), label: t('Anamnesis', 'Anamnesis'), cls: anamnesisData?.is_complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className={`text-2xl font-bold ${stat.cls}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
          {sessions.filter(s => s.status === 'finalized').slice(0, 5).map(session => (
            <div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{dateFmt(language, session.start_date)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{session.total_calories} kcal · P {session.total_protein_g}g · C {session.total_carbs_g}g · G {session.total_fat_g}g</p>
              </div>
              {session.reviewed_at && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  {t('Revisado', 'Reviewed')}
                </span>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function SelectedAthleteAnamnesis({ data, loading, language, t }: {
  data: any;
  loading: boolean;
  language: string;
  t: (es: string, en: string) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('Este atleta aún no ha completado su evaluación nutricional.', 'This athlete has not completed their nutritional assessment yet.')}</p>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('Anamnesis Nutricional', 'Nutritional Anamnesis')}</h2>
        {data.is_complete && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            {t('Completa', 'Complete')}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        {t('Última actualización', 'Last updated')}: {dateFmt(language, data.updated_at.slice(0, 10))}
      </p>
      <AnamnesisSection title={t('Sección 1 · Salud Básica', 'Section 1 · Basic Health')} icon="🩺">
        <AnaField label={t('Edad', 'Age')} value={data.age ? `${data.age} ${t('años', 'years')}` : null} />
        <AnaField label={t('Sexo', 'Sex')} value={data.sex ? (data.sex === 'male' ? t('Masculino', 'Male') : t('Femenino', 'Female')) : null} />
        <AnaField label={t('Altura', 'Height')} value={data.height_cm ? `${data.height_cm} cm` : null} />
        <AnaField label={t('Peso', 'Weight')} value={data.weight_kg ? `${data.weight_kg} kg` : null} />
        <AnaField label={t('Ocupación', 'Occupation')} value={data.occupation} />
        <AnaField label={t('Nivel de Actividad', 'Activity Level')} value={data.activity_level} />
        <AnaField label={t('Horas de Trabajo', 'Work Hours')} value={data.work_hours} />
        <AnaField label={t('Condiciones Médicas', 'Medical Conditions')} value={data.medical_conditions} />
        <AnaField label={t('Medicamentos / Suplementos', 'Medications / Supplements')} value={data.medications_supplements} />
        <AnaField label={t('Alergias / Intolerancias', 'Allergies / Intolerances')} value={data.allergies_intolerances} />
        <AnaField label={t('Horas de Sueño', 'Sleep Hours')} value={data.sleep_hours ? `${data.sleep_hours} h` : null} />
        <AnaField label={t('Calidad del Sueño', 'Sleep Quality')} value={data.sleep_quality} />
        <AnaField label={t('Niveles de Energía', 'Energy Levels')} value={data.energy_levels} />
        <AnaField label={t('Duración de Baja Energía', 'Low Energy Duration')} value={data.low_energy_duration} />
        <AnaField label={t('Momentos de Baja Energía', 'Low Energy Times')} value={data.low_energy_times} />
        <AnaField label={t('Nivel de Estrés (1-10)', 'Stress Level (1-10)')} value={data.stress_level} />
        <AnaField label={t('Manejo del Estrés', 'Stress Management')} value={data.stress_management} />
        <AnaField label={t('Frecuencia de Alcohol', 'Alcohol Frequency')} value={data.alcohol_frequency} />
        <AnaField label={t('Frecuencia de Tabaquismo', 'Smoking Frequency')} value={data.smoking_frequency} />
      </AnamnesisSection>

      <AnamnesisSection title={t('Sección 2 · Entrenamiento', 'Section 2 · Training')} icon="🏋️">
        <AnaField label={t('Deporte', 'Sport')} value={data.sport} />
        <AnaField label={t('Frecuencia de Entrenamiento', 'Training Frequency')} value={data.training_frequency} />
        <AnaField label={t('Horas de Entrenamiento por Semana', 'Weekly Training Hours')} value={data.training_hours_weekly ? `${data.training_hours_weekly} h` : null} />
        <AnaField label={t('Horario de Entrenamiento', 'Training Time')} value={data.training_time} />
        <AnaField label={t('Nutrición Pre-Entreno', 'Pre-Workout Nutrition')} value={data.pre_workout_nutrition} />
        <AnaField label={t('Nutrición Durante el Entreno', 'During-Workout Nutrition')} value={data.during_workout_nutrition} />
        <AnaField label={t('Nutrición Post-Entreno', 'Post-Workout Nutrition')} value={data.post_workout_nutrition} />
      </AnamnesisSection>

      <AnamnesisSection title={t('Sección 3 · Nutrición', 'Section 3 · Nutrition')} icon="🥗">
        <AnaField label={t('Patrón de Alimentación', 'Eating Pattern')} value={data.eating_pattern} />
        <AnaField label={t('Preferencias Dietéticas', 'Dietary Preferences')} value={data.dietary_preferences} />
        <AnaField label={t('Restricciones Dietéticas', 'Dietary Restrictions')} value={data.dietary_restrictions} />
        <AnaField label={t('Desayuno', 'Breakfast')} value={data.breakfast_description} />
        <AnaField label={t('Almuerzo', 'Lunch')} value={data.lunch_description} />
        <AnaField label={t('Cena', 'Dinner')} value={data.dinner_description} />
        <AnaField label={t('Snacks', 'Snacks')} value={data.snacks_description} />
        <AnaField label={t('Bebidas', 'Beverages')} value={data.beverages_description} />
        <AnaField label={t('Alimentos que le Gustan', 'Food Likes')} value={data.food_likes} />
        <AnaField label={t('Alimentos que No le Gustan', 'Food Dislikes')} value={data.food_dislikes} />
        <AnaField label={t('Alergias Alimentarias', 'Food Allergies')} value={data.food_allergies} />
        <AnaField label={t('Frecuencia de Cocinar', 'Cooking Frequency')} value={data.cooking_frequency} />
        <AnaField label={t('Frecuencia de Comida Fuera', 'Eating Out Frequency')} value={data.eating_out_frequency} />
        <AnaField label={t('Cambios de Apetito', 'Appetite Changes')} value={data.appetite_changes} />
        <AnaField label={t('Relación con la Comida', 'Relationship with Food')} value={data.relationship_with_food} />
        <AnaField label={t('Notas sobre la Relación con la Comida', 'Relationship with Food Notes')} value={data.relationship_food_notes} />
      </AnamnesisSection>

      <AnamnesisSection title={t('Sección 4 · Objetivos', 'Section 4 · Goals')} icon="🎯">
        <AnaField label={t('Objetivo Principal', 'Main Goal')} value={data.main_goal ? data.main_goal.replace(/_/g, ' ') : null} />
        <AnaField label={t('Objetivos Nutricionales', 'Nutrition Goals')} value={data.nutrition_goals} />
        <AnaField label={t('Expectativas de Rendimiento', 'Performance Expectations')} value={data.performance_expectations} />
        <AnaField label={t('Próximos Eventos', 'Upcoming Events')} value={data.upcoming_events} />
        <AnaField label={t('Notas Adicionales', 'Additional Notes')} value={data.additional_notes} />
      </AnamnesisSection>
      {!data.is_complete && (
        <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t('La anamnesis está incompleta. El atleta no ha completado todas las secciones.', 'Anamnesis is incomplete. The athlete has not filled all sections.')}
          </p>
        </div>
      )}
    </div>
  );
}

function AnamnesisSection({ title, icon, children }: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

function AnaField({ label, value }: {
  label: string;
  value: string | number | null;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{String(value)}</p>
    </div>
  );
}
