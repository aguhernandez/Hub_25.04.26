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
  import('./contexts/AuthContext').then(({ AuthProvider }) =>
    import('./contexts/ThemeContext').then(({ ThemeProvider }) =>
      import('./contexts/LanguageContext').then(({ LanguageProvider }) =>
        import('./contexts/AthleteContext').then(({ AthleteProvider }) =>
          import('./App').then(({ default: App }) => {
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
        )
      )
    )
  );
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

export { capacitorReady };
