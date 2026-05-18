export interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy?: number;
}

export interface ActivityRecording {
  gpsPoints: GPSPoint[];
  startTime: number;
  endTime?: number;
}

const EARTH_RADIUS_KM = 6371;

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!isFinite(lat1) || !isFinite(lon1) || !isFinite(lat2) || !isFinite(lon2)) return 0;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function calculateTotalDistance(points: GPSPoint[]): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude
    );
    totalDistance += distance;
  }

  return totalDistance;
}

export function calculateElevationGain(points: GPSPoint[]): number {
  if (points.length < 2) return 0;

  let elevationGain = 0;
  for (let i = 1; i < points.length; i++) {
    const altDiff = (points[i].altitude || 0) - (points[i - 1].altitude || 0);
    if (altDiff > 0) {
      elevationGain += altDiff;
    }
  }

  return elevationGain;
}

export function calculateDuration(startTime: number, endTime: number): number {
  return Math.floor((endTime - startTime) / 1000);
}

export function calculateAverageSpeed(
  distanceKm: number,
  durationSeconds: number
): number {
  if (durationSeconds === 0) return 0;
  const hours = durationSeconds / 3600;
  return distanceKm / hours;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

// ── GPS FILTERING ─────────────────────────────────────────────────────────────

/**
 * Hard accuracy ceiling (meters). Points worse than this are always dropped.
 * Tighter than before — 50m is enough for running precision.
 */
const MAX_ACCURACY_M = 50;

/**
 * Absolute max speed in km/h for any supported sport.
 */
const ABS_MAX_SPEED_KMH = 150;

/**
 * Minimum movement in metres required before a point is added.
 * 2m is fine for running where each stride is ~1.5-2.5m.
 */
const MIN_DISTANCE_M = 2;

/**
 * EMA smoothing alpha. 0.7 = 70% new value, 30% historical.
 * More smoothing than before to suppress per-step GPS jitter.
 */
const SMOOTHING_ALPHA = 0.7;

/**
 * Number of initial "stabilisation" raw positions to collect before
 * committing the first track point. We pick the most accurate one.
 */
const STABILISATION_COUNT = 5;

/**
 * After this many seconds without an accepted point (pause/tunnel),
 * re-enter stabilisation mode. Longer gap for running (underpass, etc).
 */
const RESET_AFTER_GAP_S = 20;

/**
 * Consecutive outlier rejections before we force-accept a point.
 * Prevents lock-out if phone is moving but GPS is consistently drifting.
 */
const MAX_CONSECUTIVE_REJECTS = 8;

interface RawCandidate {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  timestamp: number;
}

export class GPSFilter {
  private sportMaxSpeedKmh: number;

  private stabilBuffer: RawCandidate[] = [];
  private stabilised = false;

  private lastAccepted: GPSPoint | null = null;

  private smoothLat: number | null = null;
  private smoothLon: number | null = null;

  private consecutiveRejects = 0;

  constructor(sportMaxSpeedKmh = ABS_MAX_SPEED_KMH) {
    this.sportMaxSpeedKmh = Math.min(sportMaxSpeedKmh, ABS_MAX_SPEED_KMH);
  }

  process(position: GeolocationPosition): GPSPoint | null {
    const { latitude, longitude, altitude, accuracy } = position.coords;
    const timestamp = position.timestamp;
    const acc = accuracy ?? 999;

    // Hard accuracy gate
    if (acc > MAX_ACCURACY_M) {
      this.consecutiveRejects++;
      return null;
    }

    // ── Phase 1: Stabilisation ───────────────────────────────────────────────
    if (!this.stabilised) {
      this.stabilBuffer.push({ latitude, longitude, altitude, accuracy: acc, timestamp });

      if (this.stabilBuffer.length < STABILISATION_COUNT) {
        return null;
      }

      // Pick the candidate with the best (lowest) accuracy value
      const best = this.stabilBuffer.reduce((a, b) => a.accuracy < b.accuracy ? a : b);
      this.stabilBuffer = [];
      this.stabilised = true;
      this.consecutiveRejects = 0;

      const point: GPSPoint = {
        latitude: best.latitude,
        longitude: best.longitude,
        altitude: best.altitude ?? undefined,
        timestamp: best.timestamp,
        accuracy: best.accuracy,
      };
      this.lastAccepted = point;
      this.smoothLat = best.latitude;
      this.smoothLon = best.longitude;
      return point;
    }

    // ── Phase 2: Normal tracking ─────────────────────────────────────────────

    const last = this.lastAccepted!;
    const dtSeconds = (timestamp - last.timestamp) / 1000;

    // Long gap → re-enter stabilisation
    if (dtSeconds > RESET_AFTER_GAP_S) {
      this.stabilised = false;
      this.stabilBuffer = [{ latitude, longitude, altitude, accuracy: acc, timestamp }];
      this.lastAccepted = null;
      this.smoothLat = null;
      this.smoothLon = null;
      this.consecutiveRejects = 0;
      return null;
    }

    // Speed gate
    if (dtSeconds > 0) {
      const distKm = calculateDistance(last.latitude, last.longitude, latitude, longitude);
      const speedKmh = (distKm / dtSeconds) * 3600;

      if (speedKmh > this.sportMaxSpeedKmh) {
        this.consecutiveRejects++;

        if (this.consecutiveRejects >= MAX_CONSECUTIVE_REJECTS) {
          // Force-accept to avoid lock-out after too many consecutive rejects
          this.consecutiveRejects = 0;
          this.lastAccepted = { latitude, longitude, altitude: altitude ?? undefined, timestamp, accuracy: acc };
          this.smoothLat = latitude;
          this.smoothLon = longitude;
          // Fall through — return the point so track doesn't freeze
          const point: GPSPoint = {
            latitude, longitude,
            altitude: altitude ?? undefined,
            timestamp,
            accuracy: acc,
          };
          return point;
        }

        // Update timestamp reference so next point's dt is computed correctly,
        // but do NOT commit this bad coordinate to the track
        this.lastAccepted = { ...last, timestamp };
        return null;
      }
    }

    // Minimum distance gate
    const distM = calculateDistance(last.latitude, last.longitude, latitude, longitude) * 1000;
    if (distM < MIN_DISTANCE_M) {
      return null;
    }

    // Reset reject counter on good point
    this.consecutiveRejects = 0;

    // EMA smoothing — adaptive alpha based on accuracy
    // Better accuracy = trust the new point more
    const adaptiveAlpha = acc <= 10
      ? 0.85
      : acc <= 20
        ? SMOOTHING_ALPHA
        : 0.55;

    const sLat = this.smoothLat !== null
      ? adaptiveAlpha * latitude + (1 - adaptiveAlpha) * this.smoothLat
      : latitude;
    const sLon = this.smoothLon !== null
      ? adaptiveAlpha * longitude + (1 - adaptiveAlpha) * this.smoothLon
      : longitude;

    this.smoothLat = sLat;
    this.smoothLon = sLon;

    const point: GPSPoint = {
      latitude: sLat,
      longitude: sLon,
      altitude: altitude ?? undefined,
      timestamp,
      accuracy: acc,
    };

    this.lastAccepted = point;
    return point;
  }

  reset() {
    this.stabilised = false;
    this.stabilBuffer = [];
    this.lastAccepted = null;
    this.smoothLat = null;
    this.smoothLon = null;
    this.consecutiveRejects = 0;
  }
}

// ── WATCH POSITION ────────────────────────────────────────────────────────────

let _isNativeCapacitor: boolean | null = null;

async function checkNativeCapacitor(): Promise<boolean> {
  if (_isNativeCapacitor !== null) return _isNativeCapacitor;
  try {
    const { Capacitor } = await import('@capacitor/core');
    _isNativeCapacitor = Capacitor.isNativePlatform();
  } catch {
    _isNativeCapacitor = false;
  }
  return _isNativeCapacitor;
}

function capacitorPositionToGeolocation(pos: any): GeolocationPosition {
  return {
    coords: {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      altitude: pos.coords.altitude ?? null,
      accuracy: pos.coords.accuracy,
      altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
      heading: pos.coords.heading ?? null,
      speed: pos.coords.speed ?? null,
    },
    timestamp: pos.timestamp,
    toJSON() { return this; },
  } as GeolocationPosition;
}

let _capacitorWatchId: string | null = null;

export async function getGPSWatchPositionAsync(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void,
): Promise<number> {
  const isNative = await checkNativeCapacitor();

  if (isNative) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');

      // Capacitor v7: watchPosition returns a string CallbackID
      const callbackId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (result, err) => {
          if (err) {
            onError({
              code: 2,
              message: err?.message || 'GPS error',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
            return;
          }
          if (result && result.coords) {
            onSuccess(capacitorPositionToGeolocation(result));
          }
        }
      );

      _capacitorWatchId = callbackId;
      return -1; // Special value indicating Capacitor watch
    } catch (error) {
      console.debug('Capacitor watchPosition failed, using web geolocation', error);
    }
  }

  // Web fallback
  return navigator.geolocation.watchPosition(onSuccess, onError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });
}

