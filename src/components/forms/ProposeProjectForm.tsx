import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import Toast from '../Toast';
import { X, Send, CheckCircle, Globe, Mail, Flag, Trophy, Target } from 'lucide-react';

interface ProposeProjectFormProps {
  onClose: () => void;
}

const COUNTRIES = [
  'Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China',
  'Colombia', 'Costa Rica', 'Czech Republic', 'Denmark', 'Ecuador', 'Egypt', 'Finland',
  'France', 'Germany', 'Greece', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Mexico', 'Netherlands', 'New Zealand', 'Norway', 'Panama', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Romania', 'Russia', 'Singapore', 'South Africa', 'South Korea',
  'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'United Kingdom', 'United States',
  'Uruguay', 'Venezuela'
];

const SPORTS = [
  'Beach Volleyball',
  'Volleyball',
  'Cycling',
  'Running',
  'Swimming',
  'Triathlon',
  'Other'
];

const NEED_TYPES = [
  { value: 'travel', label: { en: 'Travel', es: 'Viajes' } },
  { value: 'equipment', label: { en: 'Equipment', es: 'Equipamiento' } },
  { value: 'training', label: { en: 'Training', es: 'Entrenamiento' } },
  { value: 'education', label: { en: 'Education', es: 'Educación' } },
  { value: 'health', label: { en: 'Health', es: 'Salud' } }
];

export default function ProposeProjectForm({ onClose }: ProposeProjectFormProps) {
  const { t, language } = useLanguage();
  const { toast, hideToast, success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    athleteName: '',
    email: '',
    country: '',
    sport: '',
    needType: '',
    description: '',
    socialLink: '',
    confirmed: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.confirmed) {
      showError(language === 'en' ? 'Please confirm that all information is true' : 'Por favor confirma que toda la información es verídica');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('project_proposals')
        .insert({
          athlete_name: formData.athleteName,
          email: formData.email,
          country: formData.country,
          sport: formData.sport,
          need_type: formData.needType,
          description: formData.description,
          social_link: formData.socialLink || null,
          confirmed: formData.confirmed
        });

      if (error) throw error;

      await supabase.functions.invoke('brevo-send-email', {
        body: {
          to: 'support@asciende.pro',
          subject: `New Project Proposal: ${formData.athleteName}`,
          html: `
            <h2>New Project Proposal</h2>
            <p><strong>Athlete:</strong> ${formData.athleteName}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Country:</strong> ${formData.country}</p>
            <p><strong>Sport:</strong> ${formData.sport}</p>
            <p><strong>Need Type:</strong> ${formData.needType}</p>
            <p><strong>Description:</strong> ${formData.description}</p>
            ${formData.socialLink ? `<p><strong>Social Link:</strong> ${formData.socialLink}</p>` : ''}
          `
        }
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error submitting proposal:', error);
      showError(language === 'en' ? 'Error submitting proposal. Please try again.' : 'Error al enviar la propuesta. Por favor intenta de nuevo.');
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
            {language === 'en' ? 'Success!' : '¡Éxito!'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
            {t('forms.proposeProject.success')}
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
              {t('forms.proposeProject.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
              {t('forms.proposeProject.description')}
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
                <Globe className="w-4 h-4 inline mr-2" />
                {t('forms.proposeProject.fullName')}
              </label>
              <input
                type="text"
                required
                value={formData.athleteName}
                onChange={(e) => setFormData({ ...formData, athleteName: e.target.value })}
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                <Flag className="w-4 h-4 inline mr-2" />
                {t('labels.country')}
              </label>
              <select
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
              >
                <option value="">Select...</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                <Trophy className="w-4 h-4 inline mr-2" />
                {t('labels.sport')}
              </label>
              <select
                required
                value={formData.sport}
                onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
              >
                <option value="">Select...</option>
                {SPORTS.map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              <Target className="w-4 h-4 inline mr-2" />
              {t('labels.needType')}
            </label>
            <select
              required
              value={formData.needType}
              onChange={(e) => setFormData({ ...formData, needType: e.target.value })}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
            >
              <option value="">Select...</option>
              {NEED_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label[language as 'en' | 'es']}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              {t('forms.proposeProject.shortDescription')}
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              {t('forms.proposeProject.socialLink')}
            </label>
            <input
              type="url"
              value={formData.socialLink}
              onChange={(e) => setFormData({ ...formData, socialLink: e.target.value })}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white dark:text-white"
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50 rounded-lg">
            <input
              type="checkbox"
              id="confirm"
              checked={formData.confirmed}
              onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
              className="mt-1"
            />
            <label htmlFor="confirm" className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
              {t('forms.proposeProject.confirmTruth')}
            </label>
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
                  {t('buttons.sendToAdmin')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
