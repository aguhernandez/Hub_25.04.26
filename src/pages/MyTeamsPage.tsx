import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Users, Calendar } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  sport: string;
  country: string;
  teams: {
    id: string;
    name: string;
    description: string;
    sport: string;
    country: string;
    coach_id: string;
  };
}

interface TeamMember {
  profiles: {
    id: string;
    full_name: string;
    country: string | null;
    sport: string | null;
    avatar_url: string | null;
  };
}

export default function MyTeamsPage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyTeams();
  }, [profile?.id]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamDetails(selectedTeam.team_id);
    }
  }, [selectedTeam]);

  const loadMyTeams = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams (
            id,
            name,
            description,
            sport,
            country,
            coach_id
          )
        `)
        .eq('athlete_id', profile.id);

      if (error) throw error;
      setMyTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamDetails = async (teamId: string) => {
    try {
      // Load team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          profiles:athlete_id (
            id,
            full_name,
            country,
            sport,
            avatar_url
          )
        `)
        .eq('team_id', teamId);

      if (membersError) throw membersError;
      setTeamMembers(membersData || []);

      // Load coach info
      if (selectedTeam?.teams?.coach_id) {
        const { data: coachData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', selectedTeam.teams.coach_id)
          .single();

        setCoach(coachData);
      }
    } catch (error) {
      console.error('Error loading team details:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
        <Users className="w-8 h-8 text-[#fdda36]" />
        {t('teams.myTeams')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Teams List */}
        <div className="lg:col-span-1 space-y-3">
          {myTeams.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('teams.noTeams')}</p>
          ) : (
            myTeams.map((teamMember) => (
              <div
                key={teamMember.team_id}
                onClick={() => setSelectedTeam(teamMember)}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  selectedTeam?.team_id === teamMember.team_id
                    ? 'bg-[#fdda36] text-[#514163]'
                    : 'bg-white dark:bg-gray-800 hover:shadow-md'
                }`}
              >
                <h3 className="font-bold mb-1">{teamMember.teams.name}</h3>
                {teamMember.teams.sport && (
                  <p className="text-sm opacity-80">{teamMember.teams.sport}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Team Details */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTeam.teams.name}</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedTeam.teams.description}</p>
              </div>

              {coach && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('teams.coach')}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#fdda36] rounded-full flex items-center justify-center text-[#514163] font-bold">
                      {coach.full_name.charAt(0)}
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">{coach.full_name}</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('teams.teamMembers')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teamMembers.map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-[#fdda36] rounded-full flex items-center justify-center text-[#514163] font-bold">
                        {member.profiles.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{member.profiles.full_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {member.profiles.sport || member.profiles.country}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="font-semibold text-blue-800 dark:text-blue-200">{t('teams.sharedCalendar')}</p>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {language === 'es'
                    ? 'Próximamente: calendario compartido de entrenamientos'
                    : 'Coming soon: shared training calendar'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'Selecciona un equipo' : 'Select a team'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
