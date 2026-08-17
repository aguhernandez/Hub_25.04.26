import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  Users,
  Shield,
  MoreHorizontal,
  X,
  User,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  BookOpen,
  Target,
  Briefcase,
  Lightbulb,
  ShoppingBag,
  Ruler,
  Globe,
  Moon,
  Sun,
  Crown,
  Receipt,
  Heart,
  ListChecks,
  MapPin,
  Fingerprint,
  GraduationCap,
  type LucideIcon
} from 'lucide-react';

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  roles: ('athlete' | 'trainer' | 'admin')[];
  badge?: number;
  color?: string;
}

interface MoreMenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  section?: string;
}

// PRIMARY NAV - Mobile order: Home, Nutrition, Train (middle), Stats
const PRIMARY_NAV: NavItem[] = [
  {
    id: 'home',
    icon: Home,
    label: 'Home',
    path: 'dashboard',
    roles: ['athlete', 'trainer']
  },
  {
    id: 'nutrition',
    icon: Apple,
    label: 'Nutrition',
    path: 'nutrition-dashboard',
    roles: ['athlete']
  },
  {
    id: 'nutrition',
    icon: Apple,
    label: 'Nutrition',
    path: 'trainer-athlete-nutrition',
    roles: ['trainer']
  },
  {
    id: 'training',
    icon: Dumbbell,
    label: 'Train',
    path: 'training',
    roles: ['athlete', 'trainer']
  },
  {
    id: 'base-academy',
    icon: GraduationCap,
    label: 'Academy',
    path: 'base-academy',
    roles: ['athlete', 'trainer']
  }
];

// ADMIN PRIMARY NAV
const ADMIN_PRIMARY_NAV: NavItem[] = [
  {
    id: 'platform',
    icon: Shield,
    label: 'Platform',
    path: 'admin',
    roles: ['admin']
  },
  {
    id: 'users',
    icon: Users,
    label: 'Users',
    path: 'admin-users',
    roles: ['admin']
  },
  {
    id: 'exercises',
    icon: Dumbbell,
    label: 'Exercises',
    path: 'exercises',
    roles: ['admin']
  },
  {
    id: 'comms',
    icon: MessageSquare,
    label: 'Comms',
    path: 'admin-communications',
    roles: ['admin']
  }
];

interface MoreMenuSection {
  section: string;
  items: MoreMenuItem[];
}

const ATHLETE_MORE_SECTIONS: MoreMenuSection[] = [
  { section: 'PROFILE', items: [
    { id: 'performance', icon: TrendingUp, label: 'Stats', path: 'performance' },
    { id: 'biological-passport', icon: Fingerprint, label: 'Biological Passport', path: 'biological-passport' },
    { id: 'habits', icon: CheckSquare, label: 'Habits & Goals', path: 'habits' },
    { id: 'bioimpedance', icon: Ruler, label: 'Body Composition', path: 'bioimpedance' },
    { id: 'activity-history', icon: MapPin, label: 'Activity History', path: 'activity-history' },
  ]},
  { section: 'COMMUNITY', items: [
    { id: 'my-teams', icon: Users, label: 'Teams & Sports', path: 'my-teams' },
    { id: 'chat', icon: MessageSquare, label: 'Chat', path: 'chat' },
    { id: 'impact', icon: Heart, label: 'Spotters and Support', path: 'impact' },
  ]},
  { section: 'TOOLS', items: [
    { id: 'marketplace', icon: Crown, label: 'Memberships', path: 'marketplace' },
    { id: 'programs-marketplace', icon: Target, label: 'Programs', path: 'programs-marketplace' },
    { id: 'services', icon: Briefcase, label: 'Coaching', path: 'services' },
  ]},
  { section: 'SYSTEM', items: [
    { id: 'settings', icon: Settings, label: 'Settings', path: 'settings' },
  ]},
];

const TRAINER_MORE_SECTIONS: MoreMenuSection[] = [
  { section: 'ATHLETES', items: [
    { id: 'performance', icon: TrendingUp, label: 'Stats', path: 'performance' },
    { id: 'my-athletes', icon: Users, label: 'My Athletes', path: 'my-athletes' },
    { id: 'activity-history', icon: MapPin, label: 'Activity History', path: 'activity-history' },
  ]},
  { section: 'COMMUNITY', items: [
    { id: 'my-teams', icon: Users, label: 'Teams & Sports', path: 'my-teams' },
    { id: 'chat', icon: MessageSquare, label: 'Chat', path: 'chat' },
    { id: 'impact', icon: Heart, label: 'Spotters and Support', path: 'impact' },
  ]},
  { section: 'TOOLS', items: [
    { id: 'marketplace', icon: Crown, label: 'Memberships', path: 'marketplace' },
    { id: 'programs-marketplace', icon: Target, label: 'Programs', path: 'programs-marketplace' },
    { id: 'services', icon: Briefcase, label: 'Coaching', path: 'services' },
  ]},
  { section: 'SYSTEM', items: [
    { id: 'exercises', icon: Target, label: 'Exercise Library', path: 'exercises' },
    { id: 'biological-passport', icon: Fingerprint, label: 'Biological Passport', path: 'biological-passport' },
    { id: 'bioimpedance', icon: Ruler, label: 'Body Composition', path: 'bioimpedance' },
    { id: 'workout-builder', icon: Dumbbell, label: 'Workout Builder', path: 'workout-builder' },
    { id: 'program-builder', icon: BookOpen, label: 'Program Builder', path: 'program-builder' },
    { id: 'settings', icon: Settings, label: 'Settings', path: 'settings' },
  ]},
];

