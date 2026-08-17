import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Tag, ExternalLink, Calendar, DollarSign, Award, Target, TrendingUp, Search, Heart, Plus, MessageCircle } from 'lucide-react';
import ProposeProjectForm from '../components/forms/ProposeProjectForm';
import ContactAthleteForm from '../components/forms/ContactAthleteForm';
import ContactAdminForm from '../components/forms/ContactAdminForm';

interface BrandProject {
  id: string;
  title: string;
  brand_name: string;
  description: string;
  project_type: string;
  budget: string | null;
  deadline: string | null;
  requirements: string | null;
  contact_email: string | null;
  is_active: boolean;
}

export default function BrandProjectsPage() {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<BrandProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [showContactAthleteForm, setShowContactAthleteForm] = useState<{ email: string; name: string } | null>(null);
  const [showContactAdminForm, setShowContactAdminForm] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('brand_projects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setProjects(data || []);
    } finally {
      setLoading(false);
    }
  };

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'sponsorship':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'scholarship':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'partnership':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'ambassador':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const filteredProjects = projects.filter(project => {
    const search = searchTerm.toLowerCase();
    return (
      project.title.toLowerCase().includes(search) ||
      project.brand_name.toLowerCase().includes(search) ||
      project.description.toLowerCase().includes(search) ||
      project.project_type.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('supportProjects.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('supportProjects.disclaimer')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowProposeForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            {t('supportProjects.proposeProject')}
          </button>
          <button
            onClick={() => setShowContactAdminForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-5 h-5" />
            {t('buttons.contactAdmin')}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('labels.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading opportunities...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getProjectTypeColor(project.project_type)}`}>
                      {project.project_type}
                    </span>
                    {project.brand_name && (
                      <span className="text-sm font-semibold text-[#514163] dark:text-[#fdda36]">
                        {project.brand_name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {project.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {project.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {project.budget && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-[#fdda36]" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {project.budget}
                        </span>
                      </div>
                    )}
                    {project.deadline && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-[#fdda36]" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Deadline: {new Date(project.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {project.requirements && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Requirements
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {project.requirements}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {project.contact_email && (
                  <button
                    onClick={() => setShowContactAthleteForm({ email: project.contact_email!, name: project.brand_name })}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    {t('buttons.supportMe')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : searchTerm ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No results found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try different search terms
          </p>
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('supportProjects.noProjects')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('supportProjects.thankYou')}
          </p>
        </div>
      )}

      {showProposeForm && (
        <ProposeProjectForm onClose={() => setShowProposeForm(false)} />
      )}

      {showContactAthleteForm && (
        <ContactAthleteForm
          athleteEmail={showContactAthleteForm.email}
          athleteName={showContactAthleteForm.name}
          onClose={() => setShowContactAthleteForm(null)}
        />
      )}

      {showContactAdminForm && (
        <ContactAdminForm onClose={() => setShowContactAdminForm(false)} />
      )}
    </div>
  );
}
