import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Package, DollarSign, Trash2, Pencil, X, Save,
  Dumbbell, Salad, Bike, Flag, Eye, EyeOff, Loader2, Check,
  Link2, FileText, Users, CheckCircle, Clock, Ban, AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ServiceProduct {
  id: string;
  name: string;
  description: string;
  type: 'program' | 'membership' | 'coaching';
  price: number;
  duration_weeks: number | null;
  billing_cycle: 'one_time' | 'monthly' | 'yearly';
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  checkout_url: string | null;
  features: string[] | null;
  is_active: boolean;
  trainer_name: string | null;
  trainer_email: string | null;
  category: string | null;
  image_url: string | null;
  payment_link: string | null;
  payment_instructions: string | null;
  payment_method: string | null;
  created_at: string;
}

interface Enrollment {
  id: string;
  athlete_id: string;
  service_id: string;
  professional_id: string;
  status: string;
  payment_status: string;
  athlete_payment_confirmed: boolean;
  professional_payment_confirmed: boolean;
  confirmed_at: string | null;
  activated_at: string | null;
  athlete_name: string | null;
  athlete_email: string | null;
  service_name: string | null;
  created_at: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  strength: Dumbbell,
  nutrition: Salad,
  endurance: Bike,
  race_nutrition: Flag,
};

const CATEGORY_COLORS: Record<string, string> = {
  strength: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  nutrition: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  endurance: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
  race_nutrition: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
};

