import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import AsciendeLogo from '../AsciendeLogo';
import {
  User, Lock, Mail, Phone, ArrowRight, ArrowLeft, Globe, Check,
  Dumbbell, Stethoscope, Crown, Shield, CreditCard, Loader2, Eye, EyeOff,
  Sparkles, Calendar, Users, Clock
} from 'lucide-react';

type ProfessionalRole = 'trainer' | 'nutritionist' | 'head_coach';

interface ProfessionalSignUpProps {
  onComplete: () => void;
  onBack: () => void;
  initialStep?: number;
  onStepChange?: (step: number) => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  role: ProfessionalRole | null;
  bio: string;
  tagline: string;
  country: string;
  termsAccepted: boolean;
}

const STRIPE_LINKS: Record<'monthly' | 'yearly', string> = {
  monthly: 'https://buy.stripe.com/4gM14n1klgUoac55SG9R60d',
  yearly: 'https://buy.stripe.com/fZu6oHe77cE8fwpgxk9R60e',
};

const ROLE_CARDS: { role: ProfessionalRole; icon: typeof Dumbbell; color: string; labelEs: string; labelEn: string; accessEs: string[]; accessEn: string[]; locked?: boolean }[] = [
  {
    role: 'trainer',
    icon: Dumbbell,
    color: '#4ade80',
    labelEs: 'Entrenador',
    labelEn: 'Trainer',
    accessEs: ['Hub', 'Endurance Planner'],
    accessEn: ['Hub', 'Endurance Planner'],
  },
  {
    role: 'nutritionist',
    icon: Stethoscope,
    color: '#fb923c',
    labelEs: 'Nutricionista',
    labelEn: 'Nutritionist',
    accessEs: ['Hub', 'Nutrition Planner'],
    accessEn: ['Hub', 'Nutrition Planner'],
  },
  {
    role: 'head_coach',
    icon: Crown,
    color: '#fdda36',
    labelEs: 'Head Coach',
    labelEn: 'Head Coach',
    accessEs: ['Hub', 'Endurance', 'Nutrition', 'LAB', 'Motion', 'Performance', 'Academy'],
    accessEn: ['Hub', 'Endurance', 'Nutrition', 'LAB', 'Motion', 'Performance', 'Academy'],
    locked: true,
  },
];

