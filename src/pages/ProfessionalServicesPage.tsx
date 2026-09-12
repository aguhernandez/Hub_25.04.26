import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Package, DollarSign, Trash2, Pencil, X, Save,
  Dumbbell, Salad, Bike, Flag, Eye, EyeOff, Loader2, Check,
  Link2, FileText, Users, CheckCircle, Clock, Ban, AlertCircle,
  Bell, Gift, CreditCard, ChevronDown, ChevronUp, User,
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

interface AthleteRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  sport: string | null;
  enrollments: Enrollment[];
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
  const [activeTab, setActiveTab] = useState<'services' | 'athletes'>('athletes');
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ServiceProduct>>({});
  const [saving, setSaving] = useState(false);
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [athletesLoading, setAthletesLoading] = useState(false);
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [giftModal, setGiftModal] = useState<{ athleteId: string; athleteName: string } | null>(null);
  const [reminderSent, setReminderSent] = useState<string | null>(null);
  const [notifyModal, setNotifyModal] = useState<{ athleteId: string; athleteName: string } | null>(null);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [notifySent, setNotifySent] = useState(false);

  const isNutritionist = profile?.role === 'nutritionist';
  const isTrainer = profile?.role === 'trainer' || profile?.role === 'head_coach';

  const allowedCategories = isNutritionist
    ? ['nutrition', 'race_nutrition']
    : isTrainer
      ? ['strength', 'endurance']
      : [];

  const t = (key: string) => {
    const translations: Record<string, { es: string; en: string }> = {
      services: { es: 'Mis Servicios', en: 'My Services' },
      athletes: { es: 'Mis Atletas', en: 'My Athletes' },
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
      confirmPayment: { es: 'Confirmar pago recibido', en: 'Confirm payment received' },
      markPaid: { es: 'Marcar como pagado', en: 'Mark as paid' },
      restrict: { es: 'Restringir acceso', en: 'Restrict access' },
      block: { es: 'Bloquear', en: 'Block' },
      restore: { es: 'Restaurar acceso', en: 'Restore access' },
      cancelEnroll: { es: 'Cancelar inscripción', en: 'Cancel enrollment' },
      noEnrollments: { es: 'Sin inscripciones activas', en: 'No active enrollments' },
      noAthletes: { es: 'No tienes atletas asignados aún', en: 'No athletes assigned yet' },
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
      sendReminder: { es: 'Enviar recordatorio de pago', en: 'Send payment reminder' },
      reminderSent: { es: 'Recordatorio enviado', en: 'Reminder sent' },
      sendNotification: { es: 'Enviar notificación', en: 'Send notification' },
      giftService: { es: 'Regalar servicio', en: 'Gift service' },
      requestPayment: { es: 'Solicitar pago', en: 'Request payment' },
      noService: { es: 'Sin servicio activo', en: 'No active service' },
      giftTitle: { es: 'Regalar servicio a', en: 'Gift service to' },
      giftConfirm: { es: 'Regalar gratis', en: 'Gift for free' },
      gifted: { es: 'Servicio regalado', en: 'Service gifted' },
    };
    return translations[key]?.[language] || key;
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

  const loadProducts = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('professional_id', profile.id)
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  }, [profile?.id]);

  const loadAthletes = useCallback(async () => {
    if (!profile?.id) return;
    setAthletesLoading(true);

    const field = profile.role === 'nutritionist' ? 'assigned_nutritionist_id' : 'assigned_trainer_id';
    const [{ data: directAthletes }, { data: enrollmentData }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, avatar_url, sport').eq(field, profile.id).eq('role', 'athlete'),
      supabase
        .from('service_enrollments')
        .select(`
          id, athlete_id, service_id, professional_id, status, payment_status,
          athlete_payment_confirmed, professional_payment_confirmed, confirmed_at, activated_at, created_at,
          athlete:profiles!service_enrollments_athlete_id_fkey(full_name, email),
          service:stripe_products!service_enrollments_service_id_fkey(name)
        `)
        .eq('professional_id', profile.id)
        .order('created_at', { ascending: false }),
    ]);

    const enrollmentsByAthlete = new Map<string, Enrollment[]>();
    (enrollmentData || []).forEach((e: any) => {
      const enr: Enrollment = {
        id: e.id,
        athlete_id: e.athlete_id,
        service_id: e.service_id,
        professional_id: e.professional_id,
        status: e.status,
        payment_status: e.payment_status,
        athlete_payment_confirmed: e.athlete_payment_confirmed,
        professional_payment_confirmed: e.professional_payment_confirmed,
        confirmed_at: e.confirmed_at,
        activated_at: e.activated_at,
        athlete_name: e.athlete?.full_name || null,
        athlete_email: e.athlete?.email || null,
        service_name: e.service?.name || null,
        created_at: e.created_at,
      };
      const list = enrollmentsByAthlete.get(e.athlete_id) || [];
      list.push(enr);
      enrollmentsByAthlete.set(e.athlete_id, list);
    });

    const rows: AthleteRow[] = (directAthletes || []).map(a => ({
      id: a.id,
      full_name: a.full_name,
      email: a.email,
      avatar_url: a.avatar_url,
      sport: a.sport,
      enrollments: enrollmentsByAthlete.get(a.id) || [],
    }));

    // Include athletes that have enrollments but aren't in directAthletes
    enrollmentsByAthlete.forEach((enrs, athleteId) => {
      if (!rows.find(r => r.id === athleteId)) {
        const first = enrs[0];
        rows.push({
          id: athleteId,
          full_name: first.athlete_name,
          email: first.athlete_email,
          avatar_url: null,
          sport: null,
          enrollments: enrs,
        });
      }
    });

    setAthletes(rows);
    setAthletesLoading(false);
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    if (!profile || (!isTrainer && !isNutritionist)) return;
    loadProducts();
    loadAthletes();
  }, [profile, isTrainer, isNutritionist, loadProducts, loadAthletes]);

  const [formData, setFormData] = useState({
    name: '', description: '', price: '',
    billing_cycle: 'one_time' as 'one_time' | 'monthly' | 'yearly',
    category: allowedCategories[0] || 'strength',
    features: '', image_url: '', payment_link: '', payment_instructions: '',
    payment_method: 'manual_link' as 'manual_link' | 'manual_instructions' | 'stripe',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !profile?.id) return;
    setSaving(true);
    const featuresArr = formData.features ? formData.features.split('\n').map(f => f.trim()).filter(Boolean) : [];
    const { error } = await supabase.from('stripe_products').insert({
      name: formData.name, description: formData.description, type: 'coaching',
      price: parseFloat(formData.price), billing_cycle: formData.billing_cycle,
      features: featuresArr, is_active: true, created_by: profile.id, professional_id: profile.id,
      trainer_name: profile.full_name || null, trainer_email: profile.email || null,
      category: formData.category, image_url: formData.image_url || null,
      payment_link: formData.payment_link || null,
      payment_instructions: formData.payment_instructions || null,
      payment_method: formData.payment_method, deliverables: [],
    });
    if (error) alert(t('errorSave') + ': ' + error.message);
    else {
      setShowForm(false);
      setFormData({ name: '', description: '', price: '', billing_cycle: 'one_time', category: allowedCategories[0] || 'strength', features: '', image_url: '', payment_link: '', payment_instructions: '', payment_method: 'manual_link' });
      loadProducts();
    }
    setSaving(false);
  };

  const startEdit = (product: ServiceProduct) => {
    setEditingId(product.id);
    setEditData({
      name: product.name, description: product.description, price: product.price,
      features: (product.features || []).join('\n'), is_active: product.is_active,
      image_url: product.image_url || '', billing_cycle: product.billing_cycle,
      category: product.category || '', payment_link: product.payment_link || '',
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
    if (error) alert(t('errorSave') + ': ' + error.message);
    else { setEditingId(null); setEditData({}); loadProducts(); }
    setSaving(false);
  };

  const handleToggleActive = async (product: ServiceProduct) => {
    await supabase.from('stripe_products').update({ is_active: !product.is_active }).eq('id', product.id);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    const { error } = await supabase.from('stripe_products').delete().eq('id', id);
    if (error) alert(t('errorDelete') + ': ' + error.message);
    else loadProducts();
  };

  const handleConfirmPayment = async (enrollmentId: string) => {
    setActionLoading(enrollmentId);
    await supabase.from('service_enrollments').update({
      payment_status: 'paid', professional_payment_confirmed: true,
      confirmed_at: new Date().toISOString(), status: 'active', activated_at: new Date().toISOString(),
    }).eq('id', enrollmentId);
    await loadAthletes();
    setActionLoading(null);
  };

  const handleUpdateEnrollmentStatus = async (enrollmentId: string, newStatus: string) => {
    setActionLoading(enrollmentId);
    await supabase.from('service_enrollments').update({ status: newStatus }).eq('id', enrollmentId);
    await loadAthletes();
    setActionLoading(null);
  };

  const handleSendReminder = async (enrollment: Enrollment) => {
    setActionLoading(enrollment.id + '_reminder');
    await supabase.from('notifications').insert({
      user_id: enrollment.athlete_id,
      title: language === 'es' ? 'Recordatorio de pago' : 'Payment reminder',
      body: language === 'es'
        ? `Tu pago para "${enrollment.service_name}" está pendiente. Por favor completa el pago.`
        : `Your payment for "${enrollment.service_name}" is pending. Please complete the payment.`,
      type: 'payment_reminder',
    });
    setReminderSent(enrollment.id);
    setTimeout(() => setReminderSent(null), 3000);
    setActionLoading(null);
  };

  const handleSendNotification = async () => {
    if (!notifyModal || !notifyMessage.trim()) return;
    setNotifySending(true);
    const { error } = await supabase.from('notifications').insert({
      user_id: notifyModal.athleteId,
      title: language === 'es' ? 'Mensaje de tu entrenador' : 'Message from your coach',
      body: notifyMessage.trim(),
      type: 'coach_message',
    });
    setNotifySending(false);
    if (!error) {
      setNotifySent(true);
      setTimeout(() => {
        setNotifySent(false);
        setNotifyModal(null);
        setNotifyMessage('');
      }, 1500);
    }
  };

  const handleRequestPayment = async (athlete: AthleteRow, enrollment: Enrollment) => {
    await supabase.from('notifications').insert({
      user_id: athlete.id,
      title: language === 'es' ? 'Solicitud de pago' : 'Payment request',
      body: language === 'es'
        ? `Tu entrenador solicita el pago de "${enrollment.service_name}". Por favor completa el pago.`
        : `Your coach is requesting payment for "${enrollment.service_name}". Please complete the payment.`,
      type: 'payment_request',
    });
    setReminderSent(enrollment.id + '_req');
    setTimeout(() => setReminderSent(null), 3000);
  };

  const handleGiftService = async (athleteId: string, serviceId: string) => {
    if (!profile?.id) return;
    setActionLoading('gift_' + athleteId);
    const { error } = await supabase.from('service_enrollments').insert({
      athlete_id: athleteId,
      service_id: serviceId,
      professional_id: profile.id,
      status: 'active',
      payment_status: 'paid',
      athlete_payment_confirmed: true,
      professional_payment_confirmed: true,
      confirmed_at: new Date().toISOString(),
      activated_at: new Date().toISOString(),
      payment_method: 'gift',
    });
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: athleteId,
        title: language === 'es' ? '¡Servicio regalado!' : 'Service gifted!',
        body: language === 'es'
          ? 'Tu entrenador te ha regalado un servicio. ¡Ya está activo!'
          : 'Your coach has gifted you a service. It is now active!',
        type: 'gift',
      });
      await loadAthletes();
    }
    setGiftModal(null);
    setActionLoading(null);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeTab === 'athletes' ? t('athletes') : t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {activeTab === 'athletes'
              ? (language === 'es' ? 'Gestiona tus atletas, inscripciones y cobros' : 'Manage your athletes, enrollments and billing')
              : t('subtitle')}
          </p>
        </div>
        {activeTab === 'services' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-gray-900 rounded-xl font-semibold text-sm hover:bg-yellow-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('newService')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'athletes', label: t('athletes'), icon: Users },
            { id: 'services', label: t('services'), icon: Package },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'athletes' | 'services')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-gray-900 dark:text-white border-b-2 border-[#514163] dark:border-[#fdda36]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'athletes' && athletes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300">
                  {athletes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Athletes Tab ── */}
        {activeTab === 'athletes' && (
          <div className="p-5">
            {athletesLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-7 h-7 animate-spin text-[#fdda36] mx-auto" />
              </div>
            ) : athletes.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-14 h-14 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">{t('noAthletes')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {athletes.map(athlete => {
                  const isExpanded = expandedAthleteId === athlete.id;
                  const activeEnr = athlete.enrollments.find(e => e.status === 'active');
                  const pendingEnr = athlete.enrollments.find(e => e.status === 'pending_payment');
                  const latestEnr = activeEnr || pendingEnr || athlete.enrollments[0] || null;

                  return (
                    <div key={athlete.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                      {/* Athlete header row */}
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#514163] to-[#fdda36] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(athlete.full_name || athlete.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {athlete.full_name || athlete.email || '—'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{athlete.email}</p>
                        </div>

                        {/* Status pill */}
                        {latestEnr ? (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusColors[latestEnr.status] || 'bg-gray-100 text-gray-500'}`}>
                            {t(latestEnr.status)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 flex-shrink-0">
                            {t('noService')}
                          </span>
                        )}

                        {/* Quick actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Notify */}
                          <button
                            onClick={() => { setNotifyModal({ athleteId: athlete.id, athleteName: athlete.full_name || athlete.email || '' }); setNotifyMessage(''); setNotifySent(false); }}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title={t('sendNotification')}
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                          {/* Gift */}
                          <button
                            onClick={() => setGiftModal({ athleteId: athlete.id, athleteName: athlete.full_name || athlete.email || '' })}
                            className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            title={t('giftService')}
                          >
                            <Gift className="w-4 h-4" />
                          </button>
                          {/* Request payment */}
                          {latestEnr && latestEnr.status === 'pending_payment' && (
                            <button
                              onClick={() => handleRequestPayment(athlete, latestEnr)}
                              className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              title={t('requestPayment')}
                            >
                              {reminderSent === latestEnr.id + '_req' ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <CreditCard className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {/* Expand */}
                          <button
                            onClick={() => setExpandedAthleteId(isExpanded ? null : athlete.id)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-400 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded enrollments */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-600 px-4 pb-4 pt-3 space-y-3">
                          {athlete.enrollments.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-2">{t('noEnrollments')}</p>
                          ) : (
                            athlete.enrollments.map(enr => (
                              <div key={enr.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{enr.service_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[enr.status] || 'bg-gray-100 text-gray-500'}`}>
                                      {t(enr.status)}
                                    </span>
                                    {enr.athlete_payment_confirmed && !enr.professional_payment_confirmed && (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {t('pendingConfirmation')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {actionLoading === enr.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                  ) : (
                                    <>
                                      {/* Confirm payment */}
                                      {enr.athlete_payment_confirmed && !enr.professional_payment_confirmed && (
                                        <button onClick={() => handleConfirmPayment(enr.id)}
                                          className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors flex items-center gap-1"
                                          title={t('confirmPayment')}>
                                          <CheckCircle className="w-3.5 h-3.5" /> {t('confirmPayment')}
                                        </button>
                                      )}
                                      {/* Send reminder */}
                                      {enr.status === 'pending_payment' && (
                                        <button onClick={() => handleSendReminder(enr)}
                                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                                          title={t('sendReminder')}>
                                          {reminderSent === enr.id ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Bell className="w-4 h-4" />}
                                        </button>
                                      )}
                                      {/* Restrict */}
                                      {enr.status === 'active' && (
                                        <button onClick={() => handleUpdateEnrollmentStatus(enr.id, 'restricted')}
                                          className="p-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400 transition-colors"
                                          title={t('restrict')}>
                                          <AlertCircle className="w-4 h-4" />
                                        </button>
                                      )}
                                      {/* Restore */}
                                      {(enr.status === 'restricted' || enr.status === 'blocked') && (
                                        <button onClick={() => handleUpdateEnrollmentStatus(enr.id, 'active')}
                                          className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 transition-colors"
                                          title={t('restore')}>
                                          <CheckCircle className="w-4 h-4" />
                                        </button>
                                      )}
                                      {/* Block */}
                                      {enr.status !== 'blocked' && enr.status !== 'cancelled' && (
                                        <button onClick={() => handleUpdateEnrollmentStatus(enr.id, 'blocked')}
                                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                          title={t('block')}>
                                          <Ban className="w-4 h-4" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Services Tab ── */}
        {activeTab === 'services' && (
          <div className="p-5">
            {/* Create form */}
            {showForm && (
              <form onSubmit={handleCreate} className="mb-5 space-y-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('newService')}</h3>
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
                      {allowedCategories.map(cat => <option key={cat} value={cat}>{t(cat)}</option>)}
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
                    rows={2} placeholder={t('descPlaceholder')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('features')}</label>
                  <textarea value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 resize-none"
                    rows={3} placeholder={t('featuresPlaceholder')} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      rows={3} />
                  </div>
                )}
                <div className="flex gap-3 pt-1">
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
              <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-[#fdda36] mx-auto" /></div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-14 h-14 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">{t('noServices')}</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('noServicesDesc')}</p>
                <button onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#fdda36] text-[#514163] rounded-lg font-semibold text-sm hover:bg-[#ffd51a] transition-colors">
                  <Plus className="w-4 h-4" />{t('newService')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map(product => {
                  const Icon = CATEGORY_ICONS[product.category || 'strength'] || Package;
                  const colorClass = CATEGORY_COLORS[product.category || 'strength'] || 'bg-gray-100 dark:bg-gray-700 text-gray-600';
                  const isEditing = editingId === product.id;
                  return (
                    <div key={product.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                      {isEditing ? (
                        <div className="p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('edit')}</h3>
                            <button onClick={() => { setEditingId(null); setEditData({}); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
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
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('paymentMethod')}</label>
                              <select value={editData.payment_method || 'manual_link'} onChange={e => setEditData({ ...editData, payment_method: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                                <option value="manual_link">{t('manualLink')}</option>
                                <option value="manual_instructions">{t('manualInstructions')}</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('description')}</label>
                            <textarea value={editData.description || ''} onChange={e => setEditData({ ...editData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 resize-none" rows={2} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('features')}</label>
                            <textarea value={typeof editData.features === 'string' ? editData.features : ''} onChange={e => setEditData({ ...editData, features: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 resize-none" rows={3} />
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
                          <div className="flex gap-3 pt-1">
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
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{product.name}</h3>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                  {product.is_active ? t('published') : t('hidden')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-base font-bold text-gray-900 dark:text-white">
                                  €{product.price}{product.billing_cycle === 'monthly' ? `/${language === 'es' ? 'mes' : 'mo'}` : product.billing_cycle === 'yearly' ? `/${language === 'es' ? 'año' : 'yr'}` : ''}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => handleToggleActive(product)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors" title={product.is_active ? t('unpublish') : t('publish')}>
                                {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button onClick={() => startEdit(product)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors" title={t('edit')}>
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(product.id)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-600 transition-colors" title={t('delete')}>
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
        )}
      </div>

      {/* Notification Modal */}
      {notifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNotifyModal(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">{t('sendNotification')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{notifyModal.athleteName}</p>
              </div>
            </div>
            <textarea
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              rows={4}
              autoFocus
              placeholder={language === 'es' ? 'Escribe tu mensaje...' : 'Write your message...'}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNotifyModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {t('cancel')}
              </button>
              <button onClick={handleSendNotification} disabled={!notifyMessage.trim() || notifySending}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {notifySending ? <Loader2 className="w-4 h-4 animate-spin" /> : notifySent ? <CheckCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {notifySent ? (language === 'es' ? '¡Enviado!' : 'Sent!') : notifySending ? (language === 'es' ? 'Enviando...' : 'Sending...') : (language === 'es' ? 'Enviar' : 'Send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gift Service Modal */}
      {giftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setGiftModal(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">{t('giftTitle')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{giftModal.athleteName}</p>
              </div>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">{t('noServices')}</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {products.filter(p => p.is_active).map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleGiftService(giftModal.athleteId, p.id)}
                    disabled={actionLoading === 'gift_' + giftModal.athleteId}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</span>
                    <span className="text-xs text-gray-500">€{p.price} → {language === 'es' ? 'Gratis' : 'Free'}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setGiftModal(null)}
              className="mt-4 w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
