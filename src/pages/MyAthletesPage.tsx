import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Users, User, UserPlus, MessageSquare, Dumbbell, Search, X, Calendar, Apple, CheckCircle, TrendingUp, ChevronDown, ChevronUp, Crown, MoreVertical } from 'lucide-react';
import { useAthlete } from '../contexts/AthleteContext';
import ChangeMembershipModal from '../components/ChangeMembershipModal';
import ProfileOptionsModal from '../components/ProfileOptionsModal';

interface Athlete {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  country: string | null;
  sport: string | null;
  team_names?: string[];
  is_direct: boolean;
  membership?: {
    name: string;
    name_es?: string;
    name_en?: string;
    slug: string;
  } | null;
}

export default function MyAthletesPage() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const { setSelectedAthlete } = useAthlete();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<'all' | 'direct' | 'team'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  const [newAthleteData, setNewAthleteData] = useState({
    email: '',
    password: '',
    full_name: '',
    first_name: '',
    last_name: '',
    sport: ''
  });
  const [creating, setCreating] = useState(false);
  const [selectedAthlete, setSelectedAthleteForMembership] = useState<Athlete | null>(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showProfileOptionsModal, setShowProfileOptionsModal] = useState(false);
  const [selectedAthleteForOptions, setSelectedAthleteForOptions] = useState<Athlete | null>(null);

  const navigate = (page: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  useEffect(() => {
    if (user && profile?.role === 'trainer') {
      loadAthletes();
    }
  }, [user, profile]);

  const loadAthletes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const directAthletes = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, country, sport')
        .eq('assigned_trainer_id', user.id)
        .eq('role', 'athlete');

      // Load team members - simplified approach with explicit joins
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select(`
          athlete_id,
          teams!inner(
            id,
            name,
            coach_id
          )
        `)
        .eq('teams.coach_id', user.id);

      console.log('Team members loaded:', teamMembers?.length || 0, 'Error:', teamError);

      // Load profiles for team athletes
      let teamAthleteProfiles: any[] = [];
      if (teamMembers && teamMembers.length > 0) {
        const athleteIds = teamMembers.map(tm => tm.athlete_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, country, sport')
          .in('id', athleteIds);

        teamAthleteProfiles = profiles || [];
        console.log('Team athlete profiles loaded:', teamAthleteProfiles.length);
      }

      const allAthletes: Athlete[] = [];

      if (directAthletes.data) {
        directAthletes.data.forEach(athlete => {
          allAthletes.push({
            ...athlete,
            is_direct: true
          });
        });
      }

      // Add team athletes (handle multiple teams per athlete)
      if (teamMembers && teamAthleteProfiles.length > 0) {
        teamMembers.forEach((member: any) => {
          const profile = teamAthleteProfiles.find(p => p.id === member.athlete_id);
          if (profile) {
            const existing = allAthletes.find(a => a.id === profile.id);
            if (!existing) {
              // New athlete from team
              allAthletes.push({
                ...profile,
                team_names: [member.teams.name],
                is_direct: false
              });
            } else {
              // Athlete already exists (either direct or from another team)
              // Add this team to their team_names array
              if (!existing.team_names) {
                existing.team_names = [];
              }
              if (!existing.team_names.includes(member.teams.name)) {
                existing.team_names.push(member.teams.name);
              }
            }
          }
        });
      }

      console.log('Total athletes loaded:', allAthletes.length);
      console.log('Athletes with teams:', allAthletes.filter(a => a.team_names && a.team_names.length > 0).length);

      const athleteIds = allAthletes.map(a => a.id);
      const { data: memberships } = await supabase
        .from('membership_access')
        .select(`
          user_id,
          start_date,
          end_date,
          membership:memberships (
            name,
            name_es,
            name_en,
            slug
          )
        `)
        .in('user_id', athleteIds)
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
        .order('start_date', { ascending: false });

      // Group memberships by user_id and get the most recent one
      const membershipByUser = new Map();
      memberships?.forEach((m: any) => {
        if (!membershipByUser.has(m.user_id)) {
          membershipByUser.set(m.user_id, m.membership);
        }
      });

      const athletesWithMemberships = allAthletes.map(athlete => {
        return {
          ...athlete,
          membership: membershipByUser.get(athlete.id) || null
        };
      });

      setAthletes(athletesWithMemberships);
    } catch (error) {
      console.error('Error loading athletes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMembership = (athlete: Athlete) => {
    setSelectedAthleteForMembership(athlete);
    setShowMembershipModal(true);
  };

  const searchAthletes = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, country, sport')
        .eq('role', 'athlete')
        .ilike('email', `%${searchEmail}%`)
        .limit(10);

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching athletes:', error);
    } finally {
      setSearching(false);
    }
  };

  const assignAthlete = async (athleteId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ assigned_trainer_id: user.id })
        .eq('id', athleteId);

      if (!error) {
        setShowAddModal(false);
        setSearchEmail('');
        setSearchResults([]);
        loadAthletes();
        alert(language === 'es' ? 'Atleta asignado exitosamente' : 'Athlete assigned successfully');
      }
    } catch (error) {
      console.error('Error assigning athlete:', error);
      alert(language === 'es' ? 'Error al asignar atleta' : 'Error assigning athlete');
    }
  };

  const createNewAthlete = async () => {
    if (!user) return;

    if (!newAthleteData.email || !newAthleteData.password || !newAthleteData.full_name) {
      alert(language === 'es' ? 'Por favor completa todos los campos requeridos' : 'Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trainer-create-athlete`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAthleteData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error creating athlete');
      }

      setShowCreateModal(false);
      setNewAthleteData({
        email: '',
        password: '',
        full_name: '',
        first_name: '',
        last_name: '',
        sport: ''
      });
      loadAthletes();
      alert(language === 'es' ? 'Atleta creado exitosamente' : 'Athlete created successfully');
    } catch (error: any) {
      console.error('Error creating athlete:', error);
      alert(error.message || (language === 'es' ? 'Error al crear atleta' : 'Error creating athlete'));
    } finally {
      setCreating(false);
    }
  };

  const filteredAthletes = athletes.filter(athlete => {
    if (filter === 'direct') return athlete.is_direct;
    if (filter === 'team') return athlete.team_names && athlete.team_names.length > 0;
    return true;
  });

  // Group athletes by team for team view (athletes can appear in multiple teams)
  const athletesByTeam = filteredAthletes.reduce((acc, athlete) => {
    if (athlete.team_names && athlete.team_names.length > 0) {
      athlete.team_names.forEach(teamName => {
        if (!acc[teamName]) {
          acc[teamName] = [];
        }
        acc[teamName].push(athlete);
      });
    }
    return acc;
  }, {} as Record<string, Athlete[]>);

  // Get unique teams count (not athlete count)
  const uniqueTeamsCount = Object.keys(athletesByTeam).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-[#fdda36]" />
            {t('menu.myAthletes')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {language === 'es' ? 'Gestiona tus atletas individuales y de equipos' : 'Manage your individual and team athletes'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#514163] text-white font-medium rounded-lg hover:bg-[#3a2f4a] transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            {language === 'es' ? 'Crear Nuevo' : 'Create New'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            {language === 'es' ? 'Asignar Existente' : 'Assign Existing'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {language === 'es' ? 'Todos' : 'All'} ({athletes.length})
          </button>
          <button
            onClick={() => setFilter('direct')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'direct'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {language === 'es' ? '1 a 1' : '1-on-1'} ({athletes.filter(a => a.is_direct).length})
          </button>
          <button
            onClick={() => setFilter('team')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'team'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {language === 'es' ? 'En Equipos' : 'In Teams'} ({uniqueTeamsCount})
          </button>
        </div>
      </div>

      {filteredAthletes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es' ? 'No tienes atletas asignados' : 'No athletes assigned yet'}
          </p>
        </div>
      ) : filter === 'team' ? (
        // Team grouped view
        <div className="space-y-6">
          {Object.entries(athletesByTeam).map(([teamName, teamAthletes]) => (
            <div key={teamName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Team Header */}
              <div className="bg-gradient-to-r from-[#514163] to-[#6d5581] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#fdda36] rounded-lg">
                    <Users className="w-6 h-6 text-[#514163]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{teamName}</h2>
                    <p className="text-white/80 text-sm">
                      {teamAthletes.length} {language === 'es' ? 'atletas' : 'athletes'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Athletes Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3 justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {athlete.avatar_url ? (
                          <img
                            src={athlete.avatar_url}
                            alt={athlete.full_name}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#fdda36] flex items-center justify-center text-[#514163] font-bold flex-shrink-0">
                            {athlete.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                            {athlete.full_name}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {athlete.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAthleteForOptions(athlete);
                          setShowProfileOptionsModal(true);
                        }}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                        title={language === 'es' ? 'Opciones' : 'Options'}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {athlete.sport && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Dumbbell className="w-3 h-3" />
                        {athlete.sport}
                      </div>
                    )}

                    {athlete.is_direct && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                        <User className="w-3 h-3" />
                        {language === 'es' ? '1 a 1' : '1-on-1'}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => setExpandedAthleteId(expandedAthleteId === athlete.id ? null : athlete.id)}
                        className="w-full px-3 py-1.5 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        {expandedAthleteId === athlete.id ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            {language === 'es' ? 'Cerrar' : 'Close'}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            {language === 'es' ? 'Opciones' : 'Options'}
                          </>
                        )}
                      </button>

                      {expandedAthleteId === athlete.id && (
                        <div className="grid grid-cols-2 gap-2 mt-2 animate-fadeIn">
                          <button
                            onClick={() => {
                              setSelectedAthlete(athlete.id, athlete.full_name);
                              navigate('training');
                            }}
                            className="px-2 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                          >
                            <Calendar className="w-3 h-3" />
                            {language === 'es' ? 'Calendario' : 'Calendar'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAthlete(athlete.id, athlete.full_name);
                              navigate('nutrition-dashboard');
                            }}
                            className="px-2 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                          >
                            <Apple className="w-3 h-3" />
                            {language === 'es' ? 'Nutrición' : 'Nutrition'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAthlete(athlete.id, athlete.full_name);
                              navigate('habits');
                            }}
                            className="px-2 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {language === 'es' ? 'Hábitos' : 'Habits'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAthlete(athlete.id, athlete.full_name);
                              navigate('performance');
                            }}
                            className="px-2 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                          >
                            <TrendingUp className="w-3 h-3" />
                            {language === 'es' ? 'Performance' : 'Performance'}
                          </button>

                          <button
                            onClick={() => handleChangeMembership(athlete)}
                            className="px-2 py-1.5 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                          >
                            <Crown className="w-3 h-3" />
                            {language === 'es' ? 'Membresía' : 'Membership'}
                          </button>

                          <button
                            onClick={() => navigate('chat')}
                            className="col-span-2 px-2 py-1.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                          >
                            <MessageSquare className="w-3 h-3" />
                            {language === 'es' ? 'Mensaje' : 'Message'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Individual/All view (grid)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAthletes.map((athlete) => (
            <div
              key={athlete.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
            >
              <div className="flex items-start gap-3 justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {athlete.avatar_url ? (
                    <img
                      src={athlete.avatar_url}
                      alt={athlete.full_name}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#fdda36] flex items-center justify-center text-[#514163] font-bold text-xl flex-shrink-0">
                      {athlete.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {athlete.full_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {athlete.email}
                    </p>
                    {athlete.country && (
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {athlete.country}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedAthleteForOptions(athlete);
                    setShowProfileOptionsModal(true);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                  title={language === 'es' ? 'Opciones' : 'Options'}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {athlete.sport && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Dumbbell className="w-4 h-4" />
                  {athlete.sport}
                </div>
              )}

              {/* Show all teams the athlete is in */}
              {athlete.team_names && athlete.team_names.length > 0 && (
                <div className="space-y-1">
                  {athlete.team_names.map((teamName, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-[#fdda36]/10 text-[#514163] dark:text-[#fdda36] rounded-lg text-sm">
                      <Users className="w-4 h-4" />
                      {teamName}
                    </div>
                  ))}
                </div>
              )}

              {/* Show 1-on-1 badge if direct assignment */}
              {athlete.is_direct && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm">
                  <User className="w-4 h-4" />
                  {language === 'es' ? '1 a 1' : '1-on-1'}
                </div>
              )}

              {/* Membership Badge */}
              <div className="flex items-center gap-2">
                {athlete.membership ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#514163]/10 text-[#514163] dark:text-[#fdda36] rounded-lg text-sm font-medium">
                    <Crown className="w-4 h-4" />
                    {(language === 'es' ? athlete.membership.name_es : athlete.membership.name_en) || athlete.membership.name}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Asciende Inicia
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <button
                  onClick={() => setExpandedAthleteId(expandedAthleteId === athlete.id ? null : athlete.id)}
                  className="w-full px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center justify-center gap-2"
                >
                  {expandedAthleteId === athlete.id ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      {language === 'es' ? 'Ocultar Opciones' : 'Hide Options'}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      {language === 'es' ? 'Ver Opciones' : 'View Options'}
                    </>
                  )}
                </button>

                {expandedAthleteId === athlete.id && (
                  <div className="grid grid-cols-2 gap-2 pt-2 animate-fadeIn">
                    <button
                      onClick={() => {
                        setSelectedAthlete(athlete.id, athlete.full_name);
                        navigate('training');
                      }}
                      className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Calendar className="w-4 h-4" />
                      {language === 'es' ? 'Calendario' : 'Calendar'}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedAthlete(athlete.id, athlete.full_name);
                        navigate('nutrition-dashboard');
                      }}
                      className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Apple className="w-4 h-4" />
                      {language === 'es' ? 'Nutrición' : 'Nutrition'}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedAthlete(athlete.id, athlete.full_name);
                        navigate('habits');
                      }}
                      className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {language === 'es' ? 'Hábitos' : 'Habits'}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedAthlete(athlete.id, athlete.full_name);
                        navigate('performance');
                      }}
                      className="px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <TrendingUp className="w-4 h-4" />
                      {language === 'es' ? 'Performance' : 'Performance'}
                    </button>

                    <button
                      onClick={() => handleChangeMembership(athlete)}
                      className="px-3 py-2 bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36] rounded-lg hover:bg-[#fdda36]/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Crown className="w-4 h-4" />
                      {language === 'es' ? 'Membresía' : 'Membership'}
                    </button>

                    <button
                      onClick={() => navigate('chat')}
                      className="col-span-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {language === 'es' ? 'Enviar Mensaje' : 'Send Message'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Crear Nuevo Atleta' : 'Create New Athlete'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {language === 'es'
                    ? '✓ El email del atleta se verificará automáticamente'
                    : '✓ The athlete\'s email will be verified automatically'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Nombre Completo' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={newAthleteData.full_name}
                  onChange={(e) => setNewAthleteData({ ...newAthleteData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Nombre' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    value={newAthleteData.first_name}
                    onChange={(e) => setNewAthleteData({ ...newAthleteData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'es' ? 'Apellido' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    value={newAthleteData.last_name}
                    onChange={(e) => setNewAthleteData({ ...newAthleteData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                    placeholder="Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newAthleteData.email}
                  onChange={(e) => setNewAthleteData({ ...newAthleteData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="atleta@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Contraseña Temporal' : 'Temporary Password'} *
                </label>
                <input
                  type="password"
                  value={newAthleteData.password}
                  onChange={(e) => setNewAthleteData({ ...newAthleteData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {language === 'es'
                    ? 'Mínimo 6 caracteres. El atleta podrá cambiarla después.'
                    : 'Minimum 6 characters. The athlete can change it later.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Deporte' : 'Sport'}
                </label>
                <select
                  value={newAthleteData.sport}
                  onChange={(e) => setNewAthleteData({ ...newAthleteData, sport: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                >
                  <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                  <option value="volleyball">{language === 'es' ? 'Vóley' : 'Volleyball'}</option>
                  <option value="beach_volleyball">{language === 'es' ? 'Beach Vóley' : 'Beach Volleyball'}</option>
                  <option value="cycling">{language === 'es' ? 'Ciclismo' : 'Cycling'}</option>
                  <option value="running">Running</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={createNewAthlete}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
                >
                  {creating
                    ? (language === 'es' ? 'Creando...' : 'Creating...')
                    : (language === 'es' ? 'Crear Atleta' : 'Create Athlete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === 'es' ? 'Agregar Atleta' : 'Add Athlete'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchEmail('');
                  setSearchResults([]);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Buscar por email' : 'Search by email'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchAthletes()}
                    placeholder="athlete@example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  />
                  <button
                    onClick={searchAthletes}
                    disabled={searching || !searchEmail.trim()}
                    className="px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {result.avatar_url ? (
                          <img
                            src={result.avatar_url}
                            alt={result.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#fdda36] flex items-center justify-center text-[#514163] font-bold">
                            {result.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {result.full_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {result.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => assignAthlete(result.id)}
                        className="px-3 py-1.5 bg-[#fdda36] text-[#514163] text-sm font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
                      >
                        {language === 'es' ? 'Asignar' : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searching && (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Membership Modal */}
      {selectedAthlete && (
        <ChangeMembershipModal
          isOpen={showMembershipModal}
          onClose={() => {
            setShowMembershipModal(false);
            setSelectedAthleteForMembership(null);
          }}
          userId={selectedAthlete.id}
          userEmail={selectedAthlete.email}
          userName={selectedAthlete.full_name || selectedAthlete.email}
          onSuccess={loadAthletes}
        />
      )}

      {/* Profile Options Modal */}
      {selectedAthleteForOptions && (
        <ProfileOptionsModal
          isOpen={showProfileOptionsModal}
          onClose={() => {
            setShowProfileOptionsModal(false);
            setSelectedAthleteForOptions(null);
          }}
          athleteId={selectedAthleteForOptions.id}
          athleteName={selectedAthleteForOptions.full_name || ''}
          assignedTrainerId={user?.id}
          currentUserId={user?.id || ''}
          currentUserRole={profile?.role || ''}
          currentUserEmail={profile?.email}
        />
      )}
    </div>
  );
}
