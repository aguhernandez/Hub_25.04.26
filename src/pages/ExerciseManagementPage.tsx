import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import { Dumbbell, Plus, CreditCard as Edit2, Trash2, Search, Save, X, Filter, Play, Globe } from 'lucide-react';
import { getExerciseName } from '../utils/exerciseI18n';

interface Exercise {
  id: string;
  exercise: string;
  exercise_en?: string | null;
  exercise_es?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_es?: string | null;
  category: string;
  type?: string;
  equipment?: string;
  pattern_ability?: string;
  movement?: string;
  contraction?: string;
  orientation?: string;
  body_part?: string;
  parameter?: string;
  link?: string;
  is_global: boolean;
  created_by?: string;
  created_at: string;
}

export default function ExerciseManagementPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedExerciseForVideo, setSelectedExerciseForVideo] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;
  const [activeTab, setActiveTab] = useState<'en' | 'es'>('en');
  const [formData, setFormData] = useState({
    exercise: '',
    exercise_en: '',
    exercise_es: '',
    description_en: '',
    description_es: '',
    category: '',
    type: '',
    equipment: '',
    link: '',
    pattern_ability: '',
    movement: '',
    contraction: ''
  });

  const categories = [
    { value: 'Lower Body', label: language === 'es' ? 'Tren inferior' : 'Lower Body' },
    { value: 'Upper Body', label: language === 'es' ? 'Tren superior' : 'Upper Body' },
    { value: 'Trunk & Core', label: language === 'es' ? 'Core' : 'Trunk & Core' },
    { value: 'Jump', label: language === 'es' ? 'Salto' : 'Jump' },
    { value: 'Speed', label: language === 'es' ? 'Velocidad' : 'Speed' },
    { value: 'Mobility & Stretch', label: language === 'es' ? 'Movilidad' : 'Mobility & Stretch' },
    { value: 'Testing', label: language === 'es' ? 'Tests' : 'Testing' },
    { value: 'Conditioning', label: language === 'es' ? 'Acondicionamiento' : 'Conditioning' },
  ];

  const types = [
    { value: 'Grinding', label: language === 'es' ? 'Fuerza' : 'Grinding' },
    { value: 'Ballistic', label: language === 'es' ? 'Balístico' : 'Ballistic' },
    { value: 'Jump', label: language === 'es' ? 'Salto' : 'Jump' },
    { value: 'Land', label: language === 'es' ? 'Aterrizaje' : 'Land' },
    { value: 'Sprint', label: language === 'es' ? 'Sprint' : 'Sprint' },
    { value: 'Stretch', label: language === 'es' ? 'Estiramiento' : 'Stretch' },
  ];

  const equipmentOptions = [
    { value: 'BB/SSB', label: 'Barbell/SSB' },
    { value: 'DB/KB', label: 'Dumbbell/Kettlebell' },
    { value: 'Landmine', label: 'Landmine' },
    { value: 'Bands', label: language === 'es' ? 'Bandas' : 'Bands' },
    { value: 'Misc', label: language === 'es' ? 'Otro' : 'Misc' },
    { value: 'BW', label: language === 'es' ? 'Peso corporal' : 'Bodyweight' },
  ];

  useEffect(() => {
    loadExercises();
  }, [currentPage, categoryFilter, typeFilter, equipmentFilter, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedExerciseForVideo(null);
  }, [searchQuery, categoryFilter, typeFilter, equipmentFilter]);

  const loadExercises = async () => {
    setLoading(true);
    try {
      // Build query with filters
      let query = supabase
        .from('exercises')
        .select('*', { count: 'exact' });

      // Apply filters
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }
      if (equipmentFilter !== 'all') {
        query = query.eq('equipment', equipmentFilter);
      }
      if (searchQuery.trim()) {
        query = query.or(`exercise_en.ilike.%${searchQuery}%,exercise_es.ilike.%${searchQuery}%,exercise.ilike.%${searchQuery}%`);
      }

      // Get total count and paginated data
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('exercise', { ascending: true })
        .range(from, to);

      if (error) throw error;
      setExercises(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      const dataToSave = {
        ...formData,
        exercise: formData.exercise_en || formData.exercise,
      };

      if (editingExercise) {
        const { error } = await supabase
          .from('exercises')
          .update(dataToSave)
          .eq('id', editingExercise.id);

        if (error) throw error;
        alert(language === 'es' ? 'Ejercicio actualizado' : 'Exercise updated');
      } else {
        const { error } = await supabase
          .from('exercises')
          .insert([{ ...dataToSave, is_global: false }]);

        if (error) throw error;
        alert(language === 'es' ? 'Ejercicio creado' : 'Exercise created');
      }

      setShowModal(false);
      setEditingExercise(null);
      setActiveTab('en');
      setFormData({ exercise: '', exercise_en: '', exercise_es: '', description_en: '', description_es: '', category: '', type: '', equipment: '', link: '', pattern_ability: '', movement: '', contraction: '' });
      loadExercises();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setActiveTab('en');
    setFormData({
      exercise: exercise.exercise,
      exercise_en: exercise.exercise_en || exercise.exercise || '',
      exercise_es: exercise.exercise_es || '',
      description_en: exercise.description_en || exercise.description || '',
      description_es: exercise.description_es || '',
      category: exercise.category,
      type: exercise.type || '',
      equipment: exercise.equipment || '',
      link: exercise.link || '',
      pattern_ability: exercise.pattern_ability || '',
      movement: exercise.movement || '',
      contraction: exercise.contraction || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este ejercicio?' : 'Delete this exercise?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert(language === 'es' ? 'Ejercicio eliminado' : 'Exercise deleted');
      loadExercises();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : null;
  };

  // Remove admin-only restriction - everyone can view exercises
  // if (profile?.role !== 'admin') {
  //   return (
  //     <div className="p-6">
  //       <p className="text-red-600">{language === 'es' ? 'Solo administradores' : 'Admins only'}</p>
  //     </div>
  //   );
  // }

  const isAdmin = profile?.role === 'admin';

  return (
    <AdminLayout currentPage="exercises">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Dumbbell className="w-8 h-8 text-[#fdda36]" />
              {language === 'es' ? 'Biblioteca de Ejercicios' : 'Exercise Library'}
            </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAdmin
              ? (language === 'es' ? 'Gestionar y ver ejercicios' : 'Manage and view exercises')
              : (language === 'es' ? 'Explorar ejercicios disponibles' : 'Browse available exercises')}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingExercise(null);
              setActiveTab('en');
              setFormData({ exercise: '', exercise_en: '', exercise_es: '', description_en: '', description_es: '', category: '', type: '', equipment: '', link: '', pattern_ability: '', movement: '', contraction: '' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
          >
            <Plus className="w-5 h-5" />
            {language === 'es' ? 'Nuevo Ejercicio' : 'New Exercise'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
          <Filter className="w-5 h-5" />
          {language === 'es' ? 'Filtros y Búsqueda' : 'Filters & Search'}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative md:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={language === 'es' ? 'Buscar ejercicios...' : 'Search exercises...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">{language === 'es' ? 'Todas las categorías' : 'All categories'}</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">{language === 'es' ? 'Todos los tipos' : 'All types'}</option>
            {types.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">{language === 'es' ? 'Todo el equipamiento' : 'All equipment'}</option>
            {equipmentOptions.map(eq => (
              <option key={eq.value} value={eq.value}>{eq.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((exercise) => {
            const embedUrl = getYouTubeEmbedUrl(exercise.link || '');
            const isVideoExpanded = selectedExerciseForVideo === exercise.id;

            return (
              <div
                key={exercise.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {exercise.link && (
                  <div className="relative aspect-video bg-gray-900">
                    {isVideoExpanded && embedUrl ? (
                      <div className="relative w-full h-full">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        <button
                          onClick={() => setSelectedExerciseForVideo(null)}
                          className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors z-10"
                          title={language === 'es' ? 'Cerrar video' : 'Close video'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setSelectedExerciseForVideo(exercise.id)}
                        className="relative w-full h-full bg-gradient-to-br from-[#514163] to-[#6d5581] flex items-center justify-center cursor-pointer hover:from-[#6d5581] hover:to-[#514163] transition-all group"
                      >
                        <div className="text-center">
                          <Play className="w-16 h-16 text-white opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all mx-auto mb-2" />
                          <p className="text-white text-sm font-medium opacity-70 group-hover:opacity-100">
                            {language === 'es' ? 'Click para ver video' : 'Click to watch video'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {getExerciseName(exercise, language)}
                      </h3>
                      {language === 'es' && exercise.exercise_es && exercise.exercise_en && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{exercise.exercise_en}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {exercise.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36]">
                            {categories.find(c => c.value === exercise.category)?.label || exercise.category}
                          </span>
                        )}
                        {exercise.type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            {types.find(t => t.value === exercise.type)?.label || exercise.type}
                          </span>
                        )}
                        {exercise.equipment && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            {equipmentOptions.find(e => e.value === exercise.equipment)?.label || exercise.equipment}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(exercise)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title={language === 'es' ? 'Editar' : 'Edit'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exercise.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title={language === 'es' ? 'Eliminar' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {exercise.movement && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{language === 'es' ? 'Movimiento:' : 'Movement:'}</span> {exercise.movement}
                    </p>
                  )}
                  {exercise.pattern_ability && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{language === 'es' ? 'Patrón:' : 'Pattern:'}</span> {exercise.pattern_ability}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {language === 'es' ? 'Mostrando' : 'Showing'} {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} - {Math.min(currentPage * itemsPerPage, totalCount)} {language === 'es' ? 'de' : 'of'} {totalCount} {language === 'es' ? 'ejercicios' : 'exercises'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {language === 'es' ? 'Anterior' : 'Previous'}
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[#fdda36] text-[#514163]'
                          : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {language === 'es' ? 'Siguiente' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingExercise
                  ? language === 'es' ? 'Editar Ejercicio' : 'Edit Exercise'
                  : language === 'es' ? 'Nuevo Ejercicio' : 'New Exercise'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              <div className="space-y-3">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setActiveTab('en')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'en' ? 'bg-[#fdda36] text-[#514163]' : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <Globe className="w-3 h-3" />
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('es')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'es' ? 'bg-[#fdda36] text-[#514163]' : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <Globe className="w-3 h-3" />
                    Español
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {activeTab === 'en' ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                          Exercise Name (English) *
                        </label>
                        <input
                          type="text"
                          value={formData.exercise_en}
                          onChange={(e) => setFormData({ ...formData, exercise_en: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="e.g. Back Squat"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                          Description (English)
                        </label>
                        <textarea
                          value={formData.description_en}
                          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                          rows={2}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="Exercise description..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                          Nombre del Ejercicio (Español)
                        </label>
                        <input
                          type="text"
                          value={formData.exercise_es}
                          onChange={(e) => setFormData({ ...formData, exercise_es: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="ej. Sentadilla"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                          Descripción (Español)
                        </label>
                        <textarea
                          value={formData.description_es}
                          onChange={(e) => setFormData({ ...formData, description_es: e.target.value })}
                          rows={2}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="Descripción del ejercicio..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    {language === 'es' ? 'Categoría' : 'Category'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    {language === 'es' ? 'Tipo' : 'Type'}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>
                    {types.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    {language === 'es' ? 'Equipamiento' : 'Equipment'}
                  </label>
                  <select
                    value={formData.equipment}
                    onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>
                    {equipmentOptions.map(eq => (
                      <option key={eq.value} value={eq.value}>{eq.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    {language === 'es' ? 'Patrón' : 'Pattern'}
                  </label>
                  <input
                    type="text"
                    value={formData.pattern_ability}
                    onChange={(e) => setFormData({ ...formData, pattern_ability: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    {language === 'es' ? 'Movimiento' : 'Movement'}
                  </label>
                  <input
                    type="text"
                    value={formData.movement}
                    onChange={(e) => setFormData({ ...formData, movement: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    {language === 'es' ? 'Contracción' : 'Contraction'}
                  </label>
                  <input
                    type="text"
                    value={formData.contraction}
                    onChange={(e) => setFormData({ ...formData, contraction: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  {language === 'es' ? 'Video YouTube' : 'YouTube Video'}
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="https://youtu.be/..."
                />
              </div>

              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 flex-shrink-0 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateOrUpdate}
                className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {language === 'es' ? 'Guardar' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
