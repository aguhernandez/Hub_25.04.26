import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SplashScreen from './components/SplashScreen';
import AdminPlatformDashboard from './pages/AdminPlatformDashboard';
import AdminCommunicationsPage from './pages/AdminCommunicationsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminFoodDatabasePage from './pages/AdminFoodDatabasePage';

// Lazy load pages
const PublicAthleteProfilePage = lazy(() => import('./pages/PublicAthleteProfilePage'));
const TrainingPage = lazy(() => import('./pages/TrainingPage'));
const NutritionDashboardPage = lazy(() => import('./pages/NutritionDashboardPage'));
const HabitsPage = lazy(() => import('./pages/HabitsPage'));
const BioimpedancePage = lazy(() => import('./pages/BioimpedancePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const AcademyPage = lazy(() => import('./pages/AcademyPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const BrandProjectsPage = lazy(() => import('./pages/BrandProjectsPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const IncomingRequestsPage = lazy(() => import('./pages/IncomingRequestsPage'));
const DiscoverProjectsPage = lazy(() => import('./pages/DiscoverProjectsPage'));
const BrandDashboardPage = lazy(() => import('./pages/BrandDashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ExerciseManagementPage = lazy(() => import('./pages/ExerciseManagementPage'));
const WorkoutBuilderPage = lazy(() => import('./pages/WorkoutBuilderPage'));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage'));
const AboutAsciendePage = lazy(() => import('./pages/AboutAsciendePage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const MyTeamsPage = lazy(() => import('./pages/MyTeamsPage'));
const MyAthletesPage = lazy(() => import('./pages/MyAthletesPage'));
const AthleteProfilePage = lazy(() => import('./pages/AthleteProfilePage'));
const FeedbackAnalyticsPage = lazy(() => import('./pages/FeedbackAnalyticsPage'));
const PerformanceDashboard = lazy(() => import('./pages/PerformanceDashboard'));
const ProgramBuilderPage = lazy(() => import('./pages/ProgramBuilderPage'));
const ProgramBuilderDetailPage = lazy(() => import('./pages/ProgramBuilderDetailPage'));
const ProgramsMarketplacePage = lazy(() => import('./pages/ProgramsMarketplacePage'));
const AnnualTrainingPlannerPage = lazy(() => import('./pages/AnnualTrainingPlannerPage'));
const ImpactBrandsPage = lazy(() => import('./pages/ImpactBrandsPage'));
const BrandRequestsAdminPage = lazy(() => import('./pages/BrandRequestsAdminPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const TeamsUnifiedPage = lazy(() => import('./pages/TeamsUnifiedPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const AdminLibraryPage = lazy(() => import('./pages/AdminLibraryPage'));
const AdminStripeProductsPage = lazy(() => import('./pages/AdminStripeProductsPage'));
const AdminMembershipsPage = lazy(() => import('./pages/AdminMembershipsPage'));
const AdminProjectsPage = lazy(() => import('./pages/AdminProjectsPage'));
const MembershipsMarketplacePage = lazy(() => import('./pages/MembershipsMarketplacePage'));
const ExternalActivitiesPage = lazy(() => import('./pages/ExternalActivitiesPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const ActivityHistoryPage = lazy(() => import('./pages/ActivityHistoryPage'));
const BiologicalPassportPage = lazy(() => import('./pages/BiologicalPassportPage'));
const TrainerAthleteNutritionPage = lazy(() => import('./pages/TrainerAthleteNutritionPage'));
const LiveRacePage = lazy(() => import('./pages/LiveRacePage'));
import AdaptiveNavigation from './components/AdaptiveNavigation';

import AppUpdateBanner from './components/AppUpdateBanner';
import { removePushListeners, deletePushToken } from './services/pushNotificationService';

type Page = 'dashboard' | 'training' | 'activity-history' | 'nutrition' | 'nutrition-dashboard' | 'habits' | 'bioimpedance' | 'chat' | 'membership' | 'book' | 'events' | 'brand' | 'discover' | 'brand-dashboard' | 'invoices' | 'incoming-requests' | 'settings' | 'exercises' | 'workout-builder' | 'programs' | 'about-asciende' | 'teams' | 'my-teams' | 'my-athletes' | 'athlete-profile' | 'feedback-analytics' | 'performance' | 'program-builder' | 'program-builder-detail' | 'programs-marketplace' | 'atp' | 'impact' | 'admin' | 'brand-requests' | 'marketplace' | 'services' | 'goals' | 'admin-platform-dashboard' | 'admin-communications' | 'admin-brands' | 'admin-users' | 'admin-library' | 'admin-stripe' | 'admin-memberships' | 'admin-projects' | 'admin-foods' | 'memberships-marketplace' | 'exercise-management' | 'external-activities' | 'feedback' | 'biological-passport' | 'trainer-athlete-nutrition' | 'live-race';

const SATELLITE_ORIGINS = [
  'lab.asciende.pro',
  'endurance.asciende.pro',
  'nutrition.asciende.pro',
  'academy.asciende.pro',
  'motion.asciende.pro',
  'performance.asciende.pro',
];

function isSatelliteOrigin(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SATELLITE_ORIGINS.some(origin => parsed.hostname === origin);
  } catch {
    return false;
  }
}

function App() {
  const { user, loading, profile } = useAuth();
  const [programId, setProgramId] = useState<string | null>(null);
  const [racePlanId, setRacePlanId] = useState<string | null>(null);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashSkipAnimation, setSplashSkipAnimation] = useState(false);
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null | undefined>(undefined);
  const satelliteRedirectHandled = useRef(false);
  const splashCompleteHandled = useRef(false);

  const showSplash = splashVisible;

  const completeSplashSequence = () => {
    if (splashCompleteHandled.current) return;
    splashCompleteHandled.current = true;
    setSplashVisible(false);
  };

  const handleSatelliteSelect = (satId: string | null) => {
    setSelectedSatelliteId(satId);
    setSplashVisible(false);
  };

  const handleGoBack = () => {
    setSelectedSatelliteId(undefined);
    setSplashSkipAnimation(true);
    setSplashVisible(true);
  };

  useEffect(() => {
    if (!loading) {
      // Auth is ready — splash can become interactive. Don't auto-close splash.
    }
  }, [loading]);

  const handleSplashComplete = useCallback(() => {
    // Called when the splash interactive phase begins — keep splash shown until user clicks
  }, []);

  const getInitialPage = (): Page => {
    if (profile?.role === 'admin') return 'admin';
    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage());

  useEffect(() => {
    if (profile) {
      const correctPage = profile.role === 'admin' ? 'admin' : 'dashboard';
      if (currentPage === 'dashboard' || currentPage === 'admin') {
        setCurrentPage(correctPage);
      }
    }
  }, [profile]);

  useEffect(() => {
    const handleNavigate = (e: any) => {
      if (typeof e.detail === 'object' && e.detail.page) {
        setCurrentPage(e.detail.page);
        if (e.detail.programId) {
          setProgramId(e.detail.programId);
        }
        if (e.detail.racePlanId !== undefined) {
          setRacePlanId(e.detail.racePlanId);
        }
      } else {
        setCurrentPage(e.detail);
        setProgramId(null);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, [currentPage]);

  // Handle deep-link callback from system browser after Google OAuth on native apps
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { App: CapApp } = await import('@capacitor/app');
        const { supabase } = await import('./lib/supabase');

        const listener = await CapApp.addListener('appUrlOpen', async ({ url }) => {
          // Supabase sends back tokens in the URL fragment (#access_token=...)
          // or as query params (?code=...) depending on flow type.
          if (url.includes('access_token') || url.includes('refresh_token') || url.includes('code=')) {
            // Extract the fragment/query and feed it to Supabase
            const fragment = url.split('#')[1] ?? '';
            const query = url.split('?')[1]?.split('#')[0] ?? '';
            const paramStr = fragment || query;

            if (paramStr) {
              const params = new URLSearchParams(paramStr);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');

              if (accessToken && refreshToken) {
                await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              } else {
                // PKCE flow — exchange code
                const code = params.get('code');
                if (code) {
                  await supabase.auth.exchangeCodeForSession(paramStr);
                }
              }
            }

            try {
              const { Browser } = await import('@capacitor/browser');
              await Browser.close();
            } catch { /* ignore */ }
          }
        });

        cleanup = () => { listener.remove(); };
      } catch { /* not native or plugin unavailable */ }
    })();

    return () => { cleanup?.(); };
  }, []);

  // If already authenticated and a satellite redirect param is present, forward immediately with a token
  useEffect(() => {
    if (!user || satelliteRedirectHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    if (!redirectParam || !isSatelliteOrigin(redirectParam)) return;

    satelliteRedirectHandled.current = true;

    (async () => {
      try {
        const { data: sessionData } = await (await import('./lib/supabase')).supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        const targetUrl = new URL(redirectParam);
        if (accessToken) {
          targetUrl.searchParams.set('session_token', accessToken);
        }
        window.location.replace(targetUrl.toString());
      } catch {
        window.location.replace(redirectParam);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!loading && user && splashVisible) {
      setSplashVisible(false);
    }
  }, [loading, user, splashVisible]);

  // Clean up push listeners and remove token on logout
  useEffect(() => {
    if (user) return;
    (async () => {
      await deletePushToken();
      await removePushListeners();
    })();
  }, [user]);

  if (loading) {
    return <div className="fixed inset-0 bg-[#070A0F]" />;
  }

  if (showSplash && !user) {
    return (
      <SplashScreen
        onLoadComplete={handleSplashComplete}
        onSatelliteSelect={handleSatelliteSelect}
        skipAnimation={splashSkipAnimation}
      />
    );
  }

  if (!user) {
    if (selectedSatelliteId === undefined) {
      return (
        <SplashScreen
          onLoadComplete={handleSplashComplete}
          onSatelliteSelect={handleSatelliteSelect}
          skipAnimation={true}
        />
      );
    }
    return <AuthPage initialSatelliteId={selectedSatelliteId} onGoBack={handleGoBack} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'live-race':
        return (
          <LiveRacePage
            planId={racePlanId}
            onBack={() => { setCurrentPage('training'); setRacePlanId(null); }}
          />
        );
      case 'training':
        return <TrainingPage />;
      case 'activity-history':
        return <ActivityHistoryPage />;
      case 'biological-passport':
        return <BiologicalPassportPage />;
      case 'trainer-athlete-nutrition':
        return <TrainerAthleteNutritionPage />;
      case 'nutrition-dashboard':
        return <NutritionDashboardPage />;
      case 'habits':
        return <HabitsPage />;
      case 'bioimpedance':
        return <BioimpedancePage />;
      case 'chat':
        return <ChatPage />;
      case 'base-academy':
        return <AcademyPage onNavigate={setCurrentPage} />;
      case 'membership':
        // Redirect to marketplace
        setCurrentPage('marketplace');
        return <MarketplacePage onNavigate={setCurrentPage} />;
      case 'book':
        return <BookingsPage />;
      case 'events':
        return <EventsPage />;
      case 'brand':
        return <BrandProjectsPage />;
      case 'discover':
        return <DiscoverProjectsPage />;
      case 'brand-dashboard':
        return <BrandDashboardPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'incoming-requests':
        return <IncomingRequestsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'external-activities':
        return <ExternalActivitiesPage />;
      case 'exercises':
        return <ExerciseManagementPage />;
      case 'workout-builder':
        return <WorkoutBuilderPage />;
      case 'programs':
      case 'programs-marketplace':
        return <ProgramsMarketplacePage />;
      case 'about-asciende':
        return <AboutAsciendePage />;
      case 'feedback':
        return <FeedbackPage />;
      case 'teams':
        return <TeamsPage />;
      case 'my-teams':
        return <TeamsUnifiedPage />;
      case 'my-athletes':
        return <MyAthletesPage />;
      case 'athlete-profile':
        return <AthleteProfilePage />;
      case 'feedback-analytics':
        return <FeedbackAnalyticsPage />;
      case 'performance':
        return <PerformanceDashboard />;
      case 'program-builder':
        return <ProgramBuilderPage />;
      case 'program-builder-detail':
        return <ProgramBuilderDetailPage programId={programId} />;
      case 'atp':
        return <AnnualTrainingPlannerPage />;
      case 'impact':
        return <ImpactBrandsPage />;
      case 'admin':
        return <AdminPlatformDashboard />;
      case 'admin-platform-dashboard':
        return <AdminPlatformDashboard />;
      case 'admin-communications':
        return <AdminCommunicationsPage />;
      case 'admin-brands':
      case 'brand-requests':
        return <BrandRequestsAdminPage />;
      case 'admin-users':
        return <AdminUsersPage />;
      case 'admin-library':
        return <AdminLibraryPage />;
      case 'admin-stripe':
        return <AdminStripeProductsPage />;
      case 'admin-memberships':
        return <AdminMembershipsPage />;
      case 'admin-projects':
        return <AdminProjectsPage />;
      case 'admin-foods':
        return <AdminFoodDatabasePage />;
      case 'memberships-marketplace':
        return <MembershipsMarketplacePage />;
      case 'exercise-management':
        return <ExerciseManagementPage />;
      case 'marketplace':
        return <MarketplacePage onNavigate={setCurrentPage} />;
      case 'services':
        return <ServicesPage />;
      case 'goals':
        // Redirect to habits page (now includes goals)
        setCurrentPage('habits');
        return <HabitsPage />;
      case 'dashboard':
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  // Pages that are strictly admin-only (non-admins get redirected)
  const adminOnlyPages = [
    'admin',
    'admin-platform-dashboard',
    'admin-communications',
    'admin-brands',
    'brand-requests',
    'admin-users',
    'admin-library',
    'admin-stripe',
    'admin-memberships',
    'admin-projects',
    'admin-foods'
  ];

  // Check if current page is an admin page
  const isAdminPage = adminOnlyPages.includes(currentPage);

  // Redirect non-admins away from admin-only pages immediately
  if (isAdminPage && profile?.role !== 'admin') {
    const fallback = profile?.role === 'trainer' ? 'program-builder' : 'dashboard';
    setCurrentPage(fallback as Page);
    return null;
  }

  return (
    <>
      {isAdminPage ? (
        // Admin pages handle their own layout
        <Suspense fallback={<div />}>
          {renderPage()}
        </Suspense>
      ) : (
        // Regular pages use the main layout
        <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
          <Suspense fallback={<div />}>
            {renderPage()}
          </Suspense>
        </Layout>
      )}
      <AdaptiveNavigation currentPage={currentPage} onNavigate={setCurrentPage} />

      <AppUpdateBanner />
    </>
  );
}

export default App;
