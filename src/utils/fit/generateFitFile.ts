/**
 * FIT (Flexible and Interoperable Data Transfer) structured workout file generator.
 *
 * Generates binary .FIT files compatible with:
 * - Garmin devices (direct USB copy to GARMIN/NewFiles/)
 * - COROS, Suunto, Wahoo, Hammerhead
 * - TrainingPeaks / intervals.icu imports
 *
 * IMPORTANT — Garmin Connect upload endpoint (406):
 * The /upload-service/upload endpoint ONLY accepts activity FIT files (file_type=4).
 * It intentionally rejects workout FIT files (file_type=5) with HTTP 406.
 * To use on a Garmin device: copy the .fit file to GARMIN/NewFiles/ via USB.
 * To import into TrainingPeaks or intervals.icu: upload directly via their UI.
 *
 * FIT Protocol reference: https://developer.garmin.com/fit/
 * Field numbers verified against FIT SDK Profile.xlsx and confirmed working implementations.
 */

import type { WorkoutStep, EnduranceWorkout } from '../../components/training/EnduranceWorkoutCard';

// ─── FIT Constants ────────────────────────────────────────────────────────────

const FIT_PROTOCOL_VERSION = 0x20; // Protocol 2.0
const FIT_PROFILE_VERSION  = 2100; // Profile 21.00 — broadly compatible

// Global message numbers (mesg_num)
const MESG_FILE_ID       = 0;
const MESG_WORKOUT       = 26;
const MESG_WORKOUT_STEP  = 27;

// File type (file_id.type field 0)
const FILE_TYPE_WORKOUT = 5;

// Manufacturer & product
const MANUFACTURER_DEVELOPMENT = 255;
const PRODUCT_DEVELOPMENT      = 0;

// Sport enum (FIT Profile sport field)
const FIT_SPORT: Record<string, number> = {
  cycling:   2,
  running:   1,
  swimming:  5,
  strength: 14,
  other:     0,
};

// Sub-sport enum
const FIT_SUB_SPORT: Record<string, number> = {
  road:           8,
  mountain:       9,
  track:         11,
  indoor_cycling: 6,
  pool:          22,
  open_water:    47,
  generic:        0,
};

// Duration type enum (workout_step.duration_type, field 1)
const WKO_DUR_TIME     = 0; // value = seconds
const WKO_DUR_DISTANCE = 1; // value = centimetres

// Target type enum (workout_step.target_type, field 3)
// Confirmed from FIT SDK Profile.xlsx WktStepTarget enum
const WKO_TARGET_SPEED      = 0;
const WKO_TARGET_HR_ZONE    = 1;
const WKO_TARGET_CADENCE    = 3;
const WKO_TARGET_POWER      = 4; // zone-based power
const WKO_TARGET_POWER_3    = 11; // custom power range (low/high)
const WKO_TARGET_OPEN       = 2; // no target (open)

// Intensity enum (workout_step.intensity, field 7)
// FIT SDK: 0=active, 1=rest, 2=warmup, 3=cooldown, 4=recovery
const INTENSITY: Record<string, number> = {
  active:   0,
  steady:   0,
  interval: 0,
  rest:     1,
  warmup:   2,
  cooldown: 3,
  recovery: 4,
};

// ─── Base type constants ──────────────────────────────────────────────────────

const BASE_ENUM   = 0x00;
const BASE_UINT8  = 0x02;
const BASE_UINT16 = 0x84; // UINT16 with endian flag
const BASE_UINT32 = 0x86; // UINT32 with endian flag
const BASE_STRING = 0x07;

// ─── Low-level binary helpers ─────────────────────────────────────────────────

function writeUint16LE(view: DataView, offset: number, val: number): number {
  view.setUint16(offset, val & 0xffff, true);
  return offset + 2;
}

function writeUint32LE(view: DataView, offset: number, val: number): number {
  view.setUint32(offset, val >>> 0, true);
  return offset + 4;
}

/** CRC-16 as specified by the Garmin FIT SDK */
function computeCrc(data: Uint8Array, start = 0, end?: number): number {
  const CRC_TABLE = [
    0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
    0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
  ];
  let crc = 0;
  const len = end ?? data.length;
  for (let i = start; i < len; i++) {
    const byte = data[i];
    let tmp = CRC_TABLE[crc & 0x0f];
    crc = (crc >> 4) & 0x0fff;
    crc ^= tmp ^ CRC_TABLE[byte & 0x0f];
    tmp = CRC_TABLE[crc & 0x0f];
    crc = (crc >> 4) & 0x0fff;
    crc ^= tmp ^ CRC_TABLE[(byte >> 4) & 0x0f];
  }
  return crc;
}

