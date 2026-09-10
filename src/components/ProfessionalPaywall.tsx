import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { CreditCard, AlertCircle, Loader2, LogOut } from 'lucide-react';

const STRIPE_LINKS: Record<'monthly' | 'yearly', string> = {
  monthly: 'https://buy.stripe.com/4gM14n1klgUoac55SG9R60d',
  yearly: 'https://buy.stripe.com/fZu6oHe77cE8fwpgxk9R60e',
};

interface SubscriptionState {
  status: string | null;
  trialEnd: string | null;
  loading: boolean;
}

export default function ProfessionalPaywall() {
  const { profile, user } = useAuth();
  const { language } = useLanguage();
  const [subState, setSubState] = useState<SubscriptionState>({
    status: null,
    trialEnd: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) return;
    if (profile?.role !== 'trainer' && profile?.role !== 'nutritionist') {
      setSubState({ status: 'active', trialEnd: null, loading: false });
      return;
    }

    let mounted = true;

    (async () => {
      // Check both paid subscription and complimentary access in one call
      const { data: accessData } = await supabase.rpc('get_my_paid_access_status').maybeSingle();

      if (!mounted) return;

      if (accessData?.is_access_active) {
        setSubState({ status: 'active', trialEnd: null, loading: false });
        return;
      }

      // Fallback: check professional_subscriptions directly for trial state
      const { data, error } = await supabase
        .from('professional_subscriptions')
        .select('status, trial_end')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (error || !data) {
        setSubState({ status: null, trialEnd: null, loading: false });
        return;
      }

      const now = new Date();
      const trialEnded = data.trial_end ? new Date(data.trial_end) < now : false;
      const isActive = data.status === 'active' || data.status === 'trialing';
      const blocked = !isActive || (data.status === 'trialing' && trialEnded);

      setSubState({
        status: blocked ? 'blocked' : data.status,
        trialEnd: data.trial_end,
        loading: false,
      });
    })();

    return () => { mounted = false; };
  }, [user, profile]);

  if (!user || subState.loading) {
    return (
      <div className="fixed inset-0 bg-[#070A0F] flex items-center justify-center z-[9999]">
        <Loader2 className="w-8 h-8 text-[#fdda36] animate-spin" />
      </div>
    );
  }

  const isProfessional = profile?.role === 'trainer' || profile?.role === 'nutritionist';
  if (!isProfessional) return null;
  if (subState.status === 'active' || subState.status === 'trialing') return null;

  const trialEndDate = subState.trialEnd ? new Date(subState.trialEnd) : null;
  const trialExpired = trialEndDate ? trialEndDate < new Date() : true;

  const handlePay = (cycle: 'monthly' | 'yearly') => {
    if (!user) return;
    const link = STRIPE_LINKS[cycle];
    window.location.href = `${link}?client_reference_id=${user.id}`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto" style={{ background: 'rgba(7, 10, 15, 0.95)' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(253,218,54,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(253,218,54,0.03) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
      <div className="relative z-10 w-full max-w-md mx-auto px-6 py-8">
        <div className="rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', border: '1px solid rgba(253,218,54,0.2)' }}>
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(253,218,54,0.12)', border: '1px solid rgba(253,218,54,0.3)' }}>
            {trialExpired ? <AlertCircle className="w-8 h-8 text-[#fdda36]" /> : <CreditCard className="w-8 h-8 text-[#fdda36]" />}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {trialExpired
              ? (language === 'es' ? 'Tu prueba ha terminado' : 'Your trial has ended')
              : (language === 'es' ? 'Activa tu suscripción' : 'Activate your subscription')}
          </h2>

          <p className="text-sm text-white/50 mb-6 max-w-xs mx-auto">
            {trialExpired
              ? (language === 'es'
                ? 'Tu periodo de prueba de 7 días ha terminado. Para continuar usando la plataforma, necesitas activar tu suscripción.'
                : 'Your 7-day free trial has ended. To continue using the platform, you need to activate your subscription.')
              : (language === 'es'
                ? 'Necesitas completar el pago para activar tu cuenta profesional y acceder a la plataforma.'
                : 'You need to complete payment to activate your professional account and access the platform.')}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => handlePay('monthly')}
              className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(253,218,54,0.08)', border: '1px solid rgba(253,218,54,0.3)' }}
            >
              <span className="text-xs font-bold text-[#fdda36] uppercase block mb-1">
                {language === 'es' ? 'Mensual' : 'Monthly'}
              </span>
              <span className="text-lg font-bold text-white">49€</span>
              <span className="text-xs text-white/40">/{language === 'es' ? 'mes' : 'mo'}</span>
            </button>
            <button
              onClick={() => handlePay('yearly')}
              className="rounded-xl p-4 text-left transition-all hover:scale-[1.02] relative"
              style={{ background: 'rgba(253,218,54,0.08)', border: '1px solid rgba(253,218,54,0.3)' }}
            >
              <span className="text-xs font-bold text-[#fdda36] uppercase block mb-1">
                {language === 'es' ? 'Anual' : 'Yearly'}
              </span>
              <span className="text-lg font-bold text-white">490€</span>
              <span className="text-xs text-white/40">/{language === 'es' ? 'año' : 'yr'}</span>
              <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
                {language === 'es' ? '-17%' : '-17%'}
              </span>
            </button>
          </div>

          <p className="text-xs text-white/30 mb-4">
            {language === 'es'
              ? 'Serás redirigido a Stripe para completar el pago de forma segura.'
              : 'You will be redirected to Stripe to complete payment securely.'}
          </p>

          <button
            onClick={handleLogout}
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            {language === 'es' ? 'Cerrar sesión' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}
