import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAthlete } from '../../contexts/AthleteContext';
import { supabase } from '../../lib/supabase';
import {
  Users, User, Search, Calendar, Apple, Activity,
  MessageSquare, TrendingUp, ChevronRight, Dumbbell, X, Crown
} from 'lucide-react';

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

interface TrainerAthleteSelectorProps {
  onAthleteSelected: (athleteId: string, athleteName: string) => void;
}

export default function TrainerAthleteSelector({ onAthleteSelected }: TrainerAthleteSelectorProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { setSelectedAthlete } = useAthlete();

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'direct' | 'team'>('all');

  const navigate = (page: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  useEffect(() => {
    if (user) loadAthletes();
  }, [user]);

  const loadAthletes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: directData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, country, sport')
        .eq('assigned_trainer_id', user.id)
        .eq('role', 'athlete');

      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`athlete_id, teams!inner(id, name, coach_id)`)
        .eq('teams.coach_id', user.id);

      let teamAthleteProfiles: any[] = [];
      if (teamMembers && teamMembers.length > 0) {
        const ids = teamMembers.map((tm: any) => tm.athlete_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, country, sport')
          .in('id', ids);
        teamAthleteProfiles = profiles || [];
      }

      const all: Athlete[] = [];

      (directData || []).forEach((a) => all.push({ ...a, is_direct: true }));

      (teamMembers || []).forEach((member: any) => {
        const profile = teamAthleteProfiles.find((p) => p.id === member.athlete_id);
        if (!profile) return;
        const existing = all.find((a) => a.id === profile.id);
        if (!existing) {
          all.push({ ...profile, team_names: [member.teams.name], is_direct: false });
        } else {
          if (!existing.team_names) existing.team_names = [];
          if (!existing.team_names.includes(member.teams.name)) {
            existing.team_names.push(member.teams.name);
          }
        }
      });

      const athleteIds = all.map((a) => a.id);
      if (athleteIds.length > 0) {
        const { data: memberships } = await supabase
          .from('membership_access')
          .select(`user_id, membership:memberships(name, name_es, name_en, slug)`)
          .in('user_id', athleteIds)
          .eq('status', 'active')
          .order('start_date', { ascending: false });

        const membershipByUser = new Map();
        (memberships || []).forEach((m: any) => {
          if (!membershipByUser.has(m.user_id)) membershipByUser.set(m.user_id, m.membership);
        });

        setAthletes(all.map((a) => ({ ...a, membership: membershipByUser.get(a.id) || null })));
      } else {
        setAthletes(all);
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAthlete = (athlete: Athlete) => {
    setSelectedAthlete(athlete.id, athlete.full_name);
    onAthleteSelected(athlete.id, athlete.full_name);
  };

  const handleQuickAction = (athlete: Athlete, action: string) => {
    setSelectedAthlete(athlete.id, athlete.full_name);
    navigate(action);
  };

  const filteredAthletes = athletes.filter((a) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'direct' && a.is_direct) ||
      (filter === 'team' && a.team_names && a.team_names.length > 0);

    const matchesSearch =
      !searchQuery ||
      a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.sport || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getMembershipLabel = (m: Athlete['membership']) => {
    if (!m) return null;
    return language === 'es' ? m.name_es || m.name : m.name_en || m.name;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'es' ? 'Cargando atletas...' : 'Loading athletes...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#fdda36]" />
            {language === 'es' ? 'Selecciona un Atleta' : 'Select an Athlete'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'es'
              ? 'Elige un atleta para ver o editar su calendario de entrenamiento'
              : 'Choose an athlete to view or edit their training calendar'}
          </p>
        </div>
        <button
          onClick={() => navigate('my-athletes')}
          className="flex items-center gap-1.5 text-sm text-[#514163] dark:text-[#fdda36] hover:underline font-medium"
        >
          {language === 'es' ? 'Gestionar atletas' : 'Manage athletes'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'es' ? 'Buscar por nombre, email o deporte...' : 'Search by name, email or sport...'}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#514163]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {(['all', 'direct', 'team'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[#fdda36] text-[#514163]'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all'
                ? language === 'es' ? `Todos (${athletes.length})` : `All (${athletes.length})`
                : f === 'direct'
                ? language === 'es' ? '1 a 1' : '1-on-1'
                : language === 'es' ? 'Equipos' : 'Teams'}
            </button>
          ))}
        </div>
      </div>

      {/* Athlete list */}
      {filteredAthletes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <User className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {athletes.length === 0
              ? language === 'es'
                ? 'No tienes atletas asignados aún. Ve a "Gestionar atletas" para agregar.'
                : 'No athletes assigned yet. Go to "Manage athletes" to add some.'
              : language === 'es'
              ? 'No se encontraron atletas con ese criterio.'
              : 'No athletes found matching that criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAthletes.map((athlete) => (
            <div
              key={athlete.id}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#514163] dark:hover:border-[#fdda36]/50 hover:shadow-md transition-all overflow-hidden"
            >
              {/* Main clickable area — selects athlete & opens calendar */}
              <button
                onClick={() => handleSelectAthlete(athlete)}
                className="w-full text-left p-4"
              >
                <div className="flex items-center gap-3">
                  {athlete.avatar_url ? (
                    <img
                      src={athlete.avatar_url}
                      alt={athlete.full_name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#fdda36] to-[#f0c800] flex items-center justify-center text-[#514163] font-bold text-lg flex-shrink-0">
                      {athlete.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                        {athlete.full_name}
                      </h3>
                      {athlete.membership && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium flex-shrink-0">
                          <Crown className="w-3 h-3" />
                          {getMembershipLabel(athlete.membership)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{athlete.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {athlete.sport && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Dumbbell className="w-3 h-3" />
                          {athlete.sport}
                        </span>
                      )}
                      {athlete.is_direct && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          1-on-1
                        </span>
                      )}
                      {athlete.team_names && athlete.team_names.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]">
                          {athlete.team_names[0]}
                          {athlete.team_names.length > 1 && ` +${athlete.team_names.length - 1}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-[#514163] dark:group-hover:text-[#fdda36] transition-colors flex-shrink-0" />
                </div>
              </button>

              {/* Quick actions strip */}
              <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2.5 flex items-center justify-between gap-1 bg-gray-50 dark:bg-gray-750">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium mr-1">
                  {language === 'es' ? 'Acceso rápido:' : 'Quick:'}
                </span>
                <div className="flex items-center gap-1">
                  <QuickActionBtn
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label={language === 'es' ? 'Calendario' : 'Calendar'}
                    onClick={() => handleSelectAthlete(athlete)}
                    color="blue"
                  />
                  <QuickActionBtn
                    icon={<Apple className="w-3.5 h-3.5" />}
                    label={language === 'es' ? 'Nutrición' : 'Nutrition'}
                    onClick={() => handleQuickAction(athlete, 'nutrition')}
                    color="emerald"
                  />
                  <QuickActionBtn
                    icon={<Activity className="w-3.5 h-3.5" />}
                    label={language === 'es' ? 'Hábitos' : 'Habits'}
                    onClick={() => handleQuickAction(athlete, 'habits')}
                    color="amber"
                  />
                  <QuickActionBtn
                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                    label={language === 'es' ? 'Rendimiento' : 'Performance'}
                    onClick={() => handleQuickAction(athlete, 'performance')}
                    color="rose"
                  />
                  <QuickActionBtn
                    icon={<MessageSquare className="w-3.5 h-3.5" />}
                    label={language === 'es' ? 'Mensajes' : 'Messages'}
                    onClick={() => handleQuickAction(athlete, 'chat')}
                    color="violet"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActionBtn({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
}) {
  const colorMap = {
    blue: 'hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400',
    emerald: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400',
    amber: 'hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400',
    rose: 'hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400',
    violet: 'hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400',
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      className={`p-1.5 rounded-md text-gray-400 dark:text-gray-500 transition-colors ${colorMap[color]}`}
    >
      {icon}
    </button>
  );
}
