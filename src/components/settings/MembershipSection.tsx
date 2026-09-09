import { useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle, Crown, ExternalLink, Loader2, Shield, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useActiveMembership } from '../../hooks/useActiveMembership';
import { supabase } from '../../lib/supabase';

export default function MembershipSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { membership, loading, reload } = useActiveMembership(profile?.id);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const isEs = language === 'es';

  const navigate = (page: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  const openMembershipPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-membership-portal-session', {
        body: {},
      });
      if (error) throw error;
      if (!data || typeof data.url !== 'string' || !data.url.startsWith('https://')) {
        throw new Error(isEs ? 'No se pudo obtener el enlace de Stripe' : 'Could not get the Stripe portal URL');
      }
      window.location.assign(data.url);
    } catch (error: unknown) {
      setPortalError(error instanceof Error ? error.message : (isEs ? 'No se pudo abrir el portal' : 'Could not open the portal'));
    } finally {
      setPortalLoading(false);
    }
  };

  const getMembershipIcon = (slug?: string) => slug?.toLowerCase() === 'pro' ? Crown : slug?.toLowerCase() === 'inicia' ? Shield : Users;
  const getMembershipColor = (slug?: string) => slug?.toLowerCase() === 'pro'
    ? { bg: 'from-yellow-500 to-yellow-600', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' }
    : { bg: 'from-gray-500 to-gray-600', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' };
  const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString(isEs ? 'es-ES' : 'en-US') : '-';

  if (loading) {
    return <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" /><div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" /></div></div>;
  }

  const membershipName = membership?.membership
    ? (isEs ? membership.membership.name_es : membership.membership.name_en) || membership.membership.name
    : 'Asciende Inicia';
  const membershipSlug = membership?.membership?.slug || 'inicia';
  const MembershipIcon = getMembershipIcon(membershipSlug);
  const colors = getMembershipColor(membershipSlug);
  const isInicia = membershipSlug === 'inicia';
  const isPaid = membership?.source === 'stripe' && !isInicia;
  const isActive = membership?.status === 'active';
  const isCancellationScheduled = Boolean(membership?.cancel_at_period_end && isActive);

  return (
    <div className="space-y-6">
      <div className={`bg-gradient-to-br ${colors.bg} rounded-xl p-6 text-white shadow-lg`}>
        <div className="flex items-start justify-between mb-4 gap-4">
          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-3 py-1 ${colors.badge} rounded-full mb-3`}>
              <MembershipIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">{membershipName}</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">{isEs ? 'Tu Membresía Actual' : 'Your Current Membership'}</h2>
            <p className="text-white/80">
              {isInicia ? (isEs ? 'Plan gratuito' : 'Free plan') : (isEs ? 'Activa' : 'Active')}
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center"><MembershipIcon className="w-8 h-8" /></div>
        </div>

        {isCancellationScheduled && (
          <div className="mb-4 p-3 rounded-lg bg-black/20 border border-white/30 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-sm">
              {isEs
                ? `La cancelación está programada para el ${formatDate(membership?.current_period_end || membership?.end_date)}. Mantienes el acceso hasta esa fecha.`
                : `Cancellation is scheduled for ${formatDate(membership?.current_period_end || membership?.end_date)}. You keep access until then.`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-white/80 mb-1">{isEs ? 'Miembro desde' : 'Member since'}</p>
            <p className="text-lg font-bold">{formatDate(membership?.start_date || profile?.created_at)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-white/80 mb-1">{isEs ? 'Precio' : 'Price'}</p>
            <p className="text-lg font-bold">
              {isPaid ? (membership?.billing_cycle === 'annual' ? '€149.99/year' : '€14.99/month') : (isEs ? 'Gratis' : 'Free')}
            </p>
          </div>
        </div>

        {isPaid && (membership?.current_period_end || membership?.end_date) && (
          <div className="mt-4 bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1"><Calendar className="w-4 h-4" /><p className="text-sm text-white/80">{isEs ? 'Próxima renovación' : 'Next renewal'}</p></div>
            <p className="text-lg font-bold">{formatDate(membership.current_period_end || membership.end_date)}</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-3">
          {isPaid && isActive && (
            <>
              <button
                onClick={openMembershipPortal}
                disabled={portalLoading}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#514163] hover:bg-[#3d3050] text-white rounded-lg transition-colors group font-medium disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  {portalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
                  <span>{portalLoading ? (isEs ? 'Abriendo...' : 'Opening...') : (isEs ? 'Gestionar suscripción' : 'Manage subscription')}</span>
                </div>
                {!portalLoading && <ExternalLink className="w-5 h-5 opacity-70 group-hover:opacity-100" />}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isEs ? 'Actualiza pagos, consulta facturas o cancela desde el portal seguro de Stripe.' : 'Update payment details, view invoices, or cancel from the secure Stripe portal.'}</p>
              {portalError && <p className="text-sm text-red-600 dark:text-red-400">{portalError}</p>}
            </>
          )}

          {(isInicia || !isActive) && (
            <button onClick={() => navigate('/memberships')} className="w-full flex items-center justify-between px-4 py-3 bg-[#fdda36] hover:bg-[#ffd51a] text-[#514163] rounded-lg transition-colors group font-medium">
              <div className="flex items-center gap-3"><Crown className="w-5 h-5" /><span>{isEs ? 'Ver todos los planes' : 'View all plans'}</span></div>
              <ExternalLink className="w-5 h-5 opacity-70 group-hover:opacity-100" />
            </button>
          )}

          {isCancellationScheduled && (
            <button onClick={async () => { await openMembershipPortal(); await reload(); }} disabled={portalLoading} className="w-full text-sm text-[#514163] dark:text-[#fdda36] hover:underline disabled:opacity-50">
              {isEs ? 'Reactivar antes de la fecha de cancelación' : 'Reactivate before the cancellation date'}
            </button>
          )}
        </div>
      </div>

      {isActive && (
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/50 p-5 flex items-start gap-3">
          {isCancellationScheduled ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" /> : <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />}
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {isEs ? 'Los cambios realizados en Stripe se sincronizan automáticamente con tu perfil.' : 'Changes made in Stripe are synchronized automatically with your profile.'}
          </p>
        </div>
      )}
    </div>
  );
}
