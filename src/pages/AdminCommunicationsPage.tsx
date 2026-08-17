import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import { useToast } from '../hooks/useToast';
import EmailTemplateEditor from '../components/communications/EmailTemplateEditor';
import {
  Send,
  Mail,
  Bell,
  Users,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Globe,
  Trophy,
  Loader2,
  Eye,
  Sparkles
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface SendHistory {
  id: string;
  type: string;
  subject: string;
  body?: string;
  recipients_count: number;
  recipients?: string[];
  sent_at: string;
  status: string;
  filters?: any;
}

export default function AdminCommunicationsPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'email' | 'notification' | 'history'>('email');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'email' | 'notification' | null>(null);

  const [emailData, setEmailData] = useState({
    subject: '',
    body: '',
    targetAudience: 'all',
    sportFilter: '',
    countryFilter: ''
  });

  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    targetAudience: 'all',
    sportFilter: '',
    priority: 'normal'
  });

  const [stats, setStats] = useState({
    totalAthletes: 0,
    totalCoaches: 0,
    totalUsers: 0
  });

  const [sendHistory, setSendHistory] = useState<SendHistory[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SendHistory | null>(null);
  const [useAdvancedEditor, setUseAdvancedEditor] = useState(false);
  const [emailBlocks, setEmailBlocks] = useState<any[]>([]);
  const [emailHtml, setEmailHtml] = useState('');

  useEffect(() => {
    loadStats();
    loadHistory();
  }, []);

  const loadStats = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role');

      if (profiles) {
        const athletes = profiles.filter(p => p.role === 'athlete').length;
        const coaches = profiles.filter(p => p.role === 'trainer').length;
        setStats({
          totalAthletes: athletes,
          totalCoaches: coaches,
          totalUsers: profiles.length
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await supabase
        .from('admin_communications_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (data) {
        setSendHistory(data);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const getRecipientCount = () => {
    const audience = activeTab === 'email' ? emailData.targetAudience : notificationData.targetAudience;

    switch (audience) {
      case 'athletes':
        return stats.totalAthletes;
      case 'coaches':
        return stats.totalCoaches;
      case 'all':
      default:
        return stats.totalUsers;
    }
  };

  const sendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.body.trim()) {
      showToast(language === 'es' ? 'Por favor completa todos los campos' : 'Please fill in all fields', 'error');
      return;
    }

    setConfirmAction('email');
    setShowConfirmDialog(true);
  };

  const confirmSendEmail = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    let sentStatus = 'failed';
    let errorMessage = '';
    let emails: string[] = [];

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, role, sport, country');

      let targetProfiles = profiles || [];

      if (emailData.targetAudience === 'athletes') {
        targetProfiles = targetProfiles.filter(p => p.role === 'athlete');
      } else if (emailData.targetAudience === 'coaches') {
        targetProfiles = targetProfiles.filter(p => p.role === 'trainer');
      }

      if (emailData.sportFilter) {
        targetProfiles = targetProfiles.filter(p => p.sport === emailData.sportFilter);
      }

      if (emailData.countryFilter) {
        targetProfiles = targetProfiles.filter(p => p.country === emailData.countryFilter);
      }

      emails = targetProfiles.map(p => p.email);

      if (emails.length === 0) {
        throw new Error(language === 'es' ? 'No hay destinatarios para los filtros seleccionados' : 'No recipients found for the selected filters');
      }

      const htmlContent = useAdvancedEditor
        ? emailHtml
        : `<html><body><p>${emailData.body.replace(/\n/g, '<br>')}</p></body></html>`;

      const { data, error } = await supabase.functions.invoke('brevo-send-email', {
        body: {
          to: emails,
          subject: emailData.subject,
          htmlContent: htmlContent
        }
      });

      console.log('Email send result:', { data, error });

      if (error) {
        errorMessage = error.message || 'Unknown error';
        throw error;
      }

      if (data?.mock) {
        sentStatus = 'not_configured';
        errorMessage = 'Brevo API key not configured';
        throw new Error(language === 'es'
          ? '⚠️ Brevo no está configurado. Por favor configura BREVO_API_KEY en los secretos de Supabase para enviar emails reales.'
          : '⚠️ Brevo is not configured. Please set BREVO_API_KEY in Supabase secrets to send real emails.');
      }

      if (!data?.success) {
        errorMessage = data?.error || 'Email send failed';
        throw new Error(data?.error || 'Email send failed');
      }

      sentStatus = 'sent';

      await supabase.from('admin_communications_log').insert({
        type: 'email',
        subject: emailData.subject,
        body: emailData.body,
        recipients_count: data.sent || emails.length,
        recipients: emails,
        sent_at: new Date().toISOString(),
        status: sentStatus,
        filters: {
          audience: emailData.targetAudience,
          sport: emailData.sportFilter,
          country: emailData.countryFilter,
          sent: data.sent,
          failed: data.failed
        }
      });

      showToast(
        language === 'es'
          ? `✅ Email enviado a ${data.sent} usuarios${data.failed > 0 ? ` (${data.failed} fallidos)` : ''}!`
          : `✅ Email sent to ${data.sent} users${data.failed > 0 ? ` (${data.failed} failed)` : ''}!`,
        'success'
      );

      setEmailData({
        subject: '',
        body: '',
        targetAudience: 'all',
        sportFilter: '',
        countryFilter: ''
      });

      loadHistory();
    } catch (error: any) {
      console.error('Error sending email:', error);

      await supabase.from('admin_communications_log').insert({
        type: 'email',
        subject: emailData.subject,
        body: emailData.body,
        recipients_count: 0,
        recipients: emails,
        sent_at: new Date().toISOString(),
        status: sentStatus,
        filters: {
          audience: emailData.targetAudience,
          sport: emailData.sportFilter,
          country: emailData.countryFilter,
          error: errorMessage || error.message
        }
      });

      showToast(error.message || (language === 'es' ? 'Error al enviar email' : 'Error sending email'), 'error');
      loadHistory();
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!notificationData.title.trim() || !notificationData.message.trim()) {
      showToast(language === 'es' ? 'Por favor completa todos los campos' : 'Please fill in all fields', 'error');
      return;
    }

    setConfirmAction('notification');
    setShowConfirmDialog(true);
  };

  const confirmSendNotification = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    let sentStatus = 'failed';
    let errorMessage = '';

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, role, sport');

      let targetProfiles = profiles || [];

      if (notificationData.targetAudience === 'athletes') {
        targetProfiles = targetProfiles.filter(p => p.role === 'athlete');
      } else if (notificationData.targetAudience === 'coaches') {
        targetProfiles = targetProfiles.filter(p => p.role === 'trainer');
      }

      if (notificationData.sportFilter) {
        targetProfiles = targetProfiles.filter(p => p.sport === notificationData.sportFilter);
      }

      if (targetProfiles.length === 0) {
        throw new Error(language === 'es' ? 'No hay destinatarios para los filtros seleccionados' : 'No recipients found for the selected filters');
      }

      const notifications = targetProfiles.map(p => ({
        user_id: p.id,
        title: notificationData.title,
        message: notificationData.message,
        type: 'announcement',
        priority: notificationData.priority
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        errorMessage = error.message;
        throw error;
      }

      sentStatus = 'sent';

      await supabase.from('admin_communications_log').insert({
        type: 'notification',
        subject: notificationData.title,
        body: notificationData.message,
        recipients_count: notifications.length,
        sent_at: new Date().toISOString(),
        status: sentStatus,
        filters: {
          audience: notificationData.targetAudience,
          sport: notificationData.sportFilter,
          priority: notificationData.priority
        }
      });

      showToast(
        language === 'es' ? `✅ Notificación enviada a ${notifications.length} usuarios!` : `✅ Notification sent to ${notifications.length} users!`,
        'success'
      );

      setNotificationData({
        title: '',
        message: '',
        targetAudience: 'all',
        sportFilter: '',
        priority: 'normal'
      });

      loadHistory();
    } catch (error: any) {
      console.error('Error sending notification:', error);

      await supabase.from('admin_communications_log').insert({
        type: 'notification',
        subject: notificationData.title,
        body: notificationData.message,
        recipients_count: 0,
        sent_at: new Date().toISOString(),
        status: sentStatus,
        filters: {
          audience: notificationData.targetAudience,
          sport: notificationData.sportFilter,
          priority: notificationData.priority,
          error: errorMessage || error.message
        }
      });

      showToast(error.message || (language === 'es' ? 'Error al enviar notificación' : 'Error sending notification'), 'error');
      loadHistory();
    } finally {
      setLoading(false);
    }
  };

  const t = (key: string) => {
    const translations: Record<string, { es: string; en: string }> = {
      title: { es: 'Centro de Comunicaciones', en: 'Communications Hub' },
      subtitle: { es: 'Envía emails y notificaciones a toda la comunidad Asciende', en: 'Send emails and notifications to the entire Asciende community' },
      email: { es: 'Email Masivo', en: 'Mass Email' },
      notification: { es: 'Notificación Push', en: 'Push Notification' },
      history: { es: 'Historial', en: 'History' },
      quickStats: { es: 'Estadísticas Rápidas', en: 'Quick Stats' },
      athletes: { es: 'Atletas', en: 'Athletes' },
      coaches: { es: 'Entrenadores', en: 'Coaches' },
      totalUsers: { es: 'Total Usuarios', en: 'Total Users' },
      targetAudience: { es: 'Audiencia Objetivo', en: 'Target Audience' },
      all: { es: 'Todos', en: 'All Users' },
      filters: { es: 'Filtros Adicionales', en: 'Additional Filters' },
      sport: { es: 'Deporte', en: 'Sport' },
      country: { es: 'País', en: 'Country' },
      subject: { es: 'Asunto', en: 'Subject' },
      message: { es: 'Mensaje', en: 'Message' },
      preview: { es: 'Vista Previa', en: 'Preview' },
      send: { es: 'Enviar', en: 'Send' },
      sending: { es: 'Enviando...', en: 'Sending...' },
      recipients: { es: 'Destinatarios', en: 'Recipients' },
      priority: { es: 'Prioridad', en: 'Priority' },
      normal: { es: 'Normal', en: 'Normal' },
      high: { es: 'Alta', en: 'High' },
      urgent: { es: 'Urgente', en: 'Urgent' }
    };
    return translations[key]?.[language] || key;
  };

  if (profile?.role !== 'admin') {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
    return null;
  }

  return (
    <AdminLayout currentPage="admin-communications">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalAthletes}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('athletes')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalCoaches}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('coaches')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalUsers}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('totalUsers')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'email'
                ? 'border-[#fdda36] text-[#514163] dark:text-white'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            {t('email')}
          </button>
          <button
            onClick={() => setActiveTab('notification')}
            className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'notification'
                ? 'border-[#fdda36] text-[#514163] dark:text-white'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            {t('notification')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-[#fdda36] text-[#514163] dark:text-white'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            {t('history')}
          </button>
        </div>

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            {/* Target Audience */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('targetAudience')}
                </label>
                <select
                  value={emailData.targetAudience}
                  onChange={(e) => setEmailData({ ...emailData, targetAudience: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('all')}</option>
                  <option value="athletes">{t('athletes')}</option>
                  <option value="coaches">{t('coaches')}</option>
                </select>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t('recipients')}: <span className="font-bold text-[#fdda36]">{getRecipientCount()}</span>
                </p>
              </div>
            </div>

            {/* Email Composer */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              {/* Editor Mode Toggle */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Contenido del Email' : 'Email Content'}
                </h3>
                <button
                  onClick={() => setUseAdvancedEditor(!useAdvancedEditor)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    useAdvancedEditor
                      ? 'bg-[#fdda36] text-[#514163]'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {useAdvancedEditor
                    ? (language === 'es' ? 'Editor Avanzado' : 'Advanced Editor')
                    : (language === 'es' ? 'Editor Simple' : 'Simple Editor')}
                </button>
              </div>

              {useAdvancedEditor ? (
                <EmailTemplateEditor
                  initialSubject={emailData.subject}
                  initialBlocks={emailBlocks}
                  onSave={(subject, blocks, html) => {
                    setEmailData({ ...emailData, subject });
                    setEmailBlocks(blocks);
                    setEmailHtml(html);
                  }}
                />
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailData.subject}
                      onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Email subject..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      value={emailData.body}
                      onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                      rows={10}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Email body..."
                    />
                  </div>
                </div>
              )}

              <button
                onClick={sendEmail}
                disabled={loading}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#fde66e] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Email to {getRecipientCount()} recipients
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Notification Tab */}
        {activeTab === 'notification' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('targetAudience')}
                </label>
                <select
                  value={notificationData.targetAudience}
                  onChange={(e) => setNotificationData({ ...notificationData, targetAudience: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('all')}</option>
                  <option value="athletes">{t('athletes')}</option>
                  <option value="coaches">{t('coaches')}</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('priority')}
                </label>
                <select
                  value={notificationData.priority}
                  onChange={(e) => setNotificationData({ ...notificationData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="normal">{t('normal')}</option>
                  <option value="high">{t('high')}</option>
                  <option value="urgent">{t('urgent')}</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subject')}
                </label>
                <input
                  type="text"
                  value={notificationData.title}
                  onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={language === 'es' ? 'Título de la notificación...' : 'Notification title...'}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('message')}
                </label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={language === 'es' ? 'Escribe tu mensaje aquí...' : 'Write your message here...'}
                />
              </div>

              {/* Send Button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('recipients')}: <span className="font-bold">{getRecipientCount()}</span>
                </p>
                <button
                  onClick={sendNotification}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-medium hover:bg-[#fce45c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('sending')}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {t('send')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {sendHistory.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'No hay envíos recientes' : 'No recent sends'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {language === 'es' ? 'Tipo' : 'Type'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {language === 'es' ? 'Asunto' : 'Subject'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {language === 'es' ? 'Destinatarios' : 'Recipients'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {language === 'es' ? 'Fecha' : 'Date'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {language === 'es' ? 'Acciones' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sendHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            item.type === 'email'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {item.type === 'email' ? <Mail className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {item.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.recipients_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {new Date(item.sent_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === 'sent'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : item.status === 'not_configured'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {item.status === 'sent' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                {language === 'es' ? 'Enviado' : 'Sent'}
                              </>
                            ) : item.status === 'not_configured' ? (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                {language === 'es' ? 'No Configurado' : 'Not Configured'}
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                {language === 'es' ? 'Fallido' : 'Failed'}
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedHistoryItem(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            {language === 'es' ? 'Ver' : 'View'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'es' ? '¿Confirmar envío?' : 'Confirm Send?'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {confirmAction === 'email'
                ? (language === 'es'
                    ? `¿Enviar email a ${getRecipientCount()} usuarios?`
                    : `Send email to ${getRecipientCount()} users?`)
                : (language === 'es'
                    ? `¿Enviar notificación a ${getRecipientCount()} usuarios?`
                    : `Send notification to ${getRecipientCount()} users?`)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'email') {
                    confirmSendEmail();
                  } else if (confirmAction === 'notification') {
                    confirmSendNotification();
                  }
                }}
                className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#fde66e] font-medium"
              >
                {language === 'es' ? 'Confirmar' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Details Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Detalles del Envío' : 'Send Details'}
                </h3>
                <button
                  onClick={() => setSelectedHistoryItem(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-2xl text-gray-500 dark:text-gray-400">&times;</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {language === 'es' ? 'Tipo' : 'Type'}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    selectedHistoryItem.type === 'email'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {selectedHistoryItem.type === 'email' ? <Mail className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                    {selectedHistoryItem.type}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {language === 'es' ? 'Estado' : 'Status'}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    selectedHistoryItem.status === 'sent'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : selectedHistoryItem.status === 'not_configured'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {selectedHistoryItem.status === 'sent' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        {language === 'es' ? 'Enviado' : 'Sent'}
                      </>
                    ) : selectedHistoryItem.status === 'not_configured' ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        {language === 'es' ? 'No Configurado' : 'Not Configured'}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        {language === 'es' ? 'Fallido' : 'Failed'}
                      </>
                    )}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {language === 'es' ? 'Fecha' : 'Date'}
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedHistoryItem.sent_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {language === 'es' ? 'Destinatarios' : 'Recipients'}
                  </p>
                  <p className="text-gray-900 dark:text-white font-bold">
                    {selectedHistoryItem.recipients_count}
                  </p>
                </div>
              </div>

              {/* Subject */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Asunto' : 'Subject'}
                </p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {selectedHistoryItem.subject}
                </p>
              </div>

              {/* Body/Message */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {language === 'es' ? 'Mensaje' : 'Message'}
                </p>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedHistoryItem.body || (language === 'es' ? 'Sin contenido' : 'No content')}
                  </p>
                </div>
              </div>

              {/* Recipients List */}
              {selectedHistoryItem.recipients && selectedHistoryItem.recipients.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {language === 'es' ? 'Lista de Destinatarios' : 'Recipients List'}
                  </p>
                  <div className="max-h-60 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-1">
                      {selectedHistoryItem.recipients.map((email, index) => (
                        <div
                          key={index}
                          className="text-sm text-gray-700 dark:text-gray-300 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                          {email}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {language === 'es'
                      ? `Total: ${selectedHistoryItem.recipients.length} email(s)`
                      : `Total: ${selectedHistoryItem.recipients.length} email(s)`}
                  </p>
                </div>
              )}

              {/* Filters Applied */}
              {selectedHistoryItem.filters && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {language === 'es' ? 'Filtros Aplicados' : 'Applied Filters'}
                  </p>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(selectedHistoryItem.filters, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
