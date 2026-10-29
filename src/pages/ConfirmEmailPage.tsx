import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import type { EmailOtpType, User } from '@supabase/supabase-js';
import AsciendeLogo from '../components/AsciendeLogo';
import { supabase } from '../lib/supabase';
import { buildSatelliteLaunchUrl } from '../lib/satelliteAuth';
import { useLanguage } from '../contexts/LanguageContext';

const initialCallback = (() => {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  return {
    hasError: Boolean(url.searchParams.get('error') || url.searchParams.get('error_code') ||
      hash.get('error') || hash.get('error_description')),
    redirectUrl: url.searchParams.get('redirect_url'),
  };
})();

type ViewState = 'checking' | 'success' | 'invalid';
const CONFIRMATION_URL = 'https://hub.asciende.pro/confirm-email';

export default function ConfirmEmailPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [state, setState] = useState<ViewState>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  const continueToHub = () => navigate('/', { replace: true });

  const continueToSatellite = async () => {
    const target = getAllowedSatelliteUrl(initialCallback.redirectUrl);
    if (!target) {
      continueToHub();
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      window.location.assign(await buildSatelliteLaunchUrl(target.toString()));
    } catch {
      setMessage('We confirmed your email, but could not connect to the selected planner. You can continue to Asciende Hub and open it again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    let checkStarted = false;
    const url = new URL(window.location.href);
    const tokenHash = url.searchParams.get('token_hash');
    const authCode = url.searchParams.get('code');
    const rawType = url.searchParams.get('type');

    // Remove confirmation secrets from the address bar after capturing the one-time hash.
    if (tokenHash || authCode || url.hash) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') void checkConfirmation();
    });

    async function checkConfirmation() {
      if (!active || checkStarted) return;
      checkStarted = true;
      if (initialCallback.hasError) {
        setState('invalid');
        return;
      }

      if (tokenHash) {
        if (rawType !== 'signup' && rawType !== 'email') {
          setState('invalid');
          return;
        }
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: rawType as EmailOtpType });
        if (!active) return;
        if (error || !data.user || !(data.user.email_confirmed_at || data.user.confirmed_at)) {
          setState('invalid');
          return;
        }
        setUser(data.user);
        setState('success');
        return;
      }

      if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (!active) return;
        if (error) {
          setState('invalid');
          return;
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError || !session) {
        setState('invalid');
        return;
      }
      const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !verifiedUser || !(verifiedUser.email_confirmed_at || verifiedUser.confirmed_at)) {
        setState('invalid');
        return;
      }
      setUser(verifiedUser);
      setState('success');
    }

    if (initialCallback.hasError) {
      setState('invalid');
    } else if (tokenHash) {
      void checkConfirmation();
    } else {
      // Supabase JS auto-detects and exchanges PKCE codes or hash tokens during auth init.
      void checkConfirmation();
    }

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const resendConfirmation = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: CONFIRMATION_URL },
      });
      if (error) setMessage('We could not resend the confirmation email. Check the address and try again.');
      else setResent(true);
    } catch {
      setMessage('We could not resend the confirmation email. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const continueToPayment = async () => {
    if (!user) return;
    const metadata = user.user_metadata ?? {};
    const role = metadata.requested_role;
    const cycle = metadata.billing_cycle;
    if (!['trainer', 'nutritionist', 'head_coach', 'biomechanist'].includes(role) || (cycle !== 'monthly' && cycle !== 'yearly')) return;
    setBusy(true);
    setMessage('');
    const modules = role === 'trainer' ? ['endurance_planner'] : role === 'nutritionist' ? ['nutrition_planner'] : role === 'biomechanist' ? ['biomechanics'] : ['all_access'];
    const { data, error } = await supabase.functions.invoke('stripe-create-professional-checkout', { body: { interval: cycle, modules } });
    if (error || !data?.url) {
      setMessage(language === 'es' ? 'No pudimos preparar el pago profesional. Inténtalo de nuevo.' : 'We could not prepare professional checkout. Please try again.');
      setBusy(false);
      return;
    }
    window.location.assign(data.url);
  };

  const metadata = user?.user_metadata ?? {};
  const requiresProfessionalPayment = Boolean(user &&
    ['trainer', 'nutritionist', 'head_coach', 'biomechanist'].includes(metadata.requested_role) &&
    (metadata.billing_cycle === 'monthly' || metadata.billing_cycle === 'yearly'));
  const paymentReceived = ['success', 'true'].includes(new URLSearchParams(window.location.search).get('professional_payment') || '');

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7F6FA] px-4 py-10 text-[#2A1F4A]">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_24px_80px_rgba(42,31,74,0.12)] sm:p-10">
        <div className="mb-8 flex justify-center"><AsciendeLogo height={48} /></div>

        {state === 'checking' && (
          <div className="py-8 text-center" role="status">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <h1 className="text-xl font-bold">Confirming your email…</h1>
            <p className="mt-2 text-sm text-[#716B7D]">Please wait while we verify your link.</p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
            <h1 className="text-2xl font-bold">Email confirmed</h1>
            <p className="mt-2 text-sm leading-6 text-[#716B7D]">Your email address is verified. You can continue to Asciende.</p>
            {paymentReceived && (
              <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                {language === 'es'
                  ? 'Pago recibido. Tu cuenta profesional será activada por el equipo de Asciende'
                  : 'Payment received. Your professional account will be activated by the Asciende team'}
              </p>
            )}
            {requiresProfessionalPayment ? (
              <button onClick={continueToPayment} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7C843] px-4 py-3.5 text-sm font-bold text-[#2A1F4A] hover:bg-[#f3bc24]">
                Continue to account activation <ArrowRight className="h-4 w-4" />
              </button>
            ) : initialCallback.redirectUrl ? (
              <>
                <button onClick={continueToSatellite} disabled={busy} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2A1F4A] px-4 py-3.5 text-sm font-semibold text-white hover:bg-[#3B2D66] disabled:opacity-50">
                  {busy ? 'Connecting…' : 'Continue to planner'} <ArrowRight className="h-4 w-4" />
                </button>
                {message && <p className="mt-4 text-sm text-red-700" role="alert">{message}</p>}
                {message && <button onClick={continueToHub} className="mt-3 w-full py-2 text-sm font-semibold text-[#2A1F4A] hover:underline">Continue to Asciende Hub</button>}
              </>
            ) : (
              <button onClick={continueToHub} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2A1F4A] px-4 py-3.5 text-sm font-semibold text-white hover:bg-[#3B2D66]">
                Continue to Asciende <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {state === 'invalid' && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
            <h1 className="text-center text-2xl font-bold">Confirmation link unavailable</h1>
            <p className="mt-2 text-center text-sm leading-6 text-[#716B7D]">This link may be invalid, expired, or already used. You can request another confirmation email.</p>
            {resent ? (
              <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-center text-sm text-emerald-800" role="status">If your account still needs confirmation, a new email is on its way.</p>
            ) : (
              <form onSubmit={resendConfirmation} className="mt-6 space-y-4">
                <label htmlFor="confirmation-email" className="block text-sm font-medium">Email address</label>
                <div className="relative"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B8498]" /><input id="confirmation-email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-[#E6E2EC] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#2A1F4A] focus:ring-2 focus:ring-[#2A1F4A]/10" placeholder="you@example.com" /></div>
                {message && <p className="text-sm text-red-700" role="alert">{message}</p>}
                <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7C843] px-4 py-3.5 text-sm font-bold text-[#2A1F4A] hover:bg-[#f3bc24] disabled:opacity-50">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Sending…' : 'Request another confirmation email'}
                </button>
              </form>
            )}
            <button onClick={() => navigate('/', { replace: true })} className="mt-5 w-full py-2 text-sm font-semibold text-[#2A1F4A] hover:underline">Return to login</button>
          </>
        )}
      </section>
    </main>
  );
}

function getAllowedSatelliteUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const isAsciendeDomain = url.protocol === 'https:' &&
      (url.hostname === 'asciende.pro' || url.hostname.endsWith('.asciende.pro'));
    const isLocalDevelopment = url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    return isAsciendeDomain || isLocalDevelopment ? url : null;
  } catch {
    return null;
  }
}
