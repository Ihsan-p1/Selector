import { LayoutGrid, Maximize, Info, SlidersHorizontal, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePhotoStore } from '../../stores/photo.store';
import { useUIStore } from '../../stores/ui.store';
import { useFilterStore } from '../../stores/filter.store';

export function TopBar() {
  const currentIndex = usePhotoStore(s => s.currentIndex);
  const photos = usePhotoStore(s => s.photos);
  const viewMode = useUIStore(s => s.viewMode);
  const setViewMode = useUIStore(s => s.setViewMode);
  const toggleLeftPanel = useUIStore(s => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore(s => s.toggleRightPanel);
  const hasActiveFilters = useFilterStore(s => s.hasActiveFilters);

  const filteredPhotos = useFilterStore(s => s.applyFilters)(photos);
  const displayIndex = filteredPhotos.length > 0 ? currentIndex + 1 : 0;
  const displayTotal = filteredPhotos.length > 0 ? photos.length : 0;

  return (
    <header className="h-11 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4 shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLeftPanel}
          className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800"
          title="Toggle Library Panel (L)"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-800" />

        {/* View mode toggle */}
        <div className="flex bg-zinc-950 rounded-md p-0.5 border border-zinc-800">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1.5 rounded-sm transition-colors",
              viewMode === 'grid' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
            )}
            title="Grid View (G)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('loupe')}
            className={cn(
              "p-1.5 rounded-sm transition-colors",
              viewMode === 'loupe' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
            )}
            title="Loupe View (G)"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {hasActiveFilters() && (
          <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
            FILTERED
          </span>
        )}
      </div>

      {/* Center — App title */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-300 tracking-wide">SELECTOR</span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-zinc-500 tabular-nums">
          {displayIndex} / {displayTotal}
        </span>

        <div className="h-4 w-px bg-zinc-800" />

        <button
          onClick={toggleRightPanel}
          className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800"
          title="Toggle Info Panel (I)"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
