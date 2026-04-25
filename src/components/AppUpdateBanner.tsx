import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const SW_UPDATE_SHOWN_KEY = 'sw-update-reloading';

export default function AppUpdateBanner() {
  const { language } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    sessionStorage.removeItem(SW_UPDATE_SHOWN_KEY);

    const checkRegistration = async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller &&
            !sessionStorage.getItem(SW_UPDATE_SHOWN_KEY)
          ) {
            setShowBanner(true);
          }
        });
      });
    };

    checkRegistration();
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    setShowBanner(false);
    sessionStorage.setItem(SW_UPDATE_SHOWN_KEY, '1');
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => window.location.reload(), 400);
    }
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-3"
      style={{
        background: 'linear-gradient(90deg, #1a1c24, #1e2028)',
        borderBottom: '1px solid rgba(253,218,54,0.2)',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(253,218,54,0.12)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" style={{ color: '#fdda36' }} />
        </div>
        <p className="text-xs leading-snug truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {language === 'es'
            ? 'Nueva versión disponible. Actualiza ahora.'
            : 'New version available. Update now.'}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
          style={{ background: '#fdda36', color: '#0C0D0F' }}
        >
          {updating ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            language === 'es' ? 'Actualizar' : 'Update'
          )}
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
