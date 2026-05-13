import { useState, useRef, useEffect } from 'react';
import AsciendeLogo from '../components/AsciendeLogo';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  Mail, Lock, User, Eye, EyeOff, Globe, Check, ArrowRight,
  ArrowLeft, Activity, Bike, Waves, TrendingUp, Trophy, Dumbbell,
  Flame, Target, Mountain, Heart, Footprints, Camera, Calendar,
  ChevronRight, Zap, FlaskConical, Salad, GraduationCap, Wind
} from 'lucide-react';
import { useToast } from '../hooks/useToast';

const SATELLITES = [
  {
    id: 'hub',
    key: 'hub',
    label_es: 'Hub Principal',
    label_en: 'Main Hub',
    desc_es: 'Entrenamiento, nutrición, hábitos y más',
    desc_en: 'Training, nutrition, habits and more',
    icon: Activity,
    color: '#fdda36',
    url: null,
  },
  {
    id: 'lab',
    key: 'lab',
    label_es: 'LAB',
    label_en: 'LAB',
    desc_es: 'Evaluaciones metabólicas y fisiológicas',
    desc_en: 'Metabolic & physiological assessments',
    icon: FlaskConical,
    color: '#38bdf8',
    url: 'https://lab.asciende.pro',
  },
  {
    id: 'endurance',
    key: 'endurance',
    label_es: 'Endurance',
    label_en: 'Endurance',
    desc_es: 'Ciclismo, running, triatlón',
    desc_en: 'Cycling, running, triathlon',
    icon: Bike,
    color: '#4ade80',
    url: 'https://endurance.asciende.pro',
  },
  {
    id: 'nutrition',
    key: 'nutrition',
    label_es: 'Nutrition',
    label_en: 'Nutrition',
    desc_es: 'Planes y seguimiento nutricional',
    desc_en: 'Nutrition plans & tracking',
    icon: Salad,
    color: '#fb923c',
    url: 'https://nutrition.asciende.pro',
  },
  {
    id: 'academy',
    key: 'academy',
    label_es: 'Academy',
    label_en: 'Academy',
    desc_es: 'Cursos y formación deportiva',
    desc_en: 'Courses & sports education',
    icon: GraduationCap,
    color: '#c084fc',
    url: 'https://academy.asciende.pro',
  },
  {
    id: 'motion',
    key: 'motion',
    label_es: 'Motion',
    label_en: 'Motion',
    desc_es: 'Análisis biomecánico y movimiento',
    desc_en: 'Biomechanical & movement analysis',
    icon: Wind,
    color: '#f472b6',
    url: 'https://motion.asciende.pro',
  },
  {
    id: 'performance',
    key: 'performance',
    label_es: 'Performance',
    label_en: 'Performance',
    desc_es: 'Análisis de rendimiento y fuerza-velocidad',
    desc_en: 'Performance & force-velocity analysis',
    icon: TrendingUp,
    color: '#facc15',
    url: 'https://performance.asciende.pro',
  },
];

const SPORTS = [
  { id: 'volleyball', name: 'Volleyball', nameEs: 'Vóley', icon: Activity },
  { id: 'beach_volleyball', name: 'Beach Volleyball', nameEs: 'Beach Vóley', icon: Waves },
  { id: 'cycling', name: 'Cycling', nameEs: 'Ciclismo', icon: Bike },
  { id: 'running', name: 'Running', nameEs: 'Running', icon: TrendingUp },
  { id: 'swimming', name: 'Swimming', nameEs: 'Natación', icon: Waves },
  { id: 'triathlon', name: 'Triathlon', nameEs: 'Triatlón', icon: Trophy },
  { id: 'gym', name: 'Gym', nameEs: 'Gym', icon: Dumbbell },
  { id: 'crossfit', name: 'CrossFit', nameEs: 'CrossFit', icon: Flame },
  { id: 'hyrox', name: 'Hyrox', nameEs: 'Hyrox', icon: Flame },
  { id: 'soccer', name: 'Soccer', nameEs: 'Fútbol', icon: Activity },
  { id: 'basketball', name: 'Basketball', nameEs: 'Básquet', icon: Target },
  { id: 'tennis', name: 'Tennis', nameEs: 'Tenis', icon: Activity },
  { id: 'climbing', name: 'Climbing', nameEs: 'Escalada', icon: Mountain },
  { id: 'martial_arts', name: 'Martial Arts', nameEs: 'Artes Marciales', icon: Target },
  { id: 'yoga', name: 'Yoga', nameEs: 'Yoga', icon: Heart },
  { id: 'hiking', name: 'Hiking', nameEs: 'Senderismo', icon: Mountain },
  { id: 'track_field', name: 'Track & Field', nameEs: 'Atletismo', icon: Footprints },
  { id: 'boxing', name: 'Boxing', nameEs: 'Boxeo', icon: Target },
  { id: 'other', name: 'Other', nameEs: 'Otro', icon: Activity },
];

