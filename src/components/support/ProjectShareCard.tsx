import { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Download, X, Camera, CheckCircle, Link, Heart, Target, Users, Sparkles, Instagram } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export interface ProjectShareData {
  id: string;
  title: string;
  description?: string;
  short_phrase?: string;
  category?: string;
  goal_amount?: number;
  goal_type?: 'money' | 'in-kind' | 'other';
  currency?: string;
  total_declared_amount?: number;
  visible_supports_count?: number;
  cover_media_url?: string;
  slug?: string;
  athlete_name?: string;
}

interface ProjectShareCardProps {
  project: ProjectShareData;
  onClose: () => void;
}

type Theme = 'impact' | 'bold' | 'minimal';
type Format = 'square' | 'story';

// Brand colors from Asciende
const BRAND_PRIMARY = '#fdda36';
const BRAND_DARK = '#0f172a';
const BRAND_ACCENT = '#3b82f6';

const CATEGORY_META: Record<string, { label: string; labelEs: string; color: string; accent: string }> = {
  travel:    { label: 'Travel',    labelEs: 'Viaje',         color: '#f97316', accent: '#fed7aa' },
  equipment: { label: 'Equipment', labelEs: 'Equipamiento',  color: '#3b82f6', accent: '#bfdbfe' },
  training:  { label: 'Training',  labelEs: 'Entrenamiento', color: '#22c55e', accent: '#bbf7d0' },
  education: { label: 'Education', labelEs: 'Educación',     color: '#8b5cf6', accent: '#ddd6fe' },
  health:    { label: 'Health',    labelEs: 'Salud',         color: '#ec4899', accent: '#fbcfe8' },
  default:   { label: 'Project',   labelEs: 'Proyecto',      color: BRAND_PRIMARY, accent: '#fef9c3' },
};

