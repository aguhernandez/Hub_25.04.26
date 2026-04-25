import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Activity, Check, AlertCircle, RefreshCw, Trash2, Link as LinkIcon, Calendar } from 'lucide-react';

export default function TrainingPeaksSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [icsUrl, setIcsUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadConnection();
  }, [profile?.id]);

  const loadConnection = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('tp_connections')
      .select('*')
      .eq('athlete_id', profile.id)
      .single();

    if (data) {
      setConnection(data);
      setIcsUrl(data.ics_url);
    }
  };

  const normalizeIcsUrl = (url: string): string => {
    // Convert webcal:// to https://
    return url.replace(/^webcal:\/\//i, 'https://');
  };

  const validateIcsUrl = (url: string): boolean => {
    if (!url) return false;

    // Clean URL: trim whitespace and normalize webcal
    const cleanUrl = url.trim();
    const normalizedUrl = normalizeIcsUrl(cleanUrl);

    try {
      const urlObj = new URL(normalizedUrl);
      const hasIcsExtension = normalizedUrl.toLowerCase().includes('.ics');
      const isHttpProtocol = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      return hasIcsExtension && isHttpProtocol;
    } catch {
      return false;
    }
  };

  const handleConnect = async () => {
    setError('');
    setSuccess('');

    // Clean the URL before validation
    const cleanUrl = icsUrl.trim();
    const normalizedUrl = normalizeIcsUrl(cleanUrl);

    // Debug log
    console.log('Original URL:', cleanUrl);
    console.log('Normalized URL:', normalizedUrl);
    console.log('URL length:', cleanUrl.length);
    console.log('Contains .ics:', cleanUrl.toLowerCase().includes('.ics'));
    console.log('Is webcal:', cleanUrl.toLowerCase().startsWith('webcal://'));

    if (!validateIcsUrl(cleanUrl)) {
      // More detailed error
      let debugInfo = '';
      try {
        const urlObj = new URL(cleanUrl);
        debugInfo = `\n\nProtocol: ${urlObj.protocol}\nHost: ${urlObj.host}\nPath: ${urlObj.pathname}`;
      } catch (e: any) {
        debugInfo = `\n\nError parsing URL: ${e.message}`;
      }

      setError(language === 'es'
        ? `URL inválida. Debe ser una URL HTTPS o webcal:// que contenga .ics\n\nURL recibida (${cleanUrl.length} caracteres):\n"${cleanUrl}"\n${debugInfo}\n\nEjemplos válidos:\n• https://home.trainingpeaks.com/ics/XXXXX/calendar.ics\n• webcal://www.trainingpeaks.com/ical/XXXXX.ics`
        : `Invalid URL. Must be an HTTPS or webcal:// URL containing .ics\n\nReceived (${cleanUrl.length} characters):\n"${cleanUrl}"\n${debugInfo}\n\nValid examples:\n• https://home.trainingpeaks.com/ics/XXXXX/calendar.ics\n• webcal://www.trainingpeaks.com/ical/XXXXX.ics`);
      return;
    }

    setLoading(true);

    try {
      if (connection) {
        // Update existing - store normalized URL
        const { error: updateError } = await supabase
          .from('tp_connections')
          .update({
            ics_url: normalizedUrl,
            status: 'pending',
            last_error: null,
            sync_enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);

        if (updateError) throw updateError;
      } else {
        // Create new - store normalized URL
        const { error: insertError } = await supabase
          .from('tp_connections')
          .insert({
            athlete_id: profile?.id,
            ics_url: normalizedUrl,
            status: 'pending',
            sync_enabled: true
          });

        if (insertError) throw insertError;
      }

      await loadConnection();
      setSuccess(language === 'es'
        ? '✅ Conexión guardada. Haz clic en "Sincronizar ahora" para importar tus entrenamientos.'
        : '✅ Connection saved. Click "Sync Now" to import your workouts.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setError('');
    setSuccess('');
    setSyncing(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-trainingpeaks-ics`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'sync' })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      await loadConnection();
      setSuccess(language === 'es'
        ? `✅ Sincronizado: ${result.synced} entrenamientos importados de ${result.total} eventos.`
        : `✅ Synced: ${result.synced} workouts imported from ${result.total} events.`);
    } catch (err: any) {
      setError(language === 'es'
        ? `Error: ${err.message}. Verifica tu URL ICS y que tengas TrainingPeaks Premium.`
        : `Error: ${err.message}. Check your ICS URL and that you have TrainingPeaks Premium.`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    if (!confirm(language === 'es'
      ? '¿Desconectar TrainingPeaks? Los entrenamientos importados no se eliminarán.'
      : 'Disconnect TrainingPeaks? Imported workouts will not be deleted.')) {
      return;
    }

    setLoading(true);

    try {
      const { error: deleteError } = await supabase
        .from('tp_connections')
        .delete()
        .eq('id', connection.id);

      if (deleteError) throw deleteError;

      setConnection(null);
      setIcsUrl('');
      setSuccess(language === 'es' ? '✅ Desconectado' : '✅ Disconnected');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!connection) return null;

    const statusConfig = {
      connected: {
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: Check,
        text: language === 'es' ? 'Conectado' : 'Connected'
      },
      error: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: AlertCircle,
        text: language === 'es' ? 'Error' : 'Error'
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: RefreshCw,
        text: language === 'es' ? 'Pendiente' : 'Pending'
      },
      disconnected: {
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 dark:bg-gray-700 dark:text-gray-400',
        icon: AlertCircle,
        text: language === 'es' ? 'Desconectado' : 'Disconnected'
      }
    };

    const config = statusConfig[connection.status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.text}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
            TrainingPeaks Sync
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
            {language === 'es'
              ? 'Conecta tu calendario de TrainingPeaks'
              : 'Connect your TrainingPeaks calendar'}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <p className="font-medium mb-1">
              {language === 'es' ? '¿Cómo obtener tu ICS Feed URL?' : 'How to get your ICS Feed URL?'}
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
              <li>{language === 'es' ? 'Inicia sesión en TrainingPeaks' : 'Log in to TrainingPeaks'}</li>
              <li>{language === 'es' ? 'Ve a Configuración → Feeds' : 'Go to Settings → Feeds'}</li>
              <li>{language === 'es' ? 'Copia la URL del "Athlete Calendar Feed" (empieza con webcal://)' : 'Copy the "Athlete Calendar Feed" URL (starts with webcal://)'}</li>
              <li>{language === 'es' ? 'Pégala aquí abajo (se convertirá a https:// automáticamente)' : 'Paste it below (will convert to https:// automatically)'}</li>
            </ol>
            <p className="mt-2 text-xs text-blue-700 dark:text-blue-400">
              ⚠️ {language === 'es' ? 'Requiere cuenta Premium de TrainingPeaks' : 'Requires TrainingPeaks Premium account'}
              <br />
              💡 {language === 'es' ? 'Acepta URLs webcal:// y https://' : 'Accepts webcal:// and https:// URLs'}
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {connection && (
        <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
              {language === 'es' ? 'Estado' : 'Status'}
            </span>
            {getStatusBadge()}
          </div>

          {connection.last_sync_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                {language === 'es' ? 'Última sincronización' : 'Last sync'}
              </span>
              <span className="text-gray-900 dark:text-white dark:text-white font-medium">
                {new Date(connection.last_sync_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
              </span>
            </div>
          )}

          {connection.last_error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{connection.last_error}</p>
            </div>
          )}
        </div>
      )}

      {/* ICS URL Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
          ICS Feed URL *
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              placeholder="webcal://www.trainingpeaks.com/ical/XXXXX.ics"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
          {language === 'es'
            ? 'Tu URL privada del calendario (webcal:// o https://). Se convertirá automáticamente.'
            : 'Your private calendar URL (webcal:// or https://). Will be converted automatically.'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleConnect}
          disabled={loading || !icsUrl}
          className="px-6 py-2.5 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (language === 'es' ? 'Guardando...' : 'Saving...') : (connection ? (language === 'es' ? 'Actualizar URL' : 'Update URL') : (language === 'es' ? 'Conectar' : 'Connect'))}
        </button>

        {connection && (
          <>
            <button
              onClick={handleSync}
              disabled={syncing || connection.status === 'error'}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? (language === 'es' ? 'Sincronizando...' : 'Syncing...') : (language === 'es' ? 'Sincronizar ahora' : 'Sync Now')}
            </button>

            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {language === 'es' ? 'Desconectar' : 'Disconnect'}
            </button>
          </>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">{error}</p>
        </div>
      )}
    </div>
  );
}
