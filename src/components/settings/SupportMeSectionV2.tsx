import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useMembership } from '../../hooks/useMembership';
import { Heart, Share2, Target, Settings, DollarSign, CreditCard as Edit, Plus, BarChart3, CheckCircle, TrendingUp, Calendar, Eye, Mail, Gift, MessageCircle, ExternalLink, Globe, Lock, Handshake, Percent, Users, Star } from 'lucide-react';
import PaymentMethodsForm from '../support/PaymentMethodsForm';
import AthletePageEditor from '../support/AthletePageEditor';
import CreateProjectModal from '../support/CreateProjectModal';
import DeclaredSupportsManager from '../support/DeclaredSupportsManager';
import ContactAdminForm from '../forms/ContactAdminForm';
import ProjectShareCard from '../support/ProjectShareCard';

interface SupportProject {
  id: string;
  title: string;
  description: string;
  short_phrase: string;
  slug: string;
  category: string;
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
}

export default function SupportMeSectionV2() {
  const { profile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const membership = useMembership();

  const [view, setView] = useState<'overview' | 'setup' | 'project-dashboard'>('overview');
  const [projects, setProjects] = useState<SupportProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SupportProject | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingProject, setEditingProject] = useState<SupportProject | null>(null);
  const [supportModeEnabled, setSupportModeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadData();
      setSupportModeEnabled(profile.support_mode_enabled || false);
    }
  }, [profile?.id, showCreateProject]);

  const isProfilePublic = () => {
    return profile?.profile_visibility === 'public';
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('athlete_support_projects')
        .select('*')
        .eq('athlete_id', profile?.id)
        .order('created_at', { ascending: false });

      setProjects(data || []);
    } finally {
      setLoading(false);
    }
  };

  const toggleSupportMode = async () => {
    const newValue = !supportModeEnabled;
    setSupportModeEnabled(newValue);

    try {
      await updateProfile({ support_mode_enabled: newValue });
      showToast(
        newValue ? 'Support mode enabled' : 'Support mode disabled',
        'success'
      );
    } catch (error) {
      console.error('Error toggling support mode:', error);
      setSupportModeEnabled(!newValue);
      showToast('Failed to update support mode', 'error');
    }
  };

  const navigateToPreferences = () => {
    const event = new CustomEvent('navigate', { detail: 'settings' });
    window.dispatchEvent(event);
    setTimeout(() => {
      const preferencesSection = document.querySelector('[data-section="preferences"]');
      preferencesSection?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const shareProfile = async () => {
    const slug = profile?.public_profile_slug || profile?.id;
    const profileUrl = `https://hub.asciende.pro/athlete/@${slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name} on Asciende`,
          text: 'Check out my athlete profile and support my projects!',
          url: profileUrl
        });
      } catch (error) {
        copyToClipboard(profileUrl);
      }
    } else {
      copyToClipboard(profileUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Profile link copied to clipboard!', 'success');
  };

  const calculateProgress = (project: SupportProject): number => {
    if (!project.goal_amount || project.goal_amount === 0) return 0;
    return Math.min(100, Math.round((project.total_declared_amount / project.goal_amount) * 100));
  };

  const hasPaymentMethods = () => {
    const links = profile?.payment_links as any || {};
    return links.iban || links.paypal || links.mercadopago || links.wise || links.mpesa;
  };

  const handleCreateProjectClick = () => {
    setShowCreateProject(true);
  };

  if (!membership.loading && !membership.hasAsciende) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#fdda36]/10 border border-[#fdda36]/20 flex items-center justify-center mx-auto mb-5">
          <Star className="w-8 h-8 text-[#fdda36]" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Premium Feature
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
          Creating a public support page and accepting contributions from your community requires an Asciende or Pro membership.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); const ev = new CustomEvent('navigate', { detail: 'membership' }); window.dispatchEvent(ev); }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-semibold rounded-xl hover:bg-[#ffd51a] transition-colors"
          >
            <Star className="w-4 h-4" />
            Upgrade to Premium
          </a>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-5">
          Available on Asciende and Pro membership tiers
        </p>
      </div>
    );
  }

  if (loading && view !== 'project-dashboard') {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (view === 'setup' && !showCreateProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView('overview')}
            className="text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white"
          >
            ← Back
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">Support Mode Settings</h3>

          <div className="space-y-4">
            {/* Profile Visibility Status */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/30">
              <div className="flex items-center gap-3 mb-2">
                {isProfilePublic() ? <Globe className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-gray-400" />}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white dark:text-white">Profile Visibility</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    Current: <span className="font-semibold">{profile?.profile_visibility === 'public' ? 'Public' : profile?.profile_visibility === 'team_only' ? 'Team Only' : 'Private'}</span>
                  </p>
                </div>
              </div>
              {!isProfilePublic() && (
                <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                    <strong>Note:</strong> Your profile must be set to "Public" to use Support Mode.
                  </p>
                  <button
                    onClick={navigateToPreferences}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    → Go to Preferences to change visibility
                  </button>
                </div>
              )}
            </div>

            {/* Support Mode Toggle */}
            <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white dark:text-white">Enable Support Mode</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    Accept contributions for your projects
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={supportModeEnabled}
                onChange={toggleSupportMode}
                disabled={!isProfilePublic() || !hasPaymentMethods()}
                className="w-5 h-5 text-[#fdda36] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36] disabled:opacity-50"
              />
            </label>
          </div>

          {(!isProfilePublic() || !hasPaymentMethods()) && (
            <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {!isProfilePublic() && 'Set your profile to Public in Preferences first. '}
                {!hasPaymentMethods() && 'Add payment methods below to enable support mode.'}
              </p>
            </div>
          )}
        </div>

        <PaymentMethodsForm onSave={loadData} />

        <div className="mt-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#fdda36]" />
            My Public Page
          </h3>
          <AthletePageEditor />
        </div>
      </div>
    );
  }

  if (view === 'project-dashboard' && selectedProject && !showCreateProject) {
    const progress = calculateProgress(selectedProject);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setView('overview');
              setSelectedProject(null);
              setEditingProject(null);
              setShowCreateProject(false);
            }}
            className="text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white"
          >
            ← Back to Projects
          </button>
          <button
            onClick={() => {
              setEditingProject(selectedProject);
              setShowCreateProject(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Edit className="w-4 h-4" />
            Edit Project
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{selectedProject.title}</h2>
                {selectedProject.verified_by && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm font-medium rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">{selectedProject.short_phrase}</p>
            </div>
          </div>

          {selectedProject.goal_amount && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Progress</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                  {selectedProject.total_declared_amount} / {selectedProject.goal_amount} {selectedProject.currency}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-[#fdda36] h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">{progress}% funded</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Total Raised</p>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
                {selectedProject.total_declared_amount} {selectedProject.currency}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Supporters</p>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
                {selectedProject.visible_supports_count}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">Deadline</p>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
                {selectedProject.is_continuous ? 'Continuous' : selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : 'No deadline'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowShareCard(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share Project
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#fdda36]" />
            Declared Supports
          </h3>
          <DeclaredSupportsManager projectId={selectedProject.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#514163] to-[#6b5179] rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-[#fdda36] rounded-full flex items-center justify-center text-[#514163] text-2xl font-bold border-4 border-white">
            {profile?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{profile?.full_name}</h2>
            <p className="text-white/80 mb-3">
              {profile?.country} • {profile?.sport}
            </p>
            <div className="flex gap-2">
              <button
                onClick={shareProfile}
                disabled={!isProfilePublic()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-4 h-4" />
                Share Profile
              </button>
              <button
                onClick={() => setView('setup')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
              >
                <Settings className="w-4 h-4" />
                Setup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Content */}
      {!supportModeEnabled ? (
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-8 text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-2">
            Support Mode Disabled
          </h3>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-6">
            Enable support mode to create projects and receive contributions from your community.
          </p>
          <button
            onClick={() => setView('setup')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
          >
            <Settings className="w-5 h-5" />
            Go to Setup
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-[#fdda36]" />
              My Projects
            </h3>
            <button
              onClick={handleCreateProjectClick}
              className="inline-flex items-center gap-2 px-4 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>

          {projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => {
                const progress = calculateProgress(project);
                return (
                  <div
                    key={project.id}
                    className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-6 cursor-pointer hover:border-[#fdda36] transition-colors"
                    onClick={() => {
                      setSelectedProject(project);
                      setView('project-dashboard');
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white">
                            {project.title}
                          </h4>
                          {project.verified_by && (
                            <CheckCircle className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 text-sm line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                      <span className="inline-block px-3 py-1 bg-[#fdda36] text-[#514163] text-sm font-medium rounded-full whitespace-nowrap ml-4">
                        {project.category}
                      </span>
                    </div>

                    {project.goal_amount && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">Progress</span>
                          <span className="font-semibold text-gray-900 dark:text-white dark:text-white">
                            {project.total_declared_amount} / {project.goal_amount} {project.currency} ({progress}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-[#fdda36] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {project.visible_supports_count} supporters
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-8 text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white mb-2">
                No projects yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-6">
                Create your first support project to start receiving contributions from your community.
              </p>
              <button
                onClick={handleCreateProjectClick}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Project
              </button>
            </div>
          )}
        </div>
      )}

      {showCreateProject && (
        <CreateProjectModal
          onClose={() => {
            setShowCreateProject(false);
            setEditingProject(null);
          }}
          onSuccess={() => {
            setShowCreateProject(false);
            setEditingProject(null);
            loadData();
          }}
          existingProject={editingProject}
        />
      )}

      {showShareCard && selectedProject && (
        <ProjectShareCard
          project={{
            ...selectedProject,
            athlete_name: profile?.full_name || undefined,
          }}
          onClose={() => setShowShareCard(false)}
        />
      )}

    </div>
  );
}
