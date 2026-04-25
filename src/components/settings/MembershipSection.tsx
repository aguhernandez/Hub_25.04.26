import { useState } from 'react';
import { Crown, Award, Shield, Users, Calendar, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useActiveMembership } from '../../hooks/useActiveMembership';
import { supabase } from '../../lib/supabase';

export default function MembershipSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { membership, loading } = useActiveMembership(profile?.id);

  const navigate = (page: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  const getMembershipIcon = (slug?: string) => {
    switch (slug?.toLowerCase()) {
      case 'pro':
      case 'pro-elite':
        return Crown;
      case 'intermediate':
      case 'asciende':
        return Award;
      case 'start':
      case 'inicia':
        return Shield;
      default:
        return Users;
    }
  };

  const getMembershipColor = (slug?: string) => {
    switch (slug?.toLowerCase()) {
      case 'pro':
      case 'pro-elite':
        return {
          bg: 'from-yellow-500 to-yellow-600',
          badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
          text: 'text-yellow-600'
        };
      case 'intermediate':
      case 'asciende':
        return {
          bg: 'from-[#514163] to-[#6d5581]',
          badge: 'bg-[#514163]/10 text-[#514163] dark:bg-[#514163]/30 dark:text-[#fdda36]',
          text: 'text-[#514163]'
        };
      case 'start':
      case 'inicia':
        return {
          bg: 'from-gray-500 to-gray-600',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          text: 'text-gray-600'
        };
      default:
        return {
          bg: 'from-gray-500 to-gray-600',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          text: 'text-gray-600'
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const membershipName = membership?.membership
    ? (language === 'es' ? membership.membership.name_es : membership.membership.name_en) || membership.membership.name
    : language === 'es' ? 'Sin Membresía' : 'No Membership';

  const membershipSlug = membership?.membership?.slug || 'none';
  const MembershipIcon = getMembershipIcon(membershipSlug);
  const colors = getMembershipColor(membershipSlug);

  return (
    <div className="space-y-6">
      {/* Current Membership Card */}
      <div className={`bg-gradient-to-br ${colors.bg} rounded-xl p-6 text-white shadow-lg`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-3 py-1 ${colors.badge} rounded-full mb-3`}>
              <MembershipIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {membershipName}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {language === 'es' ? 'Tu Membresía Actual' : 'Your Current Membership'}
            </h2>
            <p className="text-white/80">
              {membership?.status === 'active'
                ? language === 'es' ? '✅ Activa' : '✅ Active'
                : language === 'es' ? '⏸ Inactiva' : '⏸ Inactive'}
            </p>
          </div>
          <div className={`w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center`}>
            <MembershipIcon className="w-8 h-8" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-white/80 mb-1">
              {language === 'es' ? 'Miembro desde' : 'Member since'}
            </p>
            <p className="text-lg font-bold">
              {membership?.start_date
                ? new Date(membership.start_date).toLocaleDateString()
                : profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : '-'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-white/80 mb-1">
              {language === 'es' ? 'Precio Mensual' : 'Monthly Price'}
            </p>
            <p className="text-lg font-bold">
              {membership?.membership
                ? `$${membership.membership.price_monthly}`
                : language === 'es' ? 'Gratis' : 'Free'}
            </p>
          </div>
        </div>

        {membership?.end_date && (
          <div className="mt-4 bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-white/80 mb-1">
              {language === 'es' ? 'Fecha de renovación' : 'Renewal date'}
            </p>
            <p className="text-lg font-bold">
              {new Date(membership.end_date).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-3">
          {/* View all plans button */}
          {(!membership || membership.membership.slug === 'start' || membership.status !== 'active') && (
            <button
              onClick={() => navigate('/memberships')}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#fdda36] hover:bg-[#ffd51a] text-[#514163] rounded-lg transition-colors group font-medium"
            >
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5" />
                <span className="font-medium">
                  {language === 'es' ? 'Ver todos los planes' : 'View all plans'}
                </span>
              </div>
              <ExternalLink className="w-5 h-5 opacity-70 group-hover:opacity-100" />
            </button>
          )}

          {/* Cancel membership button */}
          {membership?.status === 'active' && membership.source === 'stripe' && (
            <button
              onClick={async () => {
                if (confirm(language === 'es'
                  ? '¿Estás seguro de que quieres cancelar tu membresía? Se desactivará al final del periodo de facturación actual.'
                  : 'Are you sure you want to cancel your membership? It will be deactivated at the end of the current billing period.')) {
                  try {
                    const { error } = await supabase
                      .from('membership_access')
                      .update({ status: 'canceled' })
                      .eq('id', membership.id);

                    if (error) throw error;

                    alert(language === 'es'
                      ? 'Membresía cancelada. Seguirás teniendo acceso hasta el final del periodo.'
                      : 'Membership canceled. You will still have access until the end of the period.');

                    window.location.reload();
                  } catch (err: any) {
                    console.error('Error canceling membership:', err);
                    alert(language === 'es' ? `Error: ${err.message}` : `Error: ${err.message}`);
                  }
                }
              }}
              className="w-full flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">
                  {language === 'es' ? 'Cancelar membresía' : 'Cancel membership'}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