export default function ProfessionalSignUp({ onComplete, onBack, initialStep = 1, onStepChange }: ProfessionalSignUpProps) {
  const { language, setLanguage } = useLanguage();
  const { showToast } = useToast();
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [accountCreated, setAccountCreated] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('professional_payment') === 'success') {
      setAccountCreated(true);
      setStep(4);
      window.history.replaceState({}, '', window.location.pathname);
      attemptAutoLogin();
    }
  }, []);

  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    role: null,
    bio: '',
    tagline: '',
    country: '',
    termsAccepted: false,
  });

  const attemptAutoLogin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        showToast(language === 'es' ? '¡Pago confirmado! Bienvenido a Asciende.' : 'Payment confirmed! Welcome to Asciende.', 'success');
        onComplete();
        return;
      }
    } catch {
      // session not available, user will need to log in manually
    }
  };

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'username') {
      setUsernameAvailable(null);
      if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
      const v = value as string;
      if (v.length >= 3) {
        const t = setTimeout(async () => {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', v)
            .maybeSingle();
          setUsernameAvailable(!data);
        }, 500);
        setUsernameCheckTimeout(t);
      }
    }
  };

  const validateStep1 = (): boolean => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(language === 'es' ? 'Completa nombre y apellido' : 'Please complete first and last name');
      return false;
    }
    if (form.username.trim().length < 3) {
      setError(language === 'es' ? 'El usuario debe tener al menos 3 caracteres' : 'Username must be at least 3 characters');
      return false;
    }
    if (usernameAvailable === false) {
      setError(language === 'es' ? 'Ese nombre de usuario ya está en uso' : 'That username is already taken');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError(language === 'es' ? 'Por favor ingresa un email válido' : 'Please enter a valid email');
      return false;
    }
    if (form.password.length < 6) {
      setError(language === 'es' ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!form.role) {
      setError(language === 'es' ? 'Selecciona una profesión' : 'Please select a profession');
      return false;
    }
    if (form.role === 'head_coach') {
      setError(language === 'es' ? 'Head Coach estará disponible próximamente' : 'Head Coach will be available soon');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!form.termsAccepted) {
      setError(language === 'es' ? 'Debes aceptar los términos y condiciones' : 'You must accept the terms and conditions');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 3) {
      void handleCreateAccountAndRedirect();
      return;
    }
    const nextStep = Math.min(4, step + 1);
    setStep(nextStep);
    onStepChange?.(nextStep);
  };

  const handlePrev = () => {
    setError('');
    const previousStep = Math.max(1, step - 1);
    setStep(previousStep);
    onStepChange?.(previousStep);
  };

  const handleCreateAccountAndRedirect = async () => {
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim() || !form.email.trim() || !form.role || !form.termsAccepted) {
      setError(language === 'es' ? 'Completa los datos obligatorios antes de continuar' : 'Complete the required information before continuing');
      return;
    }
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/auth-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: `${form.firstName} ${form.lastName}`,
          role: form.role,
          username: form.username,
          phone: form.phone || undefined,
          first_name: form.firstName,
          last_name: form.lastName,
          bio: form.bio || undefined,
          tagline: form.tagline || undefined,
          country: form.country || undefined,
          terms_accepted: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || 'Signup failed');
        setLoading(false);
        return;
      }

      const userId = result.user?.id || result.userId;
      if (!userId) {
        setError(language === 'es' ? 'Error al crear la cuenta' : 'Error creating account');
        setLoading(false);
        return;
      }

      setCreatedUserId(userId);
      setAccountCreated(true);

      const stripeLink = STRIPE_LINKS[billingCycle];
      const stripeUrl = `${stripeLink}?client_reference_id=${userId}`;

      showToast(language === 'es' ? 'Cuenta creada. Redirigiendo a Stripe...' : 'Account created. Redirecting to Stripe...', 'success');
      window.location.href = stripeUrl;
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#fdda36]/50 focus:bg-white/[0.07] transition-all';
  const labelClass = 'block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(155deg, #0D0B14 0%, #110E1C 40%, #0A0814 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(253,218,54,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(253,218,54,0.03) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: '600px', height: '600px', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse at center, rgba(253,218,54,0.05) 0%, transparent 65%)',
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5 z-10">
        <button onClick={step === 1 ? onBack : handlePrev} className="text-white/40 hover:text-white/70 transition-colors text-sm font-medium flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          {language === 'es' ? 'Volver' : 'Back'}
        </button>
        <AsciendeLogo variant="full" height={28} className="opacity-80" />
        <button
          onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          {language === 'en' ? 'ES' : 'EN'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute top-16 left-0 right-0 px-6 z-10">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-all duration-500"
              style={{
                background: s <= step ? 'linear-gradient(90deg, #fdda36, #f5c400)' : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
        <p className="text-center text-xs text-white/30 mt-2 font-medium">
          {language === 'es' ? `Paso ${step} de 4` : `Step ${step} of 4`}
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md px-6 pt-24 pb-8">
        {/* ── STEP 1: Basic Info ── */}
        {step === 1 && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease]">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{language === 'es' ? 'Información básica' : 'Basic information'}</h2>
              <p className="text-sm text-white/40">{language === 'es' ? 'Empecemos por lo fundamental' : 'Let\'s start with the essentials'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{language === 'es' ? 'Nombre' : 'First Name'}</label>
                <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)} className={inputClass} placeholder={language === 'es' ? 'Juan' : 'John'} />
              </div>
              <div>
                <label className={labelClass}>{language === 'es' ? 'Apellido' : 'Last Name'}</label>
                <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} className={inputClass} placeholder={language === 'es' ? 'Pérez' : 'Doe'} />
              </div>
            </div>
            <div>
              <label className={labelClass}>{language === 'es' ? 'Usuario' : 'Username'}</label>
              <div className="relative">
                <input type="text" value={form.username} onChange={e => update('username', e.target.value.trim().toLowerCase())} className={inputClass} placeholder="username" style={{ paddingRight: '2.5rem' }} />
                {usernameAvailable === true && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4ade80]" />}
                {usernameAvailable === false && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f87171] text-xs font-bold">✕</span>}
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className={inputClass} style={{ paddingLeft: '2.5rem' }} placeholder="you@email.com" />
              </div>
            </div>
            <div>
              <label className={labelClass}>{language === 'es' ? 'Contraseña' : 'Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} className={inputClass} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>
                {language === 'es' ? 'Teléfono' : 'Phone Number'} <span className="text-white/30 normal-case font-normal">({language === 'es' ? 'opcional' : 'optional'})</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className={inputClass} style={{ paddingLeft: '2.5rem' }} placeholder="+34 600 000 000" />
              </div>
              <p className="text-xs text-white/30 mt-1">{language === 'es' ? 'Mejora la comunicación con tus atletas' : 'Improves communication with your athletes'}</p>
            </div>
          </div>
        )}

        {/* ── STEP 2: Profession Selection ── */}
        {step === 2 && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease]">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{language === 'es' ? 'Elige tu profesión' : 'Choose your profession'}</h2>
              <p className="text-sm text-white/40">
                {language === 'es' ? 'Todos incluyen acceso al Hub' : 'All include Hub access'}
              </p>
            </div>
            <div className="space-y-3">
              {ROLE_CARDS.map(card => {
                const Icon = card.icon;
                const isSelected = form.role === card.role;
                const isLocked = card.locked;
                return (
                  <button
                    key={card.role}
                    onClick={() => !isLocked && update('role', card.role)}
                    disabled={isLocked}
                    className="w-full text-left rounded-2xl p-4 transition-all duration-300 relative"
                    style={{
                      background: isLocked
                        ? 'rgba(255,255,255,0.02)'
                        : isSelected
                          ? `linear-gradient(145deg, ${card.color}15, ${card.color}05)`
                          : 'rgba(255,255,255,0.03)',
                      border: isLocked
                        ? '1px solid rgba(255,255,255,0.05)'
                        : isSelected
                          ? `1px solid ${card.color}50`
                          : '1px solid rgba(255,255,255,0.08)',
                      transform: isSelected && !isLocked ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isSelected && !isLocked ? `0 8px 24px ${card.color}20` : 'none',
                      opacity: isLocked ? 0.4 : 1,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${card.color}20`, border: `1px solid ${card.color}40` }}>
                        <Icon className="w-5 h-5" style={{ color: card.color }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{language === 'es' ? card.labelEs : card.labelEn}</h3>
                        {isLocked && (
                          <span className="text-[10px] text-white/40 font-medium uppercase tracking-wide">
                            {language === 'es' ? 'Próximamente' : 'Coming Soon'}
                          </span>
                        )}
                      </div>
                      {isSelected && !isLocked && <Check className="w-5 h-5" style={{ color: card.color }} />}
                      {isLocked && <Clock className="w-4 h-4 text-white/30" />}
                    </div>
                    <div className="flex flex-wrap gap-1.5 ml-13">
                      {(language === 'es' ? card.accessEs : card.accessEn).map(a => (
                        <span
                          key={a}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: `${card.color}15`, color: card.color, border: `1px solid ${card.color}30` }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 3: Profile + Billing + Terms ── */}
        {step === 3 && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease]">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{language === 'es' ? 'Completa tu perfil' : 'Complete your profile'}</h2>
              <p className="text-sm text-white/40">{language === 'es' ? 'Detalles opcionales que mejoran tu presencia' : 'Optional details that enhance your presence'}</p>
            </div>
            <div>
              <label className={labelClass}>{language === 'es' ? 'Lema / Tagline' : 'Tagline'}</label>
              <input type="text" value={form.tagline} onChange={e => update('tagline', e.target.value)} className={inputClass} placeholder={language === 'es' ? 'Ej: Especialista en fuerza y rendimiento' : 'e.g. Strength & performance specialist'} />
            </div>
            <div>
              <label className={labelClass}>{language === 'es' ? 'Biografía corta' : 'Short bio'}</label>
              <textarea value={form.bio} onChange={e => update('bio', e.target.value)} className={inputClass} rows={2} placeholder={language === 'es' ? 'Cuéntanos sobre tu experiencia...' : 'Tell us about your experience...'} />
            </div>
            <div>
              <label className={labelClass}>{language === 'es' ? 'País' : 'Country'}</label>
              <input type="text" value={form.country} onChange={e => update('country', e.target.value)} className={inputClass} placeholder={language === 'es' ? 'España' : 'Spain'} />
            </div>

            {/* Billing cycle selection */}
            <div className="pt-2">
              <label className={labelClass}>{language === 'es' ? 'Plan de pago' : 'Billing plan'}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{
                    background: billingCycle === 'monthly' ? 'linear-gradient(145deg, rgba(253,218,54,0.12), rgba(253,218,54,0.04))' : 'rgba(255,255,255,0.03)',
                    border: billingCycle === 'monthly' ? '1px solid rgba(253,218,54,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#fdda36]" />
                    <span className="text-xs font-bold text-white uppercase">{language === 'es' ? 'Mensual' : 'Monthly'}</span>
                  </div>
                  <span className="text-lg font-bold text-white">49€</span>
                  <span className="text-xs text-white/40">/{language === 'es' ? 'mes' : 'mo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className="rounded-xl p-3 text-left transition-all relative"
                  style={{
                    background: billingCycle === 'yearly' ? 'linear-gradient(145deg, rgba(253,218,54,0.12), rgba(253,218,54,0.04))' : 'rgba(255,255,255,0.03)',
                    border: billingCycle === 'yearly' ? '1px solid rgba(253,218,54,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#fdda36]" />
                    <span className="text-xs font-bold text-white uppercase">{language === 'es' ? 'Anual' : 'Yearly'}</span>
                  </div>
                  <span className="text-lg font-bold text-white">490€</span>
                  <span className="text-xs text-white/40">/{language === 'es' ? 'año' : 'yr'}</span>
                  <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
                    {language === 'es' ? 'Ahorra 2 meses' : 'Save 2 months'}
                  </span>
                </button>
              </div>
            </div>

            {/* Trial info */}
            <div className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <Sparkles className="w-4 h-4 text-[#4ade80] shrink-0" />
              <p className="text-xs text-[#4ade80]/80 font-medium">
                {language === 'es'
                  ? '7 días de prueba gratuita. Sin cargo hasta que termine el periodo.'
                  : '7-day free trial. No charge until the trial period ends.'}
              </p>
            </div>

            {/* Athlete limit info */}
            <div className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Users className="w-4 h-4 text-[#fdda36] shrink-0" />
              <p className="text-xs text-white/50 font-medium">
                {language === 'es'
                  ? 'Gestiona hasta 50 atletas con tu cuenta profesional.'
                  : 'Manage up to 50 athletes with your professional account.'}
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <button
                type="button"
                onClick={() => update('termsAccepted', !form.termsAccepted)}
                className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0"
                style={{
                  background: form.termsAccepted ? '#fdda36' : 'transparent',
                  border: form.termsAccepted ? '1px solid #fdda36' : '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {form.termsAccepted && <Check className="w-3.5 h-3.5 text-[#1a1428]" />}
              </button>
              <span className="text-xs text-white/50 leading-relaxed">
                {language === 'es'
                  ? <>Acepto los <a href="https://asciende.pro/terms" target="_blank" rel="noopener noreferrer" className="text-[#fdda36]/70 hover:text-[#fdda36] underline underline-offset-2">Términos</a> y la <a href="https://asciende.pro/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#fdda36]/70 hover:text-[#fdda36] underline underline-offset-2">Política de Privacidad</a></>
                  : <>I accept the <a href="https://asciende.pro/terms" target="_blank" rel="noopener noreferrer" className="text-[#fdda36]/70 hover:text-[#fdda36] underline underline-offset-2">Terms</a> and <a href="https://asciende.pro/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#fdda36]/70 hover:text-[#fdda36] underline underline-offset-2">Privacy Policy</a></>}
              </span>
            </label>
          </div>
        )}

        {/* ── STEP 4: Payment (post-redirect) ── */}
        {step === 4 && (
          <div className="space-y-6 text-center animate-[fadeIn_0.3s_ease]">
            {accountCreated ? (
              <>
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                  <Check className="w-8 h-8 text-[#4ade80]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {language === 'es' ? '¡Pago completado!' : 'Payment completed!'}
                  </h2>
                  <p className="text-sm text-white/50 max-w-xs mx-auto">
                    {language === 'es'
                      ? 'Tu cuenta profesional está activa. Tu prueba gratuita de 7 días ha comenzado.'
                      : 'Your professional account is active. Your 7-day free trial has started.'}
                  </p>
                </div>
                <div className="rounded-2xl p-5 text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/60">{language === 'es' ? 'Plan' : 'Plan'}</span>
                    <span className="text-sm font-bold text-white capitalize">
                      {form.role === 'trainer' ? (language === 'es' ? 'Entrenador' : 'Trainer')
                        : form.role === 'nutritionist' ? (language === 'es' ? 'Nutricionista' : 'Nutritionist')
                        : 'Head Coach'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/60">{language === 'es' ? 'Atletas máx.' : 'Max athletes'}</span>
                    <span className="text-sm font-bold text-[#fdda36]">50</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">{language === 'es' ? 'Prueba gratuita' : 'Free trial'}</span>
                    <span className="text-sm font-bold text-[#4ade80]">7 {language === 'es' ? 'días' : 'days'}</span>
                  </div>
                </div>
                <button
                  onClick={() => { showToast(language === 'es' ? '¡Bienvenido a Asciende!' : 'Welcome to Asciende!', 'success'); onComplete(); }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#1a1428] font-bold rounded-xl hover:bg-[#f5c400] transition-colors"
                >
                  {language === 'es' ? 'Ir al Hub' : 'Go to Hub'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(253,218,54,0.12)', border: '1px solid rgba(253,218,54,0.3)' }}>
                  <CreditCard className="w-8 h-8 text-[#fdda36]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{language === 'es' ? 'Activa tu cuenta' : 'Activate your account'}</h2>
                  <p className="text-sm text-white/50 max-w-xs mx-auto">
                    {language === 'es'
                      ? 'Serás redirigido a Stripe para completar el pago de forma segura.'
                      : 'You will be redirected to Stripe to complete payment securely.'}
                  </p>
                </div>
                <div className="rounded-2xl p-5 text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/60">{language === 'es' ? 'Plan' : 'Plan'}</span>
                    <span className="text-sm font-bold text-white capitalize">
                      {form.role === 'trainer' ? (language === 'es' ? 'Entrenador' : 'Trainer')
                        : form.role === 'nutritionist' ? (language === 'es' ? 'Nutricionista' : 'Nutritionist')
                        : 'Head Coach'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/60">{language === 'es' ? 'Facturación' : 'Billing'}</span>
                    <span className="text-sm font-bold text-[#fdda36]">
                      {billingCycle === 'monthly' ? (language === 'es' ? 'Mensual — 49€/mes' : 'Monthly — 49€/mo') : (language === 'es' ? 'Anual — 490€/año' : 'Yearly — 490€/yr')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/60">{language === 'es' ? 'Atletas máx.' : 'Max athletes'}</span>
                    <span className="text-sm font-bold text-white">50</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">{language === 'es' ? 'Prueba gratuita' : 'Free trial'}</span>
                      <span className="text-sm font-bold text-[#4ade80]">7 {language === 'es' ? 'días' : 'days'}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/30">
                  {language === 'es'
                    ? 'El mismo precio aplica para Entrenadores y Nutricionistas.'
                    : 'Same price applies for Trainers and Nutritionists.'}
                </p>
                <button
                  onClick={() => void handleCreateAccountAndRedirect()}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#1a1428] font-bold rounded-xl hover:bg-[#f5c400] disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading
                    ? (language === 'es' ? 'Redirigiendo...' : 'Redirecting...')
                    : (language === 'es' ? 'Pagar y activar cuenta' : 'Pay & activate account')}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        {step < 4 && (
          <button
            onClick={handleNext}
            disabled={loading || (step === 1 && usernameAvailable === false) || (step === 2 && form.role === 'head_coach')}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#1a1428] font-bold rounded-xl hover:bg-[#f5c400] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? (language === 'es' ? 'Creando cuenta...' : 'Creating account...')
              : step === 3
              ? (language === 'es' ? 'Ir al pago' : 'Go to payment')
              : (language === 'es' ? 'Continuar' : 'Continue')}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600;700&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
