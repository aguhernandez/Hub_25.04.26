import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  MapPin, Activity, Heart, Calendar, TrendingUp, CheckCircle,
  Lock, AlertCircle, Instagram, Youtube, ExternalLink, Copy,
  Zap, Globe, Share2, ArrowRight, Shield,
  BarChart2, Flame,
  ChevronDown, Dumbbell, Trophy, Star, Target, BookOpen, Play, GraduationCap, Award
} from 'lucide-react';
import asciendeLogoViolet from '../assets/Asciendelogo.png';

interface AthleteProfile {
  id: string;
  full_name: string;
  country: string;
  sport: string;
  avatar_url: string | null;
  profile_visibility: string;
  support_mode_enabled: boolean;
  tagline: string | null;
  cover_image_url: string | null;
  bio: string | null;
  payment_links: Record<string, string> | null;
  social_links: Record<string, string> | null;
  public_profile_slug: string | null;
  promo_video_url: string | null;
}

interface SupportProject {
  id: string;
  title: string;
  description: string;
  short_phrase: string;
  slug: string;
  category: string;
  goal_amount: number | null;
  goal_type: 'money' | 'in-kind' | 'other';
  currency: string;
  deadline: string | null;
  is_continuous: boolean;
  cover_media_url: string | null;
  status: string;
  verified_by: string | null;
  visible_supports_count: number;
  total_declared_amount: number;
}

interface TrainingSession {
  id: string;
  completed_at: string;
  scheduled_date: string | null;
  rpe: number | null;
  notes: string | null;
  title: string | null;
  type: 'gym' | 'endurance' | 'activity';
  sport: string | null;
}

interface TrainingStats {
  totalWorkouts: number;
  completedThisMonth: number;
  currentStreak: number;
  lastActivity: string | null;
  recentSessions: TrainingSession[];
}

interface CompletedCourse {
  course_external_id: string;
  completed_at: string;
  title: string | null;
  title_es: string | null;
  level: string | null;
  category: string | null;
  duration_hours: number | null;
}

const SPORT_EMOJI: Record<string, string> = {
  cycling: '🚴', running: '🏃', swimming: '🏊', triathlon: '🏆',
  football: '⚽', basketball: '🏀', tennis: '🎾', crossfit: '💪',
  weightlifting: '🏋️', climbing: '🧗', rowing: '🚣', athletics: '🏅',
  soccer: '⚽', volleyball: '🏐', baseball: '⚾', golf: '⛳',
};

const CATEGORY_COLORS: Record<string, string> = {
  travel: 'bg-sky-100 text-sky-700 border-sky-200',
  equipment: 'bg-orange-100 text-orange-700 border-orange-200',
  training: 'bg-teal-100 text-teal-700 border-teal-200',
  education: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  health: 'bg-rose-100 text-rose-700 border-rose-200',
};

const CATEGORY_LABELS: Record<string, { en: string; es: string }> = {
  travel: { en: 'Travel & Competitions', es: 'Viajes y Competencias' },
  equipment: { en: 'Equipment', es: 'Equipamiento' },
  training: { en: 'Training & Coaching', es: 'Entrenamiento' },
  education: { en: 'Education', es: 'Educación' },
  health: { en: 'Health & Recovery', es: 'Salud y Recuperación' },
};

const PAYMENT_METHODS: {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  isLink: boolean;
  svgIcon: string;
}[] = [
  {
    key: 'paypal',
    label: 'PayPal',
    color: '#003087',
    bgColor: '#009cde',
    isLink: true,
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.828l-1.116 7.06h3.44c.46 0 .85-.334.92-.79l.038-.197.733-4.64.047-.254a.932.932 0 0 1 .92-.79h.578c3.743 0 6.676-1.522 7.534-5.921.358-1.842.174-3.383-.7-4.263z"/></svg>`,
  },
  {
    key: 'mercadopago',
    label: 'Mercado Pago',
    color: '#009ee3',
    bgColor: '#009ee3',
    isLink: true,
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-6.07 6.07a.75.75 0 0 1-1.06 0L7.5 11.386a.75.75 0 1 1 1.06-1.06l2.402 2.4 5.54-5.538a.75.75 0 0 1 1.06 1.06z"/></svg>`,
  },
  {
    key: 'wise',
    label: 'Wise',
    color: '#9fe870',
    bgColor: '#9fe870',
    isLink: true,
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.595 3.103L13.3 17.418l-2.95-8.232L17.595 3.103zM6.405 3.103l7.246 5.082L10.35 17.42 6.405 3.103zM12 0L0 8.572l4.59 12.857L12 24l7.41-2.571L24 8.572 12 0z"/></svg>`,
  },
  {
    key: 'iban',
    label: 'IBAN / CBU',
    color: '#ffffff',
    bgColor: '#374151',
    isLink: false,
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 8a2 2 0 012-2h16a2 2 0 012 2v2H2V8zm0 4h20v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6zm5 3a1 1 0 000 2h2a1 1 0 000-2H7zm4 0a1 1 0 000 2h4a1 1 0 000-2h-4z"/></svg>`,
  },
  {
    key: 'mpesa',
    label: 'M-Pesa',
    color: '#ffffff',
    bgColor: '#00a651',
    isLink: false,
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 2H7C5.9 2 5 2.9 5 4v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 18c-.83 0-1.5-.67-1.5-1.5S11.17 17 12 17s1.5.67 1.5 1.5S12.83 20 12 20zm5-4H7V4h10v12z"/></svg>`,
  },
];

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function timeAgo(dateStr: string, lang: 'en' | 'es'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return lang === 'es' ? 'Hoy' : 'Today';
  if (days === 1) return lang === 'es' ? 'Ayer' : 'Yesterday';
  if (days < 7) return lang === 'es' ? `Hace ${days} días` : `${days} days ago`;
  if (days < 30) return lang === 'es' ? `Hace ${Math.floor(days / 7)} semanas` : `${Math.floor(days / 7)} weeks ago`;
  return lang === 'es' ? `Hace ${Math.floor(days / 30)} meses` : `${Math.floor(days / 30)} months ago`;
}

