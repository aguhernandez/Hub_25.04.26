/**
 * FIT (Flexible and Interoperable Data Transfer) workout file generator.
 *
 * Generates binary .FIT files compatible with:
 * - Garmin Connect / Garmin devices (primary target)
 * - COROS, Suunto, Wahoo, Hammerhead
 * - TrainingPeaks ecosystem
 * - intervals.icu imports
 *
 * FIT Protocol reference: https://developer.garmin.com/fit/
 * This implements FIT 2.0 structured workout messages.
 */

import type { WorkoutStep, EnduranceWorkout } from '../../components/training/EnduranceWorkoutCard';

// ─── FIT Constants ────────────────────────────────────────────────────────────

const FIT_PROTOCOL_VERSION = 0x10; // 1.0
const FIT_PROFILE_VERSION  = 2142; // 21.42 – current ANT/Garmin profile

// Global message numbers (mesg_num)
const MESG_FILE_ID        = 0;
const MESG_WORKOUT        = 26;
const MESG_WORKOUT_STEP   = 27;

// File type (file_id.type)
const FILE_TYPE_WORKOUT = 5;

// Manufacturer & product
const MANUFACTURER_DEVELOPMENT = 255;
const PRODUCT_DEVELOPMENT      = 0;

// Sport values (FIT sport enum)
const FIT_SPORT: Record<string, number> = {
  cycling:   2,
  running:   1,
  swimming:  5,
  strength: 14,
  other:     0,
};

// Sub-sport values
const FIT_SUB_SPORT: Record<string, number> = {
  road:          8,
  mountain:      9,
  track:         11,
  indoor_cycling: 6,
  pool:          22,
  open_water:    47,
  generic:        0,
};

// Workout step duration types
const WKO_DUR_TIME      = 0; // duration in seconds
const WKO_DUR_DISTANCE  = 1; // duration in meters

// Workout step target types
const WKO_TARGET_POWER_ZONE = 6;
const WKO_TARGET_POWER_3Z   = 11; // custom power (3 zones)
const WKO_TARGET_HR_ZONE    = 1;
const WKO_TARGET_CADENCE    = 3;
const WKO_TARGET_SPEED      = 0;
const WKO_TARGET_OPEN       = 0; // no specific target

// Workout step intensity
const INTENSITY: Record<string, number> = {
  warmup:   1,
  cooldown: 2,
  interval: 3,
  recovery: 4,
  steady:   0, // active
  active:   0,
};

// ─── Low-level binary helpers ─────────────────────────────────────────────────

function writeUint8(view: DataView, offset: number, val: number): number {
  view.setUint8(offset, val & 0xff);
  return offset + 1;
}

function writeUint16LE(view: DataView, offset: number, val: number): number {
  view.setUint16(offset, val & 0xffff, true);
  return offset + 2;
}

function writeUint32LE(view: DataView, offset: number, val: number): number {
  view.setUint32(offset, val >>> 0, true);
  return offset + 4;
}

function writeString(buf: Uint8Array, offset: number, str: string, maxLen: number): number {
  const encoded = new TextEncoder().encode(str.slice(0, maxLen - 1));
  buf.set(encoded, offset);
  buf[offset + encoded.length] = 0; // null-terminate
  return offset + maxLen;
}

/** CRC-16 used by FIT (CCITT-16 / CRC-16/ARC) */
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

// ─── Message field definitions ────────────────────────────────────────────────

interface FitField {
  num: number;   // field definition number
  size: number;  // bytes
  base: number;  // base type (0=enum, 1=sint8, 2=uint8, 4=uint16, 6=uint32, 7=string, 10=uint16z, 12=uint32z)
}

// Base type constants
const BASE_ENUM   = 0;
const BASE_UINT8  = 2;
const BASE_UINT16 = 4;
const BASE_UINT32 = 6;
const BASE_STRING = 7;

const FILE_ID_FIELDS: FitField[] = [
  { num: 0, size: 1,  base: BASE_ENUM   }, // type
  { num: 1, size: 2,  base: BASE_UINT16 }, // manufacturer
  { num: 2, size: 2,  base: BASE_UINT16 }, // product
  { num: 4, size: 4,  base: BASE_UINT32 }, // time_created
  { num: 5, size: 2,  base: BASE_UINT16 }, // number (serial-like)
];

