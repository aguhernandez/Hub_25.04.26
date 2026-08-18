import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Smartphone, X, Loader2, AlertCircle } from 'lucide-react';

const ACADEMY_URL = 'https://academy.asciende.pro';

export default function AcademyInAppTest() {
  const { language } = useLanguage();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenInApp = async () => {
    setOpening(true);
    setError(null);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) {
        setError(language === 'es'
          ? 'Esta función solo está disponible en la app nativa (iOS/Android).'
          : 'This feature is only available in the native app (iOS/Android).');
        setOpening(false);
        return;
      }

      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: ACADEMY_URL, windowName: '_self' });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpenInApp}
        disabled={opening}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#fdda36]/10 border border-[#fdda36]/30 text-[#fdda36] text-xs font-semibold rounded-lg hover:bg-[#fdda36]/20 transition-colors disabled:opacity-50"
        title={language === 'es' ? 'Prueba: abrir Academy dentro de la app' : 'Test: open Academy in-app'}
      >
        {opening ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Smartphone className="w-3.5 h-3.5" />
        )}
        {language === 'es' ? 'Abrir Academy In-App' : 'Open Academy In-App'}
      </button>

      {error && (
        <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl shadow-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 dark:text-gray-300 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="flex-shrink-0">
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}
