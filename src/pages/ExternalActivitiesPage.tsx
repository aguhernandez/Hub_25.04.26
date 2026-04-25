import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { StravaClient, ExternalActivity, SyncResult } from '../utils/stravaClient';
import {
  Activity,
  Filter,
  Import,
  AlertCircle,
  Calendar,
  Clock,
  TrendingUp,
  Heart,
  Zap,
  Mountain,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  RefreshCw,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DuplicateWarning {
  external_activity_id: string;
  potential_duplicates: Array<{
    id: string;
    date: string;
    sport_type: string;
    duration_seconds: number;
  }>;
}

export default function ExternalActivitiesPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();

  const [activities, setActivities] = useState<ExternalActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([]);

  const [editForm, setEditForm] = useState({
    notes: '',
    rpe: '',
    tags: [] as string[],
  });

  useEffect(() => {
    loadActivities();
  }, [sourceFilter, showDeleted]);

  const loadActivities = async () => {
    setLoading(true);
    const data = await StravaClient.getExternalActivities({
      source: sourceFilter === 'all' ? undefined : sourceFilter,
      limit: 50,
      includeDeleted: showDeleted,
    });
    setActivities(data);
    await checkForDuplicates(data);
    setLoading(false);
  };

  const handleSyncActivities = async () => {
    setSyncing(true);
    setSyncResult(null);

    const result = await StravaClient.syncActivities();

    if (result.success) {
      setSyncResult(result);
      await loadActivities();
      setTimeout(() => setSyncResult(null), 10000);
    } else {
      alert(result.error || 'Failed to sync activities');
    }

    setSyncing(false);
  };

  const checkForDuplicates = async (externalActivities: ExternalActivity[]) => {
    const warnings: DuplicateWarning[] = [];

    for (const activity of externalActivities) {
      if (activity.imported_to_training_log_id) continue;

      const startTime = new Date(activity.start_time);
      const startWindow = new Date(startTime.getTime() - 2 * 60 * 60 * 1000);
      const endWindow = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const { data: trainingLogs } = await supabase
        .from('training_logs')
        .select('id, date, sport, duration')
        .eq('user_id', profile?.id)
        .gte('date', startWindow.toISOString())
        .lte('date', endWindow.toISOString());

      if (trainingLogs && trainingLogs.length > 0) {
        const potentialDuplicates = trainingLogs.filter((log) => {
          const durationDiff = Math.abs(
            (activity.duration_seconds || 0) - ((log.duration || 0) * 60)
          );
          return durationDiff < 300;
        });

        if (potentialDuplicates.length > 0) {
          warnings.push({
            external_activity_id: activity.id,
            potential_duplicates: potentialDuplicates.map((log) => ({
              id: log.id,
              date: log.date,
              sport_type: log.sport || '',
              duration_seconds: (log.duration || 0) * 60,
            })),
          });
        }
      }
    }

    setDuplicateWarnings(warnings);
  };

  const handleImportToTrainingLog = async (activity: ExternalActivity) => {
    const warning = duplicateWarnings.find(
      (w) => w.external_activity_id === activity.id
    );

    if (warning && warning.potential_duplicates.length > 0) {
      const confirmed = window.confirm(
        `Warning: Found ${warning.potential_duplicates.length} similar training log(s) around this time. Are you sure you want to import this activity?`
      );
      if (!confirmed) return;
    }

    const duration = Math.round((activity.duration_seconds || 0) / 60);
    const distance = (activity.distance_meters || 0) / 1000;

    const { data: newLog, error: logError } = await supabase
      .from('training_logs')
      .insert({
        user_id: profile?.id,
        date: activity.start_time,
        sport: activity.sport_type,
        duration: duration,
        distance: distance,
        notes: activity.user_notes || `Imported from ${activity.source}`,
        completed: true,
      })
      .select()
      .single();

    if (logError || !newLog) {
      alert('Failed to import activity');
      return;
    }

    const { error: updateError } = await supabase
      .from('external_activities')
      .update({ imported_to_training_log_id: newLog.id })
      .eq('id', activity.id);

    if (updateError) {
      alert('Failed to link activity');
      return;
    }

    await loadActivities();
  };

  const handleEditActivity = (activity: ExternalActivity) => {
    setEditingNotes(activity.id);
    setEditForm({
      notes: activity.user_notes || '',
      rpe: activity.user_rpe ? activity.user_rpe.toString() : '',
      tags: activity.user_tags || [],
    });
  };

  const handleSaveEdit = async (activityId: string) => {
    const result = await StravaClient.updateActivity(activityId, {
      user_notes: editForm.notes,
      user_rpe: editForm.rpe ? parseInt(editForm.rpe) : undefined,
      user_tags: editForm.tags,
    });

    if (result.success) {
      setEditingNotes(null);
      await loadActivities();
    } else {
      alert('Failed to update activity');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    const result = await StravaClient.deleteActivity(activityId);
    if (result.success) {
      await loadActivities();
    } else {
      alert('Failed to delete activity');
    }
  };

  const handleRestoreActivity = async (activityId: string) => {
    const result = await StravaClient.restoreActivity(activityId);
    if (result.success) {
      await loadActivities();
    } else {
      alert('Failed to restore activity');
    }
  };

  const getSportIcon = (sportType: string) => {
    switch (sportType) {
      case 'run':
        return '🏃';
      case 'ride':
        return '🚴';
      case 'swim':
        return '🏊';
      default:
        return '🏋️';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              {language === 'es' ? 'Actividades Externas' : 'External Activities'}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              {language === 'es'
                ? 'Gestiona tus actividades importadas de Strava y otras plataformas'
                : 'Manage your imported activities from Strava and other platforms'}
            </p>
          </div>
          <button
            onClick={handleSyncActivities}
            disabled={syncing}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-neutral-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing
              ? (language === 'es' ? 'Sincronizando...' : 'Syncing...')
              : (language === 'es' ? 'Sincronizar Strava' : 'Sync Strava')}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-500" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50"
            >
              <option value="all">
                {language === 'es' ? 'Todas las fuentes' : 'All sources'}
              </option>
              <option value="strava">Strava</option>
              <option value="garmin">Garmin</option>
              <option value="coros">Coros</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-neutral-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {language === 'es' ? 'Mostrar eliminadas' : 'Show deleted'}
            </span>
          </label>
        </div>

        {syncResult && syncResult.success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                  {language === 'es' ? 'Sincronización completada' : 'Sync completed'}
                </h4>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  {syncResult.first_sync && (
                    <p className="font-medium">
                      {language === 'es'
                        ? 'Primera sincronización: últimos 90 días'
                        : 'First sync: last 90 days'}
                    </p>
                  )}
                  <p>
                    {language === 'es' ? 'Sincronizadas' : 'Synced'}: <strong>{syncResult.synced}</strong>
                    {' '}{language === 'es' ? 'actividades' : 'activities'}
                  </p>
                  {syncResult.deleted && syncResult.deleted > 0 && (
                    <p>
                      {language === 'es' ? 'Marcadas como eliminadas' : 'Marked as deleted'}: <strong>{syncResult.deleted}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-12 text-center">
          <Activity className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            {language === 'es' ? 'Sin actividades' : 'No activities'}
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400">
            {language === 'es'
              ? 'Conecta tu cuenta de Strava en Configuración para importar actividades'
              : 'Connect your Strava account in Settings to import activities'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const isExpanded = expandedActivity === activity.id;
            const isEditing = editingNotes === activity.id;
            const hasDuplicateWarning = duplicateWarnings.some(
              (w) => w.external_activity_id === activity.id
            );

            const isDeleted = !!activity.deleted_at;

            return (
              <div
                key={activity.id}
                className={`rounded-lg shadow border ${
                  isDeleted
                    ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 opacity-60'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getSportIcon(activity.sport_type)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                              {activity.name}
                            </h3>
                            {isDeleted && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-xs font-medium flex items-center gap-1">
                                <Archive className="w-3 h-3" />
                                {language === 'es' ? 'Eliminada' : 'Deleted'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(activity.start_time).toLocaleDateString()}
                            </span>
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                              {activity.source}
                            </span>
                            {activity.imported_to_training_log_id && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                {language === 'es' ? 'Importada' : 'Imported'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {hasDuplicateWarning && !activity.imported_to_training_log_id && (
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>
                              {language === 'es'
                                ? 'Posible duplicado'
                                : 'Possible duplicate'}
                            </strong>
                            <p className="text-xs mt-1">
                              {language === 'es'
                                ? 'Ya existe una actividad similar en tu registro'
                                : 'A similar activity already exists in your training log'}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {activity.duration_seconds && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-neutral-400" />
                            <div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                {language === 'es' ? 'Duración' : 'Duration'}
                              </div>
                              <div className="font-semibold text-neutral-900 dark:text-neutral-50">
                                {StravaClient.formatDuration(activity.duration_seconds)}
                              </div>
                            </div>
                          </div>
                        )}

                        {activity.distance_meters && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-neutral-400" />
                            <div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                {language === 'es' ? 'Distancia' : 'Distance'}
                              </div>
                              <div className="font-semibold text-neutral-900 dark:text-neutral-50">
                                {StravaClient.formatDistance(activity.distance_meters)}
                              </div>
                            </div>
                          </div>
                        )}

                        {activity.elevation_gain_meters && (
                          <div className="flex items-center gap-2">
                            <Mountain className="w-4 h-4 text-neutral-400" />
                            <div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                {language === 'es' ? 'Elevación' : 'Elevation'}
                              </div>
                              <div className="font-semibold text-neutral-900 dark:text-neutral-50">
                                {Math.round(activity.elevation_gain_meters)}m
                              </div>
                            </div>
                          </div>
                        )}

                        {activity.average_heartrate && (
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-neutral-400" />
                            <div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                {language === 'es' ? 'FC Promedio' : 'Avg HR'}
                              </div>
                              <div className="font-semibold text-neutral-900 dark:text-neutral-50">
                                {activity.average_heartrate} bpm
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                              {language === 'es' ? 'Notas' : 'Notes'}
                            </label>
                            <textarea
                              value={editForm.notes}
                              onChange={(e) =>
                                setEditForm({ ...editForm, notes: e.target.value })
                              }
                              rows={3}
                              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                RPE (1-10)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={editForm.rpe}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, rpe: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(activity.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              {language === 'es' ? 'Guardar' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingNotes(null)}
                              className="px-4 py-2 bg-neutral-300 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-400 dark:hover:bg-neutral-500"
                            >
                              {language === 'es' ? 'Cancelar' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        activity.user_notes && (
                          <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">
                              {activity.user_notes}
                            </p>
                            {activity.user_rpe && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                RPE: {activity.user_rpe}/10
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isDeleted ? (
                        <button
                          onClick={() => handleRestoreActivity(activity.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          {language === 'es' ? 'Restaurar' : 'Restore'}
                        </button>
                      ) : (
                        <>
                          {!activity.imported_to_training_log_id && (
                            <>
                              <button
                                onClick={() => handleEditActivity(activity)}
                                className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleImportToTrainingLog(activity)}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                              >
                                <Import className="w-4 h-4" />
                                {language === 'es' ? 'Importar' : 'Import'}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() =>
                          setExpandedActivity(isExpanded ? null : activity.id)
                        }
                        className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
                        {language === 'es' ? 'Detalles Completos' : 'Full Details'}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {activity.average_speed_mps && (
                          <div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                              {language === 'es' ? 'Velocidad Promedio' : 'Avg Speed'}
                            </div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-50">
                              {StravaClient.formatSpeed(activity.average_speed_mps)}
                            </div>
                          </div>
                        )}
                        {activity.average_power && (
                          <div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                              {language === 'es' ? 'Potencia Promedio' : 'Avg Power'}
                            </div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-50 flex items-center gap-1">
                              <Zap className="w-4 h-4" />
                              {Math.round(activity.average_power)}W
                            </div>
                          </div>
                        )}
                        {activity.average_cadence && (
                          <div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                              {language === 'es' ? 'Cadencia Promedio' : 'Avg Cadence'}
                            </div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-50">
                              {Math.round(activity.average_cadence)} rpm
                            </div>
                          </div>
                        )}
                        {activity.device_name && (
                          <div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                              {language === 'es' ? 'Dispositivo' : 'Device'}
                            </div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-50">
                              {activity.device_name}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
