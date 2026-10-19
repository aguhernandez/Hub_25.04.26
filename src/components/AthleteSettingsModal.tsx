import { useEffect, useState } from 'react';
import { Calendar, Mail, MapPin, Phone, Settings, User, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

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

interface Props {
  athleteId: string;
  onClose: () => void;
}

export default function AthleteSettingsModal({ athleteId, onClose }: Props) {
  const { language } = useLanguage();
  const [settings, setSettings] = useState<AthleteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const es = language === 'es';

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, full_name, gender, date_of_birth, country, phone, sport, username, timezone, role')
        .eq('id', athleteId)
        .eq('role', 'athlete')
        .maybeSingle();
      if (!active) return;
      setSettings(data as AthleteSettings | null);
      setError(Boolean(queryError) || !data);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [athleteId]);

  const genderLabels: Record<string, string> = {
    male: es ? 'Masculino' : 'Male',
    female: es ? 'Femenino' : 'Female',
    other: es ? 'Otro' : 'Other',
    prefer_not_to_say: es ? 'Prefiere no decir' : 'Prefer not to say',
  };
  const fullName = [settings?.first_name, settings?.last_name].filter(Boolean).join(' ') || settings?.full_name;
  const fields = [
    { label: es ? 'Nombre y apellido' : 'First and last name', value: fullName, icon: User },
    { label: es ? 'Correo electrónico' : 'Email address', value: settings?.email, icon: Mail },
    { label: es ? 'Tipo de perfil' : 'Profile type', value: settings?.role ? (es ? 'Atleta' : 'Athlete') : null, icon: User },
    { label: es ? 'Género' : 'Gender', value: settings?.gender ? (genderLabels[settings.gender] || settings.gender) : null, icon: User },
    { label: 'Username', value: settings?.username, icon: User },
    { label: es ? 'Deporte' : 'Sport', value: settings?.sport, icon: User },
    { label: es ? 'País' : 'Country', value: settings?.country, icon: MapPin },
    { label: es ? 'Teléfono celular' : 'Cell phone', value: settings?.phone, icon: Phone },
    { label: es ? 'Fecha de nacimiento' : 'Date of birth', value: settings?.date_of_birth, icon: Calendar },
    { label: es ? 'Zona horaria' : 'Time zone', value: settings?.timezone, icon: MapPin },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="athlete-settings-title" onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 id="athlete-settings-title" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><Settings className="w-5 h-5 text-[#fdda36]" />{es ? 'Configuración del atleta' : 'Athlete Settings'}</h2>
          <button onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-72px)]">
          {loading ? <p className="text-sm text-gray-500">{es ? 'Cargando...' : 'Loading...'}</p> : error ? <p className="text-sm text-red-600">{es ? 'No se pudo cargar la configuración del atleta.' : 'Could not load athlete settings.'}</p> : (
            <>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{es ? 'Información personal' : 'Personal Information'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Icon className="w-3.5 h-3.5" />{label}</div>
                  <div className="mt-1 text-sm text-gray-900 dark:text-white break-words">{value || <span className="text-gray-400">—</span>}</div>
                </div>)}
              </div>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{es ? 'Vista de solo lectura.' : 'Read-only view.'}</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
