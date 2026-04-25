import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { Package, Plus, CreditCard as Edit2, Trash2, Calendar, Users, Copy } from 'lucide-react';
import ProgramTagsSection from '../components/tags/ProgramTagsSection';

interface Program {
  id: string;
  name: string;
  description: string;
  duration_weeks: number;
  price: number;
  is_template: boolean;
  created_by: string;
  created_at: string;
}

export default function ProgramsPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { toast, hideToast, success, error: showError } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_weeks: 4,
    price: 0,
    is_template: true
  });

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('training_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.role === 'trainer') {
        query = query.eq('created_by', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (editingProgram) {
        const { error } = await supabase
          .from('training_programs')
          .update(formData)
          .eq('id', editingProgram.id);

        if (error) throw error;
        success(language === 'es' ? 'Programa actualizado' : 'Program updated');
      } else {
        const { error } = await supabase
          .from('training_programs')
          .insert([{ ...formData, created_by: profile?.id }]);

        if (error) throw error;
        success(language === 'es' ? 'Programa creado' : 'Program created');
      }

      setShowModal(false);
      setEditingProgram(null);
      setFormData({ name: '', description: '', duration_weeks: 4, price: 0, is_template: true });
      loadPrograms();
    } catch (error: any) {
      console.error('Error:', error);
      showError(error.message);
    }
  };

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      description: program.description,
      duration_weeks: program.duration_weeks,
      price: program.price,
      is_template: program.is_template
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este programa?' : 'Delete this program?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('training_programs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success(language === 'es' ? 'Programa eliminado' : 'Program deleted');
      loadPrograms();
    } catch (error: any) {
      console.error('Error:', error);
      showError(error.message);
    }
  };

  const handleDuplicate = async (program: Program) => {
    try {
      const { error } = await supabase
        .from('training_programs')
        .insert([{
          name: `${program.name} (Copy)`,
          description: program.description,
          duration_weeks: program.duration_weeks,
          price: program.price,
          is_template: program.is_template,
          created_by: profile?.id
        }]);

      if (error) throw error;
      success(language === 'es' ? 'Programa duplicado' : 'Program duplicated');
      loadPrograms();
    } catch (error: any) {
      console.error('Error:', error);
      showError(error.message);
    }
  };

  if (profile?.role !== 'trainer' && profile?.role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-red-600">
          {language === 'es' ? 'Solo entrenadores y administradores' : 'Trainers and admins only'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onHide={hideToast} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-8 h-8 text-[#fdda36]" />
            {language === 'es' ? 'Programas de Entrenamiento' : 'Training Programs'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {language === 'es'
              ? 'Crea programas completos (4, 8, 12 semanas)'
              : 'Create complete programs (4, 8, 12 weeks)'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProgram(null);
            setFormData({ name: '', description: '', duration_weeks: 4, price: 0, is_template: true });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
        >
          <Plus className="w-5 h-5" />
          {language === 'es' ? 'Nuevo Programa' : 'New Program'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es' ? 'No hay programas creados aún' : 'No programs created yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <div
              key={program.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {program.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {program.description}
                  </p>
                </div>
              </div>

              <div className="mb-2">
                <ProgramTagsSection
                  programId={program.id}
                  language={language}
                  canEdit={profile?.role === 'trainer' || profile?.role === 'admin'}
                />
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>{program.duration_weeks} {language === 'es' ? 'semanas' : 'weeks'}</span>
                </div>
                {program.price > 0 && (
                  <div className="text-green-600 dark:text-green-400 font-semibold">
                    ${program.price}
                  </div>
                )}
                {program.is_template && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                    {language === 'es' ? 'Plantilla' : 'Template'}
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleEdit(program)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  {language === 'es' ? 'Editar' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDuplicate(program)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm"
                >
                  <Copy className="w-4 h-4" />
                  {language === 'es' ? 'Duplicar' : 'Duplicate'}
                </button>
                <button
                  onClick={() => handleDelete(program.id)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingProgram
                  ? language === 'es' ? 'Editar Programa' : 'Edit Program'
                  : language === 'es' ? 'Nuevo Programa' : 'New Program'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Nombre' : 'Name'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder={language === 'es' ? 'Ej: 12 semanas para mejorar tu salto' : 'Ex: 12 weeks to improve your jump'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder={language === 'es' ? 'Describe el programa...' : 'Describe the program...'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Duración (semanas)' : 'Duration (weeks)'}
                </label>
                <input
                  type="number"
                  value={formData.duration_weeks}
                  onChange={(e) => setFormData({ ...formData, duration_weeks: Number(e.target.value) })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Precio (USD)' : 'Price (USD)'}
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_template"
                  checked={formData.is_template}
                  onChange={(e) => setFormData({ ...formData, is_template: e.target.checked })}
                  className="w-4 h-4 text-[#fdda36] border-gray-300 rounded focus:ring-[#fdda36]"
                />
                <label htmlFor="is_template" className="text-sm text-gray-700 dark:text-gray-300">
                  {language === 'es' ? 'Usar como plantilla' : 'Use as template'}
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateOrUpdate}
                className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a]"
              >
                {language === 'es' ? 'Guardar' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
