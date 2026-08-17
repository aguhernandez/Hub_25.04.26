import { useState, useEffect } from 'react';
import { X, Target, Calendar, DollarSign, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CountrySelect from '../CountrySelect';

interface PaymentMethod {
  type: string;
  label: string;
  value: string;
}

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
  existingProject?: any;
}

export default function CreateProjectModal({ onClose, onSuccess, existingProject }: CreateProjectModalProps) {
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    short_phrase: '',
    description: '',
    category: 'training' as 'travel' | 'equipment' | 'training' | 'education' | 'health',
    country: '',
    goal_amount: '',
    goal_type: 'money' as 'money' | 'in-kind' | 'other',
    currency: 'USD',
    deadline: '',
    is_continuous: false,
    cover_media_url: '',
    allow_messages: true
  });

  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingProject) {
      setFormData({
        title: existingProject.title || '',
        short_phrase: existingProject.short_phrase || '',
        description: existingProject.description || '',
        category: existingProject.category || 'training',
        country: existingProject.country || profile?.country || '',
        goal_amount: existingProject.goal_amount?.toString() || '',
        goal_type: existingProject.goal_type || 'money',
        currency: existingProject.currency || 'USD',
        deadline: existingProject.deadline || '',
        is_continuous: existingProject.is_continuous || false,
        cover_media_url: existingProject.cover_media_url || '',
        allow_messages: existingProject.allow_messages ?? true
      });

      if (existingProject.payment_methods) {
        try {
          const methods = typeof existingProject.payment_methods === 'string'
            ? JSON.parse(existingProject.payment_methods)
            : existingProject.payment_methods;
          setSelectedPaymentMethods(methods.map((m: PaymentMethod) => m.type));
        } catch (err) {
          console.error('Error parsing payment methods:', err);
          setSelectedPaymentMethods([]);
        }
      }
    } else {
      setFormData(prev => ({ ...prev, country: profile?.country || '' }));
    }
  }, [existingProject, profile?.country]);


  const availablePaymentMethods = () => {
    const links = profile?.payment_links as any || {};
    const methods = [];

    if (links.iban) methods.push({ type: 'iban', label: 'Bank Transfer (IBAN/CBU)', value: links.iban });
    if (links.paypal) methods.push({ type: 'paypal', label: 'PayPal', value: links.paypal });
    if (links.mercadopago) methods.push({ type: 'mercadopago', label: 'MercadoPago', value: links.mercadopago });
    if (links.wise) methods.push({ type: 'wise', label: 'Wise', value: links.wise });

    return methods;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);

    try {
      const methods = availablePaymentMethods().filter(m =>
        selectedPaymentMethods.includes(m.type)
      );

      if (methods.length === 0 && !existingProject) {
        setError('Select at least one payment method');
        setLoading(false);
        return;
      }

      const slug = existingProject?.slug || await generateSlug(formData.title);

      const projectData = {
        athlete_id: profile?.id,
        title: formData.title,
        short_phrase: formData.short_phrase,
        description: formData.description,
        category: formData.category,
        country: formData.country || profile?.country || '',
        sport: profile?.sport || '',
        goal_amount: formData.goal_amount ? parseFloat(formData.goal_amount) : null,
        goal_type: formData.goal_type,
        currency: formData.currency,
        deadline: formData.deadline || null,
        is_continuous: formData.is_continuous,
        payment_methods: methods,
        cover_media_url: formData.cover_media_url || null,
        allow_messages: formData.allow_messages,
        slug,
        status: 'active',
        is_active: true,
        updated_at: new Date().toISOString()
      };

      if (existingProject) {
        const { error: updateError } = await supabase
          .from('athlete_support_projects')
          .update(projectData)
          .eq('id', existingProject.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('athlete_support_projects')
          .insert(projectData);

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving project:', err);
      setError(err.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = async (title: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .rpc('generate_project_slug', {
          project_title: title,
          athlete_id: profile?.id
        });

      if (error || !data) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
      }

      return data;
    } catch (err) {
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
    }
  };

  const categories = [
    { value: 'travel', label: 'Travel', labelEs: 'Viajes' },
    { value: 'equipment', label: 'Equipment', labelEs: 'Equipamiento' },
    { value: 'training', label: 'Training', labelEs: 'Entrenamiento' },
    { value: 'education', label: 'Education', labelEs: 'Educación' },
    { value: 'health', label: 'Health', labelEs: 'Salud' }
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'ARS', 'MXN', 'CLP', 'BRL'];

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <p className="text-gray-900 dark:text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
            {existingProject ? 'Edit Project' : 'Create Support Project'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Compete in National Athletics Championship"
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Short Phrase (for share cards) *
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={formData.short_phrase}
              onChange={(e) => setFormData({ ...formData, short_phrase: e.target.value })}
              placeholder="e.g., Help me reach the nationals!"
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formData.short_phrase.length}/80 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your project, goals, and why you need support..."
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:text-white"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Goal Type *
              </label>
              <select
                required
                value={formData.goal_type}
                onChange={(e) => setFormData({ ...formData, goal_type: e.target.value as any })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:text-white"
              >
                <option value="money">Money</option>
                <option value="in-kind">In-Kind (Equipment/Services)</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Country *
            </label>
            <CountrySelect
              value={formData.country}
              onChange={(country) => setFormData({ ...formData, country })}
              required
            />
          </div>

          {formData.goal_type === 'money' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  Goal Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.goal_amount}
                  onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                  placeholder="2000"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:text-white"
                >
                  {currencies.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_continuous}
                onChange={(e) => setFormData({ ...formData, is_continuous: e.target.checked, deadline: '' })}
                className="w-4 h-4 text-[#fdda36] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
                No deadline (continuous support)
              </span>
            </label>
          </div>

          {!formData.is_continuous && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Payment Methods * (select where supporters can send contributions)
            </label>
            <div className="space-y-2">
              {availablePaymentMethods().length === 0 ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    You need to add payment methods in your settings first.
                  </p>
                </div>
              ) : (
                availablePaymentMethods().map(method => (
                  <label key={method.type} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPaymentMethods.includes(method.type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPaymentMethods([...selectedPaymentMethods, method.type]);
                        } else {
                          setSelectedPaymentMethods(selectedPaymentMethods.filter(m => m !== method.type));
                        }
                      }}
                      className="w-4 h-4 text-[#fdda36] border-gray-300 dark:border-gray-600 rounded focus:ring-[#fdda36]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{method.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">{method.value}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#fdda36] text-[#514163] font-medium rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : existingProject ? 'Update Project' : 'Submit My Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
