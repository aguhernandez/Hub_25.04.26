import React from 'react';
import { Database, ExternalLink, Check } from 'lucide-react';

interface FoodSourceBadgeProps {
  source?: string;
  isVerified?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export default function FoodSourceBadge({
  source = 'internal',
  isVerified = false,
  showIcon = true,
  size = 'sm'
}: FoodSourceBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  if (source === 'usda') {
    return (
      <span className={`${sizeClasses} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded inline-flex items-center gap-1`}>
        {showIcon && <Database className={iconSize} />}
        USDA
      </span>
    );
  }

  if (source === 'open_food_facts') {
    return (
      <span className={`${sizeClasses} bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded inline-flex items-center gap-1`}>
        {showIcon && <ExternalLink className={iconSize} />}
        OFF
        {isVerified && <Check className={iconSize} />}
      </span>
    );
  }

  return (
    <span className={`${sizeClasses} bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded inline-flex items-center gap-1`}>
      {showIcon && <Database className={iconSize} />}
      Asciende
    </span>
  );
}