// ─── Field definitions ────────────────────────────────────────────────────────

interface FitField {
  num: number;   // field definition number
  size: number;  // byte size
  base: number;  // base type byte
}

// file_id message fields (mesg_num 0)
const FILE_ID_FIELDS: FitField[] = [
  { num: 0, size: 1, base: BASE_ENUM   }, // type
  { num: 1, size: 2, base: BASE_UINT16 }, // manufacturer
  { num: 2, size: 2, base: BASE_UINT16 }, // product
  { num: 4, size: 4, base: BASE_UINT32 }, // time_created
];

// workout message fields (mesg_num 26)
// Field numbers verified against FIT SDK Profile.xlsx
const WORKOUT_FIELDS: FitField[] = [
  { num: 4,  size: 1,  base: BASE_ENUM   }, // sport
  { num: 6,  size: 2,  base: BASE_UINT16 }, // num_valid_steps  ← field 6, NOT 8
  { num: 8,  size: 16, base: BASE_STRING }, // wkt_name         ← field 8, null-terminated
  { num: 11, size: 1,  base: BASE_ENUM   }, // sub_sport
];

// workout_step message fields (mesg_num 27)
// Field numbers verified against FIT SDK Profile.xlsx
const WORKOUT_STEP_FIELDS: FitField[] = [
  { num: 254, size: 2, base: BASE_UINT16 }, // message_index
  { num: 1,   size: 1, base: BASE_ENUM   }, // duration_type
  { num: 2,   size: 4, base: BASE_UINT32 }, // duration_value
  { num: 3,   size: 1, base: BASE_ENUM   }, // target_type
  { num: 4,   size: 4, base: BASE_UINT32 }, // target_value (zone number; 0 when custom)
  { num: 5,   size: 4, base: BASE_UINT32 }, // custom_target_value_low
  { num: 6,   size: 4, base: BASE_UINT32 }, // custom_target_value_high
  { num: 7,   size: 1, base: BASE_ENUM   }, // intensity
];

// ─── Message builders ─────────────────────────────────────────────────────────

function buildDefinitionMessage(localMesgNum: number, globalMesgNum: number, fields: FitField[]): Uint8Array {
  // header(1) + reserved(1) + architecture(1) + global_mesg_num(2) + num_fields(1) + fields(3 each)
  const size = 6 + fields.length * 3;
  const buf  = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  let o = 0;
  buf[o++] = 0x40 | (localMesgNum & 0x0f); // definition record header
  buf[o++] = 0;                             // reserved
  buf[o++] = 0;                             // architecture: little-endian
  writeUint16LE(view, o, globalMesgNum); o += 2;
  buf[o++] = fields.length;
  for (const f of fields) {
    buf[o++] = f.num & 0xff;
    buf[o++] = f.size;
    buf[o++] = f.base;
  }
  return buf;
}

function buildFileIdRecord(localMesgNum: number, fitTimestamp: number): Uint8Array {
  // header(1) + type(1) + manufacturer(2) + product(2) + time_created(4)
  const size = 10;
  const buf  = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  let o = 0;
  buf[o++] = localMesgNum & 0x0f;
  buf[o++] = FILE_TYPE_WORKOUT;
  writeUint16LE(view, o, MANUFACTURER_DEVELOPMENT); o += 2;
  writeUint16LE(view, o, PRODUCT_DEVELOPMENT);      o += 2;
  writeUint32LE(view, o, fitTimestamp);             o += 4;
  return buf;
}

function buildWorkoutRecord(
  localMesgNum: number,
  workout: EnduranceWorkout,
  numSteps: number,
): Uint8Array {
  const sport    = FIT_SPORT[workout.sport]    ?? FIT_SPORT.other;
  const subSport = FIT_SUB_SPORT[workout.sub_discipline ?? ''] ?? FIT_SUB_SPORT.generic;

  // wkt_name: 16 bytes, UTF-8, null-padded
  const nameBytes = new Uint8Array(16);
  const enc = new TextEncoder().encode(workout.name.slice(0, 15));
  nameBytes.set(enc);
  // remaining bytes stay 0 (null padding)

  // header(1) + sport(1) + num_valid_steps(2) + wkt_name(16) + sub_sport(1)
  const buf  = new Uint8Array(21);
  const view = new DataView(buf.buffer);
  let o = 0;
  buf[o++] = localMesgNum & 0x0f;
  buf[o++] = sport;
  writeUint16LE(view, o, numSteps); o += 2;
  buf.set(nameBytes, o); o += 16;
  buf[o++] = subSport;
  return buf;
}

