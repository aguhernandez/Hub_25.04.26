import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import NotificationCenter from './NotificationCenter';
import asciendeLogoImg from '../assets/Asciendelogo.png';
import asciendefaviconImg from '../assets/Asciendefavicon.png';
import ActivityRecorder from './training/ActivityRecorder';
import {
  Heart,
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  Users,
  Shield,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  Target,
  Briefcase,
  Lightbulb,
  BookOpen,
  Ruler,
  Globe,
  Moon,
  Sun,
  Crown,
  Receipt,
  MapPin,
  Fingerprint,
  GraduationCap,
  ShoppingBag
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const NAV_LABELS: Record<string, Record<string, string>> = {
  en: {
    'Platform': 'Platform', 'Users': 'Users', 'Exercises': 'Exercises', 'Communications': 'Communications',
    'Home': 'Home', 'Train': 'Train', 'Nutrition': 'Nutrition', 'Athlete Stats': 'Athlete Stats',
    'My Profile': 'My Profile', 'Habits & Goals': 'Habits & Goals', 'Anthropometry': 'Anthropometry',
    'Body Composition': 'Body Composition',
    'Activity History': 'Activity History', 'Marketplace & Billing': 'Marketplace & Billing',
    'Coaching & Events': 'Coaching & Events', 'Coaching': 'Coaching', 'Teams & Sports': 'Teams & Sports', 'Chat': 'Chat',
    'My Athletes': 'My Athletes', 'Workout Builder': 'Workout Builder', 'Program Builder': 'Program Builder',
    'Exercise Library': 'Exercise Library', 'Manage Memberships': 'Manage Memberships',
    'Stripe Products': 'Stripe Products', 'Manage Programs': 'Manage Programs', 'Programs': 'Programs',
    'Brand Requests': 'Brand Requests', 'Food Database': 'Food Database',
    'Population Data': 'Population Data', 'My Teams & Sports': 'My Teams & Sports',
    'Settings': 'Settings', 'Logout': 'Logout', 'About': 'About', 'Feedback': 'Feedback',
    'Spotters and Support': 'Spotters and Support', 'Stats': 'Stats',
    'Biological Passport': 'Biological Passport',
    'Admin Dashboard': 'Admin Dashboard', 'Trainer Dashboard': 'Trainer Dashboard',
    'Athlete Dashboard': 'Athlete Dashboard',
    'PROFILE': 'PROFILE', 'KNOWLEDGE': 'KNOWLEDGE', 'MARKETPLACE & BILLING': 'MARKETPLACE & BILLING',
    'COMMUNITY': 'COMMUNITY', 'ATHLETES': 'ATHLETES', 'TOOLS': 'TOOLS',
    'BUSINESS & BILLING': 'BUSINESS & BILLING', 'MANAGEMENT': 'MANAGEMENT',
    'BUSINESS': 'BUSINESS', 'CONTENT': 'CONTENT', 'SYSTEM': 'SYSTEM',
    'Activity saved successfully!': 'Activity saved successfully!',
    'Failed to save activity': 'Failed to save activity',
  },
  es: {
    'Platform': 'Plataforma', 'Users': 'Usuarios', 'Exercises': 'Ejercicios', 'Communications': 'Comunicaciones',
    'Home': 'Inicio', 'Train': 'Entrenar', 'Nutrition': 'Nutrición', 'Athlete Stats': 'Estadísticas',
    'My Profile': 'Mi Perfil', 'Habits & Goals': 'Hábitos y Metas', 'Anthropometry': 'Antropometría',
    'Body Composition': 'Composición Corporal',
    'Activity History': 'Historial de Actividad', 'Marketplace & Billing': 'Marketplace y Facturación',
    'Coaching & Events': 'Coaching y Eventos', 'Coaching': 'Coaching', 'Teams & Sports': 'Equipos y Deportes', 'Chat': 'Chat',
    'My Athletes': 'Mis Atletas', 'Workout Builder': 'Constructor de Entrenamientos',
    'Program Builder': 'Constructor de Programas', 'Exercise Library': 'Biblioteca de Ejercicios',
    'Manage Memberships': 'Gestionar Membresías', 'Stripe Products': 'Productos Stripe',
    'Manage Programs': 'Gestionar Programas', 'Programs': 'Programas', 'Brand Requests': 'Solicitudes de Marcas',
    'Food Database': 'Base de Datos de Alimentos', 'Population Data': 'Datos de Población',
    'My Teams & Sports': 'Mis Equipos y Deportes', 'Settings': 'Configuración',
    'Logout': 'Cerrar sesión', 'About': 'Acerca de', 'Feedback': 'Comentarios',
    'Spotters and Support': 'Apoyadores', 'Stats': 'Estadísticas',
    'Biological Passport': 'Pasaporte Biológico',
    'Admin Dashboard': 'Panel de Administrador', 'Trainer Dashboard': 'Panel de Entrenador',
    'Athlete Dashboard': 'Panel de Atleta',
    'PROFILE': 'PERFIL', 'KNOWLEDGE': 'CONOCIMIENTO', 'MARKETPLACE & BILLING': 'MARKETPLACE Y FACTURACIÓN',
    'COMMUNITY': 'COMUNIDAD', 'ATHLETES': 'ATLETAS', 'TOOLS': 'HERRAMIENTAS',
    'BUSINESS & BILLING': 'NEGOCIO Y FACTURACIÓN', 'MANAGEMENT': 'GESTIÓN',
    'BUSINESS': 'NEGOCIO', 'CONTENT': 'CONTENIDO', 'SYSTEM': 'SISTEMA',
    'Activity saved successfully!': '¡Actividad guardada con éxito!',
    'Failed to save activity': 'Error al guardar la actividad',
  }
};

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    const saved = sessionStorage.getItem('sidebarExpanded');
    return saved === 'true';
  });
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [recorderPlannedWorkout, setRecorderPlannedWorkout] = useState<any>(null);

  const nav = (key: string): string => {
    const dict = NAV_LABELS[language] || NAV_LABELS['en'];
    return dict[key] || key;
  };

  const toggleSidebar = () => {
    setIsSidebarExpanded(prev => {
      const newValue = !prev;
      sessionStorage.setItem('sidebarExpanded', String(newValue));
      return newValue;
    });
  };

  useEffect(() => {
    const handleOpenActivityRecorder = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setRecorderPlannedWorkout(detail?.plannedWorkout ?? null);
      setIsRecorderOpen(true);
    };

    window.addEventListener('openActivityRecorder', handleOpenActivityRecorder);
    return () => {
      window.removeEventListener('openActivityRecorder', handleOpenActivityRecorder);
    };
  }, []);

  const handleNavigate = (page: string) => {
    onNavigate(page);
  };

  // PRIMARY NAV - Different for Admin
  const primaryNav = profile?.role === 'admin'
    ? [
        { id: 'admin', icon: Shield, label: 'Platform' },
        { id: 'admin-users', icon: Users, label: 'Users' },
        { id: 'exercises', icon: Dumbbell, label: 'Exercises' },
        { id: 'admin-communications', icon: MessageSquare, label: 'Communications' }
      ]
    : [
        { id: 'dashboard', icon: Home, label: 'Home' },
        { id: 'training', icon: Dumbbell, label: 'Train' },
        { id: 'nutrition-dashboard', icon: Apple, label: 'Nutrition' },
        { id: 'performance', icon: TrendingUp, label: 'Athlete Stats' }
      ];

  // MORE MENU by role
  const getMoreMenu = () => {
    if (!profile) return [];

    if (profile.role === 'athlete') {
      return [
        { section: 'PROFILE', items: [
          { id: 'biological-passport', icon: Fingerprint, label: 'Biological Passport' },
          { id: 'habits', icon: CheckSquare, label: 'Habits & Goals' },
          { id: 'bioimpedance', icon: Ruler, label: 'Body Composition' },
          { id: 'activity-history', icon: MapPin, label: 'Activity History' }
        ]},
        { section: 'COMMUNITY', items: [
          { id: 'my-teams', icon: Users, label: 'Teams & Sports' },
          { id: 'chat', icon: MessageSquare, label: 'Chat' },
          { id: 'impact', icon: Heart, label: 'Spotters and Support' }
        ]},
        { section: 'TOOLS', items: [
          { id: 'marketplace', icon: Crown, label: 'Memberships' },
          { id: 'programs-marketplace', icon: Target, label: 'Programs' },
          { id: 'services', icon: Briefcase, label: 'Coaching' }
        ]},
      ];
    }

    if (profile.role === 'trainer') {
      return [
        { section: 'ATHLETES', items: [
          { id: 'my-athletes', icon: Users, label: 'My Athletes' },
          { id: 'activity-history', icon: MapPin, label: 'Activity History' }
        ]},
        { section: 'COMMUNITY', items: [
          { id: 'my-teams', icon: Users, label: 'Teams & Sports' },
          { id: 'chat', icon: MessageSquare, label: 'Chat' },
          { id: 'impact', icon: Heart, label: 'Spotters and Support' }
        ]},
        { section: 'TOOLS', items: [
          { id: 'marketplace', icon: ShoppingBag, label: 'Memberships' },
          { id: 'programs-marketplace', icon: Target, label: 'Programs' },
          { id: 'services', icon: Briefcase, label: 'Coaching' }
        ]},
        { section: 'SYSTEM', items: [
          { id: 'exercises', icon: Target, label: 'Exercise Library' },
          { id: 'biological-passport', icon: Fingerprint, label: 'Biological Passport' },
          { id: 'bioimpedance', icon: Ruler, label: 'Body Composition' },
          { id: 'workout-builder', icon: Dumbbell, label: 'Workout Builder' },
          { id: 'program-builder', icon: BookOpen, label: 'Program Builder' }
        ]},
      ];
    }

    // Admin - Platform management with business features
    return [
      { section: 'MANAGEMENT', items: [
        { id: 'admin-memberships', icon: Crown, label: 'Manage Memberships' },
        { id: 'admin-stripe', icon: Receipt, label: 'Stripe Products' },
        { id: 'programs-marketplace', icon: Target, label: 'Programs' },
        { id: 'program-builder', icon: BookOpen, label: 'Program Builder' }
      ]},
      { section: 'BUSINESS', items: [
        { id: 'services', icon: Briefcase, label: 'Coaching & Events' },
        { id: 'brand-requests', icon: Lightbulb, label: 'Brand Requests' }
      ]},
      { section: 'CONTENT', items: [
        { id: 'nutrition-page', icon: Apple, label: 'Food Database' },
        { id: 'habits', icon: CheckSquare, label: 'Habits & Goals' },
        { id: 'base-academy', icon: GraduationCap, label: t('menu.baseAcademy') }
      ]},
      { section: 'COMMUNITY', items: [
        { id: 'my-teams', icon: Users, label: 'My Teams & Sports' },
        { id: 'chat', icon: MessageSquare, label: 'Chat' }
      ]},
    ];
  };

  const moreMenu = getMoreMenu();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header - ONLY on mobile (below 1024px) */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 lg:hidden safe-area-top">
        <div className="flex items-center justify-between px-4 py-3 safe-area-x">
          <img src={asciendeLogoImg} alt="Asciende" className="h-8 w-auto object-contain" />
          <div className="flex items-center gap-2">
            {/* Spotters and Support */}
            <button
              onClick={() => handleNavigate('impact')}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                currentPage === 'impact' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
              }`}
              title="Spotters and Support"
            >
              <Heart className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* Desktop Top Bar - ONLY on desktop (1024px+) */}
      <div className={`fixed top-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40 hidden lg:block transition-all duration-300 ${
        isSidebarExpanded ? 'left-64' : 'left-20'
      }`}>
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          {/* Spotters and Support */}
          <button
            onClick={() => handleNavigate('impact')}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              currentPage === 'impact' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
            }`}
            title="Spotters and Support"
          >
            <Heart className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <NotificationCenter />
        </div>
      </div>

      {/* Desktop Sidebar - ONLY on desktop (1024px+) - Collapsible with hover */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg z-50 hidden lg:block transition-all duration-300 ${
          isSidebarExpanded ? 'w-64' : 'w-20'
        }`}
        onMouseEnter={() => {
          setIsSidebarExpanded(true);
          sessionStorage.setItem('sidebarExpanded', 'true');
        }}
        onMouseLeave={() => {
          setIsSidebarExpanded(false);
          sessionStorage.setItem('sidebarExpanded', 'false');
        }}
      >
        <div className="flex flex-col h-full">
          <div className={`border-b border-gray-200 dark:border-gray-700 transition-all duration-300 flex items-center justify-center ${
            isSidebarExpanded ? 'p-5 min-h-[80px]' : 'p-4 min-h-[72px]'
          }`}>
            {isSidebarExpanded ? (
              <div className="flex flex-col items-center gap-1 w-full">
                <img src={asciendeLogoImg} alt="Asciende" className="h-8 w-auto object-contain" />
                <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {profile?.role === 'admin' && nav('Admin Dashboard')}
                  {profile?.role === 'trainer' && nav('Trainer Dashboard')}
                  {profile?.role === 'athlete' && nav('Athlete Dashboard')}
                </p>
              </div>
            ) : (
              <img src={asciendefaviconImg} alt="Asciende" className="h-8 w-8 object-contain" />
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-3 space-y-1">
              {/* Primary Navigation */}
              {primaryNav.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 rounded-lg transition-all ${
                      isSidebarExpanded ? 'px-3 py-2.5' : 'px-3 py-2.5 justify-center'
                    } ${
                      isActive
                        ? 'bg-[#fdda36] text-[#514163] dark:text-[#514163]'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={!isSidebarExpanded ? item.label : ''}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div className={`flex flex-col items-start overflow-hidden transition-all duration-300 ${
                      isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                    }`}>
                      <span className="font-medium whitespace-nowrap">{nav(item.label)}</span>
                      {item.id === 'performance' && (
                        <span className={`text-[10px] whitespace-nowrap ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                          {nav('Stats')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Academy - Special */}
              <button
                onClick={() => handleNavigate('base-academy')}
                className={`w-full flex items-center gap-3 rounded-lg transition-all ${
                  isSidebarExpanded ? 'px-3 py-2.5' : 'px-3 py-2.5 justify-center'
                } ${
                  currentPage === 'base-academy'
                    ? 'bg-[#fdda36] text-[#514163] dark:text-[#514163]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={!isSidebarExpanded ? t('menu.baseAcademy') : ''}
              >
                <GraduationCap className="w-5 h-5 flex-shrink-0" />
                <span className={`font-medium overflow-hidden transition-all duration-300 whitespace-nowrap ${
                  isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                }`}>{t('menu.baseAcademy')}</span>
              </button>

              {/* More Menu Sections */}
              {moreMenu.map(section => (
                <div key={section.section} className="pt-4">
                  {isSidebarExpanded && (
                    <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {nav(section.section)}
                    </p>
                  )}
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center gap-3 rounded-lg transition-all ${
                          isSidebarExpanded ? 'px-3 py-2.5' : 'px-3 py-2.5 justify-center'
                        } ${
                          isActive
                            ? 'bg-[#fdda36] text-[#514163] dark:text-[#514163]'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={!isSidebarExpanded ? item.label : ''}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className={`font-medium overflow-hidden transition-all duration-300 whitespace-nowrap ${
                          isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                        }`}>{nav(item.label)}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {/* Settings */}
            <button
              onClick={() => handleNavigate('settings')}
              className={`w-full flex items-center gap-3 rounded-lg transition-all ${
                isSidebarExpanded ? 'px-3 py-2' : 'px-3 py-2 justify-center'
              } ${
                currentPage === 'settings'
                  ? 'bg-[#fdda36] text-[#514163] dark:text-[#514163]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={!isSidebarExpanded ? nav('Settings') : ''}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className={`font-medium text-sm overflow-hidden transition-all duration-300 whitespace-nowrap ${
                isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>{nav('Settings')}</span>
            </button>

            {/* Language & Theme - Horizontal Row */}
            <div className={`flex items-center ${isSidebarExpanded ? 'gap-2 px-2' : 'gap-1 justify-center'}`}>
              <button
                onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${
                  isSidebarExpanded ? '' : 'px-2'
                }`}
                title={!isSidebarExpanded ? (language === 'es' ? 'Español' : 'English') : ''}
              >
                <Globe className="w-4 h-4 flex-shrink-0" />
                {isSidebarExpanded && (
                  <span className="font-medium text-xs whitespace-nowrap">{language === 'es' ? 'ESP' : 'ENG'}</span>
                )}
              </button>
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${
                  isSidebarExpanded ? '' : 'px-2'
                }`}
                title={!isSidebarExpanded ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
                {isSidebarExpanded && (
                  <span className="font-medium text-xs whitespace-nowrap">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                )}
              </button>
            </div>

            {/* Feedback & About - Horizontal Row */}
            <div className={`flex items-center ${isSidebarExpanded ? 'gap-2' : 'flex-col gap-1'}`}>
              <button
                onClick={() => handleNavigate('about-asciende')}
                className={`flex items-center gap-2 rounded-lg transition-all ${
                  isSidebarExpanded ? 'flex-1 px-3 py-2' : 'w-full px-3 py-2 justify-center'
                } ${
                  currentPage === 'about-asciende'
                    ? 'bg-[#fdda36] text-[#514163] dark:text-[#514163]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={!isSidebarExpanded ? nav('About') : ''}
              >
                <Lightbulb className="w-5 h-5 flex-shrink-0" />
                <span className={`font-medium text-sm overflow-hidden transition-all duration-300 whitespace-nowrap ${
                  isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                }`}>{nav('About')}</span>
              </button>

              <button
                onClick={() => handleNavigate('feedback')}
                className={`flex items-center gap-2 rounded-lg transition-all ${
                  isSidebarExpanded ? 'flex-1 px-3 py-2' : 'w-full px-3 py-2 justify-center'
                } ${
                  currentPage === 'feedback'
                    ? 'bg-[#fdda36] text-[#514163] dark:text-[#514163]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={!isSidebarExpanded ? nav('Feedback') : ''}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                <span className={`font-medium text-sm overflow-hidden transition-all duration-300 whitespace-nowrap ${
                  isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                }`}>{nav('Feedback')}</span>
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={signOut}
              className={`w-full flex items-center gap-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all ${
                isSidebarExpanded ? 'px-3 py-2.5' : 'px-3 py-2.5 justify-center'
              }`}
              title={!isSidebarExpanded ? nav('Logout') : ''}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className={`font-medium overflow-hidden transition-all duration-300 whitespace-nowrap ${
                isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>{nav('Logout')}</span>
            </button>

            {/* Profile Info */}
            <div className="flex items-center gap-3 px-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#fdda36]/20 dark:bg-[#fdda36]/30 flex items-center justify-center text-[#514163] dark:text-[#fdda36] font-bold flex-shrink-0">
                  {profile?.full_name?.[0] || 'U'}
                </div>
              )}
              <div className={`flex-1 overflow-hidden transition-all duration-300 ${
                isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`pt-20 pb-40 px-4 lg:pt-16 lg:pb-8 lg:px-6 safe-area-x transition-all duration-300 ${
        isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'
      }`}>
        {children}
      </main>

      {/* Global Activity Recorder */}
      <ActivityRecorder
        isOpen={isRecorderOpen}
        onClose={() => { setIsRecorderOpen(false); setRecorderPlannedWorkout(null); }}
        plannedWorkout={recorderPlannedWorkout}
        onSave={async (_data) => {
          window.dispatchEvent(new CustomEvent('workout-history-refresh'));
        }}
      />
    </div>
  );
}
