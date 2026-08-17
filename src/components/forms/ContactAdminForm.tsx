import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import Toast from '../Toast';
import { X, Send, CheckCircle, User, Mail, FileText, MessageSquare } from 'lucide-react';

interface ContactAdminFormProps {
  onClose: () => void;
}

export default function ContactAdminForm({ onClose }: ContactAdminFormProps) {
  const { t, language } = useLanguage();
  const { toast, hideToast, success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    senderName: '',
    senderEmail: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          sender_name: formData.senderName,
          sender_email: formData.senderEmail,
          subject: formData.subject,
          message: formData.message
        });

      if (error) throw error;

      await supabase.functions.invoke('brevo-send-email', {
        body: {
          to: 'support@asciende.pro',
          subject: `Admin Contact: ${formData.subject}`,
          html: `
            <h2>New Admin Contact Message</h2>
            <p><strong>From:</strong> ${formData.senderName}</p>
            <p><strong>Email:</strong> ${formData.senderEmail}</p>
            <p><strong>Subject:</strong> ${formData.subject}</p>
            <hr>
            <p>${formData.message.replace(/\n/g, '<br>')}</p>
          `
        }
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error sending message:', error);
      showError(language === 'en' ? 'Error sending message. Please try again.' : 'Error al enviar el mensaje. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            {language === 'en' ? 'Message Sent!' : '¡Mensaje Enviado!'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
            {t('forms.contactAdmin.success')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Toast toast={toast} onHide={hideToast} />
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
              {t('forms.contactAdmin.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
              {language === 'en'
                ? 'Send a message to the Asciende team'
                : 'Enviar mensaje al equipo de Asciende'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                {t('labels.name')}
              </label>
              <input
                type="text"
                required
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                {t('labels.email')}
              </label>
              <input
                type="email"
                required
                value={formData.senderEmail}
                onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              {t('forms.proposeProject.subject')}
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              {t('forms.proposeProject.message')}
            </label>
            <textarea
              required
              rows={6}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#514163] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {t('buttons.submit')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
