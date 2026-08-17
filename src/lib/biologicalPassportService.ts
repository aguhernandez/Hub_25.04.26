import { supabase } from './supabase';
import type { BiologicalPassport, CreatePassportPayload } from '../types/biologicalPassport.types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
    'Apikey': SUPABASE_ANON_KEY,
  };
}

export async function previewLabProfile(athleteId: string): Promise<Partial<BiologicalPassport> | null> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/fetch-lab-profile/preview/${athleteId}`,
    { headers }
  );
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Failed to fetch lab profile');
  return json.data ?? null;
}

export async function importLabProfile(
  athleteId: string,
  sportContext: string
): Promise<BiologicalPassport> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/fetch-lab-profile/import`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ athlete_id: athleteId, sport_context: sportContext }),
    }
  );
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Failed to import lab profile');
  return json.data as BiologicalPassport;
}

export async function getActivePassport(athleteId: string): Promise<BiologicalPassport | null> {
  const { data, error } = await supabase
    .from('biological_passports')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data as BiologicalPassport | null;
}

export async function getPassportHistory(athleteId: string): Promise<BiologicalPassport[]> {
  const { data, error } = await supabase
    .from('biological_passports')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return (data ?? []) as BiologicalPassport[];
}

export async function createPassport(payload: CreatePassportPayload): Promise<BiologicalPassport> {
  const { data, error } = await supabase
    .from('biological_passports')
    .insert({ ...payload, status: 'active' })
    .select()
    .single();

  if (error) throw error;
  return data as BiologicalPassport;
}

export async function updateVisibilityFlags(
  passportId: string,
  flags: {
    public_visible: boolean;
    share_vo2: boolean;
    share_zones: boolean;
    share_body_comp: boolean;
  }
): Promise<BiologicalPassport> {
  const { data, error } = await supabase
    .from('biological_passports')
    .update(flags)
    .eq('id', passportId)
    .select()
    .single();

  if (error) throw error;
  return data as BiologicalPassport;
}

export async function getAthleteList(): Promise<{ id: string; full_name: string; avatar_url: string; email: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email')
    .eq('role', 'athlete')
    .order('full_name');

  if (error) throw error;
  return data ?? [];
}
