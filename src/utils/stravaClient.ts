import { supabase } from '../lib/supabase';

export interface StravaConnection {
  id: string;
  user_id: string;
  athlete_id: number;
  expires_at: string;
  scope: string;
  granted_scopes: string[];
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
  athlete_profile: any | null;
  athlete_firstname: string | null;
  athlete_lastname: string | null;
  athlete_profile_pic: string | null;
  has_heartrate_permission: boolean;
}

export interface ExternalActivity {
  id: string;
  user_id: string;
  source: string;
  external_id: string;
  sport_type: string;
  name: string;
  start_time: string;
  local_date: string | null;
  // Time
  duration_seconds: number;
  elapsed_time_seconds: number | null;
  // Distance & elevation
  distance_meters: number;
  elevation_gain_meters: number;
  // Speed
  average_speed_mps: number;
  max_speed_mps: number | null;
  // Heart rate
  average_heartrate: number | null;
  max_heartrate: number | null;
  has_heartrate: boolean;
  // Power
  average_power: number | null;
  average_watts: number | null;
  max_watts: number | null;
  weighted_avg_watts: number | null;
  kilojoules: number | null;
  has_power: boolean;
  // Cadence
  average_cadence: number | null;
  // Energy & effort
  calories: number | null;
  perceived_exertion: number | null;
  // Context
  trainer: boolean;
  commute: boolean;
  device_name: string | null;
  timezone: string | null;
  // GPS
  start_latlng: number[] | null;
  end_latlng: number[] | null;
  map_polyline: string | null;
  map_summary_polyline: string | null;
  // Strava metadata
  strava_upload_id: number | null;
  external_id_strava: string | null;
  // State
  raw_data: any;
  imported_to_training_log_id: string | null;
  user_notes: string | null;
  user_rpe: number | null;
  user_tags: string[] | null;
  streams_fetched: boolean;
  streams_fetched_at: string | null;
  synced_at: string;
  created_at: string;
  deleted_at: string | null;
}

export interface ActivityStream {
  id: string;
  activity_id: string;
  user_id: string;
  time_stream: number[] | null;
  heartrate_stream: number[] | null;
  watts_stream: number[] | null;
  cadence_stream: number[] | null;
  velocity_smooth_stream: number[] | null;
  altitude_stream: number[] | null;
  distance_stream: number[] | null;
  latlng_stream: number[][] | null;
  resolution: string;
  series_type: string;
  stream_keys: string[];
  missing_heartrate: boolean;
  missing_power: boolean;
  missing_gps: boolean;
  fetched_at: string;
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  total_fetched?: number;
  streams_fetched?: number;
  streams_skipped?: number;
  rate_limit_hit?: boolean;
  deleted?: number;
  first_sync?: boolean;
  error?: string;
}

// Full scopes for complete athlete data access
const STRAVA_SCOPES = 'read,profile:read_all,activity:read,activity:read_all';

export class StravaClient {
  private static STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
  private static REDIRECT_URI = `${window.location.origin}/settings?strava=callback`;

  private static async fetchClientId(): Promise<string> {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-oauth-callback`,
      { method: 'GET' }
    );
    if (!response.ok) throw new Error('Strava is not configured on this platform');
    const data = await response.json();
    if (!data.client_id) throw new Error('Strava is not configured on this platform');
    return data.client_id;
  }

  static async getAuthorizationUrl(scope: string = STRAVA_SCOPES): Promise<string> {
    const clientId = await this.fetchClientId();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.REDIRECT_URI,
      response_type: 'code',
      scope,
      approval_prompt: 'auto',
    });
    return `${this.STRAVA_AUTH_URL}?${params.toString()}`;
  }

  static async exchangeToken(
    code: string,
    scope: string
  ): Promise<{ success: boolean; athlete?: any; has_heartrate_permission?: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: 'No active session' };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-oauth-callback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code, scope }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        console.error('[StravaClient] Token exchange failed:', result);
        return { success: false, error: result.error || 'Failed to connect to Strava' };
      }

      return {
        success: true,
        athlete: result.athlete,
        has_heartrate_permission: result.has_heartrate_permission,
      };
    } catch (error) {
      console.error('[StravaClient] exchangeToken error:', error);
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
      console.error('[StravaClient] Error fetching connection:', error);
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

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      console.error('[StravaClient] disconnect error:', error);
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
      if (!session) return { success: false, error: 'No active session' };

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
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (response.status === 429) {
        console.warn('[StravaClient] Rate limit hit');
        return { success: false, error: result.error || 'Strava API rate limit reached' };
      }

      if (!response.ok) {
        console.error('[StravaClient] Sync failed:', result);
        return { success: false, error: result.error || 'Failed to sync activities' };
      }

      return {
        success: true,
        synced: result.synced,
        total_fetched: result.total_fetched,
        streams_fetched: result.streams_fetched,
        streams_skipped: result.streams_skipped,
        rate_limit_hit: result.rate_limit_hit,
        deleted: result.deleted,
        first_sync: result.first_sync,
      };
    } catch (error) {
      console.error('[StravaClient] syncActivities error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async getActivityStream(activityId: string): Promise<ActivityStream | null> {
    const { data, error } = await supabase
      .from('activity_streams')
      .select('*')
      .eq('activity_id', activityId)
      .maybeSingle();

    if (error) {
      console.error('[StravaClient] Error fetching stream:', error);
      return null;
    }
    return data;
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

    if (options?.source) query = query.eq('source', options.source);
    if (!options?.includeDeleted) query = query.is('deleted_at', null);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[StravaClient] Error fetching activities:', error);
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

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      console.error('[StravaClient] restoreActivity error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async updateActivity(
    id: string,
    updates: { user_notes?: string; user_rpe?: number; user_tags?: string[] }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('external_activities')
        .update(updates)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      console.error('[StravaClient] updateActivity error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async deleteActivity(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('external_activities')
        .delete()
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      console.error('[StravaClient] deleteActivity error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ─── Formatters ─────────────────────────────────────────────────────────────

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${secs}s`;
  }

  static formatDistance(meters: number, unit: 'metric' | 'imperial' = 'metric'): string {
    if (unit === 'imperial') {
      return `${(meters * 0.000621371).toFixed(2)} mi`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  }

  static formatSpeed(mps: number, unit: 'metric' | 'imperial' = 'metric'): string {
    if (unit === 'imperial') return `${(mps * 2.23694).toFixed(1)} mph`;
    return `${(mps * 3.6).toFixed(1)} km/h`;
  }

  static formatPace(mps: number, unit: 'metric' | 'imperial' = 'metric'): string {
    if (mps === 0) return '--';
    const secondsPerUnit = unit === 'imperial' ? 1609.34 / mps : 1000 / mps;
    const minutes = Math.floor(secondsPerUnit / 60);
    const seconds = Math.floor(secondsPerUnit % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}${unit === 'imperial' ? '/mi' : '/km'}`;
  }
}
