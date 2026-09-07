import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AthleteDashboard from './AthleteDashboard';
import TrainerDashboard from './TrainerDashboard';
import AdminPlatformDashboard from './AdminPlatformDashboard';
import { ROLE_LABELS, ROLE_SATELLITE_ACCESS, type UserRole } from '../types/roles';

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

  if (['trainer', 'nutritionist', 'head_coach'].includes(profile.role)) {
    return (
      <>
        <ProfessionalSatelliteSummary role={profile.role as UserRole} />
        <TrainerDashboard />
      </>
    );
  }

  return <AthleteDashboard onNavigate={onNavigate} />;
}

function ProfessionalSatelliteSummary({ role }: { role: UserRole }) {
  const satellites = ROLE_SATELLITE_ACCESS[role];
  if (satellites.length === 0) return null;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{ROLE_LABELS[role]}</p>
        <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Available satellites</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {satellites.map(satellite => <span key={satellite} className="px-3 py-1.5 rounded-full bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36] text-sm font-semibold capitalize">{satellite}</span>)}
        </div>
      </div>
    </div>
  );
}
