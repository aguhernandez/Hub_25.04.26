import { useLanguage } from '../contexts/LanguageContext';
import AdminLayout from '../components/AdminLayout';
import { Dumbbell, Apple, BookOpen, FileText, LayoutGrid as Layout } from 'lucide-react';

export default function AdminLibraryPage() {
  const { language } = useLanguage();
  const navigate = (page: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  };

  const t = (key: string) => {
    const translations: Record<string, { es: string; en: string }> = {
      title: { es: 'Biblioteca de Plataforma', en: 'Platform Library' },
      subtitle: { es: 'Gestiona todo el contenido central de Asciende', en: 'Manage all Asciende core content' },
      exercises: { es: 'Ejercicios', en: 'Exercises' },
      nutrition: { es: 'Base de Datos Nutricional', en: 'Nutrition Database' },
      templates: { es: 'Plantillas', en: 'Templates' },
      manageExercises: { es: 'Gestionar Ejercicios', en: 'Manage Exercises' },
      exercisesDesc: { es: 'Administra la biblioteca completa de ejercicios, categorías y variaciones', en: 'Manage the complete exercise library, categories and variations' },
      nutritionDesc: { es: 'Gestiona alimentos, recetas y datos nutricionales', en: 'Manage foods, recipes and nutrition data' },
      templatesDesc: { es: 'Plantillas de entrenamientos, programas y menús', en: 'Workout, program and menu templates' },
      goToExercises: { es: 'Ir a Gestión de Ejercicios', en: 'Go to Exercise Management' },
      goToAdmin: { es: 'Ir a Panel Admin', en: 'Go to Admin Panel' }
    };
    return translations[key]?.[language] || key;
  };

  const sections = [
    {
      id: 'exercises' as const,
      icon: Dumbbell,
      title: t('exercises'),
      description: t('exercisesDesc'),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      action: () => navigate('exercise-management')
    },
    {
      id: 'nutrition' as const,
      icon: Apple,
      title: t('nutrition'),
      description: t('nutritionDesc'),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      action: () => navigate('admin-dashboard')
    },
    {
      id: 'templates' as const,
      icon: Layout,
      title: t('templates'),
      description: t('templatesDesc'),
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      action: () => {}
    }
  ];

  return (
    <AdminLayout currentPage="admin-library">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-[#fdda36] dark:hover:border-[#fdda36] transition-all cursor-pointer group"
                onClick={section.action}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-4 ${section.bgColor} rounded-xl group-hover:scale-110 transition-transform`}>
                    <section.icon className={`w-8 h-8 ${section.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#514163] dark:group-hover:text-[#fdda36] transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {section.description}
                    </p>
                    {section.id === 'exercises' && (
                      <button className="text-sm font-medium text-[#514163] dark:text-[#fdda36] hover:underline">
                        {t('goToExercises')} →
                      </button>
                    )}
                    {section.id === 'nutrition' && (
                      <button className="text-sm font-medium text-[#514163] dark:text-[#fdda36] hover:underline">
                        {t('goToAdmin')} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
      </div>
    </AdminLayout>
  );
}
