import ActivityMapViewer from './ActivityMapViewer';

type Props = {
  session: any;
  details: any;
  loading: boolean;
  language: string;
};

const ZONE_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#d946ef'];

function zoneEntries(value: unknown): Array<[string, number]> {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>)
    .map(([name, seconds]) => [name, Number(seconds)] as [string, number])
    .filter(([, seconds]) => Number.isFinite(seconds) && seconds > 0);
}

function ZoneDistribution({ title, zones, language }: { title: string; zones: any; language: string }) {
  const sets = [
    { key: 'zones5', label: language === 'es' ? '5 zonas' : '5 zones' },
    { key: 'zones7', label: language === 'es' ? '7 zonas' : '7 zones' },
  ].map(set => ({ ...set, entries: zoneEntries(zones?.[set.key]) })).filter(set => set.entries.length > 0);
  if (!sets.length) return null;

  return <section className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h4>
    <div className="mt-2 space-y-3">
      {sets.map(set => {
        const total = set.entries.reduce((sum, [, seconds]) => sum + seconds, 0);
        return <div key={set.key}>
          <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">{set.label}</p>
          <div className="flex h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" aria-label={`${set.label} ${title}`}>
            {set.entries.map(([zone, seconds], index) => <span key={zone} title={`${zone.replace('zone_', 'Z').replace('_seconds', '')}: ${Math.round(seconds / 60)} min`} style={{ width: `${seconds / total * 100}%`, backgroundColor: ZONE_COLORS[index % ZONE_COLORS.length] }} />)}
          </div>
          <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">{set.entries.map(([zone, seconds]) => `${zone.replace('zone_', 'Z').replace('_seconds', '')}: ${Math.round(seconds / 60)} min`).join(' · ')}</p>
        </div>;
      })}
    </div>
  </section>;
}

export default function WearableSessionInsights({ session, details, loading, language }: Props) {
  const es = language === 'es';
  const route = (details?.route || []).filter((point: any) => point.latitude != null && point.longitude != null && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude)));
  const hasHeartZones = ['zones5', 'zones7'].some(key => zoneEntries(details?.hr_zone_seconds?.[key]).length > 0);
  const hasPowerZones = ['zones5', 'zones7'].some(key => zoneEntries(details?.power_zone_seconds?.[key]).length > 0);
  const elevationGain = details?.elevation_gain_m;
  const elevationLoss = details?.elevation_loss_m;
  const powerStats = details?.power_metrics;

  return <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
    <h4 className="font-semibold text-gray-900 dark:text-white">{es ? 'Análisis del entrenamiento' : 'Workout analysis'}</h4>
    {loading && <p className="text-sm text-gray-500 dark:text-gray-400">{es ? 'Leyendo series del reloj…' : 'Reading watch data…'}</p>}
    {!loading && <>
      {hasHeartZones && <ZoneDistribution title={es ? 'Frecuencia cardíaca' : 'Heart rate'} zones={details.hr_zone_seconds} language={language} />}
      {hasPowerZones && <ZoneDistribution title={es ? 'Potencia' : 'Power'} zones={details.power_zone_seconds} language={language} />}
      {powerStats && (powerStats.avg_power != null || powerStats.normalized_power != null || powerStats.tss != null) && <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        {[
          powerStats.avg_power != null && `${es ? 'Potencia media' : 'Average power'} ${Math.round(powerStats.avg_power)} W`,
          powerStats.max_power != null && `${es ? 'Máxima' : 'Max'} ${Math.round(powerStats.max_power)} W`,
          powerStats.normalized_power != null && `NP ${Math.round(powerStats.normalized_power)} W`,
          powerStats.tss != null && `TSS ${Math.round(powerStats.tss)}`,
        ].filter(Boolean).join(' · ')}
      </p>}
      {(route.length > 1 || elevationGain != null || elevationLoss != null) && <section className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{es ? 'GPS y desnivel' : 'GPS and elevation'}</h4>
        {route.length > 1 && <div className="mt-2 overflow-hidden rounded-lg"><ActivityMapViewer gpsPoints={route.map((point: any) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude), altitude: point.altitude_m == null ? null : Number(point.altitude_m) }))} title={es ? 'Recorrido del reloj' : 'Watch route'} /></div>}
        <p className="mt-2 text-xs text-gray-700 dark:text-gray-200">
          {elevationGain != null || elevationLoss != null
            ? `${es ? 'Subida acumulada' : 'Elevation gain'}: ${elevationGain == null ? '—' : `${Math.round(elevationGain)} m`} · ${es ? 'Bajada acumulada' : 'Elevation loss'}: ${elevationLoss == null ? '—' : `${Math.round(elevationLoss)} m`}`
            : es ? 'Hay ruta GPS, pero no una serie de altitud suficiente para calcular subidas y bajadas.' : 'GPS route is available, but there are not enough altitude samples to calculate ascent and descent.'}
        </p>
      </section>}
      {!hasHeartZones && !hasPowerZones && <p className="text-xs text-gray-500 dark:text-gray-400">{es ? 'No llegaron series temporales de FC o potencia, o el Pasaporte Biológico no tiene zonas configuradas para este dato.' : 'No heart-rate or power time series arrived, or the Biological Passport has no zones configured for this metric.'}</p>}
      {route.length < 2 && elevationGain == null && <p className="text-xs text-gray-500 dark:text-gray-400">{es ? 'Open Wearables no entregó coordenadas GPS ni altitud para esta actividad.' : 'Open Wearables did not provide GPS coordinates or altitude for this activity.'}</p>}
      {details?.diagnostics?.length > 0 && <ul className="list-inside list-disc space-y-1 text-[10px] text-gray-400">{details.diagnostics.map((message: string, index: number) => <li key={`${index}-${message}`}>{message}</li>)}</ul>}
    </>}
    <p className="text-[10px] text-gray-400">{session?.provider ? `${es ? 'Fuente' : 'Source'}: ${session.provider}` : ''}</p>
  </div>;
}
