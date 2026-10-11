import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Search, Unlink, Eye, ChevronDown, ChevronUp, FileJson } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

type OverviewUser = {
  user: { id: string; email?: string; full_name?: string; role?: string } | null;
  link: { asciende_user_id: string; ow_user_id: string; consent_at: string | null; consent_version: string | null; created_at: string };
  connections: unknown;
  data_types: Array<{ type: string; last_data_at: string | null }> | null;
  error?: { error: string; status: number } | null;
};

type RawEntry = { link: Record<string, unknown>; raw: PromiseSettledResult<unknown>[] };
type ExecutedSession = { id: string; provider: string | null; sport_raw: string | null; sport_category?: string | null; start_time: string | null; duration_seconds: number | null; distance_m: number | null; avg_hr: number | null; max_hr?: number | null; calories?: number | null };

const call = async (action: string, data: Record<string, unknown> = {}) => {
  const { data: result, error } = await supabase.functions.invoke('open-wearables', { body: { action, ...data } });
  if (error) throw error;
  if (result?.error) throw new Error(result.error);
  return result;
};

export default function WearableAdminPanel() {
  const { language } = useLanguage();
  const es = language === 'es';
  const [overview, setOverview] = useState<OverviewUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedRaw, setExpandedRaw] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Record<string, RawEntry | null>>({});
  const [rawLoading, setRawLoading] = useState<string | null>(null);
  const [sessionsByUser, setSessionsByUser] = useState<Record<string, ExecutedSession[]>>({});
  const [sessionsLoading, setSessionsLoading] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventRaw, setEventRaw] = useState<Record<string, unknown>>({});
  const [metricsBySession, setMetricsBySession] = useState<Record<string, Record<string, unknown>>>({});
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [rangeByUser, setRangeByUser] = useState<Record<string, { start: string; end: string }>>({});
  const [unmappedByUser, setUnmappedByUser] = useState<Record<string, string[]>>({});

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await call('admin-overview');
      setOverview(result?.users || []);
    } catch (e) { setError(e instanceof Error ? e.message : (es ? 'Error al cargar.' : 'Failed to load.')); }
    finally { setLoading(false); }
  }, [es]);

  useEffect(() => { void refresh(); }, [refresh]);

  const loadRaw = async (userId: string) => {
    if (expandedRaw === userId) { setExpandedRaw(null); return; }
    setExpandedRaw(userId);
    void loadImportedSessions(userId);
    if (rawData[userId]) return;
    setRawLoading(userId);
    try {
      const result = await call('admin-raw', { asciende_user_id: userId });
      setRawData(prev => ({ ...prev, [userId]: result }));
    } catch (e) {
      setRawData(prev => ({ ...prev, [userId]: { link: {}, raw: [{ status: 'rejected', reason: { error: e instanceof Error ? e.message : 'failed' } }] } }));
    } finally { setRawLoading(null); }
  };

  const loadImportedSessions = async (userId: string) => {
    if (sessionsByUser[userId]) return;
    setSessionsLoading(userId);
    try {
      const result = await call('admin-read-imports', { athlete_id: userId });
      setSessionsByUser(prev => ({ ...prev, [userId]: result.sessions || [] }));
      setMetricsBySession(prev => ({ ...prev, ...Object.fromEntries((result.metrics || []).map((metric: Record<string, unknown>) => [String(metric.executed_session_id), metric])) }));
      setUnmappedByUser(prev => ({ ...prev, [userId]: result.unmapped_sports || [] }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load imported workouts.'); }
    setSessionsLoading(null);
  };

  const toggleEventRaw = async (sessionId: string) => {
    if (expandedEvent === sessionId) { setExpandedEvent(null); return; }
    setExpandedEvent(sessionId);
    if (Object.prototype.hasOwnProperty.call(eventRaw, sessionId)) return;
    const user = Object.entries(sessionsByUser).find(([, rows]) => rows.some(row => row.id === sessionId))?.[0];
    if (!user) return;
    try {
      const result = await call('admin-read-imports', { athlete_id: user, include_raw: true });
      const row = (result.sessions || []).find((session: ExecutedSession & { raw?: unknown }) => session.id === sessionId);
      if (row) setEventRaw(prev => ({ ...prev, [sessionId]: row.raw }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load raw JSON.'); }
  };

  const recalculate = async (userId: string, sessionId?: string, range?: { start: string; end: string }) => {
    const key = sessionId || userId; setRecalculating(key);
    try {
      await call('admin-recalculate-metrics', sessionId ? { executed_session_id: sessionId } : { athlete_id: userId, ...(range?.start ? { range_start: `${range.start}T00:00:00.000Z` } : {}), ...(range?.end ? { range_end: `${range.end}T23:59:59.999Z` } : {}) });
      setMetricsBySession({});
      await new Promise(resolve => setTimeout(resolve, 1500));
      const result = await call('admin-read-imports', { athlete_id: userId });
      setSessionsByUser(prev => ({ ...prev, [userId]: result.sessions || [] }));
      setMetricsBySession(Object.fromEntries((result.metrics || []).map((metric: Record<string, unknown>) => [String(metric.executed_session_id), metric])));
      setUnmappedByUser(prev => ({ ...prev, [userId]: result.unmapped_sports || [] }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Recalculation failed.'); }
    finally { setRecalculating(null); }
  };

  const unlink = async (userId: string) => {
    if (!confirm(es ? '¿Desvincular este usuario de Open Wearables? No se borraran datos.' : 'Unlink this user from Open Wearables? No data will be deleted.')) return;
    try {
      await call('admin-unlink', { asciende_user_id: userId });
      setRawData(prev => { const next = { ...prev }; delete next[userId]; return next; });
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : (es ? 'Error al desvincular.' : 'Unlink failed.')); }
  };

  const filtered = overview.filter(entry => {
    if (!search) return true;
    const q = search.toLowerCase();
    const u = entry.user;
    return u && (u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q) || entry.link.ow_user_id.toLowerCase().includes(q));
  });

  const fmtDate = (v?: string | null) => v ? new Date(v).toLocaleString(es ? 'es' : 'en') : (es ? 'Sin datos' : 'No data');
  const connList = (conn: unknown): Array<{ provider?: string; status?: string; connected_at?: string | null; last_synced_at?: string | null }> => {
    if (Array.isArray(conn)) return conn;
    if (conn && typeof conn === 'object') { const items = (conn as Record<string, unknown>).items; if (Array.isArray(items)) return items; }
    return [];
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Activity className="w-5 h-5 text-[#fdda36]" />
        {es ? 'Usuarios vinculados a Open Wearables' : 'Open Wearables linked users'}
      </h3>
      <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {es ? 'Actualizar' : 'Refresh'}
      </button>
    </div>

    {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={es ? 'Buscar por nombre, email o UUID...' : 'Search by name, email or UUID...'} className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:ring-2 focus:ring-[#fdda36] dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
    </div>

    {loading ? <p className="text-sm text-gray-500">{es ? 'Cargando...' : 'Loading...'}</p> : filtered.length === 0 ? <p className="rounded-xl border border-gray-200 p-5 text-sm text-gray-500 dark:border-gray-700">{es ? 'No hay usuarios vinculados.' : 'No linked users.'}</p> : (
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3">{es ? 'Usuario' : 'User'}</th>
              <th className="px-4 py-3">{es ? 'OW UUID' : 'OW UUID'}</th>
              <th className="px-4 py-3">{es ? 'Consentimiento' : 'Consent'}</th>
              <th className="px-4 py-3">{es ? 'Conexiones' : 'Connections'}</th>
              <th className="px-4 py-3">{es ? 'Acciones' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map(entry => {
              const conns = connList(entry.connections);
              const uid = entry.link.asciende_user_id;
              const isExpanded = expandedRaw === uid;
              return <>
                <tr key={uid} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{entry.user?.full_name || entry.user?.email || uid}</div>
                    {entry.user?.email && entry.user?.full_name && <div className="text-xs text-gray-500">{entry.user.email}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{entry.link.ow_user_id}</td>
                  <td className="px-4 py-3">
                    {entry.link.consent_at ? <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">{es ? 'Aceptado' : 'Accepted'}</span> : <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">{es ? 'Pendiente' : 'Pending'}</span>}
                    {entry.link.consent_at && <div className="mt-1 text-xs text-gray-400">{fmtDate(entry.link.consent_at)}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {entry.error ? <span className="text-xs text-red-600 dark:text-red-400">{entry.error.error}</span> : conns.length === 0 ? <span className="text-xs text-gray-400">{es ? 'Sin conexiones' : 'No connections'}</span> : <div className="flex flex-wrap gap-1">{conns.map((c, i) => <span key={`${c.provider}-${i}`} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'active' || c.status === 'connected' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>{c.provider}</span>)}</div>}
                    {entry.data_types && entry.data_types.length > 0 && <div className="mt-1 text-xs text-gray-400">{es ? `${entry.data_types.length} tipos de datos` : `${entry.data_types.length} data types`}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => void loadRaw(uid)} disabled={rawLoading === uid} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200" title={es ? 'Respuesta cruda' : 'Raw response'}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button onClick={() => void unlink(uid)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={es ? 'Desvincular' : 'Unlink'}>
                        <Unlink className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <td colSpan={5} className="px-4 py-3">
                      <section className="mb-5 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex flex-wrap items-center justify-between gap-2"><h5 className="text-sm font-semibold text-gray-900 dark:text-white">{es ? 'Importados en Asciende' : 'Imported into Asciende'}</h5><div className="flex flex-wrap items-center gap-1"><input aria-label={es ? 'Desde' : 'From'} type="date" value={rangeByUser[uid]?.start || ''} onChange={event => setRangeByUser(prev => ({ ...prev, [uid]: { start: event.target.value, end: prev[uid]?.end || '' } }))} className="rounded border border-gray-300 bg-white px-1 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white" /><input aria-label={es ? 'Hasta' : 'To'} type="date" value={rangeByUser[uid]?.end || ''} onChange={event => setRangeByUser(prev => ({ ...prev, [uid]: { start: prev[uid]?.start || '', end: event.target.value } }))} className="rounded border border-gray-300 bg-white px-1 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white" /><button onClick={() => void recalculate(uid, undefined, rangeByUser[uid])} disabled={recalculating === uid} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200">{recalculating === uid ? (es ? 'Recalculando…' : 'Recalculating…') : (es ? 'Recalcular rango' : 'Recalculate range')}</button></div></div>
                        {sessionsLoading === uid ? <p className="mt-2 text-xs text-gray-500">{es ? 'Cargando…' : 'Loading…'}</p> : (sessionsByUser[uid] || []).length === 0 ? <p className="mt-2 text-xs text-gray-500">{es ? 'No hay entrenamientos importados.' : 'No imported workouts.'}</p> : <div className="mt-2 space-y-2">{sessionsByUser[uid].map(session => <div key={session.id} className="rounded-md border border-gray-100 p-2 dark:border-gray-800">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300"><span>{fmtDate(session.start_time)} · {session.sport_raw || '—'}{session.sport_category === 'other' && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{es ? 'Sin mapear' : 'Unmapped'}</span>} · {session.duration_seconds == null ? '—' : `${Math.round(session.duration_seconds / 60)} min`} · {session.distance_m == null ? '—' : `${(session.distance_m / 1000).toFixed(2)} km`} · {session.avg_hr == null ? '—' : `${session.avg_hr} bpm`}</span><span className="flex gap-2"><button onClick={() => void recalculate(uid, session.id)} disabled={recalculating === session.id} className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600">{recalculating === session.id ? '…' : (es ? 'Recalcular' : 'Recalculate')}</button><button onClick={() => void toggleEventRaw(session.id)} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 dark:border-gray-600"><FileJson className="h-3 w-3" />{expandedEvent === session.id ? (es ? 'Ocultar JSON crudo' : 'Hide raw JSON') : (es ? 'Ver JSON crudo' : 'View raw JSON')}</button></span></div>
                          {metricsBySession[session.id] && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{(metricsBySession[session.id].avg_power as number | null) != null ? `${es ? 'Potencia media' : 'Avg power'} ${Math.round(metricsBySession[session.id].avg_power as number)} W · ` : ''}{(metricsBySession[session.id].normalized_power as number | null) != null ? `NP ${Math.round(metricsBySession[session.id].normalized_power as number)} W · ` : ''}{(metricsBySession[session.id].tss as number | null) != null ? `TSS ${Math.round(metricsBySession[session.id].tss as number)} · ` : ''}{metricsBySession[session.id].coverage_pct != null ? `${es ? 'Cobertura' : 'Coverage'} ${Math.round(metricsBySession[session.id].coverage_pct as number)}%` : (es ? 'Métricas pendientes o sin series disponibles' : 'Metrics pending or no data series available')}</p>}
                          {expandedEvent === session.id && eventRaw[session.id] !== undefined && <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">{JSON.stringify(eventRaw[session.id], null, 2)}</pre>}
                        </div>)}</div>}
                        {(unmappedByUser[uid] || []).length > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{es ? 'Deportes sin mapear: ' : 'Unmapped sports: '}{unmappedByUser[uid].join(', ')}</p>}
                      </section>
                      {rawLoading === uid ? <p className="text-xs text-gray-500">{es ? 'Cargando...' : 'Loading...'}</p> : rawData[uid] ? (() => {
                        const raw = rawData[uid]!;
                        const userResult = raw.raw[0]?.status === 'fulfilled' ? raw.raw[0].value : null;
                        const connResult = raw.raw[1]?.status === 'fulfilled' ? raw.raw[1].value : null;
                        const userError = raw.raw[0]?.status === 'rejected' ? (raw.raw[0].reason as { error?: string })?.error : null;
                        const connError = raw.raw[1]?.status === 'rejected' ? (raw.raw[1].reason as { error?: string })?.error : null;
                        const safeUser = userResult ? (() => { const u = userResult as Record<string, unknown>; const { id, email, first_name, last_name, external_user_id, created_at } = u; return { id, email, first_name, last_name, external_user_id, created_at }; })() : null;
                        const safeConn = connResult ? (() => { const c = connResult as Record<string, unknown>; const items = Array.isArray(c) ? c : (c.items as Array<Record<string, unknown>> | undefined); if (!items) return null; return items.map(item => { const { provider, status, connected_at, last_synced_at } = item; return { provider, status, connected_at, last_synced_at }; }); })() : null;
                        return <div className="space-y-2">
                          <div>
                            <h5 className="text-xs font-semibold uppercase text-gray-500">{es ? 'Usuario OW' : 'OW User'}</h5>
                            {userError ? <pre className="mt-1 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">{userError}</pre> : safeUser ? <pre className="mt-1 rounded bg-white p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">{JSON.stringify(safeUser, null, 2)}</pre> : <p className="text-xs text-gray-400">{es ? 'Sin datos' : 'No data'}</p>}
                          </div>
                          <div>
                            <h5 className="text-xs font-semibold uppercase text-gray-500">{es ? 'Conexiones (metadatos)' : 'Connections (metadata)'}</h5>
                            {connError ? <pre className="mt-1 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">{connError}</pre> : safeConn ? <pre className="mt-1 rounded bg-white p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">{JSON.stringify(safeConn, null, 2)}</pre> : <p className="text-xs text-gray-400">{es ? 'Sin datos' : 'No data'}</p>}
                          </div>
                        </div>;
                      })() : <p className="text-xs text-gray-500">{es ? 'Sin datos' : 'No data'}</p>}
                    </td>
                  </tr>
                )}
              </>;
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>;
}