const ADMIN_MORE_SECTIONS: MoreMenuSection[] = [
  { section: 'MANAGEMENT', items: [
    { id: 'admin-memberships', icon: Crown, label: 'Manage Memberships', path: 'admin-memberships' },
    { id: 'admin-stripe', icon: Receipt, label: 'Stripe Products', path: 'admin-stripe' },
    { id: 'program-builder', icon: BookOpen, label: 'Program Builder', path: 'program-builder' },
  ]},
  { section: 'BUSINESS', items: [
    { id: 'services', icon: Briefcase, label: 'Coaching & Events', path: 'services' },
    { id: 'brand-requests', icon: Lightbulb, label: 'Brand Requests', path: 'brand-requests' },
  ]},
  { section: 'CONTENT', items: [
    { id: 'admin-foods', icon: Apple, label: 'Add Food', path: 'admin-foods' },
    { id: 'habits', icon: ListChecks, label: 'Habits & Goals', path: 'habits' },
    { id: 'base-academy', icon: GraduationCap, label: 'Academy Asciende', path: 'base-academy' },
  ]},
  { section: 'COMMUNITY', items: [
    { id: 'my-teams', icon: Users, label: 'My Teams & Sports', path: 'my-teams' },
    { id: 'chat', icon: MessageSquare, label: 'Chat', path: 'chat' },
  ]},
  { section: 'SYSTEM', items: [
    { id: 'settings', icon: Settings, label: 'Settings', path: 'settings' },
  ]},
];

interface AdaptiveNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navTranslations: Record<string, Record<string, string>> = {
  en: {
    'Home': 'Home',
    'Train': 'Train',
    'Nutrition': 'Nutrition',
    'Stats': 'Stats',
    'Platform': 'Platform',
    'Users': 'Users',
    'Exercises': 'Exercises',
    'Comms': 'Comms',
    'My Profile': 'My Profile',
    'Habits & Goals': 'Habits & Goals',
    'Body Composition': 'Body Composition',
    'Activity History': 'Activity History',
    'Academy': 'Academy',
    'Academy Asciende': 'Academy Asciende',
    'Spotters and Support': 'Spotters and Support',
    'Memberships': 'Memberships',
    'Programs': 'Programs',
    'Coaching & Events': 'Coaching & Events',
    'Teams & Sports': 'Teams & Sports',
    'My Teams & Sports': 'My Teams & Sports',
    'Chat': 'Chat',
    'Settings': 'Settings',
    'My Athletes': 'My Athletes',
    'Workout Builder': 'Workout Builder',
    'Program Builder': 'Program Builder',
    'Exercise Library': 'Exercise Library',
    'Manage Memberships': 'Manage Memberships',
    'Stripe Products': 'Stripe Products',
    'Manage Programs': 'Manage Programs',
    'Brand Requests': 'Brand Requests',
    'Add Food': 'Add Food',
    'Biological Passport': 'Biological Passport',
    'About Asciende': 'About Asciende',
    'Feedback': 'Feedback',
    'Menu': 'Menu',
    'Logout': 'Logout',
    'Coaching': 'Coaching',
    'PROFILE': 'PROFILE',
    'KNOWLEDGE': 'KNOWLEDGE',
    'COMMUNITY': 'COMMUNITY',
    'TOOLS': 'TOOLS',
    'ATHLETES': 'ATHLETES',
    'BUSINESS & BILLING': 'BUSINESS & BILLING',
    'MANAGEMENT': 'MANAGEMENT',
    'BUSINESS': 'BUSINESS',
    'CONTENT': 'CONTENT',
    'SYSTEM': 'SYSTEM',
  },
  es: {
    'Home': 'Inicio',
    'Train': 'Entrenar',
    'Nutrition': 'Nutrición',
    'Stats': 'Estadísticas',
    'Platform': 'Plataforma',
    'Users': 'Usuarios',
    'Exercises': 'Ejercicios',
    'Comms': 'Comunicaciones',
    'My Profile': 'Mi Perfil',
    'Habits & Goals': 'Hábitos y Metas',
    'Body Composition': 'Composición Corporal',
    'Activity History': 'Historial de Actividad',
    'Academy': 'Academia',
    'Academy Asciende': 'Academia Asciende',
    'Spotters and Support': 'Apoyadores',
    'Memberships': 'Membresías',
    'Programs': 'Programas',
    'Coaching & Events': 'Coaching y Eventos',
    'Teams & Sports': 'Equipos y Deportes',
    'My Teams & Sports': 'Mis Equipos y Deportes',
    'Chat': 'Chat',
    'Settings': 'Configuración',
    'My Athletes': 'Mis Atletas',
    'Workout Builder': 'Constructor de Entrenamientos',
    'Program Builder': 'Constructor de Programas',
    'Exercise Library': 'Biblioteca de Ejercicios',
    'Manage Memberships': 'Gestionar Membresías',
    'Stripe Products': 'Productos Stripe',
    'Manage Programs': 'Gestionar Programas',
    'Brand Requests': 'Solicitudes de Marcas',
    'Add Food': 'Agregar Alimento',
    'Biological Passport': 'Pasaporte Biológico',
    'About Asciende': 'Sobre Asciende',
    'Feedback': 'Comentarios',
    'Menu': 'Menú',
    'Logout': 'Cerrar sesión',
    'Coaching': 'Coaching',
    'PROFILE': 'PERFIL',
    'KNOWLEDGE': 'CONOCIMIENTO',
    'COMMUNITY': 'COMUNIDAD',
    'TOOLS': 'HERRAMIENTAS',
    'ATHLETES': 'ATLETAS',
    'BUSINESS & BILLING': 'NEGOCIO Y FACTURACIÓN',
    'MANAGEMENT': 'GESTIÓN',
    'BUSINESS': 'NEGOCIO',
    'CONTENT': 'CONTENIDO',
    'SYSTEM': 'SISTEMA',
  }
};

