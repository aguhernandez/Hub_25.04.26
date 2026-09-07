import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMembership } from '../hooks/useMembership';
import { supabase } from '../lib/supabase';
import SupportMeSectionV2 from '../components/settings/SupportMeSectionV2';
import CreateProjectModal from '../components/support/CreateProjectModal';
import {
  Heart,
  Tag,
  Handshake,
  TrendingUp,
  ExternalLink,
  ArrowRight,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Zap,
  Award,
  Globe,
  Target,
  CheckCircle,
  Edit,
  Gift
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo_url: string;
  description: string;
  country: string;
  website: string;
  is_featured: boolean;
}

interface Promotion {
  id: string;
  brand_id: string;
  title: string;
  description: string;
  promotion_type: string;
  discount_percent: number | null;
  discount_code: string | null;
  discount_url: string | null;
  end_date: string | null;
  image_url: string | null;
  brands: Brand;
}

interface Project {
  id: string;
  title: string;
  description: string;
  project_type: string;
  country: string;
  funding_goal: number;
  funding_raised: number;
  currency: string;
  end_date: string;
  image_url: string | null;
  beneficiary_count: number;
  is_featured: boolean;
}

interface Partnership {
  id: string;
  brand_id: string;
  partnership_type: string;
  start_date: string;
  end_date: string | null;
  monetary_value: number | null;
  status: string;
  brands: Brand;
}

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  category: string;
  website: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
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
  destination_url: string | null;
  referral_required: boolean;
  tracking_enabled: boolean;
  usage_limit: number | null;
  usage_count: number;
  partners: Partner;
}

interface PartnerReferral {
  id: string;
  referral_code: string;
  partner_id: string;
  benefit_id: string;
  status: string;
  activation_at: string;
  expiration_at: string | null;
  partners: Partner;
  partner_benefits: PartnerBenefit;
}

interface AthleteProject {
  id: string;
  athlete_id: string;
  title: string;
  description: string;
  short_phrase: string;
  slug: string;
  category: string;
  country: string;
  sport: string;
  goal_amount: number | null;
  goal_type: 'money' | 'in-kind' | 'other';
  currency: string;
  deadline: string | null;
  is_continuous: boolean;
  status: 'active' | 'paused' | 'closed';
  verified_by: string | null;
  verified_at: string | null;
  visible_supports_count: number;
  total_declared_amount: number;
  created_at: string;
  profiles?: {
    full_name: string;
    sport: string;
    country: string;
  };
}

