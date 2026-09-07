import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/AdminLayout';
import {
  Handshake, Plus, Edit2, Trash2, X, Check, Search, Tag, Calendar, DollarSign,
  Users, TrendingUp, Target, Settings, ExternalLink, ChevronRight, Percent,
  Filter, Download, FileText, Award, Phone, Mail, Globe, Building2, Gift
} from 'lucide-react';

type SubPage = 'overview' | 'partners' | 'benefits' | 'campaigns' | 'referrals' | 'conversions' | 'commissions' | 'settings';

interface Partner {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  category: string;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  internal_notes: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface PartnerBenefit {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: string | null;
  eligible_products: string | null;
  terms: string | null;
  how_to_use: string | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  usage_count: number;
  destination_url: string | null;
  referral_required: boolean;
  tracking_enabled: boolean;
  is_active: boolean;
  partners?: Partner;
}

interface PartnerCampaign {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  commission_type: string;
  commission_percentage: number;
  fixed_commission: number;
  attribution_window_days: number;
  partners?: Partner;
}

interface PartnerReferral {
  id: string;
  referral_code: string;
  athlete_id: string;
  partner_id: string;
  benefit_id: string | null;
  campaign_id: string | null;
  status: string;
  activation_at: string;
  expiration_at: string | null;
  clicked_at: string | null;
  converted_at: string | null;
  partners?: Partner;
  partner_benefits?: PartnerBenefit;
  athlete_profile?: { full_name: string | null; email: string | null };
}

interface PartnerConversion {
  id: string;
  referral_id: string;
  partner_id: string;
  athlete_id: string;
  external_transaction_id: string | null;
  transaction_date: string | null;
  transaction_amount: number | null;
  eligible_amount: number | null;
  conversion_status: string;
  notes: string | null;
  confirmed_at: string | null;
  partners?: Partner;
  partner_referrals?: PartnerReferral;
  athlete_profile?: { full_name: string | null; email: string | null };
}

interface PartnerCommission {
  id: string;
  conversion_id: string;
  partner_id: string;
  commission_type: string;
  commission_percentage: number;
  fixed_commission: number;
  transaction_amount: number;
  eligible_amount: number;
  final_commission: number;
  commission_status: string;
  payment_date: string | null;
  payment_reference: string | null;
  partners?: Partner;
  partner_conversions?: PartnerConversion;
}

interface PartnerSettings {
  id: string;
  partner_disclaimer_text_es: string;
  partner_disclaimer_text_en: string;
  default_attribution_window_days: number;
  is_active: boolean;
}

const PARTNER_CATEGORIES = [
  'cycling', 'nutrition', 'technology', 'equipment', 'apparel',
  'hotel', 'training_camp', 'events', 'gym', 'clinic', 'other'
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  archived: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  activated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  clicked: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  refunded: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
      {status}
    </span>
  );
}

