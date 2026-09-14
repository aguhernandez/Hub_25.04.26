import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle, Zap } from 'lucide-react';
import { StravaClient } from '../../utils/stravaClient';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  athleteId: string;
  onSyncComplete: () => void;
}

export function StravaSyncButton({ athleteId, onSyncComplete }: Props) {
  const { language } = useLanguage();
  const [checking, setChecking] = useState(true);
  const [hasIntegration, setHasIntegration] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSpanish = language === 'es';

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    setHasIntegration(false);
    setStatus(null);
    StravaClient.checkAthleteConnection(athleteId).then((connected) => {
      if (!cancelled) {
        setHasIntegration(connected);
        setChecking(false);
      }
    });
    return () => { cancelled = true; };
  }, [athleteId]);

  const handleSync = async () => {
    if (syncing || !hasIntegration) return;
    setSyncing(true);
    setSyncedCount(0);
    setStatus(null);

    const result = await StravaClient.syncActivities({
      athleteId,
      perPage: 200,
      fullSync: true,
    });

    if (result.success) {
      const count = result.synced || 0;
      setSyncedCount(count);
      setStatus({
        type: 'success',
        text: isSpanish
          ? `Sincronización completada: ${count} actividades procesadas`
          : `Sync complete: ${count} activities processed`,
      });
      onSyncComplete();
    } else {
      setStatus({
        type: 'error',
        text: isSpanish
          ? 'No se pudo completar la sincronización. Comprueba la conexión de Strava del atleta.'
          : 'Sync could not be completed. Check the athlete’s Strava connection.',
      });
    }
    setSyncing(false);
  };

  const disabledReason = isSpanish
    ? 'Este atleta no tiene una integración activa de Strava'
    : 'This athlete does not have an active Strava integration';

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={checking || syncing || !hasIntegration}
        title={!checking && !hasIntegration ? disabledReason : undefined}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {syncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        {checking
          ? (isSpanish ? 'Comprobando Strava...' : 'Checking Strava...')
          : syncing
            ? (isSpanish ? `Sincronizando${syncedCount ? ` · ${syncedCount}` : '...'}` : `Syncing${syncedCount ? ` · ${syncedCount}` : '...'}`)
            : (isSpanish ? 'Sincronizar Strava' : 'Sync Strava')}
      </button>
      {!checking && !hasIntegration && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-right max-w-xs">{disabledReason}</p>
      )}
      {status && (
        <div className={`flex items-center gap-1.5 text-xs ${status.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {status.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          <span>{status.text}</span>
        </div>
      )}
    </div>
  );
}
