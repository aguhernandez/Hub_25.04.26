import { ChevronDown, Plus } from 'lucide-react';

interface Week {
  id: string;
  week_number: number;
  title: string;
}

interface WeekSelectorProps {
  weeks: Week[];
  selectedWeek: number;
  onSelectWeek: (weekNumber: number) => void;
  onAddWeek: () => void;
  canAddWeek: boolean;
}

export default function WeekSelector({
  weeks,
  selectedWeek,
  onSelectWeek,
  onAddWeek,
  canAddWeek
}: WeekSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <select
            value={selectedWeek}
            onChange={(e) => onSelectWeek(Number(e.target.value))}
            className="appearance-none px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white font-medium cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            {weeks.map((week) => (
              <option key={week.id} value={week.week_number}>
                {week.title || `Week ${week.week_number}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400 pointer-events-none" />
        </div>

        {canAddWeek && (
          <button
            onClick={onAddWeek}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Week
          </button>
        )}

        <div className="ml-auto text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
          Week {selectedWeek} of {weeks.length}
        </div>
      </div>
    </div>
  );
}
