import React, { useState, useEffect } from 'react';
import {
  Plus, Package, DollarSign, Calendar, Trash2, ExternalLink, Copy, Check,
  Dumbbell, Salad, Bike, Flag, Pencil, X, Save, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/AdminLayout';

interface StripeProduct {
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
  deliverables: unknown;
  features: string[] | null;
  is_active: boolean;
  trainer_name: string | null;
  trainer_email: string | null;
  category: string | null;
  image_url: string | null;
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

export default function AdminStripeProductsPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<StripeProduct>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'coaching' | 'other'>('coaching');

  const [showCoachingForm, setShowCoachingForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'program' as 'program' | 'membership' | 'coaching',
    price: '',
    duration_weeks: '',
    billing_cycle: 'one_time' as 'one_time' | 'monthly' | 'yearly',
    deliverables: '',
    trainer_name: '',
    trainer_email: '',
    category: 'strength',
    features: '',
    image_url: '',
  });

  const [newCoaching, setNewCoaching] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'one_time' as 'one_time' | 'monthly' | 'yearly',
    trainer_name: '',
    trainer_email: '',
    category: 'strength',
    features: '',
    image_url: '',
  });

  useEffect(() => {
    if (profile?.role === 'admin') loadProducts();
  }, [profile]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stripe_products')
      .select('*')
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const coachingProducts = products.filter(p => p.type === 'coaching');
  const otherProducts = products.filter(p => p.type !== 'coaching');

  const createProductInDatabase = async () => {
    if (!formData.name || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    let featuresArr: string[] = [];
    if (formData.features) {
      try {
        featuresArr = formData.features.split('\n').map(f => f.trim()).filter(Boolean);
      } catch {}
    }

    const { error } = await supabase.from('stripe_products').insert({
      name: formData.name,
      description: formData.description,
      type: formData.type,
      price: parseFloat(formData.price),
      duration_weeks: formData.duration_weeks ? parseInt(formData.duration_weeks) : null,
      billing_cycle: formData.billing_cycle,
      deliverables: formData.deliverables ? JSON.parse(formData.deliverables) : [],
      features: featuresArr,
      is_active: true,
      created_by: profile?.id,
      trainer_name: formData.type === 'coaching' ? formData.trainer_name : null,
      trainer_email: formData.type === 'coaching' ? formData.trainer_email : null,
      category: formData.type === 'coaching' ? formData.category : null,
      image_url: formData.type === 'coaching' && formData.image_url ? formData.image_url : null,
    });

    if (error) {
      alert('Error creating product: ' + error.message);
    } else {
      setShowForm(false);
      setFormData({ name: '', description: '', type: 'program', price: '', duration_weeks: '', billing_cycle: 'one_time', deliverables: '', trainer_name: '', trainer_email: '', category: 'strength', features: '', image_url: '' });
      loadProducts();
    }
  };

  const createCoachingPlan = async () => {
    if (!newCoaching.name || !newCoaching.price) {
      alert('Name and price are required');
      return;
    }
    const featuresArr = newCoaching.features
      ? newCoaching.features.split('\n').map(f => f.trim()).filter(Boolean)
      : [];

    const { error } = await supabase.from('stripe_products').insert({
      name: newCoaching.name,
      description: newCoaching.description,
      type: 'coaching',
      price: parseFloat(newCoaching.price),
      billing_cycle: newCoaching.billing_cycle,
      features: featuresArr,
      is_active: true,
      created_by: profile?.id,
      trainer_name: newCoaching.trainer_name || null,
      trainer_email: newCoaching.trainer_email || null,
      category: newCoaching.category,
      image_url: newCoaching.image_url || null,
      deliverables: [],
    });

    if (error) {
      alert('Error creating coaching plan: ' + error.message);
    } else {
      setShowCoachingForm(false);
      setNewCoaching({ name: '', description: '', price: '', billing_cycle: 'one_time', trainer_name: '', trainer_email: '', category: 'strength', features: '', image_url: '' });
      loadProducts();
    }
  };

  const saveEdit = async (id: string) => {
    const updates: Record<string, unknown> = {};
    if (editData.name !== undefined) updates.name = editData.name;
    if (editData.description !== undefined) updates.description = editData.description;
    if (editData.price !== undefined) updates.price = editData.price;
    if (editData.features !== undefined) updates.features = editData.features;
    if (editData.trainer_name !== undefined) updates.trainer_name = editData.trainer_name;
    if (editData.trainer_email !== undefined) updates.trainer_email = editData.trainer_email;
    if (editData.is_active !== undefined) updates.is_active = editData.is_active;
    if (editData.checkout_url !== undefined) updates.checkout_url = editData.checkout_url;
    if (editData.image_url !== undefined) updates.image_url = editData.image_url;

    const { error } = await supabase.from('stripe_products').update(updates).eq('id', id);
    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      setEditingId(null);
      setEditData({});
      loadProducts();
    }
  };

  const startEdit = (product: StripeProduct) => {
    setEditingId(product.id);
    setEditData({
      name: product.name,
      description: product.description,
      price: product.price,
      features: product.features || [],
      trainer_name: product.trainer_name || '',
      trainer_email: product.trainer_email || '',
      is_active: product.is_active,
      checkout_url: product.checkout_url || '',
      image_url: product.image_url || '',
    });
  };

  const createStripeProduct = async (product: StripeProduct) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-create-product`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            billing_cycle: product.billing_cycle,
          }),
        }
      );
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      alert('Stripe product created! Checkout URL copied.');
      if (result.checkout_url) navigator.clipboard.writeText(result.checkout_url);
      loadProducts();
    } catch (error: unknown) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await supabase.from('stripe_products').delete().eq('id', id);
    loadProducts();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (profile?.role !== 'admin') {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
    return null;
  }

  return (
    <AdminLayout currentPage="admin-stripe">
      <div className="space-y-8 max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products Manager</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage coaching plans, programs &amp; memberships</p>
          </div>
          {activeSection === 'other' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-gray-900 rounded-xl font-semibold text-sm hover:bg-yellow-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Product
            </button>
          )}
        </div>

        {/* Create form (programs/memberships) */}
        {showForm && activeSection === 'other' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Create New Product</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                  placeholder="e.g. 12-Week Program" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type *</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                  <option value="program">Program</option>
                  <option value="membership">Membership</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price (€) *</label>
                <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                  placeholder="89.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Billing Cycle</label>
                <select value={formData.billing_cycle} onChange={e => setFormData({ ...formData, billing_cycle: e.target.value as typeof formData.billing_cycle })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                  <option value="one_time">One Time</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                rows={3} placeholder="What's included..." />
            </div>
            <div className="flex gap-3">
              <button onClick={createProductInDatabase} className="px-5 py-2 bg-[#fdda36] text-gray-900 rounded-lg font-semibold text-sm hover:bg-yellow-300 transition-colors">
                Create
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Section toggle */}
        <div className="flex gap-2">
          {(['coaching', 'other'] as const).map(s => (
            <button key={s} onClick={() => { setActiveSection(s); setShowForm(false); setShowCoachingForm(false); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeSection === s
                  ? 'bg-[#fdda36] text-gray-900'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}>
              {s === 'coaching' ? `Coaching Plans (${coachingProducts.length})` : `Programs & Memberships (${otherProducts.length})`}
            </button>
          ))}
        </div>

        {/* Webhook URL */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 text-sm">Stripe Webhook URL</h4>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-gray-700 dark:text-gray-300 truncate">
              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook
            </code>
            <button onClick={() => copyToClipboard(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`, 'webhook')}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0">
              {copiedId === 'webhook' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
          </div>
        ) : (
          <>
            {/* ── COACHING PRODUCTS ───────────────────────────────────────── */}
            {activeSection === 'coaching' && (
              <div className="space-y-4">

                {/* New coaching plan header */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{coachingProducts.length} plan{coachingProducts.length !== 1 ? 's' : ''} available</p>
                  <button
                    onClick={() => setShowCoachingForm(!showCoachingForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-gray-900 rounded-xl font-semibold text-sm hover:bg-yellow-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Coaching Plan
                  </button>
                </div>

                {/* New coaching plan form */}
                {showCoachingForm && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#fdda36]/40 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">New Coaching Plan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plan Name *</label>
                        <input type="text" value={newCoaching.name} onChange={e => setNewCoaching({ ...newCoaching, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                          placeholder="e.g. Recovery & Mobility Plan" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                        <select value={newCoaching.category} onChange={e => setNewCoaching({ ...newCoaching, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                          <option value="strength">Strength</option>
                          <option value="nutrition">Nutrition</option>
                          <option value="endurance">Endurance</option>
                          <option value="race_nutrition">Race Nutrition</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price (€) *</label>
                        <input type="number" step="0.01" value={newCoaching.price} onChange={e => setNewCoaching({ ...newCoaching, price: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                          placeholder="89.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Billing Cycle</label>
                        <select value={newCoaching.billing_cycle} onChange={e => setNewCoaching({ ...newCoaching, billing_cycle: e.target.value as typeof newCoaching.billing_cycle })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400">
                          <option value="one_time">One Time</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Trainer Name</label>
                        <input type="text" value={newCoaching.trainer_name} onChange={e => setNewCoaching({ ...newCoaching, trainer_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                          placeholder="Agu Hernández" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Trainer Email</label>
                        <input type="email" value={newCoaching.trainer_email} onChange={e => setNewCoaching({ ...newCoaching, trainer_email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                          placeholder="agu@asciende.pro" />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                      <textarea value={newCoaching.description} onChange={e => setNewCoaching({ ...newCoaching, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                        rows={3} placeholder="Describe this coaching plan..." />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Features <span className="font-normal text-gray-400">(one per line)</span></label>
                      <textarea value={newCoaching.features} onChange={e => setNewCoaching({ ...newCoaching, features: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                        rows={4} placeholder={"Personalized program\nWeekly check-ins\nDirect messaging\nProgress tracking"} />
                    </div>
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Featured Image URL</label>
                      <input type="url" value={newCoaching.image_url} onChange={e => setNewCoaching({ ...newCoaching, image_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                        placeholder="https://images.unsplash.com/..." />
                      {newCoaching.image_url && (
                        <img src={newCoaching.image_url} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg opacity-80" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={createCoachingPlan} className="px-5 py-2 bg-[#fdda36] text-gray-900 rounded-lg font-semibold text-sm hover:bg-yellow-300 transition-colors">
                        Create Plan
                      </button>
                      <button onClick={() => { setShowCoachingForm(false); setNewCoaching({ name: '', description: '', price: '', billing_cycle: 'one_time', trainer_name: '', trainer_email: '', category: 'strength', features: '', image_url: '' }); }}
                        className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {coachingProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No coaching plans yet — create your first one above</div>
                ) : (
                  coachingProducts.map(product => {
                    const CatIcon = CATEGORY_ICONS[product.category ?? ''] ?? Package;
                    const isEditing = editingId === product.id;
                    const isExpanded = expandedId === product.id;

                    return (
                      <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-xl flex-shrink-0 ${CATEGORY_COLORS[product.category ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                              <CatIcon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <input value={editData.name ?? ''} onChange={e => setEditData({ ...editData, name: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm" />
                                  <textarea value={editData.description ?? ''} onChange={e => setEditData({ ...editData, description: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm" rows={2} />
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Price (€)</label>
                                      <input type="number" value={editData.price ?? ''} onChange={e => setEditData({ ...editData, price: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm" />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Trainer Name</label>
                                      <input value={editData.trainer_name ?? ''} onChange={e => setEditData({ ...editData, trainer_name: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Features (one per line)</label>
                                    <textarea
                                      value={Array.isArray(editData.features) ? editData.features.join('\n') : ''}
                                      onChange={e => setEditData({ ...editData, features: e.target.value.split('\n') })}
                                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm" rows={4} />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Checkout URL</label>
                                    <input value={editData.checkout_url ?? ''} onChange={e => setEditData({ ...editData, checkout_url: e.target.value })}
                                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm"
                                      placeholder="https://checkout.stripe.com/..." />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Featured Image URL</label>
                                    <input value={editData.image_url ?? ''} onChange={e => setEditData({ ...editData, image_url: e.target.value })}
                                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm"
                                      placeholder="https://..." />
                                    {editData.image_url && (
                                      <img src={editData.image_url} alt="preview" className="mt-2 h-20 w-full object-cover rounded-lg opacity-80" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input type="checkbox" id={`active-${product.id}`} checked={editData.is_active ?? true}
                                      onChange={e => setEditData({ ...editData, is_active: e.target.checked })} className="rounded" />
                                    <label htmlFor={`active-${product.id}`} className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white">{product.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[product.category ?? ''] ?? 'bg-gray-100'}`}>
                                      {product.category}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700'}`}>
                                      {product.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{product.description}</p>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-xl font-extrabold text-gray-900 dark:text-white mr-2">€{product.price}</span>
                              {isEditing ? (
                                <>
                                  <button onClick={() => saveEdit(product.id)} className="p-2 bg-[#fdda36] text-gray-900 rounded-lg hover:bg-yellow-300 transition-colors">
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { setEditingId(null); setEditData({}); }} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg">
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(product)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setExpandedId(isExpanded ? null : product.id)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {isEditing && (
                            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                              <button onClick={() => saveEdit(product.id)} className="px-4 py-2 bg-[#fdda36] text-gray-900 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition-colors flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Changes
                              </button>
                              <button onClick={() => { setEditingId(null); setEditData({}); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expanded view */}
                        {isExpanded && !isEditing && (
                          <div className="border-t border-gray-100 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Features</h4>
                                {product.features && product.features.length > 0 ? (
                                  <ul className="space-y-1.5">
                                    {product.features.map((f, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                        {f}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-gray-400">No features listed</p>
                                )}
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Stripe</h4>
                                  {product.stripe_product_id ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300 flex-1 truncate">{product.stripe_product_id}</code>
                                        <button onClick={() => copyToClipboard(product.stripe_product_id!, product.id + '-pid')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                          {copiedId === product.id + '-pid' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                        </button>
                                      </div>
                                      {product.checkout_url && (
                                        <div className="flex items-center gap-2">
                                          <a href={product.checkout_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-1 truncate">{product.checkout_url}</a>
                                          <button onClick={() => copyToClipboard(product.checkout_url!, product.id + '-url')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                            {copiedId === product.id + '-url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <button onClick={() => createStripeProduct(product)}
                                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                                      <ExternalLink className="w-4 h-4" />
                                      Sync to Stripe
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── OTHER PRODUCTS ──────────────────────────────────────────── */}
            {activeSection === 'other' && (
              <div className="space-y-4">
                {otherProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No programs or memberships yet</div>
                ) : (
                  otherProducts.map(product => (
                    <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${product.type === 'program' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                            <Package className={`w-5 h-5 ${product.type === 'program' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 dark:text-white">{product.name}</h3>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">{product.type}</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{product.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xl font-extrabold text-gray-900 dark:text-white">€{product.price}</span>
                          <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.duration_weeks && (
                          <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            <Calendar className="w-3 h-3" />{product.duration_weeks} weeks
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                          <DollarSign className="w-3 h-3" />{product.billing_cycle.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${product.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {!product.stripe_product_id ? (
                        <button onClick={() => createStripeProduct(product)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                          <ExternalLink className="w-4 h-4" /> Sync to Stripe
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Product ID:</span>
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300 flex-1 truncate">{product.stripe_product_id}</code>
                            <button onClick={() => copyToClipboard(product.stripe_product_id!, product.id + '-product')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                              {copiedId === product.id + '-product' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                            </button>
                          </div>
                          {product.checkout_url && (
                            <div className="flex items-center gap-2">
                              <a href={product.checkout_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-1 truncate">{product.checkout_url}</a>
                              <button onClick={() => copyToClipboard(product.checkout_url!, product.id + '-url')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                {copiedId === product.id + '-url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
