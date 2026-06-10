import { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Download, X, CheckCircle, Dumbbell, Link } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const PRODUCTION_URL = 'https://hub.asciende.pro';
const KRONA_ONE_URL = 'https://fonts.gstatic.com/s/kronaone/v14/jAnEgHdjHcjgfIb1ZcUCMY-h.woff2';
const FONT_NAME = 'Krona One';
const FONT_FALLBACK = 'sans-serif';

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

function drawIcon(ctx: CanvasRenderingContext2D, type: string, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.15;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const r = size / 2;

  if (type === 'tonnage') {
    // Dumbbell icon
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy);
    ctx.lineTo(cx + r * 0.7, cy);
    ctx.stroke();
    roundRect(ctx, cx - r * 0.9, cy - r * 0.4, r * 0.4, r * 0.8, 2);
    ctx.fill();
    roundRect(ctx, cx + r * 0.5, cy - r * 0.4, r * 0.4, r * 0.8, 2);
    ctx.fill();
  } else if (type === 'kg') {
    // Weight plate icon
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'exercises') {
    // List/layers icon
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.5, cy - r * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy);
    ctx.lineTo(cx + r * 0.5, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy + r * 0.4);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLogoOrText(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement | null,
  cx: number, cy: number,
  maxW: number, maxH: number,
  fontFamily: string
) {
  if (logoImg && logoImg.naturalWidth > 0) {
    const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }
    ctx.drawImage(logoImg, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = '#fdda36';
    ctx.font = `bold ${Math.min(maxH * 0.6, 36)}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ASCIENDE', cx, cy);
    ctx.textBaseline = 'alphabetic';
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

export default function WorkoutShareCard({ workoutData, onClose }: WorkoutShareCardProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [shareMode, setShareMode] = useState<'profile' | 'project'>('profile');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);

  const f = (w: string) => `${w} ${FONT_NAME}, ${FONT_FALLBACK}`;

  useEffect(() => {
    const font = new FontFace(FONT_NAME, `url(${KRONA_ONE_URL})`);
    font.load().then((loaded) => {
      document.fonts.add(loaded);
      setFontLoaded(true);
    }).catch(() => setFontLoaded(true));
  }, []);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { logoImgRef.current = img; };
    img.onerror = () => {};
    img.src = '/Asciendelogo.png';
  }, []);

  useEffect(() => {
    if (!profile?.id) { setReady(true); return; }
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
        setReady(true);
      });
  }, [profile?.id]);

  const fmtDate = () => {
    const d = workoutData.date ? new Date(workoutData.date + 'T12:00:00') : new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
    return `${m}m`;
  };

  const getShareUrl = () => {
    const slug = (profile as any)?.public_profile_slug || profile?.id || '';
    return (shareMode === 'project' && activeProject)
      ? `${PRODUCTION_URL}/athlete/${slug}/project/${activeProject.slug}`
      : `${PRODUCTION_URL}/athlete/${slug}`;
  };

  const getShareUrlShort = () => {
    const slug = (profile as any)?.public_profile_slug || profile?.id || '';
    return (shareMode === 'project' && activeProject)
      ? `hub.asciende.pro/athlete/${slug}/project/${activeProject.slug}`
      : `hub.asciende.pro/athlete/${slug}`;
  };

  const getCtaTitle = () => {
    if (shareMode === 'project' && activeProject) {
      return language === 'es' ? 'Apoya Mi Proyecto' : 'Support My Project';
    }
    return language === 'es' ? 'Sigue Mi Progreso' : 'Follow My Journey';
  };

  const drawTransparentCard = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.clearRect(0, 0, W, H);

    // Sport type at top center
    const sportLabel = language === 'es' ? 'ENTRENAMIENTO' : 'WORKOUT';
    ctx.fillStyle = '#ffffff';
    ctx.font = f('700 30px');
    ctx.textAlign = 'center';
    ctx.fillText(sportLabel, W / 2, 100);

    // Thin divider
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.3, 130);
    ctx.lineTo(W * 0.7, 130);
    ctx.stroke();

    // Date top-left
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = f('400 26px');
    ctx.textAlign = 'left';
    ctx.fillText(fmtDate(), 72, 200);

    // Duration below date
    ctx.fillStyle = '#ffffff';
    ctx.font = f('700 48px');
    ctx.textAlign = 'left';
    ctx.fillText(formatDuration(workoutData.duration), 72, 270);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = f('400 20px');
    ctx.fillText(language === 'es' ? 'Duracion' : 'Duration', 72, 302);

    // Two-column layout at bottom
    const bottomY = H - 560;
    const colW = (W - 120 - 40) / 2;
    const leftX = 60;
    const rightX = leftX + colW + 40;

    // Left column: 3 stats
    const stats = [
      { icon: 'tonnage', value: `${Math.round(workoutData.totalVolume).toLocaleString()}`, unit: 'kg', label: language === 'es' ? 'Tonelaje' : 'Tonnage' },
      { icon: 'kg', value: `${Math.round(workoutData.totalVolume).toLocaleString()}`, unit: '', label: language === 'es' ? 'Kg movidos' : 'Kg moved' },
      { icon: 'exercises', value: String(workoutData.exerciseCount ?? 0), unit: '', label: language === 'es' ? 'Ejercicios' : 'Exercises' },
    ];

    const statSpacing = 140;
    stats.forEach((s, i) => {
      const sy = bottomY + i * statSpacing;
      drawIcon(ctx, s.icon, leftX + 24, sy + 20, 28, '#fdda36');

      ctx.fillStyle = '#ffffff';
      ctx.font = f('700 42px');
      ctx.textAlign = 'left';

      if (s.unit) {
        const valText = s.value;
        ctx.fillText(valText, leftX + 56, sy + 16);
        const valWidth = ctx.measureText(valText).width;
        ctx.fillStyle = '#fdda36';
        ctx.font = f('700 24px');
        ctx.fillText(s.unit, leftX + 56 + valWidth + 8, sy + 16);
      } else {
        ctx.fillText(s.value, leftX + 56, sy + 16);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = f('400 20px');
      ctx.textAlign = 'left';
      ctx.fillText(s.label, leftX + 56, sy + 50);
    });

    // Right column: CTA + URL + Logo
    const ctaTitle = getCtaTitle();
    const ctaUrl = getShareUrlShort();

    ctx.fillStyle = '#fdda36';
    ctx.font = f('700 28px');
    ctx.textAlign = 'left';
    const ctaTitleLines = wrapText(ctx, ctaTitle, colW);
    let ctaTextY = bottomY + 20;
    ctaTitleLines.forEach((line) => {
      ctx.fillText(line, rightX, ctaTextY);
      ctaTextY += 38;
    });

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `400 18px ${FONT_FALLBACK}`;
    const urlLines = wrapText(ctx, ctaUrl, colW);
    ctaTextY += 8;
    urlLines.forEach((line) => {
      ctx.fillText(line, rightX, ctaTextY);
      ctaTextY += 26;
    });

    // Logo in right column bottom
    drawLogoOrText(ctx, logoImgRef.current, rightX + colW / 2, H - 140, colW * 0.7, 80, f('700 36px'));
  }, [workoutData, language, shareMode, activeProject, profile]);

  const generateCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    drawTransparentCard(ctx, W, H);
  }, [drawTransparentCard]);

  useEffect(() => {
    if (!ready || !fontLoaded) return;
    const raf = requestAnimationFrame(() => generateCard());
    return () => cancelAnimationFrame(raf);
  }, [ready, fontLoaded, generateCard]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) return;
    const fileName = `asciende-workout-${workoutData.date}.png`;

    if (navigator.share) {
      try {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
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
      if (!blob) return;

      const file = new File([blob], `asciende-workout-${workoutData.date}.png`, { type: 'image/png' });
      const shareUrl = getShareUrl();

      const text = (shareMode === 'project' && activeProject)
        ? (language === 'es'
          ? `Entreno duro persiguiendo mi meta. Apoya mi proyecto: ${activeProject.title}`
          : `Training hard chasing my goal. Support my project: ${activeProject.title}`)
        : (language === 'es'
          ? 'Entrenamiento completado. Sigue mi progreso en Asciende!'
          : 'Workout done. Follow my progress on Asciende!');

      if (navigator.share) {
        const shareData: ShareData = {
          title: `${profile?.full_name || 'Athlete'} — ${language === 'es' ? 'Entrenamiento' : 'Workout'}`,
          text,
          url: shareUrl,
        };
        if (navigator.canShare?.({ files: [file] })) {
          shareData.files = [file];
        }
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else {
        await handleDownload();
        await navigator.clipboard.writeText(shareUrl).catch(() => {});
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        await handleDownload();
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full my-4 shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 flex items-center justify-center">
              <Dumbbell className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'es' ? 'Compartir Entrenamiento' : 'Share Workout'}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {language === 'es' ? 'PNG transparente para stories' : 'Transparent PNG for stories'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[82vh] overflow-y-auto">

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { v: `${Math.round(workoutData.totalVolume).toLocaleString()} kg`, l: language === 'es' ? 'Tonelaje' : 'Tonnage' },
              { v: formatDuration(workoutData.duration), l: language === 'es' ? 'Duracion' : 'Duration' },
              { v: String(workoutData.exerciseCount ?? 0), l: language === 'es' ? 'Ejercicios' : 'Exercises' },
            ].map(({ v, l }) => (
              <div key={l} className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-2 text-center">
                <p className="text-xs font-bold text-neutral-900 dark:text-white leading-none">{v}</p>
                <p className="text-[9px] text-neutral-500 dark:text-neutral-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          {/* Share Mode */}
          {activeProject && (
            <div>
              <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">
                {language === 'es' ? 'Mensaje' : 'Message'}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { mode: 'profile' as const, title: language === 'es' ? 'Sigue mi Progreso' : 'Follow My Journey', sub: language === 'es' ? 'Enlaza a tu perfil' : 'Links to profile' },
                  { mode: 'project' as const, title: language === 'es' ? 'Apoya mi Proyecto' : 'Support My Project', sub: activeProject.title },
                ].map(({ mode, title, sub }) => (
                  <button key={mode} onClick={() => setShareMode(mode)}
                    className={`p-2.5 rounded-xl border-2 transition-all text-left ${
                      shareMode === mode
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                    }`}>
                    <p className={`font-bold text-[11px] ${shareMode === mode ? 'text-amber-700 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}`}>{title}</p>
                    <p className="text-[9px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Canvas Preview */}
          <div
            className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-600"
            style={{
              backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          >
            {!ready || !fontLoaded ? (
              <div className="h-48 flex items-center justify-center bg-neutral-100 dark:bg-neutral-700">
                <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <canvas ref={canvasRef} className="w-full h-auto block" style={{ maxWidth: '100%' }} />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-xs font-medium rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              {language === 'es' ? 'Guardar' : 'Save'}
            </button>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-2.5 border text-xs font-medium rounded-xl transition-all ${
                copied
                  ? 'border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Link className="w-4 h-4" />}
              {copied ? (language === 'es' ? 'Copiado' : 'Copied') : 'Link'}
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all disabled:opacity-60 shadow-lg ${
                shared
                  ? 'bg-green-500 text-white shadow-green-500/25'
                  : 'bg-[#fdda36] text-[#060810] hover:bg-[#ffd01a] shadow-amber-400/25'
              }`}
            >
              {shared ? <CheckCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {sharing
                ? (language === 'es' ? 'Abriendo...' : 'Opening...')
                : shared
                ? (language === 'es' ? 'Listo!' : 'Done!')
                : (language === 'es' ? 'Compartir' : 'Share')}
            </button>
          </div>

          <p className="text-[9px] text-center text-neutral-400 dark:text-neutral-500">
            {language === 'es'
              ? 'Comparte en Instagram Stories, WhatsApp, y mas'
              : 'Share on Instagram Stories, WhatsApp, and more'}
          </p>
        </div>
      </div>
    </div>
  );
}
