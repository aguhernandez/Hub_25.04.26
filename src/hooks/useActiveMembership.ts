import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ActiveMembership {
  id: string;
  membership_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  membership: {
    id: string;
    name: string;
    name_es?: string;
    name_en?: string;
    slug: string;
    price_monthly: number;
    price_annual: number;
    color?: string;
  };
}

export function useActiveMembership(userId?: string) {
  const [membership, setMembership] = useState<ActiveMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembership = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_memberships')
        .select(`
          id,
          membership_id,
          status,
          current_period_start,
          current_period_end,
          membership:memberships (
            id,
            name,
            price_monthly,
            price_annual
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('current_period_start', { ascending: false });

      if (error) {
        console.error('Error loading membership:', error);
        setMembership(null);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setMembership(data[0] as any);
      } else {
        setMembership(null);
      }
    } catch (err) {
      console.error('Error loading membership:', err);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembership();
  }, [userId]);

  return { membership, loading, reload: loadMembership };
}
