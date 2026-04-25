import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  TrendingUp,
  Calendar,
  Loader,
  ChevronDown,
  ChevronUp,
  Dumbbell,
} from 'lucide-react';
import { getVBTZone } from './BarVelocityTypes';

interface SessionRecord {
  id: string;
  session_date: string;
  exercise_name: string;
  load_kg: number;
  total_reps: number;
  peak_velocity_ms: number;
  mean_concentric_velocity_ms: number;
  velocity_loss_pct: number;
  estimated_power_w: number;
  fps: number;
  notes: string;
}

export default function BarVelocityHistory() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterExercise, setFilterExercise] = useState<string>('all');

  const txt = {
    noSessions: language === 'es' ? 'Sin sesiones registradas aun.' : 'No sessions recorded yet.',
    firstSession: language === 'es' ? 'Realiza tu primer analisis de velocidad' : 'Complete your first velocity analysis',
    record: language === 'es' ? 'm/s record' : 'm/s record',
    sessions: language === 'es' ? 'sesiones' : 'sessions',
    exercises: language === 'es' ? 'ejercicios' : 'exercises',
    all: language === 'es' ? 'Todos' : 'All',
    progression: language === 'es' ? 'Progresion de velocidad' : 'Velocity progression',
    meanAvg: language === 'es' ? 'media' : 'avg',
    peakVel: language === 'es' ? 'Vel. pico:' : 'Peak vel.:',
    velLoss: language === 'es' ? 'Perdida vel.:' : 'Vel. loss:',
    power: language === 'es' ? 'Potencia:' : 'Power:',
    zone: language === 'es' ? 'Zona:' : 'Zone:',
    notes: language === 'es' ? 'Notas:' : 'Notes:',
  };

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from('bar_velocity_sessions')
        .select('*')
        .eq('athlete_id', user.id)
        .order('session_date', { ascending: false })
        .limit(30);
      setSessions(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 font-body">
        <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{txt.noSessions}</p>
        <p className="text-xs mt-1 opacity-70">{txt.firstSession}</p>
      </div>
    );
  }

  const exercises = ['all', ...Array.from(new Set(sessions.map((s) => s.exercise_name).filter(Boolean)))];
  const filtered = filterExercise === 'all' ? sessions : sessions.filter((s) => s.exercise_name === filterExercise);

  const allPeaks = filtered.map((s) => s.peak_velocity_ms).filter(Boolean);
  const record = allPeaks.length > 0 ? Math.max(...allPeaks) : 0;

  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 text-center">
          <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
          <div className="text-lg font-bold text-primary">{record.toFixed(2)}</div>
          <div className="text-xs text-gray-400">{txt.record}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-2xl p-3 text-center">
          <Calendar className="w-4 h-4 text-gray-300 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-200">{filtered.length}</div>
          <div className="text-xs text-gray-400">{txt.sessions}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-2xl p-3 text-center">
          <Dumbbell className="w-4 h-4 text-gray-300 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-200">{exercises.length - 1}</div>
          <div className="text-xs text-gray-400">{txt.exercises}</div>
        </div>
      </div>

      {exercises.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {exercises.map((ex) => (
            <button
              key={ex}
              onClick={() => setFilterExercise(ex)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterExercise === ex
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700/30 hover:border-gray-600'
              }`}
            >
              {ex === 'all' ? txt.all : ex}
            </button>
          ))}
        </div>
      )}

      {filtered.length >= 4 && (
        <div className="bg-gray-800/40 rounded-2xl p-4 border border-gray-700/30">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            {txt.progression}
          </h4>
          <div className="flex items-end gap-1.5 h-16">
            {[...filtered].reverse().slice(-12).map((s, idx) => {
              const peak = s.peak_velocity_ms || 0;
              const pct = record > 0 ? (peak / (record * 1.1)) * 100 : 0;
              const zone = getVBTZone(s.mean_concentric_velocity_ms || 0);
              return (
                <div key={idx} className="flex-1 flex items-end">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${pct}%`,
                      minHeight: 4,
                      background: zone.color,
                      opacity: 0.8,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((s) => {
          const zone = getVBTZone(s.mean_concentric_velocity_ms || 0);
          const zoneLabel = language === 'es' ? zone.labelEs : zone.labelEn;
          const isExpanded = expanded === s.id;
          return (
            <div
              key={s.id}
              className="bg-gray-800/50 border border-gray-700/30 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : s.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/20 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">
                      {new Date(s.session_date).toLocaleDateString(language === 'es' ? 'es' : 'en', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                    {s.exercise_name && (
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                        {s.exercise_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">
                      <span className="text-primary font-semibold">{(s.mean_concentric_velocity_ms || 0).toFixed(2)} m/s</span> {txt.meanAvg}
                    </span>
                    {s.load_kg && <span className="text-xs text-gray-500">{s.load_kg} kg</span>}
                    <span className="text-xs text-gray-500">{s.total_reps} reps</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-700/30 pt-3 grid grid-cols-2 gap-2">
                  <div className="text-xs">
                    <span className="text-gray-400">{txt.peakVel} </span>
                    <span className="text-gray-200 font-semibold">{(s.peak_velocity_ms || 0).toFixed(2)} m/s</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-400">{txt.velLoss} </span>
                    <span className={s.velocity_loss_pct > 20 ? 'text-red-400' : s.velocity_loss_pct > 10 ? 'text-yellow-400' : 'text-green-400'}>
                      {(s.velocity_loss_pct || 0).toFixed(1)}%
                    </span>
                  </div>
                  {s.estimated_power_w > 0 && (
                    <div className="text-xs">
                      <span className="text-gray-400">{txt.power} </span>
                      <span className="text-orange-400 font-semibold">{s.estimated_power_w.toFixed(0)} W</span>
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="text-gray-400">{txt.zone} </span>
                    <span className="font-medium" style={{ color: zone.color }}>{zoneLabel}</span>
                  </div>
                  {s.notes && (
                    <div className="text-xs col-span-2">
                      <span className="text-gray-400">{txt.notes} </span>
                      <span className="text-gray-300">{s.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
