import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Loader2, Unplug } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type Provider = { id?: string; name?: string; provider?: string; display_name?: string; available?: boolean; enabled?: boolean; is_enabled?: boolean; has_cloud_api?: boolean; [key: string]: unknown };
type Connection = { provider?: string; status?: string; last_synced_at?: string | null; connected_at?: string | null; [key: string]: unknown };
const call = async (action: string, data: Record<string, unknown> = {}) => {
  const { data: result, error } = await supabase.functions.invoke('open-wearables', { body: { action, ...data } });
  if (error) {
    const context = (error as { context?: unknown }).context;
    let detail = '';
    let status = '';
    if (context instanceof Response) {
      status = String(context.status);
      try {
        const body = await context.clone().json() as { error?: unknown; status?: unknown };
        if (typeof body.error === 'string') detail = body.error;
        if (body.status) status = String(body.status);
      } catch { /* Keep the generic SDK message if its response is not JSON. */ }
    }
    throw new Error(`${action}: ${detail || error.message}${status ? ` (HTTP ${status})` : ''}`);
  }
  if (result?.error) throw new Error(result.error);
  return result;
};

export default function WearableConnectionsSection() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const es = language === 'es';
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dataTypes, setDataTypes] = useState<Array<{ type: string; last_data_at: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Provider | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState('');
  const [linked, setLinked] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [providerState, connectionState] = await Promise.allSettled([call('providers'), call('connections')]);
      const failures: string[] = [];
      let providerResult: any = null;
      let connectionResult: any = null;
      if (providerState.status === 'fulfilled') providerResult = providerState.value;
      else failures.push(providerState.reason instanceof Error ? providerState.reason.message : 'providers: request failed');
      if (connectionState.status === 'fulfilled') connectionResult = connectionState.value;
      else failures.push(connectionState.reason instanceof Error ? connectionState.reason.message : 'connections: request failed');
      if (providerState.status === 'fulfilled') {
        const list = Array.isArray(providerResult) ? providerResult : (providerResult?.items || providerResult?.providers || []);
        const first = ['oura', 'polar', 'suunto'];
      setProviders(list.filter((p: Provider) => p.available !== false && p.enabled !== false && p.is_enabled !== false && p.has_cloud_api !== false).sort((a: Provider, b: Provider) => {
          const aId = String(a.id || a.provider || '').toLowerCase();
          const bId = String(b.id || b.provider || '').toLowerCase();
          return (first.indexOf(aId) < 0 ? 99 : first.indexOf(aId)) - (first.indexOf(bId) < 0 ? 99 : first.indexOf(bId));
        }));
      } else {
        setProviders([]);
      }
      if (connectionState.status === 'fulfilled') {
        const rows = Array.isArray(connectionResult?.connections) ? connectionResult.connections : (connectionResult?.connections?.items || []);
        setConnections(rows);
        setDataTypes(Array.isArray(connectionResult?.data_types) ? connectionResult.data_types : []);
        setLinked(!!connectionResult?.linked);
      } else {
        setConnections([]); setDataTypes([]); setLinked(false);
      }
      if (failures.length) setError(failures.join(' · '));
    } catch (e) { setError(e instanceof Error ? e.message : (es ? 'No se pudo cargar el estado.' : 'Could not load connection status.')); }
    finally { setLoading(false); }
  }, [es]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('wearable');
    if (result) {
      setError(result === 'error' ? (es ? 'La conexión con el proveedor no se completó.' : 'The provider connection did not complete.') : '');
      void refresh();
      params.delete('wearable');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
  }, [es, refresh]);

  const byProvider = useMemo(() => new Map(connections.map(c => [c.provider || '', c])), [connections]);
  const displayDate = (value?: string | null) => value ? new Date(value).toLocaleString(es ? 'es' : 'en') : (es ? 'Sin datos' : 'No data');

  const beginConnect = async (provider: Provider) => {
    const id = String(provider.id || provider.provider || '');
    if (!id) return;
    setBusy(id); setError('');
    try {
      await call('consent');
      const result = await call('connect-start', { provider: id });
      window.location.assign(result.authorization_url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Connection failed'); setBusy(''); }
  };

  const disconnect = async (provider: string) => {
    setBusy(provider); setError('');
    try { await call('disconnect', { provider }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Disconnect failed'); }
    finally { setBusy(''); }
  };

  return <section className="space-y-5">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{es ? 'Dispositivos y datos' : 'Devices and data'}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{es ? 'Conecta tus plataformas de salud y actividad física.' : 'Connect your health and activity platforms.'}</p>
    </div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
    {loading ? <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />{es ? 'Cargando proveedores…' : 'Loading providers…'}</div> : providers.length === 0 ? <p className="rounded-xl border border-gray-200 p-5 text-sm text-gray-500 dark:border-gray-700">{es ? 'No hay proveedores disponibles en este momento.' : 'No providers are currently available.'}</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {providers.map(provider => {
        const id = String(provider.id || provider.provider || '');
        const conn = byProvider.get(id);
        const active = conn?.status === 'active' || conn?.status === 'connected';
        return <article key={id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-lg bg-[#514163]/10 p-2 text-[#514163] dark:text-[#fdda36]"><Activity className="h-5 w-5" /></div><div><h3 className="font-semibold text-gray-900 dark:text-white">{String(provider.display_name || provider.name || id)}</h3><p className={`mt-0.5 text-xs ${active ? 'text-green-600 dark:text-green-400' : conn ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>{active ? (es ? 'Conectado' : 'Connected') : conn ? (es ? 'Error' : 'Error') : (es ? 'No conectado' : 'Not connected')}</p></div></div>{active && <CheckCircle2 className="h-5 w-5 text-green-500" />}</div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{es ? 'Última sincronización' : 'Last sync'}: {displayDate(conn?.last_synced_at)}</p>
          <div className="mt-4">{active ? <button onClick={() => void disconnect(id)} disabled={busy === id} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"><Unplug className="h-4 w-4" />{busy === id ? (es ? 'Procesando…' : 'Working…') : (es ? 'Desconectar' : 'Disconnect')}</button> : <button onClick={() => { setSelected(provider); setConsent(false); }} className="rounded-lg bg-[#fdda36] px-3 py-2 text-sm font-semibold text-[#514163] hover:bg-[#ffd51a]">{es ? 'Conectar' : 'Connect'}</button>}</div>
        </article>;
      })}
    </div>}
    {dataTypes.length > 0 && <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h3 className="font-semibold text-gray-900 dark:text-white">{es ? 'Tipos de datos disponibles' : 'Available data types'}</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{dataTypes.map((item, index) => <li key={`${item.type}-${index}`} className="text-sm text-gray-600 dark:text-gray-300">{item.type}: {displayDate(item.last_data_at)}</li>)}</ul></div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="wearable-consent-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
      <h3 id="wearable-consent-title" className="text-lg font-bold text-gray-900 dark:text-white">{es ? 'Consentimiento para conectar' : 'Consent to connect'}</h3>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{es ? 'Open Wearables recopila metadatos de conexión y disponibilidad de datos del proveedor elegido. En esta pantalla no se mostrarán valores de salud. Tú y el administrador pueden ver el estado de conexión; tu coach podrá acceder a los datos según los permisos de Asciende. Puedes desconectar el proveedor desde aquí y solicitar la eliminación de datos al administrador de la plataforma.' : 'Open Wearables collects connection metadata and data availability from the selected provider. Health values will not be shown here. You and the platform administrator can see connection status; your coach may access data according to Asciende permissions. You can disconnect here and request deletion from the platform administrator.'}</p>
      <label className="mt-4 flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />{es ? 'He leído y acepto la recopilación y el uso descritos.' : 'I have read and agree to the collection and use described above.'}</label>
      <div className="mt-6 flex justify-end gap-3"><button onClick={() => setSelected(null)} className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{es ? 'Cancelar' : 'Cancel'}</button><button onClick={() => { if (consent) void beginConnect(selected); }} disabled={!consent || !!busy} className="rounded-lg bg-[#fdda36] px-4 py-2 text-sm font-semibold text-[#514163] disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (es ? 'Aceptar y continuar' : 'Accept and continue')}</button></div>
    </div></div>}
    {profile?.role === 'admin' && !linked && <p className="text-xs text-gray-500">{es ? 'Aún no hay un usuario asociado a Open Wearables.' : 'No Open Wearables user is linked yet.'}</p>}
  </section>;
}
