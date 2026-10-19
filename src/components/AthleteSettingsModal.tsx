import { useEffect, useState } from 'react';
import { Calendar, Mail, MapPin, Phone, Save, Settings, User, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import CountrySelect from './CountrySelect';
import PhoneInput from './PhoneInput';
import SportSelect from './SportSelect';

interface AthleteSettings {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  country: string | null;
  phone: string | null;
  sport: string | null;
  username: string | null;
  timezone: string | null;
  role: string | null;
}

type EditableField = Exclude<keyof AthleteSettings, 'id' | 'email' | 'role'>;
type AthleteDraft = { [K in EditableField]: string };

interface Props {
  athleteId: string;
  onClose: () => void;
  onSaved?: () => void;
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]';

export default function AthleteSettingsModal({ athleteId, onClose, onSaved }: Props) {
  const { language } = useLanguage();
  const [settings, setSettings] = useState<AthleteSettings | null>(null);
  const [draft, setDraft] = useState<AthleteDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const es = language === 'es';

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, full_name, gender, date_of_birth, country, phone, sport, username, timezone, role')
        .eq('id', athleteId)
        .eq('role', 'athlete')
        .maybeSingle();
      if (!active) return;
      if (queryError || !data) {
        setError(es ? 'No se pudo cargar la configuración del atleta.' : 'Could not load athlete settings.');
      } else {
        const profile = data as AthleteSettings;
        setSettings(profile);
        setDraft({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          full_name: profile.full_name || '',
          gender: profile.gender || '',
          date_of_birth: profile.date_of_birth || '',
          country: profile.country || '',
          phone: profile.phone || '',
          sport: profile.sport || '',
          username: profile.username || '',
          timezone: profile.timezone || '',
        });
      }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [athleteId, es]);

  const updateDraft = <K extends EditableField>(field: K, value: AthleteDraft[K]) => {
    setDraft(current => current ? { ...current, [field]: value } : current);
    setSaved(false);
  };

  const save = async () => {
    if (!draft || !settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const fullName = [draft.first_name.trim(), draft.last_name.trim()].filter(Boolean).join(' ') || draft.full_name.trim();
    // The generated Supabase table type currently resolves profiles.update() to never.
    const profilesTable = supabase.from('profiles') as any;
    const { data, error: saveError } = await profilesTable
      .update({
        first_name: draft.first_name.trim() || null,
        last_name: draft.last_name.trim() || null,
        full_name: fullName || null,
        gender: draft.gender || null,
        date_of_birth: draft.date_of_birth || null,
        country: draft.country || null,
        phone: draft.phone || null,
        sport: draft.sport || null,
        username: draft.username.trim() || null,
        timezone: draft.timezone.trim() || null,
      })
      .eq('id', athleteId)
      .eq('role', 'athlete')
      .select('id')
      .maybeSingle();
    setSaving(false);
    if (saveError || !data) {
      setError(es ? 'No se pudieron guardar los cambios. Verifica que sigas conectado con este atleta.' : 'Changes could not be saved. Check that you are still connected to this athlete.');
      return;
    }
    setSettings({ ...settings, ...draft, full_name: fullName });
    setSaved(true);
    onSaved?.();
  };

  const genderLabels: Record<string, string> = {
    male: es ? 'Masculino' : 'Male',
    female: es ? 'Femenino' : 'Female',
    other: es ? 'Otro' : 'Other',
    prefer_not_to_say: es ? 'Prefiere no decir' : 'Prefer not to say',
  };
  const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="athlete-settings-title" onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 id="athlete-settings-title" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><Settings className="w-5 h-5 text-[#fdda36]" />{es ? 'Configuración del atleta' : 'Athlete Settings'}</h2>
          <button onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-72px)]">
          {loading ? <p className="text-sm text-gray-500">{es ? 'Cargando...' : 'Loading...'}</p> : error && !draft ? <p className="text-sm text-red-600">{error}</p> : draft && settings ? (
            <>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{es ? 'Información personal' : 'Personal Information'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label><span className={labelClass}>{es ? 'Nombre' : 'First name'}</span><input className={inputClass} value={draft.first_name} onChange={e => updateDraft('first_name', e.target.value)} /></label>
                <label><span className={labelClass}>{es ? 'Apellido' : 'Last name'}</span><input className={inputClass} value={draft.last_name} onChange={e => updateDraft('last_name', e.target.value)} /></label>
                <label><span className={`${labelClass} flex items-center gap-1`}><Mail className="w-3.5 h-3.5" />Email</span><input className={`${inputClass} opacity-70 cursor-not-allowed`} type="email" value={settings.email || ''} disabled readOnly /></label>
                <label><span className={`${labelClass} flex items-center gap-1`}><Calendar className="w-3.5 h-3.5" />{es ? 'Fecha de nacimiento' : 'Date of birth'}</span><input className={inputClass} type="date" value={draft.date_of_birth || ''} onChange={e => updateDraft('date_of_birth', e.target.value)} /></label>
                <label><span className={`${labelClass} flex items-center gap-1`}><User className="w-3.5 h-3.5" />{es ? 'Género' : 'Gender'}</span><select className={inputClass} value={draft.gender || ''} onChange={e => updateDraft('gender', e.target.value)}><option value="">{es ? 'Seleccionar...' : 'Choose...'}</option><option value="male">{genderLabels.male}</option><option value="female">{genderLabels.female}</option><option value="other">{genderLabels.other}</option><option value="prefer_not_to_say">{genderLabels.prefer_not_to_say}</option></select></label>
                <div><span className={labelClass}>{es ? 'Tipo de perfil' : 'Profile type'}</span><div className={`${inputClass} bg-gray-100 dark:bg-gray-900`}>{es ? 'Atleta' : 'Athlete'}</div></div>
                <label><span className={labelClass}>Username</span><input className={inputClass} value={draft.username || ''} onChange={e => updateDraft('username', e.target.value)} /></label>
                <label><span className={labelClass}>{es ? 'Deporte' : 'Sport'}</span><SportSelect value={draft.sport || ''} onChange={value => updateDraft('sport', value)} language={language} /></label>
                <div><span className={`${labelClass} flex items-center gap-1`}><MapPin className="w-3.5 h-3.5" />{es ? 'País' : 'Country'}</span><CountrySelect value={draft.country || ''} onChange={value => updateDraft('country', value)} language={language} /></div>
                <div><span className={`${labelClass} flex items-center gap-1`}><Phone className="w-3.5 h-3.5" />{es ? 'Teléfono celular' : 'Cell phone'}</span><PhoneInput value={draft.phone || ''} onChange={value => updateDraft('phone', value)} language={language} /></div>
                <label><span className={labelClass}>{es ? 'Zona horaria' : 'Time zone'}</span><input className={inputClass} value={draft.timezone || ''} onChange={e => updateDraft('timezone', e.target.value)} placeholder="US/Mountain (GMT-06)" /></label>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div aria-live="polite" className="text-sm">{error ? <span className="text-red-600">{error}</span> : saved ? <span className="text-green-600">{es ? 'Cambios guardados.' : 'Changes saved.'}</span> : <span className="text-xs text-gray-500 dark:text-gray-400">{es ? 'El email no se puede cambiar desde aquí.' : 'Email cannot be changed here.'}</span>}</div>
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] disabled:opacity-50 flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saving ? (es ? 'Guardando...' : 'Saving...') : (es ? 'Guardar cambios' : 'Save changes')}</button>
              </div>
            </>
          ) : error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
