import { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Download, X, CheckCircle, Dumbbell, QrCode, Copy, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import asciendeLogoSrc from '../../assets/Asciendelogo.png';

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

  if (type === 'kg') {
    // Dumbbell icon
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy);
    ctx.lineTo(cx + r * 0.7, cy);
    ctx.stroke();
    roundRect(ctx, cx - r * 0.9, cy - r * 0.4, r * 0.4, r * 0.8, 2);
    ctx.fill();
    roundRect(ctx, cx + r * 0.5, cy - r * 0.4, r * 0.4, r * 0.8, 2);
    ctx.fill();
  } else if (type === 'exercises') {
    // List icon
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
  } else if (type === 'sets') {
    // Stack icon
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r * 0.1);
    ctx.lineTo(cx, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.6, cy - r * 0.1);
    ctx.lineTo(cx, cy + r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy + r * 0.4);
    ctx.lineTo(cx + r * 0.6, cy + r * 0.4);
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
  const [showQR, setShowQR] = useState(false);
  const [ready, setReady] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const t = useCallback((es: string, en: string) => language === 'es' ? es : en, [language]);
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
    img.onload = () => { logoImgRef.current = img; setLogoLoaded(true); };
    img.onerror = () => { setLogoLoaded(true); };
    img.src = asciendeLogoSrc;
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
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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
    if (shareMode === 'project' && activeProject) return t('Apoya Mi Proyecto', 'Support My Project');
    return t('Sigue Mi Progreso', 'Follow My Journey');
  };

  const drawTransparentCard = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.clearRect(0, 0, W, H);

    // Sport label at top center
    ctx.fillStyle = '#ffffff';
    ctx.font = f('700 44px');
    ctx.textAlign = 'center';
    ctx.fillText(t('ENTRENAMIENTO', 'WORKOUT'), W / 2, 100);

    // Thin divider
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.2, 135);
    ctx.lineTo(W * 0.8, 135);
    ctx.stroke();

    // Date + duration at top-left
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = f('400 34px');
    ctx.textAlign = 'left';
    ctx.fillText(fmtDate(), 80, 220);

    ctx.fillStyle = '#ffffff';
    ctx.font = f('700 72px');
    ctx.fillText(formatDuration(workoutData.duration), 80, 320);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = f('400 30px');
    ctx.fillText(t('Duracion', 'Duration'), 80, 370);

    // Two-column layout
    const bottomY = H - 700;
    const colW = (W - 120 - 40) / 2;
    const leftX = 60;
    const rightX = leftX + colW + 40;

    // Left column: 3 stats
    const stats = [
      { icon: 'kg',        value: `${Math.round(workoutData.totalVolume).toLocaleString()}`, unit: 'kg', label: t('Kg movidos', 'Kg moved') },
      { icon: 'exercises', value: String(workoutData.exerciseCount ?? 0),                   unit: '',   label: t('Ejercicios', 'Exercises') },
      { icon: 'sets',      value: String(workoutData.setCount ?? 0),                        unit: '',   label: t('Series', 'Sets') },
    ];

    const statSpacing = 180;
    stats.forEach((s, i) => {
      const sy = bottomY + i * statSpacing;
      drawIcon(ctx, s.icon, leftX + 24, sy + 20, 36, '#fdda36');

      ctx.fillStyle = '#ffffff';
      ctx.font = f('700 60px');
      ctx.textAlign = 'left';

      if (s.unit) {
        ctx.fillText(s.value, leftX + 72, sy + 20);
        const vw = ctx.measureText(s.value).width;
        ctx.fillStyle = '#fdda36';
        ctx.font = f('700 34px');
        ctx.fillText(s.unit, leftX + 72 + vw + 10, sy + 20);
      } else {
        ctx.fillText(s.value, leftX + 72, sy + 20);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = f('400 28px');
      ctx.fillText(s.label, leftX + 72, sy + 66);
    });

    // Right column: CTA + URL + Logo (tight spacing)
    const ctaTitle = getCtaTitle();
    const ctaUrl = getShareUrlShort();

    ctx.fillStyle = '#fdda36';
    ctx.font = f('700 36px');
    ctx.textAlign = 'left';
    const ctaTitleLines = wrapText(ctx, ctaTitle, colW);
    let ctaTextY = bottomY + 20;
    ctaTitleLines.forEach((line) => {
      ctx.fillText(line, rightX, ctaTextY);
      ctaTextY += 48;
    });

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `400 24px ${FONT_FALLBACK}`;
    const urlLines = wrapText(ctx, ctaUrl, colW);
    ctaTextY += 8;
    urlLines.forEach((line) => {
      ctx.fillText(line, rightX, ctaTextY);
      ctaTextY += 32;
    });

    // Logo lower — below URL text with more breathing room
    const logoY = ctaTextY + 140;
    drawLogoOrText(ctx, logoImgRef.current, rightX + colW / 2, logoY, colW * 0.85, 100, f('700 48px'));
  }, [workoutData, t, shareMode, activeProject, profile]);

  const generateCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 1080;
    canvas.height = 1920;
    drawTransparentCard(ctx, 1080, 1920);
  }, [drawTransparentCard]);

  useEffect(() => {
    if (!ready || !fontLoaded || !logoLoaded) return;
    const raf = requestAnimationFrame(() => generateCard());
    return () => cancelAnimationFrame(raf);
  }, [ready, fontLoaded, logoLoaded, generateCard]);

  const handleSaveToPhotos = async () => {
    const canvas = canvasRef.current;
    if (!canvas || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      const fileName = `asciende-workout-${workoutData.date}.png`;

      let platform = 'web';
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) platform = Capacitor.getPlatform();
      } catch { /* web */ }

      if (platform === 'ios' || platform === 'android') {
        const { Media } = await import('@capacitor-community/media');

        try {
          await (Media as any).getPermissions?.();
        } catch {
          // Older versions don't have getPermissions
        }

        const base64 = await canvasToBase64(canvas);

        let albumId: string | undefined;
        try {
          const { albums } = await Media.getAlbums();
          const existing = albums.find((a: any) =>
            a.name?.toLowerCase() === 'asciende'
          );
          if (existing) {
            albumId = existing.identifier ?? existing.id;
          } else {
            const created = await Media.createAlbum({ name: 'Asciende' });
            albumId = created.identifier ?? created.id;
          }
        } catch {
          // Album ops failed -- save to default Camera Roll
        }

        await Media.savePhoto({
          path: `data:image/png;base64,${base64}`,
          albumIdentifier: albumId,
          fileName,
        } as any);

        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 3000);
      } else {
        // Web: trigger file download
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2500);
      }
    } catch (e: any) {
      if (e?.message?.includes('denied') || e?.message?.includes('permission')) {
        setSaveError(language === 'es'
          ? 'Permiso denegado. Habilita acceso a fotos en Ajustes.'
          : 'Permission denied. Enable photo access in Settings.');
      } else {
        setSaveError(language === 'es' ? 'No se pudo guardar' : 'Could not save');
      }
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getShareUrl()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const canvasToBase64 = (cvs: HTMLCanvasElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      cvs.toBlob((blob) => {
        if (!blob) { reject(new Error('toBlob failed')); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      }, 'image/png');
    });
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);
    try {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const base64 = await canvasToBase64(canvas);
          if (base64) {
            const { default: InstagramStories } = await import('../../plugins/instagram-stories');
            await InstagramStories.shareSticker({
              stickerImage: base64,
              appId: 'pro.asciende.app',
              backgroundTopColor: '#000000',
              backgroundBottomColor: '#111111',
            });
            setShared(true);
            setTimeout(() => setShared(false), 3000);
            return;
          }
        }
      } catch {
        // Instagram not installed -- fall through to native share sheet
      }

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) return;

      const file = new File([blob], `asciende-workout-${workoutData.date}.png`, { type: 'image/png' });
      const shareUrl = getShareUrl();
      const text = (shareMode === 'project' && activeProject)
        ? t(`Entreno duro persiguiendo mi meta. Apoya mi proyecto: ${activeProject.title}`,
            `Training hard chasing my goal. Support my project: ${activeProject.title}`)
        : t('Entrenamiento completado. Sigue mi progreso en Asciende!',
            'Workout done. Follow my progress on Asciende!');

      if (navigator.share) {
        const shareData: ShareData = {
          title: `${profile?.full_name || 'Athlete'} — ${t('Entrenamiento', 'Workout')}`,
          text,
          url: shareUrl,
        };
        if (navigator.canShare?.({ files: [file] })) shareData.files = [file];
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else {
        await handleSaveToPhotos();
        await navigator.clipboard.writeText(shareUrl).catch(() => {});
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') await handleSaveToPhotos();
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-[60] p-3 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full my-4 shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 flex items-center justify-center">
              <Dumbbell className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {t('Compartir Entrenamiento', 'Share Workout')}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {t('PNG transparente para stories', 'Transparent PNG for stories')}
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
              { v: `${Math.round(workoutData.totalVolume).toLocaleString()} kg`, l: t('Kg movidos', 'Kg moved') },
              { v: formatDuration(workoutData.duration),                         l: t('Duracion', 'Duration') },
              { v: String(workoutData.exerciseCount ?? 0),                       l: t('Ejercicios', 'Exercises') },
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
                {t('Mensaje', 'Message')}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { mode: 'profile' as const, title: t('Sigue mi Progreso', 'Follow My Journey'), sub: t('Enlaza a tu perfil', 'Links to profile') },
                  { mode: 'project' as const, title: t('Apoya mi Proyecto', 'Support My Project'), sub: activeProject.title },
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
            {!ready || !fontLoaded || !logoLoaded ? (
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
              onClick={handleSaveToPhotos}
              disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-2.5 border text-xs font-medium rounded-xl transition-all ${
                savedOk
                  ? 'border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  : saveError
                  ? 'border-red-400 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                  : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : savedOk ? (
                <CheckCircle className="w-4 h-4" />
              ) : saveError ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {saving
                ? t('Guardando...', 'Saving...')
                : savedOk
                ? t('Guardado', 'Saved to Photos')
                : saveError
                ? saveError
                : t('Guardar', 'Save')}
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-xs font-medium rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Link
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
              {sharing ? t('Abriendo...', 'Opening...') : shared ? t('Listo!', 'Done!') : t('Compartir', 'Share')}
            </button>
          </div>

          <p className="text-[9px] text-center text-neutral-400 dark:text-neutral-500">
            {t('Compartir abre Instagram Stories directamente', 'Share opens Instagram Stories directly')}
          </p>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          onClick={() => setShowQR(false)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl border border-neutral-200 dark:border-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-900 dark:text-white text-sm">
                {t('Codigo QR', 'QR Code')}
              </h3>
              <button onClick={() => setShowQR(false)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="bg-white p-3 rounded-xl mb-4 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getShareUrl())}`}
                alt="QR Code"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
            <p className="text-[10px] text-center text-neutral-500 dark:text-neutral-400 break-all mb-3">
              {getShareUrlShort()}
            </p>
            <button
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                copied
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('Copiado!', 'Copied!') : t('Copiar enlace', 'Copy link')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
