import { useState, useEffect } from 'react';
import { Clock, Check, X, DollarSign, User, MessageSquare, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeclaredSupport {
  id: string;
  project_id: string;
  donor_name: string | null;
  donor_email: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at: string | null;
}

interface DeclaredSupportsManagerProps {
  projectId: string;
}

export default function DeclaredSupportsManager({ projectId }: DeclaredSupportsManagerProps) {
  const [supports, setSupports] = useState<DeclaredSupport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSupports();

    const subscription = supabase
      .channel('declared_supports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'declared_supports',
        filter: `project_id=eq.${projectId}`
      }, () => {
        loadSupports();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId]);

  const loadSupports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('declared_supports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupports(data || []);
    } catch (error) {
      console.error('Error loading supports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (supportId: string) => {
    setActionLoading(supportId);
    try {
      const { error } = await supabase
        .from('declared_supports')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', supportId);

      if (error) throw error;
      await loadSupports();
    } catch (error: any) {
      console.error('Error approving support:', error);
      alert('Error approving support: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (supportId: string) => {
    const reason = prompt('Optional: Add a reason for rejection (will be sent to donor if email provided)');

    setActionLoading(supportId);
    try {
      const { error } = await supabase
        .from('declared_supports')
        .update({
          status: 'rejected',
          rejection_reason: reason || null
        })
        .eq('id', supportId);

      if (error) throw error;
      await loadSupports();
    } catch (error: any) {
      console.error('Error rejecting support:', error);
      alert('Error rejecting support: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditAndApprove = async (supportId: string, currentAmount: number, currentName: string | null) => {
    const newAmount = prompt('Edit amount:', currentAmount.toString());
    if (!newAmount || parseFloat(newAmount) <= 0) return;

    const newName = prompt('Edit donor name (leave blank for anonymous):', currentName || '');

    setActionLoading(supportId);
    try {
      const { error } = await supabase
        .from('declared_supports')
        .update({
          amount: parseFloat(newAmount),
          donor_name: newName || null,
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', supportId);

      if (error) throw error;
      await loadSupports();
    } catch (error: any) {
      console.error('Error editing support:', error);
      alert('Error editing support: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };

    const icons = {
      pending: Clock,
      approved: Check,
      rejected: X
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const pendingSupports = supports.filter(s => s.status === 'pending');
  const approvedSupports = supports.filter(s => s.status === 'approved');
  const rejectedSupports = supports.filter(s => s.status === 'rejected');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (supports.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
          No support declarations yet. Share your project to start receiving support!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingSupports.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Pending Approval ({pendingSupports.length})
          </h3>
          <div className="space-y-3">
            {pendingSupports.map(support => (
              <div
                key={support.id}
                className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
                      <p className="font-semibold text-gray-900 dark:text-white dark:text-white">
                        {support.donor_name || 'Anonymous'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {new Date(support.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {getStatusBadge(support.status)}
                </div>

                <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-3 mb-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-1">
                    {support.amount} {support.currency}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    via {support.payment_method}
                  </p>
                </div>

                {support.message && (
                  <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">{support.message}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(support.id)}
                    disabled={actionLoading === support.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleEditAndApprove(support.id, support.amount, support.donor_name)}
                    disabled={actionLoading === support.id}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Edit & Approve
                  </button>
                  <button
                    onClick={() => handleReject(support.id)}
                    disabled={actionLoading === support.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvedSupports.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Approved ({approvedSupports.length})
          </h3>
          <div className="space-y-2">
            {approvedSupports.map(support => (
              <div
                key={support.id}
                className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white dark:text-white">
                    {support.donor_name || 'Anonymous'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    {new Date(support.approved_at!).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
                    {support.amount} {support.currency}
                  </p>
                  {getStatusBadge(support.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectedSupports.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
            <X className="w-5 h-5 text-red-500" />
            Rejected ({rejectedSupports.length})
          </h3>
          <div className="space-y-2">
            {rejectedSupports.map(support => (
              <div
                key={support.id}
                className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between opacity-60"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white dark:text-white">
                    {support.donor_name || 'Anonymous'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
                    {new Date(support.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 dark:text-white dark:text-white">
                    {support.amount} {support.currency}
                  </p>
                  {getStatusBadge(support.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
