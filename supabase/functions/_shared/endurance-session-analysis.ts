export type SportCategory = 'running' | 'cycling' | 'swimming' | 'other';
export type ZoneRange = { min: number; max: number; zone?: number };
export type TimedSample = { timestamp: number; value: number; type?: string };

export type CompletionSource = 'watch' | 'gps' | 'manual';
export type CompletionCandidate = {
  source: CompletionSource;
  id: string;
  planned_workout_id?: string | null;
  start_time?: string | null;
  duration_seconds?: number | null;
  priority_status?: string | null;
  [key: string]: unknown;
};

/** Pick one execution per plan; manual feedback is carried separately by callers. */
export function resolveEnduranceCompletions(candidates: CompletionCandidate[]) {
  const priority: Record<CompletionSource, number> = { watch: 3, gps: 2, manual: 1 };
  const planned = new Map<string, CompletionCandidate[]>();
  const unplanned: CompletionCandidate[] = [];
  for (const candidate of candidates) {
    if (candidate.source === 'watch' && ['suggested', 'dismissed'].includes(candidate.priority_status || '')) continue;
    if (candidate.planned_workout_id) {
      const values = planned.get(candidate.planned_workout_id) || [];
      values.push(candidate); planned.set(candidate.planned_workout_id, values);
    } else unplanned.push(candidate);
  }
  const selected = [...planned.values()].map(rows => rows.sort((a, b) => priority[b.source] - priority[a.source] || String(b.start_time || '').localeCompare(String(a.start_time || '')))[0]);
  const watchRows = unplanned.filter(row => row.source === 'watch');
  const isDuplicate = (row: CompletionCandidate) => row.source !== 'watch' && watchRows.some(watch => {
    if (!row.start_time || !watch.start_time || row.duration_seconds == null || watch.duration_seconds == null || watch.duration_seconds <= 0) return false;
    const startDelta = Math.abs(Date.parse(row.start_time) - Date.parse(watch.start_time)) / 60000;
    const durationDelta = Math.abs(row.duration_seconds - watch.duration_seconds) / watch.duration_seconds;
    return startDelta <= 15 && durationDelta <= 0.2;
  });
  selected.push(...unplanned.filter(row => !isDuplicate(row)));
  return selected.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '') || priority[b.source] - priority[a.source]);
}

export type DerivedAnalysis = {
  heart_rate_drift_pct: number | null;
  efficiency_first_half: number | null;
  efficiency_second_half: number | null;
  efficiency_change_pct: number | null;
  efficiency_basis: 'power_per_hr' | 'pace_or_speed_per_hr' | null;
  coverage_pct: number | null;
  continuous: boolean;
  diagnostics: string[];
};

