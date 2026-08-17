import { Tag as TagIcon } from 'lucide-react';
import TagSelector from './TagSelector';
import TagPill from './TagPill';
import { useTags } from '../../hooks/useTags';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Tag } from './TagPill';

interface ATPPlanTagsSectionProps {
  planId: string;
  language?: string;
  canEdit?: boolean;
}

export default function ATPPlanTagsSection({ planId, language = 'en', canEdit = false }: ATPPlanTagsSectionProps) {
  const { tagIds, setTagIds } = useTags('atp_plan', planId);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (tagIds.length === 0) { setTags([]); return; }
    supabase.from('tags').select('*').in('id', tagIds).then(({ data }) => {
      if (data) setTags(data);
    });
  }, [tagIds]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        <TagIcon size={12} />
        {language === 'es' ? 'Etiquetas del Plan' : 'Plan Tags'}
      </div>
      {canEdit ? (
        <TagSelector
          selectedTagIds={tagIds}
          onChange={setTagIds}
          language={language}
          canCreate={true}
        />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 ? (
            <span className="text-xs text-gray-500 italic">
              {language === 'es' ? 'Sin etiquetas' : 'No tags'}
            </span>
          ) : (
            tags.map(tag => <TagPill key={tag.id} tag={tag} language={language} />)
          )}
        </div>
      )}
    </div>
  );
}
