import React, { useState, useEffect } from 'react';
import {
  Activity, Link2, RefreshCw, Unlink, AlertTriangle,
  ExternalLink, Heart, Zap, CheckCircle, ArrowRight,
} from 'lucide-react';
import { StravaClient, StravaConnection, SyncResult } from '../../utils/stravaClient';
import { useLanguage } from '../../contexts/LanguageContext';

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepDivider() {
  return (
    <div className="hidden sm:flex items-center justify-center">
      <ArrowRight className="w-5 h-5 text-[#514163]" />
    </div>
  );
}

function HowItWorks({ t }: { t: (key: string) => string }) {
  const steps = [
    {
      number: '01',
      title: t('strava.step1Title'),
      description: t('strava.step1Desc'),
      icon: Link2,
    },
    {
      number: '02',
      title: t('strava.step2Title'),
      description: t('strava.step2Desc'),
      icon: Activity,
    },
    {
      number: '03',
      title: t('strava.step3Title'),
      description: t('strava.step3Desc'),
      icon: Heart,
      link: { href: 'https://www.strava.com/settings/consent', label: t('strava.openStravaPermissions') },
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:gap-0 sm:items-start">
      {steps.map((step, i) => (
        <React.Fragment key={step.number}>
          <div className="group relative rounded-xl border border-[#514163]/40 p-4 hover:border-[#fdda36]/40 transition-colors duration-200">
            {/* Number badge */}
            <div className="absolute -top-3 left-4">
              <span className="font-heading text-xs text-[#fdda36] bg-[#0C0D0F] px-2 border border-[#fdda36]/30 rounded">
                {step.number}
              </span>
            </div>

            {/* Icon with glow */}
            <div className="relative w-10 h-10 rounded-lg mb-3 flex items-center justify-center"
              style={{ background: 'rgba(81,65,99,0.3)', boxShadow: '0 0 16px rgba(81,65,99,0.5)' }}
            >
              <step.icon className="w-5 h-5 text-[#fdda36]" />
            </div>

            <h4 className="font-heading text-xs text-[#514163] leading-tight mb-1.5 font-semibold">{step.title}</h4>
            <p className="font-body text-xs text-[#514163]/70 leading-relaxed">{step.description}</p>

            {step.link && (
              <a
                href={step.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2.5 text-xs font-medium text-[#fdda36] hover:opacity-80 transition-opacity"
              >
                {step.link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {i < steps.length - 1 && <StepDivider />}
        </React.Fragment>
      ))}
    </div>
  );
}

function HeartRateWarning({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
      <div>
        <p className="font-body text-sm font-semibold text-amber-300">
          {t('strava.hrDataDisabled')}
        </p>
        <p className="font-body text-xs text-neutral-400 mt-1">
          {t('strava.hrLimited')}
        </p>
        <a
          href="https://www.strava.com/settings/consent"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-400 hover:opacity-80 transition-opacity"
        >
          {t('strava.enableHeartRate')}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function AthleteAvatar({
  src,
  firstname,
  lastname,
}: {
  src: string | null;
  firstname: string | null;
  lastname: string | null;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = [firstname?.[0], lastname?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={`${firstname} ${lastname}`}
        className="w-14 h-14 rounded-xl object-cover border-2 border-[#fdda36]/40"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center border-2 border-[#fdda36]/40"
      style={{ background: 'rgba(81,65,99,0.5)' }}
    >
      <span className="font-heading text-base text-[#fdda36]">{initials}</span>
    </div>
  );
}

function DataBadge({ icon: Icon, label, active }: { icon: React.ElementType; label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-body font-medium transition-colors ${
      active
        ? 'border-[#fdda36]/30 bg-[#fdda36]/5 text-[#fdda36]'
        : 'border-amber-500/30 bg-amber-500/5 text-amber-400'
    }`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

function SyncSummary({ result, t }: { result: SyncResult; t: (key: string) => string }) {
  const stats = [
    { value: result.synced ?? 0, label: t('strava.activitiesSynced') },
    ...(result.streams_fetched ? [{ value: result.streams_fetched, label: t('strava.streamsFetched') }] : []),
    ...(result.deleted ? [{ value: result.deleted, label: t('strava.removed') }] : []),
  ];

  return (
    <div className="flex items-center gap-4 pt-3 border-t border-[#514163]/30 mt-3 flex-wrap">
      {stats.map((s) => (
        <div key={s.label}>
          <span className="font-heading text-xl text-[#514163] font-bold">{s.value}</span>
          <span className="font-body text-xs text-[#514163]/60 ml-1">{s.label}</span>
        </div>
      ))}
      {result.rate_limit_hit && (
        <p className="text-xs font-body text-amber-400 ml-auto">
          {t('strava.rateLimitHit')}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function StravaSection() {
  const { t } = useLanguage();
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
        setMessage({ type: 'success', text: t('strava.connectedSuccessfully') });
        await loadConnection();
        window.history.replaceState({}, '', '/settings');
        setTimeout(() => handleSync(), 800);
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
    if (!confirm(t('strava.confirmDisconnect'))) return;
    setDisconnecting(true);
    const result = await StravaClient.disconnect();
    if (result.success) {
      setMessage({ type: 'success', text: 'Strava disconnected.' });
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
      setMessage({ type: 'success', text: `Synced ${result.synced} activities.` });
      await loadConnection();
    } else {
      setMessage({ type: 'error', text: result.error || 'Sync failed' });
    }
    setSyncing(false);
  };

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 6000);
      return () => clearTimeout(t);
    }
  }, [message]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#514163]/40 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(81,65,99,0.5)', boxShadow: '0 0 16px rgba(81,65,99,0.5)' }}>
            <Activity className="w-5 h-5 text-[#fdda36]" />
          </div>
          <h2 className="font-heading text-base text-[#514163] font-semibold">{t('strava.title')}</h2>
        </div>
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="w-6 h-6 text-[#514163] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#514163]/40 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(81,65,99,0.5)', boxShadow: '0 0 20px rgba(81,65,99,0.6)' }}
        >
          <Activity className="w-5 h-5 text-[#fdda36]" />
        </div>
        <div>
          <h2 className="font-heading text-base text-[#514163] font-semibold leading-tight">{t('strava.title')}</h2>
          <p className="font-body text-xs text-[#514163]/60">
            {t('strava.subtitle')}
          </p>
        </div>
      </div>

      {/* Toast message */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-body ${
          message.type === 'success'
            ? 'bg-[#fdda36]/10 border border-[#fdda36]/30 text-[#fdda36]'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {message.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* ── NOT CONNECTED ── */}
      {!connection && (
        <div className="space-y-6">
          {/* Divider label */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#514163]/30" />
            <span className="font-body text-xs text-[#514163] font-semibold uppercase tracking-widest">{t('strava.howItWorks')}</span>
            <div className="h-px flex-1 bg-[#514163]/30" />
          </div>

          <HowItWorks t={t} />

          {/* CTA */}
          <div className="pt-2">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-heading text-sm text-[#0C0D0F] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: connecting ? '#b89e27' : '#fdda36',
                boxShadow: connecting ? 'none' : '0 0 24px rgba(253,218,54,0.35)',
              }}
            >
              {connecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {connecting ? t('strava.redirectingToStrava') : t('strava.connectButton')}
            </button>
            <p className="font-body text-xs text-[#514163]/70 mt-2.5">
              {t('strava.noPasswordShared')}
            </p>
          </div>
        </div>
      )}

      {/* ── CONNECTED ── */}
      {connection && (
        <div className="space-y-4">

          {/* Athlete card */}
          <div
            className="rounded-xl border p-4 space-y-3"
            style={{ borderColor: 'rgba(253,218,54,0.2)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <AthleteAvatar
                  src={connection.athlete_profile_pic}
                  firstname={connection.athlete_firstname}
                  lastname={connection.athlete_lastname}
                />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-body text-xs text-emerald-400 font-semibold">{t('strava.connected')}</span>
                  </div>
                  <h3 className="font-heading text-sm text-[#514163] font-semibold leading-tight">
                    {connection.athlete_firstname || connection.athlete_lastname
                      ? `${connection.athlete_firstname ?? ''} ${connection.athlete_lastname ?? ''}`.trim()
                      : `Athlete #${connection.athlete_id}`}
                  </h3>
                  {connection.last_sync_at && (
                    <p className="font-body text-xs text-[#514163]/60 mt-0.5">
                      {t('strava.lastSynced')} {new Date(connection.last_sync_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#514163]/50 text-xs font-body text-[#514163] hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <Unlink className="w-3.5 h-3.5" />
                {disconnecting ? t('strava.disconnecting') : t('strava.disconnect')}
              </button>
            </div>

            {/* Data badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              <DataBadge icon={Activity} label={t('strava.dataBadges.activities')} active={true} />
              <DataBadge
                icon={Heart}
                label={connection.has_heartrate_permission !== false ? t('strava.dataBadges.heartRate') : t('strava.dataBadges.hrDisabled')}
                active={connection.has_heartrate_permission !== false}
              />
              <DataBadge icon={Zap} label={t('strava.dataBadges.powerStreams')} active={true} />
            </div>

            {/* Scopes */}
            {connection.granted_scopes && connection.granted_scopes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#514163]/20">
                {connection.granted_scopes.map((s) => (
                  <span key={s} className="px-2 py-0.5 text-xs font-mono rounded bg-[#514163]/20 text-[#514163] border border-[#514163]/30 font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* HR warning */}
          {connection.has_heartrate_permission === false && <HeartRateWarning t={t} />}

          {/* Sync card */}
          <div className="rounded-xl border border-[#514163]/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-heading text-xs text-[#514163] font-semibold">{t('strava.syncActivities')}</p>
                <p className="font-body text-xs text-[#514163]/60 mt-0.5">
                  {t('strava.syncDesc')}
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-xs text-[#0C0D0F] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                style={{
                  background: syncing ? '#b89e27' : '#fdda36',
                  boxShadow: syncing ? 'none' : '0 0 16px rgba(253,218,54,0.3)',
                }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? t('strava.syncing') : t('strava.syncNow')}
              </button>
            </div>

            {lastSyncResult && <SyncSummary result={lastSyncResult} t={t} />}
          </div>

          {/* "How it works" hint to re-authorize with better scopes */}
          {connection.granted_scopes && !connection.granted_scopes.includes('activity:read_all') && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[#514163]/40">
              <AlertTriangle className="w-4 h-4 text-[#fdda36] mt-0.5 shrink-0" />
              <div>
                <p className="font-body text-xs text-[#514163] font-semibold">{t('strava.limitedPermissions')}</p>
                <p className="font-body text-xs text-[#514163]/70 mt-0.5">
                  {t('strava.reconnectFullAccess')}
                </p>
                <button
                  onClick={handleConnect}
                  className="inline-flex items-center gap-1 mt-2 text-xs font-body font-medium text-[#fdda36] hover:opacity-80 transition-opacity"
                >
                  {t('strava.reconnectWithFullPermissions')}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
