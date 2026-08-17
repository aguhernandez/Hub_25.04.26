import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { useActiveMembership } from '../hooks/useActiveMembership';
import Toast from '../components/Toast';
import { Package, Check, Loader2, CreditCard, Clock, Crown, AlertCircle } from 'lucide-react';

interface Membership {
  id: string;
  name: string;
  name_es?: string;
  name_en?: string;
  slug: string;
  description: string;
  description_es?: string;
  description_en?: string;
  long_description: string;
  long_description_es?: string;
  long_description_en?: string;
  image_url: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  features: string[];
  features_es?: string[];
  features_en?: string[];
  max_members: number;
  color?: string;
  display_order?: number;
  is_highlighted?: boolean;
  cta_text_es?: string;
  cta_text_en?: string;
}

interface MembershipAccess {
  id: string;
  membership_id: string;
  status: string;
  end_date: string;
}

export default function MembershipsMarketplacePage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { toast, hideToast, showToast } = useToast();
  const { membership: activeMembership, loading: loadingMembership } = useActiveMembership(profile?.id);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [myAccess, setMyAccess] = useState<MembershipAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadMemberships();
    if (profile?.id) {
      loadMyAccess();
    }
  }, [profile?.id]);

  const loadMemberships = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('is_published', true)
        .eq('is_active', true)
        .eq('is_open', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setMemberships(data || []);
    } catch (err) {
      console.error('Error loading memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyAccess = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('membership_access')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'active');

      if (error) throw error;
      setMyAccess(data || []);
    } catch (err) {
      console.error('Error loading access:', err);
    }
  };

  const hasActiveMembership = (membershipId: string) => {
    return myAccess.some(access => access.membership_id === membershipId);
  };

  const handleSubscribe = async () => {
    if (!selectedMembership || !profile) {
      showToast(language === 'es' ? 'Debes iniciar sesión' : 'You must be logged in', 'error');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-membership-checkout', {
        body: {
          membership_id: selectedMembership.id,
          billing_cycle: billingCycle,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Error creating checkout:', err);
      showToast(err.message || (language === 'es' ? 'Error al procesar' : 'Error processing'), 'error');
      setProcessing(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#fdda36]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toast toast={toast} onHide={hideToast} />

      <div className="bg-gradient-to-r from-[#514163] to-[#6b527a] text-white py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === 'es' ? 'Memberships Asciende' : 'Asciende Memberships'}
          </h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            {language === 'es'
              ? 'Accede a contenido exclusivo, entrenamientos y soporte personalizado'
              : 'Access exclusive content, training and personalized support'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Current Membership Banner */}
        {activeMembership && !loadingMembership && (
          <div className="mb-8 p-6 bg-gradient-to-r from-[#514163] to-[#6b527a] rounded-2xl shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#fdda36] rounded-full flex items-center justify-center">
                  <Crown className="w-8 h-8 text-[#514163]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white">
                      {language === 'es' ? 'Tu Membresía Actual' : 'Your Current Membership'}
                    </h3>
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                      {language === 'es' ? 'ACTIVA' : 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-xl text-[#fdda36] font-bold">
                    {(language === 'es'
                      ? activeMembership.membership.name_es
                      : activeMembership.membership.name_en) || activeMembership.membership.name}
                  </p>
                  <p className="text-sm text-gray-200">
                    {activeMembership.membership.price_monthly > 0 ? (
                      <>
                        ${activeMembership.membership.price_monthly}/{language === 'es' ? 'mes' : 'month'}
                      </>
                    ) : (
                      language === 'es' ? 'Plan Gratis' : 'Free Plan'
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-200 mb-1">
                  {language === 'es' ? 'Miembro desde' : 'Member since'}
                </p>
                <p className="text-white font-semibold">
                  {new Date(activeMembership.start_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {memberships.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'es'
                ? 'No hay memberships disponibles en este momento'
                : 'No memberships available at the moment'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {memberships.map((membership) => {
              const hasAccess = hasActiveMembership(membership.id);
              const isCurrentMembership = activeMembership?.membership_id === membership.id;
              const priceMonthly = formatPrice(membership.price_monthly, membership.currency);
              const priceYearly = formatPrice(membership.price_annual, membership.currency);
              const monthlyEquivalent = formatPrice(membership.price_annual / 12, membership.currency);

              // Get language-specific content
              const membershipName = language === 'es'
                ? (membership.name_es || membership.name)
                : (membership.name_en || membership.name);

              const membershipDesc = language === 'es'
                ? (membership.description_es || membership.description)
                : (membership.description_en || membership.description);

              const ctaText = language === 'es'
                ? (membership.cta_text_es || 'Subscribe')
                : (membership.cta_text_en || 'Subscribe');

              // Safely parse features with language support
              let features: string[] = [];
              try {
                const featuresSource = language === 'es'
                  ? (membership.features_es || membership.features)
                  : (membership.features_en || membership.features);

                features = Array.isArray(featuresSource)
                  ? featuresSource
                  : (typeof featuresSource === 'string' ? JSON.parse(featuresSource) : []);
              } catch (e) {
                features = [];
              }

              // Color mapping for brand colors
              const getColorClasses = (color?: string) => {
                switch (color) {
                  case 'gray':
                    return {
                      border: 'border-gray-300 dark:border-gray-600',
                      bg: 'bg-gray-50 dark:bg-gray-800',
                      hover: 'hover:border-gray-400',
                      button: 'bg-gray-600 hover:bg-gray-700 text-white'
                    };
                  case 'yellow':
                    return {
                      border: 'border-[#fdda36]',
                      bg: 'bg-yellow-50 dark:bg-yellow-900/10',
                      hover: 'hover:border-yellow-500',
                      button: 'bg-[#fdda36] hover:bg-yellow-500 text-gray-900'
                    };
                  case 'violet':
                    return {
                      border: 'border-violet-500',
                      bg: 'bg-violet-50 dark:bg-violet-900/10',
                      hover: 'hover:border-violet-600',
                      button: 'bg-[#514163] hover:bg-[#6b527a] text-white'
                    };
                  default:
                    return {
                      border: 'border-gray-200 dark:border-gray-700',
                      bg: 'bg-white dark:bg-gray-800',
                      hover: 'hover:border-[#fdda36]',
                      button: 'bg-[#514163] hover:bg-[#6b527a] text-white'
                    };
                }
              };

              const colorClasses = getColorClasses(membership.color);

              return (
                <div
                  key={membership.id}
                  className={`rounded-xl border-2 ${
                    hasAccess
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                      : `${colorClasses.border} ${colorClasses.bg} ${colorClasses.hover} hover:shadow-xl`
                  } ${membership.is_highlighted ? 'ring-4 ring-[#fdda36]/30 scale-105' : ''} transition-all duration-300 overflow-hidden flex flex-col`}
                >
                  {membership.image_url && (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={membership.image_url}
                        alt={membership.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {membership.is_highlighted && (
                        <div className="inline-block px-3 py-1 bg-[#fdda36] text-gray-900 text-xs font-bold rounded-full">
                          {language === 'es' ? 'MÁS POPULAR' : 'MOST POPULAR'}
                        </div>
                      )}
                      {isCurrentMembership && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                          <Crown className="w-3 h-3" />
                          {language === 'es' ? 'TU PLAN ACTUAL' : 'YOUR CURRENT PLAN'}
                        </div>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {membershipName}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 mb-4 flex-1">
                      {membershipDesc}
                    </p>

                    {features && features.length > 0 && (
                      <ul className="space-y-2 mb-6">
                        {features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-auto">
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          {priceMonthly}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          /{language === 'es' ? 'mes' : 'month'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {language === 'es' ? 'O' : 'Or'} {priceYearly}/{language === 'es' ? 'año' : 'year'}
                        {' '}({monthlyEquivalent}/{language === 'es' ? 'mes' : 'month'})
                      </p>

                      {hasAccess ? (
                        <div className="w-full py-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg text-center font-medium flex items-center justify-center gap-2">
                          <Check className="w-5 h-5" />
                          {language === 'es' ? 'Activa' : 'Active'}
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedMembership(membership)}
                          className={`w-full py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${colorClasses.button}`}
                        >
                          <CreditCard className="w-5 h-5" />
                          {ctaText}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'es' ? 'Selecciona tu plan' : 'Choose your plan'}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {language === 'es'
                ? (selectedMembership.name_es || selectedMembership.name)
                : (selectedMembership.name_en || selectedMembership.name)}
            </p>

            <div className="space-y-3 mb-6">
              <label
                className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  billingCycle === 'monthly'
                    ? 'border-[#fdda36] bg-[#fdda36]/10'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="billing"
                  value="monthly"
                  checked={billingCycle === 'monthly'}
                  onChange={() => setBillingCycle('monthly')}
                  className="mr-3"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {language === 'es' ? 'Mensual' : 'Monthly'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatPrice(selectedMembership.price_monthly, selectedMembership.currency)}/
                    {language === 'es' ? 'mes' : 'month'}
                  </p>
                </div>
              </label>

              <label
                className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  billingCycle === 'annual'
                    ? 'border-[#fdda36] bg-[#fdda36]/10'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="billing"
                  value="annual"
                  checked={billingCycle === 'annual'}
                  onChange={() => setBillingCycle('annual')}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {language === 'es' ? 'Anual' : 'Yearly'}
                    </p>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                      {language === 'es' ? 'Ahorra' : 'Save'} {Math.round((1 - (selectedMembership.price_annual / 12) / selectedMembership.price_monthly) * 100)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatPrice(selectedMembership.price_annual, selectedMembership.currency)}/
                    {language === 'es' ? 'año' : 'year'}
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedMembership(null)}
                disabled={processing}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSubscribe}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#fde66e] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {language === 'es' ? 'Procesando...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    {language === 'es' ? 'Continuar al pago' : 'Continue to payment'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