const WORKOUT_FIELDS: FitField[] = [
  { num: 4, size: 1,  base: BASE_ENUM   }, // sport
  { num: 8, size: 1,  base: BASE_UINT8  }, // num_valid_steps
  { num: 5, size: 16, base: BASE_STRING }, // wkt_name (max 16 chars + null)
  { num: 11, size: 1, base: BASE_ENUM   }, // sub_sport
];

const WORKOUT_STEP_FIELDS: FitField[] = [
  { num: 254, size: 2, base: BASE_UINT16 }, // message_index
  { num: 0,   size: 1, base: BASE_ENUM   }, // wkt_step_name (enum)
  { num: 1,   size: 1, base: BASE_ENUM   }, // intensity
  { num: 2,   size: 4, base: BASE_UINT32 }, // duration_value
  { num: 3,   size: 1, base: BASE_ENUM   }, // duration_type
  { num: 4,   size: 4, base: BASE_UINT32 }, // target_value
  { num: 5,   size: 1, base: BASE_ENUM   }, // target_type
  { num: 7,   size: 4, base: BASE_UINT32 }, // custom_target_value_low
  { num: 8,   size: 4, base: BASE_UINT32 }, // custom_target_value_high
];

// ─── Message serializers ──────────────────────────────────────────────────────

/** Build a FIT definition message (local message type 0..15) */
function buildDefinitionMessage(localMesgNum: number, globalMesgNum: number, fields: FitField[]): Uint8Array {
  // Record header + reserved + arch + global mesg num + num fields + fields
  const size = 1 + 1 + 1 + 2 + 1 + fields.length * 3;
  const buf = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  let o = 0;
  // Record header: 0x40 = definition message, no dev fields
  buf[o++] = 0x40 | (localMesgNum & 0x0f);
  buf[o++] = 0; // reserved
  buf[o++] = 0; // architecture: little-endian
  writeUint16LE(view, o, globalMesgNum); o += 2;
  buf[o++] = fields.length;
  for (const f of fields) {
    buf[o++] = f.num;
    buf[o++] = f.size;
    buf[o++] = f.base;
  }
  return buf;
}

/** Write a data record for file_id */
function buildFileIdRecord(localMesgNum: number, timestamp: number): Uint8Array {
  const size = 1 + 1 + 2 + 2 + 4 + 2; // header + fields
  const buf = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  let o = 0;
  buf[o++] = localMesgNum & 0x0f; // data record header
  buf[o++] = FILE_TYPE_WORKOUT;
  writeUint16LE(view, o, MANUFACTURER_DEVELOPMENT); o += 2;
  writeUint16LE(view, o, PRODUCT_DEVELOPMENT);      o += 2;
  writeUint32LE(view, o, timestamp);                o += 4;
  writeUint16LE(view, o, 1);                        o += 2; // number
  return buf;
}

/** Write a data record for workout */
function buildWorkoutRecord(
  localMesgNum: number,
  workout: EnduranceWorkout,
  totalSteps: number,
): Uint8Array {
  const sport     = FIT_SPORT[workout.sport]    ?? FIT_SPORT.other;
  const subSport  = FIT_SUB_SPORT[workout.sub_discipline ?? ''] ?? FIT_SUB_SPORT.generic;
  const nameBytes = new Uint8Array(16);
  const enc = new TextEncoder().encode(workout.name.slice(0, 15));
  nameBytes.set(enc);

  const size = 1 + 1 + 1 + 16 + 1; // header + sport + num_valid_steps + wkt_name + sub_sport
  const buf = new Uint8Array(size);
  let o = 0;
  buf[o++] = localMesgNum & 0x0f;
  buf[o++] = sport;
  buf[o++] = totalSteps;
  buf.set(nameBytes, o); o += 16;
  buf[o++] = subSport;
  return buf;
}

/**
 * Expand repeat groups so every individual step has its own FIT workout_step message.
 * FIT does support "repeat" step types, but expanding to flat steps is simpler and
 * universally compatible with all devices.
 */
