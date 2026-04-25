import { Target, Calculator, TrendingUp, CreditCard as Edit, Lightbulb } from 'lucide-react';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  language: string;
  calculation: any;
  customMacros: any;
  isEditingMacros: boolean;
  showCalculator: boolean;
  onCalculate: () => void;
  onMacroChange: (macro: 'protein' | 'carbs' | 'fat', value: number) => void;
  onResetToSuggested: () => void;
  setIsEditingMacros: (value: boolean) => void;
}

export default function Section4Goals({
  formData,
  setFormData,
  language,
  calculation,
  customMacros,
  isEditingMacros,
  showCalculator,
  onCalculate,
  onMacroChange,
  onResetToSuggested,
  setIsEditingMacros
}: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Target className="w-5 h-5 text-purple-500" />
        {language === 'es' ? 'Objetivos y Expectativas' : 'Goals & Expectations'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Objetivo principal' : 'Main goal'}
          </label>
          <select
            value={formData.main_goal || 'performance'}
            onChange={(e) => setFormData({ ...formData, main_goal: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="performance">{language === 'es' ? 'Rendimiento' : 'Performance'}</option>
            <option value="muscle_gain">{language === 'es' ? 'Ganancia Muscular' : 'Muscle Gain'}</option>
            <option value="fat_loss">{language === 'es' ? 'Pérdida de Grasa' : 'Fat Loss'}</option>
            <option value="recovery">{language === 'es' ? 'Recuperación' : 'Recovery'}</option>
            <option value="maintenance">{language === 'es' ? 'Mantenimiento' : 'Maintenance'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Objetivos nutricionales específicos' : 'Specific nutrition goals'}
          </label>
          <textarea
            value={formData.nutrition_goals || ''}
            onChange={(e) => setFormData({ ...formData, nutrition_goals: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Expectativas de rendimiento' : 'Performance expectations'}
          </label>
          <textarea
            value={formData.performance_expectations || ''}
            onChange={(e) => setFormData({ ...formData, performance_expectations: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Eventos o competencias próximas' : 'Upcoming events or competitions'}
          </label>
          <textarea
            value={formData.upcoming_events || ''}
            onChange={(e) => setFormData({ ...formData, upcoming_events: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Notas adicionales' : 'Additional notes'}
          </label>
          <textarea
            value={formData.additional_notes || ''}
            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Calculate Requirements Button */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          {language === 'es' ? 'Calcular Requerimientos' : 'Calculate Requirements'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">
          {language === 'es'
            ? 'Calcula los requerimientos calóricos y de macronutrientes basados en la información proporcionada'
            : 'Calculate caloric and macronutrient requirements based on the provided information'}
        </p>
        <button
          onClick={onCalculate}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          {language === 'es' ? 'Calcular Requerimientos' : 'Calculate Requirements'}
        </button>
      </div>

      {/* Calculator Results */}
      {showCalculator && calculation && customMacros && formData.weight_kg && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              {language === 'es' ? 'Objetivos Nutricionales' : 'Nutritional Targets'}
            </h3>
            <button
              onClick={() => setIsEditingMacros(!isEditingMacros)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {isEditingMacros
                ? (language === 'es' ? 'Ver Resumen' : 'View Summary')
                : (language === 'es' ? 'Ajustar Macros' : 'Adjust Macros')}
            </button>
          </div>

          {isEditingMacros && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
                    {language === 'es' ? 'Sugerencia del Sistema' : 'System Suggestion'}
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    {language === 'es' ? 'Basado en el objetivo: ' : 'Based on the goal: '}
                    <strong>
                      {calculation.protein_g.toFixed(0)}g proteína, {calculation.carbs_g.toFixed(0)}g carbohidratos, {calculation.fat_g.toFixed(0)}g grasas
                    </strong>
                  </p>
                  <button
                    onClick={onResetToSuggested}
                    className="mt-2 text-sm text-yellow-800 dark:text-yellow-400 underline hover:no-underline"
                  >
                    {language === 'es' ? 'Restaurar valores sugeridos' : 'Reset to suggested values'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                {language === 'es' ? 'Metabolismo Basal (BMR)' : 'Basal Metabolic Rate (BMR)'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {calculation.bmr.toFixed(0)} <span className="text-lg">kcal/día</span>
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                {language === 'es' ? 'Calorías Totales' : 'Total Calories'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {customMacros.tdee.toFixed(0)} <span className="text-lg">kcal/día</span>
              </p>
            </div>
          </div>

          {/* Calories Slider (only in editing mode) */}
          {isEditingMacros && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-blue-500 mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'es' ? 'Calorías Totales (kcal/día)' : 'Total Calories (kcal/day)'}
                </label>
                <input
                  type="number"
                  value={Math.round(customMacros.tdee)}
                  onChange={(e) => {
                    const newCalories = parseFloat(e.target.value) || 0;
                    const ratio = newCalories / customMacros.tdee;
                    onMacroChange('protein', customMacros.protein_g * ratio);
                    onMacroChange('carbs', customMacros.carbs_g * ratio);
                    onMacroChange('fat', customMacros.fat_g * ratio);
                  }}
                  className="w-24 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <input
                type="range"
                min={Math.round(calculation.bmr * 0.8)}
                max={Math.round(calculation.bmr * 2.5)}
                step="50"
                value={customMacros.tdee}
                onChange={(e) => {
                  const newCalories = parseFloat(e.target.value);
                  const ratio = newCalories / customMacros.tdee;
                  onMacroChange('protein', customMacros.protein_g * ratio);
                  onMacroChange('carbs', customMacros.carbs_g * ratio);
                  onMacroChange('fat', customMacros.fat_g * ratio);
                }}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {language === 'es' ? 'Ajusta las calorías totales manteniendo las proporciones de macros' : 'Adjust total calories maintaining macro proportions'}
              </p>
            </div>
          )}

          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            {language === 'es' ? 'Objetivos de Macronutrientes' : 'Macronutrient Targets'}
          </h4>

          {!isEditingMacros ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-red-500">
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Proteína' : 'Protein'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {customMacros.protein_g.toFixed(0)}g
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(customMacros.protein_g / formData.weight_kg).toFixed(1)} g/kg · {customMacros.protein_percent.toFixed(0)}%
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Carbohidratos' : 'Carbohydrates'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {customMacros.carbs_g.toFixed(0)}g
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(customMacros.carbs_g / formData.weight_kg).toFixed(1)} g/kg · {customMacros.carbs_percent.toFixed(0)}%
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Grasas' : 'Fats'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {customMacros.fat_g.toFixed(0)}g
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(customMacros.fat_g / formData.weight_kg).toFixed(1)} g/kg · {customMacros.fat_percent.toFixed(0)}%
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Protein Slider */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-red-500">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Proteína (g)' : 'Protein (g)'}
                  </label>
                  <input
                    type="number"
                    value={Math.round(customMacros.protein_g)}
                    onChange={(e) => onMacroChange('protein', parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={formData.weight_kg * 4}
                  step="5"
                  value={customMacros.protein_g}
                  onChange={(e) => onMacroChange('protein', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(customMacros.protein_g / formData.weight_kg).toFixed(1)} g/kg · {customMacros.protein_percent.toFixed(0)}% · {(customMacros.protein_g * 4).toFixed(0)} kcal
                </p>
              </div>

              {/* Carbs Slider */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Carbohidratos (g)' : 'Carbohydrates (g)'}
                  </label>
                  <input
                    type="number"
                    value={Math.round(customMacros.carbs_g)}
                    onChange={(e) => onMacroChange('carbs', parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={formData.weight_kg * 10}
                  step="10"
                  value={customMacros.carbs_g}
                  onChange={(e) => onMacroChange('carbs', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(customMacros.carbs_g / formData.weight_kg).toFixed(1)} g/kg · {customMacros.carbs_percent.toFixed(0)}% · {(customMacros.carbs_g * 4).toFixed(0)} kcal
                </p>
              </div>

              {/* Fat Slider */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Grasas (g)' : 'Fats (g)'}
                  </label>
                  <input
                    type="number"
                    value={Math.round(customMacros.fat_g)}
                    onChange={(e) => onMacroChange('fat', parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={formData.weight_kg * 2.5}
                  step="5"
                  value={customMacros.fat_g}
                  onChange={(e) => onMacroChange('fat', parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(customMacros.fat_g / formData.weight_kg).toFixed(1)} g/kg · {customMacros.fat_percent.toFixed(0)}% · {(customMacros.fat_g * 9).toFixed(0)} kcal
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
