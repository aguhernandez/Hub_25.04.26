import { ReactNode } from 'react';
import BackButton from './BackButton';

interface ScreenHeaderProps {
  onBack: () => void;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export default function ScreenHeader({ onBack, title, subtitle, right }: ScreenHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex flex-col gap-2">
        <BackButton onBack={onBack} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
