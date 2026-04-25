import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  Globe,
  Trophy,
  Target,
  Search,
  Filter,
  Eye,
  Calendar,
  X,
  TrendingUp,
  Share2,
  Mail
} from 'lucide-react';
import ContactAthleteForm from '../components/forms/ContactAthleteForm';
import ProjectShareCard from '../components/support/ProjectShareCard';

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
  athlete_email?: string;
  athlete_bio?: string;
}

interface TransparencyUpdate {
  id: string;
  update_description: string;
  images: string[] | null;
  created_at: string;
}

const COUNTRIES = [
  'All', 'Argentina', 'Australia', 'Brazil', 'Canada', 'Chile', 'Colombia',
  'Costa Rica', 'Ecuador', 'Mexico', 'Panama', 'Peru', 'Spain', 'United States', 'Uruguay'
];

const DISCIPLINES = [
  'All', 'Beach Volleyball', 'Volleyball', 'Cycling', 'Running',
  'Swimming', 'Triathlon', 'Other'
];

const NEED_TYPES = [
  { value: 'all', label: { en: 'All', es: 'Todos' } },
  { value: 'travel', label: { en: 'Travel', es: 'Viajes' } },
  { value: 'equipment', label: { en: 'Equipment', es: 'Equipamiento' } },
  { value: 'training', label: { en: 'Training', es: 'Entrenamiento' } },
  { value: 'education', label: { en: 'Education', es: 'Educación' } },
  { value: 'health', label: { en: 'Health', es: 'Salud' } }
];

