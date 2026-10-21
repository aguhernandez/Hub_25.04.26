export interface ActivityZone {
  zone: number;
  name: string;
  min: number;
  max: number;
}

export interface ActivityZoneTime extends ActivityZone {
  seconds: number;
  percent: number;
}

function objectValue(value: unknown): Record<string, any> | null {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}

function zoneRows(value: unknown, kind: 'hr' | 'power'): ActivityZone[] {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(value)) return [];
  return value.map((row: any, index): ActivityZone | null => {
    const zone = Number(row?.zone ?? index + 1);
    const min = Number(row?.[kind === 'hr' ? 'min_bpm' : 'min_watts'] ?? row?.min ?? row?.low);
    const max = Number(row?.[kind === 'hr' ? 'max_bpm' : 'max_watts'] ?? row?.max ?? row?.high);
    if (!Number.isFinite(zone) || !Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { zone, name: String(row?.name || `Z${zone}`), min, max };
  }).filter((row): row is ActivityZone => row !== null).sort((a, b) => a.zone - b.zone);
}

export function getPassportZones(passport: any, kind: 'hr' | 'power'): ActivityZone[] {
  if (!passport) return [];
  const training = objectValue(passport.training_zones);
  const displayCount = training?.default_display === '7' ? 7 : 5;
  const nestedZones = (count: number) => {
    const set = objectValue(training?.[`zones${count}`]);
    const flat = training?.[`zones${count}_${kind}`]
      ?? training?.[`${kind}_zones_${count}`]
      ?? training?.[`${kind}_zones${count}`]
      ?? (kind === 'hr' ? training?.[`heart_rate_zones_${count}`] : undefined);
    return zoneRows(flat ?? set?.[kind] ?? set?.[kind === 'hr' ? 'heart_rate' : 'watts'], kind);
  };
  const defaultRows = nestedZones(displayCount);
  if (defaultRows.length) return defaultRows;
  const zones5 = nestedZones(5);
  if (zones5.length) return zones5;
  const zones7 = nestedZones(7);
  if (zones7.length) return zones7;
  return zoneRows(kind === 'hr' ? passport.hr_zones_json : passport.power_zones_json, kind);
}

export function calculateZoneTimes(
  values: number[] | null | undefined,
  times: number[] | null | undefined,
  zones: ActivityZone[],
): ActivityZoneTime[] {
  if (!values?.length || !times?.length || !zones.length) return [];
  const length = Math.min(values.length, times.length);
  const secondsByZone = new Map(zones.map(zone => [zone.zone, 0]));
  for (let i = 0; i < length - 1; i++) {
    const value = Number(values[i]);
    const delta = Number(times[i + 1]) - Number(times[i]);
    if (!Number.isFinite(value) || !Number.isFinite(delta) || delta <= 0 || delta > 30) continue;
    const zone = zones.find(candidate => value >= candidate.min && value <= candidate.max);
    if (zone) secondsByZone.set(zone.zone, (secondsByZone.get(zone.zone) || 0) + delta);
  }
  const total = Array.from(secondsByZone.values()).reduce((sum, value) => sum + value, 0);
  if (!total) return [];
  return zones.map(zone => ({
    ...zone,
    seconds: secondsByZone.get(zone.zone) || 0,
    percent: (secondsByZone.get(zone.zone) || 0) / total * 100,
  }));
}

function gradeCost(grade: number): number {
  const g = Math.max(-0.35, Math.min(0.45, grade));
  return 155.4 * g ** 5 - 30.4 * g ** 4 - 43.3 * g ** 3 + 46.3 * g ** 2 + 19.5 * g + 3.6;
}

export function calculateGapPace(
  times: number[] | null | undefined,
  distances: number[] | null | undefined,
  altitude: number[] | null | undefined,
): number | null {
  if (!times || !distances || !altitude) return null;
  const length = Math.min(times.length, distances.length, altitude.length);
  if (length < 3) return null;
  const step = Math.max(1, Math.floor(length / 250));
  const flatCost = gradeCost(0);
  let adjustedSeconds = 0;
  let totalDistance = 0;
  for (let end = step; end < length; end += step) {
    const start = end - step;
    const distance = Number(distances[end]) - Number(distances[start]);
    const elapsed = Number(times[end]) - Number(times[start]);
    if (distance < 5 || elapsed <= 0) continue;
    const grade = (Number(altitude[end]) - Number(altitude[start])) / distance;
    if (!Number.isFinite(grade)) continue;
    const adjustedPace = elapsed / (distance / 1000) * flatCost / Math.max(0.5, gradeCost(grade));
    adjustedSeconds += adjustedPace * distance;
    totalDistance += distance;
  }
  return totalDistance ? adjustedSeconds / totalDistance : null;
}

export function parseThresholdPace(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/(\d{1,2}):(\d{2})(?:\s*\/\s*km|\s*min(?:ute)?s?\s*(?:\/|per)\s*km)?/i);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  return null;
}
