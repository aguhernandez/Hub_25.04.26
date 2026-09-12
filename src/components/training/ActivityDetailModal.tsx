import React, { useState, useEffect } from 'react';
import {
  X, Clock, TrendingUp, Mountain, Heart, Zap, Gauge,
  Activity as ActivityIcon, MapPin, Timer, Flame,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ActivityMapViewer from './ActivityMapViewer';

interface UnifiedActivity {
  id: string;
  source: 'asciende_gps' | 'strava' | 'garmin' | 'coros' | 'suunto' | 'polar' | 'wahoo' | 'trainingpeaks' | 'other';
  external_id?: string;
  sport_type: string;
  name: string;
  start_time: string;
  local_date: string | null;
  duration_seconds: number;
  elapsed_time_seconds: number | null;
  distance_meters: number;
  elevation_gain_meters: number;
  average_speed_mps: number;
  max_speed_mps: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  has_heartrate: boolean;
  average_watts: number | null;
  max_watts: number | null;
  weighted_avg_watts: number | null;
  has_power: boolean;
  average_cadence: number | null;
  suffer_score: number | null;
  calories: number | null;
  device_name: string | null;
  time_in_zones: Record<string, number> | null;
  fused_activity_id: string | null;
  raw_data: any;
  streams_fetched: boolean;
}

interface ActivityStream {
  time_stream: number[] | null;
  heartrate_stream: number[] | null;
  watts_stream: number[] | null;
  altitude_stream: number[] | null;
  distance_stream: number[] | null;
  latlng_stream: number[][] | null;
  cadence_stream: number[] | null;
  velocity_smooth_stream: number[] | null;
}

interface Props {
  activity: UnifiedActivity | null;
  onClose: () => void;
}

const ZONE_COLORS = [
  'bg-sky-400', 'bg-teal-400', 'bg-lime-400', 'bg-yellow-400',
  'bg-orange-400', 'bg-red-400', 'bg-rose-600',
];
const ZONE_LABELS = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7'];

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
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

function SportBadge({ sport, source }: { sport: string; source: string }) {
  const isStrava = source === 'strava';
  return (
    <div className="flex items-center gap-2">
      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
        {sport.replace(/_/g, ' ')}
      </span>
      {isStrava && (
        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-orange-500 text-white">
          Strava
        </span>
      )}
      {source === 'asciende_gps' && (
        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500 text-white">
          GPS
        </span>
      )}
    </div>
  );
}

function MiniChart({
  data,
  color,
  label,
  unit,
  height = 120,
}: {
  data: number[] | null;
  color: string;
  label: string;
  unit: string;
  height?: number;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-500">
          {Math.round(min)} – {Math.round(max)} {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ZoneBar({ timeInZones }: { timeInZones: Record<string, number> | null }) {
  if (!timeInZones) return null;
  const zones = [1, 2, 3, 4, 5, 6, 7].map((z) => timeInZones[`zone_${z}_seconds`] || 0);
  const total = zones.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Time in Zones</h4>
      <div className="flex h-6 rounded-lg overflow-hidden">
        {zones.map((sec, i) => {
          const pct = (sec / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              className={`${ZONE_COLORS[i]} flex items-center justify-center text-[10px] font-bold text-white/90 transition-all`}
              style={{ width: `${pct}%` }}
              title={`${ZONE_LABELS[i]}: ${fmtDuration(sec)}`}
            >
              {pct > 8 ? ZONE_LABELS[i] : ''}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-neutral-500 dark:text-neutral-500">
        {zones.map((sec, i) => (
          <span key={i} className="text-center">
            {ZONE_LABELS[i]}<br />
            <span className="text-neutral-600 dark:text-neutral-400">{fmtDuration(sec)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ActivityDetailModal({ activity, onClose }: Props) {
  const [streams, setStreams] = useState<ActivityStream | null>(null);
  const [gpsPoints, setGpsPoints] = useState<{ latitude: number; longitude: number; altitude?: number }[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [asciendeGpsPoints, setAsciendeGpsPoints] = useState<{ latitude: number; longitude: number; altitude?: number }[]>([]);

  useEffect(() => {
    if (!activity) return;
    setLoadingStreams(true);
    setStreams(null);
    setGpsPoints([]);
    setAsciendeGpsPoints([]);

    const loadAll = async () => {
      // Load streams from external_activities
      if (activity.source !== 'asciende_gps') {
        const { data: streamData } = await supabase
          .from('activity_streams')
          .select('*')
          .eq('activity_id', activity.id)
          .maybeSingle();

        if (streamData) {
          setStreams(streamData as ActivityStream);
          if (streamData.latlng_stream && Array.isArray(streamData.latlng_stream)) {
            setGpsPoints(
              streamData.latlng_stream
                .filter((p: any) => Array.isArray(p) && p.length === 2)
                .map((p: number[]) => ({ latitude: p[0], longitude: p[1] }))
            );
          }
        }
      }

      // If fused with an Asciende GPS activity, load those GPS points too
      if (activity.fused_activity_id) {
        const { data: fusedActivity } = await supabase
          .from('external_activities')
          .select('id, raw_data')
          .eq('id', activity.fused_activity_id)
          .maybeSingle();

        if (fusedActivity?.raw_data?.activity_id) {
          const { data: gpsData } = await supabase
            .from('activity_gps_points')
            .select('latitude, longitude, altitude_m, sequence_order')
            .eq('activity_id', fusedActivity.raw_data.activity_id)
            .order('sequence_order');
          if (gpsData) {
            setAsciendeGpsPoints(gpsData.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude, altitude: p.altitude_m })));
          }
        }
      }

      // For Asciende GPS activities, load GPS points directly
      if (activity.source === 'asciende_gps' && activity.raw_data?.activity_id) {
        const { data: gpsData } = await supabase
          .from('activity_gps_points')
          .select('latitude, longitude, altitude_m, sequence_order')
          .eq('activity_id', activity.raw_data.activity_id)
          .order('sequence_order');
        if (gpsData) {
          setGpsPoints(gpsData.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude, altitude: p.altitude_m })));
        }
      }

      setLoadingStreams(false);
    };

    loadAll();
  }, [activity]);

  if (!activity) return null;

  const allGpsPoints = gpsPoints.length > 0 ? gpsPoints : asciendeGpsPoints;
  const hasMap = allGpsPoints.length >= 2;
  const hasElevation = streams?.altitude_stream && streams.altitude_stream.length > 1;
  const hasHr = streams?.heartrate_stream && streams.heartrate_stream.length > 1;
  const hasPower = streams?.watts_stream && streams.watts_stream.length > 1;
  const isRun = isRunLike(activity.sport_type);
  const startDate = new Date(activity.start_time);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <ActivityIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-neutral-900 dark:text-white text-base truncate">{activity.name}</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {startDate.toLocaleDateString()} · {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors shrink-0">
            <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Source + sport badge */}
          <SportBadge sport={activity.sport_type} source={activity.source} />

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Distance</span>
              </div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{fmtDistance(activity.distance_meters)}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Duration</span>
              </div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{fmtDuration(activity.duration_seconds)}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-1.5 mb-1">
                <Gauge className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{isRun ? 'Pace' : 'Speed'}</span>
              </div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {isRun ? fmtPace(activity.average_speed_mps) : fmtSpeed(activity.average_speed_mps)}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-1.5 mb-1">
                <Mountain className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Elevation</span>
              </div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{Math.round(activity.elevation_gain_meters || 0)} m</p>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="flex flex-wrap gap-2">
            {activity.average_heartrate != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <Heart className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {Math.round(activity.average_heartrate)} bpm
                </span>
                {activity.max_heartrate != null && (
                  <span className="text-xs text-rose-400">max {activity.max_heartrate}</span>
                )}
              </div>
            )}
            {activity.average_watts != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {Math.round(activity.average_watts)} W
                </span>
                {activity.weighted_avg_watts != null && (
                  <span className="text-xs text-amber-400">NP {Math.round(activity.weighted_avg_watts)}</span>
                )}
              </div>
            )}
            {activity.max_watts != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                  Max {Math.round(activity.max_watts)} W
                </span>
              </div>
            )}
            {activity.suffer_score != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <Flame className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Suffer {Math.round(activity.suffer_score)}
                </span>
              </div>
            )}
            {activity.calories != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <Flame className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  {Math.round(activity.calories)} kcal
                </span>
              </div>
            )}
            {activity.average_cadence != null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  {Math.round(activity.average_cadence)} cad
                </span>
              </div>
            )}
            {activity.device_name && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{activity.device_name}</span>
              </div>
            )}
          </div>

          {/* Map */}
          {hasMap ? (
            <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <ActivityMapViewer gpsPoints={allGpsPoints} />
            </div>
          ) : (
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 text-center">
              <MapPin className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No GPS track available for this activity</p>
            </div>
          )}

          {/* Charts */}
          {loadingStreams ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              {hasElevation && (
                <MiniChart
                  data={streams!.altitude_stream}
                  color="#10b981"
                  label="Elevation"
                  unit="m"
                />
              )}
              {hasHr && (
                <MiniChart
                  data={streams!.heartrate_stream}
                  color="#f43f5e"
                  label="Heart Rate"
                  unit="bpm"
                />
              )}
              {hasPower && (
                <MiniChart
                  data={streams!.watts_stream}
                  color="#f59e0b"
                  label="Power"
                  unit="W"
                />
              )}
            </>
          )}

          {/* Time in zones */}
          <ZoneBar timeInZones={activity.time_in_zones} />

          {/* Fused activity note */}
          {activity.fused_activity_id && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
              <MapPin className="w-3.5 h-3.5" />
              This Strava activity was matched with a GPS recording from Asciende.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