/** Drift/efficiency computed from the full-resolution series before chart reduction. */
export function calculateDerivedAnalysis(
  hrSamples: TimedSample[], powerSamples: TimedSample[], durationSeconds: number,
  options: { paceSamples?: TimedSample[]; continuous?: boolean } = {},
): DerivedAnalysis {
  const diagnostics: string[] = [];
  const start = Math.min(...[...hrSamples, ...powerSamples, ...(options.paceSamples || [])].map(row => row.timestamp).filter(Number.isFinite));
  const end = Math.max(...[...hrSamples, ...powerSamples, ...(options.paceSamples || [])].map(row => row.timestamp).filter(Number.isFinite));
  const midpoint = start + (end - start) / 2;
  const avg = (rows: TimedSample[]) => { const v = rows.map(row => row.value).filter(Number.isFinite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const firstHr = avg(hrSamples.filter(row => row.timestamp < midpoint));
  const secondHr = avg(hrSamples.filter(row => row.timestamp >= midpoint));
  let drift: number | null = null;
  const timestamps = [...hrSamples, ...powerSamples, ...(options.paceSamples || [])].map(row => row.timestamp).filter(Number.isFinite).sort((a, b) => a - b);
  const hasLongGap = timestamps.some((value, index) => index > 0 && value - timestamps[index - 1] > 30000);
  const continuous = options.continuous !== false && !hasLongGap;
  if (durationSeconds >= 2400 && continuous && firstHr && secondHr) drift = (secondHr - firstHr) / firstHr * 100;
  else diagnostics.push(durationSeconds < 2400 ? 'Heart-rate drift requires at least 40 minutes.' : 'Drift unavailable: session is not continuous or heart-rate halves are incomplete.');
  const metricRows = powerSamples.length ? powerSamples : (options.paceSamples || []);
  const firstMetric = avg(metricRows.filter(row => row.timestamp < midpoint));
  const secondMetric = avg(metricRows.filter(row => row.timestamp >= midpoint));
  const firstEfficiency = firstMetric !== null && firstHr ? firstMetric / firstHr : null;
  const secondEfficiency = secondMetric !== null && secondHr ? secondMetric / secondHr : null;
  const change = firstEfficiency && secondEfficiency ? (secondEfficiency - firstEfficiency) / firstEfficiency * 100 : null;
  if (change === null) diagnostics.push('Efficiency requires matching heart-rate and power or pace samples in both halves.');
  const observed = new Set([...hrSamples, ...powerSamples, ...(options.paceSamples || [])].map(row => Math.floor(row.timestamp / 1000)));
  return { heart_rate_drift_pct: drift, efficiency_first_half: firstEfficiency, efficiency_second_half: secondEfficiency, efficiency_change_pct: change, efficiency_basis: powerSamples.length ? 'power_per_hr' : metricRows.length ? 'pace_or_speed_per_hr' : null, coverage_pct: durationSeconds > 0 ? Math.min(100, observed.size / durationSeconds * 100) : null, continuous, diagnostics };
}

const SPORT_ALIASES: Record<SportCategory, Set<string>> = {
  running: new Set(['run', 'running', 'trail_run', 'trail_running', 'treadmill_running', 'track_running', 'jogging']),
  cycling: new Set(['bike', 'biking', 'cycling', 'road_cycling', 'mountain_biking', 'indoor_cycling', 'stationary_bike', 'virtual_cycling', 'e_bike_ride']),
  swimming: new Set(['swim', 'swimming', 'pool_swimming', 'open_water_swimming']),
  other: new Set(),
};

export function normalizeSport(...values: Array<unknown>): SportCategory {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const key = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    for (const category of ['running', 'cycling', 'swimming'] as const) {
      if (SPORT_ALIASES[category].has(key)) return category;
    }
  }
  return 'other';
}

export function localDate(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export type MatchSession = {
  id: string;
  athlete_id: string;
  start_time: string;
  duration_seconds: number | null;
  sport_raw: string | null;
};
export type PlannedWorkout = {
  id: string;
  athlete_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  estimated_duration_minutes: number | null;
  sport: string | null;
  sub_discipline: string | null;
};
export type ExistingMatch = { executed_session_id: string; planned_workout_id: string | null; status: string };
export type MatchDecision = { executed_session_id: string; planned_workout_id: string | null; status: 'auto_matched' | 'suggested' | 'unplanned'; score: number | null };

function parseScheduledTime(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(?:^|T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return null;
  const hour = Number(match[1]); const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function scoreCandidate(session: MatchSession, plan: PlannedWorkout, timezone: string): number {
  const day = localDate(session.start_time, timezone);
  const dayDelta = Math.abs((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${plan.scheduled_date.slice(0, 10)}T00:00:00Z`)) / 86400000);
  if (dayDelta > 1) return 0;
  let score = dayDelta === 0 ? 50 : 25;
  const scheduled = parseScheduledTime(plan.scheduled_time);
  if (scheduled !== null) {
    const start = new Date(session.start_time);
    const clock = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(start);
    const [hour, minute] = clock.split(':').map(Number);
    const actualMinutes = hour * 60 + minute;
    const delta = Math.min(Math.abs(actualMinutes - scheduled), 1440 - Math.abs(actualMinutes - scheduled));
    if (delta <= 30) score += 20;
    else if (delta <= 90) score += 10;
  }
  if (session.duration_seconds && plan.estimated_duration_minutes && plan.estimated_duration_minutes > 0) {
    const fraction = Math.abs(session.duration_seconds / 60 - plan.estimated_duration_minutes) / plan.estimated_duration_minutes;
    if (fraction <= 0.15) score += 30;
    else if (fraction <= 0.30) score += 20;
    else if (fraction <= 0.50) score += 10;
  }
  return Math.min(score, 100);
}

export function buildMatchDecisions(
  sessions: MatchSession[], plans: PlannedWorkout[], existing: ExistingMatch[], timezone: string,
): MatchDecision[] {
  const protectedMatches = existing.filter(match => ['manual_matched', 'dismissed'].includes(match.status));
  const reservedSessionIds = new Set(protectedMatches.map(match => match.executed_session_id));
  const reservedPlanIds = new Set(protectedMatches.map(match => match.planned_workout_id).filter((id): id is string => !!id));
  const eligible = sessions.filter(session => !reservedSessionIds.has(session.id));
  const candidates = eligible.flatMap(session => plans
    .filter(plan => plan.athlete_id === session.athlete_id && !reservedPlanIds.has(plan.id) &&
      normalizeSport(session.sport_raw) !== 'other' && normalizeSport(session.sport_raw) === normalizeSport(plan.sport, plan.sub_discipline))
    .map(plan => ({ session, plan, score: scoreCandidate(session, plan, timezone) }))
    .filter(item => item.score > 0))
    .sort((a, b) => b.score - a.score || a.session.start_time.localeCompare(b.session.start_time) || a.plan.scheduled_date.localeCompare(b.plan.scheduled_date) || a.plan.id.localeCompare(b.plan.id));

  const assignedSessions = new Set<string>();
  const assignedPlans = new Set(reservedPlanIds);
  const decisions: MatchDecision[] = [];
  for (const candidate of candidates) {
    if (assignedSessions.has(candidate.session.id) || assignedPlans.has(candidate.plan.id)) continue;
    assignedSessions.add(candidate.session.id); assignedPlans.add(candidate.plan.id);
    decisions.push({
      executed_session_id: candidate.session.id,
      planned_workout_id: candidate.plan.id,
      status: candidate.score >= 75 ? 'auto_matched' : 'suggested',
      score: candidate.score,
    });
  }
  for (const session of eligible) {
    if (assignedSessions.has(session.id)) continue;
    decisions.push({ executed_session_id: session.id, planned_workout_id: null, status: 'unplanned', score: null });
  }
  return decisions;
}

export function normalizeZones(value: unknown): ZoneRange[] | null {
  if (!value) return null;
  const rows = Array.isArray(value) ? value : typeof value === 'object' ? Object.values(value as Record<string, unknown>) : [];
  const zones = rows.map((row, index) => {
    if (!row || typeof row !== 'object') return null;
    const z = row as Record<string, unknown>;
    const min = Number(z.min ?? z.low ?? z.min_bpm ?? z.min_watts);
    const max = Number(z.max ?? z.high ?? z.max_bpm ?? z.max_watts);
    return Number.isFinite(min) && Number.isFinite(max) && max >= min ? { min, max, zone: Number(z.zone) || index + 1 } : null;
  }).filter((zone): zone is ZoneRange => !!zone);
  return zones.length ? zones : null;
}

export function calculateZoneSeconds(samples: TimedSample[], zones: ZoneRange[] | null): Record<string, number> | null {
  if (!zones?.length || samples.length < 2) return null;
  const sorted = samples.filter(sample => Number.isFinite(sample.timestamp) && Number.isFinite(sample.value)).sort((a, b) => a.timestamp - b.timestamp);
  const result: Record<string, number> = {};
  for (const zone of zones) result[`zone_${zone.zone}_seconds`] = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = Math.round((sorted[i + 1].timestamp - sorted[i].timestamp) / 1000);
    const seconds = gap > 0 && gap <= 5 ? gap : 0;
    for (const zone of zones) {
      if (sorted[i].value >= zone.min && sorted[i].value <= zone.max) {
        const key = `zone_${zone.zone}_seconds`;
        result[key] = (result[key] || 0) + seconds;
        break;
      }
    }
  }
  return result;
}

export type PowerMetrics = {
  avg_power: number | null; max_power: number | null; normalized_power: number | null;
  variability_index: number | null; intensity_factor: number | null; tss: number | null;
  coverage_pct: number | null; sample_count: number; power_zone_seconds: Record<string, number> | null;
};

export function calculatePowerMetrics(
  input: TimedSample[], durationSeconds: number, ftp: number | null, zones: ZoneRange[] | null,
): PowerMetrics {
  const samples = input.filter(s => Number.isFinite(s.timestamp) && Number.isFinite(s.value) && s.value >= 0).sort((a, b) => a.timestamp - b.timestamp);
  if (samples.length < 2 || durationSeconds <= 0) return { avg_power: null, max_power: null, normalized_power: null, variability_index: null, intensity_factor: null, tss: null, coverage_pct: null, sample_count: samples.length, power_zone_seconds: null };
  const start = Math.floor(samples[0].timestamp / 1000);
  const end = Math.min(Math.ceil(samples[samples.length - 1].timestamp / 1000), start + Math.ceil(durationSeconds));
  const grid: Array<number | null> = Array.from({ length: Math.max(0, end - start + 1) }, () => null);
  for (const sample of samples) {
    const index = Math.round(sample.timestamp / 1000) - start;
    if (index >= 0 && index < grid.length) grid[index] = sample.value;
  }
  let observedSeconds = grid.filter(value => value !== null).length;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== null) continue;
    let left = i - 1; while (left >= 0 && grid[left] === null && i - left <= 5) left--;
    let right = i + 1; while (right < grid.length && grid[right] === null && right - i <= 5) right++;
    if (left >= 0 && right < grid.length && grid[left] !== null && grid[right] !== null && right - left <= 6) {
      const fraction = (i - left) / (right - left);
      grid[i] = (grid[left]! + (grid[right]! - grid[left]!) * fraction);
    }
  }
  const valid = grid.filter((value): value is number => value !== null);
  const avg = valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
  const max = valid.length ? Math.max(...valid) : null;
  const rolling: number[] = [];
  for (let i = 29; i < grid.length; i++) {
    const window = grid.slice(i - 29, i + 1);
    if (window.every((value): value is number => value !== null)) rolling.push(window.reduce((sum, value) => sum + value, 0) / 30);
  }
  const np = rolling.length ? Math.pow(rolling.reduce((sum, value) => sum + Math.pow(value, 4), 0) / rolling.length, 0.25) : null;
  const ifValue = np !== null && ftp && ftp > 0 ? np / ftp : null;
  const tss = np !== null && ifValue !== null && ftp && ftp > 0 ? durationSeconds * np * ifValue / (ftp * 3600) * 100 : null;
  const zoneSamples = samples.map(sample => ({ timestamp: sample.timestamp, value: sample.value }));
  return {
    avg_power: avg, max_power: max, normalized_power: np,
    variability_index: np !== null && avg && avg > 0 ? np / avg : null,
    intensity_factor: ifValue, tss,
    coverage_pct: Math.min(100, observedSeconds / durationSeconds * 100),
    sample_count: samples.length,
    power_zone_seconds: calculateZoneSeconds(zoneSamples, zones),
  };
}

export function plannedZoneSeconds(workout: { intensity_basis?: string | null; steps?: unknown }, hrZones: ZoneRange[] | null, powerZones: ZoneRange[] | null) {
  const steps = Array.isArray(workout.steps) ? workout.steps as Array<Record<string, unknown>> : [];
  const basis = (workout.intensity_basis || '').toLowerCase();
  const result: Record<string, number> = {};
  let interpreted = 0;
  let ftpPercentSeconds = 0;
  let ftpPercentDuration = 0;
  for (const step of steps) {
    if (step.duration_type !== 'time' || !Number.isFinite(Number(step.duration_value))) continue;
    const seconds = Number(step.duration_value) * Math.max(1, Number(step.repeat_times) || 1);
    if (Number.isFinite(Number(step.target_percent_ftp)) && Number(step.target_percent_ftp) > 0) {
      ftpPercentSeconds += Number(step.target_percent_ftp) * seconds;
      ftpPercentDuration += seconds;
    }
    let metric: 'hr' | 'power' | null = null;
    if (basis === 'hr' || step.target_type === 'hr') metric = 'hr';
    if (basis === 'power' || step.target_type === 'power') metric = 'power';
    const zones = metric === 'hr' ? hrZones : metric === 'power' ? powerZones : null;
    const zoneNumber = Number(step.target_zone);
    if (!zones || !Number.isInteger(zoneNumber) || zoneNumber < 1) continue;
    const zoneSystem = Number(step.zone_system);
    if ((zoneSystem === 5 && zones.length !== 5) || (zoneSystem === 7 && zones.length !== 7) || !zones.some(zone => zone.zone === zoneNumber)) continue;
    const key = `zone_${zoneNumber}_seconds`;
    result[key] = (result[key] || 0) + seconds;
    interpreted += seconds;
  }
  const targetIntensity = ftpPercentDuration ? { metric: 'power', target_ftp_percent: ftpPercentSeconds / ftpPercentDuration, interpreted_seconds: ftpPercentDuration } : null;
  return interpreted || targetIntensity ? { seconds: interpreted ? result : null, interpreted_seconds: interpreted, target_intensity: targetIntensity, reason: interpreted ? null : 'Timed power targets in the plan are expressed as a percentage of FTP.' } : {
    seconds: null,
    interpreted_seconds: 0,
    target_intensity: null,
    reason: steps.length ? 'Plan steps have no interpretable timed zone target for their intensity basis.' : 'The plan has no structured timed steps.',
  };
}
