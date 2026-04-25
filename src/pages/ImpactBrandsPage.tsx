import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  Edit
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
  const [activeTab, setActiveTab] = useState<'promotions' | 'projects' | 'partnerships'>('partnerships');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [athleteProjects, setAthleteProjects] = useState<AthleteProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
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

                    {/* Brand Partnerships Section */}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Handshake className="w-6 h-6 text-[#514163] dark:text-[#8b7399]" />
                        Brand Partnerships
                      </h2>
                      {partnerships.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                          <Handshake className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No active partnerships</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">Build your profile and apply for sponsorships</p>
                          <button
                            onClick={handleCreateProjectClick}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] rounded-lg font-medium hover:bg-[#ffd51a] transition-colors"
                          >
                            <Target className="w-5 h-5" />
                            Request Sponsorship
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {partnerships.map(partnership => (
                            <div key={partnership.id} className="bg-gradient-to-r from-[#514163]/5 to-[#514163]/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-2xl border border-[#514163]/20 p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                  {partnership.brands.logo_url ? (
                                    <img
                                      src={partnership.brands.logo_url}
                                      alt={partnership.brands.name}
                                      className="w-16 h-16 rounded-xl object-cover"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#514163] to-[#6d5581] dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                                      {partnership.brands.name[0]}
                                    </div>
                                  )}

                                  <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{partnership.brands.name}</h3>
                                    <p className="text-sm text-gray-600 capitalize">{partnership.partnership_type}</p>
                                    {partnership.monetary_value && (
                                      <div className="flex items-center gap-1 text-green-600 font-semibold mt-1">
                                        <DollarSign className="w-4 h-4" />
                                        ${partnership.monetary_value.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <span className="px-3 py-1 bg-[#514163]/10 text-[#514163] rounded-full text-sm font-medium">
                                  Active
                                </span>
                              </div>

                              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Since {new Date(partnership.start_date).toLocaleDateString()}
                                </div>
                                {partnership.end_date && (
                                  <div>
                                    Until {new Date(partnership.end_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
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

    </div>
  );
}
