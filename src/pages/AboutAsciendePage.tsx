import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Target, Eye, Heart, Lightbulb, Globe, Users, TrendingUp, Award, Briefcase, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AboutAsciendePage() {
  const { t } = useLanguage();
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    company_website: '',
    company_country: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    collaboration_type: 'sponsorship',
    collaboration_description: '',
    estimated_budget: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('brand_requests')
        .insert([formData]);

      if (error) throw error;

      setSubmitted(true);
      setTimeout(() => {
        setShowPartnerForm(false);
        setSubmitted(false);
        setFormData({
          company_name: '',
          company_website: '',
          company_country: '',
          contact_name: '',
          contact_email: '',
          contact_phone: '',
          collaboration_type: 'sponsorship',
          collaboration_description: '',
          estimated_budget: ''
        });
      }, 3000);
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Error submitting request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center max-w-3xl mx-auto">
        <div className="w-20 h-20 bg-[#fdda36] rounded-full flex items-center justify-center mx-auto mb-6">
          <img src="/logo_transp.png" alt="Asciende" className="w-16 h-16 object-contain" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('about.asciende.title')}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
          {t('about.asciende.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="w-12 h-12 bg-[#fdda36]/10 rounded-lg flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-[#fdda36]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('about.asciende.mission')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('about.asciende.missionText')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="w-12 h-12 bg-[#514163]/10 rounded-lg flex items-center justify-center mb-4">
            <Eye className="w-6 h-6 text-[#514163]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('about.asciende.vision')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('about.asciende.visionText')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Heart className="w-6 h-6 text-[#fdda36]" />
          {t('about.asciende.values')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#fdda36]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-[#fdda36]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {t('about.asciende.value1')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#fdda36]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-[#fdda36]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {t('about.asciende.value2')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#514163]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-[#514163]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {t('about.asciende.value3')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#514163]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-[#514163]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {t('about.asciende.value4')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Partner with Asciende Section */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 md:p-12 mt-8 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Partner with Asciende</h2>
            <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto">
              Join us in supporting athletes from the Global South. Create meaningful impact through sponsorships, discounts, or community projects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🤝</div>
              <h3 className="font-bold mb-2">Sponsorships</h3>
              <p className="text-sm text-blue-100">Support individual athletes or teams</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🎁</div>
              <h3 className="font-bold mb-2">Discounts & Offers</h3>
              <p className="text-sm text-blue-100">Exclusive deals for our community</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">❤️</div>
              <h3 className="font-bold mb-2">Community Projects</h3>
              <p className="text-sm text-blue-100">Fund facilities and equipment</p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowPartnerForm(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg transform hover:scale-105"
            >
              <Send className="w-5 h-5" />
              Get in Touch
            </button>
          </div>
        </div>
      </div>

      {/* Partner Request Form Modal */}
      {showPartnerForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {submitted ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="text-4xl">✓</div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We've received your partnership request. Our team will contact you shortly.
                </p>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Partnership Request</h3>
                  <button
                    onClick={() => setShowPartnerForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company / Organization *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your company name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={formData.company_website}
                        onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 234 567 8900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.company_country}
                        onChange={(e) => setFormData({ ...formData, company_country: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your country"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type of Collaboration *
                    </label>
                    <select
                      required
                      value={formData.collaboration_type}
                      onChange={(e) => setFormData({ ...formData, collaboration_type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="sponsorship">Sponsorship</option>
                      <option value="discount">Discount / Promotion</option>
                      <option value="donation">Donation</option>
                      <option value="project">Community Project</option>
                      <option value="equipment">Equipment Support</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tell us about your collaboration idea *
                    </label>
                    <textarea
                      required
                      value={formData.collaboration_description}
                      onChange={(e) => setFormData({ ...formData, collaboration_description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="Describe how you'd like to partner with us..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Budget (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.estimated_budget}
                      onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., $5,000 - $10,000"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setShowPartnerForm(false)}
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Request
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-[#fdda36] to-[#ffd51a] rounded-xl shadow-lg p-8 mt-8">
        <div className="max-w-3xl mx-auto text-center">
          <TrendingUp className="w-12 h-12 text-[#514163] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#514163] mb-4">
            Join the Movement
          </h2>
          <p className="text-[#514163] text-lg mb-6">
            Together, we're building a global community of athletes who support each other's journey to excellence.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://asciende.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#514163] text-white font-medium rounded-lg hover:bg-[#3d2f4d] transition-colors"
            >
              Visit asciende.pro
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('about.asciende.dataSources') || 'Data Sources'}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Food data provided by Open Food Facts (ODbL).
          </p>
        </div>
      </div>
    </div>
  );
}
