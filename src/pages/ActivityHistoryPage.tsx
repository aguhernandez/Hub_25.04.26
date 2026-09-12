import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Clock, TrendingUp, Mountain, Filter, RefreshCw,
  Activity as ActivityIcon, ChevronRight, Zap, Heart,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { StravaClient } from '../utils/stravaClient';
import { ActivityDetailModal } from '../components/training/ActivityDetailModal';

interface UnifiedActivity {
  id: string;
  source: string;
  sport_type: string;
  name: string;
  start_time: string;
  local_date: string | null;
  duration_seconds: number;
  distance_meters: number;
  elevation_gain_meters: number;
  average_speed_mps: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  has_heartrate: boolean;
  average_watts: number | null;
  max_watts: number | null;
  has_power: boolean;
  suffer_score: number | null;
  calories: number | null;
  time_in_zones: Record<string, number> | null;
  fused_activity_id: string | null;
  raw_data: any;
  streams_fetched: boolean;
}

const SPORT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'run', label: 'Run' },
  { key: 'ride', label: 'Bike' },
  { key: 'swim', label: 'Swim' },
  { key: 'walk', label: 'Walk' },
  { key: 'hike', label: 'Hike' },
];

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${m.toFixed(0)} m`;
}

function fmtSpeed(mps: number): string {
  if (mps <= 0) return '—';
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

function fmtPace(mps: number): string {
  if (mps <= 0) return '—';
  const secPerKm = 1000 / mps;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.floor(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')} /km`;
}

function isRunLike(sport: string): boolean {
  return ['run', 'trail_run', 'walk', 'hike'].includes(sport);
}

function sportIcon(sport: string): string {
  const map: Record<string, string> = {
    run: '🏃', trail_run: '🏔️', ride: '🚴', swim: '🏊',
    walk: '🚶', hike: '🥾', row: '🚣', strength: '🏋️',
  yoga: '🧘', workout: '💪',
  road_bike: '🚴', mountain_bike: '🚵', gravel_bike: '🚵',
  open_water_swim: '🏊', trail_run: '🏃',
  ski: '⛷️',
  kayak: '🛶', canoe: '🛶',
  sport: '⚽',
  default: '⭐',
  };
  return map[sport] || map.default;
}

