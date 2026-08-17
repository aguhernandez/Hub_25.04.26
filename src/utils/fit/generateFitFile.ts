/**
 * FIT (Flexible and Interoperable Data Transfer) structured workout file generator.
 *
 * Generates binary .FIT files compatible with:
 * - Garmin devices (direct USB copy to GARMIN/NewFiles/)
 * - Wahoo Elemnt, COROS, Magene, Hammerhead, Suunto
 * - TrainingPeaks / intervals.icu workout library import
 *
 * IMPORTANT — Garmin Connect upload endpoint returns 406:
 * The /upload-service/upload endpoint ONLY accepts activity FIT files (file_type=4).
 * It intentionally rejects workout FIT files (file_type=5) with HTTP 406.
 * This is a permanent Garmin policy, not a file format bug.
 * To load onto a Garmin device: copy to GARMIN/NewFiles/ via USB.
 * intervals.icu: use Workout Library → ··· → Import Workout (NOT the Upload/activity button).
 *
 * FIT Protocol reference: https://developer.garmin.com/fit/
 * All field numbers, enum values, and base types verified against FIT SDK Profile v21.202.0
 * (github.com/garmin/fit-javascript-sdk, profile.js).
 */

import type { WorkoutStep, EnduranceWorkout } from '../../components/training/EnduranceWorkoutCard';

// ─── FIT Protocol / Profile constants ────────────────────────────────────────

const FIT_PROTOCOL_VERSION = 0x20; // Protocol 2.0
const FIT_PROFILE_VERSION  = 2100; // Profile 21.00 — broadly compatible with all devices

// Global message numbers (FIT SDK Profile mesg_num)
const MESG_FILE_ID      = 0;
const MESG_WORKOUT      = 26;
const MESG_WORKOUT_STEP = 27;

// file_id.type enum value for workout files
const FILE_TYPE_WORKOUT = 5;

// Manufacturer / product IDs
const MANUFACTURER_DEVELOPMENT = 255; // Reserved for non-registered developers
const PRODUCT_DEVELOPMENT      = 0;

// ─── Sport / sub-sport enums (FIT Profile sport / subSport) ──────────────────

const FIT_SPORT: Record<string, number> = {
  cycling:   2,
  running:   1,
  swimming:  5,
  strength: 14,
  other:     0,
};

const FIT_SUB_SPORT: Record<string, number> = {
  road:            8,
  mountain:        9,
  track:          11,
  indoor_cycling:  6,
  pool:           22,
  open_water:     47,
  generic:         0,
};

// ─── workout_step enums (FIT Profile, all verified from profile.js) ───────────

// duration_type (field 1) — WktStepDuration enum
const WKO_DUR_TIME     = 0; // duration_value in seconds
const WKO_DUR_DISTANCE = 1; // duration_value in centimetres

// target_type (field 3) — WktStepTarget enum
// VERIFIED from profile.js WktStepTarget:
//   0=speed, 1=heartRate, 2=open, 3=cadence, 4=power, 5=grade,
//   6=resistance, 7=power3s, 8=power10s, 9=power30s, 10=powerLap,
//   11=swimStroke, 12=speedLap, 13=heartRateLap
const WKO_TARGET_SPEED  = 0;
const WKO_TARGET_HR     = 1;
const WKO_TARGET_OPEN   = 2; // no target
const WKO_TARGET_CADENCE = 3;
const WKO_TARGET_POWER  = 4;
// NOTE: value 11 = swimStroke. There is no separate "custom power range" enum.
// Custom ranges always use target_type=4 (power) or target_type=1 (hr) with
// targetValue=0 to signal the device to use customTargetValueLow/High instead.

// intensity (field 7) — Intensity enum
// VERIFIED from profile.js Intensity: 0=active, 1=rest, 2=warmup, 3=cooldown, 4=recovery
const INTENSITY: Record<string, number> = {
  active:   0,
  steady:   0,
  interval: 0,
  rest:     1,
  warmup:   2,
  cooldown: 3,
  recovery: 4,
};

