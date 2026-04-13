import { cn } from '../../lib/utils';

// ═══════════════════════════════════════════
// Selector — Kbd Component
// Keyboard key visual display
// ═══════════════════════════════════════════

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5',
        'text-[10px] font-mono font-medium',
        'bg-zinc-800 border border-zinc-700 rounded shadow-sm',
        'text-zinc-300',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
