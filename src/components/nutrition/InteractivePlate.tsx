import { useState, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, X, ChevronDown, Utensils, Leaf, Wheat, Droplets, Info, RotateCcw } from 'lucide-react';

interface PlateSection {
  id: string;
  label_es: string;
  label_en: string;
  description_es: string;
  description_en: string;
  color: string;
  lightColor: string;
  darkColor: string;
  borderColor: string;
  icon: React.ReactNode;
  examples_es: string[];
  examples_en: string[];
  targetPercent: number;
  svgPath: string;
}

interface PlateItem {
  sectionId: string;
  food: string;
  quantity: string;
}

type PlateMode = '2' | '3' | '4';

const SECTIONS_3: PlateSection[] = [
  {
    id: 'veggies',
    label_es: 'Verduras y Frutas',
    label_en: 'Vegetables & Fruits',
    description_es: 'La mitad de tu plato — prioriza vegetales de colores variados',
    description_en: 'Half your plate — prioritize colorful vegetables',
    color: '#16a34a',
    lightColor: '#f0fdf4',
    darkColor: '#14532d',
    borderColor: '#86efac',
    icon: <Leaf className="w-5 h-5" />,
    examples_es: ['Espinaca', 'Brócoli', 'Pimientos', 'Zanahoria', 'Tomate', 'Calabacín', 'Lechuga'],
    examples_en: ['Spinach', 'Broccoli', 'Bell peppers', 'Carrot', 'Tomato', 'Zucchini', 'Lettuce'],
    targetPercent: 50,
    svgPath: 'M 200,200 L 200,10 A 190,190 0 0,1 200,390 Z',
  },
  {
    id: 'protein',
    label_es: 'Proteína',
    label_en: 'Protein',
    description_es: 'Un cuarto del plato — elige fuentes magras y variadas',
    description_en: 'A quarter of your plate — choose lean and varied sources',
    color: '#dc2626',
    lightColor: '#fef2f2',
    darkColor: '#7f1d1d',
    borderColor: '#fca5a5',
    icon: <Utensils className="w-5 h-5" />,
    examples_es: ['Pollo', 'Salmón', 'Huevos', 'Legumbres', 'Tofu', 'Atún', 'Carne magra'],
    examples_en: ['Chicken', 'Salmon', 'Eggs', 'Legumes', 'Tofu', 'Tuna', 'Lean beef'],
    targetPercent: 25,
    svgPath: 'M 200,200 L 200,10 A 190,190 0 0,0 10,200 Z',
  },
  {
    id: 'carbs',
    label_es: 'Carbohidratos',
    label_en: 'Carbohydrates',
    description_es: 'Un cuarto del plato — granos integrales y tubérculos',
    description_en: 'A quarter of your plate — whole grains and tubers',
    color: '#d97706',
    lightColor: '#fffbeb',
    darkColor: '#78350f',
    borderColor: '#fcd34d',
    icon: <Wheat className="w-5 h-5" />,
    examples_es: ['Arroz integral', 'Quinoa', 'Batata', 'Avena', 'Pan integral', 'Papa'],
    examples_en: ['Brown rice', 'Quinoa', 'Sweet potato', 'Oats', 'Whole bread', 'Potato'],
    targetPercent: 25,
    svgPath: 'M 200,200 L 10,200 A 190,190 0 0,0 200,390 Z',
  },
];