export default function AdminPartnersPage() {
  const { profile } = useAuth();
  const [subPage, setSubPage] = useState<SubPage>('overview');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [benefits, setBenefits] = useState<PartnerBenefit[]>([]);
  const [campaigns, setCampaigns] = useState<PartnerCampaign[]>([]);
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [conversions, setConversions] = useState<PartnerConversion[]>([]);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [settings, setSettings] = useState<PartnerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPartner, setFilterPartner] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState({ totalPartners: 0, activePartners: 0, totalReferrals: 0, totalConversions: 0, totalCommission: 0, pendingCommission: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, b, c, r, cv, cm, s] = await Promise.all([
        supabase.from('partners').select('*').order('created_at', { ascending: false }),
        supabase.from('partner_benefits').select('*, partners(*)').order('created_at', { ascending: false }),
        supabase.from('partner_campaigns').select('*, partners(*)').order('created_at', { ascending: false }),
        supabase.from('partner_referrals').select('*, partners(*), partner_benefits(*), athlete_profile:profiles!athlete_id(full_name, email)').order('created_at', { ascending: false }),
        supabase.from('partner_conversions').select('*, partners(*), partner_referrals(*), athlete_profile:profiles!athlete_id(full_name, email)').order('created_at', { ascending: false }),
        supabase.from('partner_commissions').select('*, partners(*), partner_conversions(*)').order('created_at', { ascending: false }),
        supabase.from('partner_settings').select('*').maybeSingle(),
      ]);

      setPartners(p.data || []);
      setBenefits(b.data || []);
      setCampaigns(c.data || []);
      setReferrals(r.data || []);
      setConversions(cv.data || []);
      setCommissions(cm.data || []);
      setSettings(s.data || null);

      const allCommissions = cm.data || [];
      setStats({
        totalPartners: (p.data || []).length,
        activePartners: (p.data || []).filter(x => x.status === 'active').length,
        totalReferrals: (r.data || []).length,
        totalConversions: (cv.data || []).length,
        totalCommission: allCommissions.reduce((sum, x) => sum + (x.final_commission || 0), 0),
        pendingCommission: allCommissions.filter(x => x.commission_status === 'pending').reduce((sum, x) => sum + (x.final_commission || 0), 0),
      });
    } catch (err) {
      console.error('Error loading partner data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openModal = (type: string, item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setEditingItem(null);
  };

  const deleteItem = async (type: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const tableMap: Record<string, string> = {
      partner: 'partners', benefit: 'partner_benefits', campaign: 'partner_campaigns',
      referral: 'partner_referrals', conversion: 'partner_conversions', commission: 'partner_commissions',
    };
    const { error } = await supabase.from(tableMap[type]).delete().eq('id', id);
    if (error) { alert('Error deleting: ' + error.message); return; }
    loadData();
  };

  const navItems: { id: SubPage; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'partners', label: 'Partners', icon: Handshake },
    { id: 'benefits', label: 'Benefits', icon: Gift },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'conversions', label: 'Conversions', icon: Check },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredReferrals = referrals.filter(r => {
    if (filterPartner !== 'all' && r.partner_id !== filterPartner) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (searchTerm && !r.referral_code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredConversions = conversions.filter(c => {
    if (filterPartner !== 'all' && c.partner_id !== filterPartner) return false;
    if (filterStatus !== 'all' && c.conversion_status !== filterStatus) return false;
    return true;
  });

  const filteredCommissions = commissions.filter(c => {
    if (filterPartner !== 'all' && c.partner_id !== filterPartner) return false;
    if (filterStatus !== 'all' && c.commission_status !== filterStatus) return false;
    return true;
  });

  return (
    <AdminLayout currentPage="admin-partners">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Handshake className="w-8 h-8 text-[#514163] dark:text-[#fdda36]" />
            Partners
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage partner brands, benefits, referrals, and commissions</p>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSubPage(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  subPage === item.id
                    ? 'bg-[#514163] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#514163]" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {subPage === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard label="Total Partners" value={stats.totalPartners} icon={Handshake} />
                  <StatCard label="Active Partners" value={stats.activePartners} icon={Check} />
                  <StatCard label="Total Referrals" value={stats.totalReferrals} icon={Users} />
                  <StatCard label="Conversions" value={stats.totalConversions} icon={TrendingUp} />
                  <StatCard label="Total Commission" value={`$${stats.totalCommission.toLocaleString()}`} icon={DollarSign} />
                  <StatCard label="Pending Commission" value={`$${stats.pendingCommission.toLocaleString()}`} icon={Calendar} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Partners</h3>
                    {partners.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No partners yet</p>
                    ) : (
                      <div className="space-y-3">
                        {partners.slice(0, 5).map(p => (
                          <div key={p.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {p.logo_url ? (
                                <img src={p.logo_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-[#514163]/10 flex items-center justify-center text-[#514163] dark:text-[#fdda36] font-bold">
                                  {p.name[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white text-sm">{p.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{p.category}</p>
                              </div>
                            </div>
                            <StatusBadge status={p.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Referrals</h3>
                    {referrals.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No referrals yet</p>
                    ) : (
                      <div className="space-y-3">
                        {referrals.slice(0, 5).map(r => (
                          <div key={r.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{r.referral_code}</p>
                              <p className="text-xs text-gray-500">{r.partners?.name || 'Unknown'}</p>
                            </div>
                            <StatusBadge status={r.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PARTNERS */}
            {subPage === 'partners' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Partners</h2>
                  <button onClick={() => openModal('partner')} className="flex items-center gap-2 px-4 py-2 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#6b5179] transition-colors">
                    <Plus className="w-4 h-4" /> Add Partner
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {partners.map(p => (
                    <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {p.logo_url ? (
                            <img src={p.logo_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[#514163]/10 flex items-center justify-center text-[#514163] dark:text-[#fdda36] font-bold text-xl">
                              {p.name[0]}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">{p.name}</h3>
                            <p className="text-xs text-gray-500 capitalize">{p.category}</p>
                          </div>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      {p.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{p.description}</p>}
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-3">
                          <Globe className="w-3 h-3" /> {p.website}
                        </a>
                      )}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={() => openModal('partner', p)} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem('partner', p.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {partners.length === 0 && (
                  <div className="text-center py-16">
                    <Handshake className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No partners yet. Create your first partner to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* BENEFITS */}
            {subPage === 'benefits' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Benefits</h2>
                  <button onClick={() => openModal('benefit')} disabled={partners.length === 0} className="flex items-center gap-2 px-4 py-2 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#6b5179] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-4 h-4" /> Add Benefit
                  </button>
                </div>
                {partners.length === 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">You need to create a partner first before adding benefits.</p>
                  </div>
                )}
                <div className="space-y-3">
                  {benefits.map(b => (
                    <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 dark:text-white">{b.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${b.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                            {b.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{b.partners?.name || 'Unknown partner'}</p>
                        {b.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{b.description}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {b.discount_type}</span>
                          {b.discount_value && <span className="font-semibold">{b.discount_value}</span>}
                          {b.destination_url && <span className="flex items-center gap-1 text-blue-600"><ExternalLink className="w-3 h-3" /> URL</span>}
                          <span>Used: {b.usage_count}{b.usage_limit ? `/${b.usage_limit}` : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => openModal('benefit', b)} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem('benefit', b.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {benefits.length === 0 && (
                    <div className="text-center py-16">
                      <Gift className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No benefits yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CAMPAIGNS */}
            {subPage === 'campaigns' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Campaigns</h2>
                  <button onClick={() => openModal('campaign')} disabled={partners.length === 0} className="flex items-center gap-2 px-4 py-2 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#6b5179] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-4 h-4" /> Add Campaign
                  </button>
                </div>
                <div className="space-y-3">
                  {campaigns.map(c => (
                    <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 dark:text-white">{c.name}</h3>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{c.partners?.name || 'Unknown partner'}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {c.commission_type}</span>
                          {c.commission_type === 'percentage' && <span>{c.commission_percentage}%</span>}
                          {c.commission_type === 'fixed' && <span>${c.fixed_commission}</span>}
                          {c.commission_type === 'hybrid' && <span>${c.fixed_commission} + {c.commission_percentage}%</span>}
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.attribution_window_days}d window</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => openModal('campaign', c)} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem('campaign', c.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {campaigns.length === 0 && (
                    <div className="text-center py-16">
                      <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No campaigns yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REFERRALS */}
            {subPage === 'referrals' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">All Referrals</h2>
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="Search by referral code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                    </div>
                  </div>
                  <select value={filterPartner} onChange={e => setFilterPartner(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                    <option value="all">All Partners</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                    <option value="all">All Statuses</option>
                    <option value="activated">Activated</option>
                    <option value="clicked">Clicked</option>
                    <option value="converted">Converted</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr className="text-left text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-3 font-medium">Referral Code</th>
                        <th className="px-4 py-3 font-medium">Athlete</th>
                        <th className="px-4 py-3 font-medium">Partner</th>
                        <th className="px-4 py-3 font-medium">Benefit</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Activated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredReferrals.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-white">{r.referral_code}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.athlete_profile?.full_name || r.athlete_id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.partners?.name || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.partner_benefits?.name || '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.activation_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredReferrals.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No referrals found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CONVERSIONS */}
            {subPage === 'conversions' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Conversions</h2>
                  <button onClick={() => openModal('conversion')} disabled={referrals.length === 0} className="flex items-center gap-2 px-4 py-2 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#6b5179] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-4 h-4" /> Record Conversion
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 mb-4">
                  <select value={filterPartner} onChange={e => setFilterPartner(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                    <option value="all">All Partners</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr className="text-left text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-3 font-medium">Referral</th>
                        <th className="px-4 py-3 font-medium">Athlete</th>
                        <th className="px-4 py-3 font-medium">Partner</th>
                        <th className="px-4 py-3 font-medium">Ext. Txn ID</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredConversions.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{c.partner_referrals?.referral_code || c.referral_id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.athlete_profile?.full_name || c.athlete_id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.partners?.name || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{c.external_transaction_id || '—'}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">${(c.transaction_amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3"><StatusBadge status={c.conversion_status} /></td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{c.transaction_date ? new Date(c.transaction_date).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {c.conversion_status === 'pending' && (
                                <>
                                  <button onClick={async () => {
                                    await supabase.from('partner_conversions').update({ conversion_status: 'confirmed', confirmed_at: new Date().toISOString(), confirmed_by: profile?.id }).eq('id', c.id);
                                    await supabase.from('partner_referrals').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', c.referral_id);
                                    loadData();
                                  }} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Confirm">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={async () => {
                                    await supabase.from('partner_conversions').update({ conversion_status: 'rejected' }).eq('id', c.id);
                                    loadData();
                                  }} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Reject">
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button onClick={() => deleteItem('conversion', c.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredConversions.length === 0 && (
                    <div className="text-center py-12">
                      <Check className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No conversions found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* COMMISSIONS */}
            {subPage === 'commissions' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">All Commissions</h2>
                <div className="flex flex-wrap gap-3 mb-4">
                  <select value={filterPartner} onChange={e => setFilterPartner(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                    <option value="all">All Partners</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr className="text-left text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-3 font-medium">Partner</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Transaction</th>
                        <th className="px-4 py-3 font-medium">Eligible</th>
                        <th className="px-4 py-3 font-medium">Commission</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredCommissions.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.partners?.name || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{c.commission_type}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">${(c.transaction_amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">${(c.eligible_amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">${(c.final_commission || 0).toLocaleString()}</td>
                          <td className="px-4 py-3"><StatusBadge status={c.commission_status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {c.commission_status === 'pending' && (
                                <button onClick={async () => {
                                  await supabase.from('partner_commissions').update({ commission_status: 'confirmed' }).eq('id', c.id);
                                  loadData();
                                }} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Confirm">
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {c.commission_status === 'confirmed' && (
                                <button onClick={async () => {
                                  await supabase.from('partner_commissions').update({ commission_status: 'paid', payment_date: new Date().toISOString().slice(0, 10) }).eq('id', c.id);
                                  loadData();
                                }} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Mark as Paid">
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => openModal('commission', c)} className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCommissions.length === 0 && (
                    <div className="text-center py-12">
                      <DollarSign className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No commissions found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {subPage === 'settings' && settings && (
              <div className="max-w-3xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Partner System Settings</h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Disclaimer Text (Spanish)</label>
                    <textarea
                      value={settings.partner_disclaimer_text_es}
                      onChange={e => setSettings({ ...settings, partner_disclaimer_text_es: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Disclaimer Text (English)</label>
                    <textarea
                      value={settings.partner_disclaimer_text_en}
                      onChange={e => setSettings({ ...settings, partner_disclaimer_text_en: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Attribution Window (days)</label>
                    <input
                      type="number"
                      value={settings.default_attribution_window_days}
                      onChange={e => setSettings({ ...settings, default_attribution_window_days: parseInt(e.target.value) || 30 })}
                      className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from('partner_settings').update({
                        partner_disclaimer_text_es: settings.partner_disclaimer_text_es,
                        partner_disclaimer_text_en: settings.partner_disclaimer_text_en,
                        default_attribution_window_days: settings.default_attribution_window_days,
                      }).eq('id', settings.id);
                      if (error) { alert('Error saving: ' + error.message); return; }
                      alert('Settings saved successfully');
                      loadData();
                    }}
                    className="px-6 py-2.5 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#6b5179] transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODAL */}
        {showModal && (
          <PartnerModal
            type={modalType}
            editingItem={editingItem}
            partners={partners}
            referrals={referrals}
            onClose={closeModal}
            onSuccess={loadData}
            profileId={profile?.id}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-[#514163] dark:text-[#fdda36]" />
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function PartnerModal({ type, editingItem, partners, referrals, onClose, onSuccess, profileId }: {
  type: string;
  editingItem: any;
  partners: Partner[];
  referrals: PartnerReferral[];
  onClose: () => void;
  onSuccess: () => void;
  profileId?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const [form, setForm] = useState<any>(() => {
    if (editingItem) return { ...editingItem };
    const base: Record<string, any> = {};
    if (type === 'partner') {
      return { name: '', slug: '', logo_url: '', description: '', category: 'cycling', website: '', contact_name: '', contact_email: '', contact_phone: '', internal_notes: '', status: 'draft', start_date: '', end_date: '' };
    }
    if (type === 'benefit') {
      return { partner_id: partners[0]?.id || '', name: '', description: '', discount_type: 'percentage', discount_value: '', eligible_products: '', terms: '', how_to_use: '', start_date: '', end_date: '', usage_limit: '', destination_url: '', referral_required: true, tracking_enabled: true, is_active: true };
    }
    if (type === 'campaign') {
      return { partner_id: partners[0]?.id || '', name: '', description: '', start_date: '', end_date: '', status: 'draft', commission_type: 'none', commission_percentage: 0, fixed_commission: 0, attribution_window_days: 30 };
    }
    if (type === 'conversion') {
      return { referral_id: referrals[0]?.id || '', external_transaction_id: '', transaction_date: new Date().toISOString().slice(0, 10), transaction_amount: '', eligible_amount: '', notes: '' };
    }
    if (type === 'commission') {
      return { ...editingItem, payment_date: '', payment_reference: '' };
    }
    return base;
  });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (type === 'partner') {
        const payload = {
          ...form,
          slug: form.slug || slugify(form.name),
          created_by: editingItem ? undefined : profileId,
        };
        if (editingItem) {
          const { error: e } = await supabase.from('partners').update(payload).eq('id', editingItem.id);
          if (e) throw e;
        } else {
          const { error: e } = await supabase.from('partners').insert([payload]);
          if (e) throw e;
        }
      } else if (type === 'benefit') {
        const payload = { ...form, usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null };
        if (editingItem) {
          const { error: e } = await supabase.from('partner_benefits').update(payload).eq('id', editingItem.id);
          if (e) throw e;
        } else {
          const { error: e } = await supabase.from('partner_benefits').insert([payload]);
          if (e) throw e;
        }
      } else if (type === 'campaign') {
        const payload = {
          ...form,
          commission_percentage: parseFloat(form.commission_percentage) || 0,
          fixed_commission: parseFloat(form.fixed_commission) || 0,
          attribution_window_days: parseInt(form.attribution_window_days) || 30,
        };
        if (editingItem) {
          const { error: e } = await supabase.from('partner_campaigns').update(payload).eq('id', editingItem.id);
          if (e) throw e;
        } else {
          const { error: e } = await supabase.from('partner_campaigns').insert([payload]);
          if (e) throw e;
        }
      } else if (type === 'conversion') {
        const referral = referrals.find(r => r.id === form.referral_id);
        if (!referral) throw new Error('Referral not found');
        const payload = {
          referral_id: form.referral_id,
          partner_id: referral.partner_id,
          athlete_id: referral.athlete_id,
          external_transaction_id: form.external_transaction_id || null,
          transaction_date: form.transaction_date ? new Date(form.transaction_date).toISOString() : null,
          transaction_amount: parseFloat(form.transaction_amount) || 0,
          eligible_amount: form.eligible_amount ? parseFloat(form.eligible_amount) : null,
          notes: form.notes || null,
          conversion_status: 'pending',
        };
        const { error: e } = await supabase.from('partner_conversions').insert([payload]);
        if (e) throw e;
      } else if (type === 'commission') {
        const payload = {
          commission_status: form.commission_status,
          payment_date: form.payment_date || null,
          payment_reference: form.payment_reference || null,
        };
        const { error: e } = await supabase.from('partner_commissions').update(payload).eq('id', editingItem.id);
        if (e) throw e;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
            {editingItem ? `Edit ${type}` : `Add ${type}`}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

          {type === 'partner' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} className={inputClass} /></div>
                <div><label className={labelClass}>Slug</label><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Logo URL</label><input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>{PARTNER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className={labelClass}>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="expired">Expired</option><option value="archived">Archived</option></select></div>
              </div>
              <div><label className={labelClass}>Website</label><input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className={inputClass} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelClass}>Contact Name</label><input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Contact Email</label><input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Contact Phone</label><input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Internal Notes</label><textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} rows={2} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Start Date</label><input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>End Date</label><input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} className={inputClass} /></div>
              </div>
            </>
          )}

          {type === 'benefit' && (
            <>
              <div><label className={labelClass}>Partner *</label><select value={form.partner_id} onChange={e => setForm({ ...form, partner_id: e.target.value })} className={inputClass}>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className={labelClass}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Discount Type</label><select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className={inputClass}><option value="percentage">Percentage</option><option value="fixed">Fixed</option><option value="custom">Custom</option><option value="service">Service</option><option value="product">Product</option></select></div>
                <div><label className={labelClass}>Discount Value</label><input value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} placeholder="e.g. 10% or $20" className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Eligible Products</label><input value={form.eligible_products} onChange={e => setForm({ ...form, eligible_products: e.target.value })} placeholder="e.g. Bicycles, accessories" className={inputClass} /></div>
              <div><label className={labelClass}>Terms</label><textarea value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} rows={2} className={inputClass} /></div>
              <div><label className={labelClass}>How to Use</label><textarea value={form.how_to_use} onChange={e => setForm({ ...form, how_to_use: e.target.value })} rows={2} className={inputClass} /></div>
              <div><label className={labelClass}>Destination URL</label><input value={form.destination_url} onChange={e => setForm({ ...form, destination_url: e.target.value })} placeholder="https://..." className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Start Date</label><input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>End Date</label><input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Usage Limit (blank = unlimited)</label><input type="number" value={form.usage_limit || ''} onChange={e => setForm({ ...form, usage_limit: e.target.value })} className={inputClass} /></div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={form.referral_required} onChange={e => setForm({ ...form, referral_required: e.target.checked })} /> Referral Required</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={form.tracking_enabled} onChange={e => setForm({ ...form, tracking_enabled: e.target.checked })} /> Tracking Enabled</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
              </div>
            </>
          )}

          {type === 'campaign' && (
            <>
              <div><label className={labelClass}>Partner *</label><select value={form.partner_id} onChange={e => setForm({ ...form, partner_id: e.target.value })} className={inputClass}>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className={labelClass}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Start Date</label><input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>End Date</label><input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="expired">Expired</option><option value="archived">Archived</option></select></div>
                <div><label className={labelClass}>Commission Type</label><select value={form.commission_type} onChange={e => setForm({ ...form, commission_type: e.target.value })} className={inputClass}><option value="none">None</option><option value="percentage">Percentage</option><option value="fixed">Fixed</option><option value="hybrid">Hybrid</option></select></div>
              </div>
              {form.commission_type !== 'none' && (
                <div className="grid grid-cols-2 gap-4">
                  {form.commission_type !== 'fixed' && <div><label className={labelClass}>Commission %</label><input type="number" step="0.01" value={form.commission_percentage} onChange={e => setForm({ ...form, commission_percentage: e.target.value })} className={inputClass} /></div>}
                  {form.commission_type !== 'percentage' && <div><label className={labelClass}>Fixed Commission ($)</label><input type="number" step="0.01" value={form.fixed_commission} onChange={e => setForm({ ...form, fixed_commission: e.target.value })} className={inputClass} /></div>}
                </div>
              )}
              <div><label className={labelClass}>Attribution Window (days)</label><input type="number" value={form.attribution_window_days} onChange={e => setForm({ ...form, attribution_window_days: e.target.value })} className={inputClass} /></div>
            </>
          )}

          {type === 'conversion' && (
            <>
              <div><label className={labelClass}>Referral *</label><select value={form.referral_id} onChange={e => setForm({ ...form, referral_id: e.target.value })} className={inputClass}>{referrals.map(r => <option key={r.id} value={r.id}>{r.referral_code} — {r.partners?.name}</option>)}</select></div>
              <div><label className={labelClass}>External Transaction ID</label><input value={form.external_transaction_id} onChange={e => setForm({ ...form, external_transaction_id: e.target.value })} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Transaction Date</label><input type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Transaction Amount ($)</label><input type="number" step="0.01" value={form.transaction_amount} onChange={e => setForm({ ...form, transaction_amount: e.target.value })} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Eligible Amount ($)</label><input type="number" step="0.01" value={form.eligible_amount} onChange={e => setForm({ ...form, eligible_amount: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} /></div>
            </>
          )}

          {type === 'commission' && (
            <>
              <div><label className={labelClass}>Commission Status</label><select value={form.commission_status} onChange={e => setForm({ ...form, commission_status: e.target.value })} className={inputClass}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></div>
              <div><label className={labelClass}>Payment Date</label><input type="date" value={form.payment_date || ''} onChange={e => setForm({ ...form, payment_date: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Payment Reference</label><input value={form.payment_reference} onChange={e => setForm({ ...form, payment_reference: e.target.value })} className={inputClass} /></div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="px-6 py-2 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#6b5179] transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
