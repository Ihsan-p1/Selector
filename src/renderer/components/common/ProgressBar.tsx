import { cn } from '../../lib/utils';

// ═══════════════════════════════════════════
// Selector — ProgressBar Component
// Animated progress bar
// ═══════════════════════════════════════════

interface ProgressBarProps {
  value: number;    // 0-100
  className?: string;
  color?: 'blue' | 'green' | 'red';
}

export function ProgressBar({ value, className, color = 'blue' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
  };

  return (
    <div className={cn('h-1 bg-zinc-800 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-300', colorClasses[color])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
