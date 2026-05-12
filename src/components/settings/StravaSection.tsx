import React, { useState, useEffect } from 'react';
import { Activity, Link2, RefreshCw, Unlink, AlertTriangle, ExternalLink, User, Zap, Heart } from 'lucide-react';
import { StravaClient, StravaConnection, SyncResult } from '../../utils/stravaClient';

function HeartRateWarning() {
  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          Heart rate data is disabled in Strava permissions.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          Enable it in your Strava consent settings to sync HR data.
        </p>
        <a
          href="https://www.strava.com/settings/consent"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
        >
          Open Strava consent settings
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function AthleteAvatar({ src, firstname, lastname }: { src: string | null; firstname: string | null; lastname: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initials = [firstname?.[0], lastname?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={`${firstname} ${lastname}`}
        className="w-12 h-12 rounded-full object-cover border-2 border-orange-200 dark:border-orange-700"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 border-2 border-orange-200 dark:border-orange-700 flex items-center justify-center">
      <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{initials}</span>
    </div>
  );
}

function SyncStats({ result }: { result: SyncResult }) {
  const items = [
    { label: 'Activities synced', value: result.synced ?? 0 },
    ...(result.streams_fetched !== undefined ? [{ label: 'Streams fetched', value: result.streams_fetched }] : []),
    ...(result.deleted ? [{ label: 'Removed', value: result.deleted }] : []),
  ];

  return (
    <div className="flex gap-4 mt-2">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{item.value}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function StravaSection() {
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConnection();
    handleOAuthCallback();
  }, []);

  const loadConnection = async () => {
    setLoading(true);
    const conn = await StravaClient.getConnection();
    setConnection(conn);
    setLoading(false);
  };

  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const scope = urlParams.get('scope');
    const stravaParam = urlParams.get('strava');

    if (code && scope && stravaParam === 'callback') {
      setLoading(true);
      const result = await StravaClient.exchangeToken(code, scope);

      if (result.success) {
        setMessage({ type: 'success', text: 'Successfully connected to Strava!' });
        await loadConnection();
        window.history.replaceState({}, '', '/settings');
        // Trigger initial sync automatically
        setTimeout(() => handleSync(), 1000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to connect to Strava' });
      }
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const authUrl = await StravaClient.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error) {
      setConnecting(false);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to connect to Strava',
      });
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Strava account?')) return;

    setDisconnecting(true);
    const result = await StravaClient.disconnect();

    if (result.success) {
      setMessage({ type: 'success', text: 'Successfully disconnected from Strava' });
      setConnection(null);
      setLastSyncResult(null);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to disconnect' });
    }
    setDisconnecting(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setLastSyncResult(null);
    const result = await StravaClient.syncActivities({ perPage: 100 });

    if (result.success) {
      setLastSyncResult(result);
      const streamsNote = result.streams_fetched ? ` • ${result.streams_fetched} streams` : '';
      const rateLimitNote = result.rate_limit_hit ? ' (rate limit hit, remaining streams queued)' : '';
      setMessage({
        type: 'success',
        text: `Synced ${result.synced} activities${streamsNote}${rateLimitNote}`,
      });
      await loadConnection();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to sync activities' });
    }
    setSyncing(false);
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Strava Integration</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Strava Integration</h2>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Connect your Strava account to automatically import all your activities including full streams, power data, and GPS routes.
        </p>

        {connection ? (
          <div className="space-y-4">
            {/* Athlete card */}
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AthleteAvatar
                    src={connection.athlete_profile_pic}
                    firstname={connection.athlete_firstname}
                    lastname={connection.athlete_lastname}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {connection.athlete_firstname || connection.athlete_lastname
                          ? `${connection.athlete_firstname ?? ''} ${connection.athlete_lastname ?? ''}`.trim()
                          : `Athlete #${connection.athlete_id}`}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Strava ID: {connection.athlete_id}
                    </p>
                    {connection.last_sync_at && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors border border-red-200 dark:border-red-700"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>

              {/* Scope badges */}
              {connection.granted_scopes && connection.granted_scopes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {connection.granted_scopes.map((s) => (
                    <span key={s} className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* HR warning if permission missing */}
            {connection.has_heartrate_permission === false && <HeartRateWarning />}

            {/* Sync section */}
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Sync Activities</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Fetches activities, streams, power, HR, and GPS data
                  </p>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>

              {lastSyncResult && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                  <SyncStats result={lastSyncResult} />
                  {lastSyncResult.rate_limit_hit && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Strava rate limit reached — remaining streams will be fetched on next sync.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Data coverage indicators */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Activity, label: 'Activities', desc: 'All types', active: true },
                { icon: Heart, label: 'Heart Rate', desc: connection.has_heartrate_permission !== false ? 'Enabled' : 'Disabled', active: connection.has_heartrate_permission !== false },
                { icon: Zap, label: 'Power', desc: 'Watts & streams', active: true },
              ].map(({ icon: Icon, label, desc, active }) => (
                <div key={label} className={`p-3 rounded-lg border text-center ${
                  active
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                }`}>
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${active ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`} />
                  <p className={`text-xs font-medium ${active ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>{label}</p>
                  <p className={`text-xs ${active ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {connecting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Link2 className="w-5 h-5" />
              )}
              {connecting ? 'Redirecting to Strava...' : 'Connect to Strava'}
            </button>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">What gets imported</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  'All activity types', 'Duration & distance',
                  'Heart rate streams', 'Power (watts) streams',
                  'GPS routes & polylines', 'Cadence & elevation',
                  'Calories & kilojoules', 'Device name',
                  'Perceived exertion', 'Trainer/indoor flag',
                ].map((item) => (
                  <p key={item} className="text-xs text-blue-800 dark:text-blue-300">• {item}</p>
                ))}
              </div>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-200 mb-2">Privacy & Data</h3>
              <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                <li>• Activities are stored securely in your account</li>
                <li>• You can disconnect at any time</li>
                <li>• Metrics are read-only (locked from Strava)</li>
                <li>• You can add notes, RPE, and tags to any activity</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
