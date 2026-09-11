import { useState, useEffect } from 'react';
import { CreditCard, Link2, FileText, Save, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ProfessionalPaymentSection() {
  const { profile, user } = useAuth();
  const { language } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<'manual_link' | 'manual_instructions'>('manual_link');
  const [paymentLink, setPaymentLink] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const t = (es: string, en: string) => language === 'es' ? es : en;

  useEffect(() => {
    if (!profile) return;
    setPaymentMethod((profile.payment_method as 'manual_link' | 'manual_instructions') || 'manual_link');
    setPaymentLink((profile as any).payment_link || '');
    setPaymentInstructions((profile as any).payment_instructions || '');
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      payment_method: paymentMethod,
      payment_link: paymentLink || null,
      payment_instructions: paymentInstructions || null,
    }).eq('id', user.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {t('Configuración de Cobros', 'Payment Configuration')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t(
              'Define cómo tus atletas te envían el pago por tus servicios.',
              'Define how your athletes send you payment for your services.'
            )}
          </p>
        </div>
      </div>

      {/* Stripe future placeholder */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
        <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Stripe</p>
          <p className="text-xs text-gray-400">
            {t('Próximamente — cobros automáticos para tus atletas.', 'Coming soon — automatic billing for your athletes.')}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
          {t('Próximamente', 'Soon')}
        </span>
      </div>

      {/* Payment method selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t('Método de cobro predeterminado', 'Default payment method')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod('manual_link')}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
              paymentMethod === 'manual_link'
                ? 'border-[#fdda36] bg-yellow-50 dark:bg-yellow-900/20 text-gray-900 dark:text-white'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            <Link2 className="w-4 h-4 flex-shrink-0" />
            {t('Link externo', 'External link')}
          </button>
          <button
            onClick={() => setPaymentMethod('manual_instructions')}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
              paymentMethod === 'manual_instructions'
                ? 'border-[#fdda36] bg-yellow-50 dark:bg-yellow-900/20 text-gray-900 dark:text-white'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            {t('Instrucciones', 'Instructions')}
          </button>
        </div>
      </div>

      {paymentMethod === 'manual_link' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('Link de pago (Mercado Pago, PayPal, Bizum...)', 'Payment link (Mercado Pago, PayPal, Bizum...)')}
          </label>
          <div className="relative">
            <input
              type="url"
              value={paymentLink}
              onChange={e => setPaymentLink(e.target.value)}
              placeholder="https://mpago.la/tu-link"
              className="w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
            {paymentLink && (
              <a href={paymentLink} target="_blank" rel="noopener noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {t(
              'Este link se mostrará a tus atletas cuando se inscriban a un servicio tuyo.',
              'This link will be shown to your athletes when they enroll in one of your services.'
            )}
          </p>
        </div>
      )}

      {paymentMethod === 'manual_instructions' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('Instrucciones de pago (CBU, IBAN, alias...)', 'Payment instructions (CBU, IBAN, alias...)')}
          </label>
          <textarea
            value={paymentInstructions}
            onChange={e => setPaymentInstructions(e.target.value)}
            rows={4}
            placeholder={t(
              'CBU: 0000003100000000000000\nAlias: ASCIENDE.PRO\nBanco: Galicia\nTitular: Agu Hernández',
              'IBAN: ES00 0000 0000 0000 0000 0000\nBIC: CAIXESBB\nBank: CaixaBank\nHolder: Agu Hernández'
            )}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none font-mono"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            {t(
              'Estas instrucciones se enviarán a tus atletas cuando se inscriban.',
              'These instructions will be sent to your athletes when they enroll.'
            )}
          </p>
        </div>
      )}

      <div className="pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#514163] hover:bg-[#3d2f4d] text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved
            ? t('¡Guardado!', 'Saved!')
            : saving
            ? t('Guardando...', 'Saving...')
            : t('Guardar configuración', 'Save configuration')}
        </button>
      </div>
    </div>
  );
}
