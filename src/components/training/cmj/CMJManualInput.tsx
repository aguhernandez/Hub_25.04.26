import { useState } from 'react';
import { Timer, ArrowUp, Zap } from 'lucide-react';
import { calculateJumpHeight, calculateSayersPower, CMJJump } from './CMJTypes';
import { useLanguage } from '../../../contexts/LanguageContext';

interface CMJManualInputProps {
  jumpNumber: number;
  bodyMassKg?: number;
  onJumpAdded: (jump: CMJJump) => void;
}

export default function CMJManualInput({ jumpNumber, bodyMassKg, onJumpAdded }: CMJManualInputProps) {
  const { language } = useLanguage();
  const [inputMode, setInputMode] = useState<'time' | 'height'>('time');
  const [flightTimeMs, setFlightTimeMs] = useState('');
  const [heightCm, setHeightCm] = useState('');

  const txt = {
    jump: language === 'es' ? `Salto #${jumpNumber}` : `Jump #${jumpNumber}`,
    flightTime: language === 'es' ? 'Tiempo de vuelo' : 'Flight time',
    directHeight: language === 'es' ? 'Altura directa' : 'Direct height',
    height: language === 'es' ? 'Altura' : 'Height',
    flightTimeShort: language === 'es' ? 'T. vuelo' : 'Flight',
    power: language === 'es' ? 'Potencia' : 'Power',
    addJump: language === 'es' ? 'Agregar salto' : 'Add jump',
    placeholder: inputMode === 'time'
      ? (language === 'es' ? 'ej: 580' : 'e.g. 580')
      : (language === 'es' ? 'ej: 42.5' : 'e.g. 42.5'),
  };

  const preview = (() => {
    if (inputMode === 'time' && flightTimeMs) {
      const t = parseFloat(flightTimeMs);
      if (!isNaN(t) && t > 0) return { height: calculateJumpHeight(t), time: t };
    }
    if (inputMode === 'height' && heightCm) {
      const h = parseFloat(heightCm);
      if (!isNaN(h) && h > 0) return { height: h, time: Math.sqrt((8 * h) / (9.81 * 100)) * 1000 };
    }
    return null;
  })();

  const handleAdd = () => {
    if (!preview) return;
    const power = bodyMassKg && bodyMassKg > 0 ? calculateSayersPower(preview.height, bodyMassKg) : undefined;
    onJumpAdded({
      jumpNumber,
      flightTimeMs: preview.time,
      jumpHeightCm: preview.height,
      estimatedPowerW: power && power > 0 ? power : undefined,
      isValid: true,
    });
    setFlightTimeMs('');
    setHeightCm('');
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800/60">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold border border-primary/30">
          {jumpNumber}
        </span>
        <span className="text-sm font-semibold text-gray-200">{txt.jump}</span>
      </div>

      <div className="flex gap-2 mb-4 p-1 bg-gray-800 rounded-xl">
        <button
          onClick={() => setInputMode('time')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            inputMode === 'time'
              ? 'bg-primary text-gray-900 shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          {txt.flightTime}
        </button>
        <button
          onClick={() => setInputMode('height')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            inputMode === 'height'
              ? 'bg-primary text-gray-900 shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <ArrowUp className="w-3.5 h-3.5" />
          {txt.directHeight}
        </button>
      </div>

      <div className="relative mb-4">
        <input
          type="number"
          value={inputMode === 'time' ? flightTimeMs : heightCm}
          onChange={(e) => inputMode === 'time' ? setFlightTimeMs(e.target.value) : setHeightCm(e.target.value)}
          placeholder={txt.placeholder}
          min={inputMode === 'time' ? '100' : '5'}
          max={inputMode === 'time' ? '1200' : '120'}
          step={inputMode === 'height' ? '0.1' : '1'}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-primary/50 transition-colors pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
          {inputMode === 'time' ? 'ms' : 'cm'}
        </span>
      </div>

      {preview && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-800 rounded-xl p-2.5 text-center border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-0.5">{txt.height}</div>
            <div className="text-sm font-bold text-primary">{preview.height.toFixed(1)} cm</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-2.5 text-center border border-gray-700/50">
            <div className="text-xs text-gray-500 mb-0.5">{txt.flightTimeShort}</div>
            <div className="text-sm font-bold text-gray-200">{preview.time.toFixed(0)} ms</div>
          </div>
          {bodyMassKg && bodyMassKg > 0 && (
            <div className="bg-gray-800 rounded-xl p-2.5 text-center border border-gray-700/50">
              <div className="text-xs text-gray-500 mb-0.5">{txt.power}</div>
              <div className="text-sm font-bold text-orange-400">
                {Math.max(0, calculateSayersPower(preview.height, bodyMassKg)).toFixed(0)} W
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={!preview}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-gray-800 disabled:text-gray-600 text-gray-900 font-semibold py-2.5 rounded-xl transition-all active:scale-95 text-sm"
      >
        <Zap className="w-4 h-4" />
        {txt.addJump}
      </button>
    </div>
  );
}