function expandSteps(steps: WorkoutStep[]): WorkoutStep[] {
  const groupedByRepeat = new Map<string, WorkoutStep[]>();
  for (const s of steps) {
    if (s.repeat_group_id) {
      if (!groupedByRepeat.has(s.repeat_group_id)) groupedByRepeat.set(s.repeat_group_id, []);
      groupedByRepeat.get(s.repeat_group_id)!.push(s);
    }
  }

  const seen = new Set<string>();
  const expanded: WorkoutStep[] = [];

  for (const s of steps) {
    if (s.repeat_group_id) {
      if (seen.has(s.repeat_group_id)) continue;
      seen.add(s.repeat_group_id);
      const group = groupedByRepeat.get(s.repeat_group_id)!;
      const lead  = group.find(g => g.repeat_times && g.repeat_times > 1) || group[0];
      const reps  = lead.repeat_times ?? 1;
      for (let r = 0; r < reps; r++) {
        expanded.push(...group);
      }
    } else {
      expanded.push(s);
    }
  }

  return expanded;
}

/** Map a WorkoutStep to FIT target fields */
function stepTargetFields(step: WorkoutStep): {
  targetType: number;
  targetValue: number;
  targetLow: number;
  targetHigh: number;
} {
  if (step.target_type === 'power') {
    if (step.target_percent_ftp != null) {
      // Custom power percentage – encode in pct * 1000 range as watts range placeholder
      // Garmin: custom power range in 0.1W units. Use zone if available.
      if (step.target_zone != null) {
        return { targetType: WKO_TARGET_POWER_ZONE, targetValue: step.target_zone, targetLow: 0, targetHigh: 0 };
      }
      // Power percentage – encode as custom range (percent of FTP handled by device)
      const pct  = step.target_percent_ftp;
      const low  = Math.round((pct - 5) * 1000) + 1000; // FIT power 0.1W units, offset 1000
      const high = Math.round((pct + 5) * 1000) + 1000;
      return { targetType: WKO_TARGET_POWER_3Z, targetValue: 0, targetLow: low, targetHigh: high };
    }
    if (step.target_zone != null) {
      return { targetType: WKO_TARGET_POWER_ZONE, targetValue: step.target_zone, targetLow: 0, targetHigh: 0 };
    }
    if (step.target_min_value != null && step.target_max_value != null) {
      return {
        targetType: WKO_TARGET_POWER_3Z,
        targetValue: 0,
        targetLow:  Math.round(step.target_min_value * 1000) + 1000,
        targetHigh: Math.round(step.target_max_value * 1000) + 1000,
      };
    }
  }

  if (step.target_type === 'hr') {
    if (step.target_zone != null) {
      return { targetType: WKO_TARGET_HR_ZONE, targetValue: step.target_zone, targetLow: 0, targetHigh: 0 };
    }
    if (step.target_min_value != null && step.target_max_value != null) {
      return {
        targetType: WKO_TARGET_HR_ZONE,
        targetValue: 0,
        targetLow:  step.target_min_value + 100, // FIT HR zone units (offset by 100 bpm)
        targetHigh: step.target_max_value + 100,
      };
    }
  }

  if (step.target_type === 'pace') {
    // Convert pace (sec/km) to speed (mm/s) for FIT
    if (step.target_min_value != null && step.target_max_value != null) {
      const speedLow  = step.target_max_value > 0 ? Math.round(1_000_000 / step.target_max_value) : 0;
      const speedHigh = step.target_min_value > 0 ? Math.round(1_000_000 / step.target_min_value) : 0;
      return { targetType: WKO_TARGET_SPEED, targetValue: 0, targetLow: speedLow, targetHigh: speedHigh };
    }
  }

  return { targetType: WKO_TARGET_OPEN, targetValue: 0, targetLow: 0, targetHigh: 0 };
}

