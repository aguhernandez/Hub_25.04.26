import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import HabitTagSelector from './HabitTagSelector';
import TagPill, { type Tag } from './TagPill';
import { Lock } from 'lucide-react';

interface Props {
  habitId: string;
  currentUserId?: string;
  isTrainerOrAdmin?: boolean;
  language?: string;
  canEdit?: boolean;
  canCreate?: boolean;
}

interface TagRow {
  tag_id: string;
  created_by: string | null;
}

export default function HabitTagsSection({
  habitId,
  currentUserId,
  isTrainerOrAdmin = false,
  language = 'en',
  canEdit,
}: Props) {
  const [tagRows, setTagRows] = useState<TagRow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const isEditor = canEdit !== undefined ? canEdit : isTrainerOrAdmin;

  useEffect(() => {
    if (!habitId) return;
    let active = true;
    supabase
      .from('habit_tags')
      .select('tag_id, created_by')
      .eq('habit_id', habitId)
      .then(async ({ data, error }) => {
        if (!active || error) return;
        const rows = data || [];
        setTagRows(rows);
        if (rows.length > 0) {
          const { data: tagData } = await supabase.from('tags').select('*').in('id', rows.map(row => row.tag_id));
          if (active) setTags(tagData || []);
        } else {
          setTags([]);
        }
      });
    return () => { active = false; };
  }, [habitId]);

  const trainerTagIds = tagRows.filter(r => r.created_by !== null).map(r => r.tag_id);
  const allTagIds = tagRows.map(r => r.tag_id);
  const editableTagIds = isEditor ? allTagIds : allTagIds.filter(id => !trainerTagIds.includes(id));

  async function handleChange(newIds: string[]) {
    if (loading) return;

    const finalIds = isEditor
      ? newIds
      : [...trainerTagIds, ...newIds.filter(id => !trainerTagIds.includes(id))];

    const toAdd = finalIds.filter(id => !allTagIds.includes(id));
    const toRemove = allTagIds.filter(id => !finalIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    const optimistic: TagRow[] = [
      ...tagRows.filter(r => !toRemove.includes(r.tag_id)),
      ...toAdd.map(tag_id => ({ tag_id, created_by: currentUserId || null })),
    ];
    setTagRows(optimistic);

    setLoading(true);
    try {
      for (const tag_id of toAdd) {
        const { error } = await supabase.from('habit_tags').upsert(
          { habit_id: habitId, tag_id, created_by: currentUserId || null },
          { onConflict: 'habit_id,tag_id', ignoreDuplicates: true }
        );
        if (error) throw error;
      }
      for (const tag_id of toRemove) {
        const { error } = await supabase.from('habit_tags').delete()
          .eq('habit_id', habitId)
          .eq('tag_id', tag_id);
        if (error) throw error;
      }
      const { data } = await supabase
        .from('habit_tags')
        .select('tag_id, created_by')
        .eq('habit_id', habitId);
      setTagRows(data || []);
    } catch (error) {
      console.error('Error updating habit tags:', error);
      setTagRows(tagRows);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      {trainerTagIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Lock size={11} className="text-gray-400" />
          {tags.filter(tag => trainerTagIds.includes(tag.id)).map(tag => (
            <TagPill key={tag.id} tag={tag} language={language} />
          ))}
        </div>
      )}
      <HabitTagSelector
        selectedTagIds={editableTagIds}
        onChange={handleChange}
        language={language}
      />
    </div>
  );
}