export default function DiscoverProjectsPage() {
  const { t, language } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [transparencyUpdates, setTransparencyUpdates] = useState<TransparencyUpdate[]>([]);
  const [similarProjects, setSimilarProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showTransparency, setShowTransparency] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [disciplineFilter, setDisciplineFilter] = useState('All');
  const [needTypeFilter, setNeedTypeFilter] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [projects, searchTerm, countryFilter, disciplineFilter, needTypeFilter, progressFilter]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data: projectsData, error } = await supabase
        .from('athlete_support_projects')
        .select(`
          *,
          profiles:athlete_id (
            full_name,
            email,
            athlete_bio
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedProjects = (projectsData || []).map(p => ({
        ...p,
        athlete_name: p.profiles?.full_name || 'Unknown Athlete',
        athlete_email: p.profiles?.email || '',
        athlete_bio: p.profiles?.athlete_bio || ''
      }));

      setProjects(enrichedProjects);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...projects];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(search) ||
        p.athlete_name?.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.sport.toLowerCase().includes(search)
      );
    }

    if (countryFilter !== 'All') {
      filtered = filtered.filter(p => p.country === countryFilter);
    }

    if (disciplineFilter !== 'All') {
      filtered = filtered.filter(p => p.sport === disciplineFilter);
    }

    if (needTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.category === needTypeFilter);
    }

    if (progressFilter === 'active') {
      filtered = filtered.filter(p => p.progress_percentage < 100);
    } else if (progressFilter === 'completed') {
      filtered = filtered.filter(p => p.progress_percentage === 100);
    }

    setFilteredProjects(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCountryFilter('All');
    setDisciplineFilter('All');
    setNeedTypeFilter('all');
    setProgressFilter('all');
  };

  const viewProjectDetails = async (project: Project) => {
    setSelectedProject(project);

    const { data: updates } = await supabase
      .from('project_transparency_updates')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    setTransparencyUpdates(updates || []);

    const similar = projects.filter(p =>
      p.id !== project.id &&
      (p.sport === project.sport || p.country === project.country)
    ).slice(0, 3);

    setSimilarProjects(similar);
  };

  const shareProject = async () => {
    if (!selectedProject) return;

    const projectUrl = `${window.location.origin}/discover/${selectedProject.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedProject.title,
          text: selectedProject.description,
          url: projectUrl
        });
      } catch (error) {
        copyToClipboard(projectUrl);
      }
    } else {
      copyToClipboard(projectUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(language === 'en' ? 'Project link copied!' : '¡Enlace del proyecto copiado!');
  };

  const getCategoryLabel = (category: string) => {
    const type = NEED_TYPES.find(t => t.value === category);
    return type?.label[language as 'en' | 'es'] || category;
  };

  if (selectedProject) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setSelectedProject(null);
            setShowTransparency(false);
          }}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
          {t('buttons.back')}
        </button>

        {/* Project Hero */}
        <div className="bg-gradient-to-r from-[#514163] to-[#6b5179] rounded-xl p-8 text-white">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-[#fdda36] rounded-full flex items-center justify-center text-[#514163] text-2xl font-bold border-4 border-white">
              {selectedProject.athlete_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{selectedProject.title}</h1>
              <div className="flex items-center gap-4 text-white/90 mb-4">
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {selectedProject.country}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  {selectedProject.sport}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedProject.start_date).toLocaleDateString()}
                </span>
              </div>
              <span className="inline-block px-4 py-2 bg-[#fdda36] text-[#514163] text-sm font-semibold rounded-full">
                {getCategoryLabel(selectedProject.category)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('discoverProjects.projectCard.progress')}
            </span>
            <span className="text-2xl font-bold text-[#fdda36]">
              {selectedProject.progress_percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-[#fdda36] h-3 rounded-full transition-all duration-300"
              style={{ width: `${selectedProject.progress_percentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Description */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('discoverProjects.details.projectDetails')}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {selectedProject.description}
              </p>
            </div>

            {/* Transparency Updates */}
            {showTransparency && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#fdda36]" />
                  {t('discoverProjects.details.transparencyUpdates')}
                </h2>

                {transparencyUpdates.length > 0 ? (
                  <div className="space-y-6">
                    {transparencyUpdates.map((update, index) => (
                      <div key={update.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-[#fdda36] rounded-full" />
                          {index !== transparencyUpdates.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-600 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {new Date(update.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-gray-900 dark:text-white">{update.update_description}</p>
                          {update.images && update.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              {update.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Update ${i + 1}`}
                                  className="rounded-lg w-full h-32 object-cover"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('discoverProjects.details.noUpdates')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* About Athlete */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {t('discoverProjects.details.aboutAthlete')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {selectedProject.athlete_bio || 'No bio available'}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowContactForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {t('discoverProjects.details.contact')}
                </button>
                <button
                  onClick={() => setShowTransparency(!showTransparency)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {t('discoverProjects.details.report')}
                </button>
                <button
                  onClick={() => setShowShareCard(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#fdda36] text-[#060810] font-bold rounded-lg hover:bg-[#ffd01a] transition-colors shadow-md shadow-amber-400/20"
                >
                  <Share2 className="w-4 h-4" />
                  {t('discoverProjects.details.share')}
                </button>
              </div>
            </div>

            {/* Similar Projects */}
            {similarProjects.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  {t('discoverProjects.projectCard.similar')}
                </h3>
                <div className="space-y-3">
                  {similarProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => viewProjectDetails(project)}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                        {project.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {project.athlete_name} • {project.country}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {showContactForm && selectedProject.athlete_email && (
          <ContactAthleteForm
            athleteEmail={selectedProject.athlete_email}
            athleteName={selectedProject.athlete_name || 'Athlete'}
            onClose={() => setShowContactForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="w-8 h-8 text-[#fdda36]" />
          {t('discoverProjects.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('discoverProjects.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-[#fdda36]" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {language === 'en' ? 'Filters' : 'Filtros'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('discoverProjects.filters.search')}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            {COUNTRIES.map(country => (
              <option key={country} value={country}>
                {country === 'All' ? t('discoverProjects.filters.all') : country}
              </option>
            ))}
          </select>

          <select
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            {DISCIPLINES.map(discipline => (
              <option key={discipline} value={discipline}>
                {discipline === 'All' ? t('discoverProjects.filters.all') : discipline}
              </option>
            ))}
          </select>

          <select
            value={needTypeFilter}
            onChange={(e) => setNeedTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            {NEED_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label[language as 'en' | 'es']}
              </option>
            ))}
          </select>

          <select
            value={progressFilter}
            onChange={(e) => setProgressFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">{t('discoverProjects.filters.all')}</option>
            <option value="active">{t('discoverProjects.filters.active')}</option>
            <option value="completed">{t('discoverProjects.filters.completed')}</option>
          </select>
        </div>

        <button
          onClick={clearFilters}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          {t('discoverProjects.filters.clear')}
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => viewProjectDetails(project)}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#fdda36] rounded-full flex items-center justify-center text-[#514163] text-lg font-bold">
                    {project.athlete_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {project.athlete_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {project.country}
                    </p>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {project.title}
                </h4>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {project.description}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-[#fdda36]/20 text-[#514163] dark:text-[#fdda36] text-xs font-medium rounded-full">
                    {getCategoryLabel(project.category)}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {project.sport}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('discoverProjects.projectCard.progress')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {project.progress_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-[#fdda36] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress_percentage}%` }}
                    />
                  </div>
                </div>

                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors">
                  <Eye className="w-4 h-4" />
                  {t('discoverProjects.projectCard.view')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('discoverProjects.noProjects')}
          </h3>
        </div>
      )}

      {showShareCard && selectedProject && (
        <ProjectShareCard
          project={{
            id: selectedProject.id,
            title: selectedProject.title,
            description: selectedProject.description,
            category: selectedProject.category,
            athlete_name: selectedProject.athlete_name,
            ...(selectedProject as any),
          }}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
