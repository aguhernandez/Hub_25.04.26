import { supabase } from '../lib/supabase';

export const MAX_DRAFTS = 10;

export interface WorkoutDraft {
  id: string;
  user_id: string;
  name: string;
  date: string | null;
  exercises: any;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface DraftPayload {
  name: string;
  date: string | null;
  exercises: any;
  description: string;
}

export async function countDrafts(): Promise<number> {
  const { count, error } = await supabase
    .from('workout_drafts')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function listDrafts(): Promise<WorkoutDraft[]> {
  const { data, error } = await supabase
    .from('workout_drafts')
    .select('id, user_id, name, date, exercises, description, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as WorkoutDraft[]) ?? [];
}

export async function getDraft(id: string): Promise<WorkoutDraft | null> {
  const { data, error } = await supabase
    .from('workout_drafts')
    .select('id, user_id, name, date, exercises, description, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as WorkoutDraft | null;
}

export async function createDraft(payload: DraftPayload): Promise<WorkoutDraft> {
  const current = await countDrafts();
  if (current >= MAX_DRAFTS) {
    throw new Error('DRAFT_LIMIT_REACHED');
  }
  const { data, error } = await supabase
    .from('workout_drafts')
    .insert({
      name: payload.name,
      date: payload.date,
      exercises: payload.exercises,
      description: payload.description,
    })
    .select('id, user_id, name, date, exercises, description, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as WorkoutDraft;
}

export async function updateDraft(id: string, payload: DraftPayload): Promise<WorkoutDraft> {
  const { data, error } = await supabase
    .from('workout_drafts')
    .update({
      name: payload.name,
      date: payload.date,
      exercises: payload.exercises,
      description: payload.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, user_id, name, date, exercises, description, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as WorkoutDraft;
}

export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase
    .from('workout_drafts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
