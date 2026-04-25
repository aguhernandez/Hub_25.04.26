import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { Package, Plus, Save, Calendar, DollarSign, Users, Eye, Trash2, CreditCard as Edit2, X, Copy, Video, Clock, Target, TrendingUp, ChevronDown, ChevronRight, Image as ImageIcon, CreditCard, ExternalLink, CheckCircle, Loader } from 'lucide-react';

interface ProgramProduct {
  id: string;
  title: string;
  description: string;
  title_es?: string | null;
  title_en?: string | null;
  description_es?: string | null;
  description_en?: string | null;
  duration_weeks: number | null;
  is_membership: boolean;
  price: number;
  currency: string;
  is_published: boolean;
  category: string;
  difficulty_level: string;
  includes_zoom_sessions: boolean;
  zoom_frequency: string | null;
  zoom_session_duration: number | null;
  max_participants: number | null;
  thumbnail_url: string | null;
  image_url?: string | null;
  sport?: string | null;
  detailed_description?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  checkout_url?: string | null;
}

interface ProgramWeek {
  id: string;
  week_number: number;
  title: string;
  description: string;
}

interface Workout {
  id: string;
  name: string;
  description: string;
}

export default function ProgramBuilderPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { toast, hideToast, success, error: showError } = useToast();
  const [programs, setPrograms] = useState<ProgramProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [creatingStripe, setCreatingStripe] = useState<string | null>(null);

  const [formLang, setFormLang] = useState<'es' | 'en'>('es');

  const [formData, setFormData] = useState<Partial<ProgramProduct>>({
    title: '',
    description: '',
    title_es: '',
    title_en: '',
    description_es: '',
    description_en: '',
    duration_weeks: 4,
    is_membership: false,
    price: 0,
    currency: profile?.currency || 'USD',
    is_published: true,
    category: '',
    difficulty_level: 'intermediate',
    includes_zoom_sessions: false,
    zoom_frequency: null,
    zoom_session_duration: 60,
    max_participants: null,
    thumbnail_url: null,
    image_url: null,
    sport: null,
    detailed_description: null
  });

  useEffect(() => {
    if (profile?.role === 'trainer' || profile?.role === 'admin') {
      loadPrograms();
      loadWorkouts();
    }
  }, [profile]);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('program_products')
        .select('*');

      // Admin sees all programs, trainer sees only their own
      if (profile?.role !== 'admin') {
        query = query.eq('trainer_id', profile?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkouts = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, name, description')
        .eq('trainer_id', profile?.id)
        .order('name');

      if (error) {
        console.error('Error loading workouts:', error);
        setWorkouts([]);
      } else {
        setWorkouts(data || []);
      }
    } catch (err) {
      console.error('Error loading workouts:', err);
      setWorkouts([]);
    }
  };

  const openEditModal = (program: ProgramProduct) => {
    setFormData({
      title: program.title,
      description: program.description,
      title_es: program.title_es || '',
      title_en: program.title_en || '',
      description_es: program.description_es || '',
      description_en: program.description_en || '',
      duration_weeks: program.duration_weeks,
      is_membership: program.is_membership,
      price: program.price,
      currency: program.currency,
      is_published: program.is_published,
      category: program.category,
      difficulty_level: program.difficulty_level,
      includes_zoom_sessions: program.includes_zoom_sessions,
      zoom_frequency: program.zoom_frequency,
      zoom_session_duration: program.zoom_session_duration,
      max_participants: program.max_participants,
      thumbnail_url: program.thumbnail_url,
      image_url: program.image_url,
      sport: program.sport,
      detailed_description: program.detailed_description,
    });
    setEditingProgram(program.id);
    setShowCreateModal(true);
  };

  const handleUpdateProgram = async () => {
    if (!editingProgram) return;
    if (!formData.title && !formData.title_es && !formData.title_en) {
      showError(language === 'es' ? 'El título es requerido' : 'Title is required');
      return;
    }
    try {
      const { error } = await supabase
        .from('program_products')
        .update({
          title: formData.title_es || formData.title_en || formData.title,
          description: formData.description_es || formData.description_en || formData.description,
          title_es: formData.title_es,
          title_en: formData.title_en,
          description_es: formData.description_es,
          description_en: formData.description_en,
          price: formData.price,
          currency: formData.currency,
          is_published: formData.is_published,
          category: formData.category,
          difficulty_level: formData.difficulty_level,
          includes_zoom_sessions: formData.includes_zoom_sessions,
          zoom_frequency: formData.zoom_frequency,
          zoom_session_duration: formData.zoom_session_duration,
          max_participants: formData.max_participants,
          thumbnail_url: formData.thumbnail_url,
          image_url: formData.image_url,
          sport: formData.sport,
          detailed_description: formData.detailed_description,
        })
        .eq('id', editingProgram);
      if (error) throw error;
      setShowCreateModal(false);
      resetForm();
      await loadPrograms();
      success(language === 'es' ? 'Programa actualizado' : 'Program updated');
    } catch (error: any) {
      console.error('Error updating program:', error);
      showError(error.message);
    }
  };

  const handleCreateProgram = async () => {
    if (!formData.title || formData.price === undefined) {
      showError(language === 'es' ? 'Por favor completa todos los campos requeridos' : 'Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('program_products')
        .insert({
          ...formData,
          trainer_id: profile?.id
        })
        .select()
        .single();

      if (error) throw error;

      if (data && !formData.is_membership && formData.duration_weeks) {
        for (let i = 1; i <= formData.duration_weeks; i++) {
          await supabase
            .from('program_weeks')
            .insert({
              program_product_id: data.id,
              week_number: i,
              title: `${language === 'es' ? 'Semana' : 'Week'} ${i}`,
              description: ''
            });
        }
      }

      setShowCreateModal(false);
      resetForm();
      await loadPrograms();
      success(language === 'es' ? 'Programa creado exitosamente' : 'Program created successfully');

      // Navigate to detail page after 1 second
      if (data?.id) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'program-builder-detail', programId: data.id } }));
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error creating program:', error);
      showError(error.message);
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (!window.confirm(language === 'es' ? '¿Eliminar este programa?' : 'Delete this program?')) return;

    try {
      const { error } = await supabase
        .from('program_products')
        .delete()
        .eq('id', programId);

      if (error) throw error;
      await loadPrograms();
      success(language === 'es' ? 'Programa eliminado' : 'Program deleted');
    } catch (error: any) {
      console.error('Error deleting program:', error);
      showError(error.message);
    }
  };

  const togglePublish = async (programId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('program_products')
        .update({ is_published: !currentStatus })
        .eq('id', programId);

      if (error) throw error;
      await loadPrograms();
      success(currentStatus
        ? (language === 'es' ? 'Programa despublicado' : 'Program unpublished')
        : (language === 'es' ? 'Programa publicado' : 'Program published'));
    } catch (error: any) {
      console.error('Error updating program:', error);
      showError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      title_es: '',
      title_en: '',
      description_es: '',
      description_en: '',
      duration_weeks: 4,
      is_membership: false,
      price: 0,
      currency: profile?.currency || 'USD',
      is_published: true,
      category: '',
      difficulty_level: 'intermediate',
      includes_zoom_sessions: false,
      zoom_frequency: null,
      zoom_session_duration: 60,
      max_participants: null,
      thumbnail_url: null,
      image_url: null,
      sport: null,
      detailed_description: null
    });
    setEditingProgram(null);
  };

  const createStripeProduct = async (program: ProgramProduct) => {
    if (program.price <= 0) {
      showError(language === 'es'
        ? 'El programa debe tener un precio mayor a 0 para conectar con Stripe'
        : 'Program must have a price greater than 0 to connect with Stripe');
      return;
    }
    setCreatingStripe(program.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-create-program-product`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            program_product_id: program.id,
            name: program.title,
            description: program.description || '',
            price: program.price,
            currency: program.currency || 'USD',
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error creating Stripe product');
      await loadPrograms();
      success(language === 'es'
        ? 'Producto creado en Stripe. El enlace de compra ya está disponible.'
        : 'Stripe product created. Purchase link is now available.');
    } catch (err: any) {
      console.error('Stripe error:', err);
      showError(err.message);
    } finally {
      setCreatingStripe(null);
    }
  };

  const copyCheckoutUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    success(language === 'es' ? 'Enlace copiado' : 'Link copied');
  };

  if (profile?.role !== 'trainer' && profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'es' ? 'Solo entrenadores pueden acceder' : 'Only trainers can access'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-6">
        <Toast toast={toast} onHide={hideToast} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-[#fdda36]" />
              {language === 'es' ? 'Constructor de Programas' : 'Program Builder'}
            </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {language === 'es'
              ? 'Crea programas de entrenamiento y membresías para vender'
              : 'Create training programs and memberships to sell'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {language === 'es' ? 'Nuevo Programa' : 'New Program'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {language === 'es' ? 'No hay programas todavía' : 'No programs yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {language === 'es'
              ? 'Crea tu primer programa de entrenamiento para empezar a vender'
              : 'Create your first training program to start selling'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {language === 'es' ? 'Crear Programa' : 'Create Program'}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {programs.map((program) => (
            <div
              key={program.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {language === 'es'
                          ? (program.title_es || program.title)
                          : (program.title_en || program.title)}
                      </h3>
                      {program.is_membership ? (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                          {language === 'es' ? 'Membresía' : 'Membership'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                          {program.duration_weeks} {language === 'es' ? 'semanas' : 'weeks'}
                        </span>
                      )}
                      {program.is_published ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">
                          {language === 'es' ? 'Publicado' : 'Published'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">
                          {language === 'es' ? 'Borrador' : 'Draft'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                      {language === 'es'
                        ? (program.description_es || program.description || (language === 'es' ? 'Sin descripción' : 'No description'))
                        : (program.description_en || program.description || 'No description')}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold">{program.price} {program.currency}</span>
                      </div>
                      {program.includes_zoom_sessions && (
                        <div className="flex items-center gap-1">
                          <Video className="w-4 h-4" />
                          <span>{program.zoom_frequency}</span>
                        </div>
                      )}
                      {program.difficulty_level && (
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span className="capitalize">{program.difficulty_level}</span>
                        </div>
                      )}
                      {program.stripe_product_id ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Stripe</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Stripe section */}
                    {program.checkout_url && (
                      <div className="mt-3 flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium flex-1 truncate">
                          {language === 'es' ? 'Enlace de compra activo' : 'Purchase link active'}
                        </span>
                        <button
                          onClick={() => window.open(program.checkout_url!, '_blank')}
                          className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors"
                          title="Open checkout"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyCheckoutUrl(program.checkout_url!)}
                          className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors"
                          title={language === 'es' ? 'Copiar enlace' : 'Copy link'}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!program.is_membership && (
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('navigate', {
                            detail: { page: 'program-builder-detail', programId: program.id }
                          }));
                        }}
                        className="px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center gap-2 text-sm"
                        title={language === 'es' ? 'Planificar entrenamientos' : 'Plan workouts'}
                      >
                        <Calendar className="w-4 h-4" />
                        {language === 'es' ? 'Planificar' : 'Plan'}
                      </button>
                    )}
                    {!program.stripe_product_id && program.price > 0 ? (
                      <button
                        onClick={() => createStripeProduct(program)}
                        disabled={creatingStripe === program.id}
                        className="px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        title={language === 'es' ? 'Conectar con Stripe para venta online' : 'Connect with Stripe for online sales'}
                      >
                        {creatingStripe === program.id
                          ? <Loader className="w-4 h-4 animate-spin" />
                          : <CreditCard className="w-4 h-4" />
                        }
                        {language === 'es' ? 'Conectar Stripe' : 'Connect Stripe'}
                      </button>
                    ) : program.stripe_product_id && program.checkout_url ? (
                      <button
                        onClick={() => copyCheckoutUrl(program.checkout_url!)}
                        className="px-3 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Copy className="w-4 h-4" />
                        {language === 'es' ? 'Copiar enlace' : 'Copy link'}
                      </button>
                    ) : null}
                    <button
                      onClick={() => togglePublish(program.id, program.is_published)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={program.is_published ? 'Unpublish' : 'Publish'}
                    >
                      <Eye className={`w-5 h-5 ${program.is_published ? 'text-green-600' : 'text-gray-400'}`} />
                    </button>
                    <button
                      onClick={() => openEditModal(program)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={language === 'es' ? 'Editar programa' : 'Edit program'}
                    >
                      <Edit2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(program.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingProgram
                  ? (language === 'es' ? 'Editar Programa' : 'Edit Program')
                  : (language === 'es' ? 'Crear Nuevo Programa' : 'Create New Program')}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Program Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Tipo de Producto' : 'Product Type'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, is_membership: false })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      !formData.is_membership
                        ? 'border-[#fdda36] bg-[#fdda36]/10 text-gray-900 dark:text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-[#fdda36]/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Calendar className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium text-sm">{language === 'es' ? 'Programa X Semanas' : 'X-Week Program'}</p>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, is_membership: true, duration_weeks: null })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.is_membership
                        ? 'border-[#fdda36] bg-[#fdda36]/10 text-gray-900 dark:text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-[#fdda36]/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium text-sm">{language === 'es' ? 'Membresía Mensual' : 'Monthly Membership'}</p>
                  </button>
                </div>
              </div>

              {/* Language tab selector */}
              <div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
                  <button
                    onClick={() => setFormLang('es')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                      formLang === 'es'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    Español
                  </button>
                  <button
                    onClick={() => setFormLang('en')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                      formLang === 'en'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    English
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  {language === 'es'
                    ? 'Completá el título y descripción en cada idioma'
                    : 'Fill in the title and description for each language'}
                </p>
              </div>

              {/* Basic Info — language-tabbed */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Título del Programa' : 'Program Title'} *
                  </label>
                  {formLang === 'es' ? (
                    <input
                      type="text"
                      value={formData.title_es || ''}
                      onChange={(e) => setFormData({ ...formData, title_es: e.target.value, title: e.target.value || formData.title_en || '' })}
                      placeholder="Ej: 12 Semanas para Maximizar tu Salto"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.title_en || ''}
                      onChange={(e) => setFormData({ ...formData, title_en: e.target.value, title: formData.title_es || e.target.value })}
                      placeholder="e.g., 12 Weeks to Maximize Your Jump"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Descripción' : 'Description'}
                  </label>
                  {formLang === 'es' ? (
                    <textarea
                      value={formData.description_es || ''}
                      onChange={(e) => setFormData({ ...formData, description_es: e.target.value, description: e.target.value || formData.description_en || '' })}
                      rows={3}
                      placeholder="Describe qué incluye el programa..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36] resize-none"
                    />
                  ) : (
                    <textarea
                      value={formData.description_en || ''}
                      onChange={(e) => setFormData({ ...formData, description_en: e.target.value, description: formData.description_es || e.target.value })}
                      rows={3}
                      placeholder="Describe what the program includes..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36] resize-none"
                    />
                  )}
                </div>
              </div>

              {!formData.is_membership && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Duración (semanas)' : 'Duration (weeks)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={formData.duration_weeks || ''}
                    onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) || 4 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Precio' : 'Price'} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Moneda' : 'Currency'}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="ARS">ARS</option>
                  </select>
                </div>
              </div>

              {/* Level & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Nivel' : 'Level'}
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  >
                    <option value="beginner">{language === 'es' ? 'Principiante' : 'Beginner'}</option>
                    <option value="intermediate">{language === 'es' ? 'Intermedio' : 'Intermediate'}</option>
                    <option value="advanced">{language === 'es' ? 'Avanzado' : 'Advanced'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Categoría' : 'Category'}
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder={language === 'es' ? 'Ej: Fuerza' : 'e.g., Strength'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  />
                </div>
              </div>

              {/* Sport */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Deporte' : 'Sport'}
                </label>
                <input
                  type="text"
                  value={formData.sport || ''}
                  onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                  placeholder={language === 'es' ? 'Ej: Fútbol, Básquet, Atletismo' : 'e.g., Soccer, Basketball, Athletics'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'URL de Imagen' : 'Image URL'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.image_url || ''}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                  />
                  {formData.image_url && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {language === 'es' ? 'Imagen de portada del programa' : 'Program cover image'}
                </p>
              </div>

              {/* Detailed Description — also language-tabbed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Descripción Detallada' : 'Detailed Description'}
                  <span className="ml-2 text-xs font-normal text-gray-400">({formLang === 'es' ? 'Español' : 'English'})</span>
                </label>
                <textarea
                  value={formData.detailed_description || ''}
                  onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
                  rows={6}
                  placeholder={formLang === 'es'
                    ? 'Descripción completa del programa, qué incluye, a quién va dirigido, objetivos, etc.'
                    : 'Full program description, what it includes, target audience, objectives, etc.'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36] resize-none"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {language === 'es'
                    ? 'Este campo se guardará en el idioma seleccionado arriba'
                    : 'This field will be saved in the language selected above'}
                </p>
              </div>

              {/* Publish Toggle */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published || false}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 text-[#fdda36] rounded focus:ring-[#fdda36]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Publicar programa (visible para atletas)' : 'Publish program (visible to athletes)'}
                  </span>
                </label>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {language === 'es'
                    ? 'Los programas publicados aparecerán en el marketplace para que los atletas puedan comprarlos'
                    : 'Published programs will appear in the marketplace for athletes to purchase'}
                </p>
              </div>

              {/* Zoom Integration */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={formData.includes_zoom_sessions || false}
                    onChange={(e) => setFormData({ ...formData, includes_zoom_sessions: e.target.checked })}
                    className="w-4 h-4 text-[#fdda36] rounded focus:ring-[#fdda36]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Incluye sesiones de Zoom' : 'Includes Zoom sessions'}
                  </span>
                </label>

                {formData.includes_zoom_sessions && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {language === 'es' ? 'Frecuencia' : 'Frequency'}
                      </label>
                      <select
                        value={formData.zoom_frequency || ''}
                        onChange={(e) => setFormData({ ...formData, zoom_frequency: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                      >
                        <option value="weekly">{language === 'es' ? 'Semanal' : 'Weekly'}</option>
                        <option value="biweekly">{language === 'es' ? 'Quincenal' : 'Biweekly'}</option>
                        <option value="monthly">{language === 'es' ? 'Mensual' : 'Monthly'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {language === 'es' ? 'Duración (minutos)' : 'Duration (minutes)'}
                      </label>
                      <input
                        type="number"
                        min="15"
                        step="15"
                        value={formData.zoom_session_duration || 60}
                        onChange={(e) => setFormData({ ...formData, zoom_session_duration: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fdda36]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={editingProgram ? handleUpdateProgram : handleCreateProgram}
                  className="flex-1 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingProgram
                    ? (language === 'es' ? 'Guardar Cambios' : 'Save Changes')
                    : (language === 'es' ? 'Crear Programa' : 'Create Program')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
