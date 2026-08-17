import asciendeLogoFull from '../assets/Asciendelogo.png';
import asciendeLogoFavicon from '../assets/Asciendefavicon.png';

interface AsciendeLogoProps {
  variant?: 'full' | 'symbol';
  height?: number;
  size?: number;
  className?: string;
}

export default function AsciendeLogo({ variant = 'full', height, size, className = '' }: AsciendeLogoProps) {
  const dim = size ?? height ?? 32;

  if (variant === 'symbol') {
    return (
      <img
        src={asciendeLogoFavicon}
        alt="Asciende"
        style={{ height: `${dim}px`, width: 'auto' }}
        className={className}
      />
    );
  }

  return (
    <img
      src={asciendeLogoFull}
      alt="Asciende"
      style={{ height: `${dim}px`, width: 'auto' }}
      className={className}
    />
  );
}
