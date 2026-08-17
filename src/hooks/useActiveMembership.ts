import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ActiveMembership {
  id: string;
  membership_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  source?: string;
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
        .from('membership_access')
        .select(`
          id,
          membership_id,
          status,
          start_date,
          end_date,
          source,
          membership:memberships (
            id,
            name,
            name_es,
            name_en,
            slug,
            price_monthly,
            price_annual
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
        .order('start_date', { ascending: false });

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
