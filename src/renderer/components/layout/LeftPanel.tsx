import { FolderOpen, CheckCircle2, XCircle, Star, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePhotoStore } from '../../stores/photo.store';
import { useFilterStore } from '../../stores/filter.store';
import type { FlagStatus } from '@/shared/types';

export function LeftPanel() {
  const photos = usePhotoStore(s => s.photos);
  const counts = useFilterStore(s => s.getCounts)(photos);
  const flagFilter = useFilterStore(s => s.flagFilter);
  const setFlagFilter = useFilterStore(s => s.setFlagFilter);
  const clearAllFilters = useFilterStore(s => s.clearAllFilters);
  const hasActiveFilters = useFilterStore(s => s.hasActiveFilters);

  const handleFlagClick = (flag: FlagStatus) => {
    if (flagFilter.length === 1 && flagFilter[0] === flag) {
      clearAllFilters();
    } else {
      setFlagFilter([flag]);
    }
  };

  return (
    <aside className="w-56 border-r border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
      {/* Folder Info */}
      <div className="p-3 border-b border-zinc-800">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Library</h2>
        <div className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-800/60 p-2 rounded border border-zinc-700/50">
          <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate text-xs">Photos</span>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 flex-1">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Filters</h2>
        <div className="space-y-0.5 text-sm">
          {/* All Photos */}
          <button
            onClick={() => clearAllFilters()}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-xs",
              !hasActiveFilters() ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
          >
            <span>All Photos</span>
            <span className="text-zinc-600 font-mono text-[10px]">{photos.length}</span>
          </button>

          {/* Picks */}
          <button
            onClick={() => handleFlagClick('pick')}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-xs",
              flagFilter.includes('pick') ? "bg-green-500/10 text-green-400 border border-green-500/20" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Picks
            </span>
            <span className="font-mono text-[10px]">{counts.picks}</span>
          </button>

          {/* Rejects */}
          <button
            onClick={() => handleFlagClick('reject')}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-xs",
              flagFilter.includes('reject') ? "bg-red-500/10 text-red-400 border border-red-500/20" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              Rejects
            </span>
            <span className="font-mono text-[10px]">{counts.rejects}</span>
          </button>

          {/* Unflagged */}
          <button
            onClick={() => handleFlagClick('unflagged')}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-xs",
              flagFilter.includes('unflagged') ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Circle className="w-3.5 h-3.5 text-zinc-500" />
              Unflagged
            </span>
            <span className="font-mono text-[10px]">{counts.unflagged}</span>
          </button>

          <div className="h-px bg-zinc-800 my-2" />

          {/* Star filter */}
          <button
            onClick={() => {
              const store = useFilterStore.getState();
              store.setMinRating(store.minRating >= 1 ? 0 : 1);
            }}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-xs",
              "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              Rated
            </span>
            <span className="font-mono text-[10px]">{counts.rated}</span>
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/50">
        <div className="grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-sm font-semibold text-white">{counts.picks}</div>
            <div className="text-[9px] text-zinc-500 uppercase">Picks</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{counts.rejects}</div>
            <div className="text-[9px] text-zinc-500 uppercase">Rejects</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{counts.unflagged}</div>
            <div className="text-[9px] text-zinc-500 uppercase">Left</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
