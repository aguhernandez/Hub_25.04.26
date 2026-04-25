import { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Download, X, Camera, CheckCircle, MapPin, Clock, Zap, Mountain, Link, Moon, Sun, Map } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const SPORT_META: Record<string, { label: string; labelEs: string; color: string; emoji: string }> = {
  run:              { label: 'Run',              labelEs: 'Carrera',                color: '#22c55e', emoji: '🏃' },
  trail_run:        { label: 'Trail Run',        labelEs: 'Trail Run',              color: '#84cc16', emoji: '⛰️' },
  road_bike:        { label: 'Road Bike',        labelEs: 'Bicicleta Ruta',         color: '#3b82f6', emoji: '🚴' },
  mountain_bike:    { label: 'Mountain Bike',    labelEs: 'Bicicleta MTB',          color: '#f97316', emoji: '🚵' },
  gravel_bike:      { label: 'Gravel Bike',      labelEs: 'Gravel',                 color: '#a3e635', emoji: '🚴' },
  open_water_swim:  { label: 'Open Water Swim',  labelEs: 'Aguas Abiertas',         color: '#06b6d4', emoji: '🏊' },
  swim:             { label: 'Swimming',         labelEs: 'Natación',               color: '#06b6d4', emoji: '🏊' },
  hike:             { label: 'Hike',             labelEs: 'Senderismo',             color: '#d97706', emoji: '🥾' },
  nordic_ski:       { label: 'Nordic Ski',       labelEs: 'Esquí Nórdico',          color: '#7dd3fc', emoji: '⛷️' },
};

export interface ActivityShareData {
  sportType: string;
  title: string;
  distanceKm: number;
  durationSeconds: number;
  elevationGainM: number;
  date?: string;
  gpsPoints?: Array<{ latitude: number; longitude: number; altitude?: number }>;
}

interface ActivityShareCardProps {
  activityData: ActivityShareData;
  onClose: () => void;
}

type Theme = 'dark' | 'terrain' | 'minimal';
type Format = 'square' | 'story';

const THEMES: { id: Theme; label: string; labelEs: string }[] = [
  { id: 'dark',    label: 'Dark',    labelEs: 'Oscuro'  },
  { id: 'terrain', label: 'Terrain', labelEs: 'Terreno' },
  { id: 'minimal', label: 'Minimal', labelEs: 'Minimal' },
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

function projectPoints(
  points: Array<{ latitude: number; longitude: number }>,
  x: number, y: number, w: number, h: number,
  pad = 40
): Array<[number, number]> {
  if (points.length < 2) return [];
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const dLat = maxLat - minLat || 0.0001;
  const dLon = maxLon - minLon || 0.0001;
  const availW = w - pad * 2;
  const availH = h - pad * 2;
  const scaleX = availW / dLon;
  const scaleY = availH / dLat;
  const scale = Math.min(scaleX, scaleY);
  const usedW = dLon * scale;
  const usedH = dLat * scale;
  const offX = x + pad + (availW - usedW) / 2;
  const offY = y + pad + (availH - usedH) / 2;
  return points.map((p) => [
    offX + (p.longitude - minLon) * scale,
    offY + usedH - (p.latitude - minLat) * scale,
  ]);
}

function samplePoints<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.round(i * step)]);
}