/**
 * Map a WorkoutStep to FIT target fields.
 * Power encoding: absolute watts stored as (watts + 1000); %FTP stored as pct (0-100).
 * Custom range: target_value = 0 signals device to use low/high fields instead.
 */
function resolveStepTarget(step: WorkoutStep): {
  targetType: number;
  targetValue: number;
  targetLow: number;
  targetHigh: number;
} {
  if (step.target_type === 'power') {
    if (step.target_zone != null) {
      return { targetType: WKO_TARGET_POWER, targetValue: step.target_zone, targetLow: 0, targetHigh: 0 };
    }
    if (step.target_percent_ftp != null) {
      // %FTP custom range: ±5% band around target, stored as percentage 0-100 (not watts+1000)
      const pct  = Math.round(step.target_percent_ftp);
      const low  = Math.max(0, pct - 5);
      const high = pct + 5;
      return { targetType: WKO_TARGET_POWER_3, targetValue: 0, targetLow: low, targetHigh: high };
    }
    if (step.target_min_value != null && step.target_max_value != null) {
      // Absolute watts range: offset by 1000
      return {
        targetType:  WKO_TARGET_POWER_3,
        targetValue: 0,
        targetLow:   Math.round(step.target_min_value) + 1000,
        targetHigh:  Math.round(step.target_max_value) + 1000,
      };
    }
  }

  if (step.target_type === 'hr') {
    if (step.target_zone != null) {
      return { targetType: WKO_TARGET_HR_ZONE, targetValue: step.target_zone, targetLow: 0, targetHigh: 0 };
    }
    if (step.target_min_value != null && step.target_max_value != null) {
      return {
        targetType:  WKO_TARGET_HR_ZONE,
        targetValue: 0,
        targetLow:   step.target_min_value + 100,
        targetHigh:  step.target_max_value + 100,
      };
    }
  }

  if (step.target_type === 'pace') {
    if (step.target_min_value != null && step.target_max_value != null) {
      // Pace (sec/km) → speed (mm/s): speed = 1_000_000 / pace_sec_per_km
      const speedLow  = step.target_max_value > 0 ? Math.round(1_000_000 / step.target_max_value) : 0;
      const speedHigh = step.target_min_value > 0 ? Math.round(1_000_000 / step.target_min_value) : 0;
      return { targetType: WKO_TARGET_SPEED, targetValue: 0, targetLow: speedLow, targetHigh: speedHigh };
    }
  }

  return { targetType: WKO_TARGET_OPEN, targetValue: 0, targetLow: 0, targetHigh: 0 };
}

function buildWorkoutStepRecord(localMesgNum: number, step: WorkoutStep, index: number): Uint8Array {
  const durationType = step.duration_type === 'distance' ? WKO_DUR_DISTANCE : WKO_DUR_TIME;

  // Duration value:
  //   time-based     → plain seconds (NOT milliseconds)
  //   distance-based → centimetres
  const durationValue = step.duration_type === 'distance'
    ? Math.round(step.duration_value * 100)
    : Math.round(step.duration_value);      // already in seconds from the DB

  const intensity = INTENSITY[step.step_type] ?? INTENSITY.active;
  const { targetType, targetValue, targetLow, targetHigh } = resolveStepTarget(step);

  // header(1) + msg_index(2) + dur_type(1) + dur_value(4) + tgt_type(1) + tgt_value(4) + tgt_low(4) + tgt_high(4) + intensity(1)
  const size = 22;
  const buf  = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  let o = 0;

  buf[o++] = localMesgNum & 0x0f;
  writeUint16LE(view, o, index);              o += 2;
  buf[o++] = durationType;
  writeUint32LE(view, o, durationValue >>> 0); o += 4;
  buf[o++] = targetType;
  writeUint32LE(view, o, targetValue >>> 0);   o += 4;
  writeUint32LE(view, o, targetLow >>> 0);     o += 4;
  writeUint32LE(view, o, targetHigh >>> 0);    o += 4;
  buf[o++] = intensity;

  return buf;
}

/**
 * Expand repeat groups so every individual step has its own workout_step record.
 * FIT supports repeat step types but flat expansion is universally compatible.
 */
