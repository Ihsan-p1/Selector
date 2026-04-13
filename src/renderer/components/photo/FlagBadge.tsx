import { cn } from '../../lib/utils';

// ═══════════════════════════════════════════
// Selector — FlagBadge Component
// Visual indicator for pick/reject/unflagged
// ═══════════════════════════════════════════

import type { FlagStatus } from '@/shared/types';

interface FlagBadgeProps {
  flag: FlagStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function FlagBadge({ flag, size = 'sm', className }: FlagBadgeProps) {
  if (flag === 'unflagged') return null;

  const sizeClasses = size === 'sm' ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[10px]';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold shrink-0',
        sizeClasses,
        flag === 'pick' && 'bg-green-500/90 text-white',
        flag === 'reject' && 'bg-red-500/90 text-white',
        className,
      )}
    >
      {flag === 'pick' ? '✓' : '✗'}
    </span>
  );
}