// ─── Base type bytes (FIT field definition records) ──────────────────────────
// Format: bit 7 = endian flag, bits 4-0 = type id
// These are the base type identifier bytes used in definition message field entries.

const BASE_ENUM   = 0x00; // 1 byte, unsigned
const BASE_UINT8  = 0x02; // 1 byte, unsigned
const BASE_UINT16 = 0x84; // 2 bytes, little-endian (0x80 | 0x04)
const BASE_UINT32 = 0x86; // 4 bytes, little-endian (0x80 | 0x06)
const BASE_STRING = 0x07; // variable length, null-terminated

// ─── Low-level binary write helpers ──────────────────────────────────────────

function writeUint16LE(view: DataView, offset: number, val: number): number {
  view.setUint16(offset, val & 0xffff, true);
  return offset + 2;
}

function writeUint32LE(view: DataView, offset: number, val: number): number {
  view.setUint32(offset, val >>> 0, true);
  return offset + 4;
}

// ─── FIT CRC-16 ───────────────────────────────────────────────────────────────
// Algorithm: CRC-16 with Garmin FIT lookup table as specified in FitCRC_Get16().
// File CRC covers ALL bytes from byte 0 to the last data byte (header included),
// excluding the 2-byte CRC itself.

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

// ─── Field definition types ───────────────────────────────────────────────────

interface FitField {
  num:  number; // field definition number
  size: number; // byte size of this field in data records
  base: number; // base type byte
}

// ─── Message field definitions ────────────────────────────────────────────────
// Verified against FIT SDK Profile v21.202.0 Profile.xlsx / profile.js

// file_id (mesg_num=0)
const FILE_ID_FIELDS: FitField[] = [
  { num: 0, size: 1, base: BASE_ENUM   }, // type
  { num: 1, size: 2, base: BASE_UINT16 }, // manufacturer
  { num: 2, size: 2, base: BASE_UINT16 }, // product
  { num: 4, size: 4, base: BASE_UINT32 }, // time_created
];

// workout (mesg_num=26)
// Field numbers: sport=4, num_valid_steps=6, wkt_name=8, sub_sport=11
const WORKOUT_FIELDS: FitField[] = [
  { num: 4,  size: 1,  base: BASE_ENUM   }, // sport
  { num: 6,  size: 2,  base: BASE_UINT16 }, // num_valid_steps
  { num: 8,  size: 16, base: BASE_STRING }, // wkt_name (15 chars + null terminator)
  { num: 11, size: 1,  base: BASE_ENUM   }, // sub_sport
];

// workout_step (mesg_num=27)
// Field numbers verified from profile.js:
//   254=message_index, 1=duration_type, 2=duration_value,
//   3=target_type, 4=target_value, 5=custom_target_value_low,
//   6=custom_target_value_high, 7=intensity
const WORKOUT_STEP_FIELDS: FitField[] = [
  { num: 254, size: 2, base: BASE_UINT16 }, // message_index (0-based sequential)
  { num: 1,   size: 1, base: BASE_ENUM   }, // duration_type
  { num: 2,   size: 4, base: BASE_UINT32 }, // duration_value
  { num: 3,   size: 1, base: BASE_ENUM   }, // target_type
  { num: 4,   size: 4, base: BASE_UINT32 }, // target_value (zone number; 0 = use custom range)
  { num: 5,   size: 4, base: BASE_UINT32 }, // custom_target_value_low
  { num: 6,   size: 4, base: BASE_UINT32 }, // custom_target_value_high
  { num: 7,   size: 1, base: BASE_ENUM   }, // intensity
];

// ─── Message serializers ──────────────────────────────────────────────────────

/** Build a FIT definition message (local message type 0..15) */
function buildDefinitionMessage(
  localMesgNum: number,
  globalMesgNum: number,
  fields: FitField[],
): Uint8Array {
  // layout: record_header(1) + reserved(1) + architecture(1) + global_mesg_num(2) + num_fields(1) + fields(3 each)
  const buf  = new Uint8Array(6 + fields.length * 3);
  const view = new DataView(buf.buffer);
  let o = 0;
  buf[o++] = 0x40 | (localMesgNum & 0x0f); // definition message, local msg num
  buf[o++] = 0;                             // reserved
  buf[o++] = 0;                             // architecture: 0=little-endian
  writeUint16LE(view, o, globalMesgNum); o += 2;
  buf[o++] = fields.length;
  for (const f of fields) {
    buf[o++] = f.num & 0xff; // field definition number (254 → 0xFE, valid)
    buf[o++] = f.size;
    buf[o++] = f.base;
  }
  return buf;
}

