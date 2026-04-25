import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  Link2,
  Plus,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Utensils,
  Activity,
  FlaskConical,
  GraduationCap,
  Zap,
  BarChart2,
  Key,
  Shield,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface PlannerToken {
  id: string;
  planner_name: string;
  planner_type: 'lab' | 'endurance' | 'nutrition' | 'academy' | 'motion' | 'performance';
  description: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  lab: FlaskConical,
  endurance: Activity,
  nutrition: Utensils,
  academy: GraduationCap,
  motion: Zap,
  performance: BarChart2,
};

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  lab: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
  endurance: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  nutrition: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  academy: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  motion: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
  performance: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
};

export default function PlannerConnectionsSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [tokens, setTokens] = useState<PlannerToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ planner_name: '', planner_type: 'lab' as PlannerToken['planner_type'], description: '' });
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<{ raw: string; tokenId: string; label: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) loadTokens();
  }, [isAdmin]);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('external_planner_tokens')
        .select('id, planner_name, planner_type, description, is_active, last_used_at, created_at')
        .order('created_at', { ascending: false });
      setTokens(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const generateToken = async () => {
    if (!form.planner_name.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const session = await getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/planner-hub-api/generate-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planner_name: form.planner_name.trim(),
          planner_type: form.planner_type,
          description: form.description.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error generating token');
      setNewToken({ raw: result.token, tokenId: result.token_id, label: result.planner_name });
      setShowForm(false);
      setForm({ planner_name: '', planner_type: 'lab', description: '' });
      loadTokens();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const regenerateToken = async (tokenId: string) => {
    setRegeneratingId(tokenId);
    setError(null);
    setNewToken(null);
    try {
      const session = await getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/planner-hub-api/regenerate-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_id: tokenId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error regenerating token');
      setNewToken({ raw: result.token, tokenId: result.token_id, label: result.planner_name });
      loadTokens();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRegeneratingId(null);
    }
  };

  const deleteToken = async (tokenId: string) => {
    setDeletingId(tokenId);
    setError(null);
    try {
      const session = await getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/planner-hub-api/delete-token`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_id: tokenId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error deleting token');
      setConfirmDeleteId(null);
      if (newToken?.tokenId === tokenId) setNewToken(null);
      loadTokens();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleToken = async (id: string, isActive: boolean) => {
    await supabase.from('external_planner_tokens').update({ is_active: !isActive }).eq('id', id);
    loadTokens();
  };

  const copyToken = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string | null) => {
    if (!d) return language === 'es' ? 'Nunca' : 'Never';
    return new Date(d).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-500" />
            {language === 'es' ? 'Planners externos' : 'External Planners'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {language === 'es'
              ? 'Conecta Nutrition Planner, Endurance Planner u otros apps externos a este Hub. Cada planner usa un token único para leer y escribir datos de atletas.'
              : 'Connect Nutrition Planner, Endurance Planner or other external apps to this Hub. Each planner uses a unique token to read and write athlete data.'}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setNewToken(null); setError(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          {language === 'es' ? 'Nuevo token' : 'New token'}
        </button>
      </div>

      {/* How it works */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
              {language === 'es' ? '¿Cómo funciona?' : 'How does it work?'}
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              <li>1. {language === 'es' ? 'Generás un token aquí y lo pegás en la configuración del Nutrition/Endurance Planner.' : 'Generate a token here and paste it into the Nutrition/Endurance Planner settings.'}</li>
              <li>2. {language === 'es' ? 'El planner externo usa ese token para consultar los entrenamientos del atleta en este Hub.' : 'The external planner uses that token to query the athlete\'s training schedule from this Hub.'}</li>
              <li>3. {language === 'es' ? 'El planner también envía sus planificaciones al Hub, que las muestra en el dashboard del atleta.' : 'The planner also pushes its plans back to the Hub, which displays them on the athlete\'s dashboard.'}</li>
            </ul>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-mono break-all">
              API: <span className="font-semibold">{import.meta.env.VITE_SUPABASE_URL}/functions/v1/planner-hub-api</span>
            </p>
          </div>
        </div>
      </div>

      {/* Token revealed (new or regenerated) */}
      {newToken && (
        <div className="p-4 rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                {language === 'es' ? `Token para "${newToken.label}" — copialo ahora` : `Token for "${newToken.label}" — copy it now`}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-3">
                {language === 'es'
                  ? 'Este token solo se muestra una vez. Pegalo en la configuración del planner externo.'
                  : 'This token is only shown once. Paste it into the external planner configuration.'}
              </p>
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-emerald-300 dark:border-emerald-700">
                <code className="flex-1 text-xs text-gray-800 dark:text-gray-200 font-mono break-all">{newToken.raw}</code>
                <button
                  onClick={copyToken}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                  title={language === 'es' ? 'Copiar' : 'Copy'}
                >
                  {copied
                    ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                    : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                {language === 'es' ? 'Header a usar en el planner: ' : 'Header to use in the planner: '}
                <code className="font-mono">X-Planner-Token: {newToken.raw}</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global error */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {/* Create form */}
      {showForm && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {language === 'es' ? 'Nuevo token de acceso' : 'New access token'}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {language === 'es' ? 'Nombre del planner' : 'Planner name'} *
              </label>
              <input
                type="text"
                value={form.planner_name}
                onChange={e => setForm(f => ({ ...f, planner_name: e.target.value }))}
                placeholder={language === 'es' ? 'Ej: Nutrition Planner v2' : 'e.g. Nutrition Planner v2'}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {language === 'es' ? 'Tipo de planner' : 'Planner type'} *
              </label>
              <select
                value={form.planner_type}
                onChange={e => setForm(f => ({ ...f, planner_type: e.target.value as PlannerToken['planner_type'] }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
              >
                <option value="lab">Lab</option>
                <option value="endurance">Endurance</option>
                <option value="nutrition">Nutrition</option>
                <option value="academy">Academy</option>
                <option value="motion">Motion</option>
                <option value="performance">Performance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {language === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}
              </label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={language === 'es' ? 'Para qué se usa este token...' : 'What this token is used for...'}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={generateToken}
                disabled={generating || !form.planner_name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {generating
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Key className="w-4 h-4" />}
                {language === 'es' ? 'Generar token' : 'Generate token'}
              </button>
              <button
                onClick={() => { setShowForm(false); setError(null); }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token list */}
      {loading ? (
        <div className="flex items-center justify-center h-16">
          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <Link2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{language === 'es' ? 'Sin planners conectados todavía' : 'No planners connected yet'}</p>
          <p className="text-xs mt-1">{language === 'es' ? 'Generá un token para conectar tu primer planner externo.' : 'Generate a token to connect your first external planner.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map(token => {
            const Icon = TYPE_ICONS[token.planner_type] || Link2;
            const colors = TYPE_COLORS[token.planner_type] || TYPE_COLORS.lab;
            const isConfirmingDelete = confirmDeleteId === token.id;
            return (
              <div
                key={token.id}
                className={`p-4 rounded-xl border ${token.is_active ? colors.border : 'border-gray-200 dark:border-gray-700'} ${token.is_active ? colors.bg : 'bg-gray-50 dark:bg-gray-900/30'} transition-all`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${token.is_active ? colors.bg : 'bg-gray-100 dark:bg-gray-800'} border ${colors.border}`}>
                    <Icon className={`w-5 h-5 ${token.is_active ? colors.text : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{token.planner_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {token.planner_type}
                      </span>
                      {!token.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500">
                          {language === 'es' ? 'Desactivado' : 'Disabled'}
                        </span>
                      )}
                    </div>
                    {token.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{token.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {language === 'es' ? 'Último uso: ' : 'Last used: '}{formatDate(token.last_used_at)}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Regenerate */}
                    <button
                      onClick={() => regenerateToken(token.id)}
                      disabled={regeneratingId === token.id}
                      className="p-2 rounded-lg transition-colors text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 disabled:opacity-50"
                      title={language === 'es' ? 'Regenerar token' : 'Regenerate token'}
                    >
                      {regeneratingId === token.id
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <RotateCcw className="w-4 h-4" />}
                    </button>

                    {/* Toggle active */}
                    <button
                      onClick={() => toggleToken(token.id, token.is_active)}
                      className={`p-2 rounded-lg transition-colors ${token.is_active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'}`}
                      title={token.is_active ? (language === 'es' ? 'Desactivar' : 'Disable') : (language === 'es' ? 'Activar' : 'Enable')}
                    >
                      {token.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : token.id)}
                      className="p-2 rounded-lg transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      title={language === 'es' ? 'Eliminar' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline delete confirmation */}
                {isConfirmingDelete && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800 flex items-center justify-between gap-3">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {language === 'es'
                        ? 'Esto elimina el token permanentemente. El planner externo perderá acceso inmediatamente.'
                        : 'This permanently deletes the token. The external planner will lose access immediately.'}
                    </p>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                      >
                        {language === 'es' ? 'Cancelar' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => deleteToken(token.id)}
                        disabled={deletingId === token.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        {deletingId === token.id
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                        {language === 'es' ? 'Eliminar' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* API Reference */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {language === 'es' ? 'Referencia de API para planners' : 'API Reference for planners'}
        </p>
        <div className="space-y-2 text-xs font-mono text-gray-600 dark:text-gray-400">
          <p className="text-gray-700 dark:text-gray-300 font-sans font-semibold text-xs mb-1">
            {language === 'es' ? 'Leer desde el Hub:' : 'Read from the Hub:'}
          </p>
          <p className="pl-2 border-l-2 border-blue-300">GET /planner-hub-api/athlete-profile?athlete_email=&lt;email&gt;</p>
          <p className="pl-2 border-l-2 border-blue-300">GET /planner-hub-api/training-schedule?athlete_email=&lt;email&gt;&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD</p>
          <p className="pl-2 border-l-2 border-blue-300">GET /planner-hub-api/nutrition-data?athlete_email=&lt;email&gt;</p>
          <p className="pl-2 border-l-2 border-blue-300">GET /planner-hub-api/endurance-data?athlete_email=&lt;email&gt;</p>
          <p className="text-gray-700 dark:text-gray-300 font-sans font-semibold text-xs mt-3 mb-1">
            {language === 'es' ? 'Escribir al Hub:' : 'Write to the Hub:'}
          </p>
          <p className="pl-2 border-l-2 border-emerald-300">POST /planner-hub-api/push-nutrition-plan?athlete_email=&lt;email&gt;</p>
          <p className="pl-2 border-l-2 border-emerald-300">POST /planner-hub-api/push-endurance-plan?athlete_email=&lt;email&gt;</p>
          <p className="text-gray-600 dark:text-gray-500 font-sans mt-2">
            {language === 'es' ? 'Header requerido: ' : 'Required header: '}
            <code className="font-mono">X-Planner-Token: &lt;token&gt;</code>
          </p>
        </div>
      </div>
    </div>
  );
}
