import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { X, Activity as ActivityIcon, Check } from 'lucide-react';
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
  onBack?: () => void;
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

function buildGpsSplits(streams: ActivityStream | null): any[] | null {
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

function splitTelemetry(streams: ActivityStream | null, startDistance: number, endDistance: number, zones: ZoneMap) {
  const times = streams?.time_stream, distances = streams?.distance_stream;
  if (!times || !distances || times.length < 2 || distances.length < 2) return null;
  let start = 0;
  while (start < distances.length - 1 && distances[start] < startDistance) start++;
  let end = start;
  while (end < distances.length - 1 && distances[end] < endDistance) end++;
  const range = (values?: number[] | null) => values ? values.slice(start, end + 1).filter(value => Number.isFinite(value)) : [];
  const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const max = (values: number[]) => values.length ? Math.max(...values) : null;
  const zoneSeconds = (values: number[] | null | undefined, zoneRows: any[]) => {
    const totals = new Map(zoneRows.map(zone => [zone.zone, 0]));
    if (values) for (let i = start; i < end && i < values.length - 1; i++) {
      const delta = times[i + 1] - times[i], value = values[i];
      if (delta <= 0 || delta > 30 || !Number.isFinite(value)) continue;
      const zone = zoneRows.find(row => value >= row.min && value <= row.max);
      if (zone) totals.set(zone.zone, (totals.get(zone.zone) || 0) + delta);
    }
    return zoneRows.map(zone => ({ ...zone, seconds: totals.get(zone.zone) || 0 })).filter(zone => zone.seconds > 0);
  };
  const heartrate = range(streams.heartrate_stream), power = range(streams.watts_stream), cadence = range(streams.cadence_stream);
  const heartZones = zoneSeconds(streams.heartrate_stream, zones.hr);
  const powerZones = zoneSeconds(streams.watts_stream, zones.power);
  const paceValues = times.slice(start, end + 1).map((_, offset) => {
    const index = start + offset;
    const speed = streams.velocity_smooth_stream?.[index] ?? (index > 0 && times[index] > times[index - 1] ? (distances[index] - distances[index - 1]) / (times[index] - times[index - 1]) : 0);
    return speed > 0 ? 1000 / speed : null;
  });
  const paceZones = zoneSeconds(paceValues as number[], zones.pace);
  return { avgHr: avg(heartrate), maxHr: max(heartrate), avgPower: avg(power), maxPower: max(power), avgCadence: avg(cadence), heartZones, powerZones, paceZones };
}

function zoneTimeLabel(zones: any[], metric: string) {
  const label = metric === 'hr' ? 'FC' : metric === 'pace' ? 'Pace' : 'W';
  return zones.length ? `${label}: ${zones.map(zone => `Z${zone.zone} ${fmtDuration(zone.seconds)}`).join(' · ')}` : '';
}

function SplitsTable({ splits, isMetric, streams, zones, language }: { splits: any[] | null; isMetric: boolean; streams: ActivityStream | null; zones: ZoneMap; language: 'en' | 'es' }) {
  if (!splits || splits.length === 0) return null;
  const unit = isMetric ? 'km' : 'mi';
  const distFactor = isMetric ? 1000 : 1609.344;
  const labels = language === 'es'
    ? { splits: 'Parciales', dist: 'Dist.', time: 'Tiempo', pace: 'Ritmo', elev: 'Desnivel', avgHr: 'FC prom.', maxHr: 'FC máx.', avgP: 'W prom.', maxP: 'W máx.', cad: 'Cadencia', zones: 'Tiempo en zonas' }
    : { splits: 'Splits', dist: 'Dist.', time: 'Time', pace: 'Pace', elev: 'Elevation', avgHr: 'Avg HR', maxHr: 'Max HR', avgP: 'Avg W', maxP: 'Max W', cad: 'Cadence', zones: 'Time in zones' };
  const telemetryAvailable = !!streams?.distance_stream?.length;
  const hasHr = telemetryAvailable || splits.some((split: any) => split.average_heartrate != null);
  const hasPower = telemetryAvailable && !!streams?.watts_stream?.length || splits.some((split: any) => split.average_watts != null || split.max_watts != null);
  const hasCadence = telemetryAvailable && !!streams?.cadence_stream?.length || splits.some((split: any) => split.average_cadence != null);
  const hasZones = zones.hr.length > 0 || zones.pace.length > 0 || zones.power.length > 0;
  let cumulativeDistance = 0;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
      <div className="mb-3 flex items-center justify-between gap-2"><h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{labels.splits} ({unit})</h4><span className="text-[10px] text-neutral-400">{language === 'es' ? 'Datos disponibles · zonas del Pasaporte · Impulse' : 'Available data · Passport zones · Impulse'}</span></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-xs">
          <thead><tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"><th className="px-2 py-2 text-left">#</th><th className="px-2 py-2 text-right">{labels.dist}</th><th className="px-2 py-2 text-right">{labels.time}</th><th className="px-2 py-2 text-right">{labels.pace}</th><th className="px-2 py-2 text-right">{labels.elev}</th>{hasHr && <><th className="px-2 py-2 text-right">{labels.avgHr}</th><th className="px-2 py-2 text-right">{labels.maxHr}</th></>}{hasPower && <><th className="px-2 py-2 text-right">{labels.avgP}</th><th className="px-2 py-2 text-right">{labels.maxP}</th></>}{hasCadence && <th className="px-2 py-2 text-right">{labels.cad}</th>}{hasZones && <th className="px-2 py-2 text-left">{labels.zones}</th>}<th className="px-2 py-2 text-right">Impulse</th></tr></thead>
          <tbody>
            {splits.map((split: any, i: number) => {
              const dist = split.distance / distFactor;
              const movingTime = split.moving_time ?? split.elapsed_time ?? 0;
              const paceSecPerKm = movingTime > 0 && dist > 0 ? movingTime / dist : 0;
              const elevDiff = split.elevation_difference ?? 0;
              const startDistance = cumulativeDistance;
              cumulativeDistance += Number(split.distance || 0);
              const metrics = splitTelemetry(streams, startDistance, cumulativeDistance, zones);
              const isFastest = i === splits.reduce((bestIdx: number, s: any, idx: number) => {
                const sPace = (s.moving_time ?? s.elapsed_time ?? 0) / (s.distance / distFactor);
                return sPace < (splits[bestIdx].moving_time ?? splits[bestIdx].elapsed_time ?? 0) / (splits[bestIdx].distance / distFactor) ? idx : bestIdx;
              }, 0);

              const zoneSummary = [zoneTimeLabel(metrics?.heartZones || [], 'hr'), zoneTimeLabel(metrics?.paceZones || [], 'pace'), zoneTimeLabel(metrics?.powerZones || [], 'power')].filter(Boolean).join(' | ');
              const primaryZones = metrics?.heartZones.length ? metrics.heartZones : metrics?.powerZones || metrics?.paceZones || [];
              const maxZone = Math.max(1, ...primaryZones.map(zone => zone.zone));
              const estimatedSplitImpulse = primaryZones.reduce((sum, zone) => sum + zone.seconds / 60 * zone.zone / maxZone, 0);
              const splitImpulse = Number(split.actual_impulse ?? split.impulse);
              const impulseValue = Number.isFinite(splitImpulse) && splitImpulse > 0 ? splitImpulse : estimatedSplitImpulse;
              return <tr key={i} className="border-b border-neutral-100 dark:border-neutral-700/50"><td className="px-2 py-2 text-neutral-500 dark:text-neutral-400">{i + 1}</td><td className="px-2 py-2 text-right font-medium text-neutral-900 dark:text-white">{dist.toFixed(2)}</td><td className="px-2 py-2 text-right text-neutral-700 dark:text-neutral-300">{fmtDuration(movingTime)}</td><td className={`px-2 py-2 text-right font-medium ${isFastest ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>{fmtPaceFromSecPerKm(paceSecPerKm)}</td><td className={`px-2 py-2 text-right ${elevDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : elevDiff < 0 ? 'text-red-500' : 'text-neutral-500'}`}>{elevDiff > 0 ? '+' : ''}{Math.round(elevDiff)}m</td>{hasHr && <><td className="px-2 py-2 text-right text-rose-600 dark:text-rose-400">{Math.round(Number(split.average_heartrate ?? metrics?.avgHr ?? 0)) || '—'}</td><td className="px-2 py-2 text-right text-rose-600 dark:text-rose-400">{Math.round(Number(split.max_heartrate ?? metrics?.maxHr ?? 0)) || '—'}</td></>}{hasPower && <><td className="px-2 py-2 text-right text-amber-600 dark:text-amber-400">{Math.round(Number(split.average_watts ?? metrics?.avgPower ?? 0)) || '—'}</td><td className="px-2 py-2 text-right text-amber-600 dark:text-amber-400">{Math.round(Number(split.max_watts ?? metrics?.maxPower ?? 0)) || '—'}</td></>}{hasCadence && <td className="px-2 py-2 text-right">{Math.round(Number(split.average_cadence ?? metrics?.avgCadence ?? 0)) || '—'}</td>}{hasZones && <td className="max-w-[440px] px-2 py-2 text-[10px] text-neutral-500">{zoneSummary || '—'}</td>}<td className="px-2 py-2 text-right font-semibold text-purple-600 dark:text-purple-300">{impulseValue > 0 ? impulseValue.toFixed(1) : '—'}</td></tr>;
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
            <Tooltip formatter={(value) => [`${fmtPaceFromSecPerKm(Number(value))} /km`, 'Pace']} labelFormatter={(value) => `Split ${value}`} />
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

type ZoneMap = { hr: any[]; pace: any[]; power: any[] };
type ChartMetric = 'pace' | 'hr' | 'elevation' | 'power' | 'cadence';
const METRIC_META: Record<ChartMetric, { color: string; label: { en: string; es: string }; unit: string }> = {
  pace: { color: '#8b5cf6', label: { en: 'Pace', es: 'Ritmo' }, unit: '/km' },
  hr: { color: '#f43f5e', label: { en: 'Heart rate', es: 'Frecuencia cardíaca' }, unit: 'bpm' },
  elevation: { color: '#10b981', label: { en: 'Elevation', es: 'Elevación' }, unit: 'm' },
  power: { color: '#f59e0b', label: { en: 'Power', es: 'Potencia' }, unit: 'W' },
  cadence: { color: '#0ea5e9', label: { en: 'Cadence', es: 'Cadencia' }, unit: 'rpm' },
};
const ZONE_COLORS = ['#60a5fa', '#34d399', '#facc15', '#fb923c', '#f87171', '#c084fc', '#f472b6'];

function zoneLabel(zone: any) {
  return zone.name || `Z${zone.zone}`;
}

function providerZoneTimes(value: unknown) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const source = (value as any).zones7 || (value as any).zones5 || value;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
  const rows = Object.entries(source as Record<string, any>).flatMap(([key, raw], index) => {
    const match = key.match(/(?:zone|z)[_-]?(\d+)/i);
    const seconds = Number(typeof raw === 'object' && raw !== null ? raw.seconds ?? raw.time_seconds ?? raw.duration_seconds : raw);
    const zone = Number(match?.[1] ?? index + 1);
    if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(zone)) return [];
    return [{ zone, name: `Z${zone}`, min: Number.NaN, max: Number.NaN, seconds, percent: 0 }];
  }).sort((a, b) => a.zone - b.zone);
  const total = rows.reduce((sum, row) => sum + row.seconds, 0);
  return rows.map(row => ({ ...row, percent: total ? row.seconds / total * 100 : 0 }));
}

function ZoneTimePanel({ zoneTimes, language }: { zoneTimes: ZoneMap; language: 'en' | 'es' }) {
  const options = [
    { key: 'hr' as const, title: language === 'es' ? 'Frecuencia cardíaca' : 'Heart rate' },
    { key: 'pace' as const, title: language === 'es' ? 'Ritmo' : 'Pace' },
    { key: 'power' as const, title: language === 'es' ? 'Potencia' : 'Power' },
  ].filter(option => zoneTimes[option.key].length > 0);
  const [active, setActive] = useState<'hr' | 'pace' | 'power'>(options[0]?.key || 'hr');
  const selected = zoneTimes[active];
  const total = selected.reduce((sum, zone) => sum + zone.seconds, 0);
  if (!options.length) return null;
  return <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{language === 'es' ? 'Tiempo en zonas' : 'Time in zones'}</h3><p className="mt-0.5 text-[11px] text-neutral-500">{language === 'es' ? 'Zonas personales del Pasaporte Biológico' : 'Personal zones from the Biological Passport'}</p></div><div className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900">{options.map(option => <button key={option.key} onClick={() => setActive(option.key)} className={`rounded-md px-2 py-1 text-[11px] font-medium ${active === option.key ? 'bg-white text-neutral-900 shadow dark:bg-neutral-700 dark:text-white' : 'text-neutral-500'}`}>{option.title}</button>)}</div></div>
    <div className="space-y-2">{selected.map((zone, index) => { const range = Number.isFinite(zone.min) && Number.isFinite(zone.max) && zone.max > zone.min ? (active === 'pace' ? `${fmtPaceFromSecPerKm(zone.min)}–${fmtPaceFromSecPerKm(zone.max)} /km` : `${Math.round(zone.min)}–${Math.round(zone.max)} ${active === 'hr' ? 'bpm' : 'W'}`) : ''; return <div key={`${active}-${zone.zone}`}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="font-medium text-neutral-700 dark:text-neutral-200">{zoneLabel(zone)} {range && <span className="font-normal text-neutral-400">{range}</span>}</span><span className="shrink-0 text-neutral-500">{fmtDuration(zone.seconds)} · {zone.percent.toFixed(0)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700"><div className="h-full rounded-full" style={{ width: `${total ? zone.seconds / total * 100 : 0}%`, background: ZONE_COLORS[index % ZONE_COLORS.length] }} /></div></div>; })}</div>
  </section>;
}

function TelemetryGraph({ streams, distanceMeters, language, onHover }: { streams: ActivityStream | null; distanceMeters: number; language: 'en' | 'es'; onHover: (index: number | null) => void }) {
  const available = useMemo(() => {
    const metrics: ChartMetric[] = [];
    if (streams?.velocity_smooth_stream?.length || (streams?.time_stream?.length && streams?.distance_stream?.length)) metrics.push('pace');
    if (streams?.heartrate_stream?.length) metrics.push('hr');
    if (streams?.altitude_stream?.length) metrics.push('elevation');
    if (streams?.watts_stream?.length) metrics.push('power');
    if (streams?.cadence_stream?.length) metrics.push('cadence');
    return metrics;
  }, [streams]);
  const [visible, setVisible] = useState<ChartMetric[]>([]);
  const [axisMode, setAxisMode] = useState<'time' | 'distance'>('time');
  const [hoveredSample, setHoveredSample] = useState<number | null>(null);
  useEffect(() => { setVisible(available); }, [available]);
  if (!streams?.time_stream?.length || !available.length) return null;

  const times = streams.time_stream;
  const length = times.length;
  const step = Math.max(1, Math.floor(length / 900));
  const indices = Array.from({ length: Math.ceil(length / step) }, (_, i) => Math.min(i * step, length - 1));
  const canUseDistance = !!streams.distance_stream?.length;
  const width = 1000;
  const height = 280, plotTop = 28, plotBottom = 235, plotLeft = 58, plotRight = 944;
  const plotHeight = plotBottom - plotTop, plotWidth = plotRight - plotLeft;
  const pace = (index: number) => {
    const speed = streams.velocity_smooth_stream?.[index] ?? ((index > 0 && streams.distance_stream && times[index] > times[index - 1]) ? (streams.distance_stream[index] - streams.distance_stream[index - 1]) / (times[index] - times[index - 1]) : 0);
    return speed > 0 ? 1000 / speed : null;
  };
  const xRaw = (index: number) => axisMode === 'distance' && canUseDistance ? Number(streams.distance_stream?.[index] || 0) : Number(times[index] || 0);
  const xMin = xRaw(indices[0] || 0), xMax = xRaw(indices[indices.length - 1] || length - 1);
  const xForSample = (index: number) => plotLeft + (xRaw(index) - xMin) / (xMax - xMin || 1) * plotWidth;
  const makeValues = (metric: ChartMetric) => indices.map(index => metric === 'pace' ? pace(index) : metric === 'hr' ? streams.heartrate_stream?.[index] ?? null : metric === 'elevation' ? streams.altitude_stream?.[index] ?? null : metric === 'power' ? streams.watts_stream?.[index] ?? null : streams.cadence_stream?.[index] ?? null).map(value => value != null && Number.isFinite(value) ? Number(value) : null);
  const series = visible.map(metric => ({ metric, ...METRIC_META[metric], values: makeValues(metric) }))
    .filter(item => item.values.some(value => value != null))
    .map(item => {
      const values = item.values.filter((value): value is number => value != null && Number.isFinite(value));
      return { ...item, min: Math.min(...values), max: Math.max(...values) };
    });
  const paceSeries = series.find(item => item.metric === 'pace');
  const elevationSeries = series.find(item => item.metric === 'elevation');
  const drawSeries = [...series.filter(item => item.metric === 'elevation'), ...series.filter(item => item.metric !== 'elevation')];
  const yFor = (metric: ChartMetric, value: number, min: number, max: number) => {
    const ratio = (value - min) / (max - min || 1);
    return metric === 'pace' ? plotTop + ratio * plotHeight : plotBottom - ratio * plotHeight;
  };
  const pathFor = (item: typeof series[number]) => {
    const points = item.values.map((value, index) => value == null ? null : [xForSample(indices[index] || 0), yFor(item.metric, value, item.min, item.max)] as const);
    const valid = points.filter((point): point is readonly [number, number] => point !== null);
    if (!valid.length) return '';
    const line = valid.map(([x, y], index) => `${index ? 'L' : 'M'}${x},${y}`).join(' ');
    return item.metric === 'elevation' ? `${line} L${valid[valid.length - 1][0]},${plotBottom} L${valid[0][0]},${plotBottom} Z` : line;
  };
  const setMetric = (metric: ChartMetric) => setVisible(current => current.includes(metric) ? current.filter(item => item !== metric) : [...available.filter(item => current.includes(item) || item === metric)]);
  const xStart = axisMode === 'distance' && canUseDistance ? `${((streams.distance_stream![0] || 0) / 1000).toFixed(1)} km` : '0:00';
  const xEnd = axisMode === 'distance' && canUseDistance ? `${((streams.distance_stream![length - 1] || distanceMeters) / 1000).toFixed(1)} km` : fmtDuration(times[length - 1] || 0);
  return <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{language === 'es' ? 'Telemetría sincronizada' : 'Synchronized telemetry'}</h3><p className="mt-0.5 text-[11px] text-neutral-500">{language === 'es' ? 'Elige qué métricas comparar; el cursor sigue el recorrido del mapa.' : 'Choose which metrics to compare; the cursor follows the route on the map.'}</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900"><button type="button" onClick={() => setAxisMode('time')} className={`rounded-md px-2 py-1 text-[11px] ${axisMode === 'time' ? 'bg-white font-semibold text-neutral-900 shadow dark:bg-neutral-700 dark:text-white' : 'text-neutral-500'}`}>{language === 'es' ? 'Tiempo' : 'Time'}</button><button type="button" disabled={!canUseDistance} onClick={() => setAxisMode('distance')} className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${axisMode === 'distance' ? 'bg-white font-semibold text-neutral-900 shadow dark:bg-neutral-700 dark:text-white' : 'text-neutral-500'}`}>{language === 'es' ? 'Distancia' : 'Distance'}</button></div><div className="flex flex-wrap gap-1.5">{available.map(metric => { const active = visible.includes(metric); const meta = METRIC_META[metric]; return <button type="button" key={metric} aria-pressed={active} onClick={() => setMetric(metric)} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${active ? 'border-transparent text-white' : 'border-neutral-200 text-neutral-500 dark:border-neutral-600'}`} style={active ? { backgroundColor: meta.color } : undefined}>{active && <Check className="h-3 w-3" />}{meta.label[language]}</button>; })}</div></div></div>
    {series.length ? <>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full touch-none" onPointerLeave={() => { onHover(null); setHoveredSample(null); }} onPointerMove={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointerX = Math.max(plotLeft, Math.min(plotRight, (event.clientX - rect.left) / rect.width * width));
      const ratio = (pointerX - plotLeft) / plotWidth;
      const targetX = pointerX;
      const sampleIndex = indices.reduce((best, candidate) => Math.abs(xForSample(candidate) - targetX) < Math.abs(xForSample(best) - targetX) ? candidate : best, indices[0] || 0);
      setHoveredSample(sampleIndex);
      onHover(distanceMeters > 0 && streams.distance_stream?.length ? Math.round(sampleIndex / (streams.distance_stream.length - 1) * 10000) : Math.round(sampleIndex / (length - 1) * 10000));
    }}>
      <rect x={plotLeft} y={plotTop} width={plotWidth} height={plotHeight} fill="#f8fafc" className="dark:fill-neutral-900" />
      {[0, 0.25, 0.5, 0.75, 1].map(fraction => { const y = plotTop + fraction * plotHeight; return <g key={fraction}><line x1={plotLeft} x2={plotRight} y1={y} y2={y} stroke="#94a3b8" strokeOpacity=".3" />{paceSeries && <text x={plotLeft - 7} y={y + 3} textAnchor="end" fontSize="10" fill={paceSeries.color}>{metricValueLabel('pace', paceSeries.min + fraction * (paceSeries.max - paceSeries.min))}</text>}{elevationSeries && <text x={plotRight + 7} y={y + 3} fontSize="10" fill="#57534e">{Math.round(elevationSeries.max - fraction * (elevationSeries.max - elevationSeries.min))}m</text>}</g>; })}
      {drawSeries.map(item => <path key={item.metric} d={pathFor(item)} fill={item.metric === 'elevation' ? '#78716c' : 'none'} fillOpacity={item.metric === 'elevation' ? 0.42 : 0} stroke={item.metric === 'elevation' ? '#57534e' : item.color} strokeWidth={item.metric === 'elevation' ? 1.5 : 2.2} strokeLinejoin="round" strokeLinecap="round" />)}
      {hoveredSample != null && <g><line x1={xForSample(hoveredSample)} x2={xForSample(hoveredSample)} y1={plotTop} y2={plotBottom} stroke="#334155" strokeDasharray="4 4" strokeWidth="1.5" />{series.map(item => { const index = indices.indexOf(hoveredSample), value = item.values[index]; return value == null ? null : <circle key={item.metric} cx={xForSample(hoveredSample)} cy={yFor(item.metric, value, item.min, item.max)} r="4" fill={item.metric === 'elevation' ? '#57534e' : item.color} stroke="white" strokeWidth="1.5" />; })}</g>}
      <line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} stroke="#64748b" strokeOpacity=".5" />
      <text x={plotLeft} y={height - 9} fontSize="10" fill="#64748b">{xStart}</text><text x={plotRight} y={height - 9} textAnchor="end" fontSize="10" fill="#64748b">{xEnd}</text>
    </svg>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{series.map(item => <span key={item.metric} className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.metric === 'elevation' ? '#78716c' : item.color }} />{item.label[language]}: {metricValueLabel(item.metric, item.min)}–{metricValueLabel(item.metric, item.max)} {item.unit}</span>)}</div>
      </> : <p className="py-8 text-center text-sm text-neutral-500">{language === 'es' ? 'Elige al menos una métrica disponible.' : 'Select at least one available metric.'}</p>}
  </section>;
}

function metricValueLabel(metric: ChartMetric, value: number) {
  if (metric === 'pace') return fmtPaceFromSecPerKm(value);
  return Math.round(value).toString();
}

function PeakProfileChart({ title, unit, data, color, pace = false }: { title: string; unit: string; data: Array<{ label: string; value: number }>; color: string; pace?: boolean }) {
  if (data.length < 2) return null;
  return <section className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800"><h4 className="mb-2 text-center text-xs font-semibold text-neutral-700 dark:text-neutral-200">{title}</h4><div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}><defs><linearGradient id={`fill-${title.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.58} /><stop offset="100%" stopColor={color} stopOpacity={0.08} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} /><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis reversed={pace} width={48} tick={{ fontSize: 9 }} tickFormatter={value => pace ? fmtPaceFromSecPerKm(value) : `${Math.round(value)}`} domain={pace ? ['dataMin - 10', 'dataMax + 10'] : ['auto', 'auto']} /><Tooltip formatter={(value) => [pace ? `${fmtPaceFromSecPerKm(Number(value))} /km` : `${Math.round(Number(value))} ${unit}`, title]} /><Area type="monotone" dataKey="value" stroke={color} fill={`url(#fill-${title.replace(/\W/g, '')})`} strokeWidth={2} /></AreaChart></ResponsiveContainer></div></section>;
}

function calculatePeakProfile(values: Array<number | null> | null | undefined, times: number[] | null | undefined, windows: number[]) {
  if (!values || !times || values.length < 2 || times.length < 2) return [];
  const length = Math.min(values.length, times.length);
  const sums = new Array(length + 1).fill(0), counts = new Array(length + 1).fill(0);
  for (let i = 0; i < length; i++) {
    const present = values[i] != null && Number.isFinite(values[i]);
    sums[i + 1] = sums[i] + (present ? Number(values[i]) : 0);
    counts[i + 1] = counts[i] + (present ? 1 : 0);
  }
  return windows.map(window => {
    let start = 0, best = 0;
    for (let end = 1; end < length; end++) {
      while (start < end && times[end] - times[start] > window) start++;
      if (times[end] - times[start] < window * 0.8) continue;
      const sum = sums[end + 1] - sums[start], count = counts[end + 1] - counts[start];
      if (count) best = Math.max(best, sum / count);
    }
    return best > 0 ? { window, value: best } : null;
  }).filter((row): row is { window: number; value: number } => row !== null);
}

function PeakAnalysis({ streams, language }: { streams: ActivityStream | null; language: 'en' | 'es' }) {
  const time = useMemo(() => streams?.time_stream || [], [streams]);
  const pace = useMemo(() => {
    if (!streams?.distance_stream || time.length < 2) return [];
    return time.map((_, i) => {
      if (!i || streams.distance_stream![i] == null || streams.distance_stream![i - 1] == null || time[i] <= time[i - 1]) return null;
      const speed = (streams.distance_stream![i] - streams.distance_stream![i - 1]) / (time[i] - time[i - 1]);
      return speed > 0 ? speed : null;
    });
  }, [streams, time]);
  const durationWindows = [5, 20, 60, 120, 300, 600, 1200, 1800, 3600, 7200];
  const labelDuration = (seconds: number) => seconds < 60 ? `${seconds}s` : seconds < 3600 ? `${seconds / 60}min` : `${seconds / 3600}h`;
  const paceProfile = calculatePeakProfile(pace, time, durationWindows).filter(point => point.value > 0).map(point => ({ label: labelDuration(point.window), value: 1000 / point.value }));
  const hrProfile = calculatePeakProfile(streams?.heartrate_stream, time, durationWindows).map(point => ({ label: labelDuration(point.window), value: point.value }));
  const cadenceProfile = calculatePeakProfile(streams?.cadence_stream, time, durationWindows).map(point => ({ label: labelDuration(point.window), value: point.value }));
  const paceDistanceProfile = useMemo(() => {
    const distances = streams?.distance_stream;
    if (!distances || !time.length) return [];
    const targets = [400, 800, 1000, 1600, 3000, 5000, 10000, 21097, 42195];
    return targets.flatMap(target => {
      let start = 0, fastest = Infinity;
      for (let end = 1; end < distances.length && end < time.length; end++) {
        while (start < end && distances[end] - distances[start] > target) start++;
        const covered = distances[end] - distances[start];
        const elapsed = time[end] - time[start];
        if (covered >= target * 0.98 && elapsed > 0) fastest = Math.min(fastest, elapsed / (covered / 1000));
      }
      return Number.isFinite(fastest) ? [{ label: target >= 1000 ? `${target / 1000}km` : `${target}m`, value: fastest }] : [];
    });
  }, [streams, time]);
  if (!paceProfile.length && !hrProfile.length && !cadenceProfile.length && !paceDistanceProfile.length) return null;
  const es = language === 'es';
  return <section className="space-y-3"><div><h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{es ? 'Récords de la actividad' : 'Activity peak profiles'}</h3><p className="mt-0.5 text-[11px] text-neutral-500">{es ? 'Mejor promedio sostenido por duración y distancia.' : 'Best sustained average by duration and distance.'}</p></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{paceProfile.length > 1 && <PeakProfileChart title={es ? 'Ritmo máximo por duración' : 'Peak pace by duration'} unit="/km" data={paceProfile} color="#4f7fa3" pace />}{paceDistanceProfile.length > 1 && <PeakProfileChart title={es ? 'Ritmo máximo por distancia' : 'Peak pace by distance'} unit="/km" data={paceDistanceProfile} color="#4f7fa3" pace />}{hrProfile.length > 1 && <PeakProfileChart title={es ? 'Frecuencia cardíaca máxima' : 'Peak heart rate'} unit="bpm" data={hrProfile} color="#d46e62" />}{cadenceProfile.length > 1 && <PeakProfileChart title={es ? 'Cadencia máxima' : 'Peak cadence'} unit="rpm" data={cadenceProfile} color="#f4b449" />}</div></section>;
}

export function ActivityDetailModal({ activity, onClose, onBack, athleteId, wearableDetails, wearableLoading = false, isWearable = false, actions, language: languageProp }: Props) {
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
    const anchor = hr.length ? hr : power.length ? power : altitude.length ? altitude : speed.length ? speed : cadence.length ? cadence : distance;
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
      .select('ftp_watts, critical_power, lt1_power, lt2_power, lt1_hr, lt2_hr, running_threshold_pace, hr_zones_json, power_zones_json, training_zones, lab_payload, measurement_date')
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
      const { data: rawStreamData } = await supabase
        .from('activity_streams')
        .select('*')
        .eq('activity_id', activity.id)
        .maybeSingle();
      const streamData = rawStreamData as any;

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
        const { data: rawFusedActivity } = await supabase
          .from('external_activities')
          .select('id, raw_data')
          .eq('id', activity.fused_activity_id)
          .maybeSingle();
        const fusedActivity = rawFusedActivity as any;

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
  const avgSpeed = activity.average_speed_mps > 0
    ? activity.average_speed_mps
    : (activity.duration_seconds > 0 ? activity.distance_meters / activity.duration_seconds : 0);

  const isRun = isRunLike(activity.sport_type);
  const startDate = new Date(activity.start_time);
  const splits = activity.splits_metric || activity.splits_standard || buildGpsSplits(detailStreams);
  const isMetric = true;

  const hrZones = getPassportZones(passport, 'hr');
  const powerZones = getPassportZones(passport, 'power');
  const paceZones = getPassportZones(passport, 'pace');
  const thresholdPace = parseThresholdPace(passport?.running_threshold_pace);
  const thresholdPower = Number(passport?.ftp_watts || passport?.critical_power || 0);
  const thresholdHr = Number(passport?.lt2_hr || 0);
  const averageHr = activity.average_heartrate ?? wearableDetails?.average_heartrate ?? wearableDetails?.avg_hr ?? null;
  const averagePower = activity.average_watts ?? wearableDetails?.average_watts ?? wearableDetails?.avg_power ?? null;
  const timeStream = detailStreams?.time_stream || [];
  const paceStream = detailStreams?.velocity_smooth_stream?.map(speed => speed > 0 ? 1000 / speed : null)
    || (detailStreams?.distance_stream && timeStream.length ? timeStream.map((time, index) => index > 0 && time > timeStream[index - 1] ? 1000 * (time - timeStream[index - 1]) / (detailStreams.distance_stream![index] - detailStreams.distance_stream![index - 1]) : null) : null);
  const calculatedHrZones = calculateZoneTimes(detailStreams?.heartrate_stream, timeStream, hrZones);
  const calculatedPaceZones = calculateZoneTimes(paceStream, timeStream, paceZones);
  const calculatedPowerZones = calculateZoneTimes(detailStreams?.watts_stream, timeStream, powerZones);
  const storedZones = activity.time_in_zones || {};
  const zoneTimes: ZoneMap = {
    hr: calculatedHrZones.length ? calculatedHrZones : providerZoneTimes(wearableDetails?.hr_zone_seconds ?? storedZones.hr ?? storedZones.heart_rate),
    pace: calculatedPaceZones.length ? calculatedPaceZones : providerZoneTimes(storedZones.pace),
    power: calculatedPowerZones.length ? calculatedPowerZones : providerZoneTimes(wearableDetails?.power_zone_seconds ?? storedZones.power ?? storedZones.watts),
  };
  const gapPace = isRun ? calculateGapPace(timeStream, detailStreams?.distance_stream, detailStreams?.altitude_stream) : null;
  const intensityFactor = Number(wearableDetails?.power_metrics?.intensity_factor)
    || ((activity.weighted_avg_watts || averagePower) && thresholdPower ? Number(activity.weighted_avg_watts || averagePower) / thresholdPower : 0)
    || (averageHr && thresholdHr ? Number(averageHr) / thresholdHr : 0)
    || (isRun && thresholdPace && avgSpeed > 0 ? avgSpeed / (1000 / thresholdPace) : 0);
  const explicitImpulse = wearableDetails?.session_impulse ?? wearableDetails?.impulse ?? wearableDetails?.load_metrics?.impulse ?? wearableDetails?.activity_metrics?.impulse
    ?? activity.raw_data?.actual_impulse ?? activity.raw_data?.session_impulse ?? activity.raw_data?.impulse ?? activity.raw_data?.asciende_impulse ?? activity.raw_data?.training_impulse;
  const impulseZones = zoneTimes.hr.length ? zoneTimes.hr : zoneTimes.power.length ? zoneTimes.power : zoneTimes.pace;
  const impulseZoneMax = Math.max(1, ...impulseZones.map(zone => zone.zone));
  const estimatedImpulse = impulseZones.length ? impulseZones.reduce((sum, zone) => sum + zone.seconds / 60 * zone.zone / impulseZoneMax, 0) : null;
  const impulse = Number.isFinite(Number(explicitImpulse)) && explicitImpulse != null ? Number(explicitImpulse) : estimatedImpulse;
  const impulseIsEstimate = explicitImpulse == null && estimatedImpulse != null;
  const activeMapIndex = activePointIndex == null ? null : Math.round(activePointIndex / 10000 * Math.max(0, detailGpsPoints.length - 1));
  const statCard = (label: string, value: string, color = 'text-neutral-900 dark:text-white') => <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800"><p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p><p className={`mt-1 text-lg font-bold ${color}`}>{value}</p></div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[90vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-3 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30"><ActivityIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div><div className="min-w-0"><h2 className="truncate font-bold text-neutral-900 dark:text-white">{activity.name}</h2><p className="text-xs text-neutral-500 dark:text-neutral-400">{startDate.toLocaleDateString()} · {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><SportBadge sport={activity.sport_type} source={activity.source} /></div>
          <div className="ml-3 flex shrink-0 items-center gap-2">{onBack && <button onClick={onBack} className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30">{language === 'es' ? 'Resumen' : 'Summary'}</button>}{actions}<button onClick={onClose} className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-5 w-5 text-neutral-500" /></button></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
            <main className="min-w-0 space-y-4 xl:col-start-1 xl:row-start-1">
              {hasMap ? <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"><ActivityMapViewer gpsPoints={detailGpsPoints} activePointIndex={activeMapIndex} /></div> : <div className="flex h-[38vh] min-h-64 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">{mapError || 'No GPS track available for this activity'}</div>}
              {loadingStreams || wearableLoading ? <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" /></div> : <TelemetryGraph streams={detailStreams} distanceMeters={activity.distance_meters} language={language} onHover={setActivePointIndex} />}
              {!loadingStreams && !wearableLoading && <ZoneTimePanel zoneTimes={zoneTimes} language={language} />}
              {!loadingStreams && !wearableLoading && <PeakAnalysis streams={detailStreams} language={language} />}
              {splits?.length ? <SplitsTable splits={splits} isMetric={isMetric} streams={detailStreams} zones={zoneTimes} language={language} /> : <PaceAnalysis splits={splits} isMetric={isMetric} />}
              {splits?.length && <PaceAnalysis splits={splits} isMetric={isMetric} />}
            </main>
            <aside className="min-w-0 space-y-4 xl:col-start-2 xl:row-start-1">
              <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"><h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-white">{language === 'es' ? 'Métricas principales' : 'Activity summary'}</h3><div className="grid grid-cols-2 gap-2">{statCard(language === 'es' ? 'Distancia' : 'Distance', fmtDistance(activity.distance_meters))}{statCard(language === 'es' ? 'Tiempo mov.' : 'Moving time', fmtDuration(activity.duration_seconds))}{statCard(isRun ? (language === 'es' ? 'Ritmo promedio' : 'Avg pace') : (language === 'es' ? 'Velocidad prom.' : 'Avg speed'), isRun ? fmtPace(avgSpeed) : fmtSpeed(avgSpeed))}{isRun && thresholdPace && statCard(language === 'es' ? 'Ritmo / umbral' : 'Pace / threshold', `${fmtPace(avgSpeed)} / ${fmtPaceFromSecPerKm(thresholdPace)}`)}{statCard(language === 'es' ? 'Desnivel +' : 'Elevation gain', `${Math.round(activity.elevation_gain_meters || wearableDetails?.elevation_gain_m || 0)} m`)}{isRun && statCard('GAP estimado', gapPace ? `${fmtPaceFromSecPerKm(gapPace)} /km` : '—')}{isRun && statCard(language === 'es' ? 'Ritmo vs. GAP' : 'Pace vs. GAP', gapPace ? `${fmtPace(avgSpeed)} · ${fmtPaceFromSecPerKm(gapPace)}` : '—')}</div></section>
              <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-neutral-800 dark:text-white">{language === 'es' ? 'Carga y esfuerzo' : 'Load & effort'}</h3>{impulseIsEstimate && <span title={language === 'es' ? 'Estimación: minutos × zona / zona máxima configurada. No es TSS.' : 'Estimate: minutes × zone / highest configured zone. This is not TSS.'} className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{language === 'es' ? 'estimado' : 'estimated'}</span>}</div><div className="grid grid-cols-2 gap-2">{statCard('Impulse', impulse == null ? '—' : `${Math.round(Number(impulse))} pts`, 'text-purple-600 dark:text-purple-300')}{statCard('IF', intensityFactor > 0 ? intensityFactor.toFixed(2) : '—', 'text-blue-600 dark:text-blue-300')}{statCard('VAM', activity.duration_seconds > 0 ? `${Math.round((activity.elevation_gain_meters || wearableDetails?.elevation_gain_m || 0) / (activity.duration_seconds / 3600))} m/h` : '—')}{statCard(language === 'es' ? 'Cadencia prom.' : 'Avg cadence', activity.average_cadence == null ? '—' : `${Math.round(activity.average_cadence)} spm`)}{averageHr != null && statCard(language === 'es' ? 'FC prom. / máx.' : 'Avg / max HR', `${Math.round(Number(averageHr))} / ${activity.max_heartrate ?? wearableDetails?.max_heartrate ?? '—'} bpm`, 'text-rose-600 dark:text-rose-300')}{thresholdHr > 0 && averageHr != null && statCard(language === 'es' ? 'FC prom. / LT2' : 'Avg HR / LT2', `${Math.round(Number(averageHr))} / ${thresholdHr} bpm`, 'text-rose-600 dark:text-rose-300')}{averagePower != null && statCard(language === 'es' ? 'Potencia prom.' : 'Avg power', `${Math.round(Number(averagePower))} W`, 'text-amber-600 dark:text-amber-300')}{thresholdPower > 0 && averagePower != null && statCard(language === 'es' ? 'Potencia / FTP' : 'Power / FTP', `${Math.round(Number(averagePower))} / ${Math.round(thresholdPower)} W`, 'text-amber-600 dark:text-amber-300')}</div>{passport?.measurement_date && <p className="mt-2 text-[11px] text-neutral-500">{language === 'es' ? 'Pasaporte biológico' : 'Biological Passport'} · {passport.measurement_date}</p>}{impulseIsEstimate && <p className="mt-2 text-[10px] text-neutral-500">{language === 'es' ? 'Estimación por zonas personales; no se utiliza TSS.' : 'Estimated from personal zones; TSS is not used.'}</p>}</section>
              {activity.calories != null && <p className="px-1 text-xs text-neutral-500">{Math.round(activity.calories)} kcal{activity.device_name ? ` · ${activity.device_name}` : ''}</p>}
              {activity.fused_activity_id && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{language === 'es' ? 'Actividad GPS vinculada con esta actividad importada.' : 'This imported activity is matched with an Asciende GPS recording.'}</p>}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
