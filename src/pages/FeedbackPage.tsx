import { useState } from 'react';
import { MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type MessageType = 'bug' | 'suggestion' | 'improvement' | 'other';

interface FeedbackForm {
  name: string;
  email: string;
  type: MessageType;
  description: string;
}

export default function FeedbackPage() {
  const { language } = useLanguage();
  const [form, setForm] = useState<FeedbackForm>({
    name: '',
    email: '',
    type: 'bug',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const isEnglish = language === 'en';

  const translations = {
    title: isEnglish ? 'Feedback and Bug Reports' : 'Feedback y Reporte de Bugs',
    subtitle: isEnglish
      ? 'Found an error or have a suggestion? Help us improve Asciende.'
      : '¿Encontraste un error o tienes una sugerencia? Ayúdanos a mejorar Asciende.',
    nameLabel: isEnglish ? 'Name (optional)' : 'Nombre (opcional)',
    emailLabel: isEnglish ? 'Email (optional but recommended)' : 'Email (opcional pero recomendado)',
    typeLabel: isEnglish ? 'Message Type' : 'Tipo de mensaje',
    descriptionLabel: isEnglish ? 'Description' : 'Descripción',
    descriptionPlaceholder: isEnglish
      ? 'Please describe your feedback in detail...'
      : 'Por favor, describe tu comentario en detalle...',
    submitButton: isEnglish ? 'Send' : 'Enviar',
    successMessage: isEnglish
      ? 'Thank you for helping us improve Asciende!'
      : '¡Gracias por ayudarnos a mejorar Asciende!',
    errorMessage: isEnglish
      ? 'An error occurred while sending your feedback. Please try again.'
      : 'Ocurrió un error al enviar tu comentario. Por favor, intenta de nuevo.',
    validationError: isEnglish
      ? 'Please fill in the description field.'
      : 'Por favor, completa el campo de descripción.',
    invalidEmail: isEnglish
      ? 'Please enter a valid email address.'
      : 'Por favor, ingresa una dirección de email válida.',
    bugType: isEnglish ? 'Report a bug' : 'Reportar bug',
    suggestionType: isEnglish ? 'Suggestion' : 'Sugerencia',
    improvementType: isEnglish ? 'Feature improvement' : 'Mejora de funcionalidad',
    otherType: isEnglish ? 'Other' : 'Otro'
  };

  const validateForm = () => {
    if (!form.description.trim()) {
      setError(translations.validationError);
      return false;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(translations.invalidEmail);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-feedback-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            name: form.name || 'Anonymous',
            email: form.email || 'Not provided',
            type: form.type,
            description: form.description,
            timestamp: new Date().toISOString()
          })
        }
      );

      if (!response.ok) throw new Error('Failed to send feedback');

      setSuccess(true);
      setForm({ name: '', email: '', type: 'bug', description: '' });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(translations.errorMessage);
      console.error('Feedback submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-600 rounded-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {translations.title}
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {translations.subtitle}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 dark:text-green-300">{translations.successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {translations.nameLabel}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={isEnglish ? 'Your name' : 'Tu nombre'}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {translations.emailLabel}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={isEnglish ? 'your@email.com' : 'tu@email.com'}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
              />
            </div>

            {/* Type Field */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {translations.typeLabel}
              </label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
              >
                <option value="bug">{translations.bugType}</option>
                <option value="suggestion">{translations.suggestionType}</option>
                <option value="improvement">{translations.improvementType}</option>
                <option value="other">{translations.otherType}</option>
              </select>
            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {translations.descriptionLabel} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder={translations.descriptionPlaceholder}
                required
                rows={6}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEnglish ? 'Sending...' : 'Enviando...') : translations.submitButton}
            </button>

          </form>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {isEnglish
              ? '💡 Your feedback helps us make Asciende better. All messages are reviewed by our team.'
              : '💡 Tu comentario nos ayuda a mejorar Asciende. Todos los mensajes son revisados por nuestro equipo.'}
          </p>
        </div>

      </div>
    </div>
  );
}
