import { Heart } from 'lucide-react';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  language: string;
}

export default function Section1BasicHealth({ formData, setFormData, language }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Heart className="w-5 h-5 text-red-500" />
        {language === 'es' ? 'Información Básica y Salud' : 'Basic & Health Info'}
      </h3>

      {/* Basic Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Edad' : 'Age'}
          </label>
          <input
            type="number"
            value={formData.age || ''}
            onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Sexo' : 'Gender'}
          </label>
          <select
            value={formData.sex || 'male'}
            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="male">{language === 'es' ? 'Masculino' : 'Male'}</option>
            <option value="female">{language === 'es' ? 'Femenino' : 'Female'}</option>
            <option value="other">{language === 'es' ? 'Otro' : 'Other'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Altura (cm)' : 'Height (cm)'}
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.height_cm || ''}
            onChange={(e) => setFormData({ ...formData, height_cm: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Peso (kg)' : 'Weight (kg)'}
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.weight_kg || ''}
            onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Ocupación' : 'Occupation'}
          </label>
          <input
            type="text"
            value={formData.occupation || ''}
            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Nivel de Actividad Laboral' : 'Work Activity Level'}
          </label>
          <select
            value={formData.activity_level || 'active'}
            onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="desk_job">{language === 'es' ? 'Trabajo de Escritorio' : 'Desk Job'}</option>
            <option value="active">{language === 'es' ? 'Activo' : 'Active'}</option>
            <option value="manual_labor">{language === 'es' ? 'Trabajo Manual' : 'Manual Labor'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Horas de Trabajo por Día' : 'Work Hours per Day'}
          </label>
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={formData.work_hours || ''}
            onChange={(e) => setFormData({ ...formData, work_hours: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            placeholder={language === 'es' ? 'Ej: 8' : 'e.g., 8'}
          />
        </div>
      </div>

      {/* Health */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white dark:text-white">{language === 'es' ? 'Salud' : 'Health'}</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Condiciones médicas actuales' : 'Current medical conditions'}
          </label>
          <textarea
            value={formData.medical_conditions || ''}
            onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Medicamentos y suplementos' : 'Medications and supplements'}
          </label>
          <textarea
            value={formData.medications_supplements || ''}
            onChange={(e) => setFormData({ ...formData, medications_supplements: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? 'Alergias e intolerancias' : 'Allergies and intolerances'}
          </label>
          <textarea
            value={formData.allergies_intolerances || ''}
            onChange={(e) => setFormData({ ...formData, allergies_intolerances: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Lifestyle */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white dark:text-white">{language === 'es' ? 'Estilo de Vida' : 'Lifestyle'}</h4>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Horas de sueño por noche' : 'Sleep hours per night'}
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.sleep_hours || ''}
              onChange={(e) => setFormData({ ...formData, sleep_hours: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Calidad del sueño' : 'Sleep quality'}
            </label>
            <select
              value={formData.sleep_quality || 'good'}
              onChange={(e) => setFormData({ ...formData, sleep_quality: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="excellent">{language === 'es' ? 'Excelente' : 'Excellent'}</option>
              <option value="good">{language === 'es' ? 'Buena' : 'Good'}</option>
              <option value="fair">{language === 'es' ? 'Regular' : 'Fair'}</option>
              <option value="poor">{language === 'es' ? 'Pobre' : 'Poor'}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Niveles de energía' : 'Energy levels'}
            </label>
            <select
              value={formData.energy_levels || 'stable'}
              onChange={(e) => setFormData({ ...formData, energy_levels: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="stable">{language === 'es' ? 'Estables' : 'Stable'}</option>
              <option value="fluctuating">{language === 'es' ? 'Fluctuantes' : 'Fluctuating'}</option>
              <option value="low">{language === 'es' ? 'Bajos' : 'Low'}</option>
            </select>
          </div>

          {formData.energy_levels === 'low' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? '¿Cuánto tiempo con baja energía?' : 'How long with low energy?'}
                </label>
                <input
                  type="text"
                  value={formData.low_energy_duration || ''}
                  onChange={(e) => setFormData({ ...formData, low_energy_duration: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? '¿A qué horas del día?' : 'What times of day?'}
                </label>
                <input
                  type="text"
                  value={formData.low_energy_times || ''}
                  onChange={(e) => setFormData({ ...formData, low_energy_times: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Nivel de estrés (1-5)' : 'Stress level (1-5)'}
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.stress_level || 3}
              onChange={(e) => setFormData({ ...formData, stress_level: parseInt(e.target.value) || 3 })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {language === 'es' ? '¿Cómo manejas el estrés?' : 'How do you manage stress?'}
          </label>
          <textarea
            value={formData.stress_management || ''}
            onChange={(e) => setFormData({ ...formData, stress_management: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Frecuencia de alcohol' : 'Alcohol frequency'}
            </label>
            <input
              type="text"
              value={formData.alcohol_frequency || ''}
              onChange={(e) => setFormData({ ...formData, alcohol_frequency: e.target.value })}
              placeholder={language === 'es' ? 'Ej: 1-2 veces/semana' : 'e.g., 1-2 times/week'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'es' ? 'Fumador' : 'Smoking'}
            </label>
            <input
              type="text"
              value={formData.smoking_frequency || ''}
              onChange={(e) => setFormData({ ...formData, smoking_frequency: e.target.value })}
              placeholder={language === 'es' ? 'Ej: No' : 'e.g., No'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
