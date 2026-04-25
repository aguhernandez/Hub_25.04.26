import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAthlete } from '../contexts/AthleteContext';
import { supabase } from '../lib/supabase';
import { Plus, Check, X, TrendingUp, Target, Trash2, Trophy, Sparkles, CheckCircle2, Save, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowLeft, Pencil as Edit, Lightbulb, Users, User } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import HabitHeatmap from '../components/habits/HabitHeatmap';
import HabitTagsSection from '../components/tags/HabitTagsSection';

interface Habit {
  id: string;
  name: string;
  description: string | null;
  tracking_type: 'boolean' | 'numeric';
  numeric_unit: string | null;
  numeric_target: number | null;
  is_active: boolean;
}

interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  completed: boolean;
  value: number | null;
  notes: string | null;
}

interface HabitTemplate {
  id: string;
  name: string;
  description: string;
  tracking_type: string;
  numeric_unit: string | null;
  numeric_target: number | null;
  category: string;
}

interface HabitSkill {
  id: string;
  habit_id: string;
  name: string;
  description: string | null;
  order_index: number;
}

interface AthleteOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface TeamOption {
  id: string;
  name: string;
  member_count?: number;
}

interface AthleteHabitMetrics {
  athlete_id: string;
  athlete_name: string;
  avatar_url: string | null;
  overall_consistency: number;
  active_streaks: number;
  needs_attention: number;
  total_habits: number;
}

