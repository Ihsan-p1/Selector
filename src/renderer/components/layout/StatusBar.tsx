import { Gamepad2, Keyboard } from 'lucide-react';
import { usePhotoStore } from '../../stores/photo.store';
import { useUIStore } from '../../stores/ui.store';
import { useFilterStore } from '../../stores/filter.store';
import { cn } from '../../lib/utils';
import { formatFileSize } from '../../lib/utils';
import { useGamepadConnected } from '../../hooks/useGamepad';

export function StatusBar() {
  const photos = usePhotoStore(s => s.photos);
  const currentIndex = usePhotoStore(s => s.currentIndex);
  const currentPhoto = usePhotoStore(s => s.getCurrentPhoto)();
  const hasFilters = useFilterStore(s => s.hasActiveFilters)();
  const gamepadConnected = useGamepadConnected();

  if (photos.length === 0) return null;

  return (
    <div className="h-6 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-3 shrink-0 text-[10px] text-zinc-500">
      {/* Left: file info */}
      <div className="flex items-center gap-3">
        {currentPhoto && (
          <>
            <span className="text-zinc-400 font-mono">{currentPhoto.fileName}</span>
            <span>{formatFileSize(currentPhoto.fileSize)}</span>
            {currentPhoto.format && (
              <span className="text-zinc-600 uppercase">{currentPhoto.format}</span>
            )}
          </>
        )}
      </div>

      {/* Right: status indicators */}
      <div className="flex items-center gap-3">
        {hasFilters && (
          <span className="text-blue-400 font-medium">FILTERED</span>
        )}

        <span className="font-mono tabular-nums">
          {currentIndex + 1} of {photos.length}
        </span>

        {/* Input indicators */}
        <div className="flex items-center gap-1.5 ml-1">
          <Keyboard className="w-3 h-3 text-zinc-600" />
          <Gamepad2 className={cn(
            "w-3 h-3 transition-colors",
            gamepadConnected ? "text-green-400" : "text-zinc-700"
          )} />
        </div>
      </div>
    </div>
  );
}
