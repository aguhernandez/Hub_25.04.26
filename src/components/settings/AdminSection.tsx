import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Shield, Crown, Users, Save, AlertCircle, Key, Inbox, Tag, Cpu } from 'lucide-react';
import ApiConfigSection from './ApiConfigSection';
import BrandDiscountManager from './BrandDiscountManager';
import AIMonitoringSection from './AIMonitoringSection';

interface AdminSectionProps {
  currentProfile: any;
}

export default function AdminSection({ currentProfile }: AdminSectionProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();

  const [adminTab, setAdminTab] = useState<'users' | 'apis' | 'requests' | 'brands' | 'ai_monitoring'>('users');
  const [role, setRole] = useState('athlete');
  const [membershipPlan, setMembershipPlan] = useState('inicia');
  const [membershipStatus, setMembershipStatus] = useState('active');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setRole(currentProfile.role || 'athlete');
      setMembershipPlan(currentProfile.membership_plan || 'inicia');
      setMembershipStatus(currentProfile.membership_status || 'active');
    }
  }, [currentProfile]);

  const isAdmin = profile?.role === 'admin';
  const isTrainer = profile?.role === 'trainer';
  const canManageRole = isAdmin;
  const canManageMembership = isAdmin || isTrainer;

  const handleSaveAdminChanges = async () => {
    if (!currentProfile?.id) return;

    setLoading(true);
    try {
      const updates: any = {};

      if (canManageRole) {
        updates.role = role;
      }

      if (canManageMembership) {
        updates.membership_plan = membershipPlan;
        updates.membership_status = membershipStatus;
        if (membershipStatus === 'active' && !currentProfile.membership_start_date) {
          updates.membership_start_date = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentProfile.id);

      if (error) throw error;

      alert(language === 'es' ? '✅ Cambios guardados' : '✅ Changes saved');
    } catch (error: any) {
      console.error('Error updating:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!canManageRole && !canManageMembership) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Admin Notice */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex gap-2">
          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
              {language === 'es' ? 'Panel de Administración' : 'Admin Panel'}
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
              {language === 'es'
                ? 'Gestiona usuarios, membresías y configuración de APIs.'
                : 'Manage users, memberships, and API configuration.'}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setAdminTab('users')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            adminTab === 'users'
              ? 'bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          {language === 'es' ? 'Usuarios' : 'Users'}
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setAdminTab('apis')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                adminTab === 'apis'
                  ? 'bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white'
              }`}
            >
              <Key className="w-4 h-4" />
              {language === 'es' ? 'APIs' : 'APIs'}
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'incoming-requests' }))}
              className="px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white"
            >
              <Inbox className="w-4 h-4" />
              {language === 'es' ? 'Solicitudes' : 'Requests'}
            </button>
            <button
              onClick={() => setAdminTab('brands')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                adminTab === 'brands'
                  ? 'bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4" />
              {language === 'es' ? 'Marcas' : 'Brands'}
            </button>
            <button
              onClick={() => setAdminTab('ai_monitoring')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                adminTab === 'ai_monitoring'
                  ? 'bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4" />
              {language === 'es' ? 'IA' : 'AI'}
            </button>
          </>
        )}
      </div>

      {/* Users Tab */}
      {adminTab === 'users' && (
        <>
          {/* Role Management (Admin Only) */}
          {canManageRole && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#fdda36]" />
            {language === 'es' ? 'Rol del Usuario' : 'User Role'}
          </h2>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {language === 'es'
                  ? 'Cambiar el rol afecta los permisos y funcionalidades disponibles para el usuario.'
                  : 'Changing the role affects the permissions and features available to the user.'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Seleccionar Rol' : 'Select Role'}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
            >
              <option value="athlete">
                {language === 'es' ? '🏃 Atleta' : '🏃 Athlete'}
              </option>
              <option value="trainer">
                {language === 'es' ? '💪 Entrenador' : '💪 Trainer'}
              </option>
              <option value="admin">
                {language === 'es' ? '👑 Administrador' : '👑 Administrator'}
              </option>
            </select>

            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
              <p>
                <strong className="text-gray-900 dark:text-white dark:text-white">
                  {language === 'es' ? 'Atleta:' : 'Athlete:'}
                </strong>{' '}
                {language === 'es'
                  ? 'Acceso a entrenamientos, nutrición, composición corporal'
                  : 'Access to training, nutrition, body composition'}
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white dark:text-white">
                  {language === 'es' ? 'Entrenador:' : 'Trainer:'}
                </strong>{' '}
                {language === 'es'
                  ? 'Gestiona atletas, crea planes, asigna entrenamientos'
                  : 'Manage athletes, create plans, assign workouts'}
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white dark:text-white">
                  {language === 'es' ? 'Admin:' : 'Admin:'}
                </strong>{' '}
                {language === 'es'
                  ? 'Acceso completo, gestión de usuarios y sistema'
                  : 'Full access, user and system management'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Membership Management */}
      {canManageMembership && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#fdda36]" />
            {language === 'es' ? 'Gestión de Membresía' : 'Membership Management'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Plan de Membresía' : 'Membership Plan'}
              </label>
              <select
                value={membershipPlan}
                onChange={(e) => setMembershipPlan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              >
                <option value="inicia">
                  {language === 'es' ? '🆓 Inicia (Gratis)' : '🆓 Inicia (Free)'}
                </option>
                <option value="intermediate">
                  {language === 'es' ? 'Asciende Intermediate' : 'Asciende Intermediate'}
                </option>
                <option value="pro">
                  {language === 'es' ? '👑 Pro - $79/mes' : '👑 Pro - $79/mo'}
                </option>
                <option value="elite">
                  {language === 'es' ? '⚡ Elite - $149/mes' : '⚡ Elite - $149/mo'}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                {language === 'es' ? 'Estado de Membresía' : 'Membership Status'}
              </label>
              <select
                value={membershipStatus}
                onChange={(e) => setMembershipStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              >
                <option value="active">
                  {language === 'es' ? '✅ Activo' : '✅ Active'}
                </option>
                <option value="trial">
                  {language === 'es' ? '🎁 Prueba' : '🎁 Trial'}
                </option>
                <option value="inactive">
                  {language === 'es' ? '⏸️ Inactivo' : '⏸️ Inactive'}
                </option>
                <option value="cancelled">
                  {language === 'es' ? '❌ Cancelado' : '❌ Cancelled'}
                </option>
              </select>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white mb-2">
                {language === 'es' ? 'Características por Plan' : 'Features by Plan'}
              </h4>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400">
                <p>
                  <strong>Free:</strong>{' '}
                  {language === 'es'
                    ? 'Acceso básico, 1 entrenamiento/semana'
                    : 'Basic access, 1 workout/week'}
                </p>
                <p>
                  <strong>Basic ($29):</strong>{' '}
                  {language === 'es'
                    ? 'Planes personalizados, tracking completo'
                    : 'Custom plans, full tracking'}
                </p>
                <p>
                  <strong>Pro ($79):</strong>{' '}
                  {language === 'es'
                    ? 'Todo en Basic + Chat, análisis avanzado'
                    : 'Everything in Basic + Chat, advanced analytics'}
                </p>
                <p>
                  <strong>Elite ($149):</strong>{' '}
                  {language === 'es'
                    ? 'Todo en Pro + Entrenador 24/7, sesiones ilimitadas'
                    : 'Everything in Pro + Trainer 24/7, unlimited sessions'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveAdminChanges}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading
                ? language === 'es'
                  ? 'Guardando...'
                  : 'Saving...'
                : language === 'es'
                ? 'Guardar Cambios de Admin'
                : 'Save Admin Changes'}
            </button>
          </div>
        </>
      )}

      {/* APIs Tab */}
      {adminTab === 'apis' && isAdmin && <ApiConfigSection />}

      {/* Brands Tab */}
      {adminTab === 'brands' && isAdmin && <BrandDiscountManager />}

      {/* AI Monitoring Tab */}
      {adminTab === 'ai_monitoring' && isAdmin && <AIMonitoringSection />}
    </div>
  );
}
