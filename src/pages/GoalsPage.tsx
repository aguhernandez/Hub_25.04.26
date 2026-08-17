import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  Target,
  TrendingUp,
  Trophy,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function GoalsPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [physicalObjectives, setPhysicalObjectives] = useState('');
  const [competitionGoals, setCompetitionGoals] = useState('');
  const [shortTermGoals, setShortTermGoals] = useState('');
  const [longTermGoals, setLongTermGoals] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setPhysicalObjectives(profile.physical_objectives || '');
      setCompetitionGoals(profile.competition_goals || '');
      setShortTermGoals(profile.short_term_goals || '');
      setLongTermGoals(profile.long_term_goals || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          physical_objectives: physicalObjectives || null,
          competition_goals: competitionGoals || null,
          short_term_goals: shortTermGoals || null,
          long_term_goals: longTermGoals || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setSuccessMessage(language === 'es' ? '✅ Objetivos guardados exitosamente' : '✅ Goals saved successfully');

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error saving goals:', error);
      alert(language === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const hasGoals = physicalObjectives || competitionGoals || shortTermGoals || longTermGoals;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-8000 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-xl">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Metas y Objetivos' : 'Goals & Objectives'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {language === 'es'
                  ? 'Define tus metas para mantenerte enfocado y motivado'
                  : 'Define your goals to stay focused and motivated'}
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-200 font-medium">{successMessage}</p>
          </div>
        )}

        {/* SMART Goals Framework */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-8000 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800 p-6 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-xl flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {language === 'es' ? 'Marco de Objetivos SMART' : 'SMART Goals Framework'}
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                {language === 'es'
                  ? 'Establece objetivos efectivos usando la metodología SMART para maximizar tus resultados'
                  : 'Set effective goals using the SMART methodology to maximize your results'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">S</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                {language === 'es' ? 'Específico' : 'Specific'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Define exactamente qué quieres lograr'
                  : 'Define exactly what you want to achieve'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">M</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                {language === 'es' ? 'Medible' : 'Measurable'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Establece métricas para medir tu progreso'
                  : 'Set metrics to track your progress'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">A</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                {language === 'es' ? 'Alcanzable' : 'Achievable'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Asegúrate de que es realista y posible'
                  : 'Ensure it is realistic and possible'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">R</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                {language === 'es' ? 'Relevante' : 'Relevant'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Alineado con tus objetivos mayores'
                  : 'Aligned with your bigger objectives'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">T</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                {language === 'es' ? 'Temporal' : 'Time-bound'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Define una fecha límite clara'
                  : 'Set a clear deadline'}
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {language === 'es' ? '✨ Ejemplo de objetivo SMART:' : '✨ SMART goal example:'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              {language === 'es'
                ? '"Aumentar mi salto vertical de 60cm a 70cm en los próximos 4 meses mediante entrenamiento pliométrico 3 veces por semana"'
                : '"Increase my vertical jump from 60cm to 70cm in the next 4 months through plyometric training 3 times per week"'}
            </p>
          </div>
        </div>

        {/* Empty State */}
        {!hasGoals && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
                  {language === 'es' ? '¡Comienza definiendo tus metas!' : 'Start by defining your goals!'}
                </h3>
                <p className="text-blue-800 dark:text-blue-200">
                  {language === 'es'
                    ? 'Establecer metas claras te ayuda a mantenerte enfocado, medir tu progreso y celebrar tus logros.'
                    : 'Setting clear goals helps you stay focused, measure your progress, and celebrate your achievements.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Physical Objectives */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Objetivos Físicos' : 'Physical Objectives'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Metas de rendimiento físico específicas'
                  : 'Specific physical performance goals'}
              </p>
            </div>
          </div>

          <textarea
            value={physicalObjectives}
            onChange={(e) => setPhysicalObjectives(e.target.value)}
            rows={4}
            placeholder={
              language === 'es'
                ? 'Ej: Aumentar mi salto vertical en 10cm, mejorar mi resistencia cardiovascular, alcanzar el 15% de grasa corporal...'
                : 'E.g., Increase vertical jump by 10cm, improve cardiovascular endurance, reach 15% body fat...'
            }
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Competition Goals */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Metas de Competición' : 'Competition Goals'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Logros y competiciones que quieres alcanzar'
                  : 'Achievements and competitions you want to reach'}
              </p>
            </div>
          </div>

          <textarea
            value={competitionGoals}
            onChange={(e) => setCompetitionGoals(e.target.value)}
            rows={4}
            placeholder={
              language === 'es'
                ? 'Ej: Clasificar para el campeonato nacional, ganar el torneo regional, mejorar mi ranking a top 10...'
                : 'E.g., Qualify for nationals, win regional championship, improve ranking to top 10...'
            }
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Short-term Goals */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Metas a Corto Plazo (3-6 meses)' : 'Short-term Goals (3-6 months)'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Objetivos para los próximos meses'
                  : 'Objectives for the next few months'}
              </p>
            </div>
          </div>

          <textarea
            value={shortTermGoals}
            onChange={(e) => setShortTermGoals(e.target.value)}
            rows={4}
            placeholder={
              language === 'es'
                ? 'Ej: Completar mi primer maratón, dominar la técnica de saque, entrenar 5 días por semana consistentemente...'
                : 'E.g., Complete my first marathon, master serve technique, train 5 days per week consistently...'
            }
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Long-term Goals */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Metas a Largo Plazo (1+ años)' : 'Long-term Goals (1+ years)'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Tu visión a largo plazo'
                  : 'Your long-term vision'}
              </p>
            </div>
          </div>

          <textarea
            value={longTermGoals}
            onChange={(e) => setLongTermGoals(e.target.value)}
            rows={4}
            placeholder={
              language === 'es'
                ? 'Ej: Competir a nivel internacional, conseguir beca deportiva, convertirme en profesional...'
                : 'E.g., Compete internationally, earn sports scholarship, become professional...'
            }
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Info Box */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold mb-2">
                {language === 'es' ? '💡 Consejos para establecer metas efectivas:' : '💡 Tips for setting effective goals:'}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{language === 'es' ? 'Sé específico y medible' : 'Be specific and measurable'}</li>
                <li>{language === 'es' ? 'Establece plazos realistas' : 'Set realistic timelines'}</li>
                <li>{language === 'es' ? 'Revisa y ajusta regularmente' : 'Review and adjust regularly'}</li>
                <li>{language === 'es' ? 'Comparte tus metas con tu entrenador' : 'Share your goals with your coach'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading
              ? (language === 'es' ? 'Guardando...' : 'Saving...')
              : (language === 'es' ? 'Guardar Objetivos' : 'Save Goals')}
          </button>
        </div>
      </div>
    </div>
  );
}
