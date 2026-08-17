import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { TrendingUp, Trophy, Calendar, Loader, ChevronDown, ChevronUp } from 'lucide-react';

interface SessionRecord {
  id: string;
  session_date: string;
  protocol: string;
  best_height_cm: number;
  avg_height_cm: number;
  fatigue_index_pct: number;
  total_jumps: number;
  body_mass_kg: number;
  notes: string;
}

export default function CMJHistory() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const txt = {
    noSessions: language === 'es' ? 'Sin sesiones registradas aun.' : 'No sessions recorded yet.',
    firstAssessment: language === 'es' ? 'Realiza tu primer assessment CMJ' : 'Complete your first CMJ assessment',
    record: language === 'es' ? 'cm record' : 'cm record',
    sessions: language === 'es' ? 'sesiones' : 'sessions',
    trend: language === 'es' ? 'cm tendencia' : 'cm trend',
    progression: (n: number) => language === 'es' ? `Progresion (ultimas ${n} sesiones)` : `Progression (last ${n} sessions)`,
    best: language === 'es' ? 'Mejor' : 'Best',
    jumps: language === 'es' ? 'saltos' : 'jumps',
    average: language === 'es' ? 'Promedio' : 'Average',
    fatigue: language === 'es' ? 'Fatiga' : 'Fatigue',
    mass: language === 'es' ? 'Masa' : 'Mass',
    notes: language === 'es' ? 'Notas' : 'Notes',
    protocolLabels: {
      standard: language === 'es' ? 'Estandar' : 'Standard',
      fatigue: language === 'es' ? 'Fatiga' : 'Fatigue',
      reactive: language === 'es' ? 'Reactivo' : 'Reactive',
    },
  };

  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      const { data } = await (supabase as any)
        .from('cmj_sessions')
        .select('*')
        .eq('athlete_id', user.id)
        .order('session_date', { ascending: false })
        .limit(20);
      setSessions(data || []);
      setLoading(false);
    };
    fetchSessions();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm text-gray-400">{txt.noSessions}</p>
        <p className="text-xs mt-1 opacity-60">{txt.firstAssessment}</p>
      </div>
    );
  }

  const best = Math.max(...sessions.map((s) => s.best_height_cm || 0));
  const trend = sessions.length >= 2
    ? sessions[0].best_height_cm - sessions[sessions.length - 1].best_height_cm
    : 0;

  const getProtocolLabel = (protocol: string) => {
    return (txt.protocolLabels as any)[protocol] || protocol;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-primary/20 rounded-2xl p-3 text-center">
          <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
          <div className="text-lg font-bold text-primary">{best.toFixed(1)}</div>
          <div className="text-xs text-gray-500">{txt.record}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-3 text-center">
          <Calendar className="w-4 h-4 text-gray-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-200">{sessions.length}</div>
          <div className="text-xs text-gray-500">{txt.sessions}</div>
        </div>
        <div className={`bg-gray-900 border rounded-2xl p-3 text-center ${
          trend >= 0 ? 'border-green-500/20' : 'border-red-500/20'
        }`}>
          <TrendingUp className={`w-4 h-4 mx-auto mb-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`} />
          <div className={`text-lg font-bold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">{txt.trend}</div>
        </div>
      </div>

      {sessions.length >= 3 && (
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800/60">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {txt.progression(Math.min(sessions.length, 10))}
          </h4>
          <div className="flex items-end gap-1.5 h-14">
            {[...sessions].reverse().slice(-10).map((s, idx) => {
              const pct = (s.best_height_cm / (best * 1.1)) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full bg-primary rounded-t opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${pct}%`, minHeight: 3 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">
                    {new Date(s.session_date).toLocaleDateString(language === 'es' ? 'es' : 'en', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700/50">
                    {getProtocolLabel(s.protocol)}
                  </span>
                  {s.best_height_cm === best && (
                    <Trophy className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">
                    {txt.best}:{' '}
                    <span className="text-primary font-semibold">{s.best_height_cm?.toFixed(1)} cm</span>
                  </span>
                  <span className="text-xs text-gray-600">{s.total_jumps} {txt.jumps}</span>
                </div>
              </div>
              {expanded === s.id ? (
                <ChevronUp className="w-4 h-4 text-gray-600 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />
              )}
            </button>

            {expanded === s.id && (
              <div className="px-4 pb-3 grid grid-cols-2 gap-2 border-t border-gray-800/60 pt-3">
                <div className="text-xs">
                  <span className="text-gray-500">{txt.average}: </span>
                  <span className="text-gray-300">{s.avg_height_cm?.toFixed(1)} cm</span>
                </div>
                <div className="text-xs">
                  <span className="text-gray-500">{txt.fatigue}: </span>
                  <span className={
                    s.fatigue_index_pct > 10 ? 'text-red-400' :
                    s.fatigue_index_pct > 5 ? 'text-yellow-400' : 'text-green-400'
                  }>
                    {s.fatigue_index_pct?.toFixed(1)}%
                  </span>
                </div>
                {s.body_mass_kg && (
                  <div className="text-xs">
                    <span className="text-gray-500">{txt.mass}: </span>
                    <span className="text-gray-300">{s.body_mass_kg} kg</span>
                  </div>
                )}
                {s.notes && (
                  <div className="text-xs col-span-2">
                    <span className="text-gray-500">{txt.notes}: </span>
                    <span className="text-gray-400">{s.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
