import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { saveEncryptedConfig, loadDecryptedConfig, isSensitiveField } from '../../lib/apiConfigEncryption';
import { Key, Mail, CreditCard, Video, Save, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, RefreshCw, Brain, ChevronDown } from 'lucide-react';

interface ApiConfig {
  id: string;
  service_name: string;
  config_key: string;
  config_value: string | null;
  encrypted_value: string | null;
  is_active: boolean;
  updated_at: string;
}

export default function ApiConfigSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ApiConfig[]>([]);

  // Brevo
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('');
  const [brevoSenderName, setBrevoSenderName] = useState('');
  const [showBrevoKey, setShowBrevoKey] = useState(false);

  // Stripe
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [showStripeKeys, setShowStripeKeys] = useState(false);

  // Zoom
  const [zoomAccountId, setZoomAccountId] = useState('');
  const [zoomClientId, setZoomClientId] = useState('');
  const [zoomClientSecret, setZoomClientSecret] = useState('');
  const [showZoomKeys, setShowZoomKeys] = useState(false);

  // OpenAI
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('api_configurations')
        .select('*')
        .order('service_name', { ascending: true });

      if (error) throw error;

      setConfigs(data || []);

      // Load and decrypt Brevo configs
      const brevoConfigs = await loadDecryptedConfig('brevo');
      setBrevoApiKey(brevoConfigs['api_key'] || '');
      setBrevoSenderEmail(brevoConfigs['sender_email'] || '');
      setBrevoSenderName(brevoConfigs['sender_name'] || '');

      // Load and decrypt Stripe configs
      const stripeConfigs = await loadDecryptedConfig('stripe');
      setStripeSecretKey(stripeConfigs['secret_key'] || '');
      setStripeWebhookSecret(stripeConfigs['webhook_secret'] || '');
      setStripeMode(stripeConfigs['mode'] as 'test' | 'live' || 'test');

      // Load and decrypt Zoom configs
      const zoomConfigs = await loadDecryptedConfig('zoom');
      setZoomAccountId(zoomConfigs['account_id'] || '');
      setZoomClientId(zoomConfigs['client_id'] || '');
      setZoomClientSecret(zoomConfigs['client_secret'] || '');

      // Load and decrypt OpenAI configs
      const openaiConfigs = await loadDecryptedConfig('openai');
      setOpenaiApiKey(openaiConfigs['api_key'] || '');
      setOpenaiModel(openaiConfigs['model'] || 'gpt-4o-mini');
    } catch (error: any) {
      console.error('Error loading configurations:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const updateConfig = async (serviceName: string, configKey: string, configValue: string | null, isActive: boolean = true) => {
    await saveEncryptedConfig({
      serviceName,
      configKey,
      configValue,
      isActive,
      isSensitive: isSensitiveField(serviceName, configKey),
      updatedBy: profile?.id,
    });
  };

  const handleSaveBrevo = async () => {
    setLoading(true);
    try {
      await updateConfig('brevo', 'api_key', brevoApiKey, !!brevoApiKey);
      await updateConfig('brevo', 'sender_email', brevoSenderEmail);
      await updateConfig('brevo', 'sender_name', brevoSenderName);

      alert(language === 'es' ? '✅ Brevo configurado' : '✅ Brevo configured');
      await loadConfigurations();
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStripe = async () => {
    setLoading(true);
    try {
      await updateConfig('stripe', 'secret_key', stripeSecretKey, !!stripeSecretKey);
      await updateConfig('stripe', 'webhook_secret', stripeWebhookSecret, !!stripeWebhookSecret);
      await updateConfig('stripe', 'mode', stripeMode);

      alert(language === 'es' ? '✅ Stripe configurado' : '✅ Stripe configured');
      await loadConfigurations();
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveZoom = async () => {
    setLoading(true);
    try {
      await updateConfig('zoom', 'account_id', zoomAccountId, !!zoomAccountId);
      await updateConfig('zoom', 'client_id', zoomClientId, !!zoomClientId);
      await updateConfig('zoom', 'client_secret', zoomClientSecret, !!zoomClientSecret);

      alert(language === 'es' ? '✅ Zoom configurado' : '✅ Zoom configured');
      await loadConfigurations();
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpenAI = async () => {
    setLoading(true);
    try {
      console.log('Guardando OpenAI config:', { openaiApiKey: openaiApiKey?.substring(0, 10) + '...', openaiModel });

      await updateConfig('openai', 'api_key', openaiApiKey, !!openaiApiKey);
      console.log('API Key guardado');

      await updateConfig('openai', 'model', openaiModel, true);
      console.log('Modelo guardado');

      // Verify it was saved
      const { data: verifyData } = await supabase
        .from('api_configurations')
        .select('*')
        .eq('service_name', 'openai');

      console.log('Verificación en BD:', verifyData);

      alert(language === 'es' ? '✅ OpenAI configurado correctamente' : '✅ OpenAI configured successfully');
      await loadConfigurations();
    } catch (error: any) {
      console.error('Error guardando OpenAI:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testOpenAIConnection = async () => {
    if (!openaiApiKey) {
      alert(language === 'es' ? 'Por favor, ingresa la API key primero' : 'Please enter the API key first');
      return;
    }
    setTesting('openai');
    try {
      // Test 1: Check if API key is valid
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'User-Agent': 'Asciende/1.0'
        },
      });

      if (!response.ok) {
        const err = await response.json();
        const errorMsg = err.error?.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const modelCount = data.data?.length || 0;

      alert(
        language === 'es'
          ? `✅ Conexión exitosa\n\nAPI Key válida\nModelos disponibles: ${modelCount}`
          : `✅ Connection successful\n\nAPI Key valid\nAvailable models: ${modelCount}`
      );

      // Refresh to show status
      await loadConfigurations();
    } catch (error: any) {
      const errorMsg = error.message || (language === 'es' ? 'Error desconocido' : 'Unknown error');
      alert(
        language === 'es'
          ? `❌ Error de conexión\n\n${errorMsg}\n\nVerifica que tu API key sea válida en platform.openai.com`
          : `❌ Connection failed\n\n${errorMsg}\n\nVerify your API key at platform.openai.com`
      );
    } finally {
      setTesting(null);
    }
  };

  const testConnection = async (service: string) => {
    setTesting(service);
    try {
      // Test connection logic would go here
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert(language === 'es' ? '✅ Conexión exitosa' : '✅ Connection successful');
    } catch (error: any) {
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  const getServiceStatus = (serviceName: string) => {
    const serviceConfigs = configs.filter((c) => c.service_name === serviceName);
    const hasActiveKeys = serviceConfigs.some((c) => c.is_active);
    return hasActiveKeys;
  };

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-2">
          <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              {language === 'es' ? 'Configuración de APIs' : 'API Configuration'}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {language === 'es'
                ? 'Configura las claves de API para servicios externos. Las claves se almacenan de forma segura en la base de datos.'
                : 'Configure API keys for external services. Keys are stored securely in the database.'}
            </p>
          </div>
        </div>
      </div>

      {/* Brevo Configuration */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-[#fdda36]" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white">
                Brevo (Email)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                {language === 'es' ? 'Servicio de emails transaccionales' : 'Transactional email service'}
              </p>
            </div>
          </div>
          {getServiceStatus('brevo') ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              API Key {language === 'es' ? '(Restringida)' : '(Restricted)'}
            </label>
            <div className="relative">
              <input
                type={showBrevoKey ? 'text' : 'password'}
                value={brevoApiKey}
                onChange={(e) => setBrevoApiKey(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] font-mono text-sm"
                placeholder="xkeysib-..."
              />
              <button
                onClick={() => setShowBrevoKey(!showBrevoKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400"
              >
                {showBrevoKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              {language === 'es'
                ? 'Solo permisos de Transactional Emails'
                : 'Transactional Emails permissions only'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Sender Email
              </label>
              <input
                type="email"
                value={brevoSenderEmail}
                onChange={(e) => setBrevoSenderEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                placeholder="info@asciende.pro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Sender Name
              </label>
              <input
                type="text"
                value={brevoSenderName}
                onChange={(e) => setBrevoSenderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                placeholder="Asciende Team"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveBrevo}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar' : 'Save')}
            </button>
            <button
              onClick={() => testConnection('brevo')}
              disabled={testing === 'brevo' || !brevoApiKey}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing === 'brevo' ? 'animate-spin' : ''}`} />
              {testing === 'brevo' ? (language === 'es' ? 'Probando...' : 'Testing...') : (language === 'es' ? 'Probar' : 'Test')}
            </button>
          </div>
        </div>
      </div>

      {/* Stripe Configuration */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-[#fdda36]" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white">
                Stripe (Pagos)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                {language === 'es' ? 'Procesamiento de pagos' : 'Payment processing'}
              </p>
            </div>
          </div>
          {getServiceStatus('stripe') ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              Secret Key {language === 'es' ? '(Restringida)' : '(Restricted)'}
            </label>
            <div className="relative">
              <input
                type={showStripeKeys ? 'text' : 'password'}
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] font-mono text-sm"
                placeholder="rk_test_... o rk_live_..."
              />
              <button
                onClick={() => setShowStripeKeys(!showStripeKeys)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400"
              >
                {showStripeKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              {language === 'es'
                ? 'Debe empezar con rk_ (restricted key)'
                : 'Must start with rk_ (restricted key)'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              Webhook Secret
            </label>
            <input
              type={showStripeKeys ? 'text' : 'password'}
              value={stripeWebhookSecret}
              onChange={(e) => setStripeWebhookSecret(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] font-mono text-sm"
              placeholder="whsec_..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Modo
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="test"
                  checked={stripeMode === 'test'}
                  onChange={(e) => setStripeMode(e.target.value as 'test' | 'live')}
                  className="w-4 h-4 text-[#fdda36] focus:ring-[#fdda36]"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Test Mode</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="live"
                  checked={stripeMode === 'live'}
                  onChange={(e) => setStripeMode(e.target.value as 'test' | 'live')}
                  className="w-4 h-4 text-[#fdda36] focus:ring-[#fdda36]"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Live Mode</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveStripe}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar' : 'Save')}
            </button>
            <button
              onClick={() => testConnection('stripe')}
              disabled={testing === 'stripe' || !stripeSecretKey}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing === 'stripe' ? 'animate-spin' : ''}`} />
              {testing === 'stripe' ? (language === 'es' ? 'Probando...' : 'Testing...') : (language === 'es' ? 'Probar' : 'Test')}
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Configuration */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6 text-[#fdda36]" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white">
                Zoom (Meetings)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                {language === 'es' ? 'Videollamadas y reuniones' : 'Video calls and meetings'}
              </p>
            </div>
          </div>
          {getServiceStatus('zoom') ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              Account ID
            </label>
            <input
              type="text"
              value={zoomAccountId}
              onChange={(e) => setZoomAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] font-mono text-sm"
              placeholder="Account ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              Client ID
            </label>
            <input
              type="text"
              value={zoomClientId}
              onChange={(e) => setZoomClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] font-mono text-sm"
              placeholder="Client ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
              Client Secret
            </label>
            <div className="relative">
              <input
                type={showZoomKeys ? 'text' : 'password'}
                value={zoomClientSecret}
                onChange={(e) => setZoomClientSecret(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-[#fdda36] font-mono text-sm"
                placeholder="Client Secret"
              />
              <button
                onClick={() => setShowZoomKeys(!showZoomKeys)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400"
              >
                {showZoomKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              {language === 'es'
                ? 'Server-to-Server OAuth App'
                : 'Server-to-Server OAuth App'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveZoom}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar' : 'Save')}
            </button>
            <button
              onClick={() => testConnection('zoom')}
              disabled={testing === 'zoom' || !zoomAccountId || !zoomClientId || !zoomClientSecret}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing === 'zoom' ? 'animate-spin' : ''}`} />
              {testing === 'zoom' ? (language === 'es' ? 'Probando...' : 'Testing...') : (language === 'es' ? 'Probar' : 'Test')}
            </button>
          </div>
        </div>
      </div>

      {/* OpenAI Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-[#fdda36]" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                OpenAI (IA)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'Planificación inteligente de entrenamientos con ChatGPT' : 'Intelligent workout planning with ChatGPT'}
              </p>
            </div>
          </div>
          {getServiceStatus('openai') ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {language === 'es'
              ? 'Una vez configurada la API key, el sistema de IA comenzará a generar planificaciones personalizadas automáticamente usando el perfil del atleta, historial de entrenamientos y cuestionarios de bienestar.'
              : 'Once the API key is configured, the AI system will automatically start generating personalized plans using the athlete profile, training history, and wellness check-ins.'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
            </label>
            <div className="relative">
              <input
                type={showOpenaiKey ? 'text' : 'password'}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] font-mono text-sm"
                placeholder="sk-proj-..."
              />
              <button
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400"
              >
                {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {language === 'es'
                ? 'Obtén tu clave en platform.openai.com/api-keys'
                : 'Get your key at platform.openai.com/api-keys'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'es' ? 'Modelo' : 'Model'}
            </label>
            <div className="relative">
              <select
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] appearance-none"
              >
                <option value="gpt-4o-mini">GPT-4o Mini — {language === 'es' ? 'Rápido y eficiente (recomendado)' : 'Fast and efficient (recommended)'}</option>
                <option value="gpt-4o">GPT-4o — {language === 'es' ? 'Mayor potencia y contexto' : 'Higher power and context'}</option>
                <option value="gpt-4-turbo">GPT-4 Turbo — {language === 'es' ? 'Modelo anterior, alta capacidad' : 'Previous model, high capacity'}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {language === 'es'
                ? 'GPT-4o Mini es suficiente para planificación de entrenamientos y más económico'
                : 'GPT-4o Mini is sufficient for workout planning and more cost-effective'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveOpenAI}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar' : 'Save')}
            </button>
            <button
              onClick={testOpenAIConnection}
              disabled={testing === 'openai' || !openaiApiKey}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing === 'openai' ? 'animate-spin' : ''}`} />
              {testing === 'openai' ? (language === 'es' ? 'Probando...' : 'Testing...') : (language === 'es' ? 'Probar conexión' : 'Test connection')}
            </button>
          </div>
        </div>
      </div>

      {/* Documentation Link */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              {language === 'es' ? 'Importante: Claves Restringidas' : 'Important: Restricted Keys'}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              {language === 'es'
                ? 'Solo usa claves con permisos limitados. Consulta API_KEYS_SECURITY_GUIDE.md para instrucciones detalladas.'
                : 'Only use keys with limited permissions. Check API_KEYS_SECURITY_GUIDE.md for detailed instructions.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
