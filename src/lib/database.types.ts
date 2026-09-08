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
          role: 'admin' | 'trainer' | 'athlete' | 'nutritionist' | 'head_coach'
          country: string | null
          phone: string | null
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
          role?: 'admin' | 'trainer' | 'athlete' | 'nutritionist' | 'head_coach'
          country?: string | null
          phone?: string | null
          avatar_url?: string | null
          language?: 'en' | 'es'
          theme?: 'light' | 'dark'
          unit_preference?: 'metric' | 'imperial'
          intervals_icu_api_key?: string | null
          objectives?: string | null
          is_active?: boolean
          assigned_trainer_id?: string | null
          assigned_nutritionist_id?: string | null
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
          role?: 'admin' | 'trainer' | 'athlete' | 'nutritionist' | 'head_coach'
          country?: string | null
          phone?: string | null
          avatar_url?: string | null
          language?: 'en' | 'es'
          theme?: 'light' | 'dark'
          unit_preference?: 'metric' | 'imperial'
          intervals_icu_api_key?: string | null
          objectives?: string | null
          is_active?: boolean
          assigned_trainer_id?: string | null
          assigned_nutritionist_id?: string | null
        }
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
