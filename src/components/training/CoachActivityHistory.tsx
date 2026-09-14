import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Users, Plus, X, ChevronDown, Tag,
  Activity as ActivityIcon, UserCheck, Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface AthleteInfo {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  sport: string | null;
  country: string | null;
  activity_count: number;
}

interface AthleteGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  athlete_ids: string[];
}

interface Props {
  coachId: string;
  selectedAthleteId: string | null;
  onSelectAthlete: (id: string | null) => void;
}

const GROUP_COLORS = [
  { key: 'blue', class: 'bg-blue-500' },
  { key: 'emerald', class: 'bg-emerald-500' },
  { key: 'amber', class: 'bg-amber-500' },
  { key: 'rose', class: 'bg-rose-500' },
  { key: 'purple', class: 'bg-purple-500' },
  { key: 'cyan', class: 'bg-cyan-500' },
];

export function CoachAthleteSelector({ coachId, selectedAthleteId, onSelectAthlete }: Props) {
  const { language } = useLanguage();
  const [athletes, setAthletes] = useState<AthleteInfo[]>([]);
  const [groups, setGroups] = useState<AthleteGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  const t = useMemo(() => ({
    selectAthlete: language === 'es' ? 'Selecciona un atleta' : 'Select an athlete',
    searchAthlete: language === 'es' ? 'Buscar atleta...' : 'Search athlete...',
    allAthletes: language === 'es' ? 'Todos' : 'All',
    groups: language === 'es' ? 'Grupos' : 'Groups',
    manageGroups: language === 'es' ? 'Gestionar grupos' : 'Manage groups',
    newGroup: language === 'es' ? 'Nuevo grupo' : 'New group',
    groupName: language === 'es' ? 'Nombre del grupo' : 'Group name',
    description: language === 'es' ? 'Descripción' : 'Description',
    save: language === 'es' ? 'Guardar' : 'Save',
    cancel: language === 'es' ? 'Cancelar' : 'Cancel',
    delete: language === 'es' ? 'Eliminar' : 'Delete',
    addAthlete: language === 'es' ? 'Añadir atleta' : 'Add athlete',
    removeAthlete: language === 'es' ? 'Quitar' : 'Remove',
    noAthletes: language === 'es' ? 'No tienes atletas asignados' : 'No assigned athletes',
    noGroups: language === 'es' ? 'No hay grupos creados' : 'No groups created',
    athletes: language === 'es' ? 'atletas' : 'athletes',
  }), [language]);

  const loadAthletes = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    try {
      const [directRes, teamRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, sport, country')
          .eq('role', 'athlete')
          .eq('assigned_trainer_id', coachId)
          .order('full_name'),
        supabase
          .from('team_members')
          .select('athlete_id, teams!inner(id, name, coach_id)')
          .eq('teams.coach_id', coachId),
      ]);

      const directAthletes = (directRes.data || []) as AthleteInfo[];
      const teamAthleteIds = (teamRes.data || []).map((r: any) => r.athlete_id);
      const uniqueIds = new Set(directAthletes.map((a) => a.id));

      let teamAthletes: AthleteInfo[] = [];
      if (teamAthleteIds.length > 0) {
        const { data: teamProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, sport, country')
          .in('id', teamAthleteIds.filter((id: string) => !uniqueIds.has(id)))
          .order('full_name');
        teamAthletes = (teamProfiles || []) as AthleteInfo[];
        teamAthleteIds.forEach((id) => uniqueIds.add(id));
      }

      const combined = [...directAthletes, ...teamAthletes];
      const seen = new Set<string>();
      const deduped = combined.filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });

      if (deduped.length > 0) {
        const { data: activityRows } = await supabase
          .from('external_activities')
          .select('user_id')
          .in('user_id', deduped.map((a) => a.id))
          .is('deleted_at', null);
        const counts = new Map<string, number>();
        (activityRows || []).forEach((row: any) => {
          counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1);
        });
        deduped.forEach((athlete) => {
          athlete.activity_count = counts.get(athlete.id) || 0;
        });
      }

      deduped.sort((a, b) => b.activity_count - a.activity_count || a.full_name.localeCompare(b.full_name));
      setAthletes(deduped);
    } catch (err) {
      console.error('[CoachAthleteSelector] Error loading athletes:', err);
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  const loadGroups = useCallback(async () => {
    if (!coachId) return;
    try {
      const { data: groupRows } = await supabase
        .from('athlete_groups')
        .select('id, name, description, color')
        .eq('coach_id', coachId)
        .order('name');

      if (!groupRows || groupRows.length === 0) {
        setGroups([]);
        return;
      }

      const { data: memberRows } = await supabase
        .from('athlete_group_members')
        .select('group_id, athlete_id')
        .in('group_id', groupRows.map((g) => g.id));

      const memberMap = new Map<string, string[]>();
      (memberRows || []).forEach((m: any) => {
        if (!memberMap.has(m.group_id)) memberMap.set(m.group_id, []);
        memberMap.get(m.group_id)!.push(m.athlete_id);
      });

      setGroups(groupRows.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description || '',
        color: g.color || 'blue',
        athlete_ids: memberMap.get(g.id) || [],
      })));
    } catch (err) {
      console.error('[CoachAthleteSelector] Error loading groups:', err);
    }
  }, [coachId]);

  useEffect(() => {
    loadAthletes();
    loadGroups();
  }, [loadAthletes, loadGroups]);

  const filteredAthletes = useMemo(() => {
    let result = athletes;
    if (selectedGroup) {
      const group = groups.find((g) => g.id === selectedGroup);
      if (group) {
        result = result.filter((a) => group.athlete_ids.includes(a.id));
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.full_name?.toLowerCase().includes(q));
    }
    return result;
  }, [athletes, selectedGroup, groups, searchQuery]);

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  return (
    <div className="space-y-3">
      {/* Selected athlete banner */}
      {selectedAthlete && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          {selectedAthlete.avatar_url ? (
            <img src={selectedAthlete.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
              {selectedAthlete.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm truncate">{selectedAthlete.full_name}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
              {selectedAthlete.email || '—'} · {selectedAthlete.activity_count} {t.athletes === 'atletas' ? 'actividades' : 'activities'}
            </p>
          </div>
          <button
            onClick={() => onSelectAthlete(null)}
            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800/40 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchAthlete}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-colors"
        />
      </div>

      {/* Group filter + manage button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowGroupDropdown(!showGroupDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" />
              {selectedGroup ? groups.find((g) => g.id === selectedGroup)?.name || t.allAthletes : t.allAthletes}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {showGroupDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowGroupDropdown(false)} />
              <div className="absolute z-20 mt-1 w-full rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg max-h-60 overflow-y-auto">
                <button
                  onClick={() => { setSelectedGroup(null); setShowGroupDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${!selectedGroup ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-neutral-700 dark:text-neutral-300'}`}
                >
                  {t.allAthletes} ({athletes.length})
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGroup(g.id); setShowGroupDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2 ${selectedGroup === g.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-neutral-700 dark:text-neutral-300'}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${GROUP_COLORS.find((c) => c.key === g.color)?.class || 'bg-blue-500'}`} />
                    {g.name} ({g.athlete_ids.length})
                  </button>
                ))}
                {groups.length === 0 && (
                  <p className="px-3 py-2 text-xs text-neutral-400">{t.noGroups}</p>
                )}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setShowGroupModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shrink-0"
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">{t.manageGroups}</span>
        </button>
      </div>

      {/* Athlete list (only visible when no athlete selected) */}
      {!selectedAthlete && (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : filteredAthletes.length > 0 ? (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
              {filteredAthletes.map((athlete) => (
                <button
                  key={athlete.id}
                  onClick={() => onSelectAthlete(athlete.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                >
                  {athlete.avatar_url ? (
                    <img src={athlete.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 text-sm font-bold">
                      {athlete.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white text-sm truncate">{athlete.full_name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {athlete.email || '—'} · {athlete.activity_count} {t.athletes === 'atletas' ? 'actividades' : 'activities'}
                    </p>
                  </div>
                  <UserCheck className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ActivityIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {athletes.length === 0 ? t.noAthletes : (language === 'es' ? 'Sin resultados' : 'No results')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Group management modal */}
      {showGroupModal && (
        <GroupManagementModal
          coachId={coachId}
          athletes={athletes}
          groups={groups}
          onGroupsChanged={loadGroups}
          onClose={() => setShowGroupModal(false)}
          labels={t}
        />
      )}
    </div>
  );
}

interface GroupModalProps {
  coachId: string;
  athletes: AthleteInfo[];
  groups: AthleteGroup[];
  onGroupsChanged: () => void;
  onClose: () => void;
  labels: any;
}

function GroupManagementModal({ coachId, athletes, groups, onGroupsChanged, onClose, labels: t }: GroupModalProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('blue');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(groups[0]?.id || null);
  const [addAthleteQuery, setAddAthleteQuery] = useState('');

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const availableAthletes = useMemo(() => {
    if (!activeGroup) return [];
    return athletes
      .filter((a) => !activeGroup.athlete_ids.includes(a.id))
      .filter((a) => !addAthleteQuery.trim() || a.full_name?.toLowerCase().includes(addAthleteQuery.toLowerCase()));
  }, [athletes, activeGroup, addAthleteQuery]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('athlete_groups')
        .insert({
          coach_id: coachId,
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          color: newGroupColor,
        })
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setActiveGroupId(data.id);
        setNewGroupName('');
        setNewGroupDesc('');
        onGroupsChanged();
      }
    } catch (err) {
      console.error('[GroupManagement] Error creating group:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await supabase.from('athlete_groups').delete().eq('id', groupId);
      if (activeGroupId === groupId) {
        setActiveGroupId(groups.find((g) => g.id !== groupId)?.id || null);
      }
      onGroupsChanged();
    } catch (err) {
      console.error('[GroupManagement] Error deleting group:', err);
    }
  };

  const handleAddAthlete = async (athleteId: string) => {
    if (!activeGroup) return;
    try {
      await supabase
        .from('athlete_group_members')
        .insert({ group_id: activeGroup.id, athlete_id: athleteId });
      onGroupsChanged();
      setAddAthleteQuery('');
    } catch (err) {
      console.error('[GroupManagement] Error adding athlete:', err);
    }
  };

  const handleRemoveAthlete = async (athleteId: string) => {
    if (!activeGroup) return;
    try {
      await supabase
        .from('athlete_group_members')
        .delete()
        .eq('group_id', activeGroup.id)
        .eq('athlete_id', athleteId);
      onGroupsChanged();
    } catch (err) {
      console.error('[GroupManagement] Error removing athlete:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-neutral-900 dark:text-white text-base">{t.manageGroups}</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Create new group */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{t.newGroup}</h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={t.groupName}
              className="w-full px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-400 transition-colors"
            />
            <input
              type="text"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder={t.description}
              className="w-full px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-400 transition-colors"
            />
            <div className="flex items-center gap-2">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setNewGroupColor(c.key)}
                  className={`w-6 h-6 rounded-full ${c.class} ${newGroupColor === c.key ? 'ring-2 ring-offset-2 ring-neutral-400 dark:ring-offset-neutral-900' : ''}`}
                />
              ))}
            </div>
            <button
              onClick={handleCreateGroup}
              disabled={creating || !newGroupName.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {t.save}
            </button>
          </div>

          {/* Existing groups */}
          {groups.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      activeGroupId === g.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${GROUP_COLORS.find((c) => c.key === g.color)?.class || 'bg-blue-500'}`} />
                    {g.name}
                    <span className="text-xs opacity-70">({g.athlete_ids.length})</span>
                  </button>
                ))}
              </div>

              {/* Active group management */}
              {activeGroup && (
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                  {/* Members */}
                  <div className="bg-neutral-50 dark:bg-neutral-800 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {activeGroup.athlete_ids.length} {t.athletes}
                      </span>
                      <button
                        onClick={() => handleDeleteGroup(activeGroup.id)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        {t.delete}
                      </button>
                    </div>
                    {activeGroup.athlete_ids.length > 0 ? (
                      <div className="space-y-1">
                        {activeGroup.athlete_ids.map((aid) => {
                          const athlete = athletes.find((a) => a.id === aid);
                          if (!athlete) return null;
                          return (
                            <div key={aid} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white dark:bg-neutral-700">
                              {athlete.avatar_url ? (
                                <img src={athlete.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300">
                                  {athlete.full_name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="flex-1 text-sm text-neutral-900 dark:text-white truncate">{athlete.full_name}</span>
                              <button
                                onClick={() => handleRemoveAthlete(aid)}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 py-2 text-center">{t.noAthletes}</p>
                    )}
                  </div>

                  {/* Add athletes */}
                  <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                      <input
                        type="text"
                        value={addAthleteQuery}
                        onChange={(e) => setAddAthleteQuery(e.target.value)}
                        placeholder={t.addAthlete}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-400 transition-colors"
                      />
                    </div>
                    {availableAthletes.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {availableAthletes.slice(0, 10).map((athlete) => (
                          <button
                            key={athlete.id}
                            onClick={() => handleAddAthlete(athlete.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                          >
                            {athlete.avatar_url ? (
                              <img src={athlete.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300">
                                {athlete.full_name?.charAt(0) || '?'}
                              </div>
                            )}
                            <span className="flex-1 text-sm text-neutral-900 dark:text-white truncate">{athlete.full_name}</span>
                            <Plus className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {groups.length === 0 && (
            <div className="text-center py-6">
              <Users className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.noGroups}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