/** Build a file_id data record */
function buildFileIdRecord(localMesgNum: number, fitTimestamp: number): Uint8Array {
  // data record layout matches FILE_ID_FIELDS exactly:
  // record_header(1) + type(1) + manufacturer(2) + product(2) + time_created(4) = 10 bytes
  const buf  = new Uint8Array(10);
  const view = new DataView(buf.buffer);
  let o = 0;
  buf[o++] = localMesgNum & 0x0f; // data record header
  buf[o++] = FILE_TYPE_WORKOUT;
  writeUint16LE(view, o, MANUFACTURER_DEVELOPMENT); o += 2;
  writeUint16LE(view, o, PRODUCT_DEVELOPMENT);      o += 2;
  writeUint32LE(view, o, fitTimestamp);             o += 4;
  return buf;
}

/** Build a workout data record */
function buildWorkoutRecord(
  localMesgNum: number,
  workout: EnduranceWorkout,
  numSteps: number,
): Uint8Array {
  const sport    = FIT_SPORT[workout.sport]    ?? FIT_SPORT.other;
  const subSport = FIT_SUB_SPORT[workout.sub_discipline ?? ''] ?? FIT_SUB_SPORT.generic;

  // wkt_name: exactly 16 bytes (15 usable chars + mandatory null terminator)
  const nameBytes = new Uint8Array(16); // zero-filled → null-padded
  const encoded   = new TextEncoder().encode(workout.name.slice(0, 15));
  nameBytes.set(encoded);

  // data record layout matches WORKOUT_FIELDS exactly:
  // record_header(1) + sport(1) + num_valid_steps(2) + wkt_name(16) + sub_sport(1) = 21 bytes
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
 * Resolve the FIT target fields for a workout step.
 *
 * Power encoding (workoutPower type in FIT profile):
 *   values   0-999  → %FTP (e.g. 80 = 80% FTP)
 *   values 1000+    → absolute watts with +1000 offset (e.g. 1250 = 250 W)
 *   targetValue = 0 signals device to read customTargetValueLow/High instead of a zone.
 *
 * HR encoding (workoutHr type):
 *   values   0-99   → %max HR (e.g. 75 = 75%)
 *   values 100+     → absolute BPM with +100 offset (e.g. 250 = 150 bpm)
 *
 * Speed encoding (m/s × 1000):
 *   e.g. 4.0 m/s → 4000
 *
 * Cadence: direct RPM value.
 *
 * When using a zone number (not a custom range):
 *   targetValue = zone number, customTargetValueLow = customTargetValueHigh = 0.
 */
function resolveStepTarget(step: WorkoutStep): {
  targetType:  number;
  targetValue: number;
  targetLow:   number;
  targetHigh:  number;
} {
  // ── Power ────────────────────────────────────────────────────────────────
  if (step.target_type === 'power') {
    if (step.target_zone != null) {
      // Zone-based: target_value = zone number, custom fields = 0
      return { targetType: WKO_TARGET_POWER, targetValue: step.target_zone, targetLow: 0, targetHigh: 0 };
    }
    if (step.target_percent_ftp != null) {
      // %FTP custom range: ±5 % band, encoded as raw percentage 0-999
      const pct  = Math.round(step.target_percent_ftp);
      const low  = Math.max(0, pct - 5);
      const high = Math.min(999, pct + 5);
      // targetValue = 0 → device reads low/high
      return { targetType: WKO_TARGET_POWER, targetValue: 0, targetLow: low, targetHigh: high };
    }
    if (step.target_min_value != null && step.target_max_value != null) {
      // Absolute watts range: encode as watts + 1000 offset
      return {
        targetType:  WKO_TARGET_POWER,
        targetValue: 0,
        targetLow:   Math.round(step.target_min_value) + 1000,
        targetHigh:  Math.round(step.target_max_value) + 1000,
      };
    }
  }

  // ── Heart rate ───────────────────────────────────────────────────────────
  if (step.target_type === 'hr') {
    if (step.target_zone != null) {
      return { targetType: WKO_TARGET_HR, targetValue: step.target_zone, targetLow: 0, targetHigh: 0 };
    }
    if (step.target_min_value != null && step.target_max_value != null) {
      // Absolute BPM range: encode as bpm + 100 offset
      return {
        targetType:  WKO_TARGET_HR,
        targetValue: 0,
        targetLow:   Math.round(step.target_min_value) + 100,
        targetHigh:  Math.round(step.target_max_value) + 100,
      };
    }
  }

  // ── Pace → speed ─────────────────────────────────────────────────────────
  if (step.target_type === 'pace') {
    if (step.target_min_value != null && step.target_max_value != null) {
      // pace in sec/km → speed in m/s → encoded as m/s × 1000
      // faster pace (lower sec/km) = higher speed → low/high swap
      const speedLow  = step.target_max_value > 0
        ? Math.round((1000 / step.target_max_value) * 1000)
        : 0;
      const speedHigh = step.target_min_value > 0
        ? Math.round((1000 / step.target_min_value) * 1000)
        : 0;
      return { targetType: WKO_TARGET_SPEED, targetValue: 0, targetLow: speedLow, targetHigh: speedHigh };
    }
  }

  // ── Cadence ──────────────────────────────────────────────────────────────
  if (step.target_type === 'cadence') {
    if (step.target_min_value != null && step.target_max_value != null) {
      return {
        targetType:  WKO_TARGET_CADENCE,
        targetValue: 0,
        targetLow:   Math.round(step.target_min_value),
        targetHigh:  Math.round(step.target_max_value),
      };
    }
  }

  // ── No target (open) ─────────────────────────────────────────────────────
  return { targetType: WKO_TARGET_OPEN, targetValue: 0, targetLow: 0, targetHigh: 0 };
}

/** Build a workout_step data record */
function buildWorkoutStepRecord(
  localMesgNum: number,
  step: WorkoutStep,
  index: number,
): Uint8Array {
  const durationType = step.duration_type === 'distance' ? WKO_DUR_DISTANCE : WKO_DUR_TIME;

  // Duration value encoding:
  //   time-based:     seconds (plain integer — NOT milliseconds)
  //   distance-based: centimetres (metres × 100)
  const durationValue = step.duration_type === 'distance'
    ? Math.round(step.duration_value * 100)
    : Math.max(1, Math.round(step.duration_value)); // at least 1 second

  const intensity = INTENSITY[step.step_type] ?? INTENSITY.active;
  const { targetType, targetValue, targetLow, targetHigh } = resolveStepTarget(step);

  // data record layout matches WORKOUT_STEP_FIELDS exactly:
  // record_header(1) + msg_index(2) + dur_type(1) + dur_value(4) +
  // tgt_type(1) + tgt_value(4) + tgt_low(4) + tgt_high(4) + intensity(1) = 22 bytes
  const buf  = new Uint8Array(22);
  const view = new DataView(buf.buffer);
  let o = 0;

  buf[o++] = localMesgNum & 0x0f;
  writeUint16LE(view, o, index);               o += 2;
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
 * Expand repeat groups: each group is duplicated repeat_times times.
 * Flat expansion is used for universal device compatibility.
 * FIT supports native repeat steps but many devices/platforms handle them inconsistently.
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
  const result: WorkoutStep[] = [];

  for (const s of steps) {
    if (s.repeat_group_id) {
      if (seen.has(s.repeat_group_id)) continue;
      seen.add(s.repeat_group_id);
      const group = groups.get(s.repeat_group_id)!;
      const lead  = group.find(g => (g.repeat_times ?? 0) > 1) ?? group[0];
      const reps  = lead.repeat_times ?? 1;
      for (let r = 0; r < reps; r++) result.push(...group);
    } else {
      result.push(s);
    }
  }

  return result;
}

/** Unix timestamp (ms) → FIT epoch (seconds since 1989-12-31 00:00:00 UTC) */
function toFitTimestamp(unixMs: number): number {
  return Math.floor(unixMs / 1000) - 631065600;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a valid .FIT structured workout binary (file_type=5).
 *
 * File layout:
 *   [14-byte header with header CRC at bytes 12-13]
 *   [definition: file_id (local 0)]   [data: file_id]
 *   [definition: workout  (local 1)]  [data: workout]
 *   [definition: workout_step (local 2)] [data: workout_step × N]
 *   [2-byte file CRC over entire file content above]
 *
 * Required messages per FIT spec for file_type=5: file_id, workout, workout_step.
 * No Session, Activity, Event, or Schedule messages — those belong to other file types.
 */
export function generateFitFile(workout: EnduranceWorkout): Blob {
  const fitNow = toFitTimestamp(Date.now());
  const steps  = expandSteps(workout.steps ?? []);

  // Local message numbers (arbitrary 0-15, must match definition ↔ data pairs)
  const LM_FILE_ID      = 0;
  const LM_WORKOUT      = 1;
  const LM_WORKOUT_STEP = 2;

  const defFileId   = buildDefinitionMessage(LM_FILE_ID,      MESG_FILE_ID,      FILE_ID_FIELDS);
  const recFileId   = buildFileIdRecord(LM_FILE_ID, fitNow);
  const defWorkout  = buildDefinitionMessage(LM_WORKOUT,      MESG_WORKOUT,      WORKOUT_FIELDS);
  const recWorkout  = buildWorkoutRecord(LM_WORKOUT, workout, steps.length);
  const defStep     = buildDefinitionMessage(LM_WORKOUT_STEP, MESG_WORKOUT_STEP, WORKOUT_STEP_FIELDS);
  const stepRecords = steps.map((s, i) => buildWorkoutStepRecord(LM_WORKOUT_STEP, s, i));

  // data_size = all definition + data record bytes (excludes header and trailing CRC)
  const dataSize =
    defFileId.length + recFileId.length +
    defWorkout.length + recWorkout.length +
    defStep.length +
    stepRecords.reduce((acc, r) => acc + r.length, 0);

  // ── 14-byte file header ──────────────────────────────────────────────────
  const header = new Uint8Array(14);
  const hView  = new DataView(header.buffer);
  header[0] = 14;                                   // header_size
  header[1] = FIT_PROTOCOL_VERSION;
  hView.setUint16(2, FIT_PROFILE_VERSION, true);    // profile_version LE
  hView.setUint32(4, dataSize, true);               // data_size LE (records only)
  header[8]  = 0x2e; // '.'
  header[9]  = 0x46; // 'F'
  header[10] = 0x49; // 'I'
  header[11] = 0x54; // 'T'
  // Header CRC over bytes 0-11 → stored at bytes 12-13
  const headerCrc = computeCrc(header, 0, 12);
  hView.setUint16(12, headerCrc, true);

  // ── Assemble file buffer ─────────────────────────────────────────────────
  const totalSize = 14 + dataSize + 2; // header + data + trailing CRC
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

  // File CRC over bytes 0..(offset-1) — all header + data, before the CRC itself
  const fileCrc = computeCrc(fileBuf, 0, offset);
  new DataView(fileBuf.buffer).setUint16(offset, fileCrc, true);

  console.log(
    `[FIT] ${workout.name} | steps=${steps.length} | bytes=${totalSize}` +
    ` | hdrCRC=0x${headerCrc.toString(16).padStart(4,'0')}` +
    ` | fileCRC=0x${fileCrc.toString(16).padStart(4,'0')}`
  );

  return new Blob([fileBuf], { type: 'application/octet-stream' });
}

/** Suggested filename for a workout FIT file */
export function fitFilename(workout: EnduranceWorkout): string {
  const date = workout.scheduled_date?.replace(/-/g, '') ?? 'workout';
  const name = workout.name.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  return `${date}_${name}.fit`;
}
