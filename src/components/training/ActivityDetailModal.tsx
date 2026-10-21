import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { X, Activity as ActivityIcon } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import ActivityMapViewer from './ActivityMapViewer';
import { calculateGapPace, calculateZoneTimes, getPassportZones, parseThresholdPace } from '../../utils/activityDetailAnalysis';

interface UnifiedActivity {
  id: string;
  source: string;
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
  splits_metric?: any[] | null;
  splits_standard?: any[] | null;
  map_polyline?: string | null;
  map_summary_polyline?: string | null;
  average_grade?: number | null;
  elev_high?: number | null;
  elev_low?: number | null;
  user_id?: string;
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
  grade_smooth_stream: number[] | null;
  moving_stream: boolean[] | null;
}

interface Props {
  activity: UnifiedActivity | null;
  onClose: () => void;
  athleteId?: string;
  wearableDetails?: any;
  wearableLoading?: boolean;
  isWearable?: boolean;
  actions?: ReactNode;
  language?: 'en' | 'es';
}

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

function fmtPaceFromSecPerKm(secPerKm: number): string {
  if (secPerKm <= 0 || !isFinite(secPerKm)) return '—';
  const min = Math.floor(secPerKm / 60);
  const sec = Math.floor(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function isRunLike(sport: string): boolean {
  return ['run', 'trail_run', 'walk', 'hike'].includes(sport);
}

function SportBadge({ sport, source }: { sport: string; source: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
        {sport.replace(/_/g, ' ')}
      </span>
      {source === 'strava' && (
        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-orange-500 text-white">Strava</span>
      )}
      {source === 'asciende_gps' && (
        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500 text-white">GPS</span>
      )}
      {source !== 'asciende_gps' && source !== 'strava' && (
        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 capitalize">{source === 'open_wearables' ? 'Open Wearables' : source.replace(/_/g, ' ')}</span>
      )}
    </div>
  );
}

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += (result & 1) ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += (result & 1) ? ~(result >> 1) : result >> 1;

    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }

  return points;
}

