import { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface WorkoutDay {
  date: string;
  count: number;
  workouts: string[];
}

interface WorkoutFrequencyHeatmapProps {
  athleteId: string;
  workoutData: Array<{
    date: string;
    workout_name?: string;
  }>;
}

interface TooltipData {
  date: string;
  count: number;
  workouts: string[];
  x: number;
  y: number;
}

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function WorkoutFrequencyHeatmap({ workoutData }: WorkoutFrequencyHeatmapProps) {
  const { language } = useLanguage();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { heatmapData, weekTotals } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 84);

    const dayMap = new Map<string, WorkoutDay>();

    for (let i = 0; i < 84; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = formatDateLocal(date);
      dayMap.set(dateStr, { date: dateStr, count: 0, workouts: [] });
    }

    workoutData.forEach(workout => {
      const dateStr = workout.date.split('T')[0];
      const day = dayMap.get(dateStr);
      if (day) {
        day.count++;
        if (workout.workout_name) {
          day.workouts.push(workout.workout_name);
        }
      }
    });

    const weeks: WorkoutDay[][] = [];
    const totals: number[] = [];

    for (let week = 0; week < 12; week++) {
      const weekDays: WorkoutDay[] = [];
      let weekTotal = 0;

      for (let day = 0; day < 7; day++) {
        const index = week * 7 + day;
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        const dateStr = formatDateLocal(date);
        const dayData = dayMap.get(dateStr) || { date: dateStr, count: 0, workouts: [] };
        weekDays.push(dayData);
        weekTotal += dayData.count;
      }

      weeks.push(weekDays);
      totals.push(weekTotal);
    }

    return { heatmapData: weeks, weekTotals: totals };
  }, [workoutData]);

  const getColorClass = (count: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:border-gray-700';
    if (count === 1) return 'bg-green-200 dark:bg-green-900 border-green-300 dark:border-green-700';
    if (count === 2) return 'bg-yellow-300 dark:bg-yellow-700 border-yellow-400 dark:border-yellow-600';
    return 'bg-red-400 dark:bg-red-700 border-red-500 dark:border-red-600';
  };

  const dayLabels = language === 'es'
    ? ['L', 'M', 'X', 'J', 'V', 'S', 'D']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
          {language === 'es' ? 'Frecuencia de Entrenamiento (Últimas 12 Semanas)' : 'Training Frequency (Last 12 Weeks)'}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700"></div>
            <span>0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900 border border-green-300 dark:border-green-700"></div>
            <span>1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-300 dark:bg-yellow-700 border border-yellow-400 dark:border-yellow-600"></div>
            <span>2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400 dark:bg-red-700 border border-red-500 dark:border-red-600"></div>
            <span>3+</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-2">
            <div className="h-5"></div>
            {dayLabels.map((label, i) => (
              <div key={i} className="h-6 flex items-center justify-end pr-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {heatmapData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {/* Week total */}
              <div className="h-5 flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  {weekTotals[weekIndex]}
                </span>
              </div>

              {/* Days */}
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-6 h-6 rounded border ${getColorClass(day.count)} transition-all hover:scale-110 cursor-pointer`}
                  onMouseEnter={(e) => {
                    if (day.count > 0) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        date: day.date,
                        count: day.count,
                        workouts: day.workouts,
                        x: rect.left + rect.width / 2,
                        y: rect.top
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Fixed tooltip portal */}
      {tooltip && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, calc(-100% - 8px))',
            zIndex: 9999
          }}
        >
          <div className="bg-gray-900 dark:bg-gray-100 dark:bg-gray-800 text-white dark:text-gray-900 dark:text-white text-xs rounded-lg px-3 py-2 shadow-2xl border-2 border-white dark:border-gray-900">
            <div className="font-semibold mb-1 whitespace-nowrap">
              {new Date(tooltip.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <div className="whitespace-nowrap">
              {tooltip.count} {language === 'es' ? 'entrenamientos' : 'workouts'}
            </div>
            {tooltip.workouts.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700 dark:border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600 dark:text-gray-400 max-w-[250px]">
                {tooltip.workouts.map((workout, idx) => (
                  <div key={idx} className="truncate">• {workout}</div>
                ))}
              </div>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
          </div>
        </div>
      )}
    </div>
  );
}
