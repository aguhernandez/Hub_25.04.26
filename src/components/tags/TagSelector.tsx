import { useState, useEffect, useRef } from 'react';
import { Tag as TagIcon, Plus, Search, X, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TagPill, { Tag, CATEGORY_STYLES } from './TagPill';

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  language?: string;
  placeholder?: string;
  canCreate?: boolean;
}

const CATEGORIES = ['training', 'nutrition', 'recovery', 'performance', 'mindset', 'methodology', 'other'];

const CATEGORY_LABELS: Record<string, { en: string; es: string }> = {
  training: { en: 'Training', es: 'Entrenamiento' },
  nutrition: { en: 'Nutrition', es: 'Nutrición' },
  recovery: { en: 'Recovery', es: 'Recuperación' },
  performance: { en: 'Performance', es: 'Rendimiento' },
  mindset: { en: 'Mindset', es: 'Mentalidad' },
  methodology: { en: 'Methodology', es: 'Metodología' },
  other: { en: 'Other', es: 'Otro' },
};

export default function TagSelector({ selectedTagIds, onChange, language = 'en', placeholder, canCreate = false }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('training');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadTags() {
    const { data } = await supabase.from('tags').select('*').order('usage_count', { ascending: false });
    if (data) setAllTags(data);
  }

  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));

  const filtered = allTags.filter(t => {
    const label = language === 'es' && t.name_es ? t.name_es : t.name;
    const matchSearch = label.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  function toggle(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  }

  async function createTag() {
    if (!newTagName.trim()) return;
    const slug = newTagName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { data, error } = await supabase.from('tags').insert({
      name: newTagName.trim(),
      slug,
      category: newTagCategory,
    }).select().single();
    if (!error && data) {
      setAllTags(prev => [data, ...prev]);
      onChange([...selectedTagIds, data.id]);
      setNewTagName('');
      setCreating(false);
    }
  }

  const ph = placeholder || (language === 'es' ? 'Agregar etiquetas...' : 'Add tags...');

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-[38px] flex flex-wrap items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#514163]/10 border border-gray-200 dark:border-[#514163]/40 rounded-lg cursor-text hover:border-[#514163]/60 dark:hover:border-[#514163]/60 transition-colors"
        onClick={() => setOpen(true)}
      >
        {selectedTags.map(tag => (
          <TagPill
            key={tag.id}
            tag={tag}
            language={language}
            onRemove={(id) => onChange(selectedTagIds.filter(x => x !== id))}
          />
        ))}
        <div className="flex items-center gap-1 text-[#514163] dark:text-[#514163]/70 text-sm">
          <TagIcon size={13} />
          <span className="text-gray-400 dark:text-[#514163]/60">{selectedTags.length === 0 ? ph : ''}</span>
          <ChevronDown size={13} />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-[#514163]/30 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5">
              <Search size={14} className="text-[#514163] dark:text-[#514163]/60 shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                placeholder={language === 'es' ? 'Buscar etiquetas...' : 'Search tags...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X size={12} className="text-gray-400 dark:text-gray-500" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 p-2 overflow-x-auto border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === 'all'
                  ? 'bg-[#514163]/15 text-[#514163] dark:text-[#514163]/80 border-[#514163]/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {language === 'es' ? 'Todos' : 'All'}
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat
                    ? CATEGORY_STYLES[cat]
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {CATEGORY_LABELS[cat][language as 'en' | 'es'] || CATEGORY_LABELS[cat].en}
              </button>
            ))}
          </div>

          <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 dark:text-gray-500 text-xs py-4">
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                    selected
                      ? 'bg-[#514163]/10 dark:bg-[#514163]/20 text-[#514163] dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${CATEGORY_STYLES[tag.category]?.split(' ')[0] || 'bg-gray-400'}`} />
                    {label}
                  </span>
                  <span className="flex items-center gap-2">
                    {tag.usage_count > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{tag.usage_count}</span>
                    )}
                    {selected && (
                      <div className="w-4 h-4 rounded-sm bg-[#514163] flex items-center justify-center">
                        <X size={10} className="text-white" />
                      </div>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {canCreate && (
            <div className="p-2 border-t border-gray-100 dark:border-gray-800">
              {!creating ? (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm text-[#514163] dark:text-[#514163]/80 hover:bg-[#514163]/5 dark:hover:bg-[#514163]/10 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  {language === 'es' ? 'Crear nueva etiqueta' : 'Create new tag'}
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#514163]/50"
                    placeholder={language === 'es' ? 'Nombre de etiqueta...' : 'Tag name...'}
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createTag()}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                      value={newTagCategory}
                      onChange={e => setNewTagCategory(e.target.value)}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat][language as 'en' | 'es'] || CATEGORY_LABELS[cat].en}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={createTag}
                      className="px-3 py-1.5 bg-[#514163] text-white text-xs font-semibold rounded-lg hover:bg-[#514163]/90 transition-colors"
                    >
                      {language === 'es' ? 'Crear' : 'Create'}
                    </button>
                    <button
                      onClick={() => setCreating(false)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
