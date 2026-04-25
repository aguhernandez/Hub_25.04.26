import { X } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  name_es?: string | null;
  slug: string;
  category: string;
  color?: string;
}

interface TagPillProps {
  tag: Tag;
  onRemove?: (tagId: string) => void;
  language?: string;
  size?: 'sm' | 'md';
}

const CATEGORY_STYLES: Record<string, string> = {
  training: 'bg-red-500/15 text-red-400 border-red-500/20',
  nutrition: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  recovery: 'bg-green-500/15 text-green-400 border-green-500/20',
  performance: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  mindset: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  methodology: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  other: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

export default function TagPill({ tag, onRemove, language = 'en', size = 'sm' }: TagPillProps) {
  const label = language === 'es' && tag.name_es ? tag.name_es : tag.name;
  const style = CATEGORY_STYLES[tag.category] || CATEGORY_STYLES.other;
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClass} ${style}`}>
      {label}
      {onRemove && (
        <button
          onClick={() => onRemove(tag.id)}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          type="button"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

export { CATEGORY_STYLES };
export type { Tag };
