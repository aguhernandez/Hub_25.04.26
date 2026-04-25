import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type MembershipLevel = 'inicia' | 'intermediate' | 'asciende' | 'pro' | 'teams_sports';

interface MembershipStatus {
  level: MembershipLevel;
  hasIntermediate: boolean;
  hasAsciende: boolean;
  hasPro: boolean;
  hasTeamsSports: boolean;
  canAccessDigest: (requiredLevel: MembershipLevel) => boolean;
  hasAccess: (requiredLevels: MembershipLevel[]) => boolean;
  canAccessWorkoutBuilder: boolean;
  canAccessTeams: boolean;
  canAccessAIWorkouts: boolean;
  loading: boolean;
}

const LEVEL_HIERARCHY: Record<string, number> = {
  inicia: 1,
  asciende: 2,
  intermediate: 2,
  pro: 3,
  'pro-elite': 3,
  teams_sports: 4
};

export function useMembership(): MembershipStatus {
  const { user } = useAuth();
  const [level, setLevel] = useState<MembershipLevel>('inicia');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLevel('inicia');
      setLoading(false);
      return;
    }

    checkMembershipLevel();
  }, [user]);

  const checkMembershipLevel = async () => {
    try {
      const { data: memberships } = await supabase
        .from('membership_access')
        .select(`
          membership:memberships (
            name,
            slug
          )
        `)
        .eq('user_id', user!.id)
        .eq('status', 'active');

      if (!memberships || memberships.length === 0) {
        setLevel('inicia');
        setLoading(false);
        return;
      }

      let highestLevel: MembershipLevel = 'inicia';

      for (const item of memberships) {
        const membership = (item as any).membership;
        const name = membership?.name?.toLowerCase() || '';
        const slug = membership?.slug?.toLowerCase() || '';

        if (name.includes('teams') || slug.includes('teams') || name.includes('sport') || slug.includes('sport')) {
          highestLevel = 'teams_sports';
          break;
        } else if ((name.includes('pro') || slug === 'pro' || slug === 'pro-elite') && (LEVEL_HIERARCHY[highestLevel] || 0) < LEVEL_HIERARCHY.pro) {
          highestLevel = 'pro';
        } else if (
          (slug === 'intermediate' || slug === 'asciende' || name.includes('intermediate')) &&
          (LEVEL_HIERARCHY[highestLevel] || 0) < LEVEL_HIERARCHY.intermediate
        ) {
          highestLevel = 'intermediate';
        }
      }

      setLevel(highestLevel);
    } catch (error) {
      console.error('Error checking membership:', error);
      setLevel('inicia');
    } finally {
      setLoading(false);
    }
  };

  const canAccessDigest = (requiredLevel: MembershipLevel): boolean => {
    const currentLvl = LEVEL_HIERARCHY[level] || 0;
    const requiredLvl = LEVEL_HIERARCHY[requiredLevel] || 0;
    return currentLvl >= requiredLvl;
  };

  const hasAccess = (requiredLevels: MembershipLevel[]): boolean => {
    const currentLvl = LEVEL_HIERARCHY[level] || 0;
    return requiredLevels.some(requiredLevel => currentLvl >= (LEVEL_HIERARCHY[requiredLevel] || 0));
  };

  const currentLvl = LEVEL_HIERARCHY[level] || 0;

  return {
    level,
    hasIntermediate: currentLvl >= LEVEL_HIERARCHY.intermediate,
    hasAsciende: currentLvl >= LEVEL_HIERARCHY.intermediate,
    hasPro: currentLvl >= LEVEL_HIERARCHY.pro,
    hasTeamsSports: level === 'teams_sports',
    canAccessDigest,
    hasAccess,
    canAccessWorkoutBuilder: currentLvl >= LEVEL_HIERARCHY.pro,
    canAccessTeams: level === 'teams_sports',
    canAccessAIWorkouts: currentLvl >= LEVEL_HIERARCHY.intermediate,
    loading
  };
}