export default function AdaptiveNavigation({ currentPage, onNavigate }: AdaptiveNavigationProps) {
  const { profile, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getVisibleNavItems = () => {
    if (!profile) return [];
    const userRole = profile.role as 'athlete' | 'trainer' | 'admin';
    const navItems = userRole === 'admin' ? ADMIN_PRIMARY_NAV : PRIMARY_NAV;
    return navItems.filter(item => item.roles.includes(userRole));
  };

  const getMoreMenuSections = (): MoreMenuSection[] => {
    if (!profile) return [];
    switch (profile.role) {
      case 'admin': return ADMIN_MORE_SECTIONS;
      case 'trainer': return TRAINER_MORE_SECTIONS;
      default: return ATHLETE_MORE_SECTIONS;
    }
  };

  const tr = (label: string): string => {
    const translations = navTranslations[language] || navTranslations['en'];
    return translations[label] || label;
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setShowMoreDrawer(false);
  };

  const visibleItems = getVisibleNavItems();
  const moreMenuSections = getMoreMenuSections();

  if (!isMobile) return null;

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-700 shadow-lg"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center justify-around px-1 pt-1">
          {visibleItems.map(item => (
            <button
              key={item.id + item.path}
              onClick={() => handleNavigate(item.path)}
              className={`relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all active:scale-90 ${
                currentPage === item.path
                  ? 'text-[#514163] dark:text-[#fdda36]'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                background: currentPage === item.path ? 'rgba(253,218,54,0.15)' : 'transparent',
              }}
            >
              <item.icon className={`w-5 h-5 mb-0.5 transition-transform ${currentPage === item.path ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-semibold tracking-tight">{tr(item.label)}</span>
              {currentPage === item.path && (
                <div
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full"
                  style={{ background: '#fdda36' }}
                />
              )}
            </button>
          ))}

          {/* More Button */}
          <button
            onClick={() => setShowMoreDrawer(true)}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all active:scale-90 ${
              showMoreDrawer ? 'text-[#514163] dark:text-[#fdda36]' : 'text-gray-500 dark:text-gray-400'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">{tr('Menu')}</span>
          </button>
        </div>
      </nav>

      {/* More Drawer */}
      {showMoreDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
            onClick={() => setShowMoreDrawer(false)}
          />

          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#fdda36]/20 flex items-center justify-center text-[#514163] font-bold text-sm">
                    {profile?.full_name?.[0] || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="p-4 space-y-5" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
              {moreMenuSections.map(({ section, items }) => (
                <div key={section}>
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                    {tr(section)}
                  </h4>
                  <div className="space-y-0.5">
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          currentPage === item.path
                            ? 'bg-[#fdda36]/20 dark:bg-[#fdda36]/30 text-[#514163] dark:text-[#fdda36]'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm">{tr(item.label)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Language & Theme */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <Globe className="w-4 h-4" />
                  <span className="font-semibold text-sm">{language === 'es' ? 'ESP' : 'ENG'}</span>
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span className="font-medium text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
              </div>

              {/* About & Feedback */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleNavigate('about-asciende')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentPage === 'about-asciende'
                      ? 'bg-[#fdda36]/20 dark:bg-[#fdda36]/30 text-[#514163] dark:text-[#fdda36]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>{tr('About Asciende')}</span>
                </button>
                <button
                  onClick={() => handleNavigate('feedback')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentPage === 'feedback'
                      ? 'bg-[#fdda36]/20 dark:bg-[#fdda36]/30 text-[#514163] dark:text-[#fdda36]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{tr('Feedback')}</span>
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={async () => {
                  setShowMoreDrawer(false);
                  await signOut();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{tr('Logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