export default function ImpactBrandsPage() {
  const { profile } = useAuth();
  const { hasAccess, loading: membershipLoading } = useMembership();
  const [activeTab, setActiveTab] = useState<'promotions' | 'projects' | 'partnerships'>('partnerships');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [athleteProjects, setAthleteProjects] = useState<AthleteProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [partnerBenefits, setPartnerBenefits] = useState<PartnerBenefit[]>([]);
  const [myReferrals, setMyReferrals] = useState<PartnerReferral[]>([]);
  const [selectedBenefit, setSelectedBenefit] = useState<PartnerBenefit | null>(null);
  const [activatedReferral, setActivatedReferral] = useState<PartnerReferral | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  useEffect(() => {
    if (profile) {
      loadData();
      loadMyProjects();
    }
  }, [profile, activeTab]);

  const loadMyProjects = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('athlete_support_projects')
      .select('*')
      .eq('athlete_id', profile.id)
      .eq('status', 'active');
    setMyProjects(data || []);
  };

  const handleCreateProjectClick = () => {
    setShowCreateProject(true);
  };

  const loadData = async () => {
    setLoading(true);

    try {
      if (activeTab === 'promotions') {
        setPromotions([]);
      } else if (activeTab === 'projects') {
        // Load ALL active athlete support projects
        const { data, error } = await supabase
          .from('athlete_support_projects')
          .select(`
            *,
            profiles:athlete_id (
              full_name,
              sport,
              country
            )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAthleteProjects(data || []);
      } else if (activeTab === 'partnerships') {
        const [{ data: benefitsData, error: benefitsError }, { data: referralsData, error: referralsError }] = await Promise.all([
          supabase
            .from('partner_benefits')
            .select('*, partners!inner(*)')
            .eq('is_active', true)
            .eq('partners.status', 'active')
            .order('created_at', { ascending: false }),
          supabase
            .from('partner_referrals')
            .select('*, partners(*), partner_benefits(*)')
            .eq('athlete_id', profile?.id || '')
            .order('created_at', { ascending: false })
        ]);
        if (benefitsError) throw benefitsError;
        if (referralsError) throw referralsError;
        setPartnerBenefits((benefitsData || []) as PartnerBenefit[]);
        setMyReferrals((referralsData || []) as PartnerReferral[]);
        setPartnerships([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackPromotionClick = async (promotionId: string) => {
    console.log('Promotion clicked:', promotionId);
  };

  const activateBenefit = async (benefit: PartnerBenefit) => {
    setActivationError(null);
    if (!hasAccess(['intermediate'])) {
      setActivationError('This benefit is available to athletes with a paid membership.');
      return;
    }
    const existing = myReferrals.find(referral => referral.benefit_id === benefit.id && !['cancelled', 'expired', 'refunded'].includes(referral.status));
    if (existing) {
      setActivatedReferral(existing);
      return;
    }
    const { data: codeData, error: codeError } = await supabase.rpc('generate_referral_code');
    if (codeError) {
      setActivationError('We could not create your referral right now. Please try again.');
      return;
    }
    const expirationAt = benefit.end_date ? new Date(`${benefit.end_date}T23:59:59`).toISOString() : null;
    const { data, error } = await supabase
      .from('partner_referrals')
      .insert({
        referral_code: codeData,
        athlete_id: profile?.id,
        partner_id: benefit.partner_id,
        benefit_id: benefit.id,
        expiration_at: expirationAt,
      })
      .select('*, partners(*), partner_benefits(*)')
      .maybeSingle();
    if (error || !data) {
      setActivationError('We could not activate this benefit right now. Please try again.');
      return;
    }
    setActivatedReferral(data as PartnerReferral);
    setMyReferrals(previous => [data as PartnerReferral, ...previous]);
  };

  const openPartner = async (referral: PartnerReferral) => {
    if (referral.status === 'activated' && referral.partners.website) {
      await supabase.from('partner_referrals').update({ clicked_at: new Date().toISOString() }).eq('id', referral.id);
    }
    const destination = referral.partner_benefits.destination_url || referral.partners.website;
    if (destination) {
      const url = new URL(destination);
      url.searchParams.set('ref', referral.referral_code);
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    }
  };

  const getPromotionTypeIcon = (type: string) => {
    switch (type) {
      case 'discount': return <Tag className="w-5 h-5" />;
      case 'free_trial': return <Zap className="w-5 h-5" />;
      case 'giveaway': return <Award className="w-5 h-5" />;
      default: return <Tag className="w-5 h-5" />;
    }
  };

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'athlete_support': return 'bg-[#514163]/10 text-[#514163]';
      case 'facility': return 'bg-[#514163]/20 text-[#514163]';
      case 'equipment': return 'bg-[#514163]/15 text-[#514163]';
      case 'community': return 'bg-[#514163]/25 text-[#514163]';
      default: return 'bg-gray-100 text-gray-700 dark:text-gray-300';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'travel': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'equipment': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'training': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'education': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'health': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getFilteredProjects = () => {
    return athleteProjects.filter(project => {
      if (selectedCategory !== 'all' && project.category !== selectedCategory) return false;
      if (selectedCountry !== 'all' && project.country !== selectedCountry) return false;
      return true;
    }).sort((a, b) => {
      // Put own projects first
      if (a.athlete_id === profile?.id && b.athlete_id !== profile?.id) return -1;
      if (a.athlete_id !== profile?.id && b.athlete_id === profile?.id) return 1;
      return 0;
    });
  };

  const getUniqueCountries = () => {
    const countries = new Set(athleteProjects.map(p => p.country));
    return Array.from(countries).sort();
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'travel', label: 'Travel' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'training', label: 'Training' },
    { value: 'education', label: 'Education' },
    { value: 'health', label: 'Health' }
  ];

  const calculateProgress = (project: AthleteProject): number => {
    if (!project.goal_amount || project.goal_amount === 0) return 0;
    return Math.min(100, Math.round((project.total_declared_amount / project.goal_amount) * 100));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            Spotters and Support
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Grow with Support
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Connect with brands, access exclusive offers, and support projects that make a difference in the sports community
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="text-3xl font-bold text-[#514163] dark:text-[#fdda36]">12</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Brands</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="text-3xl font-bold text-[#514163] dark:text-[#fdda36]">24</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Promotions</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="text-3xl font-bold text-[#514163] dark:text-[#fdda36]">8</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Projects</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="text-3xl font-bold text-[#514163] dark:text-[#fdda36]">$45K</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Raised This Year</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('partnerships')}
              className={`flex-1 px-6 py-4 font-medium transition-all ${
                activeTab === 'partnerships'
                  ? 'bg-gradient-to-r from-[#514163]/5 to-[#514163]/10 dark:from-[#514163]/20 dark:to-[#514163]/10 text-[#514163] dark:text-[#8b7399] border-b-2 border-[#514163] dark:border-[#8b7399]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Handshake className="w-5 h-5" />
                <span>My Partnerships</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 px-6 py-4 font-medium transition-all ${
                activeTab === 'projects'
                  ? 'bg-gradient-to-r from-[#514163]/5 to-[#514163]/10 dark:from-[#514163]/20 dark:to-[#514163]/10 text-[#514163] dark:text-[#8b7399] border-b-2 border-[#514163] dark:border-[#8b7399]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Heart className="w-5 h-5" />
                <span>Support Projects</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('promotions')}
              className={`flex-1 px-6 py-4 font-medium transition-all ${
                activeTab === 'promotions'
                  ? 'bg-gradient-to-r from-[#514163]/5 to-[#514163]/10 dark:from-[#514163]/20 dark:to-[#514163]/10 text-[#514163] dark:text-[#8b7399] border-b-2 border-[#514163] dark:border-[#8b7399]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Tag className="w-5 h-5" />
                <span>Promotions & Discounts</span>
              </div>
            </button>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            ) : (
              <>
                {/* Promotions Tab */}
                {activeTab === 'promotions' && (
                  <div>
                    {promotions.length === 0 ? (
                      <div className="text-center py-12">
                        <Tag className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No promotions available</h3>
                        <p className="text-gray-600 dark:text-gray-400">Check back soon for exclusive offers</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {promotions.map(promo => (
                          <div key={promo.id} className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-blue-200 dark:border-gray-600 overflow-hidden hover:shadow-lg transition-shadow">
                            {promo.image_url && (
                              <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-100">
                                <img
                                  src={promo.image_url}
                                  alt={promo.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="p-6">
                              {/* Brand Logo */}
                              <div className="flex items-center gap-3 mb-4">
                                {promo.brands.logo_url ? (
                                  <img
                                    src={promo.brands.logo_url}
                                    alt={promo.brands.name}
                                    className="w-12 h-12 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-lg flex items-center justify-center text-white font-bold">
                                    {promo.brands.name[0]}
                                  </div>
                                )}
                                <div>
                                  <h3 className="font-semibold text-gray-900 dark:text-white">{promo.brands.name}</h3>
                                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                    <MapPin className="w-3 h-3" />
                                    {promo.brands.country}
                                  </div>
                                </div>
                              </div>

                              {/* Promotion Details */}
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                  promo.promotion_type === 'discount' ? 'bg-[#514163]/10 text-[#514163]' :
                                  promo.promotion_type === 'free_trial' ? 'bg-[#514163]/15 text-[#514163]' :
                                  'bg-[#514163]/20 text-[#514163]'
                                }`}>
                                  {getPromotionTypeIcon(promo.promotion_type)}
                                  {promo.promotion_type.replace('_', ' ')}
                                </span>

                                {promo.discount_percent && (
                                  <span className="text-2xl font-bold text-red-600">
                                    {promo.discount_percent}% OFF
                                  </span>
                                )}
                              </div>

                              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{promo.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{promo.description}</p>

                              {promo.discount_code && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 border-dashed rounded-lg p-3 mb-4">
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Use code:</div>
                                  <div className="font-mono font-bold text-lg text-gray-900 dark:text-yellow-300">{promo.discount_code}</div>
                                </div>
                              )}

                              {promo.end_date && (
                                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-4">
                                  <Calendar className="w-3 h-3" />
                                  Valid until {new Date(promo.end_date).toLocaleDateString()}
                                </div>
                              )}

                              <a
                                href={promo.discount_url || promo.brands.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackPromotionClick(promo.id)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                              >
                                Get Offer
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Projects Tab */}
                {activeTab === 'projects' && (
                  <div>
                    {/* Filters */}
                    <div className="mb-6 flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Country
                        </label>
                        <select
                          value={selectedCountry}
                          onChange={(e) => setSelectedCountry(e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          <option value="all">All Countries</option>
                          {getUniqueCountries().map(country => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {getFilteredProjects().length === 0 ? (
                      <div className="text-center py-12">
                        <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No active projects</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {selectedCategory !== 'all' || selectedCountry !== 'all'
                            ? 'Try adjusting your filters'
                            : 'New projects coming soon'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {getFilteredProjects().map(project => {
                          const progress = calculateProgress(project);
                          const isOwnProject = project.athlete_id === profile?.id;

                          return (
                            <div
                              key={project.id}
                              className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden hover:shadow-lg transition-all ${
                                isOwnProject
                                  ? 'border-[#fdda36] border-2 opacity-80'
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="p-6">
                                {isOwnProject && (
                                  <div className="mb-4 flex items-center justify-between">
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36] rounded-full text-sm font-medium">
                                      <Target className="w-4 h-4" />
                                      Your Project
                                    </span>
                                    <button
                                      onClick={() => {
                                        /* Edit functionality */
                                      }}
                                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                      <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    </button>
                                  </div>
                                )}

                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex gap-2">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(project.category)}`}>
                                      {project.category}
                                    </span>
                                    {project.verified_by && (
                                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        <CheckCircle className="w-3 h-3" />
                                        Verified
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin className="w-4 h-4" />
                                    {project.country}
                                  </div>
                                </div>

                                {!isOwnProject && project.profiles && (
                                  <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Users className="w-4 h-4" />
                                    <span className="font-medium">{project.profiles.full_name}</span>
                                    <span>•</span>
                                    <span>{project.sport}</span>
                                  </div>
                                )}

                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{project.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{project.description}</p>

                                {project.goal_amount && project.goal_type === 'money' && (
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {project.currency} {project.total_declared_amount.toLocaleString()} raised
                                      </span>
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        of {project.goal_amount.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-[#514163] to-[#6b5179] transition-all duration-500"
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                      ></div>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-sm font-semibold text-[#514163] dark:text-[#8b7399]">
                                        {progress}% funded
                                      </span>
                                      {project.visible_supports_count > 0 && (
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          {project.visible_supports_count} supporters
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {!isOwnProject && (
                                  <a
                                    href={`/athlete/${project.slug}`}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#6b5179] transition-colors"
                                  >
                                    <Heart className="w-5 h-5" />
                                    Support This Project
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Partnerships Tab */}
                {activeTab === 'partnerships' && (
                  <div className="space-y-8">
                    {/* Support Mode Section */}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Heart className="w-6 h-6 text-[#fdda36]" />
                        Support Projects
                      </h2>
                      <SupportMeSectionV2 />
                    </div>

                    {/* Partner Benefits Section */}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <Handshake className="w-6 h-6 text-[#514163] dark:text-[#fdda36]" />
                        Benefits for Asciende Athletes
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">Discover exclusive benefits from independent partner brands.</p>

                      {!membershipLoading && !hasAccess(['intermediate']) && (
                        <div className="mb-6 bg-[#fdda36]/20 border border-[#fdda36] rounded-xl p-5">
                          <h3 className="font-bold text-[#514163] mb-1">Paid membership required to activate benefits</h3>
                          <p className="text-sm text-[#514163]/80">You can explore partner offers, but activating a benefit is available with a paid Asciende membership.</p>
                        </div>
                      )}

                      {activationError && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">{activationError}</div>
                      )}

                      {partnerBenefits.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                          <Gift className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Benefits coming soon</h3>
                          <p className="text-gray-600 dark:text-gray-400">New partner offers will appear here.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {partnerBenefits.map(benefit => (
                            <div key={benefit.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow">
                              <div className="flex items-start gap-4 mb-4">
                                {benefit.partners.logo_url ? (
                                  <img src={benefit.partners.logo_url} alt={benefit.partners.name} className="w-14 h-14 rounded-xl object-cover" />
                                ) : (
                                  <div className="w-14 h-14 rounded-xl bg-[#514163] flex items-center justify-center text-white font-bold text-xl">{benefit.partners.name[0]}</div>
                                )}
                                <div className="flex-1">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{benefit.partners.category}</p>
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{benefit.partners.name}</h3>
                                </div>
                              </div>
                              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{benefit.discount_value || benefit.name}</h4>
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{benefit.description || benefit.name}</p>
                              <div className="flex items-center justify-between gap-3">
                                <button onClick={() => setSelectedBenefit(benefit)} className="text-sm font-medium text-[#514163] dark:text-[#fdda36] hover:underline">View details</button>
                                <button onClick={() => activateBenefit(benefit)} className="px-4 py-2 bg-[#514163] text-white rounded-lg font-medium hover:bg-[#6b5179] transition-colors">Activate Benefit</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {myReferrals.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">My Activated Benefits</h3>
                          <div className="space-y-3">
                            {myReferrals.map(referral => (
                              <div key={referral.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4">
                                <div><p className="font-semibold text-gray-900 dark:text-white">{referral.partner_benefits?.name || 'Partner benefit'}</p><p className="font-mono text-sm text-gray-600 dark:text-gray-400">{referral.referral_code}</p></div>
                                <button onClick={() => openPartner(referral)} className="px-4 py-2 bg-[#fdda36] text-[#514163] rounded-lg font-semibold hover:bg-[#ffd51a] transition-colors">Go to Partner</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-[#514163] to-[#6d5581] rounded-2xl p-8 text-center text-white">
          <Globe className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Are you a brand?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Partner with Asciende to support athletes from the Global South and create meaningful impact
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'about-asciende' }))}
            className="px-8 py-3 bg-white text-[#514163] rounded-lg font-bold hover:bg-gray-50 transition-colors"
          >
            Become a Partner
          </button>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onSuccess={() => {
            setShowCreateProject(false);
            loadMyProjects();
            loadData();
          }}
        />
      )}

      {selectedBenefit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedBenefit(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">{selectedBenefit.partners.category}</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedBenefit.partners.name}</h2>
              </div>
              <button onClick={() => setSelectedBenefit(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><span className="sr-only">Close</span>×</button>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedBenefit.discount_value || selectedBenefit.name}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-5">{selectedBenefit.description}</p>
            {selectedBenefit.eligible_products && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3"><strong>Eligible products:</strong> {selectedBenefit.eligible_products}</p>}
            {selectedBenefit.how_to_use && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3"><strong>How to use:</strong> {selectedBenefit.how_to_use}</p>}
            {selectedBenefit.terms && <p className="text-sm text-gray-600 dark:text-gray-400 mb-5"><strong>Terms:</strong> {selectedBenefit.terms}</p>}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              <strong className="block text-gray-900 dark:text-white mb-1">Partner Disclaimer</strong>
              This benefit is provided by an independent third-party partner. Asciende connects athletes with partner brands and is not the seller or provider of the products or services offered.
            </div>
            <button onClick={() => { setSelectedBenefit(null); activateBenefit(selectedBenefit); }} className="w-full px-4 py-3 bg-[#514163] text-white rounded-lg font-semibold hover:bg-[#6b5179] transition-colors">Activate Benefit</button>
          </div>
        </div>
      )}

      {activatedReferral && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setActivatedReferral(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 text-center" onClick={event => event.stopPropagation()}>
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Benefit Activated</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-1">{activatedReferral.partner_benefits?.discount_value || activatedReferral.partner_benefits?.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">Partner: {activatedReferral.partners?.name}</p>
            <div className="bg-[#fdda36]/20 border border-[#fdda36] rounded-xl p-4 mb-5"><p className="text-xs text-[#514163] mb-1">Your reference</p><p className="font-mono font-bold text-lg text-[#514163]">{activatedReferral.referral_code}</p></div>
            <button onClick={() => openPartner(activatedReferral)} className="w-full px-4 py-3 bg-[#514163] text-white rounded-lg font-semibold hover:bg-[#6b5179] transition-colors">Go to Partner</button>
            <button onClick={() => setActivatedReferral(null)} className="mt-3 text-sm text-gray-500 hover:underline">Close</button>
          </div>
        </div>
      )}

    </div>
  );
}
