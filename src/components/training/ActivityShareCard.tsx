import { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Download, X, CheckCircle, MapPin, Clock, Zap, Mountain, Link, Map } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import asciendeLogoSrc from '../../assets/Asciendelogo.png';

const PRODUCTION_URL = 'https://hub.asciende.pro';

const KRONA_ONE_URL = 'https://fonts.gstatic.com/s/kronaone/v14/jAnEgHdjHcjgfIb1ZcUCMY-h.woff2';
const FONT_NAME = 'Krona One';
const FONT_FALLBACK = 'sans-serif';

const SPORT_META: Record<string, { label: string; labelEs: string; color: string }> = {
  run:             { label: 'Run',             labelEs: 'Carrera',          color: '#f5c400' },
  trail_run:       { label: 'Trail Run',       labelEs: 'Trail Run',        color: '#84cc16' },
  road_bike:       { label: 'Road Bike',       labelEs: 'Bicicleta Ruta',   color: '#3b82f6' },
  mountain_bike:   { label: 'Mountain Bike',   labelEs: 'Bicicleta MTB',    color: '#f97316' },
  gravel_bike:     { label: 'Gravel Bike',     labelEs: 'Gravel',           color: '#a3e635' },
  open_water_swim: { label: 'Open Water Swim', labelEs: 'Aguas Abiertas',   color: '#06b6d4' },
  swim:            { label: 'Swimming',        labelEs: 'Natación',         color: '#06b6d4' },
  hike:            { label: 'Hike',            labelEs: 'Senderismo',       color: '#d97706' },
  nordic_ski:      { label: 'Nordic Ski',      labelEs: 'Esquí Nórdico',    color: '#7dd3fc' },
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

type CardType = 'map' | 'transparent' | 'story';

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
  x: number, y: number, w: number, h: number, pad = 40
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
  const scale = Math.min(availW / dLon, availH / dLat);
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

function drawRoute(
  ctx: CanvasRenderingContext2D,
  projected: Array<[number, number]>,
  color: string,
  lineWidth = 4,
  glowSize = 20
) {
  if (projected.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.shadowColor = color + '88';
  ctx.shadowBlur = glowSize;
  ctx.beginPath();
  ctx.moveTo(projected[0][0], projected[0][1]);
  for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
  ctx.strokeStyle = color + '30';
  ctx.lineWidth = lineWidth * 4;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(projected[0][0], projected[0][1]);
  for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
  ctx.strokeStyle = color + '55';
  ctx.lineWidth = lineWidth * 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(projected[0][0], projected[0][1]);
  for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i][0], projected[i][1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Start dot
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(projected[0][0], projected[0][1], lineWidth * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // End dot
  const last = projected[projected.length - 1];
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(last[0], last[1], lineWidth * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawIcon(ctx: CanvasRenderingContext2D, type: string, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.15;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const r = size / 2;

  if (type === 'distance') {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3, r * 0.5, Math.PI, 0);
    ctx.lineTo(cx, cy + r * 0.7);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'time') {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.35);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + r * 0.25, cy + r * 0.15);
    ctx.stroke();
  } else if (type === 'pace') {
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.15, cy - r * 0.7);
    ctx.lineTo(cx - r * 0.25, cy - r * 0.05);
    ctx.lineTo(cx + r * 0.1, cy - r * 0.05);
    ctx.lineTo(cx - r * 0.15, cy + r * 0.7);
    ctx.stroke();
  } else if (type === 'elevation') {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.1, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.15, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.7, cy - r * 0.6);
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

export default function ActivityShareCard({ activityData, onClose }: ActivityShareCardProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [shareMode, setShareMode] = useState<'profile' | 'project'>('profile');
  const [cardType, setCardType] = useState<CardType>('map');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  const sport = SPORT_META[activityData.sportType] ?? SPORT_META['run'];
  const f = (w: string) => `${w} ${FONT_NAME}, ${FONT_FALLBACK}`;

  // Load Krona One font
  useEffect(() => {
    const font = new FontFace(FONT_NAME, `url(${KRONA_ONE_URL})`);
    font.load().then((loaded) => {
      document.fonts.add(loaded);
      setFontLoaded(true);
    }).catch(() => setFontLoaded(true));
  }, []);

  // Load logo
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { logoImgRef.current = img; setLogoLoaded(true); };
    img.onerror = () => { setLogoLoaded(true); };
    img.src = asciendeLogoSrc;
  }, []);

  // Load active project
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

  const fmtDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const fmtDate = () => {
    const d = activityData.date ? new Date(activityData.date + 'T12:00:00') : new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };

  const getPace = useCallback(() => {
    if (!activityData.distanceKm || !activityData.durationSeconds) return null;
    const isBike = ['road_bike', 'mountain_bike', 'gravel_bike'].includes(activityData.sportType);
    if (isBike) {
      return { value: ((activityData.distanceKm / activityData.durationSeconds) * 3600).toFixed(1), unit: 'km/h' };
    }
    const minPerKm = activityData.durationSeconds / 60 / activityData.distanceKm;
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    return { value: `${mins}:${String(secs).padStart(2, '0')}`, unit: 'min/km' };
  }, [activityData]);

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

  const getStatsArray = () => {
    const pace = getPace();
    return [
      { icon: 'distance', value: activityData.distanceKm.toFixed(2), label: 'km' },
      { icon: 'time', value: fmtDuration(activityData.durationSeconds), label: language === 'es' ? 'Tiempo' : 'Time' },
      { icon: 'pace', value: pace?.value || '--', label: pace?.unit || 'min/km' },
      { icon: 'elevation', value: activityData.elevationGainM > 0 ? `${Math.round(activityData.elevationGainM)}m` : '--', label: 'D+' },
    ];
  };

  // ─── Card Type 1: MAP ───────────────────────────────────────────────
  const drawMapCard = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    // Dark background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0c10');
    bg.addColorStop(0.5, '#0e1218');
    bg.addColorStop(1, '#08090d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = sport.color;
    for (let gx = 60; gx < W; gx += 40) {
      for (let gy = 60; gy < H; gy += 40) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Top accent line
    const topBar = ctx.createLinearGradient(0, 0, W, 0);
    topBar.addColorStop(0, 'transparent');
    topBar.addColorStop(0.2, '#fdda36');
    topBar.addColorStop(0.8, '#fdda36');
    topBar.addColorStop(1, 'transparent');
    ctx.fillStyle = topBar;
    ctx.fillRect(0, 0, W, 6);

    // Date top-left
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = f('400 26px');
    ctx.textAlign = 'left';
    ctx.fillText(fmtDate(), 72, 80);

    // Sport type top-right
    const sportLabel = (language === 'es' ? sport.labelEs : sport.label).toUpperCase();
    ctx.fillStyle = sport.color;
    ctx.font = f('700 22px');
    ctx.textAlign = 'right';
    ctx.fillText(sportLabel, W - 72, 80);

    // GPS Map area (upper portion)
    const mapX = 60, mapY = 120;
    const mapW = W - 120, mapH = H * 0.52;

    // Map background panel
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRect(ctx, mapX, mapY, mapW, mapH, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, mapX, mapY, mapW, mapH, 28);
    ctx.stroke();

    const pts = activityData.gpsPoints;
    if (pts && pts.length >= 2) {
      const sampled = samplePoints(pts, 1500);
      const projected = projectPoints(sampled, mapX, mapY, mapW, mapH, 50);
      drawRoute(ctx, projected, sport.color, 4.5, 24);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = f('400 24px');
      ctx.textAlign = 'center';
      ctx.fillText(language === 'es' ? 'Sin ruta GPS' : 'No GPS route', mapX + mapW / 2, mapY + mapH / 2);
    }

    // Bottom section: two columns
    const bottomY = mapY + mapH + 40;
    const colW = (W - 120 - 40) / 2;
    const leftX = 60;
    const rightX = leftX + colW + 40;

    // Left column: 4 stats
    const stats = getStatsArray();
    const statSpacing = 110;

    stats.forEach((s, i) => {
      const sy = bottomY + i * statSpacing;
      drawIcon(ctx, s.icon, leftX + 24, sy + 20, 28, sport.color);
      ctx.fillStyle = '#ffffff';
      ctx.font = f('700 56px');
      ctx.textAlign = 'left';
      ctx.fillText(s.value, leftX + 56, sy + 24);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = f('400 28px');
      ctx.fillText(s.label, leftX + 56, sy + 64);
    });

    // Right column: CTA + Logo
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

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `400 24px ${FONT_FALLBACK}`;
    const urlLines = wrapText(ctx, ctaUrl, colW);
    ctaTextY += 12;
    urlLines.forEach((line) => {
      ctx.fillText(line, rightX, ctaTextY);
      ctaTextY += 32;
    });

    // Logo - bigger
    drawLogoOrText(ctx, logoImgRef.current, rightX + colW / 2, H - 120, colW * 0.85, 110, f('700 48px'));

    // Bottom accent line
    ctx.fillStyle = topBar;
    ctx.fillRect(0, H - 6, W, 6);
  }, [activityData, language, sport, shareMode, activeProject, profile]);

  // ─── Card Type 2: TRANSPARENT ───────────────────────────────────────
  const drawTransparentCard = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.clearRect(0, 0, W, H);

    // Dark background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#111111');
    grad.addColorStop(1, '#1e1e1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Accent top bar
    ctx.fillStyle = '#fdda36';
    ctx.fillRect(0, 0, W, 8);

    // Sport type at top
    const sportLabel = (language === 'es' ? sport.labelEs : sport.label).toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = f('700 44px');
    ctx.textAlign = 'center';
    ctx.fillText(sportLabel, W / 2, 120);

    // Thin divider
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.2, 155);
    ctx.lineTo(W * 0.8, 155);
    ctx.stroke();

    // 4 stats stacked vertically - bigger
    const stats = getStatsArray();
    let statY = 260;
    const statGap = 210;

    stats.forEach((s) => {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = f('400 30px');
      ctx.textAlign = 'center';
      ctx.fillText(s.label, W / 2, statY);

      ctx.fillStyle = '#ffffff';
      ctx.font = f('700 84px');
      ctx.fillText(s.value, W / 2, statY + 90);

      statY += statGap;
    });

    // GPS route line
    const routeY = statY + 20;
    const routeH = 320;
    const pts = activityData.gpsPoints;
    if (pts && pts.length >= 2) {
      const sampled = samplePoints(pts, 1200);
      const projected = projectPoints(sampled, 80, routeY, W - 160, routeH, 30);
      drawRoute(ctx, projected, sport.color, 5, 28);
    }

    // CTA
    const ctaY = routeY + routeH + 80;
    ctx.fillStyle = '#fdda36';
    ctx.font = f('700 38px');
    ctx.textAlign = 'center';
    ctx.fillText(getCtaTitle(), W / 2, ctaY);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `400 26px ${FONT_FALLBACK}`;
    ctx.fillText(getShareUrlShort(), W / 2, ctaY + 52);

    // Logo - bigger
    drawLogoOrText(ctx, logoImgRef.current, W / 2, H - 110, W * 0.45, 100, f('700 44px'));
  }, [activityData, language, sport, shareMode, activeProject, profile]);

  // ─── Card Type 3: STORY ─────────────────────────────────────────────
  const drawStoryCard = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.clearRect(0, 0, W, H);

    // Dark background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0d0d0d');
    grad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Accent top bar
    ctx.fillStyle = '#fdda36';
    ctx.fillRect(0, 0, W, 8);

    // Rounded map card at top
    const cardPad = 60;
    const cardX = cardPad;
    const cardY = 100;
    const cardW = W - cardPad * 2;
    const cardH = 700;
    const cardR = 36;

    // Card background with subtle fill
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.stroke();

    // GPS route inside card
    const pts = activityData.gpsPoints;
    if (pts && pts.length >= 2) {
      const sampled = samplePoints(pts, 1500);
      const mapArea = { x: cardX + 20, y: cardY + 20, w: cardW - 40, h: cardH - 120 };
      const projected = projectPoints(sampled, mapArea.x, mapArea.y, mapArea.w, mapArea.h, 40);
      drawRoute(ctx, projected, sport.color, 4, 20);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = f('400 24px');
      ctx.textAlign = 'center';
      ctx.fillText(language === 'es' ? 'Sin ruta GPS' : 'No GPS route', cardX + cardW / 2, cardY + cardH / 2 - 40);
    }

    // Stats row at bottom of card
    const stats = getStatsArray();
    const rowY = cardY + cardH - 90;
    const colW = cardW / stats.length;

    stats.forEach((s, i) => {
      const cx = cardX + colW * i + colW / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = f('400 22px');
      ctx.textAlign = 'center';
      ctx.fillText(s.label, cx, rowY);

      ctx.fillStyle = '#ffffff';
      ctx.font = f('700 38px');
      ctx.fillText(s.value, cx, rowY + 48);
    });

    // Sport type + date below card
    const infoY = cardY + cardH + 70;
    const sportLabel = (language === 'es' ? sport.labelEs : sport.label);
    ctx.fillStyle = '#ffffff';
    ctx.font = f('700 48px');
    ctx.textAlign = 'center';
    ctx.fillText(sportLabel, W / 2, infoY);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = f('400 30px');
    ctx.fillText(fmtDate(), W / 2, infoY + 56);

    // CTA section
    const ctaY = infoY + 140;
    ctx.fillStyle = '#fdda36';
    ctx.font = f('700 38px');
    ctx.fillText(getCtaTitle(), W / 2, ctaY);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `400 26px ${FONT_FALLBACK}`;
    ctx.fillText(getShareUrlShort(), W / 2, ctaY + 52);

    // Logo - bigger
    drawLogoOrText(ctx, logoImgRef.current, W / 2, H - 110, W * 0.45, 100, f('700 44px'));
  }, [activityData, language, sport, shareMode, activeProject, profile]);

  // Generate card on canvas
  const generateCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    if (cardType === 'map') drawMapCard(ctx, W, H);
    else if (cardType === 'transparent') drawTransparentCard(ctx, W, H);
    else drawStoryCard(ctx, W, H);
  }, [cardType, drawMapCard, drawTransparentCard, drawStoryCard]);

  useEffect(() => {
    if (!ready || !fontLoaded || !logoLoaded) return;
    const raf = requestAnimationFrame(() => generateCard());
    return () => cancelAnimationFrame(raf);
  }, [ready, fontLoaded, logoLoaded, generateCard]);

  // ─── Share Handlers ─────────────────────────────────────────────────
  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) return;
    const dateStr = activityData.date || new Date().toISOString().split('T')[0];
    const fileName = `asciende-${cardType}-${activityData.sportType}-${dateStr}.png`;

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

      const dateStr = activityData.date || new Date().toISOString().split('T')[0];
      const file = new File([blob], `asciende-${cardType}-${dateStr}.png`, { type: 'image/png' });
      const shareUrl = getShareUrl();
      const sportName = language === 'es' ? sport.labelEs : sport.label;
      const distStr = activityData.distanceKm.toFixed(2);

      const text = (shareMode === 'project' && activeProject)
        ? (language === 'es'
          ? `${distStr}km de ${sportName}. Apoya mi proyecto: ${activeProject.title}`
          : `${distStr}km ${sportName}. Support my project: ${activeProject.title}`)
        : (language === 'es'
          ? `${distStr}km de ${sportName}. Sigue mi progreso en Asciende!`
          : `${distStr}km ${sportName}. Follow my progress on Asciende!`);

      if (navigator.share) {
        const shareData: ShareData = {
          title: `${profile?.full_name || 'Athlete'} — ${sportName}`,
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

  const pace = getPace();

  const CARD_TYPES: { id: CardType; label: string; labelEs: string; desc: string; descEs: string }[] = [
    { id: 'map', label: 'Map', labelEs: 'Mapa', desc: 'Dark with GPS route', descEs: 'Oscuro con ruta GPS' },
    { id: 'transparent', label: 'Transparent', labelEs: 'Transparente', desc: 'Overlay on photos', descEs: 'Para pegar en fotos' },
    { id: 'story', label: 'Story', labelEs: 'Story', desc: 'Card with map', descEs: 'Tarjeta con mapa' },
  ];

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full my-4 shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: sport.color + '22' }}>
              <Share2 className="w-4.5 h-4.5" style={{ color: sport.color }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'es' ? 'Compartir Actividad' : 'Share Activity'}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {language === 'es' ? sport.labelEs : sport.label} · {activityData.distanceKm.toFixed(2)} km
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[82vh] overflow-y-auto">

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { icon: MapPin,   v: activityData.distanceKm.toFixed(2), l: 'km' },
              { icon: Clock,    v: fmtDuration(activityData.durationSeconds), l: language === 'es' ? 'Tiempo' : 'Time' },
              ...(pace ? [{ icon: Zap, v: pace.value, l: pace.unit }] : []),
              ...(activityData.elevationGainM > 0 ? [{ icon: Mountain, v: `${Math.round(activityData.elevationGainM)}m`, l: 'D+' }] : []),
            ].slice(0, 4).map(({ icon: Icon, v, l }) => (
              <div key={l} className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-2 text-center">
                <Icon className="w-3 h-3 text-neutral-400 mx-auto mb-0.5" />
                <p className="text-xs font-bold text-neutral-900 dark:text-white leading-none">{v}</p>
                <p className="text-[9px] text-neutral-500 dark:text-neutral-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          {/* Card Type Selector */}
          <div>
            <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">
              {language === 'es' ? 'Estilo' : 'Style'}
            </p>
            <div className="flex gap-1.5">
              {CARD_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => setCardType(ct.id)}
                  className={`flex-1 py-2 px-2 rounded-xl text-left border-2 transition-all ${
                    cardType === ct.id
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <p className={`text-[11px] font-bold ${cardType === ct.id ? 'text-amber-700 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {language === 'es' ? ct.labelEs : ct.label}
                  </p>
                  <p className="text-[9px] text-neutral-400 mt-0.5">{language === 'es' ? ct.descEs : ct.desc}</p>
                </button>
              ))}
            </div>
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
            style={
              cardType !== 'map'
                ? { backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }
                : { backgroundColor: '#1a1a1a' }
            }
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