const SECTIONS_2: PlateSection[] = [
  {
    id: 'vegprotein',
    label_es: 'Verduras + Proteína',
    label_en: 'Veggies + Protein',
    description_es: 'La mitad superior: vegetales y proteína magra',
    description_en: 'Top half: vegetables and lean protein',
    color: '#16a34a',
    lightColor: '#f0fdf4',
    darkColor: '#14532d',
    borderColor: '#86efac',
    icon: <Leaf className="w-5 h-5" />,
    examples_es: ['Pollo + Espinaca', 'Salmón + Brócoli', 'Tofu + Pimientos'],
    examples_en: ['Chicken + Spinach', 'Salmon + Broccoli', 'Tofu + Peppers'],
    targetPercent: 50,
    svgPath: 'M 200,200 L 10,200 A 190,190 0 0,1 390,200 Z',
  },
  {
    id: 'carbsfat',
    label_es: 'Carbohidratos + Grasas',
    label_en: 'Carbs + Fats',
    description_es: 'La mitad inferior: energía y grasas saludables',
    description_en: 'Bottom half: energy and healthy fats',
    color: '#d97706',
    lightColor: '#fffbeb',
    darkColor: '#78350f',
    borderColor: '#fcd34d',
    icon: <Wheat className="w-5 h-5" />,
    examples_es: ['Arroz integral + Aguacate', 'Quinoa + Aceite de oliva'],
    examples_en: ['Brown rice + Avocado', 'Quinoa + Olive oil'],
    targetPercent: 50,
    svgPath: 'M 200,200 L 390,200 A 190,190 0 0,1 10,200 Z',
  },
];

const SECTIONS_4: PlateSection[] = [
  {
    id: 'veggies4',
    label_es: 'Verduras',
    label_en: 'Vegetables',
    description_es: 'Prioriza vegetales no almidonados de colores vivos',
    description_en: 'Prioritize colorful non-starchy vegetables',
    color: '#16a34a',
    lightColor: '#f0fdf4',
    darkColor: '#14532d',
    borderColor: '#86efac',
    icon: <Leaf className="w-5 h-5" />,
    examples_es: ['Espinaca', 'Brócoli', 'Pimientos', 'Zanahoria', 'Tomate'],
    examples_en: ['Spinach', 'Broccoli', 'Bell peppers', 'Carrot', 'Tomato'],
    targetPercent: 25,
    svgPath: 'M 200,200 L 200,10 A 190,190 0 0,1 390,200 Z',
  },
  {
    id: 'fruits4',
    label_es: 'Frutas',
    label_en: 'Fruits',
    description_es: 'Frutas enteras, frescas o congeladas',
    description_en: 'Whole fruits, fresh or frozen',
    color: '#e11d48',
    lightColor: '#fff1f2',
    darkColor: '#881337',
    borderColor: '#fda4af',
    icon: <span className="text-sm">🍎</span>,
    examples_es: ['Manzana', 'Banana', 'Berries', 'Naranja', 'Mango'],
    examples_en: ['Apple', 'Banana', 'Berries', 'Orange', 'Mango'],
    targetPercent: 25,
    svgPath: 'M 200,200 L 390,200 A 190,190 0 0,1 200,390 Z',
  },
  {
    id: 'protein4',
    label_es: 'Proteína',
    label_en: 'Protein',
    description_es: 'Fuentes de proteína magra y de calidad',
    description_en: 'Lean, quality protein sources',
    color: '#dc2626',
    lightColor: '#fef2f2',
    darkColor: '#7f1d1d',
    borderColor: '#fca5a5',
    icon: <Utensils className="w-5 h-5" />,
    examples_es: ['Pollo', 'Salmón', 'Huevos', 'Legumbres', 'Tofu'],
    examples_en: ['Chicken', 'Salmon', 'Eggs', 'Legumes', 'Tofu'],
    targetPercent: 25,
    svgPath: 'M 200,200 L 10,200 A 190,190 0 0,1 200,10 Z',
  },
  {
    id: 'carbs4',
    label_es: 'Granos Integrales',
    label_en: 'Whole Grains',
    description_es: 'Carbohidratos complejos como base energética',
    description_en: 'Complex carbohydrates as energy base',
    color: '#d97706',
    lightColor: '#fffbeb',
    darkColor: '#78350f',
    borderColor: '#fcd34d',
    icon: <Wheat className="w-5 h-5" />,
    examples_es: ['Arroz integral', 'Quinoa', 'Avena', 'Pan integral'],
    examples_en: ['Brown rice', 'Quinoa', 'Oats', 'Whole bread'],
    targetPercent: 25,
    svgPath: 'M 200,200 L 200,390 A 190,190 0 0,1 10,200 Z',
  },
];

const DRINK_OPTIONS = {
  es: ['Agua', 'Té verde', 'Agua con limón', 'Infusión', 'Agua mineral'],
  en: ['Water', 'Green tea', 'Lemon water', 'Herbal tea', 'Mineral water'],
};

