import { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Download, X, Camera, CheckCircle, Dumbbell, Clock, TrendingUp, Layers, Copy, Link, Flame, Moon, Sun } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const PRODUCTION_URL = 'https://hub.asciende.pro';

interface WorkoutShareCardProps {
  workoutData: {
    date: string;
    duration: number;
    totalVolume: number;
    bestSet: { exercise: string; weight: number; reps: number } | null;
    exerciseCount?: number;
    setCount?: number;
    workoutName?: string;
    notes?: string;
  };
  onClose: () => void;
}

type Theme = 'dark' | 'light' | 'fire';
type Format = 'square' | 'story';

const THEMES: { id: Theme; label: string; labelEs: string; icon: any }[] = [
  { id: 'dark',  label: 'Dark',  labelEs: 'Oscuro', icon: Moon  },
  { id: 'light', label: 'Light', labelEs: 'Claro',  icon: Sun   },
  { id: 'fire',  label: 'Fire',  labelEs: 'Fuego',  icon: Flame },
];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMutedBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.restore();
}

export default function WorkoutShareCard({ workoutData, onClose }: WorkoutShareCardProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<'profile' | 'project'>('profile');
  const [theme, setTheme] = useState<Theme>('dark');
  const [format, setFormat] = useState<Format>('square');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { logoImgRef.current = img; setLogoLoaded(true); };
    img.onerror = () => { setLogoLoaded(true); };
    img.src = '/Asciende_logo_blanco.png';
  }, []);

  useEffect(() => {
    if (!profile?.id) { setProjectLoaded(true); return; }
    supabase
      .from('athlete_support_projects')
      .select('id, title, short_phrase, slug')
      .eq('athlete_id', profile.id)
      .eq('status', 'active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setActiveProject(data); setShareMode('project'); }
        setProjectLoaded(true);
      });
  }, [profile?.id]);

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
    return `${m}m`;
  };

  const generateCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = format === 'story' ? 1920 : 1080;
    canvas.width = W;
    canvas.height = H;

    const T = {
      dark:  {
        bg: ['#060810', '#0a1020', '#060810'],
        text: '#ffffff', sub: 'rgba(255,255,255,0.5)',
        accent: '#fdda36', accentDim: 'rgba(253,218,54,0.12)',
        border: 'rgba(253,218,54,0.3)', ctaBg: '#fdda36', ctaText: '#060810',
        box: 'rgba(255,255,255,0.06)', boxBorder: 'rgba(255,255,255,0.1)',
        noiseAlpha: 0.04,
      },
      light: {
        bg: ['#f0f4f8', '#ffffff', '#f0f4f8'],
        text: '#0f172a', sub: 'rgba(15,23,42,0.5)',
        accent: '#0f172a', accentDim: 'rgba(15,23,42,0.08)',
        border: 'rgba(15,23,42,0.2)', ctaBg: '#0f172a', ctaText: '#ffffff',
        box: 'rgba(0,0,0,0.04)', boxBorder: 'rgba(0,0,0,0.12)',
        noiseAlpha: 0.02,
      },
      fire:  {
        bg: ['#0c0400', '#1a0700', '#0c0400'],
        text: '#ffffff', sub: 'rgba(255,255,255,0.5)',
        accent: '#ff6b00', accentDim: 'rgba(255,107,0,0.15)',
        border: 'rgba(255,107,0,0.4)', ctaBg: '#ff6b00', ctaText: '#ffffff',
        box: 'rgba(255,107,0,0.08)', boxBorder: 'rgba(255,107,0,0.25)',
        noiseAlpha: 0.04,
      },
    }[theme];

    // ── BACKGROUND ──────────────────────────────────────────────────────────
    const bgG = ctx.createLinearGradient(0, 0, W * 0.6, H);
    bgG.addColorStop(0, T.bg[0]);
    bgG.addColorStop(0.5, T.bg[1]);
    bgG.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    // Subtle diagonal texture lines
    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = 1;
    for (let i = -H; i < W + H; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }
    ctx.restore();

    // Large faint number watermark
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = T.accent;
    ctx.font = `bold ${format === 'story' ? 500 : 340}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(String(workoutData.setCount ?? ''), W + 20, H * 0.7);
    ctx.restore();

    if (uploadedImage) {
      try {
        const img = new Image();
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = uploadedImage; });
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.drawImage(img, 0, 0, W, H);
        ctx.restore();
        const overlay = ctx.createLinearGradient(0, 0, 0, H);
        overlay.addColorStop(0, T.bg[0] + 'f0');
        overlay.addColorStop(0.4, T.bg[0] + 'cc');
        overlay.addColorStop(1, T.bg[0] + 'f8');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, W, H);
      } catch {}
    }

    // ── TOP ACCENT BAR ───────────────────────────────────────────────────────
    const barG = ctx.createLinearGradient(0, 0, W, 0);
    barG.addColorStop(0, 'transparent');
    barG.addColorStop(0.15, T.accent);
    barG.addColorStop(0.85, T.accent);
    barG.addColorStop(1, 'transparent');
    ctx.fillStyle = barG;
    ctx.fillRect(0, 0, W, 8);

    // ── BRAND ────────────────────────────────────────────────────────────────
    const topY = format === 'story' ? 100 : 64;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${format === 'story' ? 32 : 26}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('ASCIENDE', 72, topY);

    // Workout badge (top right)
    const badgeW = 230;
    ctx.fillStyle = T.accentDim;
    roundRect(ctx, W - badgeW - 72, topY - 28, badgeW, 48, 24);
    ctx.fill();
    ctx.strokeStyle = T.border;
    ctx.lineWidth = 1.5;
    roundRect(ctx, W - badgeW - 72, topY - 28, badgeW, 48, 24);
    ctx.stroke();
    ctx.fillStyle = T.accent;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(language === 'es' ? 'ENTRENAMIENTO' : 'WORKOUT', W - badgeW / 2 - 72, topY + 4);

    // ── ATHLETE NAME ──────────────────────────────────────────────────────────
    const nameY = format === 'story' ? 200 : 170;
    ctx.fillStyle = T.text;
    ctx.font = `bold ${format === 'story' ? 72 : 64}px sans-serif`;
    ctx.textAlign = 'center';
    const name = profile?.full_name || (language === 'es' ? 'Atleta' : 'Athlete');
    ctx.fillText(name.length > 24 ? name.slice(0, 22) + '…' : name, W / 2, nameY);

    // Workout name
    if (workoutData.workoutName) {
      ctx.fillStyle = T.sub;
      ctx.font = `${format === 'story' ? 32 : 28}px sans-serif`;
      const wn = workoutData.workoutName;
      ctx.fillText(wn.length > 42 ? wn.slice(0, 40) + '…' : wn, W / 2, nameY + (format === 'story' ? 56 : 46));
    }

    // Date
    const dateVal = new Date(workoutData.date + 'T12:00:00');
    const dateStr = dateVal.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const dateY = nameY + (format === 'story' ? 108 : 92);
    ctx.fillStyle = T.accent + 'bb';
    ctx.font = `${format === 'story' ? 26 : 22}px sans-serif`;
    ctx.fillText(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), W / 2, dateY);

    // Divider
    ctx.strokeStyle = T.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, dateY + 24);
    ctx.lineTo(W - 80, dateY + 24);
    ctx.stroke();

    // ── HERO STAT (Duration) ──────────────────────────────────────────────────
    const heroY = dateY + (format === 'story' ? 120 : 96);
    ctx.fillStyle = T.text;
    ctx.font = `bold ${format === 'story' ? 160 : 130}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(formatDuration(workoutData.duration), W / 2, heroY);
    ctx.fillStyle = T.accent;
    ctx.font = `bold ${format === 'story' ? 34 : 28}px sans-serif`;
    ctx.fillText(language === 'es' ? 'duración' : 'duration', W / 2, heroY + (format === 'story' ? 52 : 44));

    // ── STATS GRID ────────────────────────────────────────────────────────────
    const statsY = heroY + (format === 'story' ? 130 : 104);
    const stats = [
      { v: `${Math.round(workoutData.totalVolume).toLocaleString()}`, u: 'kg', l: language === 'es' ? 'Volumen' : 'Volume' },
      { v: String(workoutData.exerciseCount ?? '—'), u: '', l: language === 'es' ? 'Ejercicios' : 'Exercises' },
      { v: String(workoutData.setCount ?? '—'), u: '', l: language === 'es' ? 'Series' : 'Sets' },
    ];

    const sW = 284, sH = format === 'story' ? 164 : 144, sGap = 20;
    const sTotalW = stats.length * sW + (stats.length - 1) * sGap;
    const sStartX = (W - sTotalW) / 2;

    stats.forEach(({ v, u, l }, i) => {
      const sx = sStartX + i * (sW + sGap);
      ctx.fillStyle = T.box;
      roundRect(ctx, sx, statsY, sW, sH, 20);
      ctx.fill();
      ctx.strokeStyle = T.boxBorder;
      ctx.lineWidth = 1.5;
      roundRect(ctx, sx, statsY, sW, sH, 20);
      ctx.stroke();

      // Accent top line
      const lineG = ctx.createLinearGradient(sx, statsY, sx + sW, statsY);
      lineG.addColorStop(0, 'transparent');
      lineG.addColorStop(0.5, T.accent + '88');
      lineG.addColorStop(1, 'transparent');
      ctx.fillStyle = lineG;
      roundRect(ctx, sx, statsY, sW, 3, 1.5);
      ctx.fill();

      ctx.fillStyle = T.text;
      ctx.font = `bold ${format === 'story' ? 44 : 40}px sans-serif`;
      ctx.textAlign = 'center';
      const valX = sx + sW / 2;
      const valY = statsY + sH / 2 + (format === 'story' ? 12 : 10);
      if (u) {
        const vw = ctx.measureText(v).width;
        ctx.fillText(v, valX - 16, valY);
        ctx.fillStyle = T.accent;
        ctx.font = `bold ${format === 'story' ? 22 : 20}px sans-serif`;
        ctx.fillText(u, valX + vw / 2 - 4, valY);
        ctx.fillStyle = T.text;
      } else {
        ctx.fillText(v, valX, valY);
      }
      ctx.fillStyle = T.accent + 'cc';
      ctx.font = `bold ${format === 'story' ? 20 : 18}px sans-serif`;
      ctx.fillText(l, valX, statsY + sH / 2 + (format === 'story' ? 48 : 44));
    });

    // ── BEST SET CARD ──────────────────────────────────────────────────────────
    if (workoutData.bestSet) {
      const bsY = statsY + sH + (format === 'story' ? 32 : 24);
      ctx.fillStyle = T.accentDim;
      roundRect(ctx, 80, bsY, W - 160, format === 'story' ? 140 : 120, 20);
      ctx.fill();
      ctx.strokeStyle = T.border;
      ctx.lineWidth = 1.5;
      roundRect(ctx, 80, bsY, W - 160, format === 'story' ? 140 : 120, 20);
      ctx.stroke();

      // Left accent line
      ctx.fillStyle = T.accent;
      roundRect(ctx, 80, bsY, 6, format === 'story' ? 140 : 120, 3);
      ctx.fill();

      ctx.fillStyle = T.accent;
      ctx.font = `bold ${format === 'story' ? 22 : 20}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(language === 'es' ? 'MEJOR SERIE' : 'BEST SET', 110, bsY + (format === 'story' ? 44 : 38));

      ctx.fillStyle = T.text;
      ctx.font = `bold ${format === 'story' ? 36 : 32}px sans-serif`;
      const ex = workoutData.bestSet.exercise;
      ctx.fillText(ex.length > 32 ? ex.slice(0, 30) + '…' : ex, 110, bsY + (format === 'story' ? 88 : 80));

      ctx.fillStyle = T.accent;
      ctx.font = `bold ${format === 'story' ? 36 : 32}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`${workoutData.bestSet.weight} kg × ${workoutData.bestSet.reps}`, W - 110, bsY + (format === 'story' ? 88 : 80));
    }

    // ── CTA BANNER ────────────────────────────────────────────────────────────
    const ctaH = format === 'story' ? 180 : 162;
    const ctaY = H - ctaH - 80;
    ctx.fillStyle = T.ctaBg;
    roundRect(ctx, 80, ctaY, W - 160, ctaH, 24);
    ctx.fill();

    const slug = (profile as any)?.public_profile_slug || profile?.id || '';
    ctx.fillStyle = T.ctaText;
    if (shareMode === 'project' && activeProject) {
      ctx.font = `bold ${format === 'story' ? 40 : 36}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(language === 'es' ? 'Apoya Mi Proyecto' : 'Support My Project', W / 2, ctaY + (format === 'story' ? 60 : 52));
      ctx.font = `${format === 'story' ? 28 : 24}px sans-serif`;
      const phrase = activeProject.short_phrase || activeProject.title;
      ctx.fillText(phrase.length > 52 ? phrase.slice(0, 49) + '…' : phrase, W / 2, ctaY + (format === 'story' ? 108 : 96));
      ctx.globalAlpha = 0.55;
      ctx.font = `bold ${format === 'story' ? 20 : 18}px monospace`;
      ctx.fillText(`hub.asciende.pro/athlete/${slug}/project/${activeProject.slug}`, W / 2, ctaY + (format === 'story' ? 152 : 140));
      ctx.globalAlpha = 1;
    } else {
      ctx.font = `bold ${format === 'story' ? 40 : 36}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(language === 'es' ? 'Sigue Mi Progreso' : 'Follow My Journey', W / 2, ctaY + (format === 'story' ? 60 : 52));
      ctx.font = `${format === 'story' ? 28 : 24}px sans-serif`;
      ctx.fillText(language === 'es' ? 'Cada sesión me acerca a mi meta' : 'Every session gets me closer', W / 2, ctaY + (format === 'story' ? 108 : 96));
      ctx.globalAlpha = 0.55;
      ctx.font = `bold ${format === 'story' ? 20 : 18}px monospace`;
      ctx.fillText(`hub.asciende.pro/athlete/${slug}`, W / 2, ctaY + (format === 'story' ? 152 : 140));
      ctx.globalAlpha = 1;
    }

    // Bottom bar
    ctx.fillStyle = barG;
    ctx.fillRect(0, H - 8, W, 8);
  }, [profile, workoutData, uploadedImage, shareMode, theme, format, activeProject, language]);

  useEffect(() => {
    if (!projectLoaded || !logoLoaded) return;
    const raf = requestAnimationFrame(() => generateCard());
    return () => cancelAnimationFrame(raf);
  }, [projectLoaded, logoLoaded, generateCard]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const getShareUrl = () => {
    const slug = (profile as any)?.public_profile_slug || profile?.id || '';
    return (shareMode === 'project' && activeProject)
      ? `${PRODUCTION_URL}/athlete/${slug}/project/${activeProject.slug}`
      : `${PRODUCTION_URL}/athlete/${slug}`;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = workoutData.date;
      a.download = `workout-${format}-${dateStr}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getShareUrl()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);
    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) { handleDownload(); return; }
      const file = new File([blob], `workout-${Date.now()}.png`, { type: 'image/png' });
      const shareUrl = getShareUrl();
      const text = (shareMode === 'project' && activeProject)
        ? (language === 'es'
          ? `Entreno duro persiguiendo mi meta. Apoya mi proyecto: ${activeProject.title}`
          : `Training hard and chasing my goal. Support my project: ${activeProject.title}`)
        : (language === 'es'
          ? 'Entrenamiento completado. Sigue mi progreso en Asciende!'
          : 'Workout done. Follow my progress on Asciende!');

      let didShare = false;
      if (navigator.share) {
        try {
          const shareData: ShareData = {
            title: `${profile?.full_name || 'Athlete'} — ${language === 'es' ? 'Entrenamiento' : 'Workout'}`,
            text,
            url: shareUrl,
          };
          if (navigator.canShare?.({ files: [file] })) shareData.files = [file];
          await navigator.share(shareData);
          didShare = true;
        } catch (e: any) {
          if (e?.name !== 'AbortError') { handleDownload(); didShare = true; }
        }
      }
      if (!didShare) { handleDownload(); await navigator.clipboard.writeText(shareUrl).catch(() => {}); }
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch {
      handleDownload();
    } finally {
      setSharing(false);
    }
  };

  const themeColors: Record<Theme, string> = {
    dark: '#fdda36',
    light: '#0f172a',
    fire: '#ff6b00',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-xl w-full my-4 shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-400/30">
              <Dumbbell className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {language === 'es' ? 'Compartir Entrenamiento' : 'Share Workout'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'es' ? 'Imagen lista para Instagram, Stories y más' : 'Ready for Instagram, Stories and more'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Clock,      v: formatDuration(workoutData.duration), l: language === 'es' ? 'Duración' : 'Duration' },
              { icon: TrendingUp, v: `${Math.round(workoutData.totalVolume).toLocaleString()}kg`, l: language === 'es' ? 'Volumen' : 'Volume' },
              { icon: Dumbbell,   v: String(workoutData.exerciseCount ?? '—'), l: language === 'es' ? 'Ejercicios' : 'Exercises' },
              { icon: Layers,     v: String(workoutData.setCount ?? '—'), l: language === 'es' ? 'Series' : 'Sets' },
            ].map(({ icon: Icon, v, l }) => (
              <div key={l} className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 text-center border border-neutral-200 dark:border-neutral-700">
                <Icon className="w-3.5 h-3.5 text-neutral-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-none">{v}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">{l}</p>
              </div>
            ))}
          </div>

          {/* Format selector */}
          <div>
            <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
              {language === 'es' ? 'Formato' : 'Format'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'square' as Format, label: language === 'es' ? 'Cuadrado (Feed)' : 'Square (Feed)', sub: '1080 × 1080' },
                { id: 'story'  as Format, label: language === 'es' ? 'Vertical (Stories)' : 'Vertical (Stories)', sub: '1080 × 1920' },
              ].map(({ id, label, sub }) => (
                <button
                  key={id}
                  onClick={() => setFormat(id)}
                  className={`py-2.5 px-3 rounded-xl text-left border-2 transition-all ${
                    format === id
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <p className={`text-xs font-bold ${format === id ? 'text-amber-700 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-300'}`}>{label}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Theme selector */}
          <div>
            <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
              {language === 'es' ? 'Estilo' : 'Style'}
            </p>
            <div className="flex gap-2">
              {THEMES.map(({ id, label, labelEs, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                    theme === id
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: theme === id ? undefined : themeColors[id] }} />
                  {language === 'es' ? labelEs : label}
                </button>
              ))}
            </div>
          </div>

          {/* Share mode */}
          {activeProject && (
            <div>
              <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
                {language === 'es' ? 'Mensaje' : 'Message'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'profile' as const, title: language === 'es' ? 'Sigue mi Progreso' : 'Follow My Journey', sub: language === 'es' ? 'Enlaza a tu perfil' : 'Links to your profile' },
                  { mode: 'project' as const, title: language === 'es' ? 'Apoya mi Proyecto' : 'Support My Project', sub: activeProject.title },
                ].map(({ mode, title, sub }) => (
                  <button key={mode} onClick={() => setShareMode(mode)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      shareMode === mode
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                    }`}>
                    <p className={`font-bold text-xs ${shareMode === mode ? 'text-amber-700 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}`}>{title}</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photo upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl hover:border-amber-400 transition-colors text-xs text-neutral-500 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400"
          >
            <Camera className="w-4 h-4" />
            {uploadedImage
              ? (language === 'es' ? 'Cambiar foto de fondo' : 'Change background photo')
              : (language === 'es' ? 'Agregar foto de fondo (opcional)' : 'Add background photo (optional)')}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          {/* Canvas preview */}
          <div className="rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700">
            {!projectLoaded ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <canvas ref={canvasRef} className="w-full h-auto block" style={{ maxWidth: '100%' }} />
                <p className="text-[10px] text-center text-neutral-500 py-1.5">
                  {format === 'story' ? '1080 × 1920' : '1080 × 1080'} px
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm font-medium rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              {language === 'es' ? 'Guardar' : 'Save'}
            </button>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-4 py-2.5 border text-sm font-medium rounded-xl transition-all ${
                copied
                  ? 'border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Link className="w-4 h-4" />}
              {copied ? (language === 'es' ? 'Copiado' : 'Copied') : (language === 'es' ? 'Copiar link' : 'Copy link')}
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-60 shadow-lg ${
                shared
                  ? 'bg-green-500 text-white shadow-green-500/25'
                  : 'bg-[#fdda36] text-[#060810] hover:bg-[#ffd01a] shadow-amber-400/25'
              }`}
            >
              {shared ? <CheckCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {sharing
                ? (language === 'es' ? 'Compartiendo...' : 'Sharing…')
                : shared
                ? (language === 'es' ? '¡Compartido!' : 'Shared!')
                : (language === 'es' ? 'Compartir' : 'Share')}
            </button>
          </div>

          <p className="text-[10px] text-center text-neutral-400 dark:text-neutral-500">
            {language === 'es'
              ? 'Guarda la imagen y compártela directamente en Instagram, Stories, WhatsApp y mas'
              : 'Save the image and share it directly on Instagram, Stories, WhatsApp and more'}
          </p>
        </div>
      </div>
    </div>
  );
}
