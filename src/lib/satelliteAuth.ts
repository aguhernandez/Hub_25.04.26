import { supabase } from './supabase';

export const SATELLITE_HOSTS = new Set([
  'lab.asciende.pro',
  'endurance.asciende.pro',
  'nutrition.asciende.pro',
  'academy.asciende.pro',
  'motion.asciende.pro',
  'performance.asciende.pro',
]);

export function isAllowedSatelliteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (url.protocol === 'https:' && SATELLITE_HOSTS.has(url.hostname)) return true;
    return import.meta.env.DEV
      && url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export async function getSatelliteHandoffCode(target: string): Promise<string> {
  if (!isAllowedSatelliteUrl(target)) throw new Error('Invalid satellite URL');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('No active Hub session');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-session-token?target_host=${encodeURIComponent(new URL(target).hostname)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    },
  );
  const result = await response.json();
  if (!response.ok || !result.success || !result.code) {
    throw new Error(result.error || 'Could not create planner session');
  }
  return result.code as string;
}

export async function buildSatelliteLaunchUrl(target: string): Promise<string> {
  if (!isAllowedSatelliteUrl(target)) throw new Error('Invalid satellite URL');
  const url = new URL(target);
  const fragment = new URLSearchParams(url.hash.slice(1));
  fragment.set('sso_code', await getSatelliteHandoffCode(target));
  url.hash = fragment.toString();
  return url.toString();
}
