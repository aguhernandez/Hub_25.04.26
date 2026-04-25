import { Activity } from 'lucide-react';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  language: string;
}

export default function Section2Training({ formData, setFormData, language }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-500" />
        {language === 'es' ? 'Entrenamiento y Actividad' : 'Training & Activity'}
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Deporte principal' : 'Main sport'}
          </label>
          <input
            type="text"
            value={formData.sport || ''}
            onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Frecuencia de entrenamiento' : 'Training frequency'}
          </label>
          <select
            value={formData.training_frequency || '4-5x'}
            onChange={(e) => setFormData({ ...formData, training_frequency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="2-3x">2-3x {language === 'es' ? 'por semana' : 'per week'}</option>
            <option value="4-5x">4-5x {language === 'es' ? 'por semana' : 'per week'}</option>
            <option value="6+">6+ {language === 'es' ? 'por semana' : 'per week'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Horas semanales de entrenamiento' : 'Weekly training hours'}
          </label>
          <input
            type="number"
            step="0.5"
            value={formData.training_hours_weekly || ''}
            onChange={(e) => setFormData({ ...formData, training_hours_weekly: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? '¿Cuándo entrena?' : 'When do you train?'}
          </label>
          <select
            value={formData.training_time || 'afternoon'}
            onChange={(e) => setFormData({ ...formData, training_time: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="morning">{language === 'es' ? 'Mañana' : 'Morning'}</option>
            <option value="afternoon">{language === 'es' ? 'Tarde' : 'Afternoon'}</option>
            <option value="evening">{language === 'es' ? 'Noche' : 'Evening'}</option>
            <option value="mixed">{language === 'es' ? 'Mixto' : 'Mixed'}</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Nutrición pre-entrenamiento' : 'Pre-workout nutrition'}
          </label>
          <textarea
            value={formData.pre_workout_nutrition || ''}
            onChange={(e) => setFormData({ ...formData, pre_workout_nutrition: e.target.value })}
            rows={2}
            placeholder={language === 'es' ? 'Describe qué come/bebe antes de entrenar' : 'Describe what you eat/drink before training'}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Nutrición durante entrenamiento' : 'During-workout nutrition'}
          </label>
          <textarea
            value={formData.during_workout_nutrition || ''}
            onChange={(e) => setFormData({ ...formData, during_workout_nutrition: e.target.value })}
            rows={2}
            placeholder={language === 'es' ? 'Describe qué come/bebe durante el entrenamiento' : 'Describe what you eat/drink during training'}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Nutrición post-entrenamiento' : 'Post-workout nutrition'}
          </label>
          <textarea
            value={formData.post_workout_nutrition || ''}
            onChange={(e) => setFormData({ ...formData, post_workout_nutrition: e.target.value })}
            rows={2}
            placeholder={language === 'es' ? 'Describe qué come/bebe después de entrenar' : 'Describe what you eat/drink after training'}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