function PlateSVG3({
  sections,
  activeSection,
  items,
  onSectionClick,
}: {
  sections: PlateSection[];
  activeSection: string | null;
  items: PlateItem[];
  onSectionClick: (id: string) => void;
}) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.25))' }}>
      <defs>
        <clipPath id="plateClip3">
          <circle cx="200" cy="200" r="190" />
        </clipPath>
        <filter id="innerShadow3">
          <feOffset dx="0" dy="2" />
          <feGaussianBlur stdDeviation="3" result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood floodColor="#000" floodOpacity="0.12" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
      </defs>

      <circle cx="200" cy="200" r="195" fill="white" opacity="0.15" />
      <circle cx="200" cy="200" r="193" fill="white" />

      {sections.map((s) => {
        const isActive = activeSection === s.id;
        const hasItems = items.some((i) => i.sectionId === s.id);
        return (
          <path
            key={s.id}
            d={s.svgPath}
            fill={isActive ? s.color : hasItems ? s.color + 'cc' : s.color + '33'}
            stroke="white"
            strokeWidth="3"
            clipPath="url(#plateClip3)"
            style={{
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              filter: isActive ? `drop-shadow(0 0 12px ${s.color}88)` : 'none',
            }}
            onClick={() => onSectionClick(s.id)}
          />
        );
      })}

      <line x1="200" y1="10" x2="200" y2="390" stroke="white" strokeWidth="3" clipPath="url(#plateClip3)" />
      <line x1="10" y1="200" x2="200" y2="200" stroke="white" strokeWidth="3" clipPath="url(#plateClip3)" />

      <circle cx="200" cy="200" r="192" fill="transparent" stroke="#e5e7eb" strokeWidth="2" />
      <circle cx="200" cy="200" r="40" fill="white" stroke="#e5e7eb" strokeWidth="2" />

      {sections.map((s) => {
        const isActive = activeSection === s.id;
        const hasItems = items.some((i) => i.sectionId === s.id);
        const positions: Record<string, { x: number; y: number }> = {
          veggies: { x: 280, y: 200 },
          protein: { x: 130, y: 100 },
          carbs: { x: 100, y: 290 },
        };
        const pos = positions[s.id] || { x: 200, y: 200 };
        return (
          <g key={s.id + '-icon'} onClick={() => onSectionClick(s.id)} style={{ cursor: 'pointer' }}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="22"
              fill={isActive || hasItems ? s.color : 'white'}
              stroke={s.color}
              strokeWidth="2"
              style={{ transition: 'all 0.25s ease' }}
            />
            <text
              x={pos.x}
              y={pos.y + 5}
              textAnchor="middle"
              fontSize="16"
              fill={isActive || hasItems ? 'white' : s.color}
            >
              {s.id === 'veggies' ? '🥦' : s.id === 'protein' ? '🍗' : '🌾'}
            </text>
            {hasItems && (
              <circle cx={pos.x + 14} cy={pos.y - 14} r="8" fill="#fdda36" stroke="white" strokeWidth="1.5" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PlateSVG2({
  sections,
  activeSection,
  items,
  onSectionClick,
}: {
  sections: PlateSection[];
  activeSection: string | null;
  items: PlateItem[];
  onSectionClick: (id: string) => void;
}) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.25))' }}>
      <defs>
        <clipPath id="plateClip2">
          <circle cx="200" cy="200" r="190" />
        </clipPath>
      </defs>
      <circle cx="200" cy="200" r="193" fill="white" />
      {sections.map((s) => {
        const isActive = activeSection === s.id;
        const hasItems = items.some((i) => i.sectionId === s.id);
        return (
          <path
            key={s.id}
            d={s.svgPath}
            fill={isActive ? s.color : hasItems ? s.color + 'cc' : s.color + '33'}
            stroke="white"
            strokeWidth="3"
            clipPath="url(#plateClip2)"
            style={{ cursor: 'pointer', transition: 'all 0.25s ease', filter: isActive ? `drop-shadow(0 0 12px ${s.color}88)` : 'none' }}
            onClick={() => onSectionClick(s.id)}
          />
        );
      })}
      <line x1="10" y1="200" x2="390" y2="200" stroke="white" strokeWidth="3" clipPath="url(#plateClip2)" />
      <circle cx="200" cy="200" r="192" fill="transparent" stroke="#e5e7eb" strokeWidth="2" />
      <circle cx="200" cy="200" r="40" fill="white" stroke="#e5e7eb" strokeWidth="2" />
      {sections.map((s) => {
        const isActive = activeSection === s.id;
        const hasItems = items.some((i) => i.sectionId === s.id);
        const pos = s.id === 'vegprotein' ? { x: 200, y: 120 } : { x: 200, y: 280 };
        return (
          <g key={s.id + '-icon'} onClick={() => onSectionClick(s.id)} style={{ cursor: 'pointer' }}>
            <circle cx={pos.x} cy={pos.y} r="22" fill={isActive || hasItems ? s.color : 'white'} stroke={s.color} strokeWidth="2" style={{ transition: 'all 0.25s ease' }} />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="16" fill={isActive || hasItems ? 'white' : s.color}>
              {s.id === 'vegprotein' ? '🥗' : '🌾'}
            </text>
            {hasItems && <circle cx={pos.x + 14} cy={pos.y - 14} r="8" fill="#fdda36" stroke="white" strokeWidth="1.5" />}
          </g>
        );
      })}
    </svg>
  );
}

function PlateSVG4({
  sections,
  activeSection,
  items,
  onSectionClick,
}: {
  sections: PlateSection[];
  activeSection: string | null;
  items: PlateItem[];
  onSectionClick: (id: string) => void;
}) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.25))' }}>
      <defs>
        <clipPath id="plateClip4">
          <circle cx="200" cy="200" r="190" />
        </clipPath>
      </defs>
      <circle cx="200" cy="200" r="193" fill="white" />
      {sections.map((s) => {
        const isActive = activeSection === s.id;
        const hasItems = items.some((i) => i.sectionId === s.id);
        return (
          <path
            key={s.id}
            d={s.svgPath}
            fill={isActive ? s.color : hasItems ? s.color + 'cc' : s.color + '33'}
            stroke="white"
            strokeWidth="3"
            clipPath="url(#plateClip4)"
            style={{ cursor: 'pointer', transition: 'all 0.25s ease', filter: isActive ? `drop-shadow(0 0 12px ${s.color}88)` : 'none' }}
            onClick={() => onSectionClick(s.id)}
          />
        );
      })}
      <line x1="200" y1="10" x2="200" y2="390" stroke="white" strokeWidth="3" clipPath="url(#plateClip4)" />
      <line x1="10" y1="200" x2="390" y2="200" stroke="white" strokeWidth="3" clipPath="url(#plateClip4)" />
      <circle cx="200" cy="200" r="192" fill="transparent" stroke="#e5e7eb" strokeWidth="2" />
      <circle cx="200" cy="200" r="40" fill="white" stroke="#e5e7eb" strokeWidth="2" />
      {[
        { id: 'veggies4', pos: { x: 280, y: 110 }, emoji: '🥦' },
        { id: 'fruits4', pos: { x: 290, y: 290 }, emoji: '🍎' },
        { id: 'protein4', pos: { x: 110, y: 100 }, emoji: '🍗' },
        { id: 'carbs4', pos: { x: 105, y: 295 }, emoji: '🌾' },
      ].map(({ id, pos, emoji }) => {
        const s = sections.find((sec) => sec.id === id)!;
        const isActive = activeSection === id;
        const hasItems = items.some((i) => i.sectionId === id);
        return (
          <g key={id + '-icon'} onClick={() => onSectionClick(id)} style={{ cursor: 'pointer' }}>
            <circle cx={pos.x} cy={pos.y} r="22" fill={isActive || hasItems ? s.color : 'white'} stroke={s.color} strokeWidth="2" style={{ transition: 'all 0.25s ease' }} />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="16">{emoji}</text>
            {hasItems && <circle cx={pos.x + 14} cy={pos.y - 14} r="8" fill="#fdda36" stroke="white" strokeWidth="1.5" />}
          </g>
        );
      })}
    </svg>
  );
}

