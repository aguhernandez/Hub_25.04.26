import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, Save, AlertCircle } from 'lucide-react';

export default function SecuritySection() {
  const { language } = useLanguage();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
          ? '✅ Email actualizado. Revisa tu correo para confirmar el cambio.'
          : '✅ Email updated. Check your inbox to confirm the change.'
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

      alert(language === 'es' ? '✅ Contraseña actualizada' : '✅ Password updated');
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

  return (
    <div className="space-y-6">
      {/* Change Email */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Nuevo Email' : 'New Email'}
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
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
              ? language === 'es'
                ? 'Actualizando...'
                : 'Updating...'
              : language === 'es'
              ? 'Cambiar Email'
              : 'Change Email'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#fdda36]" />
          {language === 'es' ? 'Cambiar Contraseña' : 'Change Password'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Contraseña Actual' : 'Current Password'}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Nueva Contraseña' : 'New Password'}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              {language === 'es' ? 'Mínimo 6 caracteres' : 'Minimum 6 characters'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Confirmar Nueva Contraseña' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
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
              ? language === 'es'
                ? 'Actualizando...'
                : 'Updating...'
              : language === 'es'
              ? 'Cambiar Contraseña'
              : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
