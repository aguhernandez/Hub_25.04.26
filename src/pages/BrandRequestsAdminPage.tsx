import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import {
  Briefcase,
  Check,
  X,
  Eye,
  Clock,
  Mail,
  Phone,
  Globe,
  DollarSign,
  Filter,
  Search
} from 'lucide-react';

interface BrandRequest {
  id: string;
  company_name: string;
  company_website: string | null;
  company_country: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  collaboration_type: string;
  collaboration_description: string;
  estimated_budget: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export default function BrandRequestsAdminPage() {
  const [requests, setRequests] = useState<BrandRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<BrandRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BrandRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter, searchTerm]);

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brand_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  const filterRequests = () => {
    let filtered = requests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  };

  const updateRequestStatus = async (requestId: string, newStatus: string, notes?: string) => {
    const { error } = await supabase
      .from('brand_requests')
      .update({
        status: newStatus,
        admin_notes: notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (!error) {
      await loadRequests();
      setSelectedRequest(null);
    }
  };

  const createBrandFromRequest = async (request: BrandRequest) => {
    const slug = request.company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .insert([{
        name: request.company_name,
        slug,
        description: request.collaboration_description,
        website: request.company_website,
        contact_email: request.contact_email,
        contact_phone: request.contact_phone,
        country: request.company_country,
        collaboration_types: [request.collaboration_type],
        is_active: true
      }])
      .select()
      .single();

    if (!brandError && brand) {
      await supabase
        .from('brand_requests')
        .update({
          status: 'approved',
          created_brand_id: brand.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      await loadRequests();
      setSelectedRequest(null);
      alert('Brand profile created successfully!');
    } else {
      alert('Error creating brand profile');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'reviewing':
        return 'bg-blue-100 text-blue-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700 dark:text-gray-300';
    }
  };

  const getCollaborationTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  return (
    <AdminLayout currentPage="brand-requests">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Brand Partnerships</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve partnership requests</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by company or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {requests.filter(r => r.status === 'reviewing').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Reviewing</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-red-600">
              {requests.filter(r => r.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600 dark:text-gray-400">No brand requests match your filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{request.company_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:text-gray-300">
                          {getCollaborationTypeLabel(request.collaboration_type)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {request.contact_email}
                        </div>
                        {request.contact_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {request.contact_phone}
                          </div>
                        )}
                        {request.company_country && (
                          <div className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            {request.company_country}
                          </div>
                        )}
                        {request.estimated_budget && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {request.estimated_budget}
                          </div>
                        )}
                      </div>

                      <p className="text-gray-700 line-clamp-2 mb-2">{request.collaboration_description}</p>

                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        Submitted {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <button className="ml-4 p-2 hover:bg-gray-200 rounded-lg transition-colors">
                      <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Detail Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Brand Request Details</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedRequest.company_name}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Contact Name</label>
                      <p className="text-gray-900 dark:text-white">{selectedRequest.contact_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <p className="text-gray-900 dark:text-white">{selectedRequest.contact_email}</p>
                    </div>
                    {selectedRequest.contact_phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                        <p className="text-gray-900 dark:text-white">{selectedRequest.contact_phone}</p>
                      </div>
                    )}
                    {selectedRequest.company_country && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Country</label>
                        <p className="text-gray-900 dark:text-white">{selectedRequest.company_country}</p>
                      </div>
                    )}
                    {selectedRequest.company_website && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Website</label>
                        <a
                          href={selectedRequest.company_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {selectedRequest.company_website}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Collaboration Type</label>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {getCollaborationTypeLabel(selectedRequest.collaboration_type)}
                    </span>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.collaboration_description}</p>
                  </div>

                  {selectedRequest.estimated_budget && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Estimated Budget</label>
                      <p className="text-gray-900 dark:text-white">{selectedRequest.estimated_budget}</p>
                    </div>
                  )}

                  {selectedRequest.admin_notes && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Admin Notes</label>
                      <p className="text-gray-900 dark:text-white">{selectedRequest.admin_notes}</p>
                    </div>
                  )}
                </div>

                {selectedRequest.status !== 'approved' && selectedRequest.status !== 'rejected' && (
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => updateRequestStatus(selectedRequest.id, 'reviewing')}
                      className="flex-1 px-4 py-2.5 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                    >
                      Mark as Reviewing
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Create brand profile from this request?')) {
                          createBrandFromRequest(selectedRequest);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                      Approve & Create Brand
                    </button>
                    <button
                      onClick={() => {
                        const notes = prompt('Rejection reason (optional):');
                        updateRequestStatus(selectedRequest.id, 'rejected', notes || undefined);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