export default function InteractivePlate() {
  const { language } = useLanguage();
  const [mode, setMode] = useState<PlateMode>('3');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [items, setItems] = useState<PlateItem[]>([]);
  const [newFood, setNewFood] = useState('');
  const [newQty, setNewQty] = useState('');
  const [drink, setDrink] = useState('');
  const [showTip, setShowTip] = useState(true);
  const [showExamples, setShowExamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sections = mode === '2' ? SECTIONS_2 : mode === '3' ? SECTIONS_3 : SECTIONS_4;

  const activeData = sections.find((s) => s.id === activeSection);

  const handleSectionClick = (id: string) => {
    setActiveSection((prev) => (prev === id ? null : id));
    setNewFood('');
    setNewQty('');
    setShowExamples(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleAddItem = () => {
    if (!activeSection || !newFood.trim()) return;
    setItems((prev) => [
      ...prev,
      { sectionId: activeSection, food: newFood.trim(), quantity: newQty.trim() },
    ]);
    setNewFood('');
    setNewQty('');
    inputRef.current?.focus();
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExampleClick = (example: string) => {
    setNewFood(example);
    setShowExamples(false);
    inputRef.current?.focus();
  };

  const handleReset = () => {
    setItems([]);
    setActiveSection(null);
    setDrink('');
    setNewFood('');
    setNewQty('');
  };

  const totalItems = items.length;
  const coveredSections = new Set(items.map((i) => i.sectionId)).size;
  const isComplete = coveredSections === sections.length;

  const l = (es: string, en: string) => (language === 'es' ? es : en);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-3xl">🍽️</span>
              {l('Plato Saludable Interactivo', 'Interactive Healthy Plate')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {l('Construye tu plato ideal tocando cada sección', 'Build your ideal plate by tapping each section')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">
              {l('Divisiones:', 'Sections:')}
            </span>
            {(['2', '3', '4'] as PlateMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setActiveSection(null); setItems([]); }}
                className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${
                  mode === m
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
                }`}
              >
                {m}
              </button>
            ))}
            <button
              onClick={handleReset}
              className="ml-2 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title={l('Reiniciar', 'Reset')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showTip && (
          <div className="mb-5 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300 flex-1">
              {l(
                'Toca una sección del plato para activarla, luego escribe los alimentos que quieres agregar en esa porción.',
                'Tap a section of the plate to activate it, then type the foods you want to add to that portion.',
              )}
            </p>
            <button onClick={() => setShowTip(false)} className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div className="flex flex-col">
            <div className="relative w-full aspect-square max-w-sm mx-auto lg:max-w-full">
              <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #f9fafb, #e5e7eb)', boxShadow: '0 30px 60px rgba(0,0,0,0.15), inset 0 -4px 8px rgba(0,0,0,0.05)' }} />
              <div className="relative w-full h-full p-3">
                {mode === '2' && <PlateSVG2 sections={sections} activeSection={activeSection} items={items} onSectionClick={handleSectionClick} />}
                {mode === '3' && <PlateSVG3 sections={sections} activeSection={activeSection} items={items} onSectionClick={handleSectionClick} />}
                {mode === '4' && <PlateSVG4 sections={sections} activeSection={activeSection} items={items} onSectionClick={handleSectionClick} />}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{l('Bebida', 'Drink')}</span>
                <input
                  type="text"
                  value={drink}
                  onChange={(e) => setDrink(e.target.value)}
                  placeholder={l('Agua, té...', 'Water, tea...')}
                  className="text-xs bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 w-24 placeholder-gray-400"
                />
              </div>
              {drink && (
                <button onClick={() => setDrink('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">

            <div className="grid grid-cols-1 gap-2">
              {sections.map((s) => {
                const isActive = activeSection === s.id;
                const sectionItems = items.filter((i) => i.sectionId === s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSectionClick(s.id)}
                    className="rounded-xl border-2 transition-all cursor-pointer overflow-hidden"
                    style={{
                      borderColor: isActive ? s.color : 'transparent',
                      backgroundColor: isActive ? s.lightColor : undefined,
                    }}
                  >
                    <div
                      className={`flex items-center gap-3 px-4 py-3 ${isActive ? '' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'}`}
                      style={isActive ? { backgroundColor: s.lightColor } : {}}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: s.color + '22', color: s.color }}
                      >
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">
                            {language === 'es' ? s.label_es : s.label_en}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: s.color + '22', color: s.color }}
                            >
                              {s.targetPercent}%
                            </span>
                            {sectionItems.length > 0 && (
                              <span className="text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-2 py-0.5 rounded-full">
                                {sectionItems.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {language === 'es' ? s.description_es : s.description_en}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isActive ? 'rotate-180' : ''}`}
                        style={isActive ? { color: s.color } : {}}
                      />
                    </div>

                    {isActive && (
                      <div
                        className="px-4 pb-4 pt-2 border-t"
                        style={{ backgroundColor: s.lightColor, borderColor: s.color + '33' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {sectionItems.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {sectionItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white"
                                style={{ backgroundColor: s.color }}
                              >
                                <span>{item.food}{item.quantity ? ` · ${item.quantity}` : ''}</span>
                                <button
                                  onClick={() => {
                                    const globalIdx = items.findIndex((i, gi) => {
                                      const filtered = items.filter((ii) => ii.sectionId === s.id);
                                      return filtered[idx] === i;
                                    });
                                    handleRemoveItem(items.indexOf(sectionItems[idx]));
                                  }}
                                  className="hover:bg-white/20 rounded-full p-0.5 ml-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              ref={inputRef}
                              type="text"
                              value={newFood}
                              onChange={(e) => setNewFood(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                              placeholder={l('Escribe un alimento...', 'Type a food item...')}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 focus:outline-none focus:ring-2"
                              style={{ '--tw-ring-color': s.color + '55' } as React.CSSProperties}
                            />
                          </div>
                          <input
                            type="text"
                            value={newQty}
                            onChange={(e) => setNewQty(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            placeholder={l('Cantidad', 'Amount')}
                            className="w-24 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 focus:outline-none focus:ring-2"
                            style={{ '--tw-ring-color': s.color + '55' } as React.CSSProperties}
                          />
                          <button
                            onClick={handleAddItem}
                            disabled={!newFood.trim()}
                            className="px-3 py-2 rounded-lg text-white font-medium text-sm disabled:opacity-40 transition-all hover:opacity-90 active:scale-95"
                            style={{ backgroundColor: s.color }}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-2">
                          <button
                            onClick={() => setShowExamples((p) => !p)}
                            className="text-xs font-medium flex items-center gap-1"
                            style={{ color: s.color }}
                          >
                            {l('Ver ejemplos', 'See examples')}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
                          </button>
                          {showExamples && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(language === 'es' ? s.examples_es : s.examples_en).map((ex) => (
                                <button
                                  key={ex}
                                  onClick={() => handleExampleClick(ex)}
                                  className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all hover:text-white"
                                  style={{ borderColor: s.color, color: s.color, '--hover-bg': s.color } as React.CSSProperties}
                                  onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = s.color; (e.target as HTMLButtonElement).style.color = 'white'; }}
                                  onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.target as HTMLButtonElement).style.color = s.color; }}
                                >
                                  {ex}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {(totalItems > 0 || drink) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span className="text-base">📋</span>
                  {l('Resumen del Plato', 'Plate Summary')}
                </h3>

                <div className="space-y-2">
                  {sections.map((s) => {
                    const sItems = items.filter((i) => i.sectionId === s.id);
                    if (sItems.length === 0) return null;
                    return (
                      <div key={s.id} className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            {language === 'es' ? s.label_es : s.label_en}:
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">
                            {sItems.map((i) => `${i.food}${i.quantity ? ` (${i.quantity})` : ''}`).join(', ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {drink && (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-blue-500" />
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{l('Bebida', 'Drink')}:</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">{drink}</span>
                      </div>
                    </div>
                  )}
                </div>

                {isComplete && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400">
                    <span className="text-base">✅</span>
                    {l('¡Plato completo! Todas las secciones tienen alimentos.', 'Plate complete! All sections have foods.')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
