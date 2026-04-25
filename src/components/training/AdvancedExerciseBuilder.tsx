import { useState } from 'react';
import { Plus, Trash2, Copy, TrendingUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import OneRMLoadSelector from './OneRMLoadSelector';

interface SetLine {
  sets: number;
  reps: string;
  primary_value?: string;
  secondary_value?: string;
  rest_seconds: number;
  rir?: number;
  rpe?: number;
}

interface AdvancedExerciseProps {
  exercise: {
    exercise_id: string;
    exercise_name: string;
    set_lines: SetLine[];
    primary_metric: string;
    secondary_metric?: string;
    notes: string;
    superset_group: number | null;
    section_title?: string;
    use_1rm_auto_load?: boolean;
    target_1rm_percentage?: number;
    reference_1rm_method?: string;
    calculated_load?: number;
    freeze_1rm_reference?: boolean;
    frozen_1rm_value?: number;
    frozen_1rm_unit?: string;
  };
  onUpdate: (exercise: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  athleteId?: string;
  exerciseHistory?: {
    maxWeight: number;
    maxDate: string;
  };
}

export default function AdvancedExerciseBuilder({
  exercise,
  onUpdate,
  onDelete,
  onDuplicate,
  athleteId,
  exerciseHistory,
}: AdvancedExerciseProps) {
  const { language } = useLanguage();

  const metricOptions = [
    { value: 'reps', label: language === 'es' ? 'Repeticiones' : 'Reps' },
    { value: 'kg', label: 'Kg' },
    { value: 'lb', label: 'Lb' },
    { value: 'percent', label: '%' },
    { value: 'time', label: language === 'es' ? 'Tiempo (seg)' : 'Time (sec)' },
    { value: 'distance', label: language === 'es' ? 'Distancia (m)' : 'Distance (m)' },
    { value: 'calories', label: language === 'es' ? 'Calorías' : 'Calories' },
  ];

  const addSetLine = () => {
    const defaultPrimaryValue = exercise.primary_metric === 'reps' ? '10' : '70';
    const newSetLines = [...exercise.set_lines, {
      sets: 1,
      reps: defaultPrimaryValue,
      primary_value: defaultPrimaryValue,
      secondary_value: '',
      rest_seconds: 60
    }];
    onUpdate({ ...exercise, set_lines: newSetLines });
  };

  const updateSetLine = (index: number, field: string, value: any) => {
    const newSetLines = [...exercise.set_lines];
    newSetLines[index] = { ...newSetLines[index], [field]: value };
    onUpdate({ ...exercise, set_lines: newSetLines });
  };

  const updateSetLineMultiple = (index: number, updates: Partial<SetLine>) => {
    const newSetLines = [...exercise.set_lines];
    newSetLines[index] = { ...newSetLines[index], ...updates };
    onUpdate({ ...exercise, set_lines: newSetLines });
  };

  const deleteSetLine = (index: number) => {
    const newSetLines = exercise.set_lines.filter((_, i) => i !== index);
    onUpdate({ ...exercise, set_lines: newSetLines });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{exercise.exercise_name}</h3>
            {exerciseHistory ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-900 dark:text-green-300">
                  {language === 'es' ? 'Max:' : 'Max:'} {exerciseHistory.maxWeight} kg
                </span>
                <span className="text-xs text-green-700 dark:text-green-400">
                  ({exerciseHistory.maxDate})
                </span>
              </div>
            ) : (
              <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Sin historial' : 'No Data Logged'}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <select
              value={exercise.primary_metric}
              onChange={(e) => onUpdate({ ...exercise, primary_metric: e.target.value })}
              className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {metricOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={exercise.secondary_metric || ''}
              onChange={(e) => onUpdate({ ...exercise, secondary_metric: e.target.value || null })}
              className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{language === 'es' ? 'Sin métrica 2ª' : 'No 2nd metric'}</option>
              {metricOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDuplicate}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title={language === 'es' ? 'Duplicar ejercicio' : 'Duplicate exercise'}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title={language === 'es' ? 'Eliminar ejercicio' : 'Delete exercise'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Set Lines */}
      <div className="space-y-3 mb-3">
        {/* Desktop headers - hidden on mobile */}
        <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
          <div className="col-span-1">{language === 'es' ? 'Series' : 'Sets'}</div>
          <div className="col-span-2">
            {metricOptions.find(m => m.value === exercise.primary_metric)?.label || (language === 'es' ? 'Métrica 1' : 'Metric 1')}
          </div>
          <div className="col-span-2">
            {exercise.secondary_metric
              ? metricOptions.find(m => m.value === exercise.secondary_metric)?.label
              : (language === 'es' ? 'Métrica 2' : 'Metric 2')}
          </div>
          <div className="col-span-1">{language === 'es' ? 'Desc' : 'Rest'}</div>
          <div className="col-span-1">RIR</div>
          <div className="col-span-1">RPE</div>
          <div className="col-span-3">{language === 'es' ? 'Vista' : 'Preview'}</div>
          <div className="col-span-1"></div>
        </div>

        {exercise.set_lines.map((line, index) => (
          <div key={index} className="space-y-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/30">
            {/* Mobile layout - visible on small screens */}
            <div className="md:hidden space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {language === 'es' ? 'Series' : 'Sets'}
                  </label>
                  <input
                    type="number"
                    value={line.sets}
                    onChange={(e) => updateSetLine(index, 'sets', parseInt(e.target.value) || 1)}
                    min="1"
                    className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {metricOptions.find(m => m.value === exercise.primary_metric)?.label}
                  </label>
                  <input
                    type="text"
                    value={line.primary_value || ''}
                    onChange={(e) => {
                      updateSetLineMultiple(index, {
                        primary_value: e.target.value,
                        reps: e.target.value
                      });
                    }}
                    placeholder={exercise.primary_metric === 'reps' ? '10' : '70'}
                    className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                {exercise.secondary_metric && (
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {metricOptions.find(m => m.value === exercise.secondary_metric)?.label}
                    </label>
                    <input
                      type="text"
                      value={line.secondary_value || ''}
                      onChange={(e) => updateSetLine(index, 'secondary_value', e.target.value)}
                      placeholder={exercise.secondary_metric === 'reps' ? '10' : '70'}
                      className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {language === 'es' ? 'Descanso (s)' : 'Rest (s)'}
                  </label>
                  <input
                    type="number"
                    value={line.rest_seconds}
                    onChange={(e) => updateSetLine(index, 'rest_seconds', parseInt(e.target.value) || 60)}
                    min="0"
                    step="15"
                    placeholder="60"
                    className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    RIR
                  </label>
                  <input
                    type="number"
                    value={line.rir ?? ''}
                    onChange={(e) => updateSetLine(index, 'rir', e.target.value ? parseInt(e.target.value) : null)}
                    min="0"
                    max="5"
                    placeholder="-"
                    title={language === 'es' ? 'Reps en Reserva (0-5)' : 'Reps In Reserve (0-5)'}
                    className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    RPE
                  </label>
                  <input
                    type="number"
                    value={line.rpe ?? ''}
                    onChange={(e) => updateSetLine(index, 'rpe', e.target.value ? parseFloat(e.target.value) : null)}
                    min="1"
                    max="10"
                    step="0.5"
                    placeholder="-"
                    title={language === 'es' ? 'Esfuerzo Percibido (1-10)' : 'Rate of Perceived Exertion (1-10)'}
                    className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center"
                  />
                </div>
              </div>

              {/* Summary line for mobile */}
              <div className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-2">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {line.sets}x{line.primary_value || (exercise.primary_metric === 'reps' ? '10' : '70')}
                  {exercise.primary_metric && (
                    <span className="ml-1 text-gray-600 dark:text-gray-400">
                      {metricOptions.find(m => m.value === exercise.primary_metric)?.label}
                    </span>
                  )}
                  {line.secondary_value && exercise.secondary_metric && (
                    <>
                      <span className="mx-1">@</span>
                      {line.secondary_value}
                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                        {metricOptions.find(m => m.value === exercise.secondary_metric)?.label}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  {line.rest_seconds}s
                  {line.rir !== null && line.rir !== undefined && ` • RIR ${line.rir}`}
                  {line.rpe !== null && line.rpe !== undefined && ` • RPE ${line.rpe}`}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => deleteSetLine(index)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop layout - hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-2 items-center">
              <input
                type="number"
                value={line.sets}
                onChange={(e) => updateSetLine(index, 'sets', parseInt(e.target.value) || 1)}
                min="1"
                className="col-span-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                value={line.primary_value || ''}
                onChange={(e) => {
                  updateSetLineMultiple(index, {
                    primary_value: e.target.value,
                    reps: e.target.value
                  });
                }}
                placeholder={exercise.primary_metric === 'reps' ? '10' : '70'}
                className="col-span-2 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                value={line.secondary_value || ''}
                onChange={(e) => updateSetLine(index, 'secondary_value', e.target.value)}
                placeholder={exercise.secondary_metric ? (exercise.secondary_metric === 'reps' ? '10' : '70') : '-'}
                disabled={!exercise.secondary_metric}
                className="col-span-2 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800"
              />
              <input
                type="number"
                value={line.rest_seconds}
                onChange={(e) => updateSetLine(index, 'rest_seconds', parseInt(e.target.value) || 60)}
                min="0"
                step="15"
                placeholder="60"
                className="col-span-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                value={line.rir ?? ''}
                onChange={(e) => updateSetLine(index, 'rir', e.target.value ? parseInt(e.target.value) : null)}
                min="0"
                max="5"
                placeholder="-"
                title={language === 'es' ? 'Reps en Reserva (0-5)' : 'Reps In Reserve (0-5)'}
                className="col-span-1 px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center"
              />
              <input
                type="number"
                value={line.rpe ?? ''}
                onChange={(e) => updateSetLine(index, 'rpe', e.target.value ? parseFloat(e.target.value) : null)}
                min="1"
                max="10"
                step="0.5"
                placeholder="-"
                title={language === 'es' ? 'Esfuerzo Percibido (1-10)' : 'Rate of Perceived Exertion (1-10)'}
                className="col-span-1 px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center"
              />
              <div className="col-span-3 flex flex-col text-xs text-gray-700 dark:text-gray-300">
                <span className="font-semibold">
                  {line.sets}x{line.primary_value || (exercise.primary_metric === 'reps' ? '10' : '70')}
                  {exercise.primary_metric && (
                    <span className="ml-1 text-gray-500 dark:text-gray-400">
                      {metricOptions.find(m => m.value === exercise.primary_metric)?.label}
                    </span>
                  )}
                  {line.secondary_value && exercise.secondary_metric && (
                    <>
                      <span className="mx-1">@</span>
                      {line.secondary_value}
                      <span className="ml-1 text-gray-500 dark:text-gray-400">
                        {metricOptions.find(m => m.value === exercise.secondary_metric)?.label}
                      </span>
                    </>
                  )}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {line.rest_seconds}s
                  {line.rir !== null && line.rir !== undefined && ` • RIR ${line.rir}`}
                  {line.rpe !== null && line.rpe !== undefined && ` • RPE ${line.rpe}`}
                </span>
              </div>
              <button
                onClick={() => deleteSetLine(index)}
                className="col-span-1 text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addSetLine}
        className="flex items-center gap-1 text-sm px-3 py-1 bg-[#fdda36] text-[#514163] rounded font-semibold hover:bg-[#ffd51a] transition-colors"
      >
        <Plus className="w-3 h-3" />
        {language === 'es' ? 'Agregar Línea de Series' : 'Add Set Line'}
      </button>

      {/* Notes */}
      <div className="mt-4">
        <textarea
          value={exercise.notes}
          onChange={(e) => onUpdate({ ...exercise, notes: e.target.value })}
          placeholder={language === 'es' ? 'Notas del ejercicio...' : 'Exercise notes...'}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* 1RM Auto Load Configuration */}
      {(exercise.primary_metric === 'kg' || exercise.primary_metric === 'lb') && (
        <OneRMLoadSelector
          exerciseId={exercise.exercise_id}
          exerciseName={exercise.exercise_name}
          athleteId={athleteId}
          currentLoad={exercise.calculated_load}
          currentPercentage={exercise.target_1rm_percentage}
          use1RMAutoLoad={exercise.use_1rm_auto_load}
          referenceMethod={exercise.reference_1rm_method as any}
          isFrozen={exercise.freeze_1rm_reference}
          frozenValue={exercise.frozen_1rm_value}
          frozenUnit={exercise.frozen_1rm_unit}
          onUpdate={(config) => onUpdate({ ...exercise, ...config })}
        />
      )}
    </div>
  );
}
