import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  X,
  Mail,
  MapPin,
  Trophy,
  Globe,
  Lock,
  CheckCircle,
  Search,
  Send
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  sport: string;
  country: string;
  coach_id: string | null;
  is_public: boolean;
  is_asciende_official: boolean;
  language: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    country: string | null;
    sport: string | null;
    avatar_url: string | null;
  };
}

interface Athlete {
  id: string;
  full_name: string;
  email: string;
  sport: string | null;
  country: string | null;
  avatar_url: string | null;
}

export default function TeamsUnifiedPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { toast, success: showSuccess, error: showError, hideToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableAthletes, setAvailableAthletes] = useState<Athlete[]>([]);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sport: '',
    country: '',
    is_public: false
  });

  const isTrainer = profile?.role === 'trainer';
  const isAdmin = profile?.role === 'admin';
  const canCreateTeam = isTrainer || isAdmin;

  useEffect(() => {
    if (profile?.id) {
      loadTeams();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      console.log('Loading teams for role:', profile?.role, 'isAdmin:', isAdmin);

      if (isAdmin) {
        // Admins see ALL teams
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('is_asciende_official', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading teams (admin):', error);
        } else {
          console.log('Admin loaded teams:', data?.length);
        }
        setTeams(data || []);
      } else if (isTrainer) {
        // Trainers see: their teams + official Asciende teams
        // Load in two separate queries to avoid RLS issues
        const { data: ownTeams, error: error1 } = await supabase
          .from('teams')
          .select('*')
          .eq('coach_id', profile.id);

        const { data: officialTeams, error: error2 } = await supabase
          .from('teams')
          .select('*')
          .eq('is_asciende_official', true);

        if (error1) console.error('Error loading own teams:', error1);
        if (error2) console.error('Error loading official teams:', error2);

        const allTeams = [...(officialTeams || []), ...(ownTeams || [])];

        // Remove duplicates
        const uniqueTeams = allTeams.filter((team, index, self) =>
          index === self.findIndex(t => t?.id === team?.id)
        );

        setTeams(uniqueTeams);
      } else {
        // Athletes see: teams they're member of + official Asciende teams
        const { data: memberTeams, error: error1 } = await supabase
          .from('team_members')
          .select('team_id, teams(*)')
          .eq('athlete_id', profile.id);

        const { data: officialTeams, error: error2 } = await supabase
          .from('teams')
          .select('*')
          .eq('is_asciende_official', true);

        if (error1) console.error('Error loading member teams:', error1);
        if (error2) console.error('Error loading official teams:', error2);

        const memberTeamsData = memberTeams?.map(m => m.teams).filter(Boolean) as Team[];
        const allTeams = [...(officialTeams || []), ...memberTeamsData];

        // Remove duplicates
        const uniqueTeams = allTeams.filter((team, index, self) =>
          index === self.findIndex(t => t?.id === team?.id)
        );

        setTeams(uniqueTeams || []);
      }
    } catch (err) {
      console.error('Error in loadTeams:', err);
    }

    setLoading(false);
  };

  const loadTeamMembers = async (teamId: string) => {
    const { data } = await supabase
      .from('team_members')
      .select('id, profiles!athlete_id(id, full_name, email, country, sport, avatar_url)')
      .eq('team_id', teamId);

    setTeamMembers(data || []);
  };

  const loadAvailableAthletes = async () => {
    if (!selectedTeam) return;

    // Get all athletes
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, sport, country, avatar_url')
      .eq('role', 'athlete');

    // Exclude athletes already in the team (only if there are members)
    if (teamMembers.length > 0) {
      const memberIds = teamMembers.map(m => m.profiles.id);
      query = query.not('id', 'in', `(${memberIds.join(',')})`);
    }

    const { data } = await query;
    setAvailableAthletes(data || []);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.id) {
      showError('Profile not loaded. Please refresh the page.');
      return;
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([{
        name: formData.name,
        description: formData.description,
        sport: formData.sport,
        country: formData.country,
        is_public: formData.is_public,
        coach_id: profile.id,
        language: profile.language || 'en',
        is_asciende_official: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
      showError('Error creating team: ' + error.message);
      return;
    }

    if (data) {
      showSuccess(t('teams.teamCreated') || 'Team created successfully');
      await loadTeams();
      setShowCreateModal(false);
      setFormData({ name: '', description: '', sport: '', country: '', is_public: false });
      setSelectedTeam(data);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);

    // Only admin can delete official Asciende teams
    if (team?.is_asciende_official && !isAdmin) {
      showError('Cannot delete official Asciende teams');
      return;
    }

    if (!confirm(t('teams.confirmDelete') || 'Are you sure you want to delete this team?')) return;

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      console.error('Error deleting team:', error);
      showError('Error deleting team: ' + error.message);
      return;
    }

    showSuccess(t('teams.teamDeleted') || 'Team deleted successfully');
    await loadTeams();
    setSelectedTeam(null);
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!profile?.id) {
      showError('Profile not loaded');
      return;
    }

    const { error } = await supabase
      .from('team_members')
      .insert([{
        team_id: teamId,
        athlete_id: profile.id
      }]);

    if (error) {
      console.error('Error joining team:', error);
      showError('Error joining team: ' + error.message);
      return;
    }

    showSuccess(t('teams.joinedTeam') || 'Joined team successfully');
    await loadTeams();
    if (selectedTeam?.id === teamId) {
      await loadTeamMembers(teamId);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to leave this team?')) return;

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('athlete_id', profile?.id);

    if (error) {
      console.error('Error leaving team:', error);
      showError('Error leaving team: ' + error.message);
      return;
    }

    showSuccess(t('teams.leftTeam') || 'Left team successfully');
    await loadTeams();
    setSelectedTeam(null);
  };

  const handleAddMember = async (athleteId: string) => {
    if (!selectedTeam) return;

    const { error } = await supabase
      .from('team_members')
      .insert([{
        team_id: selectedTeam.id,
        athlete_id: athleteId
      }]);

    if (error) {
      console.error('Error adding member:', error);
      showError('Error adding member: ' + error.message);
      return;
    }

    showSuccess(t('teams.memberAdded') || 'Member added successfully');
    await loadTeamMembers(selectedTeam.id);
    setShowAddMemberModal(false);
    setAthleteSearch('');
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the team?')) return;

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      showError('Error removing member: ' + error.message);
      return;
    }

    showSuccess(t('teams.memberRemoved') || 'Member removed successfully');
    if (selectedTeam) {
      await loadTeamMembers(selectedTeam.id);
    }
  };

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !messageText.trim()) return;

    try {
      // Get all team member IDs including sender
      const memberIds = teamMembers.map(m => m.profiles.id);
      if (profile?.id && !memberIds.includes(profile.id)) {
        memberIds.push(profile.id);
      }

      // Check if team conversation already exists
      const { data: existingConversation } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('team_id', selectedTeam.id)
        .eq('type', 'team')
        .single();

      let conversationId = existingConversation?.id;

      // Create team conversation if it doesn't exist
      if (!conversationId) {
        const { data: newConversation, error: convError } = await supabase
          .from('chat_conversations')
          .insert([{
            type: 'team',
            name: selectedTeam.name,
            team_id: selectedTeam.id,
            participant_ids: memberIds,
            created_by: profile?.id
          }])
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConversation.id;
      } else {
        // Update participant list in case new members were added
        await supabase
          .from('chat_conversations')
          .update({ participant_ids: memberIds })
          .eq('id', conversationId);
      }

      // Send message to chat conversation
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: profile?.id,
          content: messageText,
          is_important: true
        }]);

      if (messageError) throw messageError;

      // Send notifications to all team members (except sender)
      const notifications = teamMembers
        .filter(m => m.profiles.id !== profile?.id)
        .map(member => ({
          user_id: member.profiles.id,
          type: 'chat',
          title: `Message from ${selectedTeam.name}`,
          message: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''),
          link_type: 'chat',
          link_id: conversationId
        }));

      if (notifications.length > 0) {
        await supabase
          .from('notifications')
          .insert(notifications);
      }

      setMessageText('');
      setShowMessageModal(false);
      showSuccess(t('teams.messageSent') || 'Message sent to team chat!');
    } catch (error: any) {
      console.error('Error sending group message:', error);
      showError(t('teams.messageError') || 'Error sending message. Please try again.');
    }
  };

  const isUserMember = (teamId: string) => {
    return teamMembers.some(m => m.profiles.id === profile?.id);
  };

  const canManageTeam = (team: Team) => {
    if (isAdmin) return true;
    if (team.is_asciende_official) return false;
    return team.coach_id === profile?.id;
  };

  const filteredAthletes = availableAthletes.filter(athlete =>
    athlete.full_name.toLowerCase().includes(athleteSearch.toLowerCase()) ||
    athlete.email.toLowerCase().includes(athleteSearch.toLowerCase())
  );

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} duration={toast.duration} onClose={hideToast} />}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  {isTrainer ? t('teams.myTeams') || 'My Teams' : t('teams.title') || 'Teams'}
                </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {isTrainer
                  ? t('teams.trainerDesc') || 'Create and manage teams - Send group messages to all members'
                  : isAdmin
                  ? 'View all teams and send group messages'
                  : t('teams.athleteDesc') || 'Join official Asciende groups to receive scientific content'
                }
              </p>
            </div>

            {canCreateTeam && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                {t('teams.createTeam') || 'Create Team'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Teams List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {t('teams.allTeams') || 'All Teams'} ({teams.length})
                </h3>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : teams.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {isTrainer ? t('teams.noTeams') || 'No teams created yet' : t('teams.noMembership') || "You're not in any team"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedTeam?.id === team.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{team.name}</h4>
                        {team.is_asciende_official && (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Trophy className="w-3 h-3" />
                          {team.sport}
                        </span>
                        {team.is_public ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <Globe className="w-3 h-3" />
                            Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Lock className="w-3 h-3" />
                            Private
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Team Details */}
          <div className="lg:col-span-2">
            {selectedTeam ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
                        {selectedTeam.is_asciende_official && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs">
                            <CheckCircle className="w-4 h-4" />
                            Official
                          </div>
                        )}
                      </div>
                      <p className="text-blue-100 mb-4">{selectedTeam.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {selectedTeam.sport}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {selectedTeam.country}
                        </div>
                        {selectedTeam.is_public ? (
                          <div className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            Public
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Lock className="w-4 h-4" />
                            Private
                          </div>
                        )}
                        {selectedTeam.coach_id && !selectedTeam.is_asciende_official && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Private Team
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(canManageTeam(selectedTeam) || (isAdmin && selectedTeam.is_asciende_official)) && (
                        <>
                          <button
                            onClick={() => handleDeleteTeam(selectedTeam.id)}
                            className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition-colors"
                            title="Delete Team"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {(canManageTeam(selectedTeam) || isAdmin) && (
                        <button
                          onClick={() => setShowMessageModal(true)}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          title="Send Group Message"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {t('teams.members') || 'Team Members'} ({teamMembers.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      {canManageTeam(selectedTeam) && (
                        <button
                          onClick={() => {
                            loadAvailableAthletes();
                            setShowAddMemberModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Member
                        </button>
                      )}
                      {!canManageTeam(selectedTeam) && !isUserMember(selectedTeam.id) && (
                        <button
                          onClick={() => handleJoinTeam(selectedTeam.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          <UserPlus className="w-4 h-4" />
                          Join Team
                        </button>
                      )}
                      {!canManageTeam(selectedTeam) && isUserMember(selectedTeam.id) && !selectedTeam.is_asciende_official && (
                        <button
                          onClick={() => handleLeaveTeam(selectedTeam.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          <X className="w-4 h-4" />
                          Leave Team
                        </button>
                      )}
                    </div>
                  </div>

                  {teamMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">{t('teams.noMembers') || 'No members yet'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {teamMembers.map(member => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          {member.profiles.avatar_url ? (
                            <img
                              src={member.profiles.avatar_url}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                              {member.profiles.full_name[0]}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {member.profiles.full_name}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              {member.profiles.sport && (
                                <span className="flex items-center gap-1">
                                  <Trophy className="w-3 h-3" />
                                  {member.profiles.sport}
                                </span>
                              )}
                              {member.profiles.country && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {member.profiles.country}
                                </span>
                              )}
                            </div>
                          </div>

                          {canManageTeam(selectedTeam) && (
                            <button
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('teams.selectTeam') || 'Select a team'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('teams.selectTeamDesc') || 'Choose a team from the list to view details'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create Team Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('teams.createNewTeam') || 'Create New Team'}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('teams.teamName') || 'Team Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Elite Track Team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Brief description of the team..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sport *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sport}
                      onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Track & Field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Argentina"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_public" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('teams.publicTeam') || 'Public Team'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('teams.publicTeamDesc') || 'Anyone can view and join this team'}
                    </div>
                  </label>
                  {formData.is_public ? (
                    <Globe className="w-5 h-5 text-green-600" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    {t('teams.createTeam') || 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && selectedTeam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Add Members to {selectedTeam.name}</h3>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={athleteSearch}
                    onChange={(e) => setAthleteSearch(e.target.value)}
                    placeholder="Search athletes by name or email..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {filteredAthletes.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No athletes available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAthletes.map(athlete => (
                      <div
                        key={athlete.id}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        {athlete.avatar_url ? (
                          <img
                            src={athlete.avatar_url}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                            {athlete.full_name[0]}
                          </div>
                        )}

                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{athlete.full_name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{athlete.email}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            {athlete.sport && (
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {athlete.sport}
                              </span>
                            )}
                            {athlete.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {athlete.country}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddMember(athlete.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Send Message Modal */}
        {showMessageModal && selectedTeam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Send Message to {selectedTeam.name}
                </h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSendGroupMessage} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message to all {teamMembers.length} members
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={6}
                    placeholder="Type your message here..."
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowMessageModal(false)}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        </div>
      </div>
    </>
  );
}
