import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AthleteDashboard from './AthleteDashboard';
import TrainerDashboard from './TrainerDashboard';
import AdminPlatformDashboard from './AdminPlatformDashboard';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { profile, loading } = useAuth();
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#fdda36]"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {language === 'es' ? 'Cargando perfil...' : 'Loading profile...'}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es' ? 'No se pudo cargar el perfil' : 'Could not load profile'}
          </p>
        </div>
      </div>
    );
  }

  if (profile.role === 'admin') {
    return <AdminPlatformDashboard />;
  }

  if (profile.role === 'trainer') {
    return <TrainerDashboard />;
  }

  return <AthleteDashboard onNavigate={onNavigate} />;
}