export default function ActivityHistoryPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [filtered, setFiltered] = useState<UnifiedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedSport, setSelectedSport] = useState('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');
  const [selectedActivity, setSelectedActivity] = useState<UnifiedActivity | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadActivities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: external, error: extError } = await supabase
        .from('external_activities')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('start_time', { ascending: false })
        .limit(200);

      if (extError) throw extError;

      const unified: UnifiedActivity[] = (external || []).map((a: any) => ({
        id: a.id,
        source: a.source,
        sport_type: a.sport_type,
        name: a.name || a.sport_type,
        start_time: a.start_time,
        local_date: a.local_date,
        duration_seconds: a.duration_seconds || 0,
        distance_meters: a.distance_meters || 0,
        elevation_gain_meters: a.elevation_gain_meters || 0,
        average_speed_mps: a.average_speed_mps || 0,
        average_heartrate: a.average_heartrate,
        max_heartrate: a.max_heartrate,
        has_heartrate: a.has_heartrate,
        average_watts: a.average_watts,
        max_watts: a.max_watts,
        has_power: a.has_power,
        suffer_score: a.suffer_score,
        calories: a.calories,
        time_in_zones: a.time_in_zones,
        fused_activity_id: a.fused_activity_id,
        raw_data: a.raw_data,
        streams_fetched: a.streams_fetched,
      }));

      setActivities(unified);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    let result = [...activities];
    if (selectedSport !== 'all') {
      result = result.filter((a) => a.sport_type === selectedSport || a.sport_type.startsWith(selectedSport));
    }
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === 'week') cutoff.setDate(now.getDate() - 7);
      else cutoff.setMonth(now.getMonth() - 1);
      result = result.filter((a) => new Date(a.start_time) >= cutoff);
    }
    setFiltered(result);
  }, [activities, selectedSport, dateRange]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const result = await StravaClient.syncActivities({ perPage: 100 });
    if (result.success) {
      const msg = language === 'es'
        ? `Sincronizado: ${result.synced} actividades${result.streams_fetched ? `, ${result.streams_fetched} streams` : ''}`
        : `Synced: ${result.synced} activities${result.streams_fetched ? `, ${result.streams_fetched} streams` : ''}`;
      setSyncMsg({ type: 'success', text: msg });
      await loadActivities();
    } else {
      setSyncMsg({ type: 'error', text: result.error || 'Sync failed' });
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 5000);
  };

  const totalDistance = filtered.reduce((s, a) => s + (a.distance_meters || 0), 0);
  const totalDuration = filtered.reduce((s, a) => s + (a.duration_seconds || 0), 0);
  const totalElevation = filtered.reduce((s, a) => s + (a.elevation_gain_meters || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {language === 'es' ? 'Historial de Actividad' : 'Activity History'}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {language === 'es' ? 'Todas tus actividades en un solo lugar' : 'All your activities in one place'}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? (language === 'es' ? 'Sincronizando...' : 'Syncing...') : (language === 'es' ? 'Forzar sync' : 'Force sync')}
        </button>
      </div>

      {/* Sync message */}
      {syncMsg && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${
          syncMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {syncMsg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{language === 'es' ? 'Actividades' : 'Activities'}</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">{filtered.length}</p>
            </div>
            <ActivityIcon className="w-7 h-7 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{language === 'es' ? 'Distancia' : 'Distance'}</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">{(totalDistance / 1000).toFixed(1)} km</p>
            </div>
            <TrendingUp className="w-7 h-7 text-green-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{language === 'es' ? 'Duración' : 'Duration'}</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">{fmtDuration(totalDuration)}</p>
            </div>
            <Clock className="w-7 h-7 text-orange-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{language === 'es' ? 'Elevación' : 'Elevation'}</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">{Math.round(totalElevation)} m</p>
            </div>
            <Mountain className="w-7 h-7 text-purple-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-neutral-400" />
        {SPORT_FILTERS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSelectedSport(s.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedSport === s.key
                ? 'bg-blue-500 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(['week', 'month', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                dateRange === r
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {r === 'week' ? (language === 'es' ? 'Semana' : 'Week') : r === 'month' ? (language === 'es' ? 'Mes' : 'Month') : (language === 'es' ? 'Todo' : 'All')}
            </button>
          ))}
        </div>
      </div>

      {/* Activity list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((activity) => {
            const isRun = isRunLike(activity.sport_type);
            const date = new Date(activity.start_time);
            return (
              <button
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className="w-full text-left bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  {/* Sport icon */}
                  <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-xl shrink-0">
                    {sportIcon(activity.sport_type)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
                        {activity.name}
                      </h3>
                      {activity.source === 'strava' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white shrink-0">STRAVA</span>
                      )}
                      {activity.source === 'asciende_gps' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white shrink-0">GPS</span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-5 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-neutral-400">{language === 'es' ? 'Dist.' : 'Dist.'}</p>
                      <p className="font-semibold text-neutral-900 dark:text-white">{fmtDistance(activity.distance_meters)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-400">{language === 'es' ? 'Tiempo' : 'Time'}</p>
                      <p className="font-semibold text-neutral-900 dark:text-white">{fmtDuration(activity.duration_seconds)}</p>
                    </div>
                    {activity.average_heartrate != null && (
                      <div className="text-right">
                        <p className="text-xs text-neutral-400">FC</p>
                        <p className="font-semibold text-rose-600 dark:text-rose-400">{Math.round(activity.average_heartrate)}</p>
                      </div>
                    )}
                    {activity.average_watts != null && (
                      <div className="text-right">
                        <p className="text-xs text-neutral-400">W</p>
                        <p className="font-semibold text-amber-600 dark:text-amber-400">{Math.round(activity.average_watts)}</p>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-neutral-300 dark:text-neutral-600 group-hover:text-blue-500 transition-colors shrink-0" />
                </div>

                {/* Mobile stats */}
                <div className="flex sm:hidden items-center gap-4 mt-2 ml-14 text-xs">
                  <span className="font-semibold text-neutral-900 dark:text-white">{fmtDistance(activity.distance_meters)}</span>
                  <span className="text-neutral-500">{fmtDuration(activity.duration_seconds)}</span>
                  {isRun && <span className="text-neutral-500">{fmtPace(activity.average_speed_mps)}</span>}
                  {!isRun && <span className="text-neutral-500">{fmtSpeed(activity.average_speed_mps)}</span>}
                  {activity.average_heartrate != null && (
                    <span className="flex items-center gap-1 text-rose-500"><Heart className="w-3 h-3" />{Math.round(activity.average_heartrate)}</span>
                  )}
                  {activity.average_watts != null && (
                    <span className="flex items-center gap-1 text-amber-500"><Zap className="w-3 h-3" />{Math.round(activity.average_watts)}W</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <ActivityIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400 mb-1">
            {language === 'es' ? 'No se encontraron actividades' : 'No activities found'}
          </p>
          <p className="text-sm text-neutral-400">
            {language === 'es' ? 'Conecta Strava o graba con GPS para empezar' : 'Connect Strava or record with GPS to get started'}
          </p>
        </div>
      )}

      {/* Detail modal */}
      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </div>
  );
}
