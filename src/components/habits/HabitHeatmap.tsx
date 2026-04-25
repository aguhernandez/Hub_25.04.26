import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Flame, AlertTriangle, CheckCircle, Square } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Habit {
  id: string;
  name: string;
  target_value: number | null;
  unit: string | null;
  habit_type: 'checklist' | 'numeric';
}

interface HabitLog {
  habit_id: string;
  log_date: string;
  value: number | null;
  completed: boolean;
}

interface HabitSkill {
  id: string;
  habit_id: string;
  name: string;
  description: string | null;
  order_index: number;
}

interface SkillLog {
  id: string;
  skill_id: string;
  date: string;
  completed: boolean;
  notes: string | null;
}

interface HabitHeatmapProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  language?: string;
}

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HabitHeatmap({ habits, habitLogs, language = 'en' }: HabitHeatmapProps) {
  const { profile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthDates, setMonthDates] = useState<string[]>([]);
  const [expandedHabits, setExpandedHabits] = useState<Set<string>>(new Set());
  const [habitSkills, setHabitSkills] = useState<Map<string, HabitSkill[]>>(new Map());
  const [skillLogs, setSkillLogs] = useState<SkillLog[]>([]);

  useEffect(() => {
    generateMonthDates();
  }, [selectedMonth]);

  useEffect(() => {
    if (profile?.id && habits.length > 0) {
      loadHabitSkills();
      loadSkillLogs();
    }
  }, [profile, habits]);

  const generateMonthDates = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      dates.push(formatDateLocal(date));
    }
    setMonthDates(dates);
  };

  const loadHabitSkills = async () => {
    const habitIds = habits.map(h => h.id);
    if (habitIds.length === 0) return;

    const { data, error } = await supabase
      .from('habit_skills')
      .select('*')
      .in('habit_id', habitIds)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error loading habit skills:', error);
      return;
    }

    const skillsMap = new Map<string, HabitSkill[]>();
    data?.forEach(skill => {
      const existing = skillsMap.get(skill.habit_id) || [];
      skillsMap.set(skill.habit_id, [...existing, skill]);
    });
    setHabitSkills(skillsMap);
  };

  const loadSkillLogs = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('skill_logs')
      .select('*')
      .eq('user_id', profile.id)
      .gte('date', formatDateLocal(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));

    if (error) {
      console.error('Error loading skill logs:', error);
      return;
    }

    setSkillLogs(data || []);
  };

  const toggleSkillsExpanded = (habitId: string) => {
    const newExpanded = new Set(expandedHabits);
    if (newExpanded.has(habitId)) {
      newExpanded.delete(habitId);
    } else {
      newExpanded.add(habitId);
    }
    setExpandedHabits(newExpanded);
  };

  const toggleSkillCompleted = async (skillId: string, date: string) => {
    if (!profile?.id) return;

    const existingLog = skillLogs.find(log => log.skill_id === skillId && log.date === date);

    if (existingLog) {
      const { error } = await supabase
        .from('skill_logs')
        .update({ completed: !existingLog.completed })
        .eq('id', existingLog.id);

      if (!error) {
        setSkillLogs(prev => prev.map(log =>
          log.id === existingLog.id ? { ...log, completed: !log.completed } : log
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('skill_logs')
        .insert({
          skill_id: skillId,
          user_id: profile.id,
          date,
          completed: true
        })
        .select()
        .single();

      if (!error && data) {
        setSkillLogs(prev => [...prev, data]);
      }
    }
  };

  const calculateStreak = (habit: Habit): number => {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateStr = formatDateLocal(currentDate);
      const ratio = getCompletionRatio(habit, dateStr);

      if (ratio === null || ratio < 0.8) break;

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);

      if (streak > 365) break;
    }

    return streak;
  };

  const calculateWeeklyPercentage = (habit: Habit): number => {
    const today = new Date();
    const last7Days: string[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      last7Days.push(formatDateLocal(date));
    }

    const ratios = last7Days
      .map(date => getCompletionRatio(habit, date))
      .filter(ratio => ratio !== null) as number[];

    if (ratios.length === 0) return 0;

    const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    return Math.round(avgRatio * 100);
  };

  const getStreakIcon = (streak: number) => {
    if (streak >= 7) return <Flame className="w-4 h-4 text-orange-500" />;
    if (streak >= 3) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (streak > 0) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return null;
  };

  const getCompletionRatio = (habit: Habit, date: string): number | null => {
    const log = habitLogs.find(
      (l) => l.habit_id === habit.id && l.log_date === date
    );

    if (!log || log.value === null) return null;

    const targetValue = habit.target_value || 1;
    const actualValue = log.value;

    return Math.min(actualValue / targetValue, 1);
  };

  const goToPreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const getColorForRatio = (ratio: number | null): string => {
    if (ratio === null) return 'bg-gray-100 dark:bg-gray-700';

    if (ratio >= 0.8) return 'bg-green-500';
    if (ratio >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTooltipText = (habit: Habit, date: string): string => {
    const log = habitLogs.find(
      (l) => l.habit_id === habit.id && l.log_date === date
    );

    if (!log || log.value === null) {
      return language === 'es' ? 'No registrado' : 'Not logged';
    }

    const ratio = getCompletionRatio(habit, date);
    const percentage = ratio !== null ? Math.round(ratio * 100) : 0;
    const actualValue = log.value;
    const targetValue = habit.target_value || 1;
    const unit = habit.unit || '';

    return `${actualValue}/${targetValue} ${unit} (${percentage}%)`;
  };

  const monthName = selectedMonth.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {language === 'es' ? 'Mapa de Consistencia' : 'Consistency Heatmap'}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            {monthName}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {habits.length > 0 ? (
          habits.map((habit) => {
            const streak = calculateStreak(habit);
            const weeklyPercentage = calculateWeeklyPercentage(habit);
            const skills = habitSkills.get(habit.id) || [];
            const isExpanded = expandedHabits.has(habit.id);
            const today = formatDateLocal(new Date());

            return (
              <div key={habit.id} className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {habit.name}
                      </h3>
                      {skills.length > 0 && (
                        <button
                          onClick={() => toggleSkillsExpanded(habit.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title={isExpanded ? (language === 'es' ? 'Ocultar skills' : 'Hide skills') : (language === 'es' ? 'Mostrar skills' : 'Show skills')}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(20px,1fr))] gap-1">
                      {monthDates.map((date) => {
                        const ratio = getCompletionRatio(habit, date);
                        const colorClass = getColorForRatio(ratio);
                        const tooltip = getTooltipText(habit, date);

                        return (
                          <div
                            key={date}
                            className={`aspect-square rounded ${colorClass} cursor-pointer hover:opacity-80 transition-opacity`}
                            title={`${new Date(date).toLocaleDateString()} - ${tooltip}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 min-w-[100px]">
                    <div className="flex items-center gap-1.5 text-sm">
                      {getStreakIcon(streak)}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {streak}d
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {weeklyPercentage}% {language === 'es' ? 'sem' : 'wk'}
                    </div>
                    {habit.habit_type === 'numeric' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {language === 'es' ? 'Meta' : 'Target'}: {habit.target_value} {habit.unit}
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && skills.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      {language === 'es' ? 'Skills Recomendados' : 'Recommended Skills'}
                    </h4>
                    <div className="space-y-2">
                      {skills.map((skill) => {
                        const skillLog = skillLogs.find(log => log.skill_id === skill.id && log.date === today);
                        const isCompleted = skillLog?.completed || false;

                        return (
                          <div key={skill.id} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <button
                              onClick={() => toggleSkillCompleted(skill.id, today)}
                              className="flex-shrink-0 mt-0.5"
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                              )}
                            </button>
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
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {language === 'es'
              ? 'No hay hábitos para mostrar'
              : 'No habits to display'}
          </p>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-gray-700 dark:text-gray-300">
              80-100%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-gray-700 dark:text-gray-300">
              50-79%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-gray-700 dark:text-gray-300">
              0-49%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
            <span className="text-gray-700 dark:text-gray-300">
              {language === 'es' ? 'Sin datos' : 'No data'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