export default function PublicAthleteLandingPage() {
  const [athleteSlug, setAthleteSlug] = useState('');
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [projects, setProjects] = useState<SupportProject[]>([]);
  const [stats, setStats] = useState<TrainingStats>({
    totalWorkouts: 0, completedThisMonth: 0, currentStreak: 0,
    lastActivity: null, recentSessions: [],
  });
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [heroReady, setHeroReady] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const raw = parts[1] || '';
    setAthleteSlug(raw.replace(/^@/, '').toLowerCase());
  }, []);

  useEffect(() => {
    if (athleteSlug) loadProfile();
  }, [athleteSlug]);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const slug = athleteSlug.replace(/^@/, '');
      let profile: AthleteProfile | null = null;

      const { data: bySlug, error: slugError } = await supabase
        .from('profiles')
        .select('id, full_name, country, sport, avatar_url, profile_visibility, support_mode_enabled, tagline, cover_image_url, bio, payment_links, social_links, public_profile_slug, promo_video_url')
        .eq('public_profile_slug', slug)
        .maybeSingle();

      if (!slugError && bySlug) {
        profile = bySlug;
      } else {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(slug)) {
          const { data: byId } = await supabase
            .from('profiles')
            .select('id, full_name, country, sport, avatar_url, profile_visibility, support_mode_enabled, tagline, cover_image_url, bio, payment_links, social_links, public_profile_slug, promo_video_url')
            .eq('id', slug)
            .maybeSingle();
          profile = byId;
        }
      }

      if (!profile) throw new Error('not_found');
      if (profile.profile_visibility !== 'public') {
        setError('private');
        setLoading(false);
        return;
      }

      setAthlete(profile);

      const [projectsRes, logsRes, enduranceWorkoutsRes, endurancePlansRes] = await Promise.all([
        supabase
          .from('athlete_support_projects')
          .select('id, title, description, short_phrase, slug, category, goal_amount, goal_type, currency, deadline, is_continuous, cover_media_url, status, verified_by, visible_supports_count, total_declared_amount')
          .eq('athlete_id', profile.id)
          .eq('status', 'active')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('athlete_workouts')
          .select('id, completed_at, scheduled_date, rpe, notes, workouts(name)')
          .eq('athlete_id', profile.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(200),
        supabase
          .from('external_endurance_workouts')
          .select('id, name, sport, sub_discipline, scheduled_date, status, estimated_duration_minutes')
          .eq('athlete_id', profile.id)
          .eq('status', 'completed')
          .order('scheduled_date', { ascending: false })
          .limit(200),
        supabase
          .from('external_endurance_plans')
          .select('id, week_start_date, plan_data')
          .eq('athlete_id', profile.id)
          .order('week_start_date', { ascending: false })
          .limit(50),
      ]);

      setProjects(projectsRes.data || []);

      const { data: completionsData } = await supabase
        .from('course_completions')
        .select('course_external_id, completed_at, course_title, course_title_es')
        .eq('athlete_id', profile.id)
        .order('completed_at', { ascending: false });

      if (completionsData && completionsData.length > 0) {
        setCompletedCourses(completionsData.map((c: any) => ({
          course_external_id: c.course_external_id,
          completed_at: c.completed_at,
          title: c.course_title || null,
          title_es: c.course_title_es || null,
          level: null,
          category: null,
          duration_hours: null,
        })));
      }

      const gymLogs: TrainingSession[] = (logsRes.data || []).map((l: any) => ({
        id: l.id,
        completed_at: l.completed_at,
        scheduled_date: l.scheduled_date || null,
        rpe: l.rpe || null,
        notes: l.notes || null,
        title: l.workouts?.name || null,
        type: 'gym' as const,
        sport: null,
      }));

      const enduranceSessions: TrainingSession[] = (enduranceWorkoutsRes.data || []).map((w: any) => ({
        id: `ew-${w.id}`,
        completed_at: w.scheduled_date,
        scheduled_date: w.scheduled_date,
        rpe: null,
        notes: null,
        title: w.name || w.sport || null,
        type: 'endurance' as const,
        sport: w.sport || w.sub_discipline || null,
      }));

      const planSessions: TrainingSession[] = [];
      for (const plan of (endurancePlansRes.data || [])) {
        const days: any[] = plan.plan_data?.days || [];
        for (const day of days) {
          if (day.completed) {
            const dayDate = day.date || plan.week_start_date;
            planSessions.push({
              id: `ep-${plan.id}-${dayDate}`,
              completed_at: dayDate,
              scheduled_date: dayDate,
              rpe: day.rpe || null,
              notes: day.notes || null,
              title: day.name || day.session_type || day.sport || null,
              type: 'endurance' as const,
              sport: day.sport || null,
            });
          }
        }
      }

      const allLogs: TrainingSession[] = [...gymLogs, ...enduranceSessions, ...planSessions]
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = allLogs.filter(l => new Date(l.completed_at) >= monthStart).length;

      let streak = 0;
      const daySet = new Set(allLogs.map(l => new Date(l.completed_at).toDateString()));
      const cur = new Date();
      while (daySet.has(cur.toDateString())) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      }

      setStats({
        totalWorkouts: allLogs.length,
        completedThisMonth: thisMonth,
        currentStreak: streak,
        lastActivity: allLogs[0]?.completed_at || null,
        recentSessions: allLogs.slice(0, 5),
      });
    } catch (err: any) {
      setError(err.message || 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const shareProject = (project: SupportProject) => {
    const url = `https://hub.asciende.pro/athlete/@${athleteSlug}/project/${project.slug}`;
    if (navigator.share) {
      navigator.share({ title: project.title, text: project.short_phrase, url });
    } else {
      copyText(url, `share-${project.id}`);
    }
  };

  const tr = (en: string, es: string) => lang === 'es' ? es : en;

  const progress = (p: SupportProject) => {
    if (!p.goal_amount || p.goal_amount === 0) return 0;
    return Math.min(100, Math.round((p.total_declared_amount / p.goal_amount) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex flex-col items-center justify-center gap-6">
        <div className="w-10 h-10 border-2 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
        <img src={asciendeLogoViolet} alt="Asciende" className="h-6 opacity-40" />
      </div>
    );
  }

  if (error || !athlete) {
    const isPrivate = error === 'private';
    return (
      <div className="min-h-screen bg-[#09090f] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
          {isPrivate ? <Lock className="w-9 h-9 text-white/30" /> : <AlertCircle className="w-9 h-9 text-white/30" />}
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          {isPrivate ? tr('Private Profile', 'Perfil Privado') : tr('Not Found', 'No encontrado')}
        </h2>
        <p className="text-white/40 text-sm mb-10 max-w-xs leading-relaxed">
          {isPrivate
            ? tr("This athlete's support page is private or hasn't been activated.", 'La página de apoyo de este deportista es privada o no ha sido activada.')
            : tr('This athlete profile does not exist.', 'Este perfil de deportista no existe.')}
        </p>
        <img src={asciendeLogoViolet} alt="Asciende" className="h-5 opacity-20" />
      </div>
    );
  }

  const sportEmoji = SPORT_EMOJI[athlete.sport?.toLowerCase()] || '🏅';
  const paymentLinks = athlete.payment_links || {};
  const socialLinks = athlete.social_links || {};
  const totalSupporters = projects.reduce((s, p) => s + (p.visible_supports_count || 0), 0);
  const videoId = extractYouTubeId(athlete.promo_video_url || '');

  return (
    <div className="min-h-screen bg-[#f7f7f9] text-[#1a1a2e] overflow-x-hidden">

      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col" ref={heroRef}>

        <div className="absolute inset-0">
          {athlete.cover_image_url ? (
            <>
              <img
                src={athlete.cover_image_url}
                alt=""
                className="w-full h-full object-cover object-center"
                style={{ filter: 'brightness(0.50)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-[#f7f7f9]" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#111119] via-[#151520] to-[#09090f]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    radial-gradient(ellipse at 15% 25%, rgba(253,218,54,0.08) 0%, transparent 55%),
                    radial-gradient(ellipse at 85% 75%, rgba(255,255,255,0.03) 0%, transparent 45%)
                  `
                }}
              />
            </div>
          )}
        </div>

        {/* Top nav bar */}
        <div className="relative z-20 flex items-center justify-between px-5 pt-5 sm:pt-7">
          <img src={asciendeLogoViolet} alt="Asciende" className="h-7 drop-shadow-lg" />

          {/* Language toggle — prominent */}
          <button
            onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-sm font-bold text-white transition-all shadow-lg"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === 'en' ? 'ES' : 'EN'}</span>
          </button>
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pt-6 pb-24 text-center max-w-lg mx-auto w-full">
          <div
            className="w-full transition-all duration-700"
            style={{
              opacity: heroReady ? 1 : 0,
              transform: heroReady ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            {/* Avatar */}
            <div className="relative inline-block mb-5">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-[3px] border-[#fdda36] shadow-2xl shadow-black/60">
                {athlete.avatar_url ? (
                  <img src={athlete.avatar_url} alt={athlete.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] flex items-center justify-center">
                    <span className="text-4xl font-black text-[#fdda36]">{athlete.full_name?.charAt(0) || '?'}</span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-full bg-[#09090f] border-2 border-[#fdda36]/30 flex items-center justify-center text-xl shadow-lg">
                {sportEmoji}
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2 text-white drop-shadow-xl">
              {athlete.full_name}
            </h1>

            {athlete.public_profile_slug && (
              <p className="text-[#fdda36]/60 text-sm font-mono mb-3 tracking-wide">
                @{athlete.public_profile_slug}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 text-white/50 text-sm mb-5">
              {athlete.country && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {athlete.country}
                </span>
              )}
              {athlete.sport && (
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  {athlete.sport}
                </span>
              )}
            </div>

            {athlete.tagline ? (
              <p className="text-base sm:text-lg text-white/75 font-light italic leading-relaxed max-w-sm mx-auto mb-8">
                &ldquo;{athlete.tagline}&rdquo;
              </p>
            ) : (
              <div className="mb-8" />
            )}

            {totalSupporters > 0 && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex -space-x-1.5">
                  {[...Array(Math.min(3, totalSupporters))].map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-[#fdda36]/80 to-[#fdda36]/40 border-2 border-[#09090f]"
                    />
                  ))}
                </div>
                <span className="text-white/50 text-sm">
                  {totalSupporters} {tr('supporters', 'apoyos')}
                </span>
              </div>
            )}

            {/* CTA */}
            {athlete.support_mode_enabled ? (
              <a
                href="#support"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#fdda36] text-[#0d0b0a] font-black text-base rounded-full shadow-xl shadow-[#fdda36]/25 hover:bg-[#ffe84d] hover:shadow-[#fdda36]/40 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Heart className="w-5 h-5" fill="currentColor" />
                {tr('Support This Athlete', 'Apoyar a este Deportista')}
              </a>
            ) : (
              <a
                href="#story"
                className="inline-flex items-center gap-2.5 px-8 py-4 border border-white/15 text-white/70 font-bold text-base rounded-full hover:bg-white/6 hover:text-white transition-all duration-200"
              >
                {tr('Follow the Journey', 'Seguir el Camino')}
                <ArrowRight className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-8 rounded-full border-2 border-white/20 flex items-start justify-center pt-1.5">
              <div className="w-1 h-2 rounded-full bg-white/40 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── TWO-COLUMN CONTENT ───────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className={`${videoId || athlete.support_mode_enabled || Object.values(socialLinks).some(Boolean) ? 'lg:grid lg:grid-cols-[1fr_420px] lg:gap-10 lg:items-start' : ''}`}>

          {/* ── LEFT COLUMN ──────────────────────────────────────────── */}
          <div className="space-y-12">

            {/* My Story */}
            <section id="story">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#1a1a2e]/30">
                  {tr('My Story', 'Mi Historia')}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="relative rounded-2xl border border-gray-200 bg-white p-6 overflow-hidden">
                <div
                  className="absolute -top-8 -left-8 w-24 h-24 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(253,218,54,0.06) 0%, transparent 70%)' }}
                />
                {athlete.bio ? (
                  <p className="text-[#1a1a2e]/65 leading-[1.85] text-sm sm:text-base whitespace-pre-wrap relative z-10">
                    {athlete.bio}
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4 relative z-10 text-center">
                    <BookOpen className="w-8 h-8 text-[#1a1a2e]/15" />
                    <p className="text-[#1a1a2e]/25 text-sm">
                      {tr("This athlete hasn't shared their story yet.", 'Este deportista aún no compartió su historia.')}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Active Projects — main CTA (primary project only) */}
            {projects.length > 0 && (() => {
              const primaryProject = [...projects].sort((a, b) => (b.goal_amount ?? 0) - (a.goal_amount ?? 0))[0];
              const pct = progress(primaryProject);
              const catColor = CATEGORY_COLORS[primaryProject.category] || 'bg-gray-100 text-[#1a1a2e]/40 border-gray-200';
              const catLabel = CATEGORY_LABELS[primaryProject.category]?.[lang] || primaryProject.category;
              const hasGoal = primaryProject.goal_amount && primaryProject.goal_amount > 0;
              const deadlineDate = primaryProject.deadline ? new Date(primaryProject.deadline) : null;
              const daysLeft = deadlineDate ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)) : null;
              return (
                <section id="support">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#1a1a2e]/30">
                      {tr('Support My Journey', 'Apoyá mi Camino')}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  <div
                    className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm shadow-gray-200/60"
                  >
                    {/* Accent top line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(253,218,54,0.5), transparent)' }}
                    />

                    {/* Cover image */}
                    {primaryProject.cover_media_url && (
                      <div className="h-40 overflow-hidden">
                        <img
                          src={primaryProject.cover_media_url}
                          alt={primaryProject.title}
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent to-[#0d0d14]/80" />
                      </div>
                    )}

                    <div className="p-5 relative z-10">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-black text-[#1a1a2e] leading-tight mb-1">{primaryProject.title}</h3>
                          {primaryProject.short_phrase && (
                            <p className="text-[#1a1a2e]/55 text-sm leading-relaxed">{primaryProject.short_phrase}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 uppercase tracking-wide ${catColor}`}>
                          {catLabel}
                        </span>
                      </div>

                      {/* Description */}
                      {primaryProject.description && (
                        <p className="text-[#1a1a2e]/45 text-sm leading-relaxed mb-4 line-clamp-3">
                          {primaryProject.description}
                        </p>
                      )}

                      {/* Progress bar */}
                      {hasGoal && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-[#1a1a2e]/40">{tr('Progress', 'Progreso')}</span>
                            <span className="text-[#fdda36] font-bold">
                              {primaryProject.total_declared_amount.toLocaleString()} / {primaryProject.goal_amount!.toLocaleString()} {primaryProject.currency} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 100 ? '#34d399' : pct >= 60 ? '#fdda36' : 'linear-gradient(90deg, #fdda36, #fbbf24)',
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-4 text-xs text-[#1a1a2e]/35 mb-5">
                        {primaryProject.visible_supports_count > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Heart className="w-3 h-3 text-rose-400/70" />
                            {primaryProject.visible_supports_count} {tr('supporters', 'apoyos')}
                          </span>
                        )}
                        {daysLeft !== null && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {daysLeft === 0
                              ? tr('Last day!', '¡Último día!')
                              : `${daysLeft} ${tr('days left', 'días restantes')}`}
                          </span>
                        )}
                        {primaryProject.is_continuous && (
                          <span className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-[#fdda36]/60" />
                            {tr('Ongoing', 'Continuo')}
                          </span>
                        )}
                      </div>

                      {/* Support CTA + Share */}
                      <div className="flex gap-2.5">
                        <a
                          href="#payment-methods"
                          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#fdda36] text-[#0d0b0a] font-black text-sm hover:bg-[#ffe84d] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 shadow-lg shadow-[#fdda36]/20"
                        >
                          <Heart className="w-4 h-4" fill="currentColor" />
                          {tr('Support This Project', 'Apoyar Este Proyecto')}
                        </a>
                        <button
                          onClick={() => shareProject(primaryProject)}
                          aria-label="Share"
                          className="flex items-center justify-center w-12 rounded-xl border border-gray-200 text-[#1a1a2e]/50 hover:bg-gray-100 hover:text-[#1a1a2e] transition-all duration-150"
                        >
                          {copiedKey === `share-${primaryProject.id}`
                            ? <CheckCircle className="w-4 h-4 text-teal-500" />
                            : <Share2 className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* Asciende Certifications */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#1a1a2e]/30">
                  {tr('Asciende Academy', 'Academia Asciende')}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="relative rounded-2xl border border-[#7c3aed]/15 bg-white overflow-hidden shadow-sm shadow-gray-200/60">
                <div
                  className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)' }}
                />
                <div
                  className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.04) 0%, transparent 70%)' }}
                />
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent)' }} />

                <div className="relative z-10 p-6">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <GraduationCap className="w-5 h-5 text-[#7c3aed]" />
                    </div>
                    <div>
                      <p className="text-[#7c3aed] text-xs font-black uppercase tracking-widest mb-1">
                        {tr('Asciende Academy', 'Academia Asciende')}
                      </p>
                      <p className="text-[#1a1a2e]/50 text-xs leading-relaxed">
                        {lang === 'es'
                          ? 'Asciende colabora con herramientas y ciencia para que los deportistas sean mejores. Certifica que este atleta completó los siguientes cursos:'
                          : 'Asciende supports athletes with science-based tools. This athlete completed the following certified courses:'}
                      </p>
                    </div>
                  </div>

                  {completedCourses.length > 0 ? (
                    <div className="space-y-2.5">
                      {completedCourses.map((course) => {
                        const rawTitle = lang === 'es' && course.title_es ? course.title_es : course.title;
                        const displayTitle = rawTitle
                          ? rawTitle
                          : course.course_external_id
                              .replace(/-/g, ' ')
                              .replace(/\b\w/g, (l) => l.toUpperCase());
                        const completedYear = course.completed_at
                          ? new Date(course.completed_at).getFullYear()
                          : null;

                        return (
                          <div
                            key={course.course_external_id}
                            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                          >
                            <Award className="w-4 h-4 text-[#7c3aed] flex-shrink-0" />
                            <span className="flex-1 text-[#1a1a2e] text-sm font-medium leading-snug">
                              {displayTitle}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {completedYear && (
                                <span className="text-[10px] text-[#1a1a2e]/30">{completedYear}</span>
                              )}
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <BookOpen className="w-4 h-4 text-[#1a1a2e]/20 flex-shrink-0" />
                      <span className="text-[#1a1a2e]/35 text-sm">
                        {lang === 'es'
                          ? 'Aún no hay cursos completados.'
                          : 'No completed courses yet.'}
                      </span>
                    </div>
                  )}

                  <div className="mt-5 pt-4 border-t border-gray-200 flex items-center gap-2">
                    <img src={asciendeLogoViolet} alt="Asciende" className="h-4 opacity-50" />
                    <span className="text-[#1a1a2e]/30 text-[10px] font-medium tracking-wide uppercase">
                      {tr('Verified by Asciende Academy', 'Verificado por Academia Asciende')}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Training & Progress */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#1a1a2e]/30">
                  {tr('Training & Progress', 'Entrenamiento y Progreso')}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: Dumbbell, value: stats.totalWorkouts, label: tr('Sessions', 'Sesiones'), sub: tr('total logged', 'registradas') },
                  { icon: BarChart2, value: stats.completedThisMonth, label: tr('This Month', 'Este Mes'), sub: tr('sessions', 'sesiones') },
                  { icon: Flame, value: stats.currentStreak, label: tr('Streak', 'Racha'), sub: tr('days', 'días') },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-4 text-center"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-[#fdda36]/5 -translate-y-3 translate-x-3 pointer-events-none" />
                    <s.icon className="w-5 h-5 text-[#fdda36] mx-auto mb-2.5 relative z-10" />
                    <div className="text-3xl font-black text-[#1a1a2e] leading-none mb-1 relative z-10">{s.value}</div>
                    <div className="text-[10px] text-[#1a1a2e]/35 uppercase tracking-wider relative z-10">{s.label}</div>
                  </div>
                ))}
              </div>

              {stats.recentSessions.length > 0 ? (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#fdda36] animate-pulse" />
                    <span className="text-xs font-semibold text-[#1a1a2e]/50 uppercase tracking-wider">
                      {tr('Recent Activity', 'Actividad Reciente')}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {stats.recentSessions.map((session, i) => {
                      const isEndurance = session.type === 'endurance';
                      const sport = session.sport?.toLowerCase() || '';
                      const isCycling = sport.includes('cycling') || sport.includes('bike') || sport.includes('ciclismo');
                      const isRunning = sport.includes('running') || sport.includes('run') || sport.includes('correr');
                      const isSwimming = sport.includes('swim') || sport.includes('natacion');
                      const displayTitle = session.title || session.notes || (isEndurance ? tr('Endurance Session', 'Sesión de Resistencia') : tr('Training Session', 'Sesión de Entrenamiento'));
                      const sportLabel = session.sport ? session.sport.charAt(0).toUpperCase() + session.sport.slice(1) : null;
                      return (
                        <div key={session.id} className="flex items-center gap-3 px-4 py-3.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? (isEndurance ? 'bg-teal-500/15' : 'bg-[#fdda36]/15') : 'bg-gray-100'}`}>
                            {isEndurance ? (
                              isCycling ? (
                                <TrendingUp className={`w-3.5 h-3.5 ${i === 0 ? 'text-teal-400' : 'text-[#1a1a2e]/30'}`} />
                              ) : isRunning ? (
                                <Activity className={`w-3.5 h-3.5 ${i === 0 ? 'text-teal-400' : 'text-[#1a1a2e]/30'}`} />
                              ) : isSwimming ? (
                                <Zap className={`w-3.5 h-3.5 ${i === 0 ? 'text-teal-400' : 'text-[#1a1a2e]/30'}`} />
                              ) : (
                                <Activity className={`w-3.5 h-3.5 ${i === 0 ? 'text-teal-400' : 'text-[#1a1a2e]/30'}`} />
                              )
                            ) : (
                              <Dumbbell className={`w-3.5 h-3.5 ${i === 0 ? 'text-[#fdda36]' : 'text-[#1a1a2e]/30'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1a1a2e]/80 truncate">
                              {displayTitle}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-[#1a1a2e]/30">{timeAgo(session.completed_at, lang)}</span>
                              {sportLabel && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[#1a1a2e]/30 capitalize">{sportLabel}</span>
                              )}
                            </div>
                          </div>
                          {session.rpe && (
                            <div className="flex-shrink-0">
                              <div
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  background: session.rpe >= 8 ? 'rgba(239,68,68,0.15)' : session.rpe >= 6 ? 'rgba(251,146,60,0.15)' : 'rgba(52,211,153,0.15)',
                                  color: session.rpe >= 8 ? '#f87171' : session.rpe >= 6 ? '#fb923c' : '#34d399',
                                }}
                              >
                                RPE {session.rpe}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-8 text-center">
                  <Activity className="w-8 h-8 text-[#1a1a2e]/15 mx-auto mb-2" />
                  <p className="text-[#1a1a2e]/30 text-sm">{tr('No sessions logged yet.', 'Aún no hay sesiones registradas.')}</p>
                </div>
              )}
            </section>

          </div>
          {/* ── END LEFT COLUMN ────────────────────────────────────────── */}

          {/* ── RIGHT COLUMN ─────────────────────────────────────────── */}
          <div className="mt-12 lg:mt-0">
            <div className="lg:sticky lg:top-6 space-y-8">

              {/* Promo Video */}
              {videoId && (
                <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black shadow-sm">
                  <div className="relative" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                      title="Promo video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                  <div className="px-4 py-3 flex items-center gap-2 bg-white border-t border-gray-200">
                    <Play className="w-3.5 h-3.5 text-[#fdda36]" />
                    <span className="text-xs text-[#1a1a2e]/40 font-medium">
                      {tr("Athlete's promo video", 'Video promocional del deportista')}
                    </span>
                  </div>
                </div>
              )}

              {/* Support / Projects */}
              <div id="support" className="space-y-6">

                {/* Active Projects — collapsible list */}
                {athlete.support_mode_enabled && projects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#1a1a2e]/30">
                        {tr('Active Projects', 'Proyectos Activos')}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm shadow-gray-200/40">
                      {projects.map((project, idx) => {
                        const pct = progress(project);
                        const catColor = CATEGORY_COLORS[project.category] || 'bg-gray-100 text-[#1a1a2e]/50 border-gray-200';
                        const catLabel = (CATEGORY_LABELS[project.category] || { en: project.category, es: project.category })[lang];
                        const isExpanded = expandedProject === project.id;
                        const hasGoal = project.goal_amount && project.goal_amount > 0;

                        return (
                          <div key={project.id} className={idx > 0 ? 'border-t border-gray-100' : ''}>
                            {/* Title row — always visible, clickable to expand */}
                            <button
                              onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors duration-150 text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-bold text-[#1a1a2e] leading-tight block truncate">{project.title}</span>
                                {!isExpanded && project.short_phrase && (
                                  <span className="text-xs text-[#1a1a2e]/40 block truncate mt-0.5">{project.short_phrase}</span>
                                )}
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 uppercase tracking-wide ${catColor}`}>
                                {catLabel}
                              </span>
                              <ChevronDown className={`w-4 h-4 flex-shrink-0 text-[#1a1a2e]/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                                {project.description && (
                                  <p className="text-[#1a1a2e]/55 text-sm leading-relaxed pt-3 mb-3">
                                    {project.description}
                                  </p>
                                )}

                                {hasGoal && (
                                  <div className="mb-3 p-3 rounded-xl bg-white border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[#1a1a2e] font-bold text-sm">
                                        {project.total_declared_amount.toLocaleString()} / {project.goal_amount!.toLocaleString()} {project.currency}
                                      </span>
                                      <span className="text-lg font-black" style={{ color: pct >= 100 ? '#34d399' : '#fdda36' }}>
                                        {pct}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                          width: `${pct}%`,
                                          background: pct >= 100
                                            ? 'linear-gradient(90deg, #34d399, #10b981)'
                                            : 'linear-gradient(90deg, #fdda36, #ffd020)',
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center gap-3 text-xs text-[#1a1a2e]/35 mb-3">
                                  {project.visible_supports_count > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Heart className="w-3 h-3" />
                                      {project.visible_supports_count} {tr('supporters', 'apoyos')}
                                    </span>
                                  )}
                                  {project.deadline && !project.is_continuous && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {tr('Ends', 'Cierra')} {new Date(project.deadline).toLocaleDateString(
                                        lang === 'es' ? 'es-ES' : 'en-US',
                                        { month: 'short', day: 'numeric', year: 'numeric' }
                                      )}
                                    </span>
                                  )}
                                  {project.is_continuous && (
                                    <span className="flex items-center gap-1">
                                      <Zap className="w-3 h-3" />
                                      {tr('Ongoing', 'Contínuo')}
                                    </span>
                                  )}
                                </div>

                                <a
                                  href={`/athlete/@${athleteSlug}/project/${project.slug}`}
                                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#fdda36] text-[#0d0b0a] font-black text-sm rounded-xl hover:bg-[#ffe84d] transition-all duration-150 shadow-md shadow-[#fdda36]/15"
                                >
                                  <Heart className="w-3.5 h-3.5" fill="currentColor" />
                                  {tr('Support This Project', 'Apoyar este Proyecto')}
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Payment Methods — shown whenever any link is configured */}
                {PAYMENT_METHODS.some(({ key }) => Boolean(paymentLinks[key])) && (
                  <div id="payment-methods">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#1a1a2e]/30">
                        {tr('Support Directly', 'Apoyar Directamente')}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    <p className="text-[#1a1a2e]/35 text-xs mb-4 leading-relaxed text-center">
                      {tr(
                        'Payments go directly to the athlete — Asciende never holds any funds.',
                        'Los pagos van directamente al deportista — Asciende no retiene fondos.'
                      )}
                    </p>

                    <div className="flex flex-col gap-3">
                      {PAYMENT_METHODS.map(({ key, label, bgColor, isLink, svgIcon }) => {
                        const value = paymentLinks[key] || '';
                        if (!value) return null;

                        const href = isLink
                          ? (value.startsWith('http') ? value : `https://${value}`)
                          : null;

                        const inner = (
                          <div className="flex items-center gap-3 w-full">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: bgColor }}
                              dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" fill="white" width="20" height="20">${svgIcon.replace(/<svg[^>]*>/, '').replace('</svg>', '')}</svg>` }}
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <div className="text-sm font-bold text-[#1a1a2e]">{label}</div>
                              <div className="text-xs text-[#1a1a2e]/45 truncate">{value}</div>
                            </div>
                            {href ? (
                              <ExternalLink className="w-4 h-4 text-[#1a1a2e]/40 flex-shrink-0" />
                            ) : (
                              copiedKey === key
                                ? <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
                                : <Copy className="w-4 h-4 text-[#1a1a2e]/40 flex-shrink-0" />
                            )}
                          </div>
                        );

                        if (href) {
                          return (
                            <a
                              key={key}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-100 hover:border-gray-400 transition-all duration-150 group"
                            >
                              {inner}
                            </a>
                          );
                        }

                        return (
                          <button
                            key={key}
                            onClick={() => copyText(value, key)}
                            className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-100 hover:border-gray-400 transition-all duration-150 w-full"
                          >
                            {inner}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Follow the Journey */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#1a1a2e]/30">
                    {tr('Follow the Journey', 'Seguí el Camino')}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {Object.values(socialLinks).some(Boolean) ? (
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(socialLinks).map(([key, value]) => {
                      if (!value) return null;
                      const icons: Record<string, any> = { instagram: Instagram, youtube: Youtube, tiktok: Zap, other: ExternalLink };
                      const labels: Record<string, string> = {
                        instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok',
                        other: tr('Website', 'Sitio Web'),
                      };
                      const Icon = icons[key] || ExternalLink;
                      const href = value.startsWith('http') ? value : `https://${value}`;

                      return (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-sm font-medium text-[#1a1a2e]/65 hover:bg-gray-100 hover:text-[#1a1a2e] hover:border-gray-300 transition-all duration-150"
                        >
                          <Icon className="w-4 h-4" />
                          {labels[key] || key}
                          <ExternalLink className="w-3 h-3 opacity-35" />
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center">
                    <div className="flex items-center justify-center gap-3 text-[#1a1a2e]/20">
                      <Instagram className="w-5 h-5" />
                      <Youtube className="w-5 h-5" />
                      <Zap className="w-5 h-5" />
                    </div>
                    <p className="text-[#1a1a2e]/25 text-sm mt-2">
                      {tr('Social links not configured yet.', 'Redes sociales no configuradas aún.')}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
          {/* ── END RIGHT COLUMN ─────────────────────────────────────────── */}

        </div>
      </div>

      {/* ─── FOOTER 1: ASCIENDE BRAND (FULL WIDTH) ─────────────────────── */}
      <section className="w-full bg-gradient-to-br from-[#1a1a2e] via-[#151520] to-[#0f0f18] py-16 sm:py-24 px-4 mt-12">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            <div
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(253,218,54,0.12) 0%, transparent 70%)' }}
            />
            <div
              className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(253,218,54,0.08) 0%, transparent 70%)' }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <img src={asciendeLogoViolet} alt="Asciende" className="h-10" />
                <div className="h-6 w-px bg-white/20" />
                <span className="text-white/40 text-xs font-black tracking-[0.24em] uppercase">
                  {tr('The Athletes\' Support Platform', 'Plataforma de Apoyo del Deportista')}
                </span>
              </div>

              <div className="mb-8">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight max-w-3xl">
                  {lang === 'es'
                    ? 'Construido para apoyo deportistas. Libre. Basado en ciencia. Siempre.'
                    : 'Built to support athletes. Free. Science-based. Always.'}
                </h2>

                <p className="text-white/50 text-lg leading-relaxed max-w-2xl mb-8">
                  {lang === 'es'
                    ? 'Asciende brinda herramientas gratuitas basadas en ciencia para mejorar el rendimiento, gestionar el entrenamiento y conectar con una comunidad que cree en tu potencial. Sin comisiones. Sin intermediarios.'
                    : 'Asciende provides free, science-based tools to improve performance, manage training, and connect with a community that believes in your potential. No commissions. No intermediaries.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
                {[
                  { icon: Trophy, label: lang === 'es' ? 'Planes de Entrenamiento' : 'Training Plans' },
                  { icon: TrendingUp, label: lang === 'es' ? 'Seguimiento de Rendimiento' : 'Performance Tracking' },
                  { icon: Flame, label: lang === 'es' ? '100% Gratis' : '100% Free' },
                  { icon: Shield, label: lang === 'es' ? 'Sin comisiones' : 'No commissions' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/6 border border-white/10 hover:bg-white/8 hover:border-[#fdda36]/20 transition-all duration-200">
                    <Icon className="w-4 h-4 text-[#fdda36] flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-white/70 font-medium">{label}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://asciende.pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#fdda36] text-[#1a1a2e] font-black text-sm sm:text-base hover:bg-[#ffe84d] active:scale-95 transition-all duration-150 shadow-lg shadow-[#fdda36]/30 group"
                >
                  {lang === 'es'
                    ? 'También soy deportista - Conocer más'
                    : 'You\'re also an athlete? Learn more'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                </a>
                <a
                  href="https://asciende.pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl border border-white/20 text-white font-bold text-sm sm:text-base hover:bg-white/5 hover:border-[#fdda36]/40 transition-all duration-200"
                >
                  {lang === 'es' ? 'Explorar Asciende' : 'Explore Asciende'}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER 2: LEGAL DISCLAIMER ───────────────────────────────── */}
      <footer className="px-4 pt-10 pb-14 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gray-200 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-[#1a1a2e]/60" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1a1a2e]/80 uppercase tracking-wide">
                {tr('Legal Disclaimer', 'Aviso Legal')}
              </h4>
              <p className="text-[#1a1a2e]/35 text-xs mt-0.5">
                {tr('Important — Please read', 'Importante — Por favor lea')}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-[#1a1a2e]/60 text-sm leading-relaxed">
            <p className="font-semibold text-[#1a1a2e]/80">
              {tr(
                'Asciende does NOT process, receive, or hold any payments.',
                'Asciende NO procesa, recibe ni retiene ningún pago.'
              )}
            </p>
            <p>
              {lang === 'es'
                ? 'Todas las contribuciones van directamente al deportista a través de sus propios canales de pago. Asciende no actúa como intermediario financiero ni plataforma de recaudación de fondos.'
                : 'All contributions go directly to the athlete through their own payment channels. Asciende does not act as a financial intermediary or fundraising platform.'
              }
            </p>
            <p>
              {lang === 'es'
                ? 'El deportista es el único responsable de la gestión de sus cuentas de cobro, la declaración de ingresos, el pago de impuestos y el cumplimiento de las leyes fiscales y financieras de su país o jurisdicción. Asciende no asume ninguna responsabilidad legal ni financiera por las transacciones realizadas entre el deportista y sus apoyadores.'
                : 'The athlete is solely responsible for managing their collection accounts, declaring income, paying taxes, and complying with the financial and tax laws of their country or jurisdiction. Asciende assumes no legal or financial responsibility for transactions between the athlete and their supporters.'
              }
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={asciendeLogoViolet} alt="Asciende" className="h-5 opacity-30" />
            <span className="text-[#1a1a2e]/20 text-xs">
              {tr('The Athletes\' Support Platform', 'La Plataforma de Apoyo del Deportista')}
            </span>
          </div>

          <button
            onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
            className="inline-flex items-center gap-2 text-[#1a1a2e]/50 text-sm font-semibold hover:text-[#1a1a2e] transition-colors px-4 py-2 rounded-full border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-100"
          >
            <Globe className="w-4 h-4" />
            {lang === 'en' ? 'Ver en Español' : 'View in English'}
          </button>
        </div>
      </footer>

    </div>
  );
}
