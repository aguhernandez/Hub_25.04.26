import {
  buildMatchDecisions, calculateDerivedAnalysis, calculatePowerMetrics, calculateZoneSeconds, localDate, normalizeSport, resolveEnduranceCompletions,
} from './endurance-session-analysis.ts';

Deno.test('same local date and similar duration auto-match', () => {
  const decisions = buildMatchDecisions(
    [{ id: 's1', athlete_id: 'a1', start_time: '2026-06-01T16:00:00Z', duration_seconds: 3600, sport_raw: 'running' }],
    [{ id: 'p1', athlete_id: 'a1', scheduled_date: '2026-06-01', scheduled_time: '18:00', estimated_duration_minutes: 60, sport: 'running', sub_discipline: null }],
    [], 'Europe/Madrid',
  );
  if (decisions[0]?.status !== 'auto_matched' || decisions[0]?.score !== 100) throw new Error(`Unexpected decision ${JSON.stringify(decisions)}`);
});

Deno.test('local date handles a UTC date rollover for a late session', () => {
  if (localDate('2026-06-01T23:45:00Z', 'America/Los_Angeles') !== '2026-06-01') throw new Error('UTC instant must be evaluated in the athlete timezone');
  const decisions = buildMatchDecisions(
    [{ id: 's1', athlete_id: 'a1', start_time: '2026-06-02T01:30:00Z', duration_seconds: 3600, sport_raw: 'run' }],
    [{ id: 'p1', athlete_id: 'a1', scheduled_date: '2026-06-01', scheduled_time: null, estimated_duration_minutes: 60, sport: 'running', sub_discipline: null }],
    [], 'America/Los_Angeles',
  );
  if (decisions[0]?.planned_workout_id !== 'p1') throw new Error('The UTC calendar day boundary must not prevent a local-date match');
});

Deno.test('two workouts on one date and a double session take distinct compatible plans', () => {
  const decisions = buildMatchDecisions(
    [
      { id: 'bike', athlete_id: 'a1', start_time: '2026-06-01T06:00:00Z', duration_seconds: 7200, sport_raw: 'cycling' },
      { id: 'run', athlete_id: 'a1', start_time: '2026-06-01T16:00:00Z', duration_seconds: 3600, sport_raw: 'running' },
    ],
    [
      { id: 'p-bike', athlete_id: 'a1', scheduled_date: '2026-06-01', scheduled_time: null, estimated_duration_minutes: 120, sport: 'cycling', sub_discipline: null },
      { id: 'p-run', athlete_id: 'a1', scheduled_date: '2026-06-01', scheduled_time: null, estimated_duration_minutes: 60, sport: 'running', sub_discipline: null },
    ], [], 'UTC',
  );
  if (decisions.length !== 2 || new Set(decisions.map(d => d.planned_workout_id)).size !== 2) throw new Error(`Expected two unique matches: ${JSON.stringify(decisions)}`);
  if (decisions.find(d => d.executed_session_id === 'bike')?.planned_workout_id !== 'p-bike') throw new Error('Bike should map to its plan');
  if (decisions.find(d => d.executed_session_id === 'run')?.planned_workout_id !== 'p-run') throw new Error('Run should map to its plan');
});

Deno.test('session with no compatible planned workout remains unplanned', () => {
  const decisions = buildMatchDecisions(
    [{ id: 's1', athlete_id: 'a1', start_time: '2026-06-01T16:00:00Z', duration_seconds: 3600, sport_raw: 'unknown device sport' }],
    [], [], 'UTC',
  );
  if (decisions[0]?.status !== 'unplanned' || decisions[0]?.planned_workout_id !== null) throw new Error('Session should be retained as unplanned');
});

Deno.test('power metrics for constant power and missing FTP', () => {
  const samples = Array.from({ length: 121 }, (_, second) => ({ timestamp: second * 1000, value: 200 }));
  const metrics = calculatePowerMetrics(samples, 120, 250, [{ zone: 1, min: 0, max: 199 }, { zone: 2, min: 200, max: 249 }]);
  if (metrics.avg_power !== 200 || metrics.max_power !== 200 || metrics.normalized_power !== 200) throw new Error(`Unexpected constant-power metrics: ${JSON.stringify(metrics)}`);
  if (metrics.intensity_factor !== 0.8 || Math.abs((metrics.tss || 0) - (120 * 200 * 0.8 / (250 * 3600) * 100)) > 1e-9) throw new Error('IF/TSS do not match their defined formula');
  if (metrics.power_zone_seconds?.zone_2_seconds !== 120) throw new Error(`Unexpected zones ${JSON.stringify(metrics.power_zone_seconds)}`);
  const missingFtp = calculatePowerMetrics(samples, 120, null, null);
  if (missingFtp.intensity_factor !== null || missingFtp.tss !== null || missingFtp.power_zone_seconds !== null) throw new Error('FTP or zone dependent metrics must be null when unavailable');
});

