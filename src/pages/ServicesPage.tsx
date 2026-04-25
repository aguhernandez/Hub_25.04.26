import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Calendar,
  Video,
  Clock,
  MapPin,
  User,
  CheckCircle,
  Dumbbell,
  Salad,
  Bike,
  Flag,
  Star,
  ArrowRight,
  Mail,
  Award,
  Zap,
  MessageCircle,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';

type TabType = 'book' | 'events' | 'history';

interface CoachingProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  category: string;
  features: string[];
  trainer_name: string;
  trainer_email: string;
  checkout_url: string | null;
  stripe_product_id: string | null;
  image_url: string | null;
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  duration_minutes: number;
  location: string;
  max_participants: number;
  current_participants: number;
  price: number;
  is_online: boolean;
}

interface Booking {
  id: string;
  service_title: string;
  trainer_name: string;
  scheduled_date: string;
  status: string;
  price: number;
}

const CATEGORY_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  accent: string;
  badge: string;
  badgeText: string;
  modalGradient: string;
}> = {
  strength: {
    icon: Dumbbell,
    gradient: 'from-slate-900 to-slate-700',
    accent: 'text-amber-400',
    badge: 'bg-amber-400/10 text-amber-400 border border-amber-400/20',
    badgeText: 'Strength',
    modalGradient: 'from-slate-900 via-slate-800 to-amber-900/40',
  },
  nutrition: {
    icon: Salad,
    gradient: 'from-emerald-900 to-emerald-700',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
    badgeText: 'Nutrition',
    modalGradient: 'from-emerald-900 via-emerald-800 to-teal-900/40',
  },
  endurance: {
    icon: Bike,
    gradient: 'from-sky-900 to-sky-700',
    accent: 'text-sky-400',
    badge: 'bg-sky-400/10 text-sky-400 border border-sky-400/20',
    badgeText: 'Endurance',
    modalGradient: 'from-sky-900 via-sky-800 to-blue-900/40',
  },
  race_nutrition: {
    icon: Flag,
    gradient: 'from-orange-900 to-rose-800',
    accent: 'text-orange-300',
    badge: 'bg-orange-400/10 text-orange-300 border border-orange-400/20',
    badgeText: 'Race Nutrition',
    modalGradient: 'from-orange-900 via-rose-900 to-red-900/40',
  },
};