function ElevationChart({ distanceStream, altitudeStream }: { distanceStream: number[] | null; altitudeStream: number[] | null }) {
  const data = useMemo(() => {
    if (!distanceStream || !altitudeStream || distanceStream.length < 2 || altitudeStream.length < 2) return [];
    const length = Math.min(distanceStream.length, altitudeStream.length);
    const step = Math.max(1, Math.floor(length / 240));
    return Array.from({ length: Math.ceil(length / step) }, (_, i) => {
      const index = Math.min(i * step, length - 1);
      return {
        distance: Number((distanceStream[index] / 1000).toFixed(2)),
        elevation: Math.round(altitudeStream[index]),
      };
    });
  }, [distanceStream, altitudeStream]);

  if (data.length < 2) return null;
  const startElevation = data[0].elevation;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Elevation profile</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-500">{Math.min(...data.map((p) => p.elevation))}–{Math.max(...data.map((p) => p.elevation))} m</span>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="elevationFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
            <XAxis dataKey="distance" tick={{ fontSize: 10 }} tickFormatter={(value: number) => `${value} km`} />
            <YAxis tick={{ fontSize: 10 }} width={42} tickFormatter={(value: number) => `${value}m`} />
            <Tooltip
              cursor={{ stroke: '#f8fafc', strokeWidth: 2 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const elevation = Number(payload[0].value);
                return (
                  <div className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white shadow-xl">
                    <p className="font-semibold">{Number(label).toFixed(2)} km</p>
                    <p>{elevation} m</p>
                    <p className={elevation - startElevation >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {elevation - startElevation >= 0 ? '+' : ''}{elevation - startElevation} m from start
                    </p>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="elevation" stroke="#10b981" strokeWidth={2} fill="url(#elevationFill)" activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MiniChart({
  data, color, label, unit, height = 120,
}: {
  data: number[] | null; color: string; label: string; unit: string; height?: number;
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

function PaceChart({
  timeStream, distanceStream, height = 120,
}: {
  timeStream: number[] | null; distanceStream: number[] | null; height?: number;
}) {
  const paceData = useMemo(() => {
    if (!timeStream || !distanceStream || timeStream.length < 3 || distanceStream.length < 3) return null;
    const paces: number[] = [];
    const windowSize = Math.max(5, Math.floor(timeStream.length / 50));
    for (let i = windowSize; i < timeStream.length; i += windowSize) {
      const dt = timeStream[i] - timeStream[i - windowSize];
      const dd = distanceStream[i] - distanceStream[i - windowSize];
      if (dt > 0 && dd > 0) {
        const speed = dd / dt;
        if (speed > 0) paces.push(1000 / speed);
      }
    }
    return paces.length > 2 ? paces : null;
  }, [timeStream, distanceStream]);

  if (!paceData) return null;
  const min = Math.min(...paceData);
  const max = Math.max(...paceData);
  const range = max - min || 1;
  const w = 100;
  const points = paceData.map((v, i) => {
    const x = (i / (paceData.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Pace</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-500">
          {fmtPaceFromSecPerKm(min)} – {fmtPaceFromSecPerKm(max)} /km
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="#8B5CF6" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function buildGpsSplits(streams: ActivityStream | null, isRun: boolean): any[] | null {
  if (!streams?.time_stream || !streams.distance_stream || streams.time_stream.length < 3 || streams.distance_stream.length < 3) return null;

  const time = streams.time_stream;
  const distance = streams.distance_stream;
  const altitude = streams.altitude_stream;
  const totalDistance = distance[distance.length - 1];
  if (!Number.isFinite(totalDistance) || totalDistance < 1000) return null;

  const splits: any[] = [];
  let previousIndex = 0;
  let targetDistance = 1000;
  while (targetDistance <= totalDistance + 1) {
    let index = previousIndex;
    while (index < distance.length - 1 && distance[index] < targetDistance) index += 1;
    const segmentDistance = Math.max(0, distance[index] - distance[previousIndex]);
    const segmentTime = Math.max(0, time[index] - time[previousIndex]);
    const elevationDifference = altitude && altitude[index] != null && altitude[previousIndex] != null
      ? altitude[index] - altitude[previousIndex]
      : 0;
    if (segmentDistance > 0 && segmentTime > 0) {
      splits.push({
        distance: segmentDistance,
        moving_time: segmentTime,
        elapsed_time: segmentTime,
        elevation_difference: elevationDifference,
      });
    }
    previousIndex = index;
    targetDistance += 1000;
  }

  const lastIndex = distance.length - 1;
  if (previousIndex < lastIndex && distance[lastIndex] > distance[previousIndex]) {
    splits.push({
      distance: distance[lastIndex] - distance[previousIndex],
      moving_time: Math.max(0, time[lastIndex] - time[previousIndex]),
      elapsed_time: Math.max(0, time[lastIndex] - time[previousIndex]),
      elevation_difference: altitude && altitude[lastIndex] != null && altitude[previousIndex] != null
        ? altitude[lastIndex] - altitude[previousIndex]
        : 0,
    });
  }

  return splits.length >= 2 ? splits : null;
}

function SplitsTable({ splits, isMetric }: { splits: any[] | null; isMetric: boolean }) {
  if (!splits || splits.length === 0) return null;
  const unit = isMetric ? 'km' : 'mi';
  const distFactor = isMetric ? 1000 : 1609.344;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Splits ({unit})</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-right py-2 px-2">Dist</th>
              <th className="text-right py-2 px-2">Time</th>
              <th className="text-right py-2 px-2">Pace</th>
              <th className="text-right py-2 px-2">Elev</th>
              {splits.some((s: any) => s.average_heartrate != null) && (
                <th className="text-right py-2 px-2">HR</th>
              )}
            </tr>
          </thead>
          <tbody>
            {splits.map((split: any, i: number) => {
              const dist = split.distance / distFactor;
              const movingTime = split.moving_time ?? split.elapsed_time ?? 0;
              const paceSecPerKm = movingTime > 0 && dist > 0 ? movingTime / dist : 0;
              const elevDiff = split.elevation_difference ?? 0;
              const isFastest = i === splits.reduce((bestIdx: number, s: any, idx: number) => {
                const sPace = (s.moving_time ?? s.elapsed_time ?? 0) / (s.distance / distFactor);
                return sPace < (splits[bestIdx].moving_time ?? splits[bestIdx].elapsed_time ?? 0) / (splits[bestIdx].distance / distFactor) ? idx : bestIdx;
              }, 0);

              return (
                <tr key={i} className="border-b border-neutral-100 dark:border-neutral-700/50">
                  <td className="py-2 px-2 text-neutral-500 dark:text-neutral-400">{i + 1}</td>
                  <td className="py-2 px-2 text-right font-medium text-neutral-900 dark:text-white">{dist.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right text-neutral-700 dark:text-neutral-300">{fmtDuration(movingTime)}</td>
                  <td className={`py-2 px-2 text-right font-medium ${isFastest ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                    {fmtPaceFromSecPerKm(paceSecPerKm)}
                  </td>
                  <td className={`py-2 px-2 text-right ${elevDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : elevDiff < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                    {elevDiff > 0 ? '+' : ''}{Math.round(elevDiff)}m
                  </td>
                  {splits.some((s: any) => s.average_heartrate != null) && (
                    <td className="py-2 px-2 text-right text-rose-600 dark:text-rose-400">
                      {split.average_heartrate != null ? Math.round(split.average_heartrate) : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaceAnalysis({ splits, isMetric }: { splits: any[] | null; isMetric: boolean }) {
  if (!splits || splits.length < 2) return null;
  const distFactor = isMetric ? 1000 : 1609.344;
  const data = splits.map((split: any, index: number) => {
    const distance = Number(split.distance || 0) / distFactor;
    const time = Number(split.moving_time ?? split.elapsed_time ?? 0);
    return {
      split: index + 1,
      pace: distance > 0 && time > 0 ? time / distance : 0,
      elevation: Number(split.elevation_difference ?? 0),
    };
  }).filter((split) => split.pace > 0);

  if (data.length < 2) return null;
  const average = data.reduce((sum, split) => sum + split.pace, 0) / data.length;
  const fastest = data.reduce((best, split) => split.pace < best.pace ? split : best, data[0]);
  const slowest = data.reduce((worst, split) => split.pace > worst.pace ? split : worst, data[0]);
  const paceColor = (pace: number) => pace <= average * 0.95 ? '#10b981' : pace <= average * 1.05 ? '#f59e0b' : '#ef4444';
  const chartData = data.map((split) => ({ ...split, paceLabel: fmtPaceFromSecPerKm(split.pace) }));

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 transition-all duration-300">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h4 className="text-base font-semibold text-neutral-900 dark:text-white">Pace Analysis</h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{isMetric ? 'Per-kilometer pace' : 'Per-mile pace'}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right">
          <div><p className="text-[10px] text-neutral-500">Average</p><p className="text-sm font-bold text-neutral-900 dark:text-white">{fmtPaceFromSecPerKm(average)}</p></div>
          <div><p className="text-[10px] text-neutral-500">Best</p><p className="text-sm font-bold text-emerald-500">#{fastest.split} · {fmtPaceFromSecPerKm(fastest.pace)}</p></div>
          <div><p className="text-[10px] text-neutral-500">Worst</p><p className="text-sm font-bold text-rose-500">#{slowest.split} · {fmtPaceFromSecPerKm(slowest.pace)}</p></div>
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
            <XAxis dataKey="split" tick={{ fontSize: 10 }} tickFormatter={(value: number) => `${value}`} />
            <YAxis tick={{ fontSize: 10 }} width={42} tickFormatter={(value: number) => fmtPaceFromSecPerKm(value)} domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip formatter={(value: number) => [`${fmtPaceFromSecPerKm(value)} /km`, 'Pace']} labelFormatter={(value) => `Split ${value}`} />
            <ReferenceLine y={average} stroke="#64748b" strokeDasharray="5 5" label={{ value: 'avg', position: 'insideTopRight', fontSize: 10 }} />
            <Bar dataKey="pace" radius={[3, 3, 0, 0]} animationDuration={700}>
              {chartData.map((split) => <Cell key={split.split} fill={paceColor(split.pace)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TelemetryGraph({ streams, distanceMeters, onHover }: { streams: ActivityStream | null; distanceMeters: number; onHover: (index: number | null) => void }) {
  if (!streams?.time_stream?.length) return null;
  const length = Math.min(streams.time_stream.length, streams.heartrate_stream?.length || Infinity, streams.altitude_stream?.length || Infinity, streams.distance_stream?.length || Infinity);
  const step = Math.max(1, Math.floor(length / 900));
  const indices = Array.from({ length: Math.ceil(length / step) }, (_, i) => Math.min(i * step, length - 1));
  const lanes = [
    { label: 'Pace', values: streams.velocity_smooth_stream ? indices.map(index => streams.velocity_smooth_stream![index] > 0 ? 1000 / streams.velocity_smooth_stream![index] : null) : null, color: '#8b5cf6' },
    { label: 'Heart rate', values: streams.heartrate_stream ? indices.map(index => streams.heartrate_stream![index]) : null, color: '#f43f5e' },
    { label: 'Elevation', values: streams.altitude_stream ? indices.map(index => streams.altitude_stream![index]) : null, color: '#10b981' },
  ].filter(lane => lane.values?.some(value => value != null));
  if (!lanes.length) return null;
  const width = 1000, laneHeight = 80, gap = 22, height = lanes.length * (laneHeight + gap) + 20;
  return <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
    <div className="mb-3 flex flex-wrap gap-4 text-xs">{lanes.map(lane => <span key={lane.label} className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300"><i className="h-2 w-2 rounded-full" style={{ background: lane.color }} />{lane.label}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full touch-none" onPointerLeave={() => onHover(null)} onPointerMove={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const sampleIndex = indices[Math.round(ratio * (indices.length - 1))] || 0;
      onHover(distanceMeters > 0 && streams.distance_stream?.length ? Math.round(sampleIndex / (streams.distance_stream.length - 1) * 10000) : Math.round(ratio * 10000));
    }}>
      {lanes.map((lane, laneIndex) => {
        const values = lane.values!.filter((value): value is number => value != null && Number.isFinite(value));
        const min = Math.min(...values), max = Math.max(...values), span = max - min || 1, top = laneIndex * (laneHeight + gap) + 10;
        const points = lane.values!.map((value, index) => value == null ? null : `${(index / (lane.values!.length - 1)) * width},${top + laneHeight - 4 - ((value - min) / span) * (laneHeight - 8)}`).filter(Boolean).join(' ');
        return <g key={lane.label}><text x="0" y={top - 1} fontSize="12" fill="#64748b">{lane.label}</text><polyline points={points} fill="none" stroke={lane.color} strokeWidth="2.5" strokeLinejoin="round" /></g>;
      })}
    </svg>
    <p className="mt-1 text-[11px] text-neutral-500">{streams.time_stream.length ? fmtDuration(streams.time_stream[streams.time_stream.length - 1]) : ''} · Hover to follow position on map</p>
  </section>;
}

export function ActivityDetailModal({ activity, onClose, athleteId, wearableDetails, wearableLoading = false, isWearable = false, actions, language: languageProp }: Props) {
  const language = languageProp || (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en');
  const [streams, setStreams] = useState<ActivityStream | null>(null);
  const [gpsPoints, setGpsPoints] = useState<{ latitude: number; longitude: number; altitude?: number }[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [passport, setPassport] = useState<any | null>(null);

  const wearableStreams = useMemo<ActivityStream | null>(() => {
    if (!wearableDetails?.series) return null;
    const entries = Object.entries(wearableDetails.series) as [string, any[]][];
    const extract = (pattern: RegExp) => entries.find(([type]) => pattern.test(type))?.[1] || [];
    const toTime = (rows: any[]) => rows.map(row => Math.max(0, (Number(row.timestamp) - Date.parse(wearableDetails.window?.start_time || activity?.start_time || '')) / 1000));
    const hr = extract(/heart.?rate|^hr(?:_|$)/i);
    const power = extract(/power/i);
    const altitude = extract(/altitude|elevation/i);
    const distance = extract(/distance/i);
    const speed = extract(/speed|velocity/i);
    const cadence = extract(/cadence/i);
    const anchor = hr.length ? hr : power.length ? power : altitude.length ? altitude : speed;
    if (!anchor.length) return null;
    const times = toTime(anchor);
    const interpolate = (rows: any[], field: string) => rows.length ? times.map(time => {
      const startMs = Date.parse(wearableDetails.window?.start_time || activity?.start_time || '');
      let low = 0, high = rows.length - 1;
      while (low < high) { const mid = Math.floor((low + high) / 2); if ((Number(rows[mid].timestamp) - startMs) / 1000 < time) low = mid + 1; else high = mid; }
      const row = low > 0 && Math.abs((Number(rows[low - 1].timestamp) - startMs) / 1000 - time) <= Math.abs((Number(rows[low].timestamp) - startMs) / 1000 - time) ? rows[low - 1] : rows[low];
      const value = Number(row.value);
      if (field === 'distance' && value < 1000 && Number(activity?.distance_meters) > 1000) return value * 1000;
      return value;
    }) : null;
    const speedValues = interpolate(speed, 'speed');
    const distanceValues = interpolate(distance, 'distance') || (speedValues ? times.map((t, i) => i ? times[i - 1] + ((speedValues[i - 1] + speedValues[i]) / 2) * (t - times[i - 1]) : 0) : null);
    return {
      time_stream: times,
      heartrate_stream: interpolate(hr, 'hr'), watts_stream: interpolate(power, 'power'),
      altitude_stream: interpolate(altitude, 'altitude'), distance_stream: distanceValues,
      latlng_stream: null, cadence_stream: interpolate(cadence, 'cadence'),
      velocity_smooth_stream: speedValues, grade_smooth_stream: null,
      moving_stream: null,
    };
  }, [wearableDetails, activity]);

  const detailStreams = wearableStreams || streams;
  const detailGpsPoints = useMemo(() => {
    const route = wearableDetails?.route;
    if (Array.isArray(route)) return route.filter((point: any) => Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))).map((point: any) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude), altitude: point.altitude_m }));
    return gpsPoints;
  }, [wearableDetails, gpsPoints]);

  useEffect(() => {
    const id = athleteId || activity?.user_id;
    if (!id) { setPassport(null); return; }
    let cancelled = false;
    supabase.from('biological_passports')
      .select('ftp_watts, critical_power, lt1_power, lt2_power, lt1_hr, lt2_hr, running_threshold_pace, hr_zones_json, power_zones_json, training_zones, measurement_date')
      .eq('athlete_id', id).eq('status', 'active').order('measurement_date', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (!cancelled) setPassport(data || null); });
    return () => { cancelled = true; };
  }, [athleteId, activity?.user_id]);

  useEffect(() => {
    if (!activity) return;
    if (isWearable || wearableDetails) {
      setStreams(wearableStreams);
      setGpsPoints([]);
      setLoadingStreams(wearableLoading);
      return;
    }
    setLoadingStreams(true);
    setStreams(null);
    setGpsPoints([]);
    setMapError(null);

    const loadAll = async () => {
      // Load stored telemetry for imported activities.
      const { data: streamData } = await supabase
        .from('activity_streams')
        .select('*')
        .eq('activity_id', activity.id)
        .maybeSingle();

      if (streamData) {
        setStreams(streamData as ActivityStream);
      }

      // Load GPS points for map
      if (activity.source === 'asciende_gps' && activity.raw_data?.activity_id) {
        const { data: gpsData } = await supabase
          .from('activity_gps_points')
          .select('latitude, longitude, altitude_m, sequence_order')
          .eq('activity_id', activity.raw_data.activity_id)
          .order('sequence_order');
        if (gpsData && gpsData.length >= 2) {
          setGpsPoints(gpsData.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude, altitude: p.altitude_m })));
        } else if (activity.map_polyline) {
          try {
            const decoded = decodePolyline(activity.map_polyline);
            if (decoded.length >= 2) setGpsPoints(decoded);
          } catch (e) {
            console.error('[ActivityDetailModal] Failed to decode GPS polyline fallback', e);
          }
        }
      } else if (activity.source !== 'asciende_gps') {
        // Strava or other sources: use streams latlng or decode polyline
        const streamGpsPoints = Array.isArray(streamData?.latlng_stream)
          ? streamData.latlng_stream
            .filter((p: any) => Array.isArray(p) && p.length === 2)
            .map((p: number[]) => ({ latitude: p[0], longitude: p[1] }))
          : [];
        if (streamGpsPoints.length >= 2) {
          setGpsPoints(streamGpsPoints);
        } else {
          const encodedPolyline = activity.map_polyline || activity.map_summary_polyline;
          if (encodedPolyline) {
            try {
              const decodedPoints = decodePolyline(encodedPolyline);
              if (decodedPoints.length >= 2) setGpsPoints(decodedPoints);
            } catch (error) {
              console.error('[ActivityDetailModal] Failed to decode polyline', error);
            }
          }
        }
      }

      // Fused activity GPS points (if still no points)
      if (activity.source !== 'asciende_gps' && activity.fused_activity_id) {
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
          if (gpsData && gpsData.length >= 2) {
            setGpsPoints(gpsData.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude, altitude: p.altitude_m })));
          }
        }
      }

      setLoadingStreams(false);
    };

    loadAll();
  }, [activity, wearableDetails, wearableStreams, wearableLoading, isWearable]);

  if (!activity) return null;

  const hasMap = detailGpsPoints.length >= 2;
  const hasElevation = detailStreams?.altitude_stream && detailStreams.altitude_stream.length > 1 && detailStreams.distance_stream && detailStreams.distance_stream.length > 1;
  const hasHr = detailStreams?.heartrate_stream && detailStreams.heartrate_stream.length > 1;
  const hasPower = detailStreams?.watts_stream && detailStreams.watts_stream.length > 1;
  const hasPace = detailStreams?.time_stream && detailStreams?.distance_stream && detailStreams.time_stream.length > 3 && detailStreams.distance_stream.length > 3;
  const avgSpeed = activity.average_speed_mps > 0
    ? activity.average_speed_mps
    : (activity.duration_seconds > 0 ? activity.distance_meters / activity.duration_seconds : 0);

  const isRun = isRunLike(activity.sport_type);
  const startDate = new Date(activity.start_time);
  const splits = activity.splits_metric || activity.splits_standard || buildGpsSplits(detailStreams, isRun);
  const isMetric = true;

  const hrZones = getPassportZones(passport, 'hr');
  const powerZones = getPassportZones(passport, 'power');
  const timeStream = detailStreams?.time_stream || [];
  const gapPace = isRun ? calculateGapPace(timeStream, detailStreams?.distance_stream, detailStreams?.altitude_stream) : null;
  const intensityFactor = Number(wearableDetails?.power_metrics?.intensity_factor)
    || (activity.weighted_avg_watts && Number(passport?.ftp_watts || passport?.critical_power) ? activity.weighted_avg_watts / Number(passport.ftp_watts || passport.critical_power) : 0)
    || (activity.average_heartrate && Number(passport?.lt2_hr) ? activity.average_heartrate / Number(passport.lt2_hr) : 0)
    || (isRun && parseThresholdPace(passport?.running_threshold_pace) && avgSpeed > 0 ? avgSpeed / (1000 / parseThresholdPace(passport.running_threshold_pace)!) : 0);
  const impulse = wearableDetails?.power_metrics?.tss ?? activity.raw_data?.tss ?? activity.suffer_score;
  const zoneBasis = hasPower && powerZones.length ? 'power' : 'hr';
  const zoneData = zoneBasis === 'power'
    ? calculateZoneTimes(detailStreams?.watts_stream, timeStream, powerZones)
    : calculateZoneTimes(detailStreams?.heartrate_stream, timeStream, hrZones);
  const zoneMax = Math.max(1, ...zoneData.map(zone => zone.seconds));
  const activeMapIndex = activePointIndex == null ? null : Math.round(activePointIndex / 10000 * Math.max(0, detailGpsPoints.length - 1));
  const statCard = (label: string, value: string, color = 'text-neutral-900 dark:text-white') => <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800"><p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p><p className={`mt-1 text-lg font-bold ${color}`}>{value}</p></div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[90vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-3 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30"><ActivityIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div><div className="min-w-0"><h2 className="truncate font-bold text-neutral-900 dark:text-white">{activity.name}</h2><p className="text-xs text-neutral-500 dark:text-neutral-400">{startDate.toLocaleDateString()} · {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><SportBadge sport={activity.sport_type} source={activity.source} /></div>
          <div className="ml-3 flex shrink-0 items-center gap-2">{actions}<button onClick={onClose} className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-5 w-5 text-neutral-500" /></button></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
            <main className="min-w-0 space-y-4 xl:col-start-1 xl:row-start-1">
              {hasMap ? <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"><ActivityMapViewer gpsPoints={detailGpsPoints} activePointIndex={activeMapIndex} /></div> : <div className="flex h-[38vh] min-h-64 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">{mapError || 'No GPS track available for this activity'}</div>}
              {loadingStreams || wearableLoading ? <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" /></div> : <TelemetryGraph streams={detailStreams} distanceMeters={activity.distance_meters} onHover={setActivePointIndex} />}
              {hasElevation && <ElevationChart distanceStream={detailStreams!.distance_stream} altitudeStream={detailStreams!.altitude_stream} />}
              {hasPace && <PaceChart timeStream={detailStreams!.time_stream} distanceStream={detailStreams!.distance_stream} />}
              {hasPower && <MiniChart data={detailStreams!.watts_stream} color="#f59e0b" label="Power" unit="W" height={150} />}
            </main>
            <aside className="min-w-0 space-y-4 xl:col-start-2 xl:row-start-1">
              <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"><h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-white">{language === 'es' ? 'Métricas principales' : 'Activity summary'}</h3><div className="grid grid-cols-2 gap-2">{statCard(language === 'es' ? 'Distancia' : 'Distance', fmtDistance(activity.distance_meters))}{statCard(language === 'es' ? 'Tiempo mov.' : 'Moving time', fmtDuration(activity.duration_seconds))}{statCard(isRun ? (language === 'es' ? 'Ritmo promedio' : 'Avg pace') : (language === 'es' ? 'Velocidad prom.' : 'Avg speed'), isRun ? fmtPace(avgSpeed) : fmtSpeed(avgSpeed))}{statCard(language === 'es' ? 'Desnivel +' : 'Elevation gain', `${Math.round(activity.elevation_gain_meters || wearableDetails?.elevation_gain_m || 0)} m`)}{isRun && statCard('GAP estimado', gapPace ? `${fmtPaceFromSecPerKm(gapPace)} /km` : '—')}{isRun && statCard(language === 'es' ? 'Ritmo vs. GAP' : 'Pace vs. GAP', gapPace ? `${fmtPace(avgSpeed)} · ${fmtPaceFromSecPerKm(gapPace)}` : '—')}</div></section>
              <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"><h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-white">{language === 'es' ? 'Carga y esfuerzo' : 'Load & effort'}</h3><div className="grid grid-cols-2 gap-2">{statCard('Impulse', impulse == null ? '—' : `${Math.round(Number(impulse))} pts`, 'text-purple-600 dark:text-purple-300')}{statCard('IF', intensityFactor > 0 ? intensityFactor.toFixed(2) : '—', 'text-blue-600 dark:text-blue-300')}{statCard('VAM', activity.duration_seconds > 0 ? `${Math.round((activity.elevation_gain_meters || wearableDetails?.elevation_gain_m || 0) / (activity.duration_seconds / 3600))} m/h` : '—')}{statCard(language === 'es' ? 'Cadencia prom.' : 'Avg cadence', activity.average_cadence == null ? '—' : `${Math.round(activity.average_cadence)} spm`)}{activity.average_heartrate != null && statCard(language === 'es' ? 'FC prom. / máx.' : 'Avg / max HR', `${Math.round(activity.average_heartrate)} / ${activity.max_heartrate ?? '—'} bpm`, 'text-rose-600 dark:text-rose-300')}{activity.average_watts != null && statCard(language === 'es' ? 'Potencia prom.' : 'Avg power', `${Math.round(activity.average_watts)} W`, 'text-amber-600 dark:text-amber-300')}</div>{passport?.measurement_date && <p className="mt-2 text-[11px] text-neutral-500">{language === 'es' ? 'Pasaporte biológico' : 'Biological Passport'} · {passport.measurement_date}</p>}</section>
              <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"><h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-white">{language === 'es' ? 'Distribución por zonas' : 'Zone distribution'} {zoneData.length ? `· ${zoneBasis === 'power' ? (language === 'es' ? 'Potencia' : 'Power') : (language === 'es' ? 'FC' : 'HR')}` : ''}</h3>{zoneData.length ? <div className="space-y-2">{zoneData.map(zone => <div key={zone.zone}><div className="mb-1 flex justify-between text-xs"><span>{zone.name} <span className="text-neutral-400">{Math.round(zone.min)}–{Math.round(zone.max)}</span></span><span>{zone.percent.toFixed(0)}% · {fmtDuration(zone.seconds)}</span></div><div className="h-2 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-700"><div className="h-full rounded bg-blue-500" style={{ width: `${zone.seconds / zoneMax * 100}%` }} /></div></div>)}</div> : <p className="text-xs text-neutral-500">{language === 'es' ? 'Sin series o zonas configuradas en el Pasaporte Biológico.' : 'No telemetry or Biological Passport zones available.'}</p>}</section>
              {hasHr && <MiniChart data={detailStreams!.heartrate_stream} color="#f43f5e" label={language === 'es' ? 'Frecuencia cardíaca' : 'Heart rate'} unit="bpm" height={130} />}
              {splits?.length ? <SplitsTable splits={splits} isMetric={isMetric} /> : <PaceAnalysis splits={splits} isMetric={isMetric} />}
              {splits?.length && <PaceAnalysis splits={splits} isMetric={isMetric} />}
              {activity.calories != null && <p className="px-1 text-xs text-neutral-500">{Math.round(activity.calories)} kcal{activity.device_name ? ` · ${activity.device_name}` : ''}</p>}
              {activity.fused_activity_id && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{language === 'es' ? 'Actividad GPS vinculada con esta actividad importada.' : 'This imported activity is matched with an Asciende GPS recording.'}</p>}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
