import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { Users, Plus, Edit2, Trash2, Copy, Camera, UserPlus, X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  sport: string;
  country: string;
  photo_url: string | null;
  coach_id: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  athlete_id: string;
  profiles: {
    id: string;
    full_name: string;
    country: string | null;
    sport: string | null;
    avatar_url: string | null;
  };
}

export default function TeamsPage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const { toast, success: showSuccess, error: showError, hideToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableAthletes, setAvailableAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Form fields
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamSport, setTeamSport] = useState('');
  const [teamCountry, setTeamCountry] = useState('');

  const isTrainer = profile?.role === 'trainer' || profile?.role === 'admin';

  useEffect(() => {
    if (isTrainer) {
      loadTeams();
      loadAvailableAthletes();
    }
  }, [isTrainer]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('coach_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          athlete_id,
          profiles:athlete_id (
            id,
            full_name,
            country,
            sport,
            avatar_url
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadAvailableAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, country, sport, avatar_url')
        .eq('role', 'athlete')
        .eq('assigned_trainer_id', profile?.id)
        .order('full_name');

      if (error) throw error;
      setAvailableAthletes(data || []);
    } catch (error) {
      console.error('Error loading athletes:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName) {
      showError(language === 'es' ? 'El nombre del equipo es requerido' : 'Team name is required');
      return;
    }

    try {
      const { error } = await supabase.from('teams').insert({
        name: teamName,
        description: teamDescription,
        sport: teamSport,
        country: teamCountry,
        coach_id: profile?.id,
      });

      if (error) throw error;

      showSuccess(language === 'es' ? 'Equipo creado' : 'Team created');
      setShowTeamForm(false);
      resetForm();
      await loadTeams();
    } catch (error: any) {
      console.error('Error creating team:', error);
      showError(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const handleDuplicateTeam = async (team: Team) => {
    try {
      const { error } = await supabase.from('teams').insert({
        name: `${team.name} (Copy)`,
        description: team.description,
        sport: team.sport,
        country: team.country,
        coach_id: profile?.id,
      });

      if (error) throw error;

      showSuccess(language === 'es' ? 'Equipo duplicado' : 'Team duplicated');
      await loadTeams();
    } catch (error: any) {
      console.error('Error duplicating team:', error);
      showError(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este equipo?' : 'Delete this team?')) return;

    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);

      if (error) throw error;

      showSuccess(language === 'es' ? 'Equipo eliminado' : 'Team deleted');
      setSelectedTeam(null);
      await loadTeams();
    } catch (error: any) {
      console.error('Error deleting team:', error);
      showError(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const handleAddMember = async (athleteId: string) => {
    if (!selectedTeam) return;

    try {
      const { error } = await supabase.from('team_members').insert({
        team_id: selectedTeam.id,
        athlete_id: athleteId,
      });

      if (error) throw error;

      showSuccess(language === 'es' ? 'Atleta agregado' : 'Athlete added');
      setShowAddMember(false);
      await loadTeamMembers(selectedTeam.id);
    } catch (error: any) {
      console.error('Error adding member:', error);
      showError(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(language === 'es' ? '¿Remover del equipo?' : 'Remove from team?')) return;

    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);

      if (error) throw error;

      showSuccess(language === 'es' ? 'Atleta removido' : 'Athlete removed');
      if (selectedTeam) await loadTeamMembers(selectedTeam.id);
    } catch (error: any) {
      console.error('Error removing member:', error);
      showError(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setTeamName('');
    setTeamDescription('');
    setTeamSport('');
    setTeamCountry('');
  };

  if (!isTrainer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {language === 'es' ? 'Solo entrenadores pueden acceder' : 'Trainers only'}
        </p>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} duration={toast.duration} onClose={hideToast} />}
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-[#fdda36]" />
          {t('teams.title')}
        </h1>
        <button
          onClick={() => setShowTeamForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('teams.createTeam')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1 space-y-3">
          {teams.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('teams.noTeams')}</p>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  selectedTeam?.id === team.id
                    ? 'bg-[#fdda36] text-[#514163]'
                    : 'bg-white dark:bg-gray-800 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">{team.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateTeam(team);
                      }}
                      className="p-1 hover:bg-black/10 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(team.id);
                      }}
                      className="p-1 hover:bg-red-50 text-red-500 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {team.sport && <p className="text-sm opacity-80">{team.sport}</p>}
              </div>
            ))
          )}
        </div>

        {/* Team Details */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTeam.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedTeam.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('teams.teamMembers')}</h3>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {t('teams.addAthlete')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
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
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {teamMembers.length === 0 && (
                  <p className="col-span-2 text-gray-500 dark:text-gray-400 text-center py-8">{t('teams.noMembers')}</p>
                )}
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

      {/* Create Team Modal */}
      {showTeamForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('teams.createTeam')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('teams.teamName')}
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('teams.teamDescription')}
                </label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('teams.teamSport')}
                  </label>
                  <input
                    type="text"
                    value={teamSport}
                    onChange={(e) => setTeamSport(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('teams.teamCountry')}
                  </label>
                  <input
                    type="text"
                    value={teamCountry}
                    onChange={(e) => setTeamCountry(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateTeam}
                  className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors"
                >
                  {t('buttons.save')}
                </button>
                <button
                  onClick={() => {
                    setShowTeamForm(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('buttons.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('teams.addAthlete')}</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableAthletes
                .filter((athlete) => !teamMembers.some((m) => m.athlete_id === athlete.id))
                .map((athlete) => (
                  <button
                    key={athlete.id}
                    onClick={() => handleAddMember(athlete.id)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-900 hover:bg-[#fdda36]/20 rounded-lg transition-colors"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">{athlete.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {athlete.sport || athlete.country}
                    </p>
                  </button>
                ))}
            </div>
            <button
              onClick={() => setShowAddMember(false)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('buttons.close')}
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
