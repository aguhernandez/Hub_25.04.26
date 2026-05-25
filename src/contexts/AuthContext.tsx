import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { initPushNotifications, silentReRegister } from '../services/pushNotificationService';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, sport?: string) => Promise<{ error: AuthError | null; user?: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const pushInitDone = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        if (!pushInitDone.current) {
          pushInitDone.current = true;
          setTimeout(() => { silentReRegister(); }, 1500);
        }
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        if (!pushInitDone.current) {
          pushInitDone.current = true;
          setTimeout(() => { initPushNotifications(); }, 1500);
        }
      } else {
        setProfile(null);
        pushInitDone.current = false;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string, retries = 3) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return loadProfile(userId, retries - 1);
      }

      setProfile(data);
    } catch {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return loadProfile(userId, retries - 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, sport?: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/auth-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || '',
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        const error = new Error(result.error || 'Signup failed') as AuthError;
        return { error, user: null };
      }

      if (sport) {
        await supabase
          .from('profiles')
          .update({ sport })
          .eq('email', email);
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return { error: signInError, user: null };
      }

      return { error: null, user: signInData.user };

    } catch (err) {
      const error = new Error(err instanceof Error ? err.message : 'Signup failed') as AuthError;
      return { error, user: null };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      throw error;
    } else {
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
    }
  };

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error) {
      setSession(data.session);
      setUser(data.session?.user ?? null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
