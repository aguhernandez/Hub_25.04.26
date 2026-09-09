import { useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useActiveMembership } from '../../hooks/useActiveMembership';
import { supabase } from '../../lib/supabase';

export default function AthleteSubscriptionSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { membership, loading } = useActiveMembership(profile?.id);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const isEs = language === 'es';
  const isPaid = membership?.source === 'stripe' && membership.membership?.slug === 'pro';

  const openPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-membership-portal-session', { body: {} });
      if (error) throw error;
      if (!data || typeof data.url !== 'string' || !data.url.startsWith('https://')) {
        throw new Error(isEs ? 'No se pudo abrir el portal de Stripe' : 'Could not open the Stripe portal');
      }
      window.location.assign(data.url);
    } catch (error: unknown) {
      setPortalError(error instanceof Error ? error.message : (isEs ? 'No se pudo abrir el portal' : 'Could not open the portal'));
    } finally {
      setPortalLoading(false);
    }
  };

  const goToMemberships = () => window.dispatchEvent(new CustomEvent('navigate', { detail: '/memberships' }));
  const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString(isEs ? 'es-ES' : 'en-US') : '-';

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#fdda36]" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#fdda36]" />
              {isEs ? 'Suscripción' : 'Subscription'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isEs ? 'Gestiona tu membresía de atleta, pagos y facturación.' : 'Manage your athlete membership, payments, and billing.'}
            </p>
          </div>
          {isPaid ? <CheckCircle2 className="w-7 h-7 text-green-500" /> : <Shield className="w-7 h-7 text-gray-400" />}
        </div>
      </div>

      {isPaid ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isEs ? 'Membresía activa' : 'Active membership'}</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {isEs ? 'Asciende Pro' : 'Asciende Pro'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {membership?.billing_cycle === 'annual' ? '€149.99 / año' : '€14.99 / mes'}
                {(membership?.cancel_at_period_end && membership.current_period_end) && ` · ${isEs ? 'Activa hasta' : 'Active until'} ${formatDate(membership.current_period_end)}`}
              </p>
            </div>
            <button onClick={openPortal} disabled={portalLoading} className="flex items-center justify-center gap-2 px-5 py-3 bg-[#514163] hover:bg-[#3d3050] text-white rounded-lg font-semibold disabled:opacity-50">
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              {portalLoading ? (isEs ? 'Abriendo...' : 'Opening...') : (isEs ? 'Gestionar en Stripe' : 'Manage in Stripe')}
            </button>
          </div>
          {portalError && <p className="text-sm text-red-600 dark:text-red-400 mt-4">{portalError}</p>}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#514163] dark:text-[#fdda36] mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white">{isEs ? 'Tienes la membresía Inicia' : 'You are on the Inicia membership'}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isEs ? 'No existe todavía una suscripción de Stripe para gestionar. Activa Pro para habilitar pagos, facturas y cancelación desde Stripe.' : 'There is no Stripe subscription to manage yet. Activate Pro to enable payments, invoices, and cancellation through Stripe.'}
              </p>
              <button onClick={goToMemberships} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#fdda36] hover:bg-[#ffd51a] text-[#514163] rounded-lg font-semibold">
                <CreditCard className="w-4 h-4" />
                {isEs ? 'Ver planes y activar Pro' : 'View plans and activate Pro'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/50 p-5">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          {isEs ? 'Los cambios realizados en Stripe se sincronizan automáticamente con tu membresía.' : 'Changes made in Stripe are synchronized automatically with your membership.'}
        </p>
      </div>
    </div>
  );
}
