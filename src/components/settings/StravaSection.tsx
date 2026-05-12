import React, { useState, useEffect } from 'react';
import { Activity, Link2, RefreshCw, Unlink, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { StravaClient, StravaConnection } from '../../utils/stravaClient';

function StravaSetupGuide() {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Strava Client ID not configured
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            To connect Strava, the platform administrator needs to add <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">VITE_STRAVA_CLIENT_ID</code> to the app configuration.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
          Setup steps (admin)
        </h3>
        <ol className="space-y-3">
          {[
            {
              step: '1',
              title: 'Create a Strava API Application',
              desc: 'Go to strava.com/settings/api and create a new application. Set the Authorization Callback Domain to your app domain.',
              link: 'https://www.strava.com/settings/api',
              linkText: 'Open Strava API Settings',
            },
            {
              step: '2',
              title: 'Get your Client ID',
              desc: 'After creating the app, Strava gives you a Client ID (public, safe to expose) and a Client Secret (keep private).',
            },
            {
              step: '3',
              title: 'Add VITE_STRAVA_CLIENT_ID to .env',
              desc: 'In the project root .env file, add: VITE_STRAVA_CLIENT_ID=your_client_id_here and restart the dev server.',
              code: 'VITE_STRAVA_CLIENT_ID=12345',
            },
            {
              step: '4',
              title: 'STRAVA_CLIENT_SECRET is already set',
              desc: 'The Client Secret is already configured as a Supabase Edge Function secret. Only the Client ID needs to be added to .env.',
              done: true,
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-3">
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                item.done
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}>
                {item.done ? <CheckCircle className="w-4 h-4" /> : item.step}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.title}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.desc}</p>
                {item.code && (
                  <code className="mt-1.5 block text-xs font-mono bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded border border-neutral-200 dark:border-neutral-700">
                    {item.code}
                  </code>
                )}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    {item.linkText}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function StravaSection() {
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isConfigured = StravaClient.isConfigured();

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
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
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to connect to Strava' });
      }
      setLoading(false);
    }
  };

  const handleConnect = () => {
    try {
      const authUrl = StravaClient.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error) {
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
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to disconnect' });
    }
    setDisconnecting(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await StravaClient.syncActivities({ perPage: 30 });

    if (result.success) {
      setMessage({
        type: 'success',
        text: `Synced ${result.synced} activities from Strava (${result.total_fetched} total fetched)`,
      });
      await loadConnection();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to sync activities' });
    }
    setSyncing(false);
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Strava Integration
        </h2>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
        </div>
      ) : !isConfigured ? (
        <StravaSetupGuide />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Connect your Strava account to automatically import your running and cycling activities.
          </p>

          {connection ? (
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Athlete ID: {connection.athlete_id}
                  </p>
                  {connection.last_sync_at && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <Unlink className="w-4 h-4" />
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Activities Now'}
                </button>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  Manually sync your latest activities from Strava
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              <Link2 className="w-5 h-5" />
              Connect to Strava
            </button>
          )}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              What gets imported?
            </h3>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Running and cycling activities only</li>
              <li>• Basic metrics: duration, distance, speed, elevation</li>
              <li>• Heart rate data (if available)</li>
              <li>• Power data (cycling only, if available)</li>
              <li>• Cadence data (if available)</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-200 mb-2">
              Privacy & Data
            </h3>
            <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
              <li>• Your Strava activities are stored as raw records</li>
              <li>• You control which activities to import to your training log</li>
              <li>• You can disconnect at any time</li>
              <li>• Activity metrics cannot be edited (locked)</li>
              <li>• You can add notes, RPE, and tags to imported activities</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
