import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Mail,
  Gift,
  Eye,
  Heart,
  Send,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Globe,
  Trophy,
  Target,
  AlertCircle
} from 'lucide-react';

interface BrandPartner {
  id: string;
  brand_name: string;
  industry: string;
  contact_person: string;
  email: string;
  website: string | null;
  country: string;
  logo_url: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Project {
  id: string;
  athlete_id: string;
  title: string;
  description: string;
  category: string;
  country: string;
  sport: string;
  progress_percentage: number;
  start_date: string;
  athlete_name?: string;
}

const INDUSTRIES = [
  'sportswear', 'nutrition', 'equipment', 'travel', 'health', 'technology', 'other'
];

const COUNTRIES = [
  'Argentina', 'Australia', 'Brazil', 'Canada', 'Chile', 'Colombia',
  'Costa Rica', 'Ecuador', 'Mexico', 'Panama', 'Peru', 'Spain', 'United States', 'Uruguay'
];

export default function BrandDashboardPage() {
  const { t, language } = useLanguage();
  const [currentView, setCurrentView] = useState<'register' | 'dashboard'>('register');
  const [brand, setBrand] = useState<BrandPartner | null>(null);
  const [loading, setLoading] = useState(true);

  // Registration form
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('');
  const [reason, setReason] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Dashboard
  const [activeTab, setActiveTab] = useState<'projects' | 'communication' | 'offers'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [followedProjects, setFollowedProjects] = useState<Set<string>>(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [sportFilter, setSportFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Communication
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Offer form
  const [offerDescription, setOfferDescription] = useState('');
  const [offerCategory, setOfferCategory] = useState('');
  const [targetCountry, setTargetCountry] = useState('');
  const [targetSport, setTargetSport] = useState('');

  useEffect(() => {
    checkBrandStatus();
  }, []);

  useEffect(() => {
    if (brand?.status === 'approved') {
      loadProjects();
      loadFollowedProjects();
    }
  }, [brand]);

  useEffect(() => {
    applyFilters();
  }, [projects, searchTerm, countryFilter, sportFilter, categoryFilter]);

  const checkBrandStatus = async () => {
    setLoading(true);
    try {
      const userEmail = prompt('Enter your brand email to check status:');
      if (!userEmail) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('brand_partners')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (data) {
        setBrand(data);
        if (data.status === 'approved') {
          setCurrentView('dashboard');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('brand_partners')
        .insert([{
          brand_name: brandName,
          industry,
          contact_person: contactPerson,
          email,
          website: website || null,
          country,
          reason,
          status: 'pending'
        }]);

      if (error) throw error;

      setRegistrationSuccess(true);
      setBrandName('');
      setIndustry('');
      setContactPerson('');
      setEmail('');
      setWebsite('');
      setCountry('');
      setReason('');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    const { data } = await supabase
      .from('athlete_support_projects')
      .select(`
        *,
        profiles:athlete_id (full_name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const enriched = (data || []).map(p => ({
      ...p,
      athlete_name: p.profiles?.full_name || 'Unknown Athlete'
    }));

    setProjects(enriched);
  };

  const loadFollowedProjects = async () => {
    if (!brand?.id) return;

    const { data } = await supabase
      .from('brand_project_follows')
      .select('project_id')
      .eq('brand_id', brand.id);

    setFollowedProjects(new Set((data || []).map(f => f.project_id)));
  };

  const toggleFollow = async (projectId: string) => {
    if (!brand?.id) return;

    const isFollowing = followedProjects.has(projectId);

    if (isFollowing) {
      await supabase
        .from('brand_project_follows')
        .delete()
        .eq('brand_id', brand.id)
        .eq('project_id', projectId);
    } else {
      await supabase
        .from('brand_project_follows')
        .insert([{ brand_id: brand.id, project_id: projectId }]);
    }

    loadFollowedProjects();
  };

  const applyFilters = () => {
    let filtered = [...projects];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(search) ||
        p.athlete_name?.toLowerCase().includes(search) ||
        p.sport.toLowerCase().includes(search)
      );
    }

    if (countryFilter !== 'All') {
      filtered = filtered.filter(p => p.country === countryFilter);
    }

    if (sportFilter !== 'All') {
      filtered = filtered.filter(p => p.sport === sportFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    setFilteredProjects(filtered);
  };

  const sendCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('brand_communications')
        .insert([{
          brand_id: brand.id,
          subject,
          message,
          related_project_id: selectedProjectId || null,
          status: 'unread'
        }]);

      if (error) throw error;

      alert(language === 'en' ? 'Message sent successfully!' : '¡Mensaje enviado exitosamente!');
      setSubject('');
      setMessage('');
      setSelectedProjectId('');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('brand_resource_offers')
        .insert([{
          brand_id: brand.id,
          offer_description: offerDescription,
          category: offerCategory,
          target_country: targetCountry || null,
          target_sport: targetSport || null,
          status: 'pending'
        }]);

      if (error) throw error;

      alert(t('brandDashboard.messages.offerSubmitted'));
      setOfferDescription('');
      setOfferCategory('');
      setTargetCountry('');
      setTargetSport('');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('brandDashboard.messages.thankYou')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('brandDashboard.messages.pendingApproval')}
          </p>
          <button
            onClick={() => {
              setRegistrationSuccess(false);
              setCurrentView('register');
            }}
            className="px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
          >
            {t('buttons.back')}
          </button>
        </div>
      </div>
    );
  }

  if (brand?.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Clock className="w-16 h-16 text-[#fdda36] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('brandDashboard.messages.pendingApproval')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We'll notify you once your application has been reviewed.
          </p>
        </div>
      </div>
    );
  }

  if (currentView === 'register') {
    return (
      <div className="min-h-screen py-12 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Disclaimer */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900 dark:text-blue-200">
              {t('brandDashboard.disclaimer')}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center mb-8">
              <Building2 className="w-12 h-12 text-[#fdda36] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t('brandDashboard.registerTitle')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Partner with Asciende to support athletes worldwide
              </p>
            </div>

            <form onSubmit={handleRegistration} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('brandDashboard.fields.brandName')}
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('brandDashboard.fields.industry')}
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Select...</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>
                      {t(`brandDashboard.industries.${ind}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('brandDashboard.fields.contact')}
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('brandDashboard.fields.email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('brandDashboard.fields.website')}
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('brandDashboard.fields.country')}
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="">Select...</option>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('brandDashboard.fields.reason')}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                {loading ? 'Submitting...' : t('brandDashboard.buttons.submit')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view (approved brands only)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#514163] to-[#6b5179] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">{brand?.brand_name}</h1>
            <p className="text-white/80">{brand?.industry} • {brand?.country}</p>
          </div>
          <Building2 className="w-12 h-12 text-[#fdda36]" />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900 dark:text-blue-200">
          {t('brandDashboard.disclaimer')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'projects'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <Target className="w-4 h-4" />
          {t('brandDashboard.sections.explorer')}
        </button>
        <button
          onClick={() => setActiveTab('communication')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'communication'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <Mail className="w-4 h-4" />
          {t('brandDashboard.sections.communication')}
        </button>
        <button
          onClick={() => setActiveTab('offers')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'offers'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <Gift className="w-4 h-4" />
          {t('brandDashboard.sections.offers')}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-[#fdda36]" />
              <span className="font-semibold text-gray-900 dark:text-white">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="All">All Countries</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="All">All Sports</option>
                <option value="Beach Volleyball">Beach Volleyball</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Cycling">Cycling</option>
                <option value="Running">Running</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Needs</option>
                <option value="travel">Travel</option>
                <option value="equipment">Equipment</option>
                <option value="training">Training</option>
                <option value="education">Education</option>
                <option value="health">Health</option>
              </select>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">{project.title}</h3>
                  <button
                    onClick={() => toggleFollow(project.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      followedProjects.has(project.id)
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <Heart
                      className="w-5 h-5"
                      fill={followedProjects.has(project.id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {project.description}
                </p>
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">{project.country}</span>
                  <Trophy className="w-4 h-4 text-gray-500 ml-2" />
                  <span className="text-gray-700 dark:text-gray-300">{project.sport}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className="bg-[#fdda36] h-2 rounded-full"
                    style={{ width: `${project.progress_percentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
                  {project.progress_percentage}% complete
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'communication' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#fdda36]" />
            {t('brandDashboard.sections.communication')}
          </h2>
          <form onSubmit={sendCommunication} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Related Project (optional)
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="">None</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#fdda36]" />
            {t('brandDashboard.offerForm.title')}
          </h2>
          <form onSubmit={submitOffer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('brandDashboard.offerForm.description')}
              </label>
              <textarea
                value={offerDescription}
                onChange={(e) => setOfferDescription(e.target.value)}
                required
                rows={4}
                placeholder={t('brandDashboard.offerForm.descPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('brandDashboard.offerForm.category')}
                </label>
                <select
                  value={offerCategory}
                  onChange={(e) => setOfferCategory(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Select...</option>
                  <option value="equipment">Equipment</option>
                  <option value="nutrition">Nutrition</option>
                  <option value="travel">Travel</option>
                  <option value="health">Health</option>
                  <option value="training">Training</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('brandDashboard.offerForm.targetCountry')}
                </label>
                <select
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Any</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('brandDashboard.offerForm.targetSport')}
                </label>
                <input
                  type="text"
                  value={targetSport}
                  onChange={(e) => setTargetSport(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
            >
              <Gift className="w-5 h-5" />
              {loading ? 'Submitting...' : t('brandDashboard.buttons.offer')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