export default function ActivityShareCard({ activityData, onClose }: ActivityShareCardProps) {
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

  const sport = SPORT_META[activityData.sportType] ?? SPORT_META['run'];

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

  const fmtDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const getPace = useCallback(() => {
    if (!activityData.distanceKm || !activityData.durationSeconds) return null;
    const isBike = ['road_bike', 'mountain_bike', 'gravel_bike'].includes(activityData.sportType);
    if (isBike) {
      const kmh = (activityData.distanceKm / activityData.durationSeconds) * 3600;
      return { value: kmh.toFixed(1), unit: 'km/h' };
    }
    const minPerKm = activityData.durationSeconds / 60 / activityData.distanceKm;
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    return { value: `${mins}:${String(secs).padStart(2, '0')}`, unit: 'min/km' };
  }, [activityData]);

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
      dark:    {
        bg: ['#07090d', '#0c1420', '#07090d'],
        text: '#ffffff', sub: 'rgba(255,255,255,0.45)',
        mapBg: 'rgba(255,255,255,0.05)', mapBorder: 'rgba(255,255,255,0.12)',
        ctaBg: '#fdda36', ctaText: '#07090d',
        box: 'rgba(255,255,255,0.06)', boxBorder: 'rgba(255,255,255,0.1)',
      },
      terrain: {
        bg: ['#0a0f04', '#131a06', '#0a0f04'],
        text: '#f0fdf4', sub: 'rgba(240,253,244,0.5)',
        mapBg: 'rgba(255,255,255,0.06)', mapBorder: 'rgba(255,255,255,0.14)',
        ctaBg: sport.color, ctaText: '#ffffff',
        box: 'rgba(255,255,255,0.06)', boxBorder: `${sport.color}44`,
      },
      minimal: {
        bg: ['#f8fafc', '#ffffff', '#f0f4f8'],
        text: '#0f172a', sub: 'rgba(15,23,42,0.5)',
        mapBg: 'rgba(0,0,0,0.04)', mapBorder: 'rgba(0,0,0,0.1)',
        ctaBg: '#0f172a', ctaText: '#ffffff',
        box: 'rgba(0,0,0,0.04)', boxBorder: 'rgba(0,0,0,0.1)',
      },
    }[theme];

    // ── BACKGROUND ──────────────────────────────────────────────────────────
    const bgG = ctx.createLinearGradient(0, 0, W, H);
    bgG.addColorStop(0, T.bg[0]);
    bgG.addColorStop(0.5, T.bg[1]);
    bgG.addColorStop(1, T.bg[2]);
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    // Subtle dot grid pattern
    if (theme !== 'minimal') {
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = sport.color;
      for (let gx = 80; gx < W - 80; gx += 50) {
        for (let gy = 80; gy < H - 80; gy += 50) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (uploadedImage) {
      try {
        const img = new Image();
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = uploadedImage; });
        ctx.save();
        ctx.globalAlpha = 0.13;
        ctx.drawImage(img, 0, 0, W, H);
        ctx.restore();
        const overlay = ctx.createLinearGradient(0, 0, 0, H);
        overlay.addColorStop(0, T.bg[0] + 'f0');
        overlay.addColorStop(0.5, T.bg[0] + 'bb');
        overlay.addColorStop(1, T.bg[0] + 'f5');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, W, H);
      } catch {}
    }

    // ── TOP ACCENT BAR ───────────────────────────────────────────────────────
    const barG = ctx.createLinearGradient(0, 0, W, 0);
    barG.addColorStop(0, 'transparent');
    barG.addColorStop(0.15, '#fdda36');
    barG.addColorStop(0.85, '#fdda36');
    barG.addColorStop(1, 'transparent');
    ctx.fillStyle = barG;
    ctx.fillRect(0, 0, W, 8);

    // ── BRAND ────────────────────────────────────────────────────────────────
    const BRAND = '#fdda36';
    const topY = format === 'story' ? 100 : 64;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${format === 'story' ? 32 : 26}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('ASCIENDE', 72, topY);

    // Sport badge
    const sportLabel = (language === 'es' ? sport.labelEs : sport.label).toUpperCase();
    const badgeW = Math.min(260, ctx.measureText(sportLabel).width + 56);
    ctx.fillStyle = BRAND + '22';
    roundRect(ctx, W - badgeW - 72, topY - 28, badgeW, 48, 24);
    ctx.fill();
    ctx.strokeStyle = BRAND + '88';
    ctx.lineWidth = 1.5;
    roundRect(ctx, W - badgeW - 72, topY - 28, badgeW, 48, 24);
    ctx.stroke();
    ctx.fillStyle = BRAND;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sportLabel.length > 18 ? sportLabel.slice(0, 16) + '…' : sportLabel, W - badgeW / 2 - 72, topY + 4);

    // ── ATHLETE NAME ──────────────────────────────────────────────────────────
    const nameY = format === 'story' ? 200 : 170;
    ctx.fillStyle = T.text;
    ctx.font = `bold ${format === 'story' ? 68 : 60}px sans-serif`;
    ctx.textAlign = 'center';
    const name = profile?.full_name || (language === 'es' ? 'Atleta' : 'Athlete');
    ctx.fillText(name.length > 24 ? name.slice(0, 22) + '…' : name, W / 2, nameY);

    if (activityData.title) {
      ctx.fillStyle = T.sub;
      ctx.font = `${format === 'story' ? 30 : 26}px sans-serif`;
      const t = activityData.title;
      ctx.fillText(t.length > 44 ? t.slice(0, 42) + '…' : t, W / 2, nameY + (format === 'story' ? 52 : 44));
    }

    const rawDate = activityData.date ? new Date(activityData.date + 'T12:00:00') : new Date();
    const dateStr = rawDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const dateY = nameY + (format === 'story' ? 104 : 88);
    ctx.fillStyle = BRAND + 'cc';
    ctx.font = `${format === 'story' ? 26 : 22}px sans-serif`;
    ctx.fillText(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), W / 2, dateY);

    // Divider
    ctx.strokeStyle = BRAND + '44';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, dateY + 24);
    ctx.lineTo(W - 80, dateY + 24);
    ctx.stroke();

    // ── DISTANCE HERO ──────────────────────────────────────────────────────────
    const heroY = dateY + (format === 'story' ? 140 : 110);
    ctx.fillStyle = T.text;
    ctx.font = `bold ${format === 'story' ? 180 : 144}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(activityData.distanceKm.toFixed(2), W / 2, heroY);
    ctx.fillStyle = BRAND;
    ctx.font = `bold ${format === 'story' ? 44 : 36}px sans-serif`;
    ctx.fillText('km', W / 2, heroY + (format === 'story' ? 58 : 48));

    // ── GPS MAP PANEL ─────────────────────────────────────────────────────────
    const mapPad = 80;
    const mapY = heroY + (format === 'story' ? 130 : 100);
    const mapH = format === 'story' ? 520 : 320;
    const mapW = W - mapPad * 2;
    const mapX = mapPad;

    ctx.fillStyle = T.mapBg;
    roundRect(ctx, mapX, mapY, mapW, mapH, 24);
    ctx.fill();
    ctx.strokeStyle = T.mapBorder;
    ctx.lineWidth = 1.5;
    roundRect(ctx, mapX, mapY, mapW, mapH, 24);
    ctx.stroke();

    const pts = activityData.gpsPoints;
    if (pts && pts.length >= 2) {
      const sampled = samplePoints(pts, 1500);
      const projected = projectPoints(sampled, mapX, mapY, mapW, mapH, 44);

      if (projected.length >= 2) {
        // Glow effect under route
        ctx.save();
        ctx.shadowColor = sport.color + '88';
        ctx.shadowBlur = 24;

        // Thick glow pass
        ctx.beginPath();
        ctx.moveTo(projected[0][0], projected[0][1]);
        for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
        ctx.strokeStyle = sport.color + '35';
        ctx.lineWidth = 14;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Medium glow pass
        ctx.beginPath();
        ctx.moveTo(projected[0][0], projected[0][1]);
        for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
        ctx.strokeStyle = sport.color + '60';
        ctx.lineWidth = 7;
        ctx.stroke();

        // Main route line
        ctx.beginPath();
        ctx.moveTo(projected[0][0], projected[0][1]);
        for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
        ctx.strokeStyle = sport.color;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.restore();

        // Start dot
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(projected[0][0], projected[0][1], 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(projected[0][0], projected[0][1], 10, 0, Math.PI * 2);
        ctx.stroke();

        // Finish dot
        const last = projected[projected.length - 1];
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(last[0], last[1], 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(last[0], last[1], 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = T.sub;
      ctx.font = `${format === 'story' ? 26 : 22}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        language === 'es' ? 'Sin datos de ruta GPS' : 'No GPS route data',
        mapX + mapW / 2,
        mapY + mapH / 2 + 8
      );
    }

    // ── STATS ROW ─────────────────────────────────────────────────────────────
    const pace = getPace();
    const statsData = [
      { v: fmtDuration(activityData.durationSeconds), l: language === 'es' ? 'Duración' : 'Duration' },
      { v: pace?.value || '—', l: pace?.unit || (language === 'es' ? 'Ritmo' : 'Pace') },
      { v: activityData.elevationGainM > 0 ? `${Math.round(activityData.elevationGainM)}m` : '—', l: language === 'es' ? 'Desnivel +' : 'Elevation +' },
    ];

    const sH = format === 'story' ? 120 : 104;
    const sGap = 20;
    const sW = (W - mapPad * 2 - sGap * (statsData.length - 1)) / statsData.length;
    const sY = mapY + mapH + (format === 'story' ? 28 : 20);

    statsData.forEach(({ v, l }, i) => {
      const sx = mapPad + i * (sW + sGap);
      ctx.fillStyle = T.box;
      roundRect(ctx, sx, sY, sW, sH, 16);
      ctx.fill();
      ctx.strokeStyle = BRAND + '55';
      ctx.lineWidth = 1.5;
      roundRect(ctx, sx, sY, sW, sH, 16);
      ctx.stroke();

      // Accent top bar
      const lineG = ctx.createLinearGradient(sx, sY, sx + sW, sY);
      lineG.addColorStop(0, 'transparent');
      lineG.addColorStop(0.5, BRAND + '77');
      lineG.addColorStop(1, 'transparent');
      ctx.fillStyle = lineG;
      roundRect(ctx, sx, sY, sW, 3, 1.5);
      ctx.fill();

      ctx.fillStyle = T.text;
      ctx.font = `bold ${format === 'story' ? 38 : 34}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(v, sx + sW / 2, sY + sH / 2 + (format === 'story' ? 10 : 8));
      ctx.fillStyle = BRAND + 'cc';
      ctx.font = `bold ${format === 'story' ? 20 : 18}px sans-serif`;
      ctx.fillText(l, sx + sW / 2, sY + sH / 2 + (format === 'story' ? 46 : 40));
    });

    // ── CTA BANNER ────────────────────────────────────────────────────────────
    const ctaH = format === 'story' ? 180 : 164;
    const ctaY = H - ctaH - 80;
    ctx.fillStyle = T.ctaBg;
    roundRect(ctx, mapPad, ctaY, W - mapPad * 2, ctaH, 24);
    ctx.fill();

    const slug = (profile as any)?.public_profile_slug || profile?.id || '';
    ctx.fillStyle = T.ctaText;
    if (shareMode === 'project' && activeProject) {
      ctx.font = `bold ${format === 'story' ? 40 : 34}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(language === 'es' ? 'Apoya Mi Proyecto' : 'Support My Project', W / 2, ctaY + (format === 'story' ? 58 : 50));
      ctx.font = `${format === 'story' ? 28 : 24}px sans-serif`;
      const phrase = activeProject.short_phrase || activeProject.title;
      ctx.fillText(phrase.length > 54 ? phrase.slice(0, 51) + '…' : phrase, W / 2, ctaY + (format === 'story' ? 106 : 96));
      ctx.globalAlpha = 0.6;
      ctx.font = `bold ${format === 'story' ? 20 : 18}px monospace`;
      ctx.fillText(`hub.asciende.pro/athlete/${slug}/project/${activeProject.slug}`, W / 2, ctaY + (format === 'story' ? 152 : 140));
      ctx.globalAlpha = 1;
    } else {
      ctx.font = `bold ${format === 'story' ? 40 : 34}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(language === 'es' ? 'Sigue Mi Progreso' : 'Follow My Journey', W / 2, ctaY + (format === 'story' ? 58 : 50));
      ctx.font = `${format === 'story' ? 28 : 24}px sans-serif`;
      ctx.fillText(language === 'es' ? 'Cada kilómetro, un paso más cerca' : 'Every km, one step further', W / 2, ctaY + (format === 'story' ? 106 : 96));
      ctx.globalAlpha = 0.6;
      ctx.font = `bold ${format === 'story' ? 20 : 18}px monospace`;
      ctx.fillText(`hub.asciende.pro/athlete/${slug}`, W / 2, ctaY + (format === 'story' ? 152 : 140));
      ctx.globalAlpha = 1;
    }

    // Bottom bar
    ctx.fillStyle = barG;
    ctx.fillRect(0, H - 8, W, 8);
  }, [profile, activityData, uploadedImage, shareMode, theme, format, activeProject, language, sport, getPace]);

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
      ? `${window.location.origin}/athlete/${slug}/project/${activeProject.slug}`
      : `${window.location.origin}/athlete/${slug}`;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = (activityData.date || new Date().toISOString().split('T')[0]);
      a.download = `activity-${format}-${activityData.sportType}-${dateStr}.png`;
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
      const file = new File([blob], `activity-${Date.now()}.png`, { type: 'image/png' });
      const shareUrl = getShareUrl();
      const sportName = language === 'es' ? sport.labelEs : sport.label;
      const distStr = activityData.distanceKm.toFixed(2);
      const text = (shareMode === 'project' && activeProject)
        ? (language === 'es'
          ? `${distStr}km de ${sportName}. Apoya mi proyecto: ${activeProject.title}`
          : `${distStr}km ${sportName}. Support my project: ${activeProject.title}`)
        : (language === 'es'
          ? `${distStr}km de ${sportName} completados. Sigue mi progreso en Asciende!`
          : `${distStr}km ${sportName} done. Follow my progress on Asciende!`);

      let didShare = false;
      if (navigator.share) {
        try {
          const shareData: ShareData = {
            title: `${profile?.full_name || 'Athlete'} — ${sportName}`,
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

  const pace = getPace();

  return (
    <div className="fixed inset-0 bg-neutral-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-xl w-full my-4 shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: sport.color + '22', boxShadow: `0 4px 14px ${sport.color}33` }}>
              <MapPin className="w-5 h-5" style={{ color: sport.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {language === 'es' ? 'Compartir Actividad' : 'Share Activity'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'es' ? sport.labelEs : sport.label} · {language === 'es' ? 'Imagen lista para compartir' : 'Ready to share'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: MapPin,    v: activityData.distanceKm.toFixed(2), l: 'km' },
              { icon: Clock,     v: fmtDuration(activityData.durationSeconds), l: language === 'es' ? 'Tiempo' : 'Time' },
              ...(pace ? [{ icon: Zap,      v: pace.value, l: pace.unit }] : []),
              ...(activityData.elevationGainM > 0 ? [{ icon: Mountain, v: `${Math.round(activityData.elevationGainM)}m`, l: 'D+' }] : []),
            ].map(({ icon: Icon, v, l }) => (
              <div key={l} className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 text-center border border-neutral-200 dark:border-neutral-700">
                <Icon className="w-3.5 h-3.5 text-neutral-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-none">{v}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">{l}</p>
              </div>
            ))}
          </div>

          {/* GPS indicator */}
          {activityData.gpsPoints && activityData.gpsPoints.length >= 2 ? (
            <div className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2 border border-green-200 dark:border-green-700/50">
              <Map className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-green-700 dark:text-green-400 font-medium">
                {language === 'es'
                  ? `Ruta GPS incluida · ${activityData.gpsPoints.length.toLocaleString()} puntos`
                  : `GPS route included · ${activityData.gpsPoints.length.toLocaleString()} points`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-xl px-3 py-2 border border-neutral-200 dark:border-neutral-700">
              <Map className="w-3.5 h-3.5 flex-shrink-0" />
              {language === 'es' ? 'Sin datos de ruta GPS' : 'No GPS route data available'}
            </div>
          )}

          {/* Format */}
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

          {/* Theme */}
          <div>
            <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
              {language === 'es' ? 'Estilo' : 'Style'}
            </p>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                    theme === t.id
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                  }`}
                >
                  {language === 'es' ? t.labelEs : t.label}
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
          <div className="rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
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
              ? 'Guarda la imagen y compártela en Instagram, Stories, WhatsApp y más'
              : 'Save the image and share it on Instagram, Stories, WhatsApp and more'}
          </p>
        </div>
      </div>
    </div>
  );
}
