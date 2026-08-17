import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Initialize Capacitor for iOS/Android native context
let capacitorReady: Promise<boolean> = (async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
})();

// Determine route BEFORE mounting any auth infrastructure
const pathParts = window.location.pathname.split('/').filter(Boolean);
const rootSegment = pathParts[0];

// PUBLIC ROUTES — no auth check, no AuthProvider, no splash, no redirect
// /athlete/*   and   /team/*
const isPublicRoute = (rootSegment === 'athlete' || rootSegment === 'team') && !!pathParts[1];

const root = createRoot(document.getElementById('root')!);

if (isPublicRoute) {
  if (rootSegment === 'athlete') {
    // /athlete/:slug/project/:projectSlug
    const isProjectRoute = pathParts.length === 4 && pathParts[2] === 'project';
    const PublicAthleteLandingPage = lazy(() => import('./pages/PublicAthleteLandingPage'));
    const PublicProjectDetailPage = lazy(() => import('./pages/PublicProjectDetailPage'));

    root.render(
      <StrictMode>
        <Suspense fallback={<div className="fixed inset-0 bg-[#070A0F]" />}>
          {isProjectRoute ? <PublicProjectDetailPage /> : <PublicAthleteLandingPage />}
        </Suspense>
      </StrictMode>
    );
  } else {
    // /team/:slug
    const PublicTeamPage = lazy(() => import('./pages/PublicTeamPage'));

    root.render(
      <StrictMode>
        <Suspense fallback={<div className="fixed inset-0 bg-[#070A0F]" />}>
          <PublicTeamPage />
        </Suspense>
      </StrictMode>
    );
  }
} else {
  // All other routes — full app with auth
  Promise.all([
    import('./contexts/AuthContext'),
    import('./contexts/ThemeContext'),
    import('./contexts/LanguageContext'),
    import('./contexts/AthleteContext'),
    import('./App'),
  ])
    .then(([{ AuthProvider }, { ThemeProvider }, { LanguageProvider }, { AthleteProvider }, { default: App }]) => {
      root.render(
        <StrictMode>
          <AuthProvider>
            <ThemeProvider>
              <LanguageProvider>
                <AthleteProvider>
                  <App />
                </AthleteProvider>
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </StrictMode>
      );
    })
    .catch((err) => {
      console.error('App initialization failed:', err);
      root.render(
        <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#fff', background: '#0C0D0F', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Error loading app</h1>
          <p style={{ color: '#999', marginBottom: '1rem' }}>{String(err?.message || err)}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    });
}

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  capacitorReady.then((isNative) => {
    if (isNative) return;
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
          updateViaCache: 'none',
        });
      } catch {
        // Service Worker not available in this context
      }
    });
  });
}

export { capacitorReady };
