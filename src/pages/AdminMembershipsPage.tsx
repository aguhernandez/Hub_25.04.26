import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import AdminLayout from '../components/AdminLayout';
import { Package, Plus, Edit2, Trash2, ExternalLink, DollarSign, Users, Loader2 } from 'lucide-react';

interface Membership {
  id: string;
  name: string;
  name_es?: string;
  name_en?: string;
  slug: string;
  description: string;
  description_es?: string;
  description_en?: string;
  long_description: string;
  long_description_es?: string;
  long_description_en?: string;
  image_url: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  stripe_product_id: string;
  stripe_price_id_monthly: string;
  stripe_price_id_annual: string;
  is_open: boolean;
  is_published: boolean;
  is_active: boolean;
  features: any;
  features_es?: any;
  features_en?: any;
  max_members: number;
  color?: string;
  display_order?: number;
  is_highlighted?: boolean;
  cta_text_es?: string;
  cta_text_en?: string;
}

export default function AdminMembershipsPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { toast, hideToast, showToast } = useToast();

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_es: '',
    name_en: '',
    slug: '',
    description: '',
    description_es: '',
    description_en: '',
    long_description: '',
    long_description_es: '',
    long_description_en: '',
    image_url: '',
    price_monthly: 0,
    price_annual: 0,
    currency: 'USD',
    is_open: false,
    is_published: false,
    max_members: null as number | null,
    features: [] as string[],
    features_es: [] as string[],
    features_en: [] as string[],
    color: 'gray',
    display_order: 0,
    is_highlighted: false,
    cta_text_es: '',
    cta_text_en: '',
  });

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'trainer') {
      loadMemberships();
    }
  }, [profile]);

  const loadMemberships = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setMemberships(data || []);
    } catch (err) {
      console.error('Error loading memberships:', err);
      showToast(language === 'es' ? 'Error al cargar memberships' : 'Error loading memberships', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const data = {
        ...formData,
        slug,
        created_by: profile?.id,
      };

      if (editingMembership) {
        const { error } = await supabase
          .from('memberships')
          .update(data)
          .eq('id', editingMembership.id);

        if (error) throw error;
        showToast(language === 'es' ? 'Membership actualizada' : 'Membership updated', 'success');
      } else {
        const { error } = await supabase
          .from('memberships')
          .insert(data);

        if (error) throw error;
        showToast(language === 'es' ? 'Membership creada' : 'Membership created', 'success');
      }

      setShowCreateModal(false);
      setEditingMembership(null);
      resetForm();
      loadMemberships();
    } catch (err: any) {
      console.error('Error saving membership:', err);
      showToast(err.message || (language === 'es' ? 'Error al guardar' : 'Error saving'), 'error');
    }
  };

  const handleCreateStripeProduct = async (membershipId: string, billingCycle: 'monthly' | 'annual') => {
    try {
      console.log('Creating Stripe product for:', membershipId, billingCycle);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('stripe-create-membership-product', {
        body: { membership_id: membershipId, billing_cycle: billingCycle },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('Response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      showToast(language === 'es'
        ? `Producto Stripe creado (${billingCycle})`
        : `Stripe product created (${billingCycle})`, 'success');

      await loadMemberships();
    } catch (err: any) {
      console.error('Error in handleCreateStripeProduct:', err);
      showToast(err.message || 'Error creating Stripe product', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar membership?' : 'Delete membership?')) return;

    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast(language === 'es' ? 'Membership eliminada' : 'Membership deleted', 'success');
      loadMemberships();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_es: '',
      name_en: '',
      slug: '',
      description: '',
      description_es: '',
      description_en: '',
      long_description: '',
      long_description_es: '',
      long_description_en: '',
      image_url: '',
      price_monthly: 0,
      price_annual: 0,
      currency: 'USD',
      is_open: false,
      is_published: false,
      max_members: null,
      features: [],
      features_es: [],
      features_en: [],
      color: 'gray',
      display_order: 0,
      is_highlighted: false,
      cta_text_es: '',
      cta_text_en: '',
    });
    setEditingMembership(null);
  };

  if (profile?.role !== 'admin' && profile?.role !== 'trainer') {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
    return null;
  }

  return (
    <AdminLayout currentPage="admin-memberships">
    <div className="space-y-6">
      <Toast toast={toast} onHide={hideToast} />

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-[#fdda36]" />
              {language === 'es' ? 'Gestionar Memberships' : 'Manage Memberships'}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {language === 'es'
                ? 'Crea y administra memberships con integración Stripe'
                : 'Create and manage memberships with Stripe integration'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#fde66e] transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {language === 'es' ? 'Nueva Membership' : 'New Membership'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#fdda36]" />
          </div>
        ) : memberships.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'es' ? 'No hay memberships creadas' : 'No memberships created'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {membership.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      /{membership.slug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingMembership(membership);
                        setFormData({
                          name: membership.name,
                          name_es: membership.name_es || '',
                          name_en: membership.name_en || '',
                          slug: membership.slug,
                          description: membership.description || '',
                          description_es: membership.description_es || '',
                          description_en: membership.description_en || '',
                          long_description: membership.long_description || '',
                          long_description_es: membership.long_description_es || '',
                          long_description_en: membership.long_description_en || '',
                          image_url: membership.image_url || '',
                          price_monthly: membership.price_monthly || 0,
                          price_annual: membership.price_annual || 0,
                          currency: membership.currency || 'USD',
                          is_open: membership.is_open,
                          is_published: membership.is_published,
                          max_members: membership.max_members,
                          features: membership.features || [],
                          features_es: membership.features_es || [],
                          features_en: membership.features_en || [],
                          color: membership.color || 'gray',
                          display_order: membership.display_order || 0,
                          is_highlighted: membership.is_highlighted || false,
                          cta_text_es: membership.cta_text_es || '',
                          cta_text_en: membership.cta_text_en || '',
                        });
                        setShowCreateModal(true);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(membership.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {membership.description}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {language === 'es' ? 'Mensual' : 'Monthly'}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {membership.price_monthly === 0
                        ? (language === 'es' ? 'Gratis' : 'Free')
                        : `$${membership.price_monthly} ${membership.currency}`
                      }
                    </p>
                    {membership.price_monthly > 0 && (
                      membership.stripe_price_id_monthly ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {language === 'es' ? 'En Stripe' : 'In Stripe'}
                          </span>
                          <button
                            onClick={() => handleCreateStripeProduct(membership.id, 'monthly')}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {language === 'es' ? 'Recrear' : 'Recreate'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCreateStripeProduct(membership.id, 'monthly')}
                          className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          {language === 'es' ? 'Crear en Stripe' : 'Create in Stripe'}
                        </button>
                      )
                    )}
                    {membership.price_monthly === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {language === 'es' ? 'No requiere Stripe' : 'No Stripe needed'}
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {language === 'es' ? 'Anual' : 'Yearly'}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {membership.price_annual === 0
                        ? (language === 'es' ? 'Gratis' : 'Free')
                        : `$${membership.price_annual} ${membership.currency}`
                      }
                    </p>
                    {membership.price_annual > 0 && (
                      membership.stripe_price_id_annual ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {language === 'es' ? 'En Stripe' : 'In Stripe'}
                          </span>
                          <button
                            onClick={() => handleCreateStripeProduct(membership.id, 'annual')}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {language === 'es' ? 'Recrear' : 'Recreate'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCreateStripeProduct(membership.id, 'annual')}
                          className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          {language === 'es' ? 'Crear en Stripe' : 'Create in Stripe'}
                        </button>
                      )
                    )}
                    {membership.price_annual === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {language === 'es' ? 'No requiere Stripe' : 'No Stripe needed'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {membership.is_published && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs">
                      {language === 'es' ? 'Publicada' : 'Published'}
                    </span>
                  )}
                  {membership.is_open && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs">
                      {language === 'es' ? 'Pública' : 'Public'}
                    </span>
                  )}
                  {membership.is_active && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs">
                      {language === 'es' ? 'Activa' : 'Active'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingMembership
                  ? (language === 'es' ? 'Editar Membership' : 'Edit Membership')
                  : (language === 'es' ? 'Nueva Membership' : 'New Membership')}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Nombre (General)' : 'Name (General)'}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre ES
                  </label>
                  <input
                    type="text"
                    value={formData.name_es}
                    onChange={(e) => setFormData({ ...formData, name_es: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name EN
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder={formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Descripción' : 'Description'}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Descripción Detallada' : 'Detailed Description'}
                </label>
                <textarea
                  value={formData.long_description}
                  onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'URL de Imagen' : 'Image URL'}
                </label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Precio Mensual' : 'Monthly Price'}
                  </label>
                  <input
                    type="number"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Precio Anual' : 'Annual Price'}
                  </label>
                  <input
                    type="number"
                    value={formData.price_annual}
                    onChange={(e) => setFormData({ ...formData, price_annual: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'es' ? 'Moneda' : 'Currency'}
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Color de Marca' : 'Brand Color'}
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                  >
                    <option value="gray">Gray (Start/Inicia)</option>
                    <option value="yellow">Yellow (Asciende)</option>
                    <option value="violet">Violet (PRO)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'es' ? 'Orden' : 'Display Order'}
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CTA Text ES
                  </label>
                  <input
                    type="text"
                    value={formData.cta_text_es}
                    onChange={(e) => setFormData({ ...formData, cta_text_es: e.target.value })}
                    placeholder="Ej: Comenzar Gratis, Suscribirse, Hacerse PRO"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CTA Text EN
                  </label>
                  <input
                    type="text"
                    value={formData.cta_text_en}
                    onChange={(e) => setFormData({ ...formData, cta_text_en: e.target.value })}
                    placeholder="Ex: Start Free, Subscribe, Go PRO"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_highlighted}
                    onChange={(e) => setFormData({ ...formData, is_highlighted: e.target.checked })}
                    className="w-4 h-4 text-[#fdda36] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 rounded focus:ring-[#fdda36]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Destacar (mostrar como más popular)' : 'Highlight (show as most popular)'}
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 text-[#fdda36] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 rounded focus:ring-[#fdda36]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Publicar (visible en marketplace)' : 'Publish (visible in marketplace)'}
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_open}
                    onChange={(e) => setFormData({ ...formData, is_open: e.target.checked })}
                    className="w-4 h-4 text-[#fdda36] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 rounded focus:ring-[#fdda36]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {language === 'es' ? 'Abierta (cualquiera puede comprar)' : 'Open (anyone can purchase)'}
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingMembership(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#fde66e] transition-colors font-medium"
              >
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
