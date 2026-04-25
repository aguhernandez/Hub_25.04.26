import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Mail, Calendar, User, CheckCircle, Archive, Reply, Filter } from 'lucide-react';

interface ProjectProposal {
  id: string;
  athlete_name: string;
  email: string;
  country: string;
  sport: string;
  need_type: string;
  description: string;
  social_link: string | null;
  status: 'unread' | 'reviewed' | 'archived';
  created_at: string;
}

interface AthleteMessage {
  id: string;
  sender_name: string;
  sender_email: string;
  organization: string | null;
  message: string;
  athlete_email: string;
  status: 'unread' | 'reviewed' | 'archived';
  created_at: string;
}

interface AdminMessage {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  message: string;
  status: 'unread' | 'reviewed' | 'archived';
  created_at: string;
}

type Request = (ProjectProposal | AthleteMessage | AdminMessage) & {
  type: 'proposal' | 'athlete' | 'admin';
};

export default function IncomingRequestsPage() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'proposal' | 'athlete' | 'admin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'reviewed' | 'archived'>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [proposals, athleteMessages, adminMessages] = await Promise.all([
        supabase.from('project_proposals').select('*').order('created_at', { ascending: false }),
        supabase.from('athlete_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_messages').select('*').order('created_at', { ascending: false })
      ]);

      const allRequests: Request[] = [
        ...(proposals.data || []).map(p => ({ ...p, type: 'proposal' as const })),
        ...(athleteMessages.data || []).map(m => ({ ...m, type: 'athlete' as const })),
        ...(adminMessages.data || []).map(m => ({ ...m, type: 'admin' as const }))
      ];

      allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRequests(allRequests);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (request: Request, newStatus: 'reviewed' | 'archived') => {
    const table = request.type === 'proposal'
      ? 'project_proposals'
      : request.type === 'athlete'
      ? 'athlete_messages'
      : 'admin_messages';

    const { error } = await supabase
      .from(table)
      .update({ status: newStatus })
      .eq('id', request.id);

    if (!error) {
      loadRequests();
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'proposal':
        return t('forms.adminView.projectProposal');
      case 'athlete':
        return t('forms.adminView.athleteMessage');
      case 'admin':
        return t('forms.adminView.adminMessage');
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'reviewed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filterType !== 'all' && req.type !== filterType) return false;
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('forms.adminView.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage project proposals, messages, and support requests
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="all">{t('forms.adminView.type')}: All</option>
            <option value="proposal">{t('forms.adminView.projectProposal')}</option>
            <option value="athlete">{t('forms.adminView.athleteMessage')}</option>
            <option value="admin">{t('forms.adminView.adminMessage')}</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fdda36] focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="all">{t('forms.adminView.status')}: All</option>
            <option value="unread">{t('forms.adminView.unread')}</option>
            <option value="reviewed">{t('forms.adminView.reviewed')}</option>
            <option value="archived">{t('forms.adminView.archived')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading requests...</p>
        </div>
      ) : filteredRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={`${request.type}-${request.id}`}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#fdda36] text-[#514163]">
                    {getTypeLabel(request.type)}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {'athlete_name' in request && (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">{request.athlete_name}</span>
                      <span className="text-gray-600 dark:text-gray-400">({request.email})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Country:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{request.country}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Sport:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{request.sport}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Need:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{request.need_type}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{request.description}</p>
                    {request.social_link && (
                      <a
                        href={request.social_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#fdda36] hover:underline text-sm"
                      >
                        View social media / video
                      </a>
                    )}
                  </>
                )}

                {'sender_name' in request && 'athlete_email' in request && (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">{request.sender_name}</span>
                      <span className="text-gray-600 dark:text-gray-400">({request.sender_email})</span>
                    </div>
                    {request.organization && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Organization: {request.organization}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      To athlete: {request.athlete_email}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">{request.message}</p>
                  </>
                )}

                {'subject' in request && (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">{request.sender_name}</span>
                      <span className="text-gray-600 dark:text-gray-400">({request.sender_email})</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Subject: {request.subject}</h3>
                    <p className="text-gray-700 dark:text-gray-300">{request.message}</p>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {request.status !== 'reviewed' && (
                  <button
                    onClick={() => updateStatus(request, 'reviewed')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 font-medium rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('forms.adminView.markReviewed')}
                  </button>
                )}
                {request.status !== 'archived' && (
                  <button
                    onClick={() => updateStatus(request, 'archived')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                )}
                <a
                  href={`mailto:${'sender_email' in request ? request.sender_email : request.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  {t('forms.adminView.reply')}
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No requests found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your filters
          </p>
        </div>
      )}
    </div>
  );
}