export default function HabitsPage() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { selectedAthleteId, selectedAthleteName, setSelectedAthlete, clearSelectedAthlete } = useAthlete();
  const [activeTab, setActiveTab] = useState<'habits' | 'goals'>('habits');
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [showAthleteSelector, setShowAthleteSelector] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'individual' | 'team'>('individual');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [trainerView, setTrainerView] = useState<'overview' | 'detail'>('overview');
  const [athleteMetrics, setAthleteMetrics] = useState<AthleteHabitMetrics[]>([]);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [templates, setTemplates] = useState<HabitTemplate[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekDates, setWeekDates] = useState<string[]>([]);

  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [habitSkillsMap, setHabitSkillsMap] = useState<Record<string, HabitSkill[]>>({});
  const [editingSkillsHabitId, setEditingSkillsHabitId] = useState<string | null>(null);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showEditHabitModal, setShowEditHabitModal] = useState(false);
  const [editHabitName, setEditHabitName] = useState('');
  const [editHabitDescription, setEditHabitDescription] = useState('');
  const [editHabitTrackingType, setEditHabitTrackingType] = useState<'checklist' | 'numeric'>('checklist');
  const [editHabitUnit, setEditHabitUnit] = useState('');
  const [editHabitTarget, setEditHabitTarget] = useState('');
  const [editingInputs, setEditingInputs] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [physicalObjectives, setPhysicalObjectives] = useState('');
  const [competitionGoals, setCompetitionGoals] = useState('');
  const [shortTermGoals, setShortTermGoals] = useState('');
  const [longTermGoals, setLongTermGoals] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const getTargetUserId = () => {
    if (profile?.role === 'trainer') {
      return selectedAthleteId || null;
    }
    return profile?.id || null;
  };

  useEffect(() => {
    if (profile?.role === 'trainer') {
      loadAthletes();
      loadTeams();
      if (trainerView === 'overview') {
        loadAthleteMetrics();
      }
    } else if (profile?.role === 'athlete' && profile?.id) {
      loadHabits(profile.id);
      loadTemplates();
      loadGoals(profile.id);
    }
  }, [profile, trainerView]);

  useEffect(() => {
    console.log('selectedAthleteId changed:', selectedAthleteId);
    if (profile?.role === 'trainer' && selectedAthleteId) {
      console.log('Switching to detail view for athlete:', selectedAthleteId);
      setTrainerView('detail');
      setHabits([]);
      setHabitLogs([]);
      loadHabits(selectedAthleteId);
      loadTemplates();
      loadGoals(selectedAthleteId);
    } else if (profile?.role === 'trainer' && !selectedAthleteId) {
      console.log('No athlete selected, staying in overview');
      setTrainerView('overview');
    }
  }, [selectedAthleteId]);

  useEffect(() => {
    if (profile?.role === 'trainer' && athletes.length > 0 && trainerView === 'overview') {
      loadAthleteMetrics();
    }
  }, [athletes, trainerView]);

  useEffect(() => {
    generateWeekDates();
  }, [selectedDate]);

  useEffect(() => {
    generateWeekDates();
  }, []);

  useEffect(() => {
    console.log('useEffect [weekDates, habits, selectedAthleteId] triggered');
    console.log('habits.length:', habits.length);
    console.log('weekDates.length:', weekDates.length);
    console.log('selectedAthleteId:', selectedAthleteId);

    if (habits.length > 0) {
      const targetUserId = profile?.role === 'trainer' ? selectedAthleteId : profile?.id;
      console.log('targetUserId for logs:', targetUserId);
      if (targetUserId) {
        loadWeekLogs(targetUserId);
      }
    }
  }, [weekDates, habits, selectedAthleteId]);

  const loadAthletes = async () => {
    if (!profile?.id) return;

    try {
      const { data: directAthletes } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('assigned_trainer_id', profile.id)
        .eq('role', 'athlete')
        .order('full_name');

      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          athlete_id,
          teams!inner(coach_id)
        `)
        .eq('teams.coach_id', profile.id);

      let allAthletes: AthleteOption[] = directAthletes || [];

      if (teamMembers && teamMembers.length > 0) {
        const athleteIds = teamMembers.map(tm => tm.athlete_id);
        const { data: teamAthletes } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', athleteIds);

        if (teamAthletes) {
          teamAthletes.forEach(athlete => {
            if (!allAthletes.find(a => a.id === athlete.id)) {
              allAthletes.push(athlete);
            }
          });
        }
      }

      setAthletes(allAthletes);
    } catch (error) {
      console.error('Error loading athletes:', error);
    }
  };

  const loadTeams = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          team_members(count)
        `)
        .eq('coach_id', profile.id)
        .order('name');

      if (error) throw error;

      const formattedTeams: TeamOption[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        member_count: Array.isArray(team.team_members) ? team.team_members.length : 0
      }));

      setTeams(formattedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadAthleteMetrics = async () => {
    if (!profile?.id || !athletes.length) return;

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const metricsPromises = athletes.map(async (athlete) => {
      const { data: athleteHabits } = await supabase
        .from('user_habits')
        .select('id')
        .eq('user_id', athlete.id)
        .eq('is_active', true);

      if (!athleteHabits || athleteHabits.length === 0) {
        return {
          athlete_id: athlete.id,
          athlete_name: athlete.full_name,
          avatar_url: athlete.avatar_url,
          overall_consistency: 0,
          active_streaks: 0,
          needs_attention: 0,
          total_habits: 0
        };
      }

      const habitIds = athleteHabits.map(h => h.id);

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id, log_date, completed')
        .eq('user_id', athlete.id)
        .in('habit_id', habitIds)
        .gte('log_date', startDate)
        .lte('log_date', endDate);

      let totalConsistency = 0;
      let activeStreaks = 0;
      let needsAttention = 0;

      athleteHabits.forEach(habit => {
        const habitLogsForWeek = (logs || []).filter(l => l.habit_id === habit.id);
        const completedDays = habitLogsForWeek.filter(l => l.completed).length;
        const completionRatio = completedDays / 7;

        totalConsistency += completionRatio;

        if (completionRatio >= 0.8) {
          activeStreaks++;
        }

        if (completionRatio < 0.6) {
          needsAttention++;
        }
      });

      const overallConsistency = athleteHabits.length > 0
        ? Math.round((totalConsistency / athleteHabits.length) * 100)
        : 0;

      return {
        athlete_id: athlete.id,
        athlete_name: athlete.full_name,
        avatar_url: athlete.avatar_url,
        overall_consistency: overallConsistency,
        active_streaks: activeStreaks,
        needs_attention: needsAttention,
        total_habits: athleteHabits.length
      };
    });

    const metrics = await Promise.all(metricsPromises);
    setAthleteMetrics(metrics);
  };

  const loadGoals = async (userId: string) => {
    if (!userId) return;

    const { data } = await supabase
      .from('profiles')
      .select('physical_objectives, competition_goals, short_term_goals, long_term_goals')
      .eq('id', userId)
      .single();

    if (data) {
      setPhysicalObjectives(data.physical_objectives || '');
      setCompetitionGoals(data.competition_goals || '');
      setShortTermGoals(data.short_term_goals || '');
      setLongTermGoals(data.long_term_goals || '');
    }
  };

  const generateWeekDates = () => {
    const dates = [];
    const today = new Date(selectedDate);
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    setWeekDates(dates);
  };

  const loadHabits = async (userId: string) => {
    if (!userId) {
      console.log('loadHabits: No userId provided');
      return;
    }

    console.log('loadHabits: Loading habits for user:', userId);
    const { data, error } = await supabase
      .from('user_habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading habits:', error);
      return;
    }

    console.log('Loaded habits from user_habits:', data?.length, 'habits');
    console.log('Habits data:', data);
    setHabits(data || []);
  };

  const loadWeekLogs = async (userId: string) => {
    if (!userId) {
      console.log('loadWeekLogs: No userId provided');
      return;
    }

    if (habits.length === 0) {
      console.log('loadWeekLogs: No habits to load logs for');
      return;
    }

    if (weekDates.length === 0) {
      console.log('loadWeekLogs: No weekDates generated yet');
      return;
    }

    const startDate = weekDates[0];
    const endDate = weekDates[6];

    console.log('loadWeekLogs: Loading logs for user:', userId, 'from', startDate, 'to', endDate);

    const { data, error } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate);

    if (error) {
      console.error('Error loading habit logs:', error);
      return;
    }

    console.log('Loaded habit logs:', data?.length, 'logs');
    const logsWithParsedValues = (data || []).map(log => ({
      ...log,
      value: log.value ? parseFloat(log.value as any) : 0
    }));

    setHabitLogs(logsWithParsedValues);
  };

  const loadTemplates = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('habit_templates')
      .select('*')
      .or(`is_global.eq.true,created_by.eq.${profile.id}`)
      .order('name');

    if (!data) {
      setTemplates([]);
      return;
    }

    const personalTemplateNames = new Set(
      data
        .filter(t => !t.is_global && t.created_by === profile.id)
        .map(t => t.name.toLowerCase())
    );

    const filteredTemplates = data.filter(template => {
      if (template.is_global) {
        return !personalTemplateNames.has(template.name.toLowerCase());
      }
      return true;
    });

    setTemplates(filteredTemplates);
  };

  const toggleHabitCompletion = async (habitId: string, date: string, currentStatus: boolean) => {
    const targetUserId = getTargetUserId();
    if (!targetUserId) return;

    const newStatus = !currentStatus;
    const newValue = newStatus ? 1 : 0;

    setHabitLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(
        log => log.habit_id === habitId && log.log_date === date
      );

      if (existingLogIndex >= 0) {
        const updatedLogs = [...prevLogs];
        updatedLogs[existingLogIndex] = {
          ...updatedLogs[existingLogIndex],
          completed: newStatus,
          value: newValue,
        };
        return updatedLogs;
      } else {
        return [
          ...prevLogs,
          {
            id: crypto.randomUUID(),
            habit_id: habitId,
            user_id: targetUserId,
            log_date: date,
            completed: newStatus,
            value: newValue,
            notes: null,
            logged_at: new Date().toISOString(),
          },
        ];
      }
    });

    const { error } = await supabase
      .from('habit_logs')
      .upsert({
        habit_id: habitId,
        user_id: targetUserId,
        log_date: date,
        completed: newStatus,
        value: newValue,
      });

    if (error) {
      console.error('Error updating habit log:', error);
      showToast('Failed to update habit', 'error');
      loadWeekLogs();
      return;
    }
  };

  const updateHabitValue = async (habitId: string, date: string, value: number) => {
    const targetUserId = getTargetUserId();
    if (!targetUserId || value < 0) return;

    const numericValue = typeof value === 'number' ? value : parseFloat(value as any) || 0;

    setHabitLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(
        log => log.habit_id === habitId && log.log_date === date
      );

      if (existingLogIndex >= 0) {
        const updatedLogs = [...prevLogs];
        updatedLogs[existingLogIndex] = {
          ...updatedLogs[existingLogIndex],
          value: numericValue,
          completed: numericValue > 0,
        };
        return updatedLogs;
      } else {
        return [
          ...prevLogs,
          {
            id: crypto.randomUUID(),
            habit_id: habitId,
            user_id: targetUserId,
            log_date: date,
            value: numericValue,
            completed: numericValue > 0,
            notes: null,
            logged_at: new Date().toISOString(),
          },
        ];
      }
    });

    const { error } = await supabase
      .from('habit_logs')
      .upsert({
        habit_id: habitId,
        user_id: targetUserId,
        log_date: date,
        value: numericValue,
        completed: numericValue > 0,
      });

    if (error) {
      console.error('Error updating habit value:', error);
      showToast('Failed to update value', 'error');
      return;
    }
  };

  const deleteHabit = async (habitId: string) => {
    const { error } = await supabase
      .from('user_habits')
      .delete()
      .eq('id', habitId);

    if (error) {
      console.error('Error deleting habit:', error);
      showToast('Failed to delete habit', 'error');
    } else {
      showToast('Habit deleted successfully', 'success');
      const targetUserId = getTargetUserId();
      if (targetUserId) {
        loadHabits(targetUserId);
        loadWeekLogs(targetUserId);
      }
    }
  };

  const openEditHabitModal = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setEditHabitName(habit.name);
    setEditHabitDescription(habit.description || '');
    const displayType = habit.tracking_type === 'boolean' ? 'checklist' : 'numeric';
    setEditHabitTrackingType(displayType);
    setEditHabitUnit(habit.numeric_unit || '');
    setEditHabitTarget(habit.numeric_target?.toString() || '');
    setShowEditHabitModal(true);
  };

  const saveEditHabit = async () => {
    if (!editingHabitId || !profile?.id) return;

    if (!editHabitName.trim()) {
      showToast(language === 'es' ? 'Por favor ingresa un nombre' : 'Please enter a name', 'error');
      return;
    }

    if (editHabitTrackingType === 'numeric' && (!editHabitUnit || !editHabitTarget)) {
      showToast(language === 'es' ? 'Por favor completa Target y Unidad' : 'Please fill in Target and Unit', 'error');
      return;
    }

    const dbTrackingType = editHabitTrackingType === 'checklist' ? 'boolean' : 'numeric';

    const updateData: any = {
      name: editHabitName.trim(),
      description: editHabitDescription.trim() || null,
      tracking_type: dbTrackingType,
      numeric_unit: editHabitTrackingType === 'numeric' ? editHabitUnit : null,
      numeric_target: editHabitTrackingType === 'numeric' ? Number(editHabitTarget) : (editHabitTrackingType === 'checklist' ? 1 : null),
    };

    const { error } = await supabase
      .from('user_habits')
      .update(updateData)
      .eq('id', editingHabitId);

    if (error) {
      console.error('Error updating habit:', error);
      showToast(language === 'es' ? 'Error al actualizar hábito' : 'Failed to update habit', 'error');
    } else {
      showToast(language === 'es' ? 'Hábito actualizado' : 'Habit updated', 'success');
      setShowEditHabitModal(false);
      setEditingHabitId(null);
      const targetUserId = getTargetUserId();
      if (targetUserId) {
        loadHabits(targetUserId);
      }
    }
  };

  const toggleHabitExpansion = async (habitId: string) => {
    if (expandedHabitId === habitId) {
      setExpandedHabitId(null);
    } else {
      setExpandedHabitId(habitId);
      if (!habitSkillsMap[habitId]) {
        await loadHabitSkills(habitId);
      }
    }
  };

  const loadHabitSkills = async (habitId: string) => {
    const { data, error } = await supabase
      .from('habit_skills')
      .select('*')
      .eq('habit_id', habitId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error loading habit skills:', error);
      return;
    }

    setHabitSkillsMap(prev => ({
      ...prev,
      [habitId]: data || []
    }));
  };

  const addSkill = async (habitId: string, name: string, description: string) => {
    console.log('Adding skill:', { habitId, name, description });

    const currentSkills = habitSkillsMap[habitId] || [];
    const maxOrder = currentSkills.length > 0
      ? Math.max(...currentSkills.map(s => s.order_index))
      : -1;

    const newSkill = {
      habit_id: habitId,
      name,
      description: description || null,
      order_index: maxOrder + 1
    };

    console.log('Inserting skill:', newSkill);

    const { data, error } = await supabase
      .from('habit_skills')
      .insert(newSkill)
      .select();

    console.log('Insert result:', { data, error });

    if (error) {
      console.error('Error adding skill:', error);
      showToast(language === 'es' ? 'Error al agregar skill' : 'Failed to add skill', 'error');
    } else {
      showToast(language === 'es' ? 'Skill agregado' : 'Skill added', 'success');
      await loadHabitSkills(habitId);
    }
  };

  const deleteSkill = async (habitId: string, skillId: string) => {
    const { error } = await supabase
      .from('habit_skills')
      .delete()
      .eq('id', skillId);

    if (error) {
      console.error('Error deleting skill:', error);
      showToast(language === 'es' ? 'Error al eliminar skill' : 'Failed to delete skill', 'error');
    } else {
      showToast(language === 'es' ? 'Skill eliminado' : 'Skill deleted', 'success');
      await loadHabitSkills(habitId);
    }
  };

  const getHabitLog = (habitId: string, date: string) => {
    return habitLogs.find((log) => log.habit_id === habitId && log.log_date === date);
  };

  const calculateWeeklyProgress = () => {
    const completedCount = habitLogs.filter((log) => log.completed).length;
    const totalPossible = habits.length * 7;
    return totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;
  };

  const addHabitFromTemplate = async (template: HabitTemplate) => {
    if (profile?.role === 'trainer' && assignmentMode === 'team' && selectedTeamId) {
      try {
        const { data: result, error } = await supabase.rpc('assign_habits_to_team', {
          p_habit_ids: [template.id],
          p_team_id: selectedTeamId,
          p_trainer_id: profile.id
        });

        if (error) throw error;

        showToast(
          language === 'es'
            ? `Hábito asignado a ${result} miembros del equipo`
            : `Habit assigned to ${result} team members`,
          'success'
        );
        setShowAddModal(false);
      } catch (error: any) {
        console.error('Error assigning habit to team:', error);
        showToast(error.message || 'Failed to assign habit to team', 'error');
      }
      return;
    }

    const targetUserId = getTargetUserId();
    if (!targetUserId) return;

    const trackingType = template.tracking_type === 'boolean' ? 'checklist' : 'numeric';
    const finalTargetValue = trackingType === 'checklist' ? 1 : template.numeric_target;
    const finalUnit = trackingType === 'checklist' ? null : template.numeric_unit;
    const dbTrackingType = trackingType === 'checklist' ? 'boolean' : 'numeric';

    const { error } = await supabase.from('user_habits').insert({
      user_id: targetUserId,
      name: template.name,
      description: template.description,
      tracking_type: dbTrackingType,
      numeric_unit: finalUnit,
      numeric_target: finalTargetValue,
    });

    if (error) {
      console.error('Error adding habit:', error);
      showToast('Failed to add habit', 'error');
    } else {
      showToast('Habit added successfully', 'success');
      setShowAddModal(false);
      const targetUserId = getTargetUserId();
      if (targetUserId) {
        loadHabits(targetUserId);
      }
    }
  };

  const createCustomHabit = async (
    name: string,
    description: string,
    trackingType: 'checklist' | 'numeric',
    unit?: string,
    target?: number,
    skills?: Array<{ name: string; description: string }>
  ) => {
    const targetUserId = getTargetUserId();
    if (!targetUserId) return;

    const finalTargetValue = trackingType === 'checklist' ? 1 : target;
    const finalUnit = trackingType === 'checklist' ? null : unit;
    const dbTrackingType = trackingType === 'checklist' ? 'boolean' : 'numeric';

    const { data: newHabit, error } = await supabase
      .from('user_habits')
      .insert({
        user_id: targetUserId,
        name,
        description,
        tracking_type: dbTrackingType,
        numeric_unit: finalUnit,
        numeric_target: finalTargetValue,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating habit:', error);
      showToast('Failed to create habit', 'error');
      return;
    }

    if (skills && skills.length > 0 && newHabit) {
      const skillsToInsert = skills.map((skill, index) => ({
        habit_id: newHabit.id,
        name: skill.name,
        description: skill.description || null,
        order_index: index,
      }));

      const { error: skillsError } = await supabase
        .from('habit_skills')
        .insert(skillsToInsert);

      if (skillsError) {
        console.error('Error creating skills:', skillsError);
        showToast('Habit created but failed to add skills', 'error');
      } else {
        showToast('Habit and skills created successfully', 'success');
      }
    } else {
      showToast('Habit created successfully', 'success');
    }

    setShowAddModal(false);
    loadHabits(targetUserId);
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm(language === 'es' ? '¿Estás seguro de que quieres eliminar este template?' : 'Are you sure you want to delete this template?')) return;

    const { error } = await supabase
      .from('habit_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      showToast(language === 'es' ? 'Error al eliminar template' : 'Failed to delete template', 'error');
    } else {
      showToast(language === 'es' ? 'Template eliminado exitosamente' : 'Template deleted successfully', 'success');
      loadTemplates();
    }
  };

  const handleSaveGoals = async () => {
    const targetUserId = getTargetUserId();
    if (!targetUserId) return;

    setLoading(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          physical_objectives: physicalObjectives,
          competition_goals: competitionGoals,
          short_term_goals: shortTermGoals,
          long_term_goals: longTermGoals,
        })
        .eq('id', targetUserId);

      if (error) throw error;

      setSuccessMessage(language === 'es' ? 'Objetivos guardados exitosamente' : 'Goals saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving goals:', error);
      showToast('Failed to save goals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Hábitos & Objetivos' : 'Habits & Goals'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {language === 'es' ? 'Construye rutinas y alcanza tus metas' : 'Build routines and achieve your goals'}
            </p>
          </div>
        </div>

        {profile?.role === 'trainer' && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {trainerView === 'detail' && selectedAthleteName && (
                  <button
                    onClick={() => {
                      clearSelectedAthlete();
                      setTrainerView('overview');
                      setShowAthleteSelector(false);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                )}
                <div className="w-12 h-12 bg-[#fdda36] rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#514163]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {language === 'es' ? 'Gestionar Hábitos para' : 'Manage Habits for'}
                  </h3>
                  {selectedAthleteName ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedAthleteName}</p>
                      <button
                        onClick={() => {
                          setShowAthleteSelector(true);
                        }}
                        className="text-xs text-[#fdda36] hover:underline"
                      >
                        {language === 'es' ? 'Cambiar' : 'Change'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {language === 'es' ? 'Selecciona un atleta o equipo' : 'Select an Athlete or Team'}
                    </p>
                  )}
                </div>
              </div>
              {trainerView === 'overview' ? (
                <button
                  onClick={() => setShowAthleteSelector(!showAthleteSelector)}
                  className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-medium hover:bg-[#ffd51a] transition-colors"
                >
                  {showAthleteSelector
                    ? (language === 'es' ? 'Cerrar' : 'Close')
                    : (language === 'es' ? 'Asignar Hábitos' : 'Assign Habits')}
                </button>
              ) : (
                <button
                  onClick={() => setShowAthleteSelector(!showAthleteSelector)}
                  className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-medium hover:bg-[#ffd51a] transition-colors"
                >
                  {showAthleteSelector
                    ? (language === 'es' ? 'Cerrar' : 'Close')
                    : (language === 'es' ? 'Cambiar Atleta' : 'Change Athlete')}
                </button>
              )}
            </div>

            {showAthleteSelector && (
              <div className="space-y-4">
                {trainerView === 'overview' && (selectedTeamId || selectedAthleteId) && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {assignmentMode === 'team'
                        ? (language === 'es'
                          ? `✓ Equipo "${selectedTeamName}" seleccionado. Cierra este modal y usa el botón "Agregar Hábito" para asignar hábitos al equipo.`
                          : `✓ Team "${selectedTeamName}" selected. Close this modal and use the "Add Habit" button to assign habits to the team.`)
                        : (language === 'es'
                          ? `✓ Atleta seleccionado. Cierra este modal y usa el botón "Agregar Hábito" para asignar hábitos.`
                          : `✓ Athlete selected. Close this modal and use the "Add Habit" button to assign habits.`)}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <button
                    onClick={() => {
                      setAssignmentMode('individual');
                      setSelectedTeamId(null);
                      setSelectedTeamName(null);
                    }}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                      assignmentMode === 'individual'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <User className="w-4 h-4 inline mr-2" />
                    {language === 'es' ? 'Individual' : 'Individual'}
                  </button>
                  <button
                    onClick={() => setAssignmentMode('team')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                      assignmentMode === 'team'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    {language === 'es' ? 'Equipo' : 'Team'}
                  </button>
                </div>

                {assignmentMode === 'individual' ? (
                  <div className="max-h-64 overflow-y-auto">
                    {athletes.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                        {language === 'es' ? 'No tienes atletas asignados' : 'You have no assigned athletes'}
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {athletes.map((athlete) => (
                          <button
                            key={athlete.id}
                            onClick={() => {
                              setSelectedAthlete(athlete.id, athlete.full_name);
                              setShowAthleteSelector(false);
                            }}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                              selectedAthleteId === athlete.id
                                ? 'bg-[#fdda36] text-[#514163]'
                                : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                            }`}
                          >
                            {athlete.avatar_url ? (
                              <img
                                src={athlete.avatar_url}
                                alt={athlete.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              </div>
                            )}
                            <span className="font-medium">{athlete.full_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {teams.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                        {language === 'es' ? 'No tienes equipos creados' : 'You have no teams created'}
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => {
                              console.log('Team selected:', team.id, team.name);
                              setSelectedTeamId(team.id);
                              setSelectedTeamName(team.name);
                              if (trainerView === 'overview') {
                                console.log('Keeping modal open for habit assignment');
                              } else {
                                setShowAthleteSelector(false);
                              }
                            }}
                            className={`flex items-center justify-between gap-3 p-3 rounded-lg transition-colors ${
                              selectedTeamId === team.id
                                ? 'bg-[#fdda36] text-[#514163]'
                                : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                              </div>
                              <span className="font-medium">{team.name}</span>
                            </div>
                            <span className="text-sm opacity-70">{team.member_count} {language === 'es' ? 'miembros' : 'members'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {profile?.role === 'trainer' && trainerView === 'overview' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Resumen de Hábitos' : 'Habits Overview'}
              </h2>
              {(selectedTeamId || (assignmentMode === 'individual' && selectedAthleteId)) && (
                <button
                  onClick={() => {
                    loadTemplates();
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-medium hover:bg-[#ffd51a] transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  {language === 'es' ? 'Agregar Hábito' : 'Add Habit'}
                </button>
              )}
            </div>

            {athleteMetrics.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 text-center">
                <Users className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  {language === 'es' ? 'No hay atletas' : 'No Athletes'}
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300">
                  {language === 'es'
                    ? 'No tienes atletas asignados todavía'
                    : 'You have no assigned athletes yet'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {athleteMetrics.map((metrics) => (
                  <button
                    key={metrics.athlete_id}
                    onClick={() => {
                      setSelectedAthlete(metrics.athlete_id, metrics.athlete_name);
                    }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-[#fdda36] dark:hover:border-[#fdda36] transition-all text-left group"
                  >
                    <div className="flex items-start gap-4">
                      {metrics.avatar_url ? (
                        <img
                          src={metrics.avatar_url}
                          alt={metrics.athlete_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-600 dark:text-gray-300" />
                        </div>
                      )}

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-[#514163] dark:group-hover:text-[#fdda36] transition-colors">
                          {metrics.athlete_name}
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                              {metrics.overall_consistency}%
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {language === 'es' ? 'Consistencia' : 'Consistency'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {language === 'es' ? 'últimos 7 días' : 'last 7 days'}
                            </div>
                          </div>

                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                              {metrics.active_streaks}
                            </div>
                            <div className="text-xs text-green-700 dark:text-green-400">
                              {language === 'es' ? 'Rachas Activas' : 'Active Streaks'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              ≥ 80% completado
                            </div>
                          </div>

                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                            <div className="text-2xl font-bold text-red-700 dark:text-red-400 mb-1">
                              {metrics.needs_attention}
                            </div>
                            <div className="text-xs text-red-700 dark:text-red-400">
                              {language === 'es' ? 'Necesita Atención' : 'Needs Attention'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {'<'} 60% completado
                            </div>
                          </div>

                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                              {metrics.total_habits}
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-400">
                              {language === 'es' ? 'Total Hábitos' : 'Total Habits'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {language === 'es' ? 'activos' : 'active'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#fdda36] transition-colors self-center" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (profile?.role === 'athlete' || (profile?.role === 'trainer' && selectedAthleteId)) ? (
          <>
          {profile?.role === 'trainer' && selectedAthleteId && (
            <button
              onClick={() => {
                clearSelectedAthlete();
                setTrainerView('overview');
              }}
              className="mb-6 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              {language === 'es' ? 'Volver al Resumen' : 'Back to Overview'}
            </button>
          )}
          <>
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('habits')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
              activeTab === 'habits'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {language === 'es' ? 'Hábitos' : 'Habits'}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
              activeTab === 'goals'
                ? 'bg-[#fdda36] text-[#514163]'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Target className="w-5 h-5" />
              {language === 'es' ? 'Objetivos' : 'Goals'}
            </div>
          </button>
        </div>

      {activeTab === 'habits' && (
      <>
      <HabitHeatmap
        habits={habits}
        habitLogs={habitLogs}
        language={language}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mt-6">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 7);
                  setSelectedDate(newDate.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Previous week"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white text-center md:text-left flex-1 md:flex-none">
                Week of {new Date(weekDates[0] || selectedDate).toLocaleDateString()}
              </h3>
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 7);
                  setSelectedDate(newDate.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Next week"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full md:w-auto px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="md:inline">Add Habit</span>
            </button>
          </div>
        </div>

        {habits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Habit
                  </th>
                  {weekDates.map((date) => {
                    const dateObj = new Date(date);
                    const isToday = date === today;
                    return (
                      <th
                        key={date}
                        className={`px-4 py-4 text-center text-sm font-semibold ${
                          isToday
                            ? 'bg-[#fdda36]/10 text-[#514163] dark:text-[#fdda36]'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        <div>{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-lg font-bold">{dateObj.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {habits.map((habit) => {
                  const isExpanded = expandedHabitId === habit.id;
                  const skills = habitSkillsMap[habit.id] || [];

                  return (
                    <React.Fragment key={habit.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{habit.name}</p>
                              {habit.tracking_type === 'numeric' && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Target: {habit.numeric_target} {habit.numeric_unit}
                                </p>
                              )}
                              <div className="mt-1">
                                <HabitTagsSection
                                  habitId={habit.id}
                                  language={language}
                                  currentUserId={profile?.id}
                                  isTrainerOrAdmin={profile?.role === 'trainer' || profile?.role === 'admin'}
                                  canCreate={profile?.role === 'trainer' || profile?.role === 'admin'}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleHabitExpansion(habit.id)}
                                className="p-1.5 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
                                title={language === 'es' ? 'Ver Skills' : 'View Skills'}
                              >
                                <Lightbulb className={`w-4 h-4 transition-colors ${isExpanded ? 'text-[#fdda36]' : 'text-gray-400'}`} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditHabitModal(habit);
                                }}
                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title={language === 'es' ? 'Editar hábito' : 'Edit habit'}
                              >
                                <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteHabit(habit.id);
                                }}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Delete habit"
                              >
                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          </div>
                        </td>
                    {weekDates.map((date) => {
                      const log = getHabitLog(habit.id, date);
                      const isCompleted = log?.completed || false;
                      const isToday = date === today;

                      return (
                        <td
                          key={`${habit.id}-${date}`}
                          className={`px-4 py-4 text-center ${
                            isToday ? 'bg-[#fdda36]/5' : ''
                          }`}
                        >
                          {habit.tracking_type === 'boolean' ? (
                            <button
                              onClick={() => toggleHabitCompletion(habit.id, date, isCompleted)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                                isCompleted
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <X className="w-5 h-5" />
                              )}
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                inputMode="numeric"
                                value={editingInputs[`${habit.id}-${date}`] ?? log?.value ?? ''}
                                onChange={(e) => {
                                  setEditingInputs(prev => ({
                                    ...prev,
                                    [`${habit.id}-${date}`]: e.target.value
                                  }));
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                  updateHabitValue(habit.id, date, val);
                                  setEditingInputs(prev => {
                                    const newInputs = { ...prev };
                                    delete newInputs[`${habit.id}-${date}`];
                                    return newInputs;
                                  });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => {
                                  e.target.select();
                                  setEditingInputs(prev => ({
                                    ...prev,
                                    [`${habit.id}-${date}`]: (log?.value ?? '').toString()
                                  }));
                                }}
                                placeholder="0"
                                className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36] focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const currentVal = typeof log?.value === 'number' ? log.value : 0;
                                    updateHabitValue(habit.id, date, currentVal + 1);
                                  }}
                                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                >
                                  <ChevronUp className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const currentVal = typeof log?.value === 'number' ? log.value : 0;
                                    if (currentVal > 0) {
                                      updateHabitValue(habit.id, date, currentVal - 1);
                                    }
                                  }}
                                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                >
                                  <ChevronDown className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {isExpanded && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={weekDates.length + 1} className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {language === 'es' ? 'Skills' : 'Skills'} ({skills.length})
                            </h4>
                            <button
                              onClick={() => setEditingSkillsHabitId(habit.id)}
                              className="text-xs px-3 py-1 bg-[#fdda36] text-[#514163] font-medium rounded hover:bg-[#ffd51a] transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              {language === 'es' ? 'Editar Skills' : 'Edit Skills'}
                            </button>
                          </div>

                          {skills.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              {language === 'es' ? 'No hay skills agregados. Haz clic en "Editar Skills" para agregar.' : 'No skills added. Click "Edit Skills" to add.'}
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {skills.map((skill) => (
                                <div
                                  key={skill.id}
                                  className="flex items-start gap-2 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                                >
                                  <Lightbulb className="w-4 h-4 text-[#fdda36] mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {skill.name}
                                    </p>
                                    {skill.description && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                        {skill.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Habits Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start building your routine by adding your first habit
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
            >
              Add Your First Habit
            </button>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-6">
          {successMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-200 font-medium">{successMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Objetivos Físicos' : 'Physical Objectives'}
                </h2>
              </div>
              <textarea
                value={physicalObjectives}
                onChange={(e) => setPhysicalObjectives(e.target.value)}
                placeholder={language === 'es' ? 'Ej: Mejorar mi resistencia, aumentar fuerza...' : 'e.g., Improve endurance, increase strength...'}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Metas de Competición' : 'Competition Goals'}
                </h2>
              </div>
              <textarea
                value={competitionGoals}
                onChange={(e) => setCompetitionGoals(e.target.value)}
                placeholder={language === 'es' ? 'Ej: Clasificar para campeonatos, mejorar marcas...' : 'e.g., Qualify for championships, improve times...'}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Objetivos a Corto Plazo' : 'Short-Term Goals'}
                </h2>
              </div>
              <textarea
                value={shortTermGoals}
                onChange={(e) => setShortTermGoals(e.target.value)}
                placeholder={language === 'es' ? 'Ej: Completar 3 entrenamientos por semana...' : 'e.g., Complete 3 workouts per week...'}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Objetivos a Largo Plazo' : 'Long-Term Goals'}
                </h2>
              </div>
              <textarea
                value={longTermGoals}
                onChange={(e) => setLongTermGoals(e.target.value)}
                placeholder={language === 'es' ? 'Ej: Competir a nivel nacional, alcanzar nivel élite...' : 'e.g., Compete at national level, reach elite status...'}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveGoals}
              disabled={loading}
              className="px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {loading ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar Objetivos' : 'Save Goals')}
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddHabitModal
          templates={templates}
          userProfile={profile}
          selectedTeamName={selectedTeamName}
          selectedAthleteName={selectedAthleteName}
          assignmentMode={assignmentMode}
          onAddFromTemplate={addHabitFromTemplate}
          onCreateCustom={createCustomHabit}
          onDeleteTemplate={deleteTemplate}
          onRefreshTemplates={loadTemplates}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingSkillsHabitId && (() => {
        const habit = habits.find(h => h.id === editingSkillsHabitId);
        if (!habit) return null;
        return (
          <ManageSkillsModal
            habit={habit}
            skills={habitSkillsMap[editingSkillsHabitId] || []}
            onAddSkill={(name, description) => addSkill(editingSkillsHabitId, name, description)}
            onDeleteSkill={(skillId) => deleteSkill(editingSkillsHabitId, skillId)}
            onClose={() => setEditingSkillsHabitId(null)}
            language={language}
          />
        );
      })()}

      {showEditHabitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Editar Hábito' : 'Edit Habit'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Nombre' : 'Name'}
                </label>
                <input
                  type="text"
                  value={editHabitName}
                  onChange={(e) => setEditHabitName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={language === 'es' ? 'ej. Correr por la mañana' : 'e.g., Morning run'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  value={editHabitDescription}
                  onChange={(e) => setEditHabitDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={language === 'es' ? 'Descripción opcional' : 'Optional description'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Tipo de Seguimiento' : 'Tracking Type'}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditHabitTrackingType('checklist');
                      setEditHabitUnit('');
                      setEditHabitTarget('');
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      editHabitTrackingType === 'checklist'
                        ? 'border-[#fdda36] bg-[#fdda36] text-[#514163]'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Yes/No
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditHabitTrackingType('numeric')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      editHabitTrackingType === 'numeric'
                        ? 'border-[#fdda36] bg-[#fdda36] text-[#514163]'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {language === 'es' ? 'Métrica' : 'Metric'}
                  </button>
                </div>
              </div>

              {editHabitTrackingType === 'numeric' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target
                    </label>
                    <input
                      type="number"
                      value={editHabitTarget}
                      onChange={(e) => setEditHabitTarget(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="10"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'es' ? 'Unidad' : 'Unit'}
                    </label>
                    <select
                      value={editHabitUnit}
                      onChange={(e) => setEditHabitUnit(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                      <option value="km">{language === 'es' ? 'Kilómetros' : 'Kilometers'}</option>
                      <option value="m">{language === 'es' ? 'Metros' : 'Meters'}</option>
                      <option value="hr">{language === 'es' ? 'Horas' : 'Hours'}</option>
                      <option value="min">{language === 'es' ? 'Minutos' : 'Minutes'}</option>
                      <option value="seg">{language === 'es' ? 'Segundos' : 'Seconds'}</option>
                      <option value="L">{language === 'es' ? 'Litros' : 'Liters'}</option>
                      <option value="times">{language === 'es' ? 'Veces' : 'Times'}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowEditHabitModal(false);
                  setEditingHabitId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={saveEditHabit}
                className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors font-medium"
              >
                {language === 'es' ? 'Guardar Cambios' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
        </>
        ) : null}
      </div>
    </div>
  );
}

interface AddHabitModalProps {
  templates: HabitTemplate[];
  userProfile: any;
  selectedTeamName: string | null;
  selectedAthleteName: string | null;
  assignmentMode: 'individual' | 'team';
  onAddFromTemplate: (template: HabitTemplate) => void;
  onCreateCustom: (
    name: string,
    description: string,
    trackingType: 'checklist' | 'numeric',
    unit?: string,
    target?: number,
    skills?: Array<{ name: string; description: string }>
  ) => void;
  onDeleteTemplate: (templateId: string) => void;
  onRefreshTemplates: () => void;
  onClose: () => void;
}

function AddHabitModal({
  templates,
  userProfile,
  selectedTeamName,
  selectedAthleteName,
  assignmentMode,
  onAddFromTemplate,
  onCreateCustom,
  onDeleteTemplate,
  onRefreshTemplates,
  onClose,
}: AddHabitModalProps) {
  const { language } = useLanguage();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'templates' | 'custom' | 'edit'>('templates');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trackingType, setTrackingType] = useState<'checklist' | 'numeric'>('checklist');
  const [unit, setUnit] = useState('');
  const [target, setTarget] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<HabitTemplate | null>(null);
  const [tempSkills, setTempSkills] = useState<Array<{ name: string; description: string }>>([]);
  const [skillName, setSkillName] = useState('');
  const [skillDescription, setSkillDescription] = useState('');

  const handleClose = () => {
    setTempSkills([]);
    setSkillName('');
    setSkillDescription('');
    setName('');
    setDescription('');
    setUnit('');
    setTarget('');
    setTrackingType('checklist');
    setEditingTemplate(null);
    setMode('templates');
    onClose();
  };

  const handleTrackingTypeChange = (newType: 'checklist' | 'numeric') => {
    setTrackingType(newType);
    if (newType === 'checklist') {
      setUnit('');
      setTarget('');
    }
  };

  const handleAddTempSkill = () => {
    if (!skillName.trim()) return;

    setTempSkills([...tempSkills, { name: skillName.trim(), description: skillDescription.trim() }]);
    setSkillName('');
    setSkillDescription('');
  };

  const handleRemoveTempSkill = (index: number) => {
    setTempSkills(tempSkills.filter((_, i) => i !== index));
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast(language === 'es' ? 'Por favor ingresa un nombre' : 'Please enter a name', 'error');
      return;
    }

    if (trackingType === 'numeric') {
      if (!unit || !target) {
        showToast(language === 'es' ? 'Por favor completa Target y Unidad' : 'Please fill in Target and Unit', 'error');
        return;
      }
    }

    onCreateCustom(
      name,
      description,
      trackingType,
      trackingType === 'numeric' ? unit : undefined,
      trackingType === 'numeric' ? Number(target) : undefined,
      tempSkills.length > 0 ? tempSkills : undefined
    );
  };

  const handleEditTemplate = (template: HabitTemplate, userProfile: any) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description);
    const type = template.tracking_type === 'boolean' ? 'checklist' : 'numeric';
    setTrackingType(type);

    if (type === 'numeric') {
      setUnit(template.numeric_unit || '');
      setTarget(template.numeric_target?.toString() || '');
    } else {
      setUnit('');
      setTarget('');
    }

    setTempSkills([]);
    setSkillName('');
    setSkillDescription('');
    setMode('edit');
  };

  const handleUpdateTemplate = (e: React.FormEvent, userProfile: any) => {
    e.preventDefault();
    if (!editingTemplate || !userProfile?.id) return;

    if (trackingType === 'numeric' && (!unit || !target)) {
      showToast(language === 'es' ? 'Por favor completa los campos Target y Unidad' : 'Please fill in Target and Unit fields', 'error');
      return;
    }

    onCreateCustom(
      name,
      description,
      trackingType,
      trackingType === 'numeric' ? unit : undefined,
      trackingType === 'numeric' ? Number(target) : undefined,
      tempSkills.length > 0 ? tempSkills : undefined
    );

    setEditingTemplate(null);
    setTempSkills([]);
    setMode('templates');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Añadir Hábito' : 'Add Habit'}
              </h2>
              {userProfile?.role === 'trainer' && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {assignmentMode === 'team' && selectedTeamName
                    ? (language === 'es'
                      ? `Se asignará a todos los miembros del equipo "${selectedTeamName}"`
                      : `Will be assigned to all members of team "${selectedTeamName}"`)
                    : selectedAthleteName
                      ? (language === 'es'
                        ? `Se asignará a ${selectedAthleteName}`
                        : `Will be assigned to ${selectedAthleteName}`)
                      : ''}
                </p>
              )}
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode('templates');
                setTempSkills([]);
                setSkillName('');
                setSkillDescription('');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'templates'
                  ? 'bg-[#fdda36] text-[#514163]'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              From Templates
            </button>
            <button
              onClick={() => {
                setMode('custom');
                setTempSkills([]);
                setSkillName('');
                setSkillDescription('');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'custom'
                  ? 'bg-[#fdda36] text-[#514163]'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Create Custom
            </button>
          </div>
        </div>

        <div className="p-6">
          {mode === 'templates' ? (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => onAddFromTemplate(template)}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {template.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {template.tracking_type === 'numeric'
                          ? `Target: ${template.numeric_target} ${template.numeric_unit}`
                          : 'Target: Yes/No'
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full">
                        {template.category}
                      </span>
                      {!template.is_global && template.created_by === userProfile?.id && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                          {language === 'es' ? 'Personal' : 'Personal'}
                        </span>
                      )}
                      {userProfile?.role === 'admin' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template, userProfile);
                            }}
                            className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            title={language === 'es' ? 'Editar' : 'Edit'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTemplate(template.id);
                            }}
                            className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                            title={language === 'es' ? 'Eliminar' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {userProfile?.role !== 'admin' && !template.is_global && template.created_by === userProfile?.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template, userProfile);
                          }}
                          className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                          title={language === 'es' ? 'Editar' : 'Edit'}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {userProfile?.role !== 'admin' && template.is_global && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template, userProfile);
                          }}
                          className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                          title={language === 'es' ? 'Personalizar' : 'Customize'}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : mode === 'edit' ? (
            <form onSubmit={(e) => handleUpdateTemplate(e, userProfile)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Nombre del Hábito' : 'Habit Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={language === 'es' ? 'Ej: Ejercicio matutino' : 'e.g., Morning exercise'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={language === 'es' ? 'Describe tu hábito...' : 'Describe your habit...'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Tipo de Seguimiento' : 'Tracking Type'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleTrackingTypeChange('checklist')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      trackingType === 'checklist'
                        ? 'border-[#fdda36] bg-[#fdda36] text-[#514163]'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Yes/No
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTrackingTypeChange('numeric')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      trackingType === 'numeric'
                        ? 'border-[#fdda36] bg-[#fdda36] text-[#514163]'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {language === 'es' ? 'Métrica' : 'Metric'}
                  </button>
                </div>
              </div>

              {trackingType === 'numeric' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target
                    </label>
                    <input
                      type="number"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'es' ? 'Unidad' : 'Unit'}
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                      <option value="km">{language === 'es' ? 'Kilómetros' : 'Kilometers'}</option>
                      <option value="m">{language === 'es' ? 'Metros' : 'Meters'}</option>
                      <option value="hr">{language === 'es' ? 'Horas' : 'Hours'}</option>
                      <option value="min">{language === 'es' ? 'Minutos' : 'Minutes'}</option>
                      <option value="seg">{language === 'es' ? 'Segundos' : 'Seconds'}</option>
                      <option value="L">{language === 'es' ? 'Litros' : 'Liters'}</option>
                      <option value="times">{language === 'es' ? 'Veces' : 'Times'}</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Skills (Opcional)' : 'Skills (Optional)'}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tempSkills.length} {language === 'es' ? 'agregados' : 'added'}
                  </span>
                </div>

                <div className="space-y-3 mb-3">
                  <div>
                    <input
                      type="text"
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTempSkill();
                        }
                      }}
                      placeholder={language === 'es' ? 'Nombre del skill...' : 'Skill name...'}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <textarea
                      value={skillDescription}
                      onChange={(e) => setSkillDescription(e.target.value)}
                      placeholder={language === 'es' ? 'Descripción (opcional)...' : 'Description (optional)...'}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTempSkill}
                    disabled={!skillName.trim()}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {language === 'es' ? 'Agregar Skill' : 'Add Skill'}
                  </button>
                </div>

                {tempSkills.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {tempSkills.map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600"
                      >
                        <Lightbulb className="w-4 h-4 text-[#fdda36] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {skill.name}
                          </p>
                          {skill.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              {skill.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTempSkill(index)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode('templates');
                    setTempSkills([]);
                    setSkillName('');
                    setSkillDescription('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors font-medium"
                >
                  {language === 'es' ? 'Crear Hábito' : 'Create Habit'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateCustom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Morning run"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tracking Type
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleTrackingTypeChange('checklist')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      trackingType === 'checklist'
                        ? 'border-[#fdda36] bg-[#fdda36] text-[#514163]'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Yes/No
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTrackingTypeChange('numeric')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      trackingType === 'numeric'
                        ? 'border-[#fdda36] bg-[#fdda36] text-[#514163]'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {language === 'es' ? 'Métrica' : 'Metric'}
                  </button>
                </div>
              </div>

              {trackingType === 'numeric' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target
                    </label>
                    <input
                      type="number"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'es' ? 'Unidad' : 'Unit'}
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                      <option value="km">{language === 'es' ? 'Kilómetros' : 'Kilometers'}</option>
                      <option value="m">{language === 'es' ? 'Metros' : 'Meters'}</option>
                      <option value="hr">{language === 'es' ? 'Horas' : 'Hours'}</option>
                      <option value="min">{language === 'es' ? 'Minutos' : 'Minutes'}</option>
                      <option value="seg">{language === 'es' ? 'Segundos' : 'Seconds'}</option>
                      <option value="L">{language === 'es' ? 'Litros' : 'Liters'}</option>
                      <option value="times">{language === 'es' ? 'Veces' : 'Times'}</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Skills (Opcional)' : 'Skills (Optional)'}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tempSkills.length} {language === 'es' ? 'agregados' : 'added'}
                  </span>
                </div>

                <div className="space-y-3 mb-3">
                  <div>
                    <input
                      type="text"
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTempSkill();
                        }
                      }}
                      placeholder={language === 'es' ? 'Nombre del skill...' : 'Skill name...'}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <textarea
                      value={skillDescription}
                      onChange={(e) => setSkillDescription(e.target.value)}
                      placeholder={language === 'es' ? 'Descripción (opcional)...' : 'Description (optional)...'}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTempSkill}
                    disabled={!skillName.trim()}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {language === 'es' ? 'Agregar Skill' : 'Add Skill'}
                  </button>
                </div>

                {tempSkills.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {tempSkills.map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600"
                      >
                        <Lightbulb className="w-4 h-4 text-[#fdda36] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {skill.name}
                          </p>
                          {skill.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              {skill.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTempSkill(index)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
                >
                  Create Habit
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

interface ManageSkillsModalProps {
  habit: Habit;
  skills: HabitSkill[];
  onAddSkill: (name: string, description: string) => Promise<void>;
  onDeleteSkill: (skillId: string) => Promise<void>;
  onClose: () => void;
  language: string;
}

function ManageSkillsModal({
  habit,
  skills,
  onAddSkill,
  onDeleteSkill,
  onClose,
  language
}: ManageSkillsModalProps) {
  const [skillName, setSkillName] = useState('');
  const [skillDescription, setSkillDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;

    setIsAdding(true);
    await onAddSkill(skillName, skillDescription);
    setSkillName('');
    setSkillDescription('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Gestionar Skills' : 'Manage Skills'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {habit.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Nombre del Skill' : 'Skill Name'}
                </label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder={language === 'es' ? 'Ej: Respiración diafragmática' : 'e.g., Diaphragmatic breathing'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}
                </label>
                <textarea
                  value={skillDescription}
                  onChange={(e) => setSkillDescription(e.target.value)}
                  placeholder={language === 'es' ? 'Describe cómo practicar este skill...' : 'Describe how to practice this skill...'}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#fdda36] focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!skillName.trim() || isAdding}
                className="w-full px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {isAdding
                  ? (language === 'es' ? 'Agregando...' : 'Adding...')
                  : (language === 'es' ? 'Agregar Skill' : 'Add Skill')
                }
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {language === 'es' ? 'Skills Actuales' : 'Current Skills'} ({skills.length})
            </h3>

            {skills.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{language === 'es' ? 'No hay skills agregados todavía' : 'No skills added yet'}</p>
              </div>
            ) : (
              skills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg group"
                >
                  <Lightbulb className="w-5 h-5 text-[#fdda36] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {skill.name}
                    </p>
                    {skill.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {skill.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteSkill(skill.id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title={language === 'es' ? 'Eliminar skill' : 'Delete skill'}
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