export function getGPSWatchPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void,
  options?: PositionOptions
): number {
  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    ...options,
  };

  return navigator.geolocation.watchPosition(onSuccess, onError, defaultOptions);
}

export async function clearGPSWatchAsync(watchId: number): Promise<void> {
  if (_capacitorWatchId !== null) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.clearWatch({ id: _capacitorWatchId });
    } catch {}
    _capacitorWatchId = null;
    return;
  }
  if (watchId >= 0) {
    navigator.geolocation.clearWatch(watchId);
  }
}

export function clearGPSWatch(watchId: number): void {
  if (_capacitorWatchId !== null) {
    import('@capacitor/geolocation').then(({ Geolocation }) => {
      Geolocation.clearWatch({ id: _capacitorWatchId! }).catch(() => {});
      _capacitorWatchId = null;
    }).catch(() => {});
    return;
  }
  navigator.geolocation.clearWatch(watchId);
}

// ── WAKE LOCK + BACKGROUND GPS ────────────────────────────────────────────────

type WakeLockSentinel = { released: boolean; release: () => Promise<void> };

let wakeLockSentinel: WakeLockSentinel | null = null;
let noSleepAudio: AudioContext | null = null;
let noSleepAudioSource: AudioBufferSourceNode | null = null;
let noSleepAudioInterval: ReturnType<typeof setInterval> | null = null;