function ApplyModal({ product, onClose }: { product: CoachingProduct; onClose: () => void }) {
  const cfg = CATEGORY_CONFIG[product.category] ?? CATEGORY_CONFIG.strength;
  const Icon = cfg.icon;
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const handleCheckout = async () => {
    if (!profile) {
      setError('You must be logged in to continue.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('stripe-create-coaching-checkout', {
        body: { product_id: product.id },
      });
      if (fnError) {
        const msg = data?.error || fnError.message || 'Something went wrong. Please try again.';
        throw new Error(msg);
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  const handleMailFallback = () => {
    window.location.href = `mailto:${product.trainer_email}?subject=Application: ${product.name}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-white dark:bg-gray-900">
        {/* Hero image / gradient header */}
        <div className={`relative h-52 bg-gradient-to-br ${cfg.modalGradient} overflow-hidden rounded-t-2xl`}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-xl backdrop-blur-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-5 left-6 right-16">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                {cfg.badgeText}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">{product.name}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Trainer + price row */}
          <div className="flex items-center justify-between mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-extrabold text-base shadow">
                A
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{product.trainer_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{product.trainer_email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                {product.billing_cycle === 'monthly' ? 'Per month' : product.billing_cycle === 'yearly' ? 'Per year' : 'One-time'}
              </p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">€{product.price}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">About this plan</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{product.description}</p>
          </div>

          {/* Features */}
          {product.features && product.features.length > 0 && (
            <div className="mb-7">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">What's included</h3>
              <ul className="space-y-2.5">
                {product.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.accent}`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleCheckout}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-[#fdda36] text-gray-900 font-bold text-base rounded-xl hover:bg-yellow-300 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
            {processing
              ? 'Redirecting to Stripe...'
              : product.billing_cycle === 'monthly'
                ? `Subscribe — €${product.price}/mo`
                : `Buy Now — €${product.price}`}
          </button>

          <button
            onClick={handleMailFallback}
            className="w-full mt-2 text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
          >
            Prefer to contact directly? Email Agu
          </button>

          <p className="text-center text-xs text-gray-400 mt-1">
            {product.billing_cycle === 'monthly'
              ? 'Secure payment via Stripe · Cancel anytime'
              : 'Secure payment via Stripe · One-time payment'}
          </p>
        </div>
      </div>
    </div>
  );
}

function CoachingCard({ product, onApply }: { product: CoachingProduct; onApply: () => void }) {
  const cfg = CATEGORY_CONFIG[product.category] ?? CATEGORY_CONFIG.strength;
  const Icon = cfg.icon;
  const isEndurance = product.category === 'endurance';
  const isRecurring = product.billing_cycle === 'monthly' || product.billing_cycle === 'yearly';
  const billingLabel = product.billing_cycle === 'monthly' ? '/mo' : product.billing_cycle === 'yearly' ? '/yr' : '';

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${cfg.gradient} text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col`}>
      {isEndurance && (
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/10 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          Most Popular
        </div>
      )}

      {/* Featured image strip */}
      {product.image_url && (
        <div className="h-32 overflow-hidden relative">
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
        </div>
      )}

      <div className="p-8 flex-1">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
              {cfg.badgeText}
            </span>
            <h3 className="text-xl font-bold mt-2 leading-tight">{product.name}</h3>
          </div>
        </div>

        <p className="text-white/75 text-sm leading-relaxed mb-6 line-clamp-3">{product.description}</p>

        <ul className="space-y-2.5 mb-8">
          {(product.features || []).slice(0, 4).map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.accent}`} />
              <span className="text-white/85">{feature}</span>
            </li>
          ))}
          {(product.features || []).length > 4 && (
            <li className="text-xs text-white/50 pl-6.5">+ {product.features.length - 4} more included</li>
          )}
        </ul>
      </div>

      <div className="px-8 pb-8">
        <div className="border-t border-white/10 pt-6">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {isRecurring ? (
                  <RefreshCw className="w-3 h-3 text-white/50" />
                ) : null}
                <p className="text-white/50 text-xs uppercase tracking-wide">
                  {isRecurring ? 'Recurring' : 'One-time'}
                </p>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold">€{product.price}</span>
                {billingLabel && <span className="text-white/60 text-sm mb-1.5">{billingLabel}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <User className="w-3.5 h-3.5" />
              <span>{product.trainer_name}</span>
            </div>
          </div>

          <button
            onClick={onApply}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-colors group"
          >
            Apply
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('book');
  const [coachingProducts, setCoachingProducts] = useState<CoachingProduct[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<CoachingProduct | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'book') await loadCoachingProducts();
    else if (activeTab === 'events') await loadEvents();
    else await loadBookings();
    setLoading(false);
  };

  const loadCoachingProducts = async () => {
    const { data } = await supabase
      .from('stripe_products')
      .select('id, name, description, price, billing_cycle, category, features, trainer_name, trainer_email, checkout_url, stripe_product_id, image_url')
      .eq('type', 'coaching')
      .eq('is_active', true)
      .order('price', { ascending: true });
    setCoachingProducts(data || []);
  };

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });
    setEvents(data || []);
  };

  const loadBookings = async () => {
    setBookings([]);
  };

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'book', label: '1:1 Coaching', icon: Award },
    { id: 'events', label: 'Events', icon: Video },
    { id: 'history', label: 'History', icon: Clock },
  ];

  return (
    <div className="dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm uppercase tracking-widest">Expert Coaching</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              Coaching & Events
            </h1>
            <p className="text-gray-300 text-lg max-w-xl leading-relaxed">
              Work directly with <span className="text-white font-semibold">Agu Hernández</span> — personalized plans in strength, nutrition, and endurance built around your data.
            </p>
            <div className="flex flex-wrap items-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                Direct coach access
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Evidence-based methodology
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Zap className="w-4 h-4 text-amber-400" />
                Data-driven planning
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1:1 Coaching Tab */}
        {activeTab === 'book' && (
          <div>
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-white" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  {coachingProducts.map(product => (
                    <CoachingCard
                      key={product.id}
                      product={product}
                      onApply={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>

                {/* Trainer bio strip */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0 shadow-lg">
                    A
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Agu Hernández</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Strength coach, sports nutritionist &amp; endurance specialist. Founder of Asciende.
                    </p>
                  </div>
                  <a
                    href="mailto:agu@asciende.pro"
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <Mail className="w-4 h-4" />
                    Get in touch
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div>
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-white" />
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No upcoming events</h3>
                <p className="text-gray-500 dark:text-gray-400">Check back soon — new events are added regularly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map(event => (
                  <div key={event.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{event.title}</h3>
                          {event.is_online && (
                            <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full text-xs font-medium">
                              Online
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{event.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{new Date(event.event_date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{event.duration_minutes} min</span>
                          {event.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{event.location}</span>}
                          <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{event.current_participants}/{event.max_participants} spots</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <span className="text-2xl font-extrabold text-gray-900 dark:text-white">€{event.price}</span>
                        <button className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity">
                          Join Event
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-white" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No purchases yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Your coaching plan purchases will appear here.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bookings.map(booking => (
                    <div key={booking.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-gray-900 dark:text-white">{booking.service_title}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : booking.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{booking.trainer_name}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(booking.scheduled_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-extrabold text-gray-900 dark:text-white">€{booking.price}</span>
                          {booking.status === 'confirmed' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {selectedProduct && (
        <ApplyModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
