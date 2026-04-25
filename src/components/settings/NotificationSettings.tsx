import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Bell, Mail, Smartphone, Save, Shield } from 'lucide-react';

interface NotificationPreferences {
  chat_in_app: boolean;
  chat_email: boolean;
  chat_push: boolean;
  training_in_app: boolean;
  training_email: boolean;
  training_push: boolean;
  team_in_app: boolean;
  team_email: boolean;
  team_push: boolean;
  digest_in_app: boolean;
  digest_email: boolean;
  digest_push: boolean;
  system_in_app: boolean;
  system_email: boolean;
  system_push: boolean;
  email_consent: boolean;
  push_consent: boolean;
}

export default function NotificationSettings() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadPreferences();
    }
  }, [profile?.id]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          chat_in_app: data.chat_in_app,
          chat_email: data.chat_email,
          chat_push: data.chat_push,
          training_in_app: data.training_in_app,
          training_email: data.training_email,
          training_push: data.training_push,
          team_in_app: data.team_in_app,
          team_email: data.team_email,
          team_push: data.team_push,
          digest_in_app: data.digest_in_app,
          digest_email: data.digest_email,
          digest_push: data.digest_push,
          system_in_app: data.system_in_app,
          system_email: data.system_email,
          system_push: data.system_push,
          email_consent: data.email_consent,
          push_consent: data.push_consent,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id || !preferences) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: profile.id,
          ...preferences,
        });

      if (error) throw error;

      alert(language === 'es' ? '✅ Preferencias guardadas' : '✅ Preferences saved');
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">
          {language === 'es' ? 'No se pudieron cargar las preferencias' : 'Could not load preferences'}
        </p>
      </div>
    );
  }

  const NotificationRow = ({
    title,
    prefix,
  }: {
    title: string;
    prefix: 'chat' | 'training' | 'team' | 'digest' | 'system';
  }) => (
    <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg">
      <div className="col-span-1 flex items-center">
        <span className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">{title}</span>
      </div>
      <div className="flex items-center justify-center">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences[`${prefix}_in_app` as keyof NotificationPreferences] as boolean}
            onChange={(e) => updatePreference(`${prefix}_in_app` as keyof NotificationPreferences, e.target.checked)}
            className="w-4 h-4 text-[#fdda36] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36]"
          />
        </label>
      </div>
      <div className="flex items-center justify-center">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences[`${prefix}_email` as keyof NotificationPreferences] as boolean}
            onChange={(e) => updatePreference(`${prefix}_email` as keyof NotificationPreferences, e.target.checked)}
            disabled={!preferences.email_consent}
            className="w-4 h-4 text-[#fdda36] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36] disabled:opacity-50"
          />
        </label>
      </div>
      <div className="flex items-center justify-center">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences[`${prefix}_push` as keyof NotificationPreferences] as boolean}
            onChange={(e) => updatePreference(`${prefix}_push` as keyof NotificationPreferences, e.target.checked)}
            disabled={!preferences.push_consent}
            className="w-4 h-4 text-[#fdda36] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36] disabled:opacity-50"
          />
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#fdda36] to-[#ffd51a] rounded-xl p-6">
        <h2 className="text-2xl font-bold text-[#514163] mb-2 flex items-center gap-2">
          <Bell className="w-6 h-6" />
          {language === 'es' ? 'Configuración de Notificaciones' : 'Notification Settings'}
        </h2>
        <p className="text-[#514163]/80 text-sm">
          {language === 'es'
            ? 'Personaliza cómo y cuándo recibes notificaciones'
            : 'Customize how and when you receive notifications'}
        </p>
      </div>

      {/* GDPR Consent */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3 mb-4">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              {language === 'es' ? 'Protección de Datos (GDPR)' : 'Data Protection (GDPR)'}
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-300">
              {language === 'es'
                ? 'Tus datos están protegidos bajo las regulaciones GDPR. Solo recibirás notificaciones por email o push si das tu consentimiento explícito.'
                : 'Your data is protected under GDPR regulations. You will only receive email or push notifications if you give explicit consent.'}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.email_consent}
              onChange={(e) => updatePreference('email_consent', e.target.checked)}
              className="w-4 h-4 text-[#fdda36] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36]"
            />
            <span className="text-sm text-blue-900 dark:text-blue-200">
              {language === 'es'
                ? 'Acepto recibir notificaciones por correo electrónico'
                : 'I consent to receive email notifications'}
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.push_consent}
              onChange={(e) => updatePreference('push_consent', e.target.checked)}
              className="w-4 h-4 text-[#fdda36] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36]"
            />
            <span className="text-sm text-blue-900 dark:text-blue-200">
              {language === 'es'
                ? 'Acepto recibir notificaciones push'
                : 'I consent to receive push notifications'}
            </span>
          </label>
        </div>
      </div>

      {/* Notification Table */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-100 dark:bg-gray-800 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <div className="col-span-1">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 dark:text-gray-400 uppercase">
              {language === 'es' ? 'Tipo' : 'Type'}
            </span>
          </div>
          <div className="flex items-center justify-center">
            <Bell className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 dark:text-gray-400 uppercase ml-1">
              {language === 'es' ? 'App' : 'In-App'}
            </span>
          </div>
          <div className="flex items-center justify-center">
            <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 dark:text-gray-400 uppercase ml-1">Email</span>
          </div>
          <div className="flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 dark:text-gray-400 uppercase ml-1">Push</span>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <NotificationRow title={language === 'es' ? 'Chat' : 'Chat'} prefix="chat" />
          <NotificationRow
            title={language === 'es' ? 'Entrenamiento' : 'Training'}
            prefix="training"
          />
          <NotificationRow title={language === 'es' ? 'Equipo' : 'Team'} prefix="team" />
          <NotificationRow
            title={language === 'es' ? 'Resumen Semanal' : 'Weekly Digest'}
            prefix="digest"
          />
          <NotificationRow title={language === 'es' ? 'Sistema' : 'System'} prefix="system" />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving
            ? language === 'es'
              ? 'Guardando...'
              : 'Saving...'
            : language === 'es'
            ? 'Guardar Preferencias'
            : 'Save Preferences'}
        </button>
      </div>

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-4">
        <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400">
          {language === 'es'
            ? '📌 Las notificaciones push requieren configuración adicional y estarán disponibles próximamente. Los registros de notificaciones se eliminan automáticamente después de 30 días (cumplimiento GDPR).'
            : '📌 Push notifications require additional setup and will be available soon. Notification logs are automatically deleted after 30 days (GDPR compliance).'}
        </p>
      </div>
    </div>
  );
}
