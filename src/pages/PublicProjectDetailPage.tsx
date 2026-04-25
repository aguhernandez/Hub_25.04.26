import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Heart,
  CheckCircle,
  Calendar,
  TrendingUp,
  DollarSign,
  User,
  MessageSquare,
  Copy,
  ExternalLink,
  ArrowLeft,
  Gift
} from 'lucide-react';

interface ProjectDetail {
  id: string;
  athlete_id: string;
  title: string;
  description: string;
  short_phrase: string;
  category: string;
  goal_amount: number | null;
  goal_type: 'money' | 'in-kind' | 'other';
  currency: string;
  deadline: string | null;
  is_continuous: boolean;
  payment_methods: any[];
  cover_media_url: string | null;
  verified_by: string | null;
  visible_supports_count: number;
  total_declared_amount: number;
  allow_messages: boolean;
  created_at: string;
}

interface AthleteInfo {
  full_name: string;
  country: string;
  sport: string;
  avatar_url: string | null;
}

interface DeclaredSupport {
  id: string;
  donor_name: string | null;
  amount: number;
  currency: string;
  message: string | null;
  approved_at: string;
}

interface BrandOffer {
  id: string;
  brand_name: string;
  brand_logo_url: string | null;
  offer_description: string;
  offer_link: string;
  is_active: boolean;
}

