import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTags, ContentType } from '../../hooks/useTags';
import TagSelector from './TagSelector';
import TagPill from './TagPill';
import type { Tag } from './TagPill';

interface TagsSectionProps {
  contentType: ContentType;
  contentId: string;
  currentUserId?: string;
  isTrainerOrAdmin?: boolean;
  language?: string;
  canCreate?: boolean;
  label?: string;
}

export default function TagsSection({
  contentType,
  contentId,
  currentUserId,
  isTrainerOrAdmin = false,
  language = 'en',
  canCreate = false,
  label,
}: TagsSectionProps) {
  const { tagIds, trainerTagIds, setTagIds } = useTags(contentType, contentId);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (tagIds.length === 0) { setTags([]); return; }
    supabase.from('tags').select('*').in('id', tagIds).then(({ data }) => {
      if (data) setTags(data);
    });
  }, [tagIds]);

  const athleteTagIds = tagIds.filter(id => !trainerTagIds.includes(id));

  const handleChange = (newIds: string[]) => {
    if (isTrainerOrAdmin) {
      setTagIds(newIds, currentUserId);
    } else {
      const combined = [...trainerTagIds, ...newIds.filter(id => !trainerTagIds.includes(id))];
      setTagIds(combined, currentUserId);
    }
  };

  const editableTagIds = isTrainerOrAdmin ? tagIds : athleteTagIds;
  const lockedTags = isTrainerOrAdmin ? [] : tags.filter(t => trainerTagIds.includes(t.id));
  const editableTags = isTrainerOrAdmin ? tags : tags.filter(t => !trainerTagIds.includes(t.id));

  const hasAny = tags.length > 0;
  const hasLocked = lockedTags.length > 0;

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </p>
      )}

      {hasLocked && (
        <div className="flex flex-wrap gap-1 items-center">
          <Lock size={11} className="text-gray-400 shrink-0" />
          {lockedTags.map(tag => (
            <TagPill key={tag.id} tag={tag} language={language} />
          ))}
        </div>
      )}

      <TagSelector
        selectedTagIds={editableTagIds}
        onChange={handleChange}
        language={language}
        canCreate={canCreate && isTrainerOrAdmin}
        placeholder={language === 'es' ? 'Agregar etiquetas...' : 'Add tags...'}
      />

      {!hasAny && editableTagIds.length === 0 && (
        <p className="text-xs text-gray-400 italic">
          {language === 'es' ? 'Sin etiquetas' : 'No tags yet'}
        </p>
      )}
    </div>
  );
}
