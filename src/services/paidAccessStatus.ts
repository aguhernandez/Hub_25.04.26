import { supabase } from '../lib/supabase';

const STALE_TIME_MS = 10 * 60 * 1000;

interface PaidAccessStatus {
  is_access_active: boolean;
}

interface CacheEntry {
  userId: string;
  expiresAt: number;
  value?: PaidAccessStatus | null;
  promise?: Promise<PaidAccessStatus | null>;
}

let cache: CacheEntry | null = null;

export function invalidatePaidAccessStatus(userId?: string) {
  if (!userId || cache?.userId === userId) cache = null;
}

export function getPaidAccessStatus(userId: string): Promise<PaidAccessStatus | null> {
  if (cache?.userId === userId) {
    if (cache.promise) return cache.promise;
    if (cache.expiresAt > Date.now()) return Promise.resolve(cache.value ?? null);
  }

  const entry: CacheEntry = { userId, expiresAt: 0 };
  const request = Promise.resolve(supabase.rpc('get_my_paid_access_status').maybeSingle())
    .then(({ data, error }) => {
      if (error) throw error;
      entry.value = data as PaidAccessStatus | null;
      entry.expiresAt = Date.now() + STALE_TIME_MS;
      return entry.value;
    })
    .catch((error) => {
      if (cache === entry) cache = null;
      throw error;
    })
    .finally(() => {
      entry.promise = undefined;
    });

  entry.promise = request;
  cache = entry;
  return request;
}