export default function PublicProjectDetailPage() {
  const { athleteSlug, projectSlug } = useParams<{ athleteSlug: string; projectSlug: string }>();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [athlete, setAthlete] = useState<AthleteInfo | null>(null);
  const [supports, setSupports] = useState<DeclaredSupport[]>([]);
  const [brandOffers, setBrandOffers] = useState<BrandOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonorForm, setShowDonorForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [donorForm, setDonorForm] = useState({
    donor_name: '',
    donor_email: '',
    amount: '',
    payment_method: '',
    message: ''
  });

  useEffect(() => {
    loadProjectDetails();
  }, [athleteSlug, projectSlug]);

  const loadProjectDetails = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, country, sport, avatar_url')
        .or(`public_profile_slug.eq.${athleteSlug},id.eq.${athleteSlug}`)
        .single();

      if (!profileData) throw new Error('Athlete not found');

      setAthlete(profileData);

      const { data: projectData } = await supabase
        .from('athlete_support_projects')
        .select('*')
        .eq('athlete_id', profileData.id)
        .eq('slug', projectSlug)
        .single();

      if (!projectData) throw new Error('Project not found');

      setProject(projectData);

      const { data: supportsData } = await supabase
        .from('declared_supports')
        .select('id, donor_name, amount, currency, message, approved_at')
        .eq('project_id', projectData.id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      setSupports(supportsData || []);

      const { data: offersData } = await supabase
        .from('brand_offers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4);

      setBrandOffers(offersData || []);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!project) return;

      const { error } = await supabase
        .from('declared_supports')
        .insert({
          project_id: project.id,
          donor_name: donorForm.donor_name || null,
          donor_email: donorForm.donor_email || null,
          amount: parseFloat(donorForm.amount),
          currency: project.currency,
          payment_method: donorForm.payment_method,
          message: donorForm.message || null,
          status: 'pending'
        });

      if (error) throw error;

      alert('Thank you! Your support declaration has been submitted and is pending athlete approval.');
      setShowDonorForm(false);
      setDonorForm({
        donor_name: '',
        donor_email: '',
        amount: '',
        payment_method: '',
        message: ''
      });
    } catch (error: any) {
      console.error('Error submitting declaration:', error);
      alert('Error submitting declaration: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const calculateProgress = (): number => {
    if (!project?.goal_amount || project.goal_amount === 0) return 0;
    return Math.min(100, Math.round((project.total_declared_amount / project.goal_amount) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#fdda36] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project || !athlete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Project not found</p>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 py-8 space-y-6">
        <Link
          to={`/athlete/${athleteSlug}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {athlete.full_name}'s Profile
        </Link>

        {/* Project Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {project.cover_media_url && (
            <div className="w-full h-64">
              <img
                src={project.cover_media_url}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
                  {project.verified_by && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm font-medium rounded-full">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">{project.short_phrase}</p>
              </div>
              <span className="inline-block px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-full whitespace-nowrap ml-4">
                {project.category}
              </span>
            </div>

            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <span className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {athlete.full_name}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {project.is_continuous ? 'Continuous' : `Ends ${new Date(project.deadline!).toLocaleDateString()}`}
              </span>
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none mb-8">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{project.description}</p>
            </div>

            {project.goal_amount && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Funding Progress</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {project.total_declared_amount} / {project.goal_amount} {project.currency}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-[#fdda36] h-4 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{progress}% funded by {project.visible_supports_count} supporters</p>
              </div>
            )}

            <button
              onClick={() => setShowDonorForm(true)}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-[#fdda36] text-[#514163] text-lg font-bold rounded-lg hover:bg-[#ffd51a] transition-colors"
            >
              <Heart className="w-6 h-6" />
              Support This Project
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        {showDonorForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Support {athlete.full_name}</h2>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Step 1: Send Payment</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Choose one of the payment methods below and send your contribution directly to the athlete:
              </p>

              <div className="space-y-3">
                {project.payment_methods && project.payment_methods.length > 0 ? (
                  project.payment_methods.map((method: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{method.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{method.value}</p>
                      </div>
                      <div className="flex gap-2">
                        {method.value.startsWith('http') ? (
                          <a
                            href={method.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        ) : (
                          <button
                            onClick={() => copyToClipboard(method.value, method.label)}
                            className="p-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#ffd51a] transition-colors"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No payment methods available.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitDeclaration} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Step 2: Declare Your Support</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount * (in {project.currency})
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={donorForm.amount}
                  onChange={(e) => setDonorForm({ ...donorForm, amount: e.target.value })}
                  placeholder="100"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method Used *
                </label>
                <select
                  required
                  value={donorForm.payment_method}
                  onChange={(e) => setDonorForm({ ...donorForm, payment_method: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="">Select payment method</option>
                  {project.payment_methods?.map((method: any, index: number) => (
                    <option key={index} value={method.type}>{method.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  value={donorForm.donor_name}
                  onChange={(e) => setDonorForm({ ...donorForm, donor_name: e.target.value })}
                  placeholder="Anonymous"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email (optional - for updates)
                </label>
                <input
                  type="email"
                  value={donorForm.donor_email}
                  onChange={(e) => setDonorForm({ ...donorForm, donor_email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>

              {project.allow_messages && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={donorForm.message}
                    onChange={(e) => setDonorForm({ ...donorForm, message: e.target.value })}
                    placeholder="Leave a message of support..."
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  By submitting, you confirm that you have sent the payment using one of the methods provided above. The athlete will review and approve your declaration.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDonorForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'I Have Sent Payment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Supporters List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#fdda36]" />
            Supporters ({supports.length})
          </h2>

          {supports.length > 0 ? (
            <div className="space-y-4">
              {supports.map((support) => (
                <div
                  key={support.id}
                  className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {support.donor_name || 'Anonymous'}
                      </p>
                    </div>
                    {support.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{support.message}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {new Date(support.approved_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {support.amount} {support.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Be the first to support this project!
              </p>
            </div>
          )}
        </div>

        {/* Brand Offers */}
        {brandOffers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Gift className="w-6 h-6 text-[#fdda36]" />
              Exclusive Partner Offers
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Check out these exclusive offers from our partner brands available to all supporters
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brandOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600 hover:border-[#fdda36] transition-colors"
                >
                  {offer.brand_logo_url && (
                    <div className="mb-4 h-16 flex items-center">
                      <img
                        src={offer.brand_logo_url}
                        alt={offer.brand_name}
                        className="h-full w-auto object-contain"
                      />
                    </div>
                  )}
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                    {offer.brand_name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                    {offer.offer_description}
                  </p>
                  <a
                    href={offer.offer_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors"
                  >
                    Claim Offer
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legal Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Legal Notice:</strong> Asciende does not process or handle payments. All financial transactions occur directly between supporters and athletes outside this platform. Support declarations reflect contributions sent externally and are subject to athlete verification.
          </p>
        </div>
      </div>
    </div>
  );
}
