import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Gift, Calendar, FileText, Save, Loader2, CheckCircle, X } from 'lucide-react';

interface ComplimentaryState {
  enabled: boolean;
  expiresAt: string;
  notes: string;
}

interface Props {
  userId: string;
  userName: string;
  onSaved?: () => void;
}

export default function ComplimentaryAccessPanel({ userId, userName, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<ComplimentaryState>({
    enabled: false,
    expiresAt: '',
    notes: '',
  });
  const [savedToast, setSavedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .rpc('admin_get_complimentary_access', { p_user_id: userId });
      if (!mounted) return;
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
      const row = data?.[0];
      setState({
        enabled: row?.complimentary_access ?? false,
        expiresAt: row?.complimentary_access_expires_at
          ? new Date(row.complimentary_access_expires_at).toISOString().split('T')[0]
          : '',
        notes: row?.complimentary_access_notes ?? '',
      });
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const expiresAt = state.expiresAt ? new Date(state.expiresAt + 'T23:59:59').toISOString() : null;
      const { error } = await supabase.rpc('admin_set_complimentary_access', {
        p_user_id: userId,
        p_enabled: state.enabled,
        p_expires_at: expiresAt,
        p_notes: state.notes || null,
      });
      if (error) throw error;
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
      onSaved?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const isActiveNow = state.enabled && (
    !state.expiresAt || new Date(state.expiresAt + 'T23:59:59') > new Date()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-[#fdda36]" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Complimentary Paid Access</h4>
          <p className="text-xs text-gray-400 dark:text-gray-500">{userName} — internal use only</p>
        </div>
        {isActiveNow && (
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        )}
        {state.enabled && !isActiveNow && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold">
            Expired
          </span>
        )}
        {!state.enabled && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold">
            Inactive
          </span>
        )}
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {state.enabled ? 'Paid Access: Enabled' : 'Paid Access: Disabled'}
          </p>
          {state.expiresAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Expires: {new Date(state.expiresAt + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {state.enabled && !state.expiresAt && (
            <p className="text-xs text-emerald-500 mt-0.5">Permanent until manually deactivated</p>
          )}
        </div>
        <button
          onClick={() => setState(s => ({ ...s, enabled: !s.enabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fdda36] ${
            state.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          role="switch"
          aria-checked={state.enabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
              state.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Expiration Date */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Expiration Date <span className="font-normal text-gray-400">(optional — leave empty for permanent)</span>
        </label>
        <input
          type="date"
          value={state.expiresAt}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setState(s => ({ ...s, expiresAt: e.target.value }))}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
        />
        {state.expiresAt && (
          <button
            onClick={() => setState(s => ({ ...s, expiresAt: '' }))}
            className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" /> Clear expiration (make permanent)
          </button>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          <FileText className="w-3.5 h-3.5" />
          Admin Notes <span className="font-normal text-gray-400">(private — never visible to user)</span>
        </label>
        <textarea
          rows={3}
          value={state.notes}
          onChange={(e) => setState(s => ({ ...s, notes: e.target.value }))}
          placeholder="e.g. Sponsored athlete, Partnership deal, Team discount..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all resize-none"
        />
      </div>

      {errorMsg && (
        <p className="text-xs text-red-500 dark:text-red-400">{errorMsg}</p>
      )}

      {savedToast && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          Complimentary access updated successfully.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#fdda36] hover:bg-[#e8c420] text-gray-900 font-semibold text-sm transition-colors disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Save Complimentary Access
      </button>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        This user will see a standard paid account — no indication this access is complimentary.
      </p>
    </div>
  );
}