Deno.test('power intervals and short gaps are interpolated; long gaps reduce coverage', () => {
  const intervalSamples = Array.from({ length: 121 }, (_, second) => ({ timestamp: second * 1000, value: second < 60 ? 100 : 300 }));
  const intervalMetrics = calculatePowerMetrics(intervalSamples, 120, 200, null);
  if (intervalMetrics.max_power !== 300 || intervalMetrics.normalized_power === null || intervalMetrics.normalized_power <= 100) throw new Error('Interval power should raise normalized power above easy power');
  const gapSamples = Array.from({ length: 61 }, (_, second) => ({ timestamp: second < 10 ? second * 1000 : (second + 10) * 1000, value: 200 }));
  const gapMetrics = calculatePowerMetrics(gapSamples, 80, 200, null);
  if (gapMetrics.coverage_pct === null || gapMetrics.coverage_pct >= 90) throw new Error('A long sample gap should reduce coverage');
  const noFtp = calculatePowerMetrics(intervalSamples, 120, null, null);
  if (noFtp.intensity_factor !== null || noFtp.tss !== null) throw new Error('No FTP means no IF/TSS');
});

Deno.test('heart rate zone seconds use only the supplied passport boundaries', () => {
  const samples = [
    { timestamp: 0, value: 100 }, { timestamp: 1000, value: 120 }, { timestamp: 2000, value: 140 },
    { timestamp: 3000, value: 160 }, { timestamp: 4000, value: 180 }, { timestamp: 5000, value: 180 },
  ];
  const zones5 = [{ zone: 1, min: 90, max: 119 }, { zone: 2, min: 120, max: 139 }, { zone: 3, min: 140, max: 159 }, { zone: 4, min: 160, max: 179 }, { zone: 5, min: 180, max: 200 }];
  const zones7 = [...zones5, { zone: 6, min: 181, max: 190 }, { zone: 7, min: 191, max: 200 }];
  const five = calculateZoneSeconds(samples, zones5);
  const seven = calculateZoneSeconds(samples, zones7);
  if (!five || five.zone_1_seconds !== 1 || five.zone_2_seconds !== 1 || five.zone_3_seconds !== 1 || five.zone_4_seconds !== 1) throw new Error(`Unexpected 5-zone time: ${JSON.stringify(five)}`);
  if (!seven || seven.zone_5_seconds !== 1 || seven.zone_6_seconds !== 0 || seven.zone_7_seconds !== 0) throw new Error(`Unexpected 7-zone time: ${JSON.stringify(seven)}`);
  if (calculateZoneSeconds(samples, null) !== null) throw new Error('Missing passport zones must return null');
});

Deno.test('sport normalization uses known mappings and sends unknown values to other', () => {
  if (normalizeSport('swimming') !== 'swimming' || normalizeSport('road cycling') !== 'cycling' || normalizeSport('mystery') !== 'other') throw new Error('Unexpected sport mapping');
});

Deno.test('completion priority is watch, GPS, then manual; suggested watch does not count', () => {
  const shared = { planned_workout_id: 'plan', start_time: '2026-06-01T10:00:00Z', duration_seconds: 3600 };
  const choose = (rows: any[]) => resolveEnduranceCompletions(rows)[0]?.source;
  if (choose([{ ...shared, source: 'manual', id: 'm' }, { ...shared, source: 'gps', id: 'g' }, { ...shared, source: 'watch', id: 'w', priority_status: 'auto_matched' }]) !== 'watch') throw new Error('Watch must win');
  if (choose([{ ...shared, source: 'manual', id: 'm' }, { ...shared, source: 'watch', id: 'w', priority_status: 'suggested' }]) !== 'manual') throw new Error('Suggested watch session must not count');
  if (choose([{ ...shared, source: 'manual', id: 'm' }, { ...shared, source: 'gps', id: 'g' }]) !== 'gps') throw new Error('GPS must win over manual');
  if (choose([{ ...shared, source: 'manual', id: 'm' }]) !== 'manual') throw new Error('Manual must be the fallback');
});

Deno.test('unplanned GPS/manual duplicate a watch within time and duration tolerances', () => {
  const rows = resolveEnduranceCompletions([
    { source: 'watch', id: 'w', start_time: '2026-06-01T10:00:00Z', duration_seconds: 3600, priority_status: 'unplanned' },
    { source: 'gps', id: 'g', start_time: '2026-06-01T10:14:00Z', duration_seconds: 4300 },
    { source: 'manual', id: 'm', start_time: '2026-06-01T10:15:00Z', duration_seconds: 3600 },
    { source: 'gps', id: 'other', start_time: '2026-06-01T11:00:00Z', duration_seconds: 3600 },
  ]);
  if (rows.map(row => row.id).join(',') !== 'w,other') throw new Error(`Unexpected deduplication: ${JSON.stringify(rows)}`);
});

Deno.test('derived drift and power efficiency use both full-resolution halves', () => {
  const hr = Array.from({ length: 2401 }, (_, second) => ({ timestamp: second * 1000, value: second < 1200 ? 140 : 154 }));
  const power = Array.from({ length: 2401 }, (_, second) => ({ timestamp: second * 1000, value: second < 1200 ? 210 : 210 }));
  const result = calculateDerivedAnalysis(hr, power, 2400);
  if (result.heart_rate_drift_pct === null || Math.abs(result.heart_rate_drift_pct - 10) > 0.1) throw new Error(`Unexpected HR drift: ${JSON.stringify(result)}`);
  if (result.efficiency_first_half === null || result.efficiency_second_half === null || Math.abs(result.efficiency_change_pct! + 9.09) > 0.2) throw new Error(`Unexpected efficiency change: ${JSON.stringify(result)}`);
  if (result.coverage_pct === null || result.coverage_pct < 99) throw new Error('Coverage should reflect near-complete samples');
});
