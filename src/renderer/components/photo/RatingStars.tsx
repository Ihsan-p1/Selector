import { cn } from '../../lib/utils';
import type { StarRating as StarRatingType } from '@/shared/types';

// ═══════════════════════════════════════════
// Selector — RatingStars Component
// Star display for photo ratings
// ═══════════════════════════════════════════

interface RatingStarsProps {
  rating: StarRatingType;
  size?: 'sm' | 'md';
  className?: string;
}

export function RatingStars({ rating, size = 'sm', className }: RatingStarsProps) {
  if (rating === 0) return null;

  const starSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span className={cn('inline-flex gap-px', starSize, className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            i < rating ? 'text-amber-400' : 'text-zinc-700',
          )}
        >
          ★
        </span>
      ))}
    </span>
  );
}
