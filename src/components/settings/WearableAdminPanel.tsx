import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Search, Unlink, Eye, ChevronDown, ChevronUp } from 'lucide-react';
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
    if (rawData[userId]) return;
    setRawLoading(userId);
    try {
      const result = await call('admin-raw', { asciende_user_id: userId });
      setRawData(prev => ({ ...prev, [userId]: result }));
    } catch (e) {
      setRawData(prev => ({ ...prev, [userId]: { link: {}, raw: [{ status: 'rejected', reason: { error: e instanceof Error ? e.message : 'failed' } }] } }));
    } finally { setRawLoading(null); }
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