function createSilentAudioContext(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    noSleepAudio = new AudioContextClass();

    const createAndPlayBuffer = () => {
      if (!noSleepAudio) return;
      if (noSleepAudio.state === 'suspended') {
        noSleepAudio.resume().catch(() => {});
      }
      const buffer = noSleepAudio.createBuffer(1, noSleepAudio.sampleRate * 0.1, noSleepAudio.sampleRate);
      const source = noSleepAudio.createBufferSource();
      source.buffer = buffer;
      source.connect(noSleepAudio.destination);
      source.start();
      noSleepAudioSource = source;
    };

    createAndPlayBuffer();
    noSleepAudioInterval = setInterval(createAndPlayBuffer, 5000);
  } catch {}
}

function destroySilentAudioContext(): void {
  if (noSleepAudioInterval !== null) {
    clearInterval(noSleepAudioInterval);
    noSleepAudioInterval = null;
  }
  if (noSleepAudioSource) {
    try { noSleepAudioSource.stop(); } catch {}
    noSleepAudioSource = null;
  }
  if (noSleepAudio) {
    try { noSleepAudio.close(); } catch {}
    noSleepAudio = null;
  }
}

export async function acquireWakeLock(): Promise<void> {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');

      const reacquire = async () => {
        if (document.visibilityState === 'visible' && wakeLockSentinel?.released) {
          try {
            wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          } catch {}
        }
      };
      document.addEventListener('visibilitychange', reacquire);
      (wakeLockSentinel as any)._visibilityHandler = reacquire;
    } catch {}
  }

  createSilentAudioContext();
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel && !wakeLockSentinel.released) {
    const handler = (wakeLockSentinel as any)._visibilityHandler;
    if (handler) document.removeEventListener('visibilitychange', handler);
    try { await wakeLockSentinel.release(); } catch {}
    wakeLockSentinel = null;
  }

  destroySilentAudioContext();
}

