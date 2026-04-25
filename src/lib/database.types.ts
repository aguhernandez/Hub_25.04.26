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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'trainer' | 'athlete'
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
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'trainer' | 'athlete'
          country?: string | null
          phone?: string | null
          avatar_url?: string | null
          language?: 'en' | 'es'
          theme?: 'light' | 'dark'
          unit_preference?: 'metric' | 'imperial'
          intervals_icu_api_key?: string | null
          objectives?: string | null
          is_active?: boolean
        }
        Update: {
          email?: string
          full_name?: string | null
          role?: 'admin' | 'trainer' | 'athlete'
          country?: string | null
          phone?: string | null
          avatar_url?: string | null
          language?: 'en' | 'es'
          theme?: 'light' | 'dark'
          unit_preference?: 'metric' | 'imperial'
          intervals_icu_api_key?: string | null
          objectives?: string | null
          is_active?: boolean
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
        }
        Update: {
          name?: string
          description?: string | null
          habit_type?: 'checklist' | 'numeric'
          target_value?: number | null
          unit?: string | null
          is_active?: boolean
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
