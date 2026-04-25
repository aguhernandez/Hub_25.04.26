import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Cpu,
  Loader,
  TrendingUp,
  Zap
} from 'lucide-react';

interface AIMetric {
  date: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_processing_time_ms: number;
  avg_confidence: number;
  phase_active: string;
}

export default function AIMonitoringSection() {
  const { language } = useLanguage();
  const [metrics, setMetrics] = useState<AIMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayMetric, setTodayMetric] = useState<AIMetric | null>(null);

  useEffect(() => {
    loadMetrics();
    // Refresh every 5 minutes
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_usage_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;

      setMetrics(data || []);

      // Get today's metric
      const today = new Date().toISOString().split('T')[0];
      const todayData = data?.find(m => m.date === today);
      setTodayMetric(todayData || null);
    } catch (error: any) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return metrics.reduce((acc, metric) => ({
      total: acc.total + metric.total_requests,
      successful: acc.successful + metric.successful_requests,
      failed: acc.failed + metric.failed_requests
    }), { total: 0, successful: 0, failed: 0 });
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'huggingface':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'selfhosted':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'ondevice':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-400';
    }
  };

  const getAlertLevel = (requests: number) => {
    if (requests >= 950) return { level: 'critical', color: 'red', icon: AlertTriangle };
    if (requests >= 700) return { level: 'warning', color: 'orange', icon: AlertTriangle };
    return { level: 'ok', color: 'green', icon: CheckCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const totals = calculateTotals();
  const successRate = totals.total > 0 ? (totals.successful / totals.total) * 100 : 0;
  const alert = todayMetric ? getAlertLevel(todayMetric.total_requests) : null;
  const AlertIcon = alert?.icon || CheckCircle;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Cpu className="w-8 h-8" />
              {language === 'es' ? 'Monitoreo de IA' : 'AI Monitoring'}
            </h2>
            <p className="text-purple-100 text-sm mt-1">
              {language === 'es'
                ? 'Sistema de análisis de fotos con Hugging Face'
                : 'Photo analysis system with Hugging Face'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{todayMetric?.total_requests || 0}</div>
            <div className="text-sm text-purple-100">
              {language === 'es' ? 'Hoy' : 'Today'}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {todayMetric && alert && alert.level !== 'ok' && (
        <div className={`bg-${alert.color}-50 dark:bg-${alert.color}-900/20 border border-${alert.color}-200 dark:border-${alert.color}-800 rounded-xl p-4`}>
          <div className="flex gap-3">
            <AlertIcon className={`w-6 h-6 text-${alert.color}-600 dark:text-${alert.color}-400 flex-shrink-0`} />
            <div>
              <p className={`text-sm font-semibold text-${alert.color}-800 dark:text-${alert.color}-200`}>
                {alert.level === 'critical'
                  ? (language === 'es' ? '🚨 ALERTA CRÍTICA' : '🚨 CRITICAL ALERT')
                  : (language === 'es' ? '⚠️ ADVERTENCIA' : '⚠️ WARNING')}
              </p>
              <p className={`text-xs text-${alert.color}-700 dark:text-${alert.color}-300 mt-1`}>
                {alert.level === 'critical'
                  ? (language === 'es'
                    ? `${todayMetric.total_requests}/1000 requests alcanzados. Considera migrar a Fase 2 (servidor propio).`
                    : `${todayMetric.total_requests}/1000 requests reached. Consider migrating to Phase 2 (self-hosted).`)
                  : (language === 'es'
                    ? `${todayMetric.total_requests}/1000 requests. Prepara la migración a Fase 2.`
                    : `${todayMetric.total_requests}/1000 requests. Prepare Phase 2 migration.`)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Stats */}
      {todayMetric && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                {language === 'es' ? 'Total Hoy' : 'Total Today'}
              </span>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              {todayMetric.total_requests}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              {language === 'es' ? 'requests' : 'requests'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                {language === 'es' ? 'Tasa Éxito' : 'Success Rate'}
              </span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              {todayMetric.total_requests > 0
                ? Math.round((todayMetric.successful_requests / todayMetric.total_requests) * 100)
                : 0}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              {todayMetric.successful_requests}/{todayMetric.total_requests}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                {language === 'es' ? 'Tiempo Avg' : 'Avg Time'}
              </span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              {Math.round(todayMetric.avg_processing_time_ms / 1000)}s
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              {Math.round(todayMetric.avg_processing_time_ms)}ms
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                {language === 'es' ? 'Confianza' : 'Confidence'}
              </span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              {Math.round(todayMetric.avg_confidence * 100)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              {language === 'es' ? 'promedio' : 'average'}
            </div>
          </div>
        </div>
      )}

      {/* Phase Information */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            {language === 'es' ? 'Fase Activa' : 'Active Phase'}
          </h3>
          <span className={`px-4 py-2 rounded-full text-sm font-bold ${getPhaseColor(todayMetric?.phase_active || 'huggingface')}`}>
            {todayMetric?.phase_active === 'huggingface' && 'Fase 1: Hugging Face'}
            {todayMetric?.phase_active === 'selfhosted' && 'Fase 2: Self-Hosted'}
            {todayMetric?.phase_active === 'ondevice' && 'Fase 3: On-Device'}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 ${todayMetric?.phase_active === 'huggingface' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                {language === 'es' ? '📡 Fase 1: Hugging Face (Actual)' : '📡 Phase 1: Hugging Face (Current)'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
                {language === 'es'
                  ? 'API gratuita on-demand. Límite: ~1000 requests/día. Costo: $0'
                  : 'Free on-demand API. Limit: ~1000 requests/day. Cost: $0'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 ${todayMetric?.phase_active === 'selfhosted' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                {language === 'es' ? '🖥️ Fase 2: Servidor Propio' : '🖥️ Phase 2: Self-Hosted'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
                {language === 'es'
                  ? 'GPU dedicada (Hetzner €30/mes). Ilimitado. Activar cuando > 1000/día'
                  : 'Dedicated GPU (Hetzner €30/mo). Unlimited. Activate when > 1000/day'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 ${todayMetric?.phase_active === 'ondevice' ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">
                {language === 'es' ? '📱 Fase 3: On-Device (Futuro)' : '📱 Phase 3: On-Device (Future)'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
                {language === 'es'
                  ? 'Procesamiento local con TensorFlow.js. Zero latency, zero cost'
                  : 'Local processing with TensorFlow.js. Zero latency, zero cost'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Stats */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-green-600" />
          {language === 'es' ? 'Estadísticas Totales (30 días)' : 'Total Stats (30 days)'}
        </h3>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              {totals.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
              {language === 'es' ? 'Total Requests' : 'Total Requests'}
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold text-green-600">
              {successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
              {language === 'es' ? 'Tasa Éxito Global' : 'Global Success Rate'}
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">
              $0
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
              {language === 'es' ? 'Costo Total' : 'Total Cost'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {metrics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white mb-4">
            {language === 'es' ? '📊 Últimos 7 Días' : '📊 Last 7 Days'}
          </h3>
          <div className="space-y-2">
            {metrics.slice(0, 7).map((metric) => (
              <div
                key={metric.date}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                    {new Date(metric.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getPhaseColor(metric.phase_active)}`}>
                    {metric.phase_active}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    {metric.total_requests} req
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {metric.total_requests > 0
                      ? Math.round((metric.successful_requests / metric.total_requests) * 100)
                      : 0}% ✓
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    {Math.round(metric.avg_processing_time_ms / 1000)}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
