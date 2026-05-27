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

const MAX_ACCURACY_M = 50;
const ABS_MAX_SPEED_KMH = 150;
const MIN_DISTANCE_M = 2;
const SMOOTHING_ALPHA = 0.7;
const STABILISATION_COUNT = 5;
const RESET_AFTER_GAP_S = 20;
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

    if (acc > MAX_ACCURACY_M) {
      this.consecutiveRejects++;
      return null;
    }

    if (!this.stabilised) {
      this.stabilBuffer.push({ latitude, longitude, altitude, accuracy: acc, timestamp });

      if (this.stabilBuffer.length < STABILISATION_COUNT) {
        return null;
      }

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

    const last = this.lastAccepted!;
    const dtSeconds = (timestamp - last.timestamp) / 1000;

    if (dtSeconds > RESET_AFTER_GAP_S) {
      this.stabilised = false;
      this.stabilBuffer = [{ latitude, longitude, altitude, accuracy: acc, timestamp }];
      this.lastAccepted = null;
      this.smoothLat = null;
      this.smoothLon = null;
      this.consecutiveRejects = 0;
      return null;
    }

    if (dtSeconds > 0) {
      const distKm = calculateDistance(last.latitude, last.longitude, latitude, longitude);
      const speedKmh = (distKm / dtSeconds) * 3600;

      if (speedKmh > this.sportMaxSpeedKmh) {
        this.consecutiveRejects++;

        if (this.consecutiveRejects >= MAX_CONSECUTIVE_REJECTS) {
          this.consecutiveRejects = 0;
          this.lastAccepted = { latitude, longitude, altitude: altitude ?? undefined, timestamp, accuracy: acc };
          this.smoothLat = latitude;
          this.smoothLon = longitude;
          return { latitude, longitude, altitude: altitude ?? undefined, timestamp, accuracy: acc };
        }

        this.lastAccepted = { ...last, timestamp };
        return null;
      }
    }

    const distM = calculateDistance(last.latitude, last.longitude, latitude, longitude) * 1000;
    if (distM < MIN_DISTANCE_M) {
      return null;
    }

    this.consecutiveRejects = 0;

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

// ── PLATFORM DETECTION ───────────────────────────────────────────────────────

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

async function getNativePlatform(): Promise<'ios' | 'android' | 'web'> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return 'web';
    return Capacitor.getPlatform() as 'ios' | 'android';
  } catch {
    return 'web';
  }
}

// ── CAPGO BACKGROUND GEOLOCATION ─────────────────────────────────────────────

let _bgGeoStarted = false;

// Debug state exposed to UI
export interface GPSDebugState {
  lastTimestamp: number | null;
  lastLat: number | null;
  lastLng: number | null;
  totalCallbacks: number;
  lastError: string | null;
  startedAt: number | null;
}

export const gpsDebug: GPSDebugState = {
  lastTimestamp: null,
  lastLat: null,
  lastLng: null,
  totalCallbacks: 0,
  lastError: null,
  startedAt: null,
};

