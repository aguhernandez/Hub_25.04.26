import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Tag } from '../components/tags/TagPill';

export type ContentType = 'workout' | 'atp_plan' | 'program' | 'wellness' | 'habit';

const JUNCTION_TABLE: Record<ContentType, string> = {
  workout: 'workout_tags',
  atp_plan: 'atp_plan_tags',
  program: 'program_tags',
  wellness: 'wellness_tags',
  habit: 'habit_tags',
};

const ID_COLUMN: Record<ContentType, string> = {
  workout: 'workout_id',
  atp_plan: 'plan_id',
  program: 'program_id',
  wellness: 'checkin_id',
  habit: 'habit_id',
};

interface TagRow {
  tag_id: string;
  created_by: string | null;
}

export function useTags(contentType: ContentType, contentId: string | null) {
  const [tagRows, setTagRows] = useState<TagRow[]>([]);
  const [allTagObjects, setAllTagObjects] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const tagRowsRef = useRef<TagRow[]>([]);
  const tableRef = useRef(JUNCTION_TABLE[contentType]);
  const idColRef = useRef(ID_COLUMN[contentType]);

  tableRef.current = JUNCTION_TABLE[contentType];
  idColRef.current = ID_COLUMN[contentType];

  const load = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    const { data } = await supabase
      .from(tableRef.current)
      .select('tag_id, created_by')
      .eq(idColRef.current, contentId);
    const rows = data || [];
    tagRowsRef.current = rows;
    setTagRows(rows);
    setLoading(false);

    if (rows.length > 0) {
      const ids = rows.map(r => r.tag_id);
      const { data: tagData } = await supabase.from('tags').select('*').in('id', ids);
      setAllTagObjects(tagData || []);
    } else {
      setAllTagObjects([]);
    }
  }, [contentId]);

  useEffect(() => { load(); }, [load]);

  const tagIds = useMemo(() => tagRows.map(r => r.tag_id), [tagRows]);
  const trainerTagIds = useMemo(() => tagRows.filter(r => r.created_by !== null).map(r => r.tag_id), [tagRows]);

  const save = useCallback(async (newTagIds: string[], currentUserId?: string) => {
    if (!contentId) return;

    const currentTagIds = tagRowsRef.current.map(r => r.tag_id);
    const toAdd = newTagIds.filter(id => !currentTagIds.includes(id));
    const toRemove = currentTagIds.filter(id => !newTagIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    if (toAdd.length > 0) {
      for (const tag_id of toAdd) {
        await supabase.from(tableRef.current).upsert(
          {
            [idColRef.current]: contentId,
            tag_id,
            created_by: currentUserId || null,
          },
          { onConflict: `${idColRef.current},tag_id`, ignoreDuplicates: true }
        );
      }
    }

    for (const tag_id of toRemove) {
      await supabase.from(tableRef.current).delete()
        .eq(idColRef.current, contentId)
        .eq('tag_id', tag_id);
    }

    await load();
  }, [contentId, load]);

  return { tagIds, trainerTagIds, allTagObjects, setTagIds: save, loading, reload: load };
}
