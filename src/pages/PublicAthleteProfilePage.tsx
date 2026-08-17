import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  MapPin,
  Activity,
  Target,
  Heart,
  Calendar,
  TrendingUp,
  CheckCircle,
  Lock,
  AlertCircle
} from 'lucide-react';

interface AthleteProfile {
  id: string;
  full_name: string;
  country: string;
  sport: string;
  avatar_url: string | null;
  profile_visibility: string;
  support_mode_enabled: boolean;
}

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
  cover_media_url: string | null;
  status: 'active' | 'paused' | 'closed';
  verified_by: string | null;
  visible_supports_count: number;
  total_declared_amount: number;
  created_at: string;
}

export default function PublicAthleteProfilePage() {
  const { athleteSlug } = useParams<{ athleteSlug: string }>();
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [projects, setProjects] = useState<SupportProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAthleteProfile();
  }, [athleteSlug]);

  const loadAthleteProfile = async () => {
    setLoading(true);
    setError('');

    try {
      if (!athleteSlug) {
        throw new Error('Athlete not found');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, country, sport, avatar_url, profile_visibility, support_mode_enabled')
        .or(`public_profile_slug.eq."${athleteSlug}",id.eq."${athleteSlug}"`)
        .maybeSingle();

      if (profileError || !profileData) throw new Error('Athlete not found');

      if (profileData.profile_visibility !== 'public' || !profileData.support_mode_enabled) {
        setError('This profile is private or support mode is disabled.');
        setLoading(false);
        return;
      }

      setAthlete(profileData);

      const { data: projectsData, error: projectsError } = await supabase
        .from('athlete_support_projects')
        .select('*')
        .eq('athlete_id', profileData.id)
        .eq('status', 'active')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);
    } catch (err: any) {
      console.error('Error loading athlete profile:', err);
      setError(err.message || 'Failed to load athlete profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (project: SupportProject): number => {
    if (!project.goal_amount || project.goal_amount === 0) return 0;
    return Math.min(100, Math.round((project.total_declared_amount / project.goal_amount) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading athlete profile...</p>
        </div>
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {error.includes('private') ? (
              <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {error.includes('private') ? 'Private Profile' : 'Profile Not Found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 py-8 space-y-6">
        {/* Athlete Header */}
        <div className="bg-gradient-to-r from-[#514163] to-[#6b5179] rounded-xl p-8 text-white">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-[#fdda36] rounded-full flex items-center justify-center text-[#514163] text-3xl font-bold border-4 border-white flex-shrink-0">
              {athlete.avatar_url ? (
                <img
                  src={athlete.avatar_url}
                  alt={athlete.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                athlete.full_name?.charAt(0) || '?'
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-3">{athlete.full_name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {athlete.country}
                </span>
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {athlete.sport}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-[#fdda36]" />
            Active Projects
          </h2>

          {projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => {
                const progress = calculateProgress(project);
                return (
                  <Link
                    key={project.id}
                    to={`/athlete/${athleteSlug}/project/${project.slug}`}
                    className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-[#fdda36] hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {project.title}
                          </h3>
                          {project.verified_by && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs font-medium rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-1">{project.short_phrase}</p>
                      </div>
                      <span className="inline-block px-3 py-1 bg-[#fdda36] text-[#514163] text-sm font-medium rounded-full whitespace-nowrap ml-4">
                        {project.category}
                      </span>
                    </div>

                    {project.cover_media_url && (
                      <div className="mb-4">
                        <img
                          src={project.cover_media_url}
                          alt={project.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                      {project.description}
                    </p>

                    {project.goal_amount && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">Progress</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {project.total_declared_amount} / {project.goal_amount} {project.currency}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className="bg-[#fdda36] h-3 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{progress}% funded</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {project.visible_supports_count} supporters
                      </span>
                      {project.deadline && !project.is_continuous && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Ends {new Date(project.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {project.is_continuous && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          Continuous support
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-bold rounded-lg hover:bg-[#ffd51a] transition-colors">
                        <Heart className="w-5 h-5" />
                        Support This Project
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Active Projects
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This athlete doesn't have any active support projects at the moment.
              </p>
            </div>
          )}
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Important:</strong> Asciende does not process payments. All contributions are handled externally by the athlete. Support declarations are confirmed by the athlete after payment is received.
          </p>
        </div>
      </div>
    </div>
  );
}
