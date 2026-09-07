import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types/roles';
import { isUserRole } from '../types/roles';

export function useUserRole() {
  const { user, profile } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRole = async () => {
      setLoading(true);
      setError(null);
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }
      if (isUserRole(profile?.role)) {
        setRole(profile.role);
        setLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (queryError) setError(queryError);
      setRole(isUserRole(data?.role) ? data.role : null);
      setLoading(false);
    };

    void loadRole();
    return () => { cancelled = true; };
  }, [profile?.role, user?.id]);

  return { role, loading, error };
}
