import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'success', duration = 1500, onClose }: ToastProps) {
  useEffect(() => {
    // Don't show toast if message is empty or onClose is not a function
    if (!message || message.trim() === '' || typeof onClose !== 'function') {
      if (typeof onClose === 'function') {
        onClose();
      }
      return;
    }

    const timer = setTimeout(() => {
      if (typeof onClose === 'function') {
        onClose();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, message, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  // Don't render if message is empty
  if (!message || message.trim() === '') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in">
      <div className={`${colors[type]} rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-md`}>
        {icons[type]}
        <span className="flex-1 font-medium text-sm">{message}</span>
        <button
          onClick={() => typeof onClose === 'function' && onClose()}
          className="hover:bg-white/20 rounded p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
