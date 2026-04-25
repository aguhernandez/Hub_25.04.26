import { useState, useEffect } from 'react';
import { Download, X, Share, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInStandaloneMode(): boolean {
  return ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches;
}

export default function PWAInstallPrompt() {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissedAt = localStorage.getItem('pwa-install-dismissed-at');
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) return;
    }

    if (isIOS()) {
      const t = setTimeout(() => setShowIOSGuide(true), 3000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const t = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(t);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-install-dismissed-at', Date.now().toString());
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-install-dismissed-at', Date.now().toString());
  };

  const t = {
    title: language === 'es' ? 'Instalar Asciende' : 'Install Asciende',
    desc: language === 'es'
      ? 'Acceso rápido desde tu pantalla de inicio, sin anuncios ni browser'
      : 'Quick access from your home screen, no browser bar',
    btn: language === 'es' ? 'Instalar' : 'Install',
    dismiss: language === 'es' ? 'Ahora no' : 'Not now',
    iosTitle: language === 'es' ? 'Añadir a inicio' : 'Add to Home Screen',
    iosStep1: language === 'es' ? 'Toca el botón Compartir' : 'Tap the Share button',
    iosStep2: language === 'es' ? 'Selecciona "Añadir a pantalla de inicio"' : 'Select "Add to Home Screen"',
    iosStep3: language === 'es' ? 'Confirma tocando "Añadir"' : 'Confirm by tapping "Add"',
  };

  if (showIOSGuide) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div
          className="mx-3 mb-2 rounded-3xl border"
          style={{
            background: 'rgba(18,20,26,0.97)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <img src="/icon-192.png" alt="Asciende" className="w-10 h-10 rounded-xl" />
                <div>
                  <div className="font-bold text-white text-sm">{t.iosTitle}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>asciende.app</div>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { icon: Share, text: t.iosStep1, hint: language === 'es' ? '(icono de flecha arriba)' : '(arrow-up icon)' },
                { icon: MoreHorizontal, text: t.iosStep2, hint: '' },
                { icon: Download, text: t.iosStep3, hint: '' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: 'rgba(253,218,54,0.12)', color: '#fdda36' }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <span className="text-sm text-white">{step.text}</span>
                    {step.hint && (
                      <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{step.hint}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-3 pt-3 flex items-center justify-center gap-1.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="h-1 w-8 rounded-full"
                style={{ background: '#fdda36' }}
              />
              <div
                className="h-1 w-4 rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              />
              <div
                className="h-1 w-4 rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="mx-3 mb-2 rounded-3xl border overflow-hidden"
        style={{
          background: 'rgba(18,20,26,0.97)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div className="p-4 flex items-center gap-3">
          <img src="/icon-192.png" alt="Asciende" className="w-12 h-12 rounded-2xl flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm mb-0.5">{t.title}</div>
            <div className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.desc}</div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.45)' }} />
          </button>
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
          >
            {t.dismiss}
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
            style={{ background: '#fdda36', color: '#0C0D0F' }}
          >
            <Download className="w-4 h-4" />
            {t.btn}
          </button>
        </div>
      </div>
    </div>
  );
}
