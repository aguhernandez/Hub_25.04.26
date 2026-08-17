import { useState, useEffect } from 'react';
import { X, Check, Crown, Zap, Star, CreditCard, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { stripeApi } from '../lib/apiIntegrations';
import { useActiveMembership } from '../hooks/useActiveMembership';

interface Membership {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  features: string[];
}

interface MembershipUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan?: 'asciende' | 'pro';
  feature?: string;
}

export default function MembershipUpgradeModal({
  isOpen,
  onClose,
  requiredPlan,
  feature
}: MembershipUpgradeModalProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { membership: activeMembership, loading: loadingMembership } = useActiveMembership(profile?.id);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (isOpen) {
      loadMemberships();
    }
  }, [isOpen]);

  const loadMemberships = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('memberships')
      .select('*')
      .in('slug', ['intermediate', 'pro'])
      .order('price_monthly', { ascending: true });

    setMemberships(data || []);
    setLoading(false);
  };

  const handleUpgrade = async (membershipId: string) => {
    if (!profile?.id) return;

    setProcessingId(membershipId);
    try {
      const { data, error } = await stripeApi.createMembershipCheckout(
        membershipId,
        billingCycle
      );

      if (error) throw new Error(error);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert(language === 'es' ? 'Error al procesar el pago' : 'Error processing payment');
    } finally {
      setProcessingId(null);
    }
  };

  const getMembershipIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('pro')) return <Crown className="w-6 h-6" />;
    if (n.includes('intermediate')) return <Zap className="w-6 h-6" />;
    return <Star className="w-6 h-6" />;
  };

  const getMembershipColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('pro')) return 'from-yellow-500 to-yellow-600';
    if (n.includes('intermediate')) return 'from-[#514163] to-[#6d5581]';
    return 'from-gray-500 to-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                {language === 'es' ? 'Mejora tu Membresía' : 'Upgrade Your Membership'}
              </h2>
              {feature && (
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">
                  {language === 'es'
                    ? `Necesitas ${requiredPlan === 'pro' ? 'Asciende Pro' : 'Asciende Intermediate'} o superior para: ${feature}`
                    : `You need ${requiredPlan === 'pro' ? 'Asciende Pro' : 'Asciende Intermediate'} or higher for: ${feature}`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-[#fdda36] text-[#514163]'
                  : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300'
              }`}
            >
              {language === 'es' ? 'Mensual' : 'Monthly'}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-[#fdda36] text-[#514163]'
                  : 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-gray-300'
              }`}
            >
              {language === 'es' ? 'Anual' : 'Yearly'}
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                {language === 'es' ? 'Ahorra 20%' : 'Save 20%'}
              </span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Current Membership Alert */}
          {activeMembership && !loadingMembership && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-1">
                    {language === 'es' ? 'Tu Membresía Actual' : 'Your Current Membership'}
                  </h3>
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    <span className="font-semibold">
                      {(language === 'es'
                        ? activeMembership.membership.name_es
                        : activeMembership.membership.name_en) || activeMembership.membership.name}
                    </span>
                    {' - '}
                    {activeMembership.membership.price_monthly > 0 ? (
                      <>${activeMembership.membership.price_monthly}/{language === 'es' ? 'mes' : 'month'}</>
                    ) : (
                      language === 'es' ? 'Plan Gratis' : 'Free Plan'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                {language === 'es' ? 'Cargando planes...' : 'Loading plans...'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {memberships.map((membership) => {
                const price = billingCycle === 'monthly' ? membership.price_monthly : membership.price_annual;
                const monthlyPrice = billingCycle === 'yearly' ? (price / 12).toFixed(2) : price;
                const isRecommended = membership.name.toLowerCase().includes('intermediate');
                const isCurrentMembership = activeMembership?.membership_id === membership.id;

                return (
                  <div
                    key={membership.id}
                    className={`relative bg-white dark:bg-gray-700 rounded-xl border-2 p-6 ${
                      isCurrentMembership
                        ? 'border-green-500 shadow-lg'
                        : isRecommended
                        ? 'border-[#fdda36] shadow-lg'
                        : 'border-gray-200 dark:border-gray-700 dark:border-gray-600'
                    }`}
                  >
                    {isCurrentMembership && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-green-500 text-white text-sm font-bold px-4 py-1 rounded-full flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          {language === 'es' ? 'Plan Actual' : 'Current Plan'}
                        </span>
                      </div>
                    )}
                    {!isCurrentMembership && isRecommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-[#fdda36] text-[#514163] text-sm font-bold px-4 py-1 rounded-full">
                          {language === 'es' ? 'Recomendado' : 'Recommended'}
                        </span>
                      </div>
                    )}

                    <div className={`w-14 h-14 bg-gradient-to-br ${getMembershipColor(membership.name)} rounded-xl flex items-center justify-center text-white mb-4`}>
                      {getMembershipIcon(membership.name)}
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
                      {membership.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4 text-sm">
                      {membership.description}
                    </p>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white dark:text-white">
                          ${monthlyPrice}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                          /{language === 'es' ? 'mes' : 'month'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">
                          ${price} {language === 'es' ? 'facturado anualmente' : 'billed annually'}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-6">
                      {membership.features
                        .filter((feature) => typeof feature === 'string')
                        .map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">{feature}</span>
                          </li>
                        ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(membership.id)}
                      disabled={processingId === membership.id || isCurrentMembership}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${
                        isCurrentMembership
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                          : isRecommended
                          ? 'bg-[#fdda36] text-[#514163] hover:bg-[#ffd51a]'
                          : 'bg-gray-900 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-9000'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isCurrentMembership ? (
                        <>
                          <Check className="w-5 h-5" />
                          {language === 'es' ? 'Plan Activo' : 'Active Plan'}
                        </>
                      ) : processingId === membership.id ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {language === 'es' ? 'Procesando...' : 'Processing...'}
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          {language === 'es' ? 'Seleccionar' : 'Select Plan'}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 text-center">
              {language === 'es'
                ? '✓ Pago seguro con Stripe • Cancela en cualquier momento • Soporte 24/7'
                : '✓ Secure payment with Stripe • Cancel anytime • 24/7 Support'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
