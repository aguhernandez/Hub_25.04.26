import { useEffect, useState, useRef } from 'react';
import {
  FlaskConical, Bike, Salad, GraduationCap, Wind,
  TrendingUp, ChevronRight
} from 'lucide-react';
import asciendeLogoBlanco from '../assets/Asciende_logo_blanco.png';

interface SplashScreenProps {
  onLoadComplete: () => void;
  onSatelliteSelect?: (satelliteId: string | null) => void;
  minimal?: boolean;
  skipAnimation?: boolean;
}

const SATELLITES = [
  { id: 'lab',       label_es: 'LAB',       label_en: 'LAB',       icon: FlaskConical, color: '#38bdf8', side: 'left'  as const },
  { id: 'endurance', label_es: 'Endurance', label_en: 'Endurance', icon: Bike,         color: '#4ade80', side: 'left'  as const },
  { id: 'nutrition', label_es: 'Nutrition', label_en: 'Nutrition', icon: Salad,        color: '#fb923c', side: 'left'  as const },
  { id: 'academy',     label_es: 'Academy',     label_en: 'Academy',     icon: GraduationCap, color: '#c084fc', side: 'right' as const },
  { id: 'motion',      label_es: 'Motion',      label_en: 'Motion',      icon: Wind,          color: '#f472b6', side: 'right' as const },
  { id: 'performance', label_es: 'Performance', label_en: 'Performance', icon: TrendingUp,    color: '#facc15', side: 'right' as const },
];