function expandSteps(steps: WorkoutStep[]): WorkoutStep[] {
  const groups = new Map<string, WorkoutStep[]>();
  for (const s of steps) {
    if (s.repeat_group_id) {
      if (!groups.has(s.repeat_group_id)) groups.set(s.repeat_group_id, []);
      groups.get(s.repeat_group_id)!.push(s);
    }
  }

  const seen: Set<string> = new Set();
  const expanded: WorkoutStep[] = [];

  for (const s of steps) {
    if (s.repeat_group_id) {
      if (seen.has(s.repeat_group_id)) continue;
      seen.add(s.repeat_group_id);
      const group = groups.get(s.repeat_group_id)!;
      const lead  = group.find(g => g.repeat_times && g.repeat_times > 1) ?? group[0];
      const reps  = lead.repeat_times ?? 1;
      for (let r = 0; r < reps; r++) expanded.push(...group);
    } else {
      expanded.push(s);
    }
  }

  return expanded;
}

/** Unix ms → FIT epoch seconds (FIT epoch = 1989-12-31 00:00:00 UTC) */
function toFitTimestamp(unixMs: number): number {
  return Math.floor(unixMs / 1000) - 631065600;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a valid .FIT structured workout binary from an EnduranceWorkout.
 *
 * File structure:
 *   [14-byte header with header CRC]
 *   [definition: file_id] [data: file_id]
 *   [definition: workout] [data: workout]
 *   [definition: workout_step] [data: workout_step × N]
 *   [2-byte file CRC over header + all data]
 */
export function generateFitFile(workout: EnduranceWorkout): Blob {
  const now   = toFitTimestamp(Date.now());
  const steps = expandSteps(workout.steps ?? []);

  const LM_FILE_ID      = 0;
  const LM_WORKOUT      = 1;
  const LM_WORKOUT_STEP = 2;

  const defFileId   = buildDefinitionMessage(LM_FILE_ID,      MESG_FILE_ID,      FILE_ID_FIELDS);
  const recFileId   = buildFileIdRecord(LM_FILE_ID, now);
  const defWorkout  = buildDefinitionMessage(LM_WORKOUT,      MESG_WORKOUT,      WORKOUT_FIELDS);
  const recWorkout  = buildWorkoutRecord(LM_WORKOUT, workout, steps.length);
  const defStep     = buildDefinitionMessage(LM_WORKOUT_STEP, MESG_WORKOUT_STEP, WORKOUT_STEP_FIELDS);
  const stepRecords = steps.map((s, i) => buildWorkoutStepRecord(LM_WORKOUT_STEP, s, i));

  const dataSize =
    defFileId.length + recFileId.length +
    defWorkout.length + recWorkout.length +
    defStep.length +
    stepRecords.reduce((acc, r) => acc + r.length, 0);

  // 14-byte header (modern, preferred over 12-byte legacy)
  const header = new Uint8Array(14);
  const hView  = new DataView(header.buffer);
  header[0] = 14;                                      // header size
  header[1] = FIT_PROTOCOL_VERSION;
  hView.setUint16(2, FIT_PROFILE_VERSION, true);
  hView.setUint32(4, dataSize, true);                  // data bytes only
  header[8]  = 0x2e; // '.'
  header[9]  = 0x46; // 'F'
  header[10] = 0x49; // 'I'
  header[11] = 0x54; // 'T'
  // Header CRC over bytes 0-11
  const headerCrc = computeCrc(header, 0, 12);
  hView.setUint16(12, headerCrc, true);

  // Assemble: header + messages + 2-byte file CRC
  const totalSize = 14 + dataSize + 2;
  const fileBuf   = new Uint8Array(totalSize);
  let offset = 0;

  const copy = (src: Uint8Array) => { fileBuf.set(src, offset); offset += src.length; };

  copy(header);
  copy(defFileId);
  copy(recFileId);
  copy(defWorkout);
  copy(recWorkout);
  copy(defStep);
  for (const sr of stepRecords) copy(sr);

  // File CRC over header + all data records (everything except the last 2 bytes)
  const fileCrc = computeCrc(fileBuf, 0, offset);
  new DataView(fileBuf.buffer).setUint16(offset, fileCrc, true);

  console.log(
    `[FIT] Generated: ${workout.name} | ${steps.length} steps | ${totalSize} bytes` +
    ` | headerCRC=0x${headerCrc.toString(16)} | fileCRC=0x${fileCrc.toString(16)}`
  );

  return new Blob([fileBuf], { type: 'application/octet-stream' });
}

/** Suggested filename */
export function fitFilename(workout: EnduranceWorkout): string {
  const date = workout.scheduled_date?.replace(/-/g, '') ?? 'workout';
  const name = workout.name.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  return `${date}_${name}.fit`;
}
