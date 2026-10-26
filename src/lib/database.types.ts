export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      executed_sessions: {
        Row: {
          id: string
          athlete_id: string
          ow_event_id: string
          provider: string | null
          sport_raw: string | null
          sport_category: string | null
          start_time: string | null
          end_time: string | null
          duration_seconds: number | null
          distance_m: number | null
          avg_hr: number | null
          max_hr: number | null
          calories: number | null
          raw: Json
          ingested_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          athlete_id: string
          ow_event_id: string
          provider?: string | null
          sport_raw?: string | null
          sport_category?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_seconds?: number | null
          distance_m?: number | null
          avg_hr?: number | null
          max_hr?: number | null
          calories?: number | null
          raw: Json
          ingested_at?: string
          updated_at?: string
        }
        Update: {
          provider?: string | null
          sport_raw?: string | null
          sport_category?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_seconds?: number | null
          distance_m?: number | null
          avg_hr?: number | null
          max_hr?: number | null
          calories?: number | null
          raw?: Json
          ingested_at?: string
          updated_at?: string
        }
      }
      session_matches: {
        Row: { id: string; executed_session_id: string; planned_workout_id: string | null; status: 'auto_matched' | 'suggested' | 'manual_matched' | 'unplanned' | 'dismissed'; score: number | null; matched_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; executed_session_id: string; planned_workout_id?: string | null; status: 'auto_matched' | 'suggested' | 'manual_matched' | 'unplanned' | 'dismissed'; score?: number | null; matched_by?: string | null; created_at?: string; updated_at?: string }
        Update: { planned_workout_id?: string | null; status?: 'auto_matched' | 'suggested' | 'manual_matched' | 'unplanned' | 'dismissed'; score?: number | null; matched_by?: string | null; updated_at?: string }
        Relationships: []
      }
      executed_session_metrics: {
        Row: { id: string; executed_session_id: string; has_hr: boolean; has_power: boolean; sample_count: number; coverage_pct: number | null; avg_power: number | null; max_power: number | null; normalized_power: number | null; variability_index: number | null; intensity_factor: number | null; tss: number | null; power_zone_seconds: Json | null; hr_zone_seconds: Json | null; ftp_used: number | null; zones_used: Json | null; computed_at: string }
        Insert: { id?: string; executed_session_id: string; has_hr?: boolean; has_power?: boolean; sample_count?: number; coverage_pct?: number | null; avg_power?: number | null; max_power?: number | null; normalized_power?: number | null; variability_index?: number | null; intensity_factor?: number | null; tss?: number | null; power_zone_seconds?: Json | null; hr_zone_seconds?: Json | null; ftp_used?: number | null; zones_used?: Json | null; computed_at?: string }
        Update: { has_hr?: boolean; has_power?: boolean; sample_count?: number; coverage_pct?: number | null; avg_power?: number | null; max_power?: number | null; normalized_power?: number | null; variability_index?: number | null; intensity_factor?: number | null; tss?: number | null; power_zone_seconds?: Json | null; hr_zone_seconds?: Json | null; ftp_used?: number | null; zones_used?: Json | null; computed_at?: string }
        Relationships: []
      }
      wearable_access_log: {
        Row: { id: string; viewer_user_id: string; athlete_user_id: string; section: string; range_start: string | null; range_end: string | null; created_at: string }
        Insert: { id?: string; viewer_user_id: string; athlete_user_id: string; section: string; range_start?: string | null; range_end?: string | null; created_at?: string }
        Update: { section?: string; range_start?: string | null; range_end?: string | null }
        Relationships: []
      }
      session_reviews: {
        Row: { id: string; athlete_id: string; planned_workout_id: string | null; executed_session_id: string | null; reviewer_id: string; status: 'pending' | 'reviewed'; comment: string; visible_to_athlete: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; athlete_id: string; planned_workout_id?: string | null; executed_session_id?: string | null; reviewer_id: string; status?: 'pending' | 'reviewed'; comment: string; visible_to_athlete?: boolean; created_at?: string; updated_at?: string }
        Update: { planned_workout_id?: string | null; executed_session_id?: string | null; status?: 'pending' | 'reviewed'; comment?: string; visible_to_athlete?: boolean; updated_at?: string }
        Relationships: []
      }
      workout_drafts: {
        Row: {
          id: string
          user_id: string
          name: string
          date: string | null
          exercises: Json
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          date?: string | null
          exercises?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          date?: string | null
          exercises?: Json
          description?: string | null
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          username: string | null
          first_name: string | null
          last_name: string | null
          bio: string | null
          tagline: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          privacy_accepted: boolean | null
          privacy_accepted_at: string | null
          profile_completed: boolean | null
          role: 'admin' | 'trainer' | 'athlete' | 'nutritionist' | 'head_coach' | 'biomechanist'
          country: string | null
          phone: string | null
          sport: string | null
          gender: string | null
          date_of_birth: string | null
          avatar_url: string | null
          language: 'en' | 'es'
          theme: 'light' | 'dark'
          unit_preference: 'metric' | 'imperial'
          intervals_icu_api_key: string | null
          objectives: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          assigned_trainer_id: string | null
          assigned_nutritionist_id: string | null
          assigned_biomechanist_id: string | null
          timezone: string | null
          sponsors: Json
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          bio?: string | null
          tagline?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          privacy_accepted?: boolean | null
          privacy_accepted_at?: string | null
          profile_completed?: boolean | null
          role?: 'admin' | 'trainer' | 'athlete' | 'nutritionist' | 'head_coach' | 'biomechanist'
          country?: string | null
          phone?: string | null
          sport?: string | null
          gender?: string | null
          date_of_birth?: string | null
          avatar_url?: string | null
          language?: 'en' | 'es'
          theme?: 'light' | 'dark'
          unit_preference?: 'metric' | 'imperial'
          intervals_icu_api_key?: string | null
          objectives?: string | null
          is_active?: boolean
          assigned_trainer_id?: string | null
          assigned_nutritionist_id?: string | null
          assigned_biomechanist_id?: string | null
          timezone?: string | null
          sponsors?: Json
        }
        Update: {
          email?: string
          full_name?: string | null
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          bio?: string | null
          tagline?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          privacy_accepted?: boolean | null
          privacy_accepted_at?: string | null
          profile_completed?: boolean | null
          role?: 'admin' | 'trainer' | 'athlete' | 'nutritionist' | 'head_coach' | 'biomechanist'
          country?: string | null
          phone?: string | null
          sport?: string | null
          gender?: string | null
          date_of_birth?: string | null
          avatar_url?: string | null
          language?: 'en' | 'es'
          theme?: 'light' | 'dark'
          unit_preference?: 'metric' | 'imperial'
          intervals_icu_api_key?: string | null
          objectives?: string | null
          is_active?: boolean
          assigned_trainer_id?: string | null
          assigned_nutritionist_id?: string | null
          assigned_biomechanist_id?: string | null
          timezone?: string | null
          sponsors?: Json
        }
        Relationships: []
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          habit_type: 'checklist' | 'numeric'
          target_value: number | null
          unit: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          name: string
          description?: string | null
          habit_type: 'checklist' | 'numeric'
          target_value?: number | null
          unit?: string | null
          is_active?: boolean
          assigned_trainer_id?: string | null
          assigned_nutritionist_id?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          habit_type?: 'checklist' | 'numeric'
          target_value?: number | null
          unit?: string | null
          is_active?: boolean
          assigned_trainer_id?: string | null
          assigned_nutritionist_id?: string | null
        }
      }
      habit_logs: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          log_date: string
          completed: boolean
          value: number | null
          notes: string | null
          logged_at: string
        }
        Insert: {
          habit_id: string
          user_id: string
          log_date?: string
          completed?: boolean
          value?: number | null
          notes?: string | null
        }
        Update: {
          completed?: boolean
          value?: number | null
          notes?: string | null
        }
      }
    }
  }
}
