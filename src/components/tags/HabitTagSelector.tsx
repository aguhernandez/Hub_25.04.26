import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Search, Tag as TagIcon, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Tag } from './TagPill';

export const CATEGORY_DOT: Record<string, string> = {
  training: 'bg-red-500',
  nutrition: 'bg-orange-500',
  recovery: 'bg-green-500',
  performance: 'bg-blue-500',
  mindset: 'bg-pink-500',
  methodology: 'bg-yellow-500',
  other: 'bg-gray-400',
};

const GROUPS = [
  { key: 'sleep',     en: 'Sleep',         es: 'Sueño',        slugs: ['low_sleep', 'poor_sleep_quality', 'good_sleep'] },
  { key: 'mind',      en: 'Mind & Energy',  es: 'Mente',        slugs: ['high_stress', 'mental_fatigue', 'good_mental_state', 'low_energy', 'good_energy'] },
  { key: 'nutrition', en: 'Nutrition',      es: 'Nutrición',    slugs: ['poor_nutrition', 'balanced_nutrition', 'hydration_focus', 'high_protein'] },
  { key: 'recovery',  en: 'Recovery',       es: 'Recuperación', slugs: ['muscle_soreness', 'body_discomfort', 'good_recovery'] },
  { key: 'habits',    en: 'Habits',         es: 'Hábitos',      slugs: ['train_habit', 'read_habit', 'meditate', 'stretch_habit', 'mobility_habit', 'health'] },
];

interface Props {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
  language?: string;
}

export default function HabitTagSelector({ selectedTagIds, onChange, language = 'en' }: Props) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('tags')
      .select('*')
      .eq('is_habit_tag', true)
      .then(({ data }) => { if (data) setAllTags(data); });
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 280),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));

  const filtered = allTags.filter(t => {
    const label = (language === 'es' && t.name_es ? t.name_es : t.name).toLowerCase();
    const groupSlugs = group === 'all' ? null : GROUPS.find(g => g.key === group)?.slugs ?? null;
    return label.includes(search.toLowerCase()) && (groupSlugs === null || groupSlugs.includes(t.slug));
  });

  function toggle(id: string) {
    onChange(selectedTagIds.includes(id)
      ? selectedTagIds.filter(x => x !== id)
      : [...selectedTagIds, id]
    );
  }

  const ph = language === 'es' ? 'Agregar etiquetas...' : 'Add tags...';

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
      className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="p-2 border-b border-gray-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-neutral-800 rounded-lg px-2 py-1.5">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
            placeholder={language === 'es' ? 'Buscar etiquetas...' : 'Search tags...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={12} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-2 overflow-x-auto border-b border-gray-100 dark:border-neutral-800">
        {[{ key: 'all', en: 'All', es: 'Todos' }, ...GROUPS.map(g => ({ key: g.key, en: g.en, es: g.es }))].map(g => (
          <button
            key={g.key}
            onClick={() => setGroup(g.key)}
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              group === g.key
                ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 border-gray-200 dark:border-neutral-700 hover:bg-gray-200'
            }`}
          >
            {language === 'es' ? g.es : g.en}
          </button>
        ))}
      </div>

      <div className="max-h-52 overflow-y-auto p-2 space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-xs py-4">
            {language === 'es' ? 'Sin resultados' : 'No results'}
          </p>
        )}
        {filtered.map(tag => {
          const label = language === 'es' && tag.name_es ? tag.name_es : tag.name;
          const selected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => toggle(tag.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left ${
                selected
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_DOT[tag.category] || CATEGORY_DOT.other}`} />
                {label}
              </span>
              {selected && (
                <div className="w-4 h-4 rounded-sm bg-blue-600 flex items-center justify-center shrink-0">
                  <X size={10} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-2 border-t border-gray-100 dark:border-neutral-800">
        <button
          onClick={() => setOpen(false)}
          className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
        >
          {language === 'es' ? 'Cerrar' : 'Close'}
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="w-full">
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); } }}
        className="min-h-[36px] flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-neutral-500 transition-colors"
      >
        {selectedTags.map(tag => {
          const label = language === 'es' && tag.name_es ? tag.name_es : tag.name;
          return (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-200"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORY_DOT[tag.category] || CATEGORY_DOT.other}`} />
              {label}
              <span
                role="button"
                tabIndex={0}
                className="ml-0.5 hover:opacity-70 cursor-pointer"
                onClick={e => { e.stopPropagation(); onChange(selectedTagIds.filter(x => x !== tag.id)); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onChange(selectedTagIds.filter(x => x !== tag.id)); } }}
              >
                <X size={10} />
              </span>
            </span>
          );
        })}
        <span className="flex items-center gap-1 text-gray-400 dark:text-neutral-500 text-xs ml-1">
          <TagIcon size={12} />
          {selectedTags.length === 0 && <span>{ph}</span>}
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </div>
      {dropdown}
    </div>
  );
}
