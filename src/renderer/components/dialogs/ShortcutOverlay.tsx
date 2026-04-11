import { X } from 'lucide-react';
import { useShortcutStore, XBOX_BUTTON_NAMES } from '../../stores/shortcut.store';
import { useUIStore } from '../../stores/ui.store';

export function ShortcutOverlay() {
  const show = useUIStore(s => s.showShortcutOverlay);
  const toggleOverlay = useUIStore(s => s.toggleShortcutOverlay);
  const getByCategory = useShortcutStore(s => s.getByCategory);

  if (!show) return null;

  const categories = getByCategory();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={toggleOverlay}>
      <div
        className="w-[680px] max-h-[80vh] bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">Keyboard & Controller Shortcuts</h2>
          <button onClick={toggleOverlay} className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(80vh-56px)] p-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from(categories.entries()).map(([category, bindings]) => (
              <div key={category} className="space-y-1">
                <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">{category}</h3>
                {bindings.map(b => (
                  <div key={b.actionId} className="flex items-center justify-between py-1">
                    <span className="text-xs text-zinc-300">{b.label}</span>
                    <div className="flex items-center gap-2">
                      {b.keyboard && (
                        <kbd className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-700/50 min-w-[24px] text-center">
                          {formatKey(b.keyboard)}
                        </kbd>
                      )}
                      {b.gamepadButton !== null && (
                        <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-mono border border-blue-500/20 min-w-[24px] text-center">
                          🎮 {XBOX_BUTTON_NAMES[b.gamepadButton] ?? b.gamepadButton}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .replace('ArrowRight', '→')
    .replace('ArrowLeft', '←')
    .replace('ArrowUp', '↑')
    .replace('ArrowDown', '↓')
    .replace(' ', 'Space')
    .replace('Backspace', '⌫')
    .replace('Delete', 'Del')
    .replace('Tab', '⇥');
}
