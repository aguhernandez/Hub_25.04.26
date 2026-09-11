import { useState } from 'react';
import { Lock, AlertCircle, ArrowRight, X } from 'lucide-react';

interface ServiceAccessGateProps {
  blocked: boolean;
  serviceType: 'nutrition' | 'training';
  hasPendingPayment: boolean;
  onNavigateToServices?: () => void;
  children: React.ReactNode;
  blurHeight?: string;
}

export default function ServiceAccessGate({
  blocked,
  serviceType,
  hasPendingPayment,
  onNavigateToServices,
  children,
  blurHeight = 'auto',
}: ServiceAccessGateProps) {
  const [showModal, setShowModal] = useState(false);

  if (!blocked) return <>{children}</>;

  const professionalLabel = serviceType === 'nutrition' ? 'nutritionist' : 'coach';
  const contentLabel = serviceType === 'nutrition'
    ? 'Nutrition Plan'
    : 'Training Plan';

  return (
    <>
      <div
        className="relative cursor-pointer select-none"
        style={{ minHeight: blurHeight !== 'auto' ? blurHeight : undefined }}
        onClick={() => setShowModal(true)}
      >
        <div className="filter blur-md pointer-events-none opacity-60 overflow-hidden rounded-2xl">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-gray-900/30 rounded-2xl">
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-gray-800/80 flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {contentLabel}
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl bg-white dark:bg-gray-900 p-6">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Your professional service is currently inactive
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {hasPendingPayment
                  ? `You have a pending payment for this ${contentLabel.toLowerCase()}. Complete your payment to restore access.`
                  : `Your ${professionalLabel} service is not active. Contact your ${professionalLabel} to restore access.`}
              </p>
            </div>

            {onNavigateToServices && (
              <button
                onClick={() => { setShowModal(false); onNavigateToServices(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#fdda36] text-gray-900 font-bold rounded-xl hover:bg-yellow-300 transition-colors"
              >
                Go to Coaching
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-2 text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