function PulseWaveform({ pulseCount }: { pulseCount: number }) {
  const totalLength = 900;
  const dashOffset =
    pulseCount === 0 ? totalLength
    : pulseCount === 1 ? totalLength * 0.66
    : pulseCount === 2 ? totalLength * 0.28
    : 0;

  const path =
    'M0,32 C8,32 12,32 20,32 C26,32 28,32 32,32 L36,32 C38,32 39,31 40,28 L42,18 C43,10 44,4 46,2 C48,0 49,0 50,2 L52,8 C53,12 54,42 56,48 C57,52 58,56 60,52 L62,44 C63,40 64,32 68,32 L80,32 C84,32 86,32 90,32 L92,32 C94,32 95,30 96,26 L98,16 C99,8 100,3 102,2 C104,1 105,1 106,4 L108,12 C109,18 110,46 112,50 C113,53 114,56 116,52 L118,43 C119,38 120,32 126,32 L140,32 C144,32 146,32 150,32 L152,32 C153,31 154,30 155,27 L157,15 C158,7 159,2 161,1 C163,0 164,0 165,3 L167,11 C168,18 169,48 171,52 C172,54 173,57 175,51 L177,42 C178,37 180,32 186,32 L200,32 C204,32 208,32 220,32';

  return (
    <div className="relative flex items-center justify-center" style={{ width: '240px', height: '64px' }}>
      <svg width={240} height={64} viewBox="0 0 220 64" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#514163" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#fdda36" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#f5a623" stopOpacity="1" />
            <stop offset="85%" stopColor="#fdda36" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#514163" stopOpacity="0.2" />
          </linearGradient>
          <filter id="pulseGlow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="pulseGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#514163" stopOpacity="0" />
            <stop offset="35%" stopColor="#fdda36" stopOpacity="0.3" />
            <stop offset="65%" stopColor="#f5a623" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#514163" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="url(#pulseGlowGrad)" strokeWidth="7" strokeLinecap="round"
          filter="url(#pulseGlow)"
          style={{ strokeDasharray: totalLength, strokeDashoffset: dashOffset, transition: 'stroke-dashoffset 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        />
        <path d={path} fill="none" stroke="url(#pulseGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: totalLength, strokeDashoffset: dashOffset, transition: 'stroke-dashoffset 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        />
        {pulseCount > 0 && pulseCount < 3 && (
          <circle cx={pulseCount === 1 ? 74 : 148} cy="32" r="3.5" fill="#fdda36"
            style={{ filter: 'drop-shadow(0 0 8px rgba(253, 218, 54, 1))' }} />
        )}
        {pulseCount >= 3 && (
          <circle cx="220" cy="32" r="3" fill="#fdda36"
            style={{ filter: 'drop-shadow(0 0 6px rgba(253, 218, 54, 0.9))' }} />
        )}
      </svg>
    </div>
  );
}

export default function SplashScreen({ onLoadComplete, onSatelliteSelect, minimal = false, skipAnimation = false }: SplashScreenProps) {
  // phases: enter → hold (pulse animates) → rise (logo rises, phone+sats appear) → interactive (full orbit visible)
  const [phase, setPhase] = useState<'enter' | 'hold' | 'rise' | 'interactive'>(skipAnimation ? 'interactive' : 'enter');
  const [pulseCount, setPulseCount] = useState(skipAnimation ? 3 : 0);
  const [viewportW, setViewportW] = useState(() => window.innerWidth);

  const [language] = useState<'es' | 'en'>(() => {
    const stored = localStorage.getItem('asciende_language');
    return (stored === 'es' || stored === 'en') ? stored : 'es';
  });
  const [particlePositions] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.8 + 0.4,
      duration: Math.random() * 10 + 7,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.25 + 0.04,
      yellow: i % 3 === 0,
    }))
  );
  const called = useRef(false);
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;

  useEffect(() => {
    if (skipAnimation) {
      called.current = true;
      return;
    }

    if (minimal) {
      const t = setTimeout(() => { if (!called.current) { called.current = true; onLoadCompleteRef.current(); } }, 800);
      return () => clearTimeout(t);
    }

    const t1 = setTimeout(() => setPhase('hold'), 180);
    let intervalRef: ReturnType<typeof setInterval> | null = null;
    let rise1: ReturnType<typeof setTimeout> | null = null;
    let rise2: ReturnType<typeof setTimeout> | null = null;

    const pulseStart = setTimeout(() => {
      let count = 0;
      intervalRef = setInterval(() => {
        count++;
        setPulseCount(count);
        if (count >= 3) {
          if (intervalRef) clearInterval(intervalRef);
          rise1 = setTimeout(() => {
            setPhase('rise');
            rise2 = setTimeout(() => {
              setPhase('interactive');
              if (!called.current) { called.current = true; onLoadCompleteRef.current(); }
            }, 1100);
          }, 500);
        }
      }, 800);
    }, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(pulseStart);
      if (intervalRef) clearInterval(intervalRef);
      if (rise1) clearTimeout(rise1);
      if (rise2) clearTimeout(rise2);
    };
  }, [minimal, skipAnimation]);

  useEffect(() => {
    const handler = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Scale the phone+satellites layout to fit viewport — full size at 560px+, scales down below
  const LAYOUT_NATURAL_W = 514; // 100 + 22 + 270 + 22 + 100
  const layoutScale = Math.min(1, (viewportW - 16) / LAYOUT_NATURAL_W);

  const isRising = phase === 'rise' || phase === 'interactive';
  const isInteractive = phase === 'interactive';

  const handleSatelliteClick = (id: string) => {
    if (onSatelliteSelect) onSatelliteSelect(id);
    else onLoadComplete();
  };

  const handleHubClick = () => {
    if (onSatelliteSelect) onSatelliteSelect(null);
    else onLoadComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        background: 'linear-gradient(155deg, #1A1128 0%, #0E0A1A 35%, #160F22 65%, #0A0814 100%)',
      }}
    >
      {/* Particle field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particlePositions.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: `${p.size}px`, height: `${p.size}px`,
              background: p.yellow ? '#fdda36' : '#514163',
              opacity: p.opacity,
              animationName: `particleDrift${p.id}`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            }}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(81,65,99,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(81,65,99,0.06) 1px,transparent 1px)`,
          backgroundSize: '56px 56px',
        }}
      />

      {/* Atmospheric glow */}
      <div className="absolute pointer-events-none"
        style={{
          width: '600px', height: '600px',
          top: '50%', left: '50%',
          transform: isRising ? 'translate(-50%,-72%) scale(0.6)' : 'translate(-50%,-50%) scale(1)',
          background: 'radial-gradient(ellipse at center,rgba(253,218,54,0.07) 0%,rgba(81,65,99,0.05) 45%,transparent 72%)',
          borderRadius: '50%',
          transition: 'transform 1s cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      {/* ─── LOGO + PULSE block — rises to top ─── */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center select-none"
        style={{
          top: '50%',
          transform: phase === 'enter'
            ? 'translate(0, calc(-50% + 20px))'
            : isRising
            ? 'translate(0, calc(-50vh + 68px))'
            : 'translate(0, -50%)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: phase === 'enter'
            ? 'opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)'
            : 'opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1)',
          zIndex: 20,
        }}
      >
        {/* Logo container with rings */}
        <div className="relative flex items-center justify-center"
          style={{
            width: isRising ? 90 : 220,
            height: isRising ? 90 : 220,
            transition: 'width 1s cubic-bezier(0.16,1,0.3,1), height 1s cubic-bezier(0.16,1,0.3,1)',
            marginBottom: isRising ? 8 : 32,
          }}
        >
          <svg style={{ position: 'absolute', width: '100%', height: '100%', opacity: isRising ? 0 : 1, transition: 'opacity 0.35s ease' }} viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="100" fill="none" stroke="#fdda36" strokeWidth="1.4"
              strokeDasharray="628.32"
              strokeDashoffset={phase === 'enter' ? 628.32 : 0}
              style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1) 0.3s', transform: 'rotate(-90deg)', transformOrigin: '50% 50%', opacity: 0.45 }}
            />
          </svg>
          <svg style={{ position: 'absolute', width: '74%', height: '74%', opacity: isRising ? 0 : 1, transition: 'opacity 0.35s ease' }} viewBox="0 0 164 164">
            <circle cx="82" cy="82" r="72" fill="none" stroke="#fdda36" strokeWidth="1.2"
              strokeDasharray="452.4"
              strokeDashoffset={phase === 'enter' ? 452.4 : 0}
              style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.16,1,0.3,1) 0.55s', transform: 'rotate(-90deg)', transformOrigin: '50% 50%', opacity: 0.2 }}
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div style={{ opacity: phase === 'enter' ? 0 : 1, transform: phase === 'enter' ? 'translateY(12px)' : 'translateY(0)', transition: 'opacity 0.85s cubic-bezier(0.16,1,0.3,1) 0.2s, transform 0.85s cubic-bezier(0.16,1,0.3,1) 0.2s' }}>
          <img
            src={asciendeLogoBlanco}
            alt="Asciende"
            style={{
              height: isRising ? '28px' : '56px',
              width: 'auto',
              objectFit: 'contain',
              transition: 'height 1s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        </div>

        {/* Pulse waveform — fades out when rising */}
        <div style={{ opacity: isRising ? 0 : 1, transition: 'opacity 0.35s ease', pointerEvents: 'none' }}>
          <PulseWaveform pulseCount={pulseCount} />
        </div>

        {/* Tagline — fades out when rising */}
        <div style={{ opacity: isRising ? 0 : phase === 'enter' ? 0 : 1, transition: isRising ? 'opacity 0.25s ease' : 'opacity 1.1s ease 0.55s', pointerEvents: 'none' }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: '0.62rem', fontWeight: 300, letterSpacing: '0.3em', color: 'rgba(253,218,54,0.4)', textTransform: 'uppercase', textAlign: 'center' }}>
            Performance &nbsp;·&nbsp; Science &nbsp;·&nbsp; Community
          </p>
        </div>
      </div>

      {/* ─── PHONE MOCKUP + SATELLITES — rises from bottom ─── */}
      <div
        className="absolute inset-0 flex items-end justify-center"
        style={{
          transform: isRising ? 'translateY(0)' : 'translateY(110%)',
          opacity: isRising ? 1 : 0,
          transition: 'transform 1s cubic-bezier(0.16,1,0.3,1) 0.15s, opacity 0.6s ease 0.15s',
          zIndex: 10,
          paddingBottom: '24px',
          paddingTop: '100px',
          alignItems: 'center',
        }}
      >
        {/* Outer row: [left sats] [phone] [right sats] */}
        <div
          className="flex items-center"
          style={{
            gap: '22px',
            transform: `scale(${layoutScale})`,
            transformOrigin: 'center bottom',
          }}
        >

          {/* Left satellites column */}
          <div className="flex flex-col gap-4" style={{ alignItems: 'flex-end' }}>
            {SATELLITES.filter(s => s.side === 'left').map((sat, i) => {
              const Icon = sat.icon;
              return (
                <button
                  key={sat.id}
                  onClick={() => handleSatelliteClick(sat.id)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border"
                  style={{
                    width: '100px',
                    background: `${sat.color}0a`,
                    borderColor: `${sat.color}30`,
                    backdropFilter: 'blur(16px)',
                    opacity: isInteractive ? 1 : 0,
                    transform: isInteractive ? 'translateX(0) scale(1)' : 'translateX(-28px) scale(0.88)',
                    transition: `opacity 0.5s ease ${0.12 + i * 0.09}s, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${0.12 + i * 0.09}s`,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${sat.color}18`; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${sat.color}22`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${sat.color}0a`; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${sat.color}1a`, border: `1px solid ${sat.color}30` }}>
                    <Icon className="w-5 h-5" style={{ color: sat.color }} />
                  </div>
                  <span className="text-xs font-semibold text-center leading-tight" style={{ color: sat.color }}>
                    {language === 'es' ? sat.label_es : sat.label_en}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Phone mockup */}
          <div className="relative flex flex-col items-center" style={{ flexShrink: 0 }}>
            {/* Beta / under development banner */}
            <div
              style={{
                position: 'absolute',
                top: '-68px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '270px',
                opacity: isInteractive ? 1 : 0,
                transition: 'opacity 0.5s ease 0.6s',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  background: 'rgba(253,218,54,0.07)',
                  border: '1px solid rgba(253,218,54,0.22)',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#fdda36', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Under Development
                </p>
                <p style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4', fontWeight: 400 }}>
                  We love that you're exploring. Your feedback helps us improve.
                </p>
              </div>
            </div>
            {/* Connector SVG (overflow-visible, from phone edges into satellite columns) */}
            <svg
              className="absolute pointer-events-none"
              style={{ position: 'absolute', top: 0, left: 0, width: '270px', height: '560px', overflow: 'visible', opacity: isInteractive ? 1 : 0, transition: 'opacity 0.5s ease 0.35s' }}
            >
              {/* Left lines */}
              <line x1="0" y1="168" x2="-22" y2="140" stroke="#38bdf8" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 5" />
              <line x1="0" y1="280" x2="-22" y2="280" stroke="#4ade80" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 5" />
              <line x1="0" y1="392" x2="-22" y2="420" stroke="#fb923c" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 5" />
              {/* Right lines */}
              <line x1="270" y1="196" x2="292" y2="168" stroke="#c084fc" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 5" />
              <line x1="270" y1="336" x2="292" y2="364" stroke="#f472b6" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 5" />
            </svg>

            <div
              style={{
                width: '270px',
                height: '560px',
                borderRadius: '56px',
                background: 'linear-gradient(155deg, #1e1730 0%, #100d1c 60%, #0a0814 100%)',
                border: '2.5px solid rgba(255,255,255,0.13)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 48px 96px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.09)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Dynamic island */}
              <div style={{
                position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)',
                width: '96px', height: '26px', background: '#050310',
                borderRadius: '16px', zIndex: 10,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
              }} />

              {/* Side button */}
              <div style={{ position: 'absolute', right: '-4px', top: '112px', width: '4px', height: '56px', background: 'rgba(255,255,255,0.14)', borderRadius: '0 2px 2px 0' }} />

              {/* Volume buttons */}
              <div style={{ position: 'absolute', left: '-4px', top: '100px', width: '4px', height: '38px', background: 'rgba(255,255,255,0.11)', borderRadius: '2px 0 0 2px' }} />
              <div style={{ position: 'absolute', left: '-4px', top: '148px', width: '4px', height: '38px', background: 'rgba(255,255,255,0.11)', borderRadius: '2px 0 0 2px' }} />

              {/* Screen content */}
              <div className="absolute inset-0 flex flex-col items-center" style={{ padding: '56px 24px 30px' }}>
                {/* Status bar */}
                <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-8" style={{ zIndex: 5 }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>9:41</span>
                  <div style={{ width: '14px', height: '8px', border: '1px solid rgba(255,255,255,0.28)', borderRadius: '2px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '2px', top: '2px', width: '9px', height: '3px', background: '#fdda36', borderRadius: '1px' }} />
                  </div>
                </div>

                {/* App content */}
                <div className="w-full flex flex-col items-center justify-center flex-1">
                  <img
                    src={asciendeLogoBlanco}
                    alt="Asciende"
                    style={{ height: '18px', width: 'auto', objectFit: 'contain', marginBottom: '8px' }}
                  />

                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', marginBottom: '28px', textAlign: 'center' }}>
                    {language === 'es' ? 'Hub Principal' : 'Main Hub'}
                  </div>

                  {/* Hub CTA */}
                  <button
                    onClick={handleHubClick}
                    className="w-full flex items-center justify-center gap-1.5 rounded-2xl font-bold"
                    style={{ padding: '13px 14px', background: 'linear-gradient(135deg,#fdda36 0%,#f5c400 100%)', color: '#1a1428', fontSize: '12px', letterSpacing: '0.03em' }}
                  >
                    {language === 'es' ? 'Ingresar al Hub' : 'Enter Hub'}
                    <ChevronRight style={{ width: '12px', height: '12px' }} />
                  </button>
                </div>
              </div>

              {/* Screen top glare */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(160deg,rgba(255,255,255,0.035) 0%,transparent 35%)', borderRadius: '54px' }} />
            </div>

            {/* Home indicator */}
            <div style={{ width: '56px', height: '4px', background: 'rgba(255,255,255,0.18)', borderRadius: '2px', marginTop: '14px' }} />

            {/* Hint */}
            <p style={{
              marginTop: '12px', fontSize: '11px',
              color: isInteractive ? 'rgba(255,255,255,0.22)' : 'transparent',
              letterSpacing: '0.06em', textAlign: 'center',
              transition: 'color 0.5s ease 0.7s',
            }}>
              {language === 'es' ? 'Selecciona tu destino' : 'Select your destination'}
            </p>
          </div>

          {/* Right satellites column */}
          <div className="flex flex-col gap-4" style={{ alignItems: 'flex-start' }}>
            {SATELLITES.filter(s => s.side === 'right').map((sat, i) => {
              const Icon = sat.icon;
              return (
                <button
                  key={sat.id}
                  onClick={() => handleSatelliteClick(sat.id)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border"
                  style={{
                    width: '100px',
                    background: `${sat.color}0a`,
                    borderColor: `${sat.color}30`,
                    backdropFilter: 'blur(16px)',
                    opacity: isInteractive ? 1 : 0,
                    transform: isInteractive ? 'translateX(0) scale(1)' : 'translateX(28px) scale(0.88)',
                    transition: `opacity 0.5s ease ${0.12 + i * 0.09}s, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${0.12 + i * 0.09}s`,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${sat.color}18`; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${sat.color}22`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${sat.color}0a`; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${sat.color}1a`, border: `1px solid ${sat.color}30` }}>
                    <Icon className="w-5 h-5" style={{ color: sat.color }} />
                  </div>
                  <span className="text-xs font-semibold text-center leading-tight" style={{ color: sat.color }}>
                    {language === 'es' ? sat.label_es : sat.label_en}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: '120px', background: 'linear-gradient(to top,rgba(10,8,20,0.6),transparent)' }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Krona+One&family=Jost:wght@300;400&display=swap');
        ${particlePositions.map(p => `
          @keyframes particleDrift${p.id} {
            0%   { transform: translate(0,0) scale(1); }
            50%  { transform: translate(${(Math.random()*30-15).toFixed(1)}px,${(Math.random()*-30-5).toFixed(1)}px) scale(${(Math.random()*0.8+0.8).toFixed(2)}); }
            100% { transform: translate(${(Math.random()*20-10).toFixed(1)}px,${(Math.random()*20-10).toFixed(1)}px) scale(1); }
          }
        `).join('')}
      `}</style>
    </div>
  );
}
