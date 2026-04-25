import { useState } from 'react';
import AsciendeLogo from './AsciendeLogo';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import asciendeLogoImg from '../assets/Asciendelogo.png';
import {
  Shield,
  MessageSquare,
  Users,
  Dumbbell,
  Settings,
  LogOut,
  Target,
  Crown,
  Receipt,
  Briefcase,
  Lightbulb,
  Apple,
  BookOpen,
  Globe,
  Moon,
  Sun,
  ListChecks,
  GraduationCap
} from 'lucide-react';
import NotificationCenter from './NotificationCenter';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

export default function AdminLayout({ children, currentPage }: AdminLayoutProps) {
  const { profile, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    const saved = sessionStorage.getItem('adminSidebarExpanded');
    return saved === 'true';
  });

  // Primary navigation for admin
  const primaryNav = [
    { id: 'admin', icon: Shield, label: 'Platform' },
    { id: 'admin-users', icon: Users, label: 'Users' },
    { id: 'exercises', icon: Dumbbell, label: 'Exercises' },
    { id: 'admin-communications', icon: MessageSquare, label: 'Comms' }
  ];

  // More menu sections for admin
  const moreMenu = [
    {
      section: 'MANAGEMENT',
      items: [
        { id: 'admin-memberships', icon: Crown, label: 'Manage Memberships' },
        { id: 'admin-stripe', icon: Receipt, label: 'Stripe Products' },
        { id: 'program-builder', icon: Target, label: 'Manage Programs' }
      ]
    },
    {
      section: 'BUSINESS',
      items: [
        { id: 'services', icon: Briefcase, label: 'Coaching & Events' },
        { id: 'brand-requests', icon: Lightbulb, label: 'Brand Requests' }
      ]
    },
    {
      section: 'CONTENT',
      items: [
        { id: 'admin-library', icon: Globe, label: 'Course Manager' },
        { id: 'base-academy', icon: GraduationCap, label: 'Academy Asciende' },
        { id: 'habits', icon: ListChecks, label: 'Habits & Goals' }
      ]
    },
    {
      section: 'COMMUNITY',
      items: [
        { id: 'my-teams', icon: Users, label: 'My Teams & Sports' },
        { id: 'chat', icon: MessageSquare, label: 'Chat' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 lg:hidden safe-area-top">
        <div className="flex items-center justify-between px-4 py-3 safe-area-x">
          <img
            src={asciendeLogoImg}
            alt="Asciende"
            className="h-8 w-auto"
          />
          <div className="flex items-center gap-2">
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* Desktop Top Bar */}
      <div className={`fixed top-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40 hidden lg:block transition-all duration-300 ${
        isSidebarExpanded ? 'left-64' : 'left-20'
      }`}>
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <NotificationCenter />
        </div>
      </div>

      {/* Desktop Sidebar - Collapsible with hover */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg z-50 hidden lg:block transition-all duration-300 ${
          isSidebarExpanded ? 'w-64' : 'w-20'
        }`}
        onMouseEnter={() => {
          setIsSidebarExpanded(true);
          sessionStorage.setItem('adminSidebarExpanded', 'true');
        }}
        onMouseLeave={() => {
          setIsSidebarExpanded(false);
          sessionStorage.setItem('adminSidebarExpanded', 'false');
        }}
      >
        <div className="flex flex-col h-full">
          <div className={`border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            isSidebarExpanded ? 'p-6' : 'p-4'
          }`}>
            <div className="flex items-center justify-center">
              {isSidebarExpanded ? (
                <div className="flex flex-col items-center gap-0.5">
                  <AsciendeLogo variant="full" height={28} />
                  <p className="text-xs text-gray-500 whitespace-nowrap">Admin Dashboard</p>
                </div>
              ) : (
                <AsciendeLogo variant="symbol" height={36} />
              )}
            </div>
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
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: item.id }))}
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
                    }`}>{item.label}</span>
                  </button>
                );
              })}

              {/* More Menu Sections */}
              {moreMenu.map(section => (
                <div key={section.section} className="pt-4">
                  {isSidebarExpanded && (
                    <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {section.section}
                    </p>
                  )}
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: item.id }))}
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
                        }`}>{item.label}</span>
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
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }))}
              className={`w-full flex items-center gap-3 rounded-lg transition-all ${
                isSidebarExpanded ? 'px-3 py-2' : 'px-3 py-2 justify-center'
              } ${
                currentPage === 'settings'
                  ? 'bg-[#fdda36] text-[#514163] dark:text-[#514163]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={!isSidebarExpanded ? 'Settings' : ''}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className={`font-medium text-sm overflow-hidden transition-all duration-300 whitespace-nowrap ${
                isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>Settings</span>
            </button>

            {/* Language & Theme */}
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

            {/* About Asciende */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'about-asciende' }))}
              className={`w-full flex items-center gap-3 rounded-lg transition-all ${
                isSidebarExpanded ? 'px-3 py-2' : 'px-3 py-2 justify-center'
              } ${
                currentPage === 'about-asciende'
                  ? 'bg-[#fdda36] text-[#514163] dark:text-[#514163]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={!isSidebarExpanded ? 'About Asciende' : ''}
            >
              <Lightbulb className="w-5 h-5 flex-shrink-0" />
              <span className={`font-medium text-sm overflow-hidden transition-all duration-300 whitespace-nowrap ${
                isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>About Asciende</span>
            </button>

            {/* Logout */}
            <button
              onClick={signOut}
              className={`w-full flex items-center gap-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all ${
                isSidebarExpanded ? 'px-3 py-2.5' : 'px-3 py-2.5 justify-center'
              }`}
              title={!isSidebarExpanded ? 'Logout' : ''}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className={`font-medium overflow-hidden transition-all duration-300 whitespace-nowrap ${
                isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>Logout</span>
            </button>

            {/* Profile Info */}
            <div className="flex items-center gap-3 px-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#fdda36]/20 dark:bg-[#fdda36]/30 flex items-center justify-center text-[#514163] dark:text-[#fdda36] font-bold flex-shrink-0">
                  {profile?.full_name?.[0] || 'A'}
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
    </div>
  );
}