// ── iOS BACKGROUND LOCATION PLUGIN ───────────────────────────────────────────
// Activates BackgroundLocationPlugin.swift so GPS keeps running with screen off.

async function isIOSNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
}

export async function startIOSBackgroundLocation(): Promise<void> {
  if (!(await isIOSNative())) return;
  try {
    const { Plugins } = await import('@capacitor/core');
    const plugin = (Plugins as any).BackgroundLocation;
    if (plugin?.startBackgroundLocation) {
      await plugin.startBackgroundLocation();
    }
  } catch {
    // Plugin not registered yet — GPS works in foreground only
  }
}

export async function stopIOSBackgroundLocation(): Promise<void> {
  if (!(await isIOSNative())) return;
  try {
    const { Plugins } = await import('@capacitor/core');
    const plugin = (Plugins as any).BackgroundLocation;
    if (plugin?.stopBackgroundLocation) {
      await plugin.stopBackgroundLocation();
    }
  } catch {}
}

// ── GPS BACKGROUND RECONNECT ──────────────────────────────────────────────────

type GPSReconnectCallback = (watchId: number) => void;

let gpsVisibilityHandler: (() => void) | null = null;

export function registerGPSBackgroundReconnect(
  onReconnect: GPSReconnectCallback,
  onPoint: (position: GeolocationPosition) => void,
  onError: (err: GeolocationPositionError) => void,
  options?: PositionOptions
): void {
  if (gpsVisibilityHandler) {
    document.removeEventListener('visibilitychange', gpsVisibilityHandler);
    gpsVisibilityHandler = null;
  }

  gpsVisibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      getGPSWatchPositionAsync(onPoint, onError).then((newWatchId) => {
        onReconnect(newWatchId);
      }).catch(() => {});

      if (noSleepAudio && noSleepAudio.state === 'suspended') {
        noSleepAudio.resume().catch(() => {});
      }
    }
  };

  document.addEventListener('visibilitychange', gpsVisibilityHandler);
}

export function unregisterGPSBackgroundReconnect(): void {
  if (gpsVisibilityHandler) {
    document.removeEventListener('visibilitychange', gpsVisibilityHandler);
    gpsVisibilityHandler = null;
  }
}

// ── INDEXEDDB PERSISTENCE ─────────────────────────────────────────────────────

const DB_NAME = 'asciende_gps_v1';
const STORE_NAME = 'recording_session';
const SESSION_KEY = 'active';
const MAX_PERSISTED_POINTS = 50000;

interface PersistedSession {
  sportType: string;
  startTime: number;
  points: GPSPoint[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function persistSessionPoint(
  sportType: string,
  startTime: number,
  point: GPSPoint
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const existing: PersistedSession | undefined = await new Promise((res) => {
      const r = store.get(SESSION_KEY);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(undefined);
    });

    const session: PersistedSession = existing ?? { sportType, startTime, points: [] };
    if (session.points.length < MAX_PERSISTED_POINTS) {
      session.points.push(point);
    }
    store.put(session, SESSION_KEY);
  } catch {}
}

export async function loadPersistedSession(): Promise<PersistedSession | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const r = store.get(SESSION_KEY);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearPersistedSession(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(SESSION_KEY);
  } catch {}
}
