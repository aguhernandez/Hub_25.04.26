import { Activity, CalendarDays, ChevronRight, Clock3, Flame, Gauge, Heart, MapPin, Mountain, X, Zap } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';

interface ActivitySummaryModalProps {
  activity: any;
  language: 'en' | 'es';
  actions?: ReactNode;
  onAnalyse: () => void;
  onClose: () => void;
}

function durationLabel(seconds: number, language: 'en' | 'es') {
  if (!seconds || !Number.isFinite(seconds)) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = Math.floor(seconds % 60);
  if (hours) return language === 'es' ? `${hours} h ${minutes} min` : `${hours} h ${minutes} min`;
  return language === 'es' ? `${minutes} min ${remaining} s` : `${minutes} min ${remaining} s`;
}

function paceLabel(speed: number) {
  if (!(speed > 0)) return '—';
  const seconds = Math.round(1000 / speed);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /km`;
}

function Metric({ icon: Icon, label, value, accent = 'text-neutral-900 dark:text-white' }: { icon: ElementType; label: string; value: string; accent?: string }) {
  return <div className="rounded-2xl border border-neutral-200/80 bg-white/80 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/80">
    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"><Icon className="h-4 w-4" />{label}</div>
    <div className={`text-xl font-bold tracking-tight ${accent}`}>{value}</div>
  </div>;
}

export default function ActivitySummaryModal({ activity, language, actions, onAnalyse, onClose }: ActivitySummaryModalProps) {
  const es = language === 'es';
  const distance = Number(activity.distance_meters ?? activity.distance_m ?? 0);
  const duration = Number(activity.duration_seconds ?? 0);
  const speed = Number(activity.average_speed_mps ?? (distance > 0 && duration > 0 ? distance / duration : 0));
  const sport = String(activity.sport_type || activity.sport || '').toLowerCase();
  const isRun = /run|walk|hike|trail/.test(sport);
  const paceOrSpeed = isRun ? paceLabel(speed) : speed > 0 ? `${(speed * 3.6).toFixed(1)} km/h` : '—';
  const watts = activity.average_watts ?? activity.wearable_metrics?.avg_power ?? null;
  const maxWatts = activity.max_watts ?? activity.wearable_metrics?.max_power ?? null;
  const intensityFactor = activity.intensity_factor ?? activity.wearable_metrics?.intensity_factor ?? null;
  const workKj = activity.raw_data?.work_kj ?? (watts != null && duration ? Math.round(Number(watts) * duration / 1000) : null);
  const elevationGain = activity.elevation_gain_meters ?? activity.elevation_gain_m ?? null;
  const elevationLoss = activity.raw_data?.elevation_loss_m ?? activity.raw_data?.elevation_loss_meters ?? activity.elevation_loss_m ?? null;
  const start = activity.start_time || activity.local_date || activity.scheduled_date;
  const dateLabel = start && Number.isFinite(Date.parse(start))
    ? new Date(start).toLocaleString(es ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
  const provider = activity.provider || activity.device_name || (activity.source === 'open_wearables'
    ? 'Open Wearables'
    : String(activity.source || (es ? 'Actividad completada' : 'Completed activity'))).replace(/_/g, ' ');

  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
    <button aria-label={es ? 'Cerrar resumen' : 'Close summary'} className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={onClose} />
    <section role="dialog" aria-modal="true" aria-labelledby="activity-summary-title" className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-[#f5f7fb] shadow-2xl dark:bg-neutral-900">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#29213d] via-[#3c3156] to-[#514163] px-6 py-6 text-white sm:px-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-[#fdda36]/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Activity className="h-6 w-6 text-[#fdda36]" /></div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/65"><span>{provider}</span><span className="h-1 w-1 rounded-full bg-[#fdda36]" /><span>{String(activity.sport_type || activity.sport || 'Workout').replace(/_/g, ' ')}</span></div>
              <h2 id="activity-summary-title" className="truncate text-2xl font-bold sm:text-3xl">{activity.name || (es ? 'Entrenamiento' : 'Workout')}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-white/70"><CalendarDays className="h-4 w-4" />{dateLabel}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'} className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><Clock3 className="mb-3 h-4 w-4 text-[#fdda36]" /><p className="text-xs text-white/60">{es ? 'Duración' : 'Duration'}</p><p className="mt-1 text-xl font-bold">{durationLabel(duration, language)}</p></div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><MapPin className="mb-3 h-4 w-4 text-[#fdda36]" /><p className="text-xs text-white/60">{es ? 'Distancia' : 'Distance'}</p><p className="mt-1 text-xl font-bold">{distance > 0 ? `${(distance / 1000).toFixed(2)} km` : '—'}</p></div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><Gauge className="mb-3 h-4 w-4 text-[#fdda36]" /><p className="text-xs text-white/60">{isRun ? (es ? 'Ritmo promedio' : 'Average pace') : (es ? 'Velocidad promedio' : 'Average speed')}</p><p className="mt-1 text-xl font-bold">{paceOrSpeed}</p></div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><Mountain className="mb-3 h-4 w-4 text-[#fdda36]" /><p className="text-xs text-white/60">{es ? 'Desnivel positivo' : 'Elevation gain'}</p><p className="mt-1 text-xl font-bold">{elevationGain == null ? '—' : `${Math.round(Number(elevationGain))} m`}</p></div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-neutral-800 dark:text-white">{es ? 'Resumen completado' : 'Completed summary'}</h3><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{es ? 'Métricas disponibles para esta actividad' : 'Metrics available for this activity'}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{es ? 'Completado' : 'Completed'}</span></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(activity.average_heartrate ?? activity.avg_hr) != null && <Metric icon={Heart} label={es ? 'FC promedio' : 'Average heart rate'} value={`${Math.round(Number(activity.average_heartrate ?? activity.avg_hr))} bpm`} accent="text-rose-600 dark:text-rose-300" />}
          {(activity.max_heartrate ?? activity.max_hr) != null && <Metric icon={Heart} label={es ? 'FC máxima' : 'Max heart rate'} value={`${Math.round(Number(activity.max_heartrate ?? activity.max_hr))} bpm`} accent="text-rose-600 dark:text-rose-300" />}
          {watts != null && <Metric icon={Zap} label={es ? 'Potencia promedio' : 'Average power'} value={`${Math.round(Number(watts))} W`} accent="text-amber-600 dark:text-amber-300" />}
          {maxWatts != null && <Metric icon={Zap} label={es ? 'Potencia máxima' : 'Max power'} value={`${Math.round(Number(maxWatts))} W`} accent="text-amber-600 dark:text-amber-300" />}
          {intensityFactor != null && <Metric icon={Gauge} label="IF" value={Number(intensityFactor).toFixed(2)} accent="text-blue-600 dark:text-blue-300" />}
          {activity.average_cadence != null && <Metric icon={Activity} label={es ? 'Cadencia promedio' : 'Average cadence'} value={`${Math.round(Number(activity.average_cadence))} spm`} />}
          {activity.calories != null && <Metric icon={Flame} label={es ? 'Calorías' : 'Calories'} value={`${Math.round(Number(activity.calories))} kcal`} accent="text-orange-600 dark:text-orange-300" />}
          {elevationLoss != null && <Metric icon={Mountain} label={es ? 'Desnivel negativo' : 'Elevation loss'} value={`${Math.round(Number(elevationLoss))} m`} />}
          {workKj != null && <Metric icon={Zap} label={es ? 'Trabajo' : 'Work'} value={`${Math.round(Number(workKj))} kJ`} />}
          {activity.elapsed_time_seconds != null && Number(activity.elapsed_time_seconds) !== duration && <Metric icon={Clock3} label={es ? 'Tiempo transcurrido' : 'Elapsed time'} value={durationLabel(Number(activity.elapsed_time_seconds), language)} />}
        </div>
        {!(activity.average_heartrate != null || activity.avg_hr != null || activity.max_heartrate != null || activity.max_hr != null || watts != null || maxWatts != null || intensityFactor != null || activity.average_cadence != null || activity.calories != null || elevationLoss != null || workKj != null) && <div className="mt-3 rounded-2xl border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-500 dark:border-neutral-700">{es ? 'Esta conexión solo proporciona las métricas principales. Abre Analyse para consultar mapa y datos detallados disponibles.' : 'This connection only provides summary metrics. Open Analyse to view the available map and detailed data.'}</div>}
      </div>
      <footer className="flex flex-col-reverse gap-3 border-t border-neutral-200 bg-white/80 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-900/80 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2">{actions}</div>
        <button onClick={onAnalyse} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#fdda36] px-6 py-3 text-sm font-bold text-[#29213d] shadow-sm transition hover:bg-[#f2ca1d] hover:shadow-md">Analyse<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></button>
      </footer>
    </section>
  </div>;
}
