import { Crown, Lock, Check, TrendingUp, Zap, Users, Star, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PremiumPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  articleTitle?: string;
  requiredTier?: 'inicia' | 'asciende' | 'intermediate' | 'pro';
}

interface MembershipOption {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  features: string[];
  recommended?: boolean;
}

export default function PremiumPaywall({ isOpen, onClose, onUpgrade, articleTitle, requiredTier = 'intermediate' }: PremiumPaywallProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [memberships, setMemberships] = useState<MembershipOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMembership, setSelectedMembership] = useState<MembershipOption | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [processing, setProcessing] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMemberships();
    }
  }, [isOpen, language]);

  const loadMemberships = async () => {
    try {
      let slugFilter: string[] = [];

      if (requiredTier === 'pro') {
        slugFilter = ['pro', 'pro-elite'];
      } else {
        slugFilter = ['intermediate', 'asciende', 'pro', 'pro-elite'];
      }

      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .in('slug', slugFilter)
        .eq('is_active', true)
        .eq('is_published', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;

      const options: MembershipOption[] = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        price_monthly: parseFloat(m.price_monthly),
        price_annual: parseFloat(m.price_annual),
        currency: m.currency || 'USD',
        features: language === 'es'
          ? (m.features_es || m.features || [])
          : (m.features_en || m.features || []),
        recommended: requiredTier === 'pro'
          ? (m.slug === 'pro' || m.slug === 'pro-elite')
          : (m.slug === 'intermediate' || m.slug === 'asciende')
      }));

      setMemberships(options);
    } catch (error) {
      console.error('Error loading memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedMembership || !profile) {
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
      setProcessing(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  if (!isOpen) return null;

  const features = [
    {
      icon: TrendingUp,
      title: language === 'es' ? 'Contenido Exclusivo' : 'Exclusive Content',
      description: language === 'es'
        ? 'Acceso a artículos científicos y análisis profundos'
        : 'Access to scientific articles and in-depth analysis'
    },
    {
      icon: Zap,
      title: language === 'es' ? 'Actualizaciones Semanales' : 'Weekly Updates',
      description: language === 'es'
        ? 'Nuevo contenido cada semana sobre tu deporte'
        : 'New content every week about your sport'
    },
    {
      icon: Users,
      title: language === 'es' ? 'Comunidad Premium' : 'Premium Community',
      description: language === 'es'
        ? 'Únete a atletas élite y entrenadores profesionales'
        : 'Join elite athletes and professional coaches'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#514163] to-[#6d5581] p-8 text-white rounded-t-2xl">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-white dark:bg-gray-800/20 rounded-full">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center mb-2">
            {language === 'es' ? 'Contenido Premium' : 'Premium Content'}
          </h2>
          {articleTitle && (
            <p className="text-center text-white/90 text-sm">
              {language === 'es' ? 'Desbloquea' : 'Unlock'}: <span className="font-semibold">{articleTitle}</span>
            </p>
          )}
          <p className="text-center text-white/80 text-sm mt-2">
            {requiredTier === 'pro' ? (
              language === 'es'
                ? 'Requiere Asciende Pro'
                : 'Requires Asciende Pro membership'
            ) : (
              language === 'es'
                ? 'Requiere Asciende Intermediate o superior'
                : 'Requires Asciende Intermediate or higher membership'
            )}
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 text-lg">
              {language === 'es'
                ? `Actualiza tu membresía para acceder a este contenido ${requiredTier === 'pro' ? 'exclusivo Pro' : 'premium'}`
                : `Upgrade your membership to access this ${requiredTier === 'pro' ? 'exclusive Pro' : 'premium'} content`}
            </p>
          </div>

          {/* Membership Options */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#514163] mx-auto"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {memberships.map((membership) => (
                <div
                  key={membership.id}
                  className={`relative border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                    membership.recommended
                      ? 'border-[#514163] bg-gradient-to-br from-[#514163]/5 to-[#6d5581]/5'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {membership.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-[#514163] to-[#6d5581] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {language === 'es' ? 'RECOMENDADO' : 'RECOMMENDED'}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {membership.name}
                    </h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-[#514163] dark:text-[#fdda36]">
                        ${membership.price_monthly.toFixed(2)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        /{language === 'es' ? 'mes' : 'mo'}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {membership.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => {
                      setSelectedMembership(membership);
                      setShowBillingModal(true);
                    }}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      membership.recommended
                        ? 'bg-gradient-to-r from-[#514163] to-[#6d5581] text-white hover:shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {language === 'es' ? 'Seleccionar' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {language === 'es' ? 'Tal vez después' : 'Maybe later'}
          </button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            {language === 'es'
              ? 'Cancela en cualquier momento. Soporte disponible 24/7.'
              : 'Cancel anytime. 24/7 support available.'}
          </p>
        </div>
      </div>

      {/* Billing Cycle Modal */}
      {showBillingModal && selectedMembership && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'es' ? 'Selecciona tu plan' : 'Choose your plan'}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {selectedMembership.name}
            </p>

            <div className="space-y-3 mb-6">
              <label
                className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  billingCycle === 'monthly'
                    ? 'border-[#514163] bg-[#514163]/10'
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
                    ? 'border-[#514163] bg-[#514163]/10'
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
                onClick={() => {
                  setShowBillingModal(false);
                  setSelectedMembership(null);
                }}
                disabled={processing}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSubscribe}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#514163] to-[#6d5581] text-white rounded-lg hover:shadow-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {language === 'es' ? 'Procesando...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    {language === 'es' ? 'Continuar al pago' : 'Continue to payment'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
