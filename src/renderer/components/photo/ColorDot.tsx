import { cn } from '../../lib/utils';
import type { ColorLabel as ColorLabelType } from '@/shared/types';

// ═══════════════════════════════════════════
// Selector — ColorDot Component
// Color label indicator dot
// ═══════════════════════════════════════════

interface ColorDotProps {
  color: ColorLabelType;
  size?: 'sm' | 'md';
  className?: string;
}

const COLOR_CLASSES: Record<ColorLabelType, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  none: '',
};

export function ColorDot({ color, size = 'sm', className }: ColorDotProps) {
  if (color === 'none') return null;

  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  return (
    <span
      className={cn(
        'inline-block rounded-full shrink-0',
        sizeClasses,
        COLOR_CLASSES[color],
        className,
      )}
    />
  );
}
