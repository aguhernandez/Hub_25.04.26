import { useState, useEffect } from 'react';
import { CreditCard, Check, Building2, Wallet, Smartphone, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';

interface PaymentLinks {
  iban?: string;
  paypal?: string;
  mercadopago?: string;
  wise?: string;
  mpesa?: string;
  custom_link?: string;
}

interface PaymentMethodsFormProps {
  onSave?: () => void;
}

const METHODS = [
  { key: 'iban', icon: Building2, label: 'IBAN / CBU', placeholder: 'ES91 2100 0418 4502 0005 1332 or CBU', hint: 'Bank transfer — Europe, Argentina, etc.' },
  { key: 'paypal', icon: Wallet, label: 'PayPal', placeholder: 'paypal.me/username or email@example.com', hint: 'Link or email address' },
  { key: 'mercadopago', icon: Smartphone, label: 'Mercado Pago', placeholder: 'mpago.la/username or link', hint: 'Latin America' },
  { key: 'wise', icon: CreditCard, label: 'Wise', placeholder: 'wise.com/pay/username or email', hint: 'International transfers' },
  { key: 'mpesa', icon: Smartphone, label: 'M-Pesa', placeholder: 'Phone number or Paybill', hint: 'East Africa' },
];

export default function PaymentMethodsForm({ onSave }: PaymentMethodsFormProps) {
  const { profile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinks>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.payment_links) {
      setPaymentLinks(profile.payment_links as PaymentLinks);
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      await updateProfile({ payment_links: paymentLinks });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      showToast('Payment methods saved', 'success');
      onSave?.();
    } catch {
      showToast('Error saving payment methods', 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasAnyMethod = Object.values(paymentLinks).some(v => v && v.trim());

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#fdda36] rounded-lg flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-[#514163]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment Methods</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Add your accounts so supporters can send funds directly to you</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {METHODS.map(({ key, icon: Icon, label, placeholder, hint }) => (
          <div key={key}>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Icon className="w-4 h-4 text-gray-400" />
              {label}
              <span className="text-xs text-gray-400 font-normal ml-1">{hint}</span>
            </label>
            <input
              type="text"
              value={(paymentLinks as any)[key] || ''}
              onChange={(e) => setPaymentLinks({ ...paymentLinks, [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
            />
          </div>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Asciende does not process payments.</strong> All contributions go directly to you. You are responsible for your payment accounts and any applicable taxes.
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading || !hasAnyMethod}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#fdda36] text-[#514163] font-semibold rounded-lg hover:bg-[#ffd51a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saved ? <><Check className="w-5 h-5" /> Saved!</> : loading ? 'Saving...' : 'Save Payment Methods'}
      </button>

      {!hasAnyMethod && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 text-center">
          Add at least one payment method to enable support mode
        </p>
      )}
    </div>
  );
}
