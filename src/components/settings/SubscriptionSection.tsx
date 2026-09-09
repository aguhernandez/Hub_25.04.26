import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  CreditCard,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface ProSubscription {
  status: string;
  billing_cycle: string;
  trial_end: string | null;
  current_period_end: string | null;
  max_athletes: number;
  stripe_customer_id: string | null;
  cancel_at_period_end: boolean;
}

export default function SubscriptionSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [subscription, setSubscription] = useState<ProSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const isEs = language === 'es';

  const loadSubscription = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professional_subscriptions')
        .select('status, billing_cycle, trial_end, current_period_end, max_athletes, stripe_customer_id, cancel_at_period_end')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      setSubscription(data as ProSubscription | null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Re-fetch when returning from Stripe portal (URL hash or query param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal_return') === 'true') {
      loadSubscription();
    }
  }, [loadSubscription]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'trialing':
        return {
          icon: Clock,
          color: '#4ade80',
          bg: 'rgba(74,222,128,0.1)',
          border: 'rgba(74,222,128,0.3)',
          label: isEs ? 'Prueba gratuita' : 'Free trial',
        };
      case 'active':
        return {
          icon: CheckCircle2,
          color: '#4ade80',
          bg: 'rgba(74,222,128,0.1)',
          border: 'rgba(74,222,128,0.3)',
          label: isEs ? 'Activa' : 'Active',
        };
      case 'past_due':
        return {
          icon: AlertCircle,
          color: '#fbbf24',
          bg: 'rgba(251,191,36,0.1)',
          border: 'rgba(251,191,36,0.3)',
          label: isEs ? 'Pago pendiente' : 'Past due',
        };
      case 'canceled':
        return {
          icon: XCircle,
          color: '#f87171',
          bg: 'rgba(248,113,113,0.1)',
          border: 'rgba(248,113,113,0.3)',
          label: isEs ? 'Cancelada' : 'Canceled',
        };
      case 'unpaid':
        return {
          icon: AlertCircle,
          color: '#f87171',
          bg: 'rgba(248,113,113,0.1)',
          border: 'rgba(248,113,113,0.3)',
          label: isEs ? 'Impagada' : 'Unpaid',
        };
      default:
        return {
          icon: AlertCircle,
          color: '#9ca3af',
          bg: 'rgba(156,163,175,0.1)',
          border: 'rgba(156,163,175,0.3)',
          label: isEs ? 'Incompleta' : 'Incomplete',
        };
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      if (!accessToken) throw new Error(isEs ? 'No hay sesión activa' : 'No active session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to open billing portal');

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(isEs ? 'No se pudo obtener el enlace del portal' : 'Could not get portal URL');
      }
    } catch (err: any) {
      setPortalError(err.message || (isEs ? 'Error al abrir el portal' : 'Error opening portal'));
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#fdda36]" />
      </div>
    );
  }

  const hasSubscription = subscription && subscription.status !== 'incomplete';
  const statusInfo = hasSubscription ? getStatusInfo(subscription.status) : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-[#fdda36]" />
          {isEs ? 'Suscripción' : 'Subscription'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isEs
            ? 'Gestiona tu suscripción profesional, método de pago y facturación.'
            : 'Manage your professional subscription, payment method, and billing.'}
        </p>
      </div>

      {/* Subscription status card */}
      {hasSubscription && statusInfo && StatusIcon ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {isEs ? 'Estado de la suscripción' : 'Subscription status'}
              </h3>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.border}` }}
              >
                <StatusIcon className="w-4 h-4" />
                {statusInfo.label}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEs ? 'Plan' : 'Plan'}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {subscription.billing_cycle === 'monthly'
                  ? (isEs ? 'Mensual — 49€/mes' : 'Monthly — 49€/mo')
                  : (isEs ? 'Anual — 490€/año' : 'Yearly — 490€/yr')}
              </p>
            </div>
          </div>

          {/* Cancellation scheduled banner */}
          {subscription.cancel_at_period_end && subscription.status !== 'canceled' && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {isEs
                  ? `Tu suscripción está cancelada pero seguirás teniendo acceso hasta el ${formatDate(subscription.current_period_end)}. Puedes reactivarla desde el portal de Stripe.`
                  : `Your subscription is scheduled to cancel but you'll keep access until ${formatDate(subscription.current_period_end)}. You can reactivate it from the Stripe portal.`}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Trial end */}
            {subscription.trial_end && (
              <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#4ade80]" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {isEs ? 'Prueba gratuita' : 'Free trial'}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {isEs ? 'Termina el' : 'Ends on'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(subscription.trial_end)}
                </p>
              </div>
            )}

            {/* Current period end */}
            {subscription.current_period_end && (
              <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-[#fdda36]" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {isEs ? 'Próximo cobro' : 'Next billing'}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatDate(subscription.current_period_end)}
                </p>
              </div>
            )}

            {/* Max athletes */}
            <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#fdda36]" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {isEs ? 'Atletas máx.' : 'Max athletes'}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {subscription.max_athletes}
              </p>
            </div>
          </div>

          {/* Manage subscription button */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {isEs ? 'Gestionar suscripción' : 'Manage subscription'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isEs
                    ? 'Actualiza tu método de pago, cambia de plan o cancela tu suscripción a través del portal seguro de Stripe.'
                    : 'Update your payment method, change plans, or cancel your subscription through the secure Stripe portal.'}
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#514163] text-white rounded-lg font-semibold text-sm hover:bg-[#3d3050] transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                {portalLoading
                  ? (isEs ? 'Abriendo...' : 'Opening...')
                  : (isEs ? 'Gestionar suscripción' : 'Manage subscription')}
              </button>
            </div>
            {portalError && (
              <p className="text-xs text-red-500 mt-2">{portalError}</p>
            )}
          </div>
        </div>
      ) : (
        /* No subscription */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-gray-700">
              <CreditCard className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {isEs ? 'Sin suscripción activa' : 'No active subscription'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {isEs
                ? 'Si eres un profesional (entrenador o nutricionista), tu suscripción aparecerá aquí una vez activada.'
                : 'If you are a professional (trainer or nutritionist), your subscription will appear here once activated.'}
            </p>
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/50 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {isEs
                ? 'El portal de Stripe te permite gestionar tu suscripción de forma segura.'
                : 'The Stripe portal lets you manage your subscription securely.'}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {isEs
                ? 'Puedes cambiar tu método de pago, ver facturas, cambiar entre mensual y anual, o cancelar cuando quieras. Los cambios se reflejan automáticamente en tu cuenta.'
                : 'You can change your payment method, view invoices, switch between monthly and annual, or cancel anytime. Changes are reflected automatically in your account.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