async function startCapgoBackgroundGeolocation(
  onLocation: (position: GeolocationPosition) => void,
): Promise<void> {
  const { BackgroundGeolocation } = await import('@capgo/background-geolocation');

  // Prevent ALREADY_STARTED error on pause/resume cycles
  if (_bgGeoStarted) {
    try { await BackgroundGeolocation.stop(); } catch {}
    _bgGeoStarted = false;
  }

  gpsDebug.startedAt = Date.now();
  gpsDebug.totalCallbacks = 0;
  gpsDebug.lastError = null;
  gpsDebug.lastTimestamp = null;
  gpsDebug.lastLat = null;
  gpsDebug.lastLng = null;

  await BackgroundGeolocation.start(
    {
      backgroundMessage: 'Asciende está registrando tu actividad',
      backgroundTitle: 'Asciende GPS',
      requestPermissions: true,
      stale: false,
      distanceFilter: 5,
    },
    (location, error) => {
      if (error) {
        gpsDebug.lastError = `[${error.code ?? 'UNKNOWN'}] ${error.message}`;
        if (error.code === 'NOT_AUTHORIZED') {
          if (window.confirm(
            'Asciende necesita acceso a tu ubicación en segundo plano para registrar la actividad. ¿Abrir configuración?'
          )) {
            BackgroundGeolocation.openSettings();
          }
        }
        return;
      }
      if (location) {
        gpsDebug.totalCallbacks++;
        gpsDebug.lastTimestamp = location.time ?? Date.now();
        gpsDebug.lastLat = location.latitude;
        gpsDebug.lastLng = location.longitude;

        const position: GeolocationPosition = {
          coords: {
            latitude: location.latitude,
            longitude: location.longitude,
            altitude: location.altitude ?? null,
            accuracy: location.accuracy,
            altitudeAccuracy: location.altitudeAccuracy ?? null,
            heading: location.bearing ?? null,
            speed: location.speed ?? null,
          },
          timestamp: location.time ?? Date.now(),
          toJSON() { return this; },
        } as GeolocationPosition;
        onLocation(position);
      }
    }
  );

  _bgGeoStarted = true;
}

async function stopCapgoBackgroundGeolocation(): Promise<void> {
  if (_bgGeoStarted) {
    try {
      const { BackgroundGeolocation } = await import('@capgo/background-geolocation');
      await BackgroundGeolocation.stop();
    } catch {}
    _bgGeoStarted = false;
  }
}

// ── WATCH POSITION ────────────────────────────────────────────────────────────

export async function getGPSWatchPositionAsync(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void,
): Promise<number> {
  const isNative = await checkNativeCapacitor();
  const platform = await getNativePlatform();

  // Native (iOS & Android): use @capgo/background-geolocation for both foreground and background
  if (isNative && (platform === 'ios' || platform === 'android')) {
    try {
      await startCapgoBackgroundGeolocation(onSuccess);
      return -2;
    } catch (error) {
      console.debug('Capgo BackgroundGeolocation failed, using web fallback', error);
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
  // Native (Capgo BackgroundGeolocation)
  if (watchId === -2) {
    await stopCapgoBackgroundGeolocation();
    return;
  }
  // Web
  if (watchId >= 0) {
    navigator.geolocation.clearWatch(watchId);
  }
}

export function clearGPSWatch(watchId: number): void {
  if (watchId === -2) {
    stopCapgoBackgroundGeolocation().catch(() => {});
    return;
  }
  if (watchId >= 0) {
    navigator.geolocation.clearWatch(watchId);
  }
}

// Legacy export kept for backward compatibility with ActivityRecorder
export async function stopNativeBackgroundLocation(): Promise<void> {
  await stopCapgoBackgroundGeolocation();
}

// ── WAKE LOCK ────────────────────────────────────────────────────────────────

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

// ── GPS BACKGROUND RECONNECT ──────────────────────────────────────────────────

type GPSReconnectCallback = (watchId: number) => void;

let gpsVisibilityHandler: (() => void) | null = null;

export function registerGPSBackgroundReconnect(
  onReconnect: GPSReconnectCallback,
  onPoint: (position: GeolocationPosition) => void,
  onError: (err: GeolocationPositionError) => void,
): void {
  if (gpsVisibilityHandler) {
    document.removeEventListener('visibilitychange', gpsVisibilityHandler);
    gpsVisibilityHandler = null;
  }

  gpsVisibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      getNativePlatform().then((platform) => {
        if (platform === 'ios' || platform === 'android') {
          // Capgo handles background natively, no reconnection needed
          if (noSleepAudio && noSleepAudio.state === 'suspended') {
            noSleepAudio.resume().catch(() => {});
          }
          return;
        }
        // Web: reconnect GPS watch
        getGPSWatchPositionAsync(onPoint, onError).then((newWatchId) => {
          onReconnect(newWatchId);
        }).catch(() => {});

        if (noSleepAudio && noSleepAudio.state === 'suspended') {
          noSleepAudio.resume().catch(() => {});
        }
      });
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
