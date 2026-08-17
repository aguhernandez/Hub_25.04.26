import { useState, useEffect } from 'react';
import { X, MapPin, Clock, TrendingUp, Zap, Activity, Navigation, Mountain, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ActivityMapViewer from './ActivityMapViewer';
import ActivityShareCard from './ActivityShareCard';
import { useLanguage } from '../../contexts/LanguageContext';

interface GPSActivityDetailModalProps {
  activityId: string | null;
  activityData: any;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPace(distanceKm: number, durationSeconds: number): string {
  if (!distanceKm || distanceKm <= 0 || !durationSeconds) return '--:--';
  const paceSecPerKm = durationSeconds / distanceKm;
  const paceMin = Math.floor(paceSecPerKm / 60);
  const paceSec = Math.round(paceSecPerKm % 60);
  return `${paceMin}:${String(paceSec).padStart(2, '0')} /km`;
}

function formatSpeed(distanceKm: number, durationSeconds: number): string {
  if (!distanceKm || distanceKm <= 0 || !durationSeconds) return '-- km/h';
  const speedKmh = (distanceKm / durationSeconds) * 3600;
  return `${speedKmh.toFixed(1)} km/h`;
}

function SportIcon({ sport }: { sport?: string }) {
  if (!sport) return <Activity className="w-5 h-5" />;
  const s = sport.toLowerCase();
  if (s.includes('run') || s.includes('trail')) return <Navigation className="w-5 h-5" />;
  if (s.includes('bike') || s.includes('cycl')) return <Zap className="w-5 h-5" />;
  return <Activity className="w-5 h-5" />;
}

export default function GPSActivityDetailModal({
  activityId,
  activityData,
  onClose,
}: GPSActivityDetailModalProps) {
  const { language } = useLanguage();
  const [gpsPoints, setGpsPoints] = useState<any[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const raw = activityData?.raw_data || activityData || {};
  const name = activityData?.name || raw.name || (language === 'es' ? 'Actividad GPS' : 'GPS Activity');
  const sport = raw.sport_type || activityData?.source_sport || '';
  const distanceKm = raw.distance_meters ? raw.distance_meters / 1000 : (raw.distance_km ?? 0);
  const durationSecs = raw.duration_seconds ?? 0;
  const elevationGain = raw.elevation_gain_meters ?? raw.elevation_gain_m ?? 0;
  const date = raw.local_date || (raw.start_time ? String(raw.start_time).substring(0, 10) : '');
  const notes = raw.user_notes || activityData?.description || '';
  const internalActivityId = raw.raw_data?.activity_id ?? null;

  useEffect(() => {
    if (!internalActivityId) return;
    setLoadingPoints(true);
    supabase
      .from('activity_gps_points')
      .select('latitude, longitude, altitude_m, sequence_order')
      .eq('activity_id', internalActivityId)
      .order('sequence_order', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setGpsPoints(
            data.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
              altitude: p.altitude_m,
            }))
          );
        }
        setLoadingPoints(false);
      });
  }, [internalActivityId]);

  const isRunning = sport.toLowerCase().includes('run') || sport.toLowerCase().includes('trail');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <SportIcon sport={sport} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{name}</h2>
              {date && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(date + 'T12:00:00').toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex flex-col items-center gap-1">
              <div className="text-blue-500 dark:text-blue-400 mb-1">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {distanceKm > 0 ? distanceKm.toFixed(2) : '--'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">km</span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex flex-col items-center gap-1">
              <div className="text-green-500 dark:text-green-400 mb-1">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                {formatDuration(durationSecs)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                {language === 'es' ? 'Duración' : 'Duration'}
              </span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex flex-col items-center gap-1">
              <div className="text-amber-500 dark:text-amber-400 mb-1">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                {isRunning
                  ? formatPace(distanceKm, durationSecs).split(' ')[0]
                  : distanceKm > 0 && durationSecs > 0
                  ? `${((distanceKm / durationSecs) * 3600).toFixed(1)}`
                  : '--'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                {isRunning ? 'min/km' : 'km/h'}
              </span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex flex-col items-center gap-1">
              <div className="text-orange-500 dark:text-orange-400 mb-1">
                <Mountain className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {elevationGain > 0 ? Math.round(elevationGain) : '--'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                {language === 'es' ? 'Desnivel +' : 'Elevation'} (m)
              </span>
            </div>
          </div>

          {sport && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium">
                <SportIcon sport={sport} />
                {sport}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-sm font-medium">
                <Activity className="w-4 h-4" />
                GPS
              </span>
            </div>
          )}

          {loadingPoints ? (
            <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'es' ? 'Cargando mapa...' : 'Loading map...'}
                </p>
              </div>
            </div>
          ) : gpsPoints.length > 1 ? (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <ActivityMapViewer gpsPoints={gpsPoints} />
            </div>
          ) : (
            <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'es' ? 'No hay datos GPS disponibles' : 'No GPS track available'}
                </p>
              </div>
            </div>
          )}

          {notes && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Notas' : 'Notes'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{notes}</p>
            </div>
          )}

          {gpsPoints.length > 0 && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              {gpsPoints.length} {language === 'es' ? 'puntos GPS registrados' : 'GPS points recorded'}
            </p>
          )}

          <div className="flex justify-center pt-2">
            <button
              onClick={() => setShowShareCard(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-colors font-medium text-sm shadow-lg shadow-cyan-500/20"
            >
              <Share2 className="w-4 h-4" />
              {language === 'es' ? 'Compartir' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      {showShareCard && (
        <ActivityShareCard
          activityData={{
            sportType: sport || 'activity',
            title: name,
            distanceKm,
            durationSeconds: durationSecs,
            elevationGainM: elevationGain,
            date,
            gpsPoints: gpsPoints.length > 0 ? gpsPoints : undefined,
          }}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