export default function ProfessionalServicesPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ServiceProduct>>({});
  const [saving, setSaving] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [showEnrollments, setShowEnrollments] = useState(false);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  const isNutritionist = profile?.role === 'nutritionist';
  const isTrainer = profile?.role === 'trainer' || profile?.role === 'head_coach';

  const allowedCategories = isNutritionist
    ? ['nutrition', 'race_nutrition']
    : isTrainer
      ? ['strength', 'endurance']
      : [];

  const t = (key: string) => {
    const translations: Record<string, { es: string; en: string }> = {
      title: { es: 'Mis Servicios', en: 'My Services' },
      subtitle: { es: 'Crea y gestiona tus servicios profesionales', en: 'Create and manage your professional services' },
      newService: { es: 'Nuevo Servicio', en: 'New Service' },
      name: { es: 'Nombre', en: 'Name' },
      description: { es: 'Descripción', en: 'Description' },
      price: { es: 'Precio (€)', en: 'Price (€)' },
      category: { es: 'Categoría', en: 'Category' },
      billingCycle: { es: 'Facturación', en: 'Billing' },
      oneTime: { es: 'Pago único', en: 'One-time' },
      monthly: { es: 'Mensual', en: 'Monthly' },
      yearly: { es: 'Anual', en: 'Yearly' },
      features: { es: 'Características (una por línea)', en: 'Features (one per line)' },
      imageUrl: { es: 'URL de imagen (opcional)', en: 'Image URL (optional)' },
      save: { es: 'Guardar', en: 'Save' },
      cancel: { es: 'Cancelar', en: 'Cancel' },
      edit: { es: 'Editar', en: 'Edit' },
      delete: { es: 'Eliminar', en: 'Delete' },
      publish: { es: 'Publicar', en: 'Publish' },
      unpublish: { es: 'Ocultar', en: 'Unpublish' },
      published: { es: 'Publicado', en: 'Published' },
      hidden: { es: 'Oculto', en: 'Hidden' },
      noServices: { es: 'No tienes servicios creados aún', en: 'No services created yet' },
      noServicesDesc: { es: 'Crea tu primer servicio para que los atletas puedan contratarlo', en: 'Create your first service so athletes can subscribe' },
      saving: { es: 'Guardando...', en: 'Saving...' },
      namePlaceholder: { es: 'Ej: Coaching de Fuerza', en: 'E.g. Strength Coaching' },
      descPlaceholder: { es: 'Describe tu servicio...', en: 'Describe your service...' },
      featuresPlaceholder: { es: 'Plan personalizado\nSesiones semanales\nAnálisis de progreso', en: 'Personalized plan\nWeekly sessions\nProgress analysis' },
      deleteConfirm: { es: '¿Eliminar este servicio?', en: 'Delete this service?' },
      errorSave: { es: 'Error al guardar', en: 'Error saving' },
      errorDelete: { es: 'Error al eliminar', en: 'Error deleting' },
      strength: { es: 'Fuerza', en: 'Strength' },
      nutrition: { es: 'Nutrición', en: 'Nutrition' },
      endurance: { es: 'Resistencia', en: 'Endurance' },
      race_nutrition: { es: 'Nutrición de Carrera', en: 'Race Nutrition' },
      notAllowed: { es: 'No tienes permiso para gestionar servicios', en: 'You do not have permission to manage services' },
      paymentLink: { es: 'Link de pago externo (Mercado Pago, PayPal, etc.)', en: 'External payment link (Mercado Pago, PayPal, etc.)' },
      paymentInstructions: { es: 'Instrucciones de pago manual (transferencia, CBU, etc.)', en: 'Manual payment instructions (bank transfer, CBU, etc.)' },
      paymentMethod: { es: 'Método de pago', en: 'Payment method' },
      manualLink: { es: 'Link externo', en: 'External link' },
      manualInstructions: { es: 'Instrucciones manuales', en: 'Manual instructions' },
      stripe: { es: 'Stripe', en: 'Stripe' },
      enrollments: { es: 'Inscripciones', en: 'Enrollments' },
      viewEnrollments: { es: 'Ver inscripciones', en: 'View enrollments' },
      athlete: { es: 'Atleta', en: 'Athlete' },
      service: { es: 'Servicio', en: 'Service' },
      status: { es: 'Estado', en: 'Status' },
      paymentStatus: { es: 'Estado de pago', en: 'Payment status' },
      confirmPayment: { es: 'Confirmar pago', en: 'Confirm payment' },
      markPaid: { es: 'Marcar como pagado', en: 'Mark as paid' },
      restrict: { es: 'Restringir', en: 'Restrict' },
      block: { es: 'Bloquear', en: 'Block' },
      restore: { es: 'Restaurar', en: 'Restore' },
      cancelEnroll: { es: 'Cancelar', en: 'Cancel' },
      noEnrollments: { es: 'No hay inscripciones aún', en: 'No enrollments yet' },
      pendingConfirmation: { es: 'Pago pendiente de confirmación', en: 'Payment pending confirmation' },
      paid: { es: 'Pagado', en: 'Paid' },
      active: { es: 'Activo', en: 'Active' },
      pending_payment: { es: 'Pago pendiente', en: 'Pending payment' },
      restricted: { es: 'Restringido', en: 'Restricted' },
      blocked: { es: 'Bloqueado', en: 'Blocked' },
      cancelled: { es: 'Cancelado', en: 'Cancelled' },
      none: { es: 'Sin pago', en: 'No payment' },
      overdue: { es: 'Vencido', en: 'Overdue' },
      available: { es: 'Disponible', en: 'Available' },
      payment_due: { es: 'Pago vencido', en: 'Payment due' },
      sendReminder: { es: 'Enviar recordatorio', en: 'Send reminder' },
      reminderSent: { es: 'Recordatorio enviado', en: 'Reminder sent' },
    };
    return translations[key]?.[language] || key;
  };

  const loadProducts = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('professional_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error loading services:', error);
    }
    setProducts(data || []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    if (profile && (isTrainer || isNutritionist)) {
      loadProducts();
    }
  }, [profile, isTrainer, isNutritionist, loadProducts]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'one_time' as 'one_time' | 'monthly' | 'yearly',
    category: allowedCategories[0] || 'strength',
    features: '',
    image_url: '',
    payment_link: '',
    payment_instructions: '',
    payment_method: 'manual_link' as 'manual_link' | 'manual_instructions' | 'stripe',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !profile?.id) return;
    setSaving(true);
    const featuresArr = formData.features
      ? formData.features.split('\n').map(f => f.trim()).filter(Boolean)
      : [];

    const { error } = await supabase.from('stripe_products').insert({
      name: formData.name,
      description: formData.description,
      type: 'coaching',
      price: parseFloat(formData.price),
      billing_cycle: formData.billing_cycle,
      features: featuresArr,
      is_active: true,
      created_by: profile.id,
      professional_id: profile.id,
      trainer_name: profile.full_name || null,
      trainer_email: profile.email || null,
      category: formData.category,
      image_url: formData.image_url || null,
      payment_link: formData.payment_link || null,
      payment_instructions: formData.payment_instructions || null,
      payment_method: formData.payment_method,
      deliverables: [],
    });

    if (error) {
      alert(t('errorSave') + ': ' + error.message);
    } else {
      setShowForm(false);
      setFormData({ name: '', description: '', price: '', billing_cycle: 'one_time', category: allowedCategories[0] || 'strength', features: '', image_url: '', payment_link: '', payment_instructions: '', payment_method: 'manual_link' });
      loadProducts();
    }
    setSaving(false);
  };

  const startEdit = (product: ServiceProduct) => {
    setEditingId(product.id);
    setEditData({
      name: product.name,
      description: product.description,
      price: product.price,
      features: (product.features || []).join('\n'),
      is_active: product.is_active,
      image_url: product.image_url || '',
      billing_cycle: product.billing_cycle,
      category: product.category || '',
      payment_link: product.payment_link || '',
      payment_instructions: product.payment_instructions || '',
      payment_method: product.payment_method || 'manual_link',
    });
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    const updates: Record<string, unknown> = {};
    if (editData.name !== undefined) updates.name = editData.name;
    if (editData.description !== undefined) updates.description = editData.description;
    if (editData.price !== undefined) updates.price = editData.price;
    if (editData.features !== undefined) {
      updates.features = typeof editData.features === 'string'
        ? editData.features.split('\n').map(f => f.trim()).filter(Boolean)
        : editData.features;
    }
    if (editData.is_active !== undefined) updates.is_active = editData.is_active;
    if (editData.image_url !== undefined) updates.image_url = editData.image_url;
    if (editData.billing_cycle !== undefined) updates.billing_cycle = editData.billing_cycle;
    if (editData.category !== undefined) updates.category = editData.category;
    if (editData.payment_link !== undefined) updates.payment_link = editData.payment_link || null;
    if (editData.payment_instructions !== undefined) updates.payment_instructions = editData.payment_instructions || null;
    if (editData.payment_method !== undefined) updates.payment_method = editData.payment_method;

    const { error } = await supabase.from('stripe_products').update(updates).eq('id', id);
    if (error) {
      alert(t('errorSave') + ': ' + error.message);
    } else {
      setEditingId(null);
      setEditData({});
      loadProducts();
    }
    setSaving(false);
  };

  const handleToggleActive = async (product: ServiceProduct) => {
    await supabase
      .from('stripe_products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    const { error } = await supabase.from('stripe_products').delete().eq('id', id);
    if (error) {
      alert(t('errorDelete') + ': ' + error.message);
    } else {
      loadProducts();
    }
  };

  const loadEnrollments = useCallback(async () => {
    if (!profile?.id) return;
    setEnrollmentsLoading(true);
    const { data } = await supabase
      .from('service_enrollments')
      .select(`
        id, athlete_id, service_id, professional_id, status, payment_status,
        athlete_payment_confirmed, professional_payment_confirmed, confirmed_at, activated_at, created_at,
        athlete:profiles!service_enrollments_athlete_id_fkey(full_name, email),
        service:stripe_products!service_enrollments_service_id_fkey(name)
      `)
      .eq('professional_id', profile.id)
      .order('created_at', { ascending: false });
    const mapped: Enrollment[] = (data || []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      athlete_id: e.athlete_id as string,
      service_id: e.service_id as string,
      professional_id: e.professional_id as string,
      status: e.status as string,
      payment_status: e.payment_status as string,
      athlete_payment_confirmed: e.athlete_payment_confirmed as boolean,
      professional_payment_confirmed: e.professional_payment_confirmed as boolean,
      confirmed_at: e.confirmed_at as string | null,
      activated_at: e.activated_at as string | null,
      athlete_name: (e.athlete as Record<string, string> | null)?.full_name || null,
      athlete_email: (e.athlete as Record<string, string> | null)?.email || null,
      service_name: (e.service as Record<string, string> | null)?.name || null,
      created_at: e.created_at as string,
    }));
    setEnrollments(mapped);
    setEnrollmentsLoading(false);
  }, [profile?.id]);

  const handleConfirmPayment = async (enrollmentId: string) => {
    await supabase.from('service_enrollments').update({
      payment_status: 'paid',
      professional_payment_confirmed: true,
      confirmed_at: new Date().toISOString(),
      status: 'active',
      activated_at: new Date().toISOString(),
    }).eq('id', enrollmentId);
    loadEnrollments();
  };

  const handleUpdateEnrollmentStatus = async (enrollmentId: string, newStatus: string) => {
    await supabase.from('service_enrollments').update({ status: newStatus }).eq('id', enrollmentId);
    loadEnrollments();
  };

  const handleSendReminder = async (enrollment: Enrollment) => {
    await supabase.from('notifications').insert({
      user_id: enrollment.athlete_id,
      title: language === 'es' ? 'Recordatorio de pago' : 'Payment reminder',
      body: language === 'es'
        ? `Tu pago para "${enrollment.service_name}" está pendiente. Por favor completa el pago.`
        : `Your payment for "${enrollment.service_name}" is pending. Please complete the payment.`,
      type: 'payment_reminder',
    });
    alert(t('reminderSent'));
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    pending_payment: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    restricted: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    blocked: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
    available: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    payment_due: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };

  if (!isTrainer && !isNutritionist) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">{t('notAllowed')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-gray-900 rounded-xl font-semibold text-sm hover:bg-yellow-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('newService')}
        </button>
      </div>

      {/* Enrollments management */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => {
            if (!showEnrollments) loadEnrollments();
            setShowEnrollments(!showEnrollments);
          }}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#514163]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#514163] dark:text-purple-300" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('enrollments')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('viewEnrollments')}</p>
            </div>
          </div>
          {showEnrollments ? <X className="w-5 h-5 text-gray-400" /> : <Plus className="w-5 h-5 text-gray-400" />}
        </button>
        {showEnrollments && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-5">
            {enrollmentsLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#fdda36] mx-auto" />
              </div>
            ) : enrollments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t('noEnrollments')}</p>
            ) : (
              <div className="space-y-3">
                {enrollments.map(enr => (
                  <div key={enr.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{enr.athlete_name || enr.athlete_email || '—'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{enr.service_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[enr.status] || 'bg-gray-100 text-gray-500'}`}>
                        {t(enr.status)}
                      </span>
                      {enr.athlete_payment_confirmed && !enr.professional_payment_confirmed && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {t('pendingConfirmation')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {enr.athlete_payment_confirmed && !enr.professional_payment_confirmed && (
                        <button onClick={() => handleConfirmPayment(enr.id)}
                          className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 transition-colors"
                          title={t('confirmPayment')}>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {enr.status !== 'active' && enr.athlete_payment_confirmed && enr.professional_payment_confirmed && (
                        <button onClick={() => handleUpdateEnrollmentStatus(enr.id, 'active')}
                          className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 transition-colors"
                          title={t('restore')}>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {enr.status === 'active' && (
                        <button onClick={() => handleUpdateEnrollmentStatus(enr.id, 'restricted')}
                          className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400 transition-colors"
                          title={t('restrict')}>
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                      {enr.status !== 'blocked' && (
                        <button onClick={() => handleUpdateEnrollmentStatus(enr.id, 'blocked')}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                          title={t('block')}>
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {enr.status === 'pending_payment' && (
                        <button onClick={() => handleSendReminder(enr)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                          title={t('sendReminder')}>
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('newService')}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('name')} *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                placeholder={t('namePlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('category')} *</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                {allowedCategories.map(cat => (
                  <option key={cat} value={cat}>{t(cat)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('price')} *</label>
              <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                placeholder="49.99" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('billingCycle')}</label>
              <select value={formData.billing_cycle} onChange={e => setFormData({ ...formData, billing_cycle: e.target.value as typeof formData.billing_cycle })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                <option value="one_time">{t('oneTime')}</option>
                <option value="monthly">{t('monthly')}</option>
                <option value="yearly">{t('yearly')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('description')}</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 resize-none"
              rows={3} placeholder={t('descPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('features')}</label>
            <textarea value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 resize-none"
              rows={3} placeholder={t('featuresPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('imageUrl')}</label>
            <input type="url" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
              placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('paymentMethod')}</label>
            <select value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value as typeof formData.payment_method })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
              <option value="manual_link">{t('manualLink')}</option>
              <option value="manual_instructions">{t('manualInstructions')}</option>
            </select>
          </div>
          {formData.payment_method === 'manual_link' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('paymentLink')}</label>
              <input type="url" value={formData.payment_link} onChange={e => setFormData({ ...formData, payment_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                placeholder="https://mpago.la/..." />
            </div>
          )}
          {formData.payment_method === 'manual_instructions' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('paymentInstructions')}</label>
              <textarea value={formData.payment_instructions} onChange={e => setFormData({ ...formData, payment_instructions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 resize-none"
                rows={3} placeholder={language === 'es' ? 'CBU: 0000003100000000000000\nAlias: ASCIENDE.PROFESIONAL\nBanco: Galicia' : 'CBU: 0000003100000000000000\nAlias: ASCIENDE.PROFESIONAL\nBank: Galicia'} />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">
              {t('cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#3d2f4d] disabled:opacity-50 text-sm flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      )}

      {/* Products list */}
      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#fdda36] mx-auto" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">{t('noServices')}</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('noServicesDesc')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#fdda36] text-[#514163] rounded-lg font-semibold text-sm hover:bg-[#ffd51a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('newService')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(product => {
            const Icon = CATEGORY_ICONS[product.category || 'strength'] || Package;
            const colorClass = CATEGORY_COLORS[product.category || 'strength'] || 'bg-gray-100 dark:bg-gray-700 text-gray-600';
            const isEditing = editingId === product.id;

            return (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {isEditing ? (
                  /* Edit mode */
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('edit')}</h3>
                      <button onClick={() => { setEditingId(null); setEditData({}); }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('name')}</label>
                        <input type="text" value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('price')}</label>
                        <input type="number" step="0.01" value={editData.price ?? ''} onChange={e => setEditData({ ...editData, price: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('billingCycle')}</label>
                        <select value={editData.billing_cycle || 'one_time'} onChange={e => setEditData({ ...editData, billing_cycle: e.target.value as 'one_time' | 'monthly' | 'yearly' })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                          <option value="one_time">{t('oneTime')}</option>
                          <option value="monthly">{t('monthly')}</option>
                          <option value="yearly">{t('yearly')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('imageUrl')}</label>
                        <input type="url" value={editData.image_url || ''} onChange={e => setEditData({ ...editData, image_url: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('description')}</label>
                      <textarea value={editData.description || ''} onChange={e => setEditData({ ...editData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 resize-none" rows={3} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('features')}</label>
                      <textarea value={typeof editData.features === 'string' ? editData.features : ''} onChange={e => setEditData({ ...editData, features: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 resize-none" rows={3} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('paymentMethod')}</label>
                      <select value={editData.payment_method || 'manual_link'} onChange={e => setEditData({ ...editData, payment_method: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                        <option value="manual_link">{t('manualLink')}</option>
                        <option value="manual_instructions">{t('manualInstructions')}</option>
                      </select>
                    </div>
                    {editData.payment_method === 'manual_link' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('paymentLink')}</label>
                        <input type="url" value={editData.payment_link || ''} onChange={e => setEditData({ ...editData, payment_link: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                          placeholder="https://mpago.la/..." />
                      </div>
                    )}
                    {editData.payment_method === 'manual_instructions' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('paymentInstructions')}</label>
                        <textarea value={editData.payment_instructions || ''} onChange={e => setEditData({ ...editData, payment_instructions: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 resize-none" rows={3} />
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => { setEditingId(null); setEditData({}); }}
                        className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">
                        {t('cancel')}
                      </button>
                      <button onClick={() => handleSaveEdit(product.id)} disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#3d2f4d] disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{product.name}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                            {product.is_active ? t('published') : t('hidden')}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{product.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            €{product.price}
                            {product.billing_cycle === 'monthly' && `/${language === 'es' ? 'mes' : 'mo'}`}
                            {product.billing_cycle === 'yearly' && `/${language === 'es' ? 'año' : 'yr'}`}
                          </span>
                          {product.features && product.features.length > 0 && (
                            <span className="text-xs text-gray-400">{product.features.length} {language === 'es' ? 'características' : 'features'}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleToggleActive(product)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          title={product.is_active ? t('unpublish') : t('publish')}>
                          {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => startEdit(product)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          title={t('edit')}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                          title={t('delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