const linkClass = 'text-[#fdda36]/70 hover:text-[#fdda36] underline underline-offset-2';
const blank = '_blank';
const noref = 'noopener noreferrer';

function TermsTextEs() {
  return (
    <>Acepto los{' '}
      <a href="https://asciende.pro/terms" target={blank} rel={noref} className={linkClass}>Términos</a>
      {' '}y la{' '}
      <a href="https://asciende.pro/privacy-policy" target={blank} rel={noref} className={linkClass}>Política de Privacidad</a>
    </>
  );
}

function TermsTextEn() {
  return (
    <>I accept the{' '}
      <a href="https://asciende.pro/terms" target={blank} rel={noref} className={linkClass}>Terms</a>
      {' '}and{' '}
      <a href="https://asciende.pro/privacy-policy" target={blank} rel={noref} className={linkClass}>Privacy Policy</a>
    </>
  );
}

type AuthMode = 'satellite-select' | 'login' | 'signup' | 'forgot';
type SignupStep = 1 | 2 | 3;

interface AuthPageProps {
  fromSplash?: boolean;
  initialSatelliteId?: string | null;
  onGoBack?: () => void;
}

export default function AuthPage({ fromSplash = false, initialSatelliteId, onGoBack }: AuthPageProps) {
  const getInitialSatellite = () => {
    if (initialSatelliteId === undefined) return null;
    if (initialSatelliteId === null) return SATELLITES[0];
    return SATELLITES.find(s => s.id === initialSatelliteId) ?? SATELLITES[0];
  };

  const initialSat = getInitialSatellite();
  const [headerVisible, setHeaderVisible] = useState(true);
  const [mode, setMode] = useState<AuthMode>(initialSat ? 'login' : 'satellite-select');
  const [selectedSatellite, setSelectedSatellite] = useState<typeof SATELLITES[0] | null>(initialSat);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [otherSport, setOtherSport] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { signIn, signUp } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      setRedirectUrl(redirect);
      const matched = SATELLITES.find(s => s.url && redirect.startsWith(s.url));
      if (matched) {
        setSelectedSatellite(matched);
      } else {
        setSelectedSatellite(SATELLITES[0]);
      }
      setMode('login');
    }
  }, []);

  const handleSelectSatellite = (sat: typeof SATELLITES[0]) => {
    setSelectedSatellite(sat);
    if (sat.url) {
      setRedirectUrl(sat.url);
    } else {
      setRedirectUrl(null);
    }
    setMode('login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isSatelliteFromRedirect = redirectUrl && selectedSatellite?.id && selectedSatellite.id !== 'hub';
      const isSatelliteFromSplash = !redirectUrl && selectedSatellite?.url && selectedSatellite.id !== 'hub';

      if (isSatelliteFromRedirect) {
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, redirect_url: redirectUrl }),
          });

          const data = await response.json();

          if (!response.ok) {
            setError(data.error || 'Login failed');
            setLoading(false);
            return;
          }

          if (data.success) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const finalUrl = new URL(data.redirect_url || redirectUrl!);
            if (data.token) finalUrl.searchParams.set('session_token', data.token);
            window.location.href = finalUrl.toString();
            return;
          }
        } catch {
          // edge function failed, fall through to signIn + manual redirect
        }
      }

      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        return;
      }

      // If satellite was selected from redirect and edge function path failed, redirect manually
      if (isSatelliteFromRedirect && redirectUrl) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          const finalUrl = new URL(redirectUrl);
          if (token) finalUrl.searchParams.set('session_token', token);
          window.location.href = finalUrl.toString();
        } catch {
          window.location.href = redirectUrl;
        }
        return;
      }

      // If satellite was selected from the splash screen, get a hub token and redirect directly
      if (isSatelliteFromSplash && selectedSatellite?.url) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.access_token) {
            const tokenResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-session-token`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${sessionData.session.access_token}`,
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
              }
            );
            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json();
              if (tokenData.success && tokenData.token) {
                window.location.href = `${selectedSatellite.url}?session_token=${tokenData.token}`;
                return;
              }
            }
          }
          window.location.href = selectedSatellite.url;
        } catch {
          window.location.href = selectedSatellite.url;
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const redirectTo = redirectUrl
        ? `${window.location.origin}?redirect=${encodeURIComponent(redirectUrl)}`
        : window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) setError(error.message);
    } catch {
      setError(language === 'es' ? 'Error al conectar con Google' : 'Failed to connect with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setResetEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError(language === 'es' ? 'Debes aceptar los términos y condiciones' : 'You must accept the terms and conditions');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(language === 'es' ? 'Por favor ingresa un email válido' : 'Please enter a valid email');
      return;
    }
    if (password.length < 6) {
      setError(language === 'es' ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError(language === 'es' ? 'Completa nombre y apellido' : 'Please complete first and last name');
      return;
    }
    setSignupStep(2);
  };

  const handleSignupFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fullName = `${firstName} ${lastName}`;
      const finalSports = sports.includes('other') && otherSport
        ? sports.filter(s => s !== 'other').concat([otherSport]).join(', ')
        : sports.join(', ');

      if (redirectUrl && selectedSatellite?.id !== 'hub') {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, full_name: fullName, redirect_url: redirectUrl }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Signup failed');
          setLoading(false);
          return;
        }
        showToast(language === 'es' ? 'Cuenta creada! Redirigiendo...' : 'Account created! Redirecting...', 'success');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const finalUrl = new URL(data.redirect_url || redirectUrl!);
        if (data.token) finalUrl.searchParams.set('session_token', data.token);
        window.location.href = finalUrl.toString();
        return;
      }

      const { error, user } = await signUp(email, password, fullName, finalSports);
      if (error) { setError(error.message); return; }
      if (!user) { setError('Error creating account'); return; }

      const calculateAge = (bd: string) => {
        const today = new Date(), birth = new Date(bd);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
      };

      await supabase.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth || null,
        age: dateOfBirth ? calculateAge(dateOfBirth) : null,
        gender: gender || null,
        sport: finalSports || null,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted: true,
        privacy_accepted_at: new Date().toISOString(),
        profile_completed: true,
      }).eq('id', user.id);

      showToast(language === 'es' ? 'Bienvenido a Asciende!' : 'Welcome to Asciende!', 'success');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
    if (!file.type.startsWith('image/')) { alert('Images only'); return; }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const currentSat = selectedSatellite ?? SATELLITES[0];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(155deg, #0D0B14 0%, #110E1C 40%, #0A0814 100%)',
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(253,218,54,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(253,218,54,0.03) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '800px',
          height: '800px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse at center, ${currentSat ? (currentSat.color + '12') : 'rgba(253,218,54,0.06)'} 0%, transparent 65%)`,
          transition: 'background 0.6s ease',
        }}
      />

      {/* Language + legal top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5 z-10">
        <div className="flex items-center gap-2">
          <AsciendeLogo variant="full" height={28} className="opacity-80" />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {language === 'en' ? 'ES' : 'EN'}
          </button>
        </div>
      </div>

      {/* ── SATELLITE SELECT: phone mockup + orbit ── */}
      {mode === 'satellite-select' && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: headerVisible ? 1 : 0,
            transition: 'opacity 0.7s ease',
            zIndex: 10,
          }}
        >
          {/* Outer container — fixed width so columns + phone stay centered */}
          <div className="relative flex items-center justify-center" style={{ width: 'min(920px, 96vw)', height: 'min(720px, 90vh)' }}>

            {/* Connector lines SVG — covers only this container */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%', zIndex: 1 }}
              viewBox="0 0 920 720"
              preserveAspectRatio="xMidYMid meet"
            >
              {[
                { id: 'lab',       x: 100,  y: 190 },
                { id: 'endurance', x: 100,  y: 360 },
                { id: 'nutrition', x: 100,  y: 530 },
                { id: 'academy',   x: 820, y: 255 },
                { id: 'motion',    x: 820, y: 440 },
              ].map(pos => {
                const sat = SATELLITES.find(s => s.id === pos.id)!;
                return (
                  <line
                    key={pos.id}
                    x1={pos.x} y1={pos.y}
                    x2={460} y2={360}
                    stroke={sat.color}
                    strokeOpacity="0.18"
                    strokeWidth="1.5"
                    strokeDasharray="6 8"
                  />
                );
              })}
            </svg>

            {/* Left satellite column */}
            <div
              className="absolute flex flex-col justify-center gap-4"
              style={{ left: 0, top: 0, bottom: 0, width: '170px', zIndex: 5 }}
            >
              {['lab', 'endurance', 'nutrition'].map(id => {
                const sat = SATELLITES.find(s => s.id === id)!;
                const Icon = sat.icon;
                return (
                  <button
                    key={sat.id}
                    onClick={() => handleSelectSatellite(sat)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 hover:scale-105"
                    style={{
                      background: `${sat.color}08`,
                      borderColor: `${sat.color}28`,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{ background: `${sat.color}18`, border: `1px solid ${sat.color}35` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: sat.color }} />
                    </div>
                    <span className="text-xs font-semibold leading-tight text-center" style={{ color: sat.color }}>
                      {language === 'es' ? sat.label_es : sat.label_en}
                    </span>
                    <span className="text-[9px] leading-tight text-center line-clamp-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {language === 'es' ? sat.desc_es : sat.desc_en}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right satellite column */}
            <div
              className="absolute flex flex-col justify-center gap-4"
              style={{ right: 0, top: 0, bottom: 0, width: '170px', zIndex: 5 }}
            >
              {['academy', 'motion'].map(id => {
                const sat = SATELLITES.find(s => s.id === id)!;
                const Icon = sat.icon;
                return (
                  <button
                    key={sat.id}
                    onClick={() => handleSelectSatellite(sat)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 hover:scale-105"
                    style={{
                      background: `${sat.color}08`,
                      borderColor: `${sat.color}28`,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{ background: `${sat.color}18`, border: `1px solid ${sat.color}35` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: sat.color }} />
                    </div>
                    <span className="text-xs font-semibold leading-tight text-center" style={{ color: sat.color }}>
                      {language === 'es' ? sat.label_es : sat.label_en}
                    </span>
                    <span className="text-[9px] leading-tight text-center line-clamp-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {language === 'es' ? sat.desc_es : sat.desc_en}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Center column: logo + phone + hint */}
            <div className="flex flex-col items-center gap-0" style={{ zIndex: 3 }}>
              {/* Logo + wordmark */}
              <div className="flex flex-col items-center mb-4">
                <AsciendeLogo variant="full" height={46} className="mb-1" />
                <div
                  style={{
                    fontFamily: "'Krona One', sans-serif",
                    fontSize: '1.25rem',
                    color: '#fdda36',
                    letterSpacing: '0.25em',
                    textShadow: '0 0 24px rgba(253,218,54,0.18)',
                  }}
                >
                  ASCIENDE
                </div>
              </div>

              {/* Phone outer frame */}
              <div
                className="relative"
                style={{
                  width: '260px',
                  height: '520px',
                  borderRadius: '50px',
                  background: 'linear-gradient(145deg, #211a32 0%, #130f1e 100%)',
                  border: '2.5px solid rgba(255,255,255,0.14)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                {/* Notch */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '80px',
                    height: '28px',
                    background: '#0a0814',
                    borderRadius: '0 0 18px 18px',
                    zIndex: 10,
                  }}
                />

                {/* Screen: Hub login preview */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ padding: '38px 22px 22px' }}
                >
                  <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: '3px' }}>
                      {language === 'es' ? 'HUB PRINCIPAL' : 'MAIN HUB'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
                      {language === 'es' ? 'Entrena · Nutre · Conecta' : 'Train · Nourish · Connect'}
                    </div>
                  </div>

                  <div className="w-full space-y-2.5">
                    <div
                      className="w-full rounded-xl px-4 py-3 flex items-center gap-2.5"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <Mail className="flex-shrink-0" style={{ width: '13px', height: '13px', color: 'rgba(255,255,255,0.25)' }} />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)' }}>
                        {language === 'es' ? 'Correo electrónico' : 'Email address'}
                      </span>
                    </div>
                    <div
                      className="w-full rounded-xl px-4 py-3 flex items-center gap-2.5"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <Lock className="flex-shrink-0" style={{ width: '13px', height: '13px', color: 'rgba(255,255,255,0.25)' }} />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)' }}>
                        {language === 'es' ? 'Contraseña' : 'Password'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleSelectSatellite(SATELLITES[0])}
                      className="w-full rounded-xl flex items-center justify-center gap-2 font-bold transition-all hover:brightness-110"
                      style={{
                        padding: '11px 16px',
                        background: 'linear-gradient(135deg, #fdda36 0%, #f5c400 100%)',
                        color: '#1a1428',
                        fontSize: '12px',
                      }}
                    >
                      {language === 'es' ? 'Ingresar al Hub' : 'Enter Hub'}
                      <ChevronRight style={{ width: '13px', height: '13px' }} />
                    </button>
                  </div>

                  <div className="w-full flex items-center gap-2 mt-4">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>
                      {language === 'es' ? 'o elige destino' : 'or choose destination'}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap justify-center">
                    {SATELLITES.filter(s => s.id !== 'hub').map(sat => {
                      const Icon = sat.icon;
                      return (
                        <button
                          key={sat.id}
                          onClick={() => handleSelectSatellite(sat)}
                          className="rounded-xl flex items-center justify-center transition-all hover:scale-110"
                          style={{
                            width: '34px',
                            height: '34px',
                            background: `${sat.color}14`,
                            border: `1px solid ${sat.color}30`,
                          }}
                          title={language === 'es' ? sat.label_es : sat.label_en}
                        >
                          <Icon style={{ width: '15px', height: '15px', color: sat.color }} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 40%)',
                    borderRadius: '48px',
                  }}
                />
              </div>

              {/* Home indicator + hint */}
              <div
                className="mt-3 rounded-full"
                style={{ width: '48px', height: '4px', background: 'rgba(255,255,255,0.18)' }}
              />
              <p
                className="mt-3 text-center"
                style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}
              >
                {language === 'es' ? 'Selecciona un destino' : 'Select a destination'}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ── LOGIN / SIGNUP / FORGOT ── */}
      {mode !== 'satellite-select' && (
      <div className="relative z-10 w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-4 md:px-8">

        {/* LOGIN */}
        {mode === 'login' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-400">
            {/* Header */}
            <div className="text-center mb-8 md:mb-10">
              {selectedSatellite && (
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full mb-5 border"
                  style={{
                    background: `${selectedSatellite.color}10`,
                    borderColor: `${selectedSatellite.color}30`,
                  }}
                >
                  {(() => { const Icon = selectedSatellite.icon; return <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: selectedSatellite.color }} />; })()}
                  <span className="text-sm md:text-base font-medium" style={{ color: selectedSatellite.color }}>
                    {language === 'es' ? selectedSatellite.label_es : selectedSatellite.label_en}
                  </span>
                </div>
              )}
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                {language === 'es' ? 'Bienvenido de vuelta' : 'Welcome back'}
              </h2>
              <p className="text-white/40 text-sm md:text-base lg:text-lg">
                {language === 'es' ? 'Ingresa tus credenciales para continuar' : 'Enter your credentials to continue'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm md:text-base">
                  {error}
                </div>
              )}

              <div className="space-y-3 md:space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/30" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={language === 'es' ? 'Correo electrónico' : 'Email address'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 md:pl-13 pr-4 py-3.5 md:py-4 lg:py-5 text-white placeholder-white/25 text-sm md:text-base focus:outline-none focus:border-[#fdda36]/50 focus:bg-white/8 transition-all"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={language === 'es' ? 'Contraseña' : 'Password'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 md:pl-13 pr-12 py-3.5 md:py-4 lg:py-5 text-white placeholder-white/25 text-sm md:text-base focus:outline-none focus:border-[#fdda36]/50 focus:bg-white/8 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); }}
                  className="text-xs md:text-sm text-white/35 hover:text-[#fdda36]/70 transition-colors"
                >
                  {language === 'es' ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 md:py-4 lg:py-5 rounded-xl font-semibold text-sm md:text-base lg:text-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f5c400 100%)', color: '#1a1428' }}
              >
                {loading ? (
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-[#1a1428]/40 border-t-[#1a1428] rounded-full animate-spin" />
                ) : (
                  <>
                    {language === 'es' ? 'Ingresar' : 'Sign In'}
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Google Sign In */}
            <div className="mt-5 md:mt-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-white/20 text-xs md:text-sm shrink-0">
                  {language === 'es' ? 'o continúa con' : 'or continue with'}
                </span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 md:py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Google "G" SVG logo */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1818l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5836-5.036-3.7105H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z" fill="#FBBC05"/>
                  <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1632 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
                </svg>
                <span className="text-white/70 text-sm md:text-base font-medium">
                  {language === 'es' ? 'Continuar con Google' : 'Continue with Google'}
                </span>
              </button>
            </div>

            <div className="mt-5 md:mt-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-white/20 text-xs md:text-sm">{language === 'es' ? 'o' : 'or'}</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <button
              type="button"
              onClick={() => { setMode('signup'); setSignupStep(1); setError(''); }}
              className="mt-5 md:mt-6 w-full py-3.5 md:py-4 lg:py-5 rounded-xl font-medium text-sm md:text-base border border-white/10 bg-white/3 text-white/70 hover:bg-white/8 hover:text-white hover:border-white/20 transition-all duration-200"
            >
              {language === 'es' ? 'Crear una cuenta' : 'Create an account'}
            </button>

            {!redirectUrl && onGoBack && (
              <button
                type="button"
                onClick={() => { onGoBack(); setError(''); }}
                className="mt-3 w-full flex items-center justify-center gap-2 text-white/25 hover:text-white/50 text-xs transition-colors py-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {language === 'es' ? 'Cambiar destino' : 'Change destination'}
              </button>
            )}
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-400">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#fdda36]/10 border border-[#fdda36]/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-[#fdda36]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {language === 'es' ? 'Recuperar acceso' : 'Reset password'}
              </h2>
              <p className="text-white/40 text-sm">
                {language === 'es' ? 'Te enviamos un enlace a tu correo' : "We'll send a link to your email"}
              </p>
            </div>

            {resetEmailSent ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-green-300 font-semibold mb-1">{language === 'es' ? 'Email enviado' : 'Email sent'}</p>
                <p className="text-green-300/60 text-sm">
                  {language === 'es' ? 'Revisa tu bandeja de entrada' : 'Check your inbox'}
                </p>
                <button
                  onClick={() => { setMode('login'); setResetEmailSent(false); }}
                  className="mt-4 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  {language === 'es' ? 'Volver al inicio de sesión' : 'Back to sign in'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={language === 'es' ? 'Correo electrónico' : 'Email address'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#fdda36]/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f5c400 100%)', color: '#1a1428' }}
                >
                  {loading ? <div className="w-4 h-4 border-2 border-[#1a1428]/40 border-t-[#1a1428] rounded-full animate-spin" /> : (language === 'es' ? 'Enviar enlace' : 'Send link')}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="w-full flex items-center justify-center gap-2 text-white/35 hover:text-white/60 text-sm transition-colors py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {language === 'es' ? 'Volver' : 'Back'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* SIGNUP */}
        {mode === 'signup' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-400">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-7">
              <button onClick={() => { signupStep === 1 ? setMode('login') : setSignupStep((signupStep - 1) as SignupStep); setError(''); }} className="text-white/30 hover:text-white/60 transition-colors mr-1">
                <ArrowLeft className="w-4 h-4" />
              </button>
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: s <= signupStep ? 'linear-gradient(90deg, #fdda36, #f5c400)' : 'rgba(255,255,255,0.08)',
                  }}
                />
              ))}
              <span className="text-white/30 text-xs ml-1">{signupStep}/3</span>
            </div>

            {/* STEP 1: Credentials */}
            {signupStep === 1 && (
              <form onSubmit={handleSignupStep1} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{language === 'es' ? 'Crea tu cuenta' : 'Create your account'}</h2>
                  <p className="text-white/40 text-sm">{language === 'es' ? 'Información básica para comenzar' : 'Basic info to get started'}</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder={language === 'es' ? 'Nombre' : 'First name'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#fdda36]/50 transition-all"
                  />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder={language === 'es' ? 'Apellido' : 'Last name'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#fdda36]/50 transition-all"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={language === 'es' ? 'Correo electrónico' : 'Email address'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#fdda36]/50 transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={language === 'es' ? 'Contraseña (mín. 6 caracteres)' : 'Password (min. 6 chars)'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#fdda36]/50 transition-all"
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border flex-shrink-0 cursor-pointer"
                    style={{
                      background: termsAccepted ? '#fdda36' : 'transparent',
                      borderColor: termsAccepted ? '#fdda36' : 'rgba(255,255,255,0.2)',
                      accentColor: '#fdda36'
                    }}
                  />
                  <span className="text-xs text-white/40 leading-relaxed">
                    {language === 'es' ? (
                      <TermsTextEs />
                    ) : (
                      <TermsTextEn />
                    )}
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || !termsAccepted}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f5c400 100%)', color: '#1a1428' }}
                >
                  {language === 'es' ? 'Continuar' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-white/20 text-xs shrink-0">
                    {language === 'es' ? 'o regístrate con' : 'or sign up with'}
                  </span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || !termsAccepted}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1818l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5836-5.036-3.7105H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z" fill="#FBBC05"/>
                    <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1632 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
                  </svg>
                  <span className="text-white/70 text-sm font-medium">
                    {language === 'es' ? 'Continuar con Google' : 'Continue with Google'}
                  </span>
                </button>
              </form>
            )}

            {/* STEP 2: Profile */}
            {signupStep === 2 && (
              <form onSubmit={(e) => { e.preventDefault(); setSignupStep(3); }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{language === 'es' ? 'Tu perfil' : 'Your profile'}</h2>
                  <p className="text-white/40 text-sm">{language === 'es' ? 'Personaliza tu experiencia' : 'Personalize your experience'}</p>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div
                      className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10"
                      style={{ background: avatarUrl ? 'transparent' : 'rgba(255,255,255,0.05)' }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-white/20" />
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/60 text-xs hover:bg-white/10 hover:text-white transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Subir foto' : 'Upload photo'}
                    </button>
                    <p className="text-white/25 text-xs mt-1">{language === 'es' ? 'Opcional, máx. 5MB' : 'Optional, max 5MB'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">{language === 'es' ? 'Fecha de nacimiento' : 'Date of birth'}</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={e => setDateOfBirth(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-white text-xs focus:outline-none focus:border-[#fdda36]/50 transition-all"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">{language === 'es' ? 'Sexo biológico' : 'Biological sex'}</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['male', 'female', 'other'] as const).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className="py-2.5 rounded-lg border text-xs font-medium transition-all"
                          style={{
                            background: gender === g ? 'rgba(253,218,54,0.15)' : 'rgba(255,255,255,0.03)',
                            borderColor: gender === g ? 'rgba(253,218,54,0.5)' : 'rgba(255,255,255,0.08)',
                            color: gender === g ? '#fdda36' : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {g === 'male' ? (language === 'es' ? 'M' : 'M') : g === 'female' ? (language === 'es' ? 'F' : 'F') : (language === 'es' ? 'O' : 'O')}
                        </button>
                      ))}
                    </div>
                    <p className="text-white/20 text-[10px] mt-1 leading-tight">{language === 'es' ? 'Para cálculos precisos' : 'For precise calculations'}</p>
                  </div>
                </div>

                {/* Sports */}
                <div>
                  <label className="block text-xs text-white/40 mb-2">
                    {language === 'es' ? `Tus deportes (máx. 3) — ${sports.length}/3` : `Your sports (max 3) — ${sports.length}/3`}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {SPORTS.map(s => {
                      const Icon = s.icon;
                      const sel = sports.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (sel) { setSports(sports.filter(x => x !== s.id)); if (s.id === 'other') setOtherSport(''); }
                            else if (sports.length < 3) setSports([...sports, s.id]);
                          }}
                          className="flex flex-col items-center p-2 rounded-xl border text-center transition-all duration-200"
                          style={{
                            background: sel ? 'rgba(253,218,54,0.12)' : 'rgba(255,255,255,0.03)',
                            borderColor: sel ? 'rgba(253,218,54,0.45)' : 'rgba(255,255,255,0.07)',
                          }}
                        >
                          <Icon className="w-4 h-4 mb-1" style={{ color: sel ? '#fdda36' : 'rgba(255,255,255,0.3)' }} />
                          <span className="text-[10px] leading-tight font-medium" style={{ color: sel ? '#fdda36' : 'rgba(255,255,255,0.4)' }}>
                            {language === 'es' ? s.nameEs : s.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {sports.includes('other') && (
                    <input
                      type="text"
                      value={otherSport}
                      onChange={e => setOtherSport(e.target.value)}
                      placeholder={language === 'es' ? 'Especifica tu deporte...' : 'Specify your sport...'}
                      className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#fdda36]/50 transition-all"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupStep(3)}
                    className="flex-none py-3.5 px-4 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white/60 hover:border-white/20 transition-all"
                  >
                    {language === 'es' ? 'Omitir' : 'Skip'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f5c400 100%)', color: '#1a1428' }}
                  >
                    {language === 'es' ? 'Continuar' : 'Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Final confirmation + create */}
            {signupStep === 3 && (
              <form onSubmit={handleSignupFinal} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{language === 'es' ? 'Todo listo' : 'All set'}</h2>
                  <p className="text-white/40 text-sm">{language === 'es' ? 'Confirma tu información' : 'Confirm your information'}</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>
                )}

                {/* Summary card */}
                <div className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#fdda36]/15 border border-[#fdda36]/25 flex items-center justify-center flex-shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <User className="w-5 h-5 text-[#fdda36]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{firstName} {lastName}</p>
                      <p className="text-white/40 text-xs truncate">{email}</p>
                    </div>
                  </div>

                  {selectedSatellite && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/6">
                      {(() => { const Icon = selectedSatellite.icon; return <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: selectedSatellite.color }} />; })()}
                      <span className="text-white/50 text-xs">
                        {language === 'es' ? 'Destino:' : 'Destination:'} <span className="text-white/70">{language === 'es' ? selectedSatellite.label_es : selectedSatellite.label_en}</span>
                      </span>
                    </div>
                  )}

                  {sports.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sports.slice(0, 3).map(s => {
                        const sp = SPORTS.find(x => x.id === s);
                        return sp ? (
                          <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(253,218,54,0.1)', color: 'rgba(253,218,54,0.7)', border: '1px solid rgba(253,218,54,0.15)' }}>
                            {language === 'es' ? sp.nameEs : sp.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #fdda36 0%, #f5c400 100%)', color: '#1a1428' }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-[#1a1428]/40 border-t-[#1a1428] rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      {language === 'es' ? 'Crear mi cuenta' : 'Create my account'}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
      )}

      {/* Legal footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 py-4 px-6 z-10">
        <a href="https://asciende.pro/impressum" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/45 text-[11px] transition-colors">Imprint</a>
        <span className="text-white/10">·</span>
        <a href="https://asciende.pro/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/45 text-[11px] transition-colors">{t('auth.privacyPolicy')}</a>
        <span className="text-white/10">·</span>
        <a href="https://asciende.pro/terms" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/45 text-[11px] transition-colors">{t('auth.termsConditions')}</a>
        <span className="text-white/10">·</span>
        <span className="text-white/15 text-[11px]">© {new Date().getFullYear()} Asciende Pro</span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Krona+One&display=swap');
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-4 { from { transform: translateY(16px); } to { transform: translateY(0); } }
        @keyframes slide-in-from-right-4 { from { transform: translateX(16px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-in { animation-fill-mode: both; animation-duration: 0.4s; }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-bottom-4 { animation-name: slide-in-from-bottom-4; }
        .slide-in-from-right-4 { animation-name: slide-in-from-right-4; }
        .duration-400 { animation-duration: 0.4s; }
        .duration-500 { animation-duration: 0.5s; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>
    </div>
  );
}
