import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ActivityData {
  sportType: 'run' | 'trail_run' | 'road_bike' | 'mountain_bike' | 'gravel_bike' | 'open_water_swim';
  title: string;
  notes: string;
  gpsPoints: Array<{
    latitude: number;
    longitude: number;
    altitude: number | null;
    timestamp: string;
  }>;
  distanceKm: number;
  durationSeconds: number;
  elevationGainM: number;
  isPublic: boolean;
}

export function useActivityRecording() {
  const saveActivity = useCallback(async (activityData: ActivityData) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/save-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save activity');
      }

      return await response.json();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to save activity');
    }
  }, []);

  return { saveActivity };
}
