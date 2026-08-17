import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BackButtonProps {
  onBack?: () => void;
  label?: string;
  className?: string;
}

export default function BackButton({ onBack, label, className = '' }: BackButtonProps) {
  const { language } = useLanguage();
  const text = label || (language === 'es' ? 'Volver' : 'Back');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.dispatchEvent(new Event('navigate-back'));
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${className}`}
      aria-label={text}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{text}</span>
    </button>
  );
}
