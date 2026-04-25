import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/AdminLayout';
import {
  CheckCircle,
  XCircle,
  Target,
  DollarSign,
  Users,
  AlertCircle,
  Eye,
  Shield,
  Clock,
  TrendingUp
} from 'lucide-react';

interface Project {
  id: string;
  athlete_id: string;
  title: string;
  short_phrase: string;
  slug: string;
  category: string;
  goal_amount: number | null;
  currency: string;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  visible_supports_count: number;
  total_declared_amount: number;
  created_at: string;
  athlete: {
    full_name: string;
    email: string;
    country: string;
  };
}

interface DeclaredSupport {
  id: string;
  project_id: string;
  donor_name: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  message: string | null;
  status: string;
  created_at: string;
  project: {
    title: string;
    athlete: {
      full_name: string;
    };
  };
}

export default function AdminProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingSupports, setPendingSupports] = useState<DeclaredSupport[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: projectsData } = await supabase
        .from('athlete_support_projects')
        .select(`
          *,
          athlete:profiles!athlete_id(full_name, email, country)
        `)
        .order('created_at', { ascending: false });

      setProjects(projectsData || []);

      const { data: supportsData } = await supabase
        .from('declared_supports')
        .select(`
          *,
          project:athlete_support_projects!project_id(
            title,
            athlete:profiles!athlete_id(full_name)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingSupports(supportsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerification = async (projectId: string, currentlyVerified: boolean) => {
    setActionLoading(projectId);
    try {
      const updates = currentlyVerified
        ? { verified_by: null, verified_at: null }
        : { verified_by: profile?.id, verified_at: new Date().toISOString() };

      const { error } = await supabase
        .from('athlete_support_projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;

      await loadData();
    } catch (error: any) {
      console.error('Error toggling verification:', error);
      alert('Error: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const moderateSupport = async (supportId: string, action: 'approve' | 'reject') => {
    setActionLoading(supportId);
    try {
      const updates = action === 'approve'
        ? { status: 'approved', approved_at: new Date().toISOString(), approved_by: profile?.id }
        : { status: 'rejected' };

      const { error } = await supabase
        .from('declared_supports')
        .update(updates)
        .eq('id', supportId);

      if (error) throw error;

      await loadData();
    } catch (error: any) {
      console.error('Error moderating support:', error);
      alert('Error: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    verifiedProjects: projects.filter(p => p.verified_by).length,
    pendingSupportsCount: pendingSupports.length,
    totalRaised: projects.reduce((sum, p) => sum + (p.total_declared_amount || 0), 0)
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Support Projects Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verify projects, moderate supports, and monitor platform activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProjects}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.activeProjects}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Verified</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.verifiedProjects}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingSupportsCount}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-[#fdda36]" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Raised</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${stats.totalRaised.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Pending Supports Alert */}
        {pendingSupports.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-300 mb-2">
                  {pendingSupports.length} Pending Support{pendingSupports.length > 1 ? 's' : ''} Need Review
                </h3>
                <div className="space-y-3 mt-4">
                  {pendingSupports.map((support) => (
                    <div
                      key={support.id}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {support.donor_name || 'Anonymous'} → {support.project.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {support.amount} {support.currency} via {support.payment_method}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(support.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => moderateSupport(support.id, 'approve')}
                          disabled={actionLoading === support.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => moderateSupport(support.id, 'reject')}
                          disabled={actionLoading === support.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              All Projects
            </h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {projects.map((project) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {project.title}
                      </h3>
                      {project.verified_by && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      {project.short_phrase}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {project.athlete?.full_name || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {project.category}
                      </span>
                      {project.goal_amount && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {project.total_declared_amount} / {project.goal_amount} {project.currency}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {project.visible_supports_count} supporters
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleVerification(project.id, !!project.verified_by)}
                      disabled={actionLoading === project.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        project.verified_by
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {project.verified_by ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          Unverify
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Verify
                        </>
                      )}
                    </button>

                    <a
                      href={`/athlete/${project.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="p-12 text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No projects yet</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
