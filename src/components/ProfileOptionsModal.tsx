import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { X, CreditCard as Edit, Lock, Trash2, AlertCircle } from 'lucide-react';
import Toast from './Toast';

interface ProfileOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  athleteName: string;
  assignedTrainerId?: string;
  currentUserId: string;
  currentUserRole: string;
  currentUserEmail?: string;
}

export default function ProfileOptionsModal({
  isOpen,
  onClose,
  athleteId,
  athleteName,
  assignedTrainerId,
  currentUserId,
  currentUserRole,
  currentUserEmail,
}: ProfileOptionsModalProps) {
  const { language } = useLanguage();
  const { user: authUser } = useAuth();
  const [activeSection, setActiveSection] = useState<'main' | 'password' | 'delete'>('main');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    country: '',
  });

  const defaultTrainerEmail = 'agu@asciende.pro';

  // Determine if current user can delete this profile
  const canDeleteProfile =
    currentUserRole === 'admin' ||
    currentUserId === assignedTrainerId ||
    currentUserEmail === defaultTrainerEmail;

  const isAdmin = currentUserRole === 'admin';
  const isChangingOwnPassword = currentUserId === athleteId;

  // Load profile data when modal opens or athlete changes
  const loadProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, country')
        .eq('id', athleteId)
        .single();

      if (error) throw error;

      setEditFormData({
        full_name: data?.full_name || '',
        phone: data?.phone || '',
        country: data?.country || '',
      });
    } catch (err: any) {
      console.error('Error loading profile:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!editFormData.full_name?.trim()) {
      setToast({
        message: language === 'es' ? 'El nombre es requerido' : 'Name is required',
        type: 'error',
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name,
          phone: editFormData.phone,
          country: editFormData.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', athleteId);

      if (error) throw error;

      setToast({
        message: language === 'es' ? 'Perfil actualizado exitosamente' : 'Profile updated successfully',
        type: 'success',
      });

      setTimeout(() => {
        setActiveSection('main');
      }, 1500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setToast({
        message: language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (isAdmin && !isChangingOwnPassword) {
      // Admin changing someone else's password - only needs new password
      if (!newPassword || !confirmPassword) {
        setToast({
          message: language === 'es' ? 'Por favor completa todos los campos' : 'Please fill all fields',
          type: 'error',
        });
        return;
      }
    } else {
      // User changing own password - needs current password
      if (!currentPassword || !newPassword || !confirmPassword) {
        setToast({
          message: language === 'es' ? 'Por favor completa todos los campos' : 'Please fill all fields',
          type: 'error',
        });
        return;
      }
    }

    if (newPassword !== confirmPassword) {
      setToast({
        message: language === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match',
        type: 'error',
      });
      return;
    }

    if (newPassword.length < 6) {
      setToast({
        message: language === 'es' ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters',
        type: 'error',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      if (isAdmin && !isChangingOwnPassword) {
        // Use admin edge function to reset someone else's password
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const session = await supabase.auth.getSession();
        const token = session.data?.session?.access_token;

        if (!token) {
          throw new Error('No authentication token');
        }

        const response = await fetch(
          `${supabaseUrl}/functions/v1/admin-reset-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: athleteId,
              newPassword,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to reset password');
        }

        setToast({
          message: language === 'es' ? 'Contraseña actualizada exitosamente' : 'Password updated successfully',
          type: 'success',
        });
      } else {
        // User changing own password - use standard auth method
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) throw error;

        setToast({
          message: language === 'es' ? 'Contraseña actualizada exitosamente' : 'Password updated successfully',
          type: 'success',
        });
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setActiveSection('main');
      }, 1500);
    } catch (err: any) {
      console.error('Error changing password:', err);
      setToast({
        message: language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!canDeleteProfile) return;

    setIsDeleting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = await supabase.auth.getSession();
      const token = session.data?.session?.access_token;

      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: athleteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setToast({
        message: language === 'es' ? 'Perfil eliminado exitosamente' : 'Profile deleted successfully',
        type: 'success',
      });

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      setToast({
        message: language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Opciones de Perfil' : 'Profile Options'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          {activeSection === 'main' && (
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  setActiveSection('edit');
                  loadProfileData();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {language === 'es' ? 'Editar Perfil' : 'Edit Profile'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {language === 'es' ? 'Actualizar información personal' : 'Update personal information'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setActiveSection('password')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Lock className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {language === 'es' ? 'Cambiar Contraseña' : 'Change Password'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {language === 'es' ? 'Actualizar tu contraseña' : 'Update your password'}
                  </p>
                </div>
              </button>

              {canDeleteProfile && (
                <button
                  onClick={() => setActiveSection('delete')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-600 dark:text-red-400">
                      {language === 'es' ? 'Eliminar Perfil' : 'Delete Profile'}
                    </p>
                    <p className="text-xs text-red-500 dark:text-red-400">
                      {language === 'es'
                        ? 'Eliminar este perfil permanentemente'
                        : 'Delete this profile permanently'}
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Edit Profile Section */}
          {activeSection === 'edit' && (
            <div className="p-6 space-y-4">
              <button
                onClick={() => setActiveSection('main')}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-2"
              >
                ← {language === 'es' ? 'Volver' : 'Back'}
              </button>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Nombre Completo' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  placeholder={language === 'es' ? 'Ingresa el nombre completo' : 'Enter full name'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Teléfono' : 'Phone'}
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder={language === 'es' ? 'Ingresa el teléfono' : 'Enter phone number'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'País' : 'Country'}
                </label>
                <input
                  type="text"
                  value={editFormData.country}
                  onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                  placeholder={language === 'es' ? 'Ingresa el país' : 'Enter country'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
              >
                {isSavingProfile
                  ? language === 'es'
                    ? 'Guardando...'
                    : 'Saving...'
                  : language === 'es'
                  ? 'Guardar Cambios'
                  : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Change Password Section */}
          {activeSection === 'password' && (
            <div className="p-6 space-y-4">
              <button
                onClick={() => setActiveSection('main')}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-2"
              >
                ← {language === 'es' ? 'Volver' : 'Back'}
              </button>

              {isAdmin && !isChangingOwnPassword && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {language === 'es'
                      ? 'Como administrador, puedes cambiar esta contraseña sin necesidad de la contraseña actual.'
                      : 'As an admin, you can change this password without entering the current password.'}
                  </p>
                </div>
              )}

              {!isAdmin || isChangingOwnPassword ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Contraseña Actual' : 'Current Password'}
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={language === 'es' ? 'Ingresa tu contraseña actual' : 'Enter current password'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Nueva Contraseña' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={language === 'es' ? 'Ingresa una nueva contraseña' : 'Enter new password'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Confirmar Contraseña' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={language === 'es' ? 'Confirma la nueva contraseña' : 'Confirm new password'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
              >
                {isChangingPassword
                  ? language === 'es'
                    ? 'Cambiando...'
                    : 'Changing...'
                  : language === 'es'
                  ? 'Cambiar Contraseña'
                  : 'Change Password'}
              </button>
            </div>
          )}

          {/* Delete Profile Confirmation */}
          {activeSection === 'delete' && (
            <div className="p-6 space-y-4">
              <button
                onClick={() => setActiveSection('main')}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-2"
              >
                ← {language === 'es' ? 'Volver' : 'Back'}
              </button>

              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">
                    {language === 'es' ? 'Eliminar Perfil' : 'Delete Profile'}
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                    {language === 'es'
                      ? `¿Estás seguro de que quieres eliminar el perfil de ${athleteName}? Esta acción no se puede deshacer.`
                      : `Are you sure you want to delete ${athleteName}'s profile? This action cannot be undone.`}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveSection('main')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleDeleteProfile}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
                >
                  {isDeleting
                    ? language === 'es'
                      ? 'Eliminando...'
                      : 'Deleting...'
                    : language === 'es'
                    ? 'Eliminar'
                    : 'Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Close button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              {language === 'es' ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
