import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Dumbbell, Stethoscope, Crown, ArrowRight, Globe, Shield } from 'lucide-react';
import AsciendeLogo from '../AsciendeLogo';

interface RoleSelectionScreenProps {
  onSelectAthlete: () => void;
  onSelectProfessional: () => void;
  onBack: () => void;
}

export default function RoleSelectionScreen({ onSelectAthlete, onSelectProfessional, onBack }: RoleSelectionScreenProps) {
  const { language, setLanguage } = useLanguage();
  const [hovered, setHovered] = useState<'athlete' | 'professional' | null>(null);

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
          width: '700px', height: '700px', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse at center, rgba(253,218,54,0.06) 0%, transparent 65%)',
        }}
      />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5 z-10">
        <button onClick={onBack} className="text-white/40 hover:text-white/70 transition-colors text-sm font-medium">
          {language === 'es' ? '← Volver' : '← Back'}
        </button>
        <div className="flex items-center gap-2">
          <AsciendeLogo variant="full" height={28} className="opacity-80" />
        </div>
        <button
          onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          {language === 'en' ? 'ES' : 'EN'}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6 py-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fdda36]/10 border border-[#fdda36]/20 mb-4">
            <Shield className="w-3.5 h-3.5 text-[#fdda36]" />
            <span className="text-xs font-semibold tracking-wider text-[#fdda36] uppercase">
              {language === 'es' ? 'Únete a Asciende' : 'Join Asciende'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Jost', sans-serif", letterSpacing: '-0.02em' }}>
            {language === 'es' ? '¿Qué eres?' : 'What are you?'}
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-md mx-auto">
            {language === 'es'
              ? 'Elige tu camino. Cada uno desbloquea herramientas distintas.'
              : 'Choose your path. Each unlocks different tools.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {/* Athlete Card */}
          <button
            onClick={onSelectAthlete}
            onMouseEnter={() => setHovered('athlete')}
            onMouseLeave={() => setHovered(null)}
            className="group relative rounded-2xl p-6 text-left transition-all duration-300 overflow-hidden"
            style={{
              background: hovered === 'athlete'
                ? 'linear-gradient(145deg, rgba(74,222,128,0.12), rgba(74,222,128,0.04))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              border: hovered === 'athlete' ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.08)',
              transform: hovered === 'athlete' ? 'translateY(-4px)' : 'translateY(0)',
              boxShadow: hovered === 'athlete' ? '0 20px 40px rgba(74,222,128,0.15)' : '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}>
                <Dumbbell className="w-6 h-6 text-[#4ade80]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{language === 'es' ? 'Atleta' : 'Athlete'}</h2>
                <p className="text-xs text-[#4ade80]/70 font-medium">{language === 'es' ? 'Entrena y mejora' : 'Train & improve'}</p>
              </div>
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              {language === 'es'
                ? 'Acceso al Hub: entrenamientos, nutrición, hábitos, bioimpedancia y más.'
                : 'Hub access: training, nutrition, habits, bioimpedance and more.'}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#4ade80] font-semibold">
              {language === 'es' ? 'Crear cuenta' : 'Create account'}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Professional Card */}
          <button
            onClick={onSelectProfessional}
            onMouseEnter={() => setHovered('professional')}
            onMouseLeave={() => setHovered(null)}
            className="group relative rounded-2xl p-6 text-left transition-all duration-300 overflow-hidden"
            style={{
              background: hovered === 'professional'
                ? 'linear-gradient(145deg, rgba(253,218,54,0.12), rgba(253,218,54,0.04))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              border: hovered === 'professional' ? '1px solid rgba(253,218,54,0.4)' : '1px solid rgba(255,255,255,0.08)',
              transform: hovered === 'professional' ? 'translateY(-4px)' : 'translateY(0)',
              boxShadow: hovered === 'professional' ? '0 20px 40px rgba(253,218,54,0.15)' : '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(253,218,54,0.15)', border: '1px solid rgba(253,218,54,0.3)' }}>
                <Stethoscope className="w-6 h-6 text-[#fdda36]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{language === 'es' ? 'Profesional' : 'Professional'}</h2>
                <p className="text-xs text-[#fdda36]/70 font-medium">{language === 'es' ? 'Entrena y guía' : 'Coach & guide'}</p>
              </div>
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              {language === 'es'
                ? 'Hub + acceso a plataformas satélite. Gestiona atletas, equipos y planes.'
                : 'Hub + satellite platform access. Manage athletes, teams and plans.'}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#fdda36] font-semibold">
              {language === 'es' ? 'Comenzar registro' : 'Start registration'}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/30">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-[#fdda36]/40" />
            <span>{language === 'es' ? 'Head Coach: acceso total' : 'Head Coach: full access'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-[#4ade80]/40" />
            <span>{language === 'es' ? 'Trainer: Hub + Endurance' : 'Trainer: Hub + Endurance'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-[#fb923c]/40" />
            <span>{language === 'es' ? 'Nutricionista: Hub + Nutrition' : 'Nutritionist: Hub + Nutrition'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
