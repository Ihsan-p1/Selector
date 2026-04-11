import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/ui.store';

export function Toast() {
  const message = useUIStore(s => s.toastMessage);
  const type = useUIStore(s => s.toastType);

  if (!message) return null;

  const icons = {
    success: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
    info: <Info className="w-3.5 h-3.5 text-blue-400" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />,
    error: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg shadow-xl border backdrop-blur-md text-xs font-medium",
        type === 'success' && "bg-green-950/80 border-green-800/50 text-green-200",
        type === 'info' && "bg-zinc-900/90 border-zinc-700/50 text-zinc-200",
        type === 'warning' && "bg-yellow-950/80 border-yellow-800/50 text-yellow-200",
        type === 'error' && "bg-red-950/80 border-red-800/50 text-red-200",
      )}>
        {icons[type]}
        {message}
      </div>
    </div>
  );
}
