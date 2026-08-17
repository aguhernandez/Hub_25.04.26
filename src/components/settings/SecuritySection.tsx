import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, Save, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';

export default function SecuritySection() {
  const { language } = useLanguage();
  const { signOut } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleEmailChange = async () => {
    if (!newEmail) {
      alert(language === 'es' ? 'Ingresa un nuevo email' : 'Enter a new email');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) throw error;

      alert(
        language === 'es'
          ? 'Email actualizado. Revisa tu correo para confirmar el cambio.'
          : 'Email updated. Check your inbox to confirm the change.'
      );
      setNewEmail('');
    } catch (error: any) {
      console.error('Error updating email:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert(language === 'es' ? 'Completa todos los campos' : 'Fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert(language === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert(language === 'es' ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      alert(language === 'es' ? 'Contraseña actualizada' : 'Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete account');
      }

      await signOut();
    } catch (err: any) {
      console.error('Error deleting account:', err);
      alert(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Email */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#fdda36]" />
          {language === 'es' ? 'Cambiar Email' : 'Change Email'}
        </h2>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {language === 'es'
                ? 'Recibirás un email de confirmación en tu nueva dirección. Debes hacer click en el enlace para completar el cambio.'
                : 'You will receive a confirmation email at your new address. You must click the link to complete the change.'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Nuevo Email' : 'New Email'}
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              placeholder="nuevo@email.com"
            />
          </div>

          <button
            onClick={handleEmailChange}
            disabled={loading || !newEmail}
            className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading
              ? language === 'es' ? 'Actualizando...' : 'Updating...'
              : language === 'es' ? 'Cambiar Email' : 'Change Email'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#fdda36]" />
          {language === 'es' ? 'Cambiar Contraseña' : 'Change Password'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Contraseña Actual' : 'Current Password'}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Nueva Contraseña' : 'New Password'}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {language === 'es' ? 'Mínimo 6 caracteres' : 'Minimum 6 characters'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Confirmar Nueva Contraseña' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading
              ? language === 'es' ? 'Actualizando...' : 'Updating...'
              : language === 'es' ? 'Cambiar Contraseña' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border-2 border-red-200 dark:border-red-900 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2">
              {language === 'es' ? 'Zona de Peligro' : 'Danger Zone'}
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {language === 'es'
                ? 'Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, ten certeza.'
                : 'Once you delete your account, there is no going back. Please be certain.'}
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              {language === 'es' ? 'Eliminar Cuenta Permanentemente' : 'Delete Account Permanently'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-8 h-8" />
              <h2 className="text-xl font-bold">
                {language === 'es' ? 'Confirmar Eliminación' : 'Confirm Deletion'}
              </h2>
            </div>

            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                {language === 'es'
                  ? 'Esta acción NO se puede deshacer. Esto eliminará permanentemente tu cuenta y todos tus datos.'
                  : 'This action CANNOT be undone. This will permanently delete your account and all your data.'}
              </p>

              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {language === 'es'
                  ? 'Escribe DELETE para confirmar:'
                  : 'Type DELETE to confirm:'}
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 border-2 border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading
                  ? (language === 'es' ? 'Eliminando...' : 'Deleting...')
                  : (language === 'es' ? 'Eliminar Cuenta' : 'Delete Account')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
