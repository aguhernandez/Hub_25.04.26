import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, XCircle } from 'lucide-react';
import AsciendeLogo from '../components/AsciendeLogo';
import { supabase } from '../lib/supabase';

// Supabase's client processes recovery callbacks during initialization. Capture only
// callback metadata (never tokens) before AuthProvider calls getSession().
const { initialCallbackIsRecovery, initialCallbackHasError } = (() => {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  return {
    initialCallbackIsRecovery: url.searchParams.has('code') || hash.get('type') === 'recovery',
    initialCallbackHasError: Boolean(url.searchParams.get('error') || hash.get('error') || hash.get('error_description')),
  };
})();

type ScreenState = 'checking' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<ScreenState>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    let active = true;
    let recoveryEventSeen = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryEventSeen = true;
        void verifyRecoverySession(true);
      }
    });

    async function verifyRecoverySession(fromRecoveryEvent: boolean) {
      if (initialCallbackHasError) {
        if (active) setState('invalid');
        return;
      }
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const isRecoveryFlow = fromRecoveryEvent || recoveryEventSeen || initialCallbackIsRecovery;
      if (!active) return;
      if (sessionError || !session || !isRecoveryFlow) {
        setState('invalid');
        return;
      }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !user) {
        setState('invalid');
        return;
      }
      setState('ready');
    }

    void verifyRecoverySession(false);
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (newPassword.length < 6) {
      setMessage('Your password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setState('invalid');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage(error.message.toLowerCase().includes('password')
          ? error.message
          : 'This recovery link is invalid or has expired. Request a new email to try again.');
        if (/session|token|expired|invalid/i.test(error.message)) setState('invalid');
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      setState('success');
    } catch {
      setMessage('We could not update your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestRecoveryEmail = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://hub.asciende.pro/reset-password',
      });
      if (error) setMessage('We could not send a recovery email. Check the address and try again.');
      else setEmailSent(true);
    } catch {
      setMessage('We could not send a recovery email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnToLogin = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#F7F6FA] px-4 py-10 text-[#2A1F4A] sm:flex sm:items-center sm:justify-center sm:py-14">
      <section className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_24px_80px_rgba(42,31,74,0.12)] sm:p-10">
        <div className="mb-8 flex justify-center"><AsciendeLogo height={48} /></div>

        {state === 'checking' && (
          <div className="py-10 text-center" role="status">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#2A1F4A]" />
            <p className="text-sm text-[#716B7D]">Checking your recovery link…</p>
          </div>
        )}

        {state === 'ready' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7C843]/25"><KeyRound className="h-6 w-6" /></div>
            <h1 className="text-center text-2xl font-bold tracking-tight">Set a new password</h1>
            <p className="mt-2 text-center text-sm leading-6 text-[#716B7D]">Choose a secure password with at least 6 characters.</p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <PasswordInput label="New password" value={newPassword} onChange={setNewPassword} visible={showNewPassword} toggle={() => setShowNewPassword(v => !v)} />
              <PasswordInput label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} toggle={() => setShowConfirmPassword(v => !v)} />
              {message && <p className="text-sm text-red-700" role="alert">{message}</p>}
              <button type="submit" disabled={isSubmitting || !newPassword || !confirmPassword} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2A1F4A] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#3B2D66] disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{isSubmitting ? 'Updating password…' : 'Update password'}
              </button>
            </form>
          </>
        )}

        {state === 'success' && (
          <div className="py-3 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
            <h1 className="text-2xl font-bold">Password updated</h1>
            <p className="mt-2 text-sm leading-6 text-[#716B7D]">Your password has been changed. Sign in with your new password.</p>
            <button onClick={returnToLogin} className="mt-7 w-full rounded-xl bg-[#F7C843] px-4 py-3.5 text-sm font-bold text-[#2A1F4A] hover:bg-[#f3bc24]">Return to login</button>
          </div>
        )}

        {state === 'invalid' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50"><XCircle className="h-6 w-6 text-red-600" /></div>
            <h1 className="text-center text-2xl font-bold">Recovery link unavailable</h1>
            <p className="mt-2 text-center text-sm leading-6 text-[#716B7D]">This link may be invalid, expired, or already used. Request a new recovery email to continue.</p>
            {emailSent ? (
              <p className="mt-7 rounded-xl bg-emerald-50 p-4 text-center text-sm text-emerald-800" role="status">If an account exists for that address, a new recovery email is on its way.</p>
            ) : (
              <form onSubmit={requestRecoveryEmail} className="mt-7 space-y-4">
                <label htmlFor="recovery-email" className="block text-sm font-medium">Email address</label>
                <div className="relative"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B8498]" /><input id="recovery-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-[#E6E2EC] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#2A1F4A] focus:ring-2 focus:ring-[#2A1F4A]/10" placeholder="you@example.com" /></div>
                {message && <p className="text-sm text-red-700" role="alert">{message}</p>}
                <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7C843] px-4 py-3.5 text-sm font-bold text-[#2A1F4A] hover:bg-[#f3bc24] disabled:opacity-50">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{isSubmitting ? 'Sending…' : 'Request another recovery email'}
                </button>
              </form>
            )}
            <button onClick={returnToLogin} className="mt-5 flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-[#2A1F4A] hover:underline"><ArrowLeft className="h-4 w-4" />Return to login</button>
          </>
        )}
      </section>
    </main>
  );
}

function PasswordInput({ label, value, onChange, visible, toggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; toggle: () => void }) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} required minLength={6} autoComplete="new-password" value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-[#E6E2EC] px-4 py-3 pr-12 text-sm outline-none focus:border-[#2A1F4A] focus:ring-2 focus:ring-[#2A1F4A]/10" placeholder="At least 6 characters" />
        <button type="button" onClick={toggle} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#8B8498] hover:text-[#2A1F4A]">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
    </div>
  );
}
