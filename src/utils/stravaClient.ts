import { supabase } from '../lib/supabase';

export interface StravaConnection {
  id: string;
  user_id: string;
  athlete_id: number;
  expires_at: string;
  scope: string;
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
}

export interface ExternalActivity {
  id: string;
  user_id: string;
  source: string;
  external_id: string;
  sport_type: string;
  name: string;
  start_time: string;
  duration_seconds: number;
  distance_meters: number;
  elevation_gain_meters: number;
  average_speed_mps: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_power: number | null;
  average_cadence: number | null;
  device_name: string | null;
  raw_data: any;
  imported_to_training_log_id: string | null;
  user_notes: string | null;
  user_rpe: number | null;
  user_tags: string[] | null;
  synced_at: string;
  created_at: string;
  deleted_at: string | null;
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  total_fetched?: number;
  deleted?: number;
  first_sync?: boolean;
  error?: string;
}

export class StravaClient {
  private static STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
  private static STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
  private static REDIRECT_URI = `${window.location.origin}/settings?strava=callback`;

  static isConfigured(): boolean {
    return !!this.STRAVA_CLIENT_ID;
  }

  static getAuthorizationUrl(scope: string = 'read,activity:read_all'): string {
    if (!this.STRAVA_CLIENT_ID) {
      throw new Error('STRAVA_NOT_CONFIGURED');
    }

    const params = new URLSearchParams({
      client_id: this.STRAVA_CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: 'code',
      scope: scope,
      approval_prompt: 'auto',
    });

    return `${this.STRAVA_AUTH_URL}?${params.toString()}`;
  }

  static async exchangeToken(code: string, scope: string): Promise<{ success: boolean; athlete?: any; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return { success: false, error: 'No active session' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-oauth-callback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code, scope }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to connect to Strava' };
      }

      return { success: true, athlete: result.athlete };
    } catch (error) {
      console.error('Error exchanging Strava token:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async getConnection(): Promise<StravaConnection | null> {
    const { data, error } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Strava connection:', error);
      return null;
    }

    return data;
  }

  static async disconnect(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('strava_connections')
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting Strava:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async syncActivities(params?: {
    perPage?: number;
    page?: number;
    after?: number;
  }): Promise<SyncResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return { success: false, error: 'No active session' };
      }

      const queryParams = new URLSearchParams();
      if (params?.perPage) queryParams.set('per_page', params.perPage.toString());
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.after) queryParams.set('after', params.after.toString());

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-sync-activities${
        queryParams.toString() ? '?' + queryParams.toString() : ''
      }`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to sync activities' };
      }

      return {
        success: true,
        synced: result.synced,
        total_fetched: result.total_fetched,
        deleted: result.deleted,
        first_sync: result.first_sync,
      };
    } catch (error) {
      console.error('Error syncing Strava activities:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async getExternalActivities(options?: {
    source?: string;
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
  }): Promise<ExternalActivity[]> {
    let query = supabase
      .from('external_activities')
      .select('*')
      .order('start_time', { ascending: false });

    if (options?.source) {
      query = query.eq('source', options.source);
    }

    if (!options?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching external activities:', error);
      return [];
    }

    return data || [];
  }

  static async restoreActivity(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('external_activities')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error restoring activity:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async updateActivity(
    id: string,
    updates: {
      user_notes?: string;
      user_rpe?: number;
      user_tags?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('external_activities')
        .update(updates)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating activity:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async deleteActivity(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('external_activities')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting activity:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  }

  static formatDistance(meters: number, unit: 'metric' | 'imperial' = 'metric'): string {
    if (unit === 'imperial') {
      const miles = meters * 0.000621371;
      return `${miles.toFixed(2)} mi`;
    }
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  }

  static formatSpeed(mps: number, unit: 'metric' | 'imperial' = 'metric'): string {
    if (unit === 'imperial') {
      const mph = mps * 2.23694;
      return `${mph.toFixed(1)} mph`;
    }
    const kph = mps * 3.6;
    return `${kph.toFixed(1)} km/h`;
  }

  static formatPace(mps: number, unit: 'metric' | 'imperial' = 'metric'): string {
    if (mps === 0) return '--';

    const secondsPerUnit = unit === 'imperial' ? 1609.34 / mps : 1000 / mps;
    const minutes = Math.floor(secondsPerUnit / 60);
    const seconds = Math.floor(secondsPerUnit % 60);

    const unitLabel = unit === 'imperial' ? '/mi' : '/km';
    return `${minutes}:${seconds.toString().padStart(2, '0')}${unitLabel}`;
  }
}