/** Build a FIT workout_step data record */
function buildWorkoutStepRecord(localMesgNum: number, step: WorkoutStep, index: number): Uint8Array {
  const durationType = step.duration_type === 'distance' ? WKO_DUR_DISTANCE : WKO_DUR_TIME;
  const durationValue = step.duration_type === 'distance'
    ? Math.round(step.duration_value * 100)   // FIT distance: cm
    : step.duration_value * 1000;              // FIT time: milliseconds

  const intensity = INTENSITY[step.step_type] ?? INTENSITY.steady;
  const { targetType, targetValue, targetLow, targetHigh } = stepTargetFields(step);

  // Size: header(1) + msg_index(2) + step_name(1) + intensity(1) + dur_value(4) + dur_type(1) + tgt_value(4) + tgt_type(1) + tgt_low(4) + tgt_high(4)
  const size = 1 + 2 + 1 + 1 + 4 + 1 + 4 + 1 + 4 + 4;
  const buf  = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  let o = 0;

  buf[o++] = localMesgNum & 0x0f;
  writeUint16LE(view, o, index); o += 2;
  buf[o++] = 0;          // wkt_step_name enum (0 = generic)
  buf[o++] = intensity;
  writeUint32LE(view, o, durationValue >>> 0); o += 4;
  buf[o++] = durationType;
  writeUint32LE(view, o, targetValue >>> 0);   o += 4;
  buf[o++] = targetType;
  writeUint32LE(view, o, targetLow >>> 0);     o += 4;
  writeUint32LE(view, o, targetHigh >>> 0);    o += 4;

  return buf;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Convert unix epoch to FIT epoch (seconds since 1989-12-31 00:00:00 UTC) */
function toFitTimestamp(unixMs: number): number {
  const FIT_EPOCH_OFFSET = 631065600; // unix epoch of 1989-12-31 00:00:00 UTC
  return Math.floor(unixMs / 1000) - FIT_EPOCH_OFFSET;
}

/**
 * Generate a valid .FIT structured workout file from an EnduranceWorkout.
 * Returns a Blob that can be saved or shared.
 */
export function generateFitFile(workout: EnduranceWorkout): Blob {
  const now         = toFitTimestamp(Date.now());
  const steps       = expandSteps(workout.steps ?? []);

  // Local message numbers (arbitrary, must match between def + data records)
  const LM_FILE_ID       = 0;
  const LM_WORKOUT       = 1;
  const LM_WORKOUT_STEP  = 2;

  // Build message buffers
  const defFileId    = buildDefinitionMessage(LM_FILE_ID, MESG_FILE_ID, FILE_ID_FIELDS);
  const recFileId    = buildFileIdRecord(LM_FILE_ID, now);
  const defWorkout   = buildDefinitionMessage(LM_WORKOUT, MESG_WORKOUT, WORKOUT_FIELDS);
  const recWorkout   = buildWorkoutRecord(LM_WORKOUT, workout, steps.length);
  const defStep      = buildDefinitionMessage(LM_WORKOUT_STEP, MESG_WORKOUT_STEP, WORKOUT_STEP_FIELDS);

  const stepRecords: Uint8Array[] = steps.map((s, i) =>
    buildWorkoutStepRecord(LM_WORKOUT_STEP, s, i)
  );

  // Calculate total data bytes (excluding 12-byte file header + 2-byte CRC)
  const dataSize =
    defFileId.length + recFileId.length +
    defWorkout.length + recWorkout.length +
    defStep.length +
    stepRecords.reduce((s, r) => s + r.length, 0);

  // FIT file header (12 bytes)
  const header = new Uint8Array(12);
  const hView  = new DataView(header.buffer);
  header[0] = 12;                        // header size
  header[1] = FIT_PROTOCOL_VERSION;
  hView.setUint16(2, FIT_PROFILE_VERSION, true);
  hView.setUint32(4, dataSize, true);    // data length (not including header or CRC)
  header[8]  = 0x2e; // '.'
  header[9]  = 0x46; // 'F'
  header[10] = 0x49; // 'I'
  header[11] = 0x54; // 'T'
  // Header CRC (bytes 0-9) is embedded in bytes 10-11 for 14-byte headers;
  // for 12-byte headers no header CRC is used.

  // Assemble full file (without trailing CRC)
  const totalSize = 12 + dataSize + 2;
  const fileBuf   = new Uint8Array(totalSize);
  let offset      = 0;

  const copy = (src: Uint8Array) => { fileBuf.set(src, offset); offset += src.length; };

  copy(header);
  copy(defFileId);
  copy(recFileId);
  copy(defWorkout);
  copy(recWorkout);
  copy(defStep);
  for (const sr of stepRecords) copy(sr);

  // Compute trailing CRC over header + data bytes
  const crc = computeCrc(fileBuf, 0, offset);
  const crcView = new DataView(fileBuf.buffer);
  crcView.setUint16(offset, crc, true);

  return new Blob([fileBuf], { type: 'application/octet-stream' });
}

/** Suggested filename for a workout FIT file */
export function fitFilename(workout: EnduranceWorkout): string {
  const date = workout.scheduled_date?.replace(/-/g, '') || 'workout';
  const name = workout.name.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  return `${date}_${name}.fit`;
}