const THEMES: { id: Theme; label: string; labelEs: string }[] = [
  { id: 'impact',  label: 'Impact',  labelEs: 'Impacto'  },
  { id: 'bold',    label: 'Bold',    labelEs: 'Fuerte'   },
  { id: 'minimal', label: 'Clean',   labelEs: 'Limpio'   },
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

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

export default function ProjectShareCard({ project, onClose }: ProjectShareCardProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('impact');
  const [format, setFormat] = useState<Format>('square');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const cat = CATEGORY_META[project.category || ''] ?? CATEGORY_META.default;
  const athleteName = project.athlete_name || profile?.full_name || (language === 'es' ? 'Atleta' : 'Athlete');
  const progressPct = project.goal_type === 'money' && project.goal_amount && project.goal_amount > 0
    ? Math.min(100, Math.round(((project.total_declared_amount || 0) / project.goal_amount) * 100))
    : null;

  useEffect(() => {
    if (project.cover_media_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { setCoverImage(project.cover_media_url!); setImageLoaded(true); };
      img.onerror = () => setImageLoaded(true);
      img.src = project.cover_media_url;
    } else {
      setImageLoaded(true);
    }
  }, [project.cover_media_url]);

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
      impact: {
        bg: ['#0f172a', '#1a2747', '#0f172a'],
        text: '#ffffff',
        sub: 'rgba(255,255,255,0.65)',
        box: 'rgba(255,255,255,0.08)',
        boxBorder: `${BRAND_PRIMARY}66`,
        ctaBg: BRAND_PRIMARY,
        ctaText: BRAND_DARK,
        progressBg: 'rgba(255,255,255,0.12)',
      },
      bold: {
        bg: [cat.color + 'f0', cat.color + 'dd', '#0f172a'],
        text: cat.color === BRAND_PRIMARY ? BRAND_DARK : '#ffffff',
        sub: cat.color === BRAND_PRIMARY ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.75)',
        box: 'rgba(255,255,255,0.14)',
        boxBorder: 'rgba(255,255,255,0.3)',
        ctaBg: BRAND_DARK,
        ctaText: cat.color,
        progressBg: 'rgba(255,255,255,0.22)',
      },
      minimal: {
        bg: ['#f9fafb', '#ffffff', '#f3f4f6'],
        text: BRAND_DARK,
        sub: 'rgba(15,23,42,0.6)',
        box: 'rgba(0,0,0,0.06)',
        boxBorder: `${BRAND_PRIMARY}77`,
        ctaBg: BRAND_DARK,
        ctaText: BRAND_PRIMARY,
        progressBg: 'rgba(0,0,0,0.1)',
      },
    }[theme];

    // ── BACKGROUND ──────────────────────────────────────────────────────────
    const bgG = ctx.createLinearGradient(0, 0, W * 0.6, H);
    bgG.addColorStop(0, T.bg[0]);
    bgG.addColorStop(0.55, T.bg[1]);
    bgG.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    // Cover image background (blurred / faded)
    const imgSrc = uploadedImage || coverImage;
    if (imgSrc) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = imgSrc; });
        ctx.save();
        ctx.globalAlpha = theme === 'minimal' ? 0.08 : 0.18;
        const ar = img.width / img.height;
        let dw = W, dh = W / ar;
        if (dh < H) { dh = H; dw = H * ar; }
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        ctx.restore();
        const overlay = ctx.createLinearGradient(0, 0, 0, H);
        overlay.addColorStop(0, T.bg[0] + 'f0');
        overlay.addColorStop(0.4, T.bg[1] + 'cc');
        overlay.addColorStop(1, T.bg[0] + 'fc');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, W, H);
      } catch {}
    }

    // Texture: subtle cross-hatch lines for impact/bold
    if (theme !== 'minimal') {
      ctx.save();
      ctx.globalAlpha = 0.03;
      ctx.strokeStyle = BRAND_PRIMARY;
      ctx.lineWidth = 1;
      for (let x = -H; x < W + H; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + H, H);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── TOP ACCENT BAR ───────────────────────────────────────────────────────
    const barG = ctx.createLinearGradient(0, 0, W, 0);
    barG.addColorStop(0, 'transparent');
    barG.addColorStop(0.15, BRAND_PRIMARY);
    barG.addColorStop(0.85, BRAND_PRIMARY);
    barG.addColorStop(1, 'transparent');
    ctx.fillStyle = barG;
    ctx.fillRect(0, 0, W, 12);

    const pad = 80;
    const topY = format === 'story' ? 100 : 66;

    // ── LOGO & BRAND ────────────────────────────────────────────────────────
    // Draw Asciende logo indicator with symbol
    ctx.fillStyle = BRAND_PRIMARY;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('◆ ASCIENDE', pad, topY);

    // Category pill
    const catLabel = (language === 'es' ? cat.labelEs : cat.label).toUpperCase();
    const pillW = Math.min(280, ctx.measureText(catLabel).width + 56);
    ctx.fillStyle = cat.color + '32';
    roundRect(ctx, W - pillW - pad, topY - 30, pillW, 52, 26);
    ctx.fill();
    ctx.strokeStyle = cat.color + '99';
    ctx.lineWidth = 1.8;
    roundRect(ctx, W - pillW - pad, topY - 30, pillW, 52, 26);
    ctx.stroke();
    ctx.fillStyle = cat.color;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(catLabel, W - pillW / 2 - pad, topY + 6);

    // ── ATHLETE NAME ─────────────────────────────────────────────────────────
    const nameY = format === 'story' ? 210 : 178;
    ctx.fillStyle = T.text;
    ctx.font = `bold ${format === 'story' ? 50 : 42}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(truncate(athleteName, 26), W / 2, nameY);

    // Sub: "proyecto de apoyo" label
    ctx.fillStyle = BRAND_PRIMARY;
    ctx.font = `bold ${format === 'story' ? 26 : 20}px sans-serif`;
    ctx.fillText(
      language === 'es' ? 'PROYECTO DE APOYO' : 'SUPPORT PROJECT',
      W / 2,
      nameY + (format === 'story' ? 54 : 44)
    );

    // ── TITLE ────────────────────────────────────────────────────────────────
    const titleY = nameY + (format === 'story' ? 160 : 130);
    const titleFontSize = format === 'story' ? 84 : 68;
    ctx.fillStyle = T.text;
    ctx.font = `bold ${titleFontSize}px sans-serif`;
    ctx.textAlign = 'center';

    const words = project.title.split(' ');
    const maxLineW = W - pad * 2 - 40;
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxLineW && current) {
        lines.push(current);
        current = word;
        if (lines.length === 1) break;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    const displayLines = lines.slice(0, 2);
    if (words.length > displayLines.join(' ').split(' ').length) {
      displayLines[displayLines.length - 1] = truncate(displayLines[displayLines.length - 1], 22);
    }

    const lineH = titleFontSize * 1.12;
    displayLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, titleY + i * lineH);
    });

    // ── SHORT PHRASE ─────────────────────────────────────────────────────────
    const phraseY = titleY + displayLines.length * lineH + (format === 'story' ? 36 : 24);
    if (project.short_phrase) {
      ctx.fillStyle = T.sub;
      ctx.font = `${format === 'story' ? 32 : 26}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(truncate(project.short_phrase, 64), W / 2, phraseY);
    }

    // Divider line
    const dividerY = (project.short_phrase ? phraseY : titleY + displayLines.length * lineH) + (format === 'story' ? 56 : 40);
    ctx.strokeStyle = BRAND_PRIMARY + '55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, dividerY);
    ctx.lineTo(W - pad, dividerY);
    ctx.stroke();

    // ── STATS BOXES ──────────────────────────────────────────────────────────
    const statsY = dividerY + (format === 'story' ? 44 : 32);
    const statBoxes: { icon: string; value: string; label: string }[] = [];

    if (progressPct !== null) {
      statBoxes.push({
        icon: '💰',
        value: `${progressPct}%`,
        label: language === 'es' ? 'Financiado' : 'Funded',
      });
    }
    if (project.visible_supports_count && project.visible_supports_count > 0) {
      statBoxes.push({
        icon: '🤝',
        value: String(project.visible_supports_count),
        label: language === 'es' ? 'Apoyos' : 'Supporters',
      });
    }
    if (project.goal_type === 'money' && project.goal_amount) {
      const curr = project.currency || 'USD';
      statBoxes.push({
        icon: '🎯',
        value: `${curr} ${project.goal_amount.toLocaleString()}`,
        label: language === 'es' ? 'Meta' : 'Goal',
      });
    }

    if (statBoxes.length > 0) {
      const sH = format === 'story' ? 128 : 108;
      const sGap = 20;
      const n = Math.min(statBoxes.length, 3);
      const sW = (W - pad * 2 - sGap * (n - 1)) / n;

      statBoxes.slice(0, n).forEach(({ value, label }, i) => {
        const sx = pad + i * (sW + sGap);
        ctx.fillStyle = T.box;
        roundRect(ctx, sx, statsY, sW, sH, 18);
        ctx.fill();
        ctx.strokeStyle = T.boxBorder;
        ctx.lineWidth = 1.6;
        roundRect(ctx, sx, statsY, sW, sH, 18);
        ctx.stroke();

        const lineG2 = ctx.createLinearGradient(sx, statsY, sx + sW, statsY);
        lineG2.addColorStop(0, 'transparent');
        lineG2.addColorStop(0.5, BRAND_PRIMARY + '99');
        lineG2.addColorStop(1, 'transparent');
        ctx.fillStyle = lineG2;
        roundRect(ctx, sx, statsY, sW, 4, 2);
        ctx.fill();

        ctx.fillStyle = T.text;
        ctx.font = `bold ${format === 'story' ? 38 : 32}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(truncate(value, 14), sx + sW / 2, statsY + sH / 2 + (format === 'story' ? 10 : 8));
        ctx.fillStyle = BRAND_PRIMARY;
        ctx.font = `bold ${format === 'story' ? 20 : 17}px sans-serif`;
        ctx.fillText(label, sx + sW / 2, statsY + sH / 2 + (format === 'story' ? 50 : 42));
      });
    }

    // ── PROGRESS BAR ─────────────────────────────────────────────────────────
    if (progressPct !== null) {
      const pbY = statsY + (statBoxes.length > 0 ? (format === 'story' ? 146 : 124) : 0);
      const pbH = format === 'story' ? 26 : 22;
      const pbW = W - pad * 2;
      const pbX = pad;
      const pbR = pbH / 2;

      ctx.fillStyle = T.progressBg;
      roundRect(ctx, pbX, pbY, pbW, pbH, pbR);
      ctx.fill();

      if (progressPct > 0) {
        const fillW = (progressPct / 100) * pbW;
        const fillG = ctx.createLinearGradient(pbX, 0, pbX + fillW, 0);
        fillG.addColorStop(0, BRAND_PRIMARY + 'dd');
        fillG.addColorStop(1, BRAND_PRIMARY);
        ctx.fillStyle = fillG;
        roundRect(ctx, pbX, pbY, Math.max(pbR * 2, fillW), pbH, pbR);
        ctx.fill();
      }

      ctx.fillStyle = T.sub;
      ctx.font = `${format === 'story' ? 24 : 20}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(
        language === 'es' ? `${progressPct}% alcanzado` : `${progressPct}% reached`,
        W - pad,
        pbY + pbH + (format === 'story' ? 34 : 28)
      );
    }

    // ── CTA BANNER ────────────────────────────────────────────────────────────
    const ctaH = format === 'story' ? 188 : 168;
    const ctaY = H - ctaH - 80;
    ctx.fillStyle = T.ctaBg;
    roundRect(ctx, pad, ctaY, W - pad * 2, ctaH, 28);
    ctx.fill();

    const projectSlug = project.slug || project.id;
    const shareUrl = `asciende.pro/discover/${projectSlug}`;

    ctx.fillStyle = T.ctaText;
    ctx.font = `bold ${format === 'story' ? 42 : 34}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      language === 'es' ? '¡Apoya Este Proyecto!' : 'Support This Project!',
      W / 2,
      ctaY + (format === 'story' ? 60 : 52)
    );
    ctx.font = `${format === 'story' ? 26 : 22}px sans-serif`;
    ctx.globalAlpha = 0.8;
    ctx.fillText(
      language === 'es' ? 'Tu apoyo hace la diferencia' : 'Your support makes the difference',
      W / 2,
      ctaY + (format === 'story' ? 108 : 96)
    );
    ctx.font = `bold ${format === 'story' ? 22 : 20}px monospace`;
    ctx.globalAlpha = 0.65;
    ctx.fillText(shareUrl, W / 2, ctaY + (format === 'story' ? 156 : 142));
    ctx.globalAlpha = 1;

    // Small heart icon
    const heartX = W / 2 - (format === 'story' ? 180 : 150);
    const heartY2 = ctaY + (format === 'story' ? 52 : 44);
    const hs = format === 'story' ? 22 : 18;
    ctx.save();
    ctx.fillStyle = T.ctaText;
    ctx.globalAlpha = 0.7;
    ctx.font = `${hs * 1.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('❤️', heartX + hs, heartY2 + 2);
    ctx.restore();

    // Bottom bar
    ctx.fillStyle = barG;
    ctx.fillRect(0, H - 12, W, 12);
  }, [profile, project, uploadedImage, coverImage, theme, format, language, cat, athleteName, progressPct]);

  useEffect(() => {
    if (!imageLoaded) return;
    const raf = requestAnimationFrame(() => generateCard());
    return () => cancelAnimationFrame(raf);
  }, [imageLoaded, generateCard]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const getShareUrl = () => {
    const projectSlug = project.slug || project.id;
    return `https://hub.asciende.pro/discover/${projectSlug}`;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asciende-${format}-${(project.slug || project.id)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    }, 'image/png');
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getShareUrl()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInstagramShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);
    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) { handleDownload(); return; }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asciende-${format}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);

      const shareUrl = getShareUrl();
      const caption = language === 'es'
        ? `Apoya mi proyecto en Asciende\n${shareUrl}`
        : `Support my project on Asciende\n${shareUrl}`;

      await navigator.clipboard.writeText(caption).catch(() => {});
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch {
      handleDownload();
    } finally {
      setSharing(false);
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);
    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) { handleDownload(); return; }
      const file = new File([blob], `asciende-${Date.now()}.png`, { type: 'image/png' });
      const shareUrl = getShareUrl();
      const text = language === 'es'
        ? `Apoya mi proyecto "${project.title}" en Asciende`
        : `Support my project "${project.title}" on Asciende`;

      let didShare = false;
      if (navigator.share) {
        try {
          const shareData: ShareData = {
            title: project.title,
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full my-4 shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-neutral-800 dark:to-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-amber-400 to-amber-500">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'es' ? 'Compartir Proyecto' : 'Share Project'}
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                {truncate(project.title, 40)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* Project stats strip */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                icon: Target,
                v: project.goal_type === 'money' && project.goal_amount
                  ? `${project.currency || 'USD'} ${project.goal_amount.toLocaleString()}`
                  : (language === 'es' ? 'Apoyo' : 'Support'),
                l: language === 'es' ? 'Meta' : 'Goal',
              },
              {
                icon: Sparkles,
                v: progressPct !== null ? `${progressPct}%` : '—',
                l: language === 'es' ? 'Financiado' : 'Funded',
              },
              {
                icon: Users,
                v: String(project.visible_supports_count || 0),
                l: language === 'es' ? 'Apoyos' : 'Supporters',
              },
            ].map(({ icon: Icon, v, l }) => (
              <div key={l} className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-neutral-800 dark:to-neutral-800/70 rounded-xl p-3 text-center border border-amber-200/50 dark:border-neutral-700">
                <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-1.5" />
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-none truncate">{v}</p>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 font-medium">{l}</p>
              </div>
            ))}
          </div>

          {/* Short phrase */}
          {project.short_phrase && (
            <div className="flex items-start gap-2.5 text-sm rounded-xl px-4 py-3 border-2" style={{ borderColor: BRAND_PRIMARY + '55', backgroundColor: BRAND_PRIMARY + '12' }}>
              <Heart className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: BRAND_PRIMARY }} />
              <span className="font-medium text-neutral-900 dark:text-neutral-100">"{project.short_phrase}"</span>
            </div>
          )}

          {/* Format */}
          <div>
            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest mb-2.5">
              {language === 'es' ? 'Formato' : 'Format'}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'square' as Format, label: language === 'es' ? 'Cuadrado (Feed)' : 'Square (Feed)', sub: '1080 × 1080' },
                { id: 'story'  as Format, label: language === 'es' ? 'Vertical (Stories)' : 'Vertical (Stories)', sub: '1080 × 1920' },
              ].map(({ id, label, sub }) => (
                <button
                  key={id}
                  onClick={() => setFormat(id)}
                  className={`py-2.5 px-3.5 rounded-xl text-left border-2 transition-all ${
                    format === id
                      ? 'border-amber-400 bg-amber-100/60 dark:bg-amber-900/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <p className={`text-xs font-bold ${format === id ? 'text-amber-900 dark:text-amber-300' : 'text-neutral-700 dark:text-neutral-300'}`}>{label}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest mb-2.5">
              {language === 'es' ? 'Estilo' : 'Style'}
            </p>
            <div className="flex gap-2.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                    theme === t.id
                      ? 'border-amber-400 bg-amber-100/60 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  {language === 'es' ? t.labelEs : t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl hover:border-amber-400 dark:hover:border-amber-400 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400"
          >
            <Camera className="w-4.5 h-4.5" />
            {uploadedImage
              ? (language === 'es' ? 'Cambiar foto de fondo' : 'Change background photo')
              : (language === 'es' ? 'Agregar foto de fondo (opcional)' : 'Add background photo (optional)')}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          {/* Canvas preview */}
          <div className="rounded-xl overflow-hidden bg-neutral-900 border-2 border-neutral-700 shadow-lg">
            {!imageLoaded ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <canvas ref={canvasRef} className="w-full h-auto block" style={{ maxWidth: '100%' }} />
                <p className="text-xs text-center text-neutral-500 py-2">
                  {format === 'story' ? '1080 × 1920' : '1080 × 1080'} px
                </p>
              </>
            )}
          </div>

          {/* URL Display for Instagram */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-900 dark:text-blue-400 uppercase tracking-widest mb-2">
              {language === 'es' ? 'Compartir en Instagram' : 'Share on Instagram'}
            </p>
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800">
              <code className="flex-1 text-xs text-neutral-700 dark:text-neutral-300 font-mono truncate">
                {getShareUrl()}
              </code>
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all shrink-0 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300 mt-2 leading-relaxed">
              {language === 'es'
                ? '1. Descarga la imagen 2. Comparte en Instagram 3. Pega el enlace en la descripción'
                : '1. Download image 2. Share on Instagram 3. Paste link in description'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all flex-1 ${
                  downloaded
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                    : 'border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500'
                }`}
              >
                <Download className="w-4 h-4" />
                {downloaded ? (language === 'es' ? 'Descargada' : 'Downloaded') : (language === 'es' ? 'Descargar PNG' : 'Download PNG')}
              </button>
              <button
                onClick={handleInstagramShare}
                className="flex items-center gap-2 px-4 py-3 border-2 border-pink-500 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-xl font-bold text-sm transition-all"
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </button>
            </div>
            <button
              onClick={handleShare}
              disabled={sharing}
              className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold rounded-xl transition-all shadow-lg disabled:opacity-60 ${
                shared
                  ? 'bg-green-500 text-white shadow-green-500/30'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-900 hover:from-amber-500 hover:to-amber-600 shadow-amber-400/30'
              }`}
            >
              {shared ? <CheckCircle className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              {sharing
                ? (language === 'es' ? 'Compartiendo...' : 'Sharing…')
                : shared
                ? (language === 'es' ? '¡Compartido!' : 'Shared!')
                : (language === 'es' ? 'Más opciones' : 'More options')}
            </button>
          </div>

          <p className="text-xs text-center text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {language === 'es'
              ? 'Descarga la imagen, comparte en Instagram/Stories/WhatsApp y pega el enlace en la descripción'
              : 'Download the image, share on Instagram/Stories/WhatsApp and paste the link in the description'}
          </p>
        </div>
      </div>
    </div>
  );
}
