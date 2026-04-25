import { Utensils } from 'lucide-react';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  language: string;
}

export default function Section3Nutrition({ formData, setFormData, language }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Utensils className="w-5 h-5 text-green-500" />
        {language === 'es' ? 'Hábitos Nutricionales' : 'Nutrition Habits'}
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Patrón de alimentación' : 'Eating pattern'}
          </label>
          <select
            value={formData.eating_pattern || 'structured'}
            onChange={(e) => setFormData({ ...formData, eating_pattern: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="structured">{language === 'es' ? 'Estructurado' : 'Structured'}</option>
            <option value="irregular">{language === 'es' ? 'Irregular' : 'Irregular'}</option>
            <option value="depends_on_day">{language === 'es' ? 'Depende del día' : 'Depends on the day'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Estilo dietético' : 'Dietary style'}
          </label>
          <select
            value={formData.dietary_preferences || 'omnivore'}
            onChange={(e) => setFormData({ ...formData, dietary_preferences: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="omnivore">{language === 'es' ? 'Omnívoro' : 'Omnivore'}</option>
            <option value="vegetarian">{language === 'es' ? 'Vegetariano' : 'Vegetarian'}</option>
            <option value="vegan">{language === 'es' ? 'Vegano' : 'Vegan'}</option>
            <option value="pescatarian">{language === 'es' ? 'Pescetariano' : 'Pescatarian'}</option>
            <option value="other">{language === 'es' ? 'Otro' : 'Other'}</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Restricciones dietéticas' : 'Dietary restrictions'}
          </label>
          <input
            type="text"
            value={formData.dietary_restrictions || ''}
            onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
            placeholder={language === 'es' ? 'Ej: Sin gluten, sin lactosa...' : 'e.g., Gluten-free, lactose-free...'}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">{language === 'es' ? 'Comidas típicas' : 'Typical meals'}</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Desayuno' : 'Breakfast'}
          </label>
          <textarea
            value={formData.breakfast_description || ''}
            onChange={(e) => setFormData({ ...formData, breakfast_description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Almuerzo' : 'Lunch'}
          </label>
          <textarea
            value={formData.lunch_description || ''}
            onChange={(e) => setFormData({ ...formData, lunch_description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Cena' : 'Dinner'}
          </label>
          <textarea
            value={formData.dinner_description || ''}
            onChange={(e) => setFormData({ ...formData, dinner_description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Snacks / Colaciones' : 'Snacks'}
          </label>
          <textarea
            value={formData.snacks_description || ''}
            onChange={(e) => setFormData({ ...formData, snacks_description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Bebidas habituales' : 'Usual beverages'}
          </label>
          <textarea
            value={formData.beverages_description || ''}
            onChange={(e) => setFormData({ ...formData, beverages_description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Alimentos que le gustan' : 'Foods you like'}
          </label>
          <textarea
            value={formData.food_likes || ''}
            onChange={(e) => setFormData({ ...formData, food_likes: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Alimentos que no le gustan' : 'Foods you dislike'}
          </label>
          <textarea
            value={formData.food_dislikes || ''}
            onChange={(e) => setFormData({ ...formData, food_dislikes: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Alergias alimentarias' : 'Food allergies'}
          </label>
          <input
            type="text"
            value={formData.food_allergies || ''}
            onChange={(e) => setFormData({ ...formData, food_allergies: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Frecuencia de cocinar' : 'Cooking frequency'}
          </label>
          <select
            value={formData.cooking_frequency || 'often'}
            onChange={(e) => setFormData({ ...formData, cooking_frequency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="daily">{language === 'es' ? 'Diariamente' : 'Daily'}</option>
            <option value="often">{language === 'es' ? 'Frecuentemente' : 'Often'}</option>
            <option value="sometimes">{language === 'es' ? 'A veces' : 'Sometimes'}</option>
            <option value="rarely">{language === 'es' ? 'Raramente' : 'Rarely'}</option>
            <option value="never">{language === 'es' ? 'Nunca' : 'Never'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Frecuencia de comer fuera' : 'Eating out frequency'}
          </label>
          <select
            value={formData.eating_out_frequency || 'sometimes'}
            onChange={(e) => setFormData({ ...formData, eating_out_frequency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="daily">{language === 'es' ? 'Diariamente' : 'Daily'}</option>
            <option value="often">{language === 'es' ? 'Frecuentemente' : 'Often'}</option>
            <option value="sometimes">{language === 'es' ? 'A veces' : 'Sometimes'}</option>
            <option value="rarely">{language === 'es' ? 'Raramente' : 'Rarely'}</option>
            <option value="never">{language === 'es' ? 'Nunca' : 'Never'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Relación con la comida' : 'Relationship with food'}
          </label>
          <select
            value={formData.relationship_with_food || 'healthy'}
            onChange={(e) => setFormData({ ...formData, relationship_with_food: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="healthy">{language === 'es' ? 'Saludable' : 'Healthy'}</option>
            <option value="emotional">{language === 'es' ? 'Emocional' : 'Emotional'}</option>
            <option value="restrictive">{language === 'es' ? 'Restrictiva' : 'Restrictive'}</option>
            <option value="mindful">{language === 'es' ? 'Consciente' : 'Mindful'}</option>
            <option value="other">{language === 'es' ? 'Otra' : 'Other'}</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Notas sobre relación con la comida' : 'Notes about relationship with food'}
          </label>
          <textarea
            value={formData.relationship_food_notes || ''}
            onChange={(e) => setFormData({ ...formData, relationship_food_notes: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Cambios recientes en apetito o hábitos' : 'Recent changes in appetite or habits'}
          </label>
          <textarea
            value={formData.appetite_changes || ''}
            onChange={(e) => setFormData({ ...formData, appetite_changes: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
