import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Bell, MessageSquare, Dumbbell, Apple, BookOpen, Target, Save, Smartphone } from 'lucide-react';
import { initPushNotifications } from '../../services/pushNotificationService';

interface PushPreferences {
  trainer_messages: boolean;
  new_training_plan: boolean;
  new_nutrition_plan: boolean;
  new_academy_course: boolean;
  new_habit: boolean;
}

const DEFAULT_PREFERENCES: PushPreferences = {
  trainer_messages: true,
  new_training_plan: true,
  new_nutrition_plan: true,
  new_academy_course: true,
  new_habit: true,
};

export default function NotificationSettings() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [preferences, setPreferences] = useState<PushPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState<'unknown' | 'granted' | 'denied' | 'unavailable'>('unknown');

  useEffect(() => {
    if (profile?.id) {
      loadPreferences();
      checkPushStatus();
    }
  }, [profile?.id]);

  const checkPushStatus = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) {
        setPushStatus('unavailable');
        return;
      }
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.checkPermissions();
      setPushStatus(result.receive as any);
      setPushEnabled(result.receive === 'granted');
    } catch {
      setPushStatus('unavailable');
    }
  };

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('push_notification_preferences')
        .select('*')
        .eq('user_id', profile!.id)
        .maybeSingle();

      if (data) {
        setPreferences({
          trainer_messages: data.trainer_messages,
          new_training_plan: data.new_training_plan,
          new_nutrition_plan: data.new_nutrition_plan,
          new_academy_course: data.new_academy_course,
          new_habit: data.new_habit,
        });
      }
    } catch (err) {
      console.error('Error loading push preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    try {
      const status = await initPushNotifications();
      if (status === 'granted') {
        setPushEnabled(true);
        setPushStatus('granted');
      } else if (status === 'denied') {
        setPushStatus('denied');
      }
    } catch {
      // Silently fail
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('push_notification_preferences')
        .upsert({
          user_id: profile.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (err: any) {
      console.error('Error saving push preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof PushPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const categories: { key: keyof PushPreferences; icon: typeof Bell; label_es: string; label_en: string; desc_es: string; desc_en: string }[] = [
    {
      key: 'trainer_messages',
      icon: MessageSquare,
      label_es: 'Mensajes del entrenador',
      label_en: 'Trainer messages',
      desc_es: 'Recibe avisos cuando tu entrenador te envie un mensaje',
      desc_en: 'Get notified when your trainer sends you a message',
    },
    {
      key: 'new_training_plan',
      icon: Dumbbell,
      label_es: 'Nuevo plan de entrenamiento',
      label_en: 'New training plan',
      desc_es: 'Aviso cuando se te asigne un nuevo plan de entrenamiento',
      desc_en: 'Get notified when a new training plan is assigned to you',
    },
    {
      key: 'new_nutrition_plan',
      icon: Apple,
      label_es: 'Nuevo plan de nutricion',
      label_en: 'New nutrition plan',
      desc_es: 'Aviso cuando se te asigne un nuevo plan de nutricion',
      desc_en: 'Get notified when a new nutrition plan is assigned to you',
    },
    {
      key: 'new_academy_course',
      icon: BookOpen,
      label_es: 'Nuevos cursos en Academy',
      label_en: 'New Academy courses',
      desc_es: 'Aviso cuando haya nuevos cursos disponibles',
      desc_en: 'Get notified when new courses are available',
    },
    {
      key: 'new_habit',
      icon: Target,
      label_es: 'Nuevos habitos',
      label_en: 'New habits',
      desc_es: 'Aviso cuando se te asigne un nuevo habito',
      desc_en: 'Get notified when a new habit is assigned to you',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#fdda36] to-[#ffd51a] rounded-xl p-6">
        <h2 className="text-2xl font-bold text-[#514163] mb-2 flex items-center gap-2">
          <Bell className="w-6 h-6" />
          {language === 'es' ? 'Notificaciones Push' : 'Push Notifications'}
        </h2>
        <p className="text-[#514163]/80 text-sm">
          {language === 'es'
            ? 'Configura que notificaciones quieres recibir en tu dispositivo'
            : 'Configure which notifications you want to receive on your device'}
        </p>
      </div>

      {/* Push Status */}
      {pushStatus === 'unavailable' ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'es'
                ? 'Las notificaciones push solo estan disponibles en la app nativa (iOS/Android).'
                : 'Push notifications are only available in the native app (iOS/Android).'}
            </p>
          </div>
        </div>
      ) : pushStatus === 'denied' ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
          <p className="text-sm text-red-700 dark:text-red-300">
            {language === 'es'
              ? 'Las notificaciones estan desactivadas. Ve a la configuracion de tu dispositivo para activarlas.'
              : 'Notifications are disabled. Go to your device settings to enable them.'}
          </p>
        </div>
      ) : !pushEnabled ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {language === 'es'
                  ? 'Activa las notificaciones push'
                  : 'Enable push notifications'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {language === 'es'
                  ? 'Necesitas activar las notificaciones para recibir avisos en tiempo real'
                  : 'You need to enable notifications to receive real-time alerts'}
              </p>
            </div>
            <button
              onClick={handleEnablePush}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {language === 'es' ? 'Activar' : 'Enable'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {categories.map(({ key, icon: Icon, label_es, label_en, desc_es, desc_en }) => (
          <div key={key} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {language === 'es' ? label_es : label_en}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {language === 'es' ? desc_es : desc_en}
                </p>
              </div>
            </div>
            <button
              onClick={() => togglePreference(key)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                preferences[key] ? 'bg-[#fdda36]' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  preferences[key] ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-xl font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
      >
        <Save className="w-5 h-5" />
        {saving
          ? language === 'es' ? 'Guardando...' : 'Saving...'
          : language === 'es' ? 'Guardar Preferencias' : 'Save Preferences'}
      </button>
    </div>
  );
}
