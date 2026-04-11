import { useState } from 'react';
import { FolderOpen, Copy, Move, X, Download, Filter, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePhotoStore } from '../../stores/photo.store';
import { useFilterStore } from '../../stores/filter.store';
import { useUIStore } from '../../stores/ui.store';
import type { FlagStatus, ColorLabel } from '@/shared/types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportMode = 'copy' | 'move';

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const photos = usePhotoStore(s => s.photos);
  const showToast = useUIStore(s => s.showToast);

  const [mode, setMode] = useState<ExportMode>('copy');
  const [destination, setDestination] = useState<string>('');
  const [selectedFlags, setSelectedFlags] = useState<FlagStatus[]>(['pick']);
  const [minRating, setMinRating] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });

  if (!isOpen) return null;

  // Compute filtered count
  const filteredPhotos = photos.filter(p => {
    if (selectedFlags.length > 0 && !selectedFlags.includes(p.flag)) return false;
    if (minRating > 0 && p.rating < minRating) return false;
    return true;
  });

  const handleChooseFolder = async () => {
    if (window.selectorAPI) {
      const path = await window.selectorAPI.chooseDirectory();
      if (path) setDestination(path);
    }
  };

  const toggleFlag = (flag: FlagStatus) => {
    if (selectedFlags.includes(flag)) {
      setSelectedFlags(selectedFlags.filter(f => f !== flag));
    } else {
      setSelectedFlags([...selectedFlags, flag]);
    }
  };

  const handleExport = async () => {
    if (!destination || filteredPhotos.length === 0) return;

    setIsExporting(true);

    try {
      if (window.selectorAPI) {
        // Listen for progress
        window.selectorAPI.onExportProgress((data: any) => {
          setProgress(data);
        });

        const result = await window.selectorAPI.exportPhotos(
          { mode, destination, filter: { flags: selectedFlags, minRating, colorLabels: [] } },
          filteredPhotos.map(p => ({ filePath: p.filePath, fileName: p.fileName }))
        );

        window.selectorAPI.removeExportProgressListener();

        showToast(
          `✓ Exported ${result?.success ?? filteredPhotos.length} photos`,
          'success'
        );
        onClose();
      } else {
        showToast('Export only available in desktop app', 'warning');
      }
    } catch (err) {
      showToast(`Export failed: ${err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[440px] bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Export Photos</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Mode */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Mode</label>
            <div className="flex gap-2">
              <ModeButton
                icon={<Copy className="w-3.5 h-3.5" />}
                label="Copy"
                description="Keep originals"
                active={mode === 'copy'}
                onClick={() => setMode('copy')}
              />
              <ModeButton
                icon={<Move className="w-3.5 h-3.5" />}
                label="Move"
                description="Remove originals"
                active={mode === 'move'}
                onClick={() => setMode('move')}
              />
            </div>
          </div>

          {/* Filter */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
              <Filter className="w-3 h-3 inline mr-1" />
              Include
            </label>
            <div className="flex gap-2">
              <FilterChip label="Picks" color="green" active={selectedFlags.includes('pick')} onClick={() => toggleFlag('pick')} />
              <FilterChip label="Rejects" color="red" active={selectedFlags.includes('reject')} onClick={() => toggleFlag('reject')} />
              <FilterChip label="Unflagged" color="zinc" active={selectedFlags.includes('unflagged')} onClick={() => toggleFlag('unflagged')} />
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Destination</label>
            <button
              onClick={handleChooseFolder}
              className="w-full flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-sm transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" />
              <span className={cn("truncate text-left flex-1", destination ? "text-zinc-200" : "text-zinc-500")}>
                {destination || 'Choose export folder...'}
              </span>
            </button>
          </div>

          {/* Summary */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Photos to export</span>
              <span className="text-sm font-mono font-bold text-white">{filteredPhotos.length}</span>
            </div>
            {isExporting && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                  <span>{progress.fileName}</span>
                  <span>{progress.current}/{progress.total}</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={!destination || filteredPhotos.length === 0 || isExporting}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all",
              destination && filteredPhotos.length > 0 && !isExporting
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            )}
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting...' : `Export ${filteredPhotos.length} photos`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeButton({ icon, label, description, active, onClick }: {
  icon: React.ReactNode; label: string; description: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left",
        active
          ? "bg-blue-500/10 border-blue-500/30 text-white"
          : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800"
      )}
    >
      {icon}
      <div>
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-zinc-500">{description}</div>
      </div>
    </button>
  );
}

function FilterChip({ label, color, active, onClick }: {
  label: string; color: string; active: boolean; onClick: () => void;
}) {
  const colorClasses: Record<string, string> = {
    green: active ? 'bg-green-500/10 border-green-500/30 text-green-400' : '',
    red: active ? 'bg-red-500/10 border-red-500/30 text-red-400' : '',
    zinc: active ? 'bg-zinc-700 border-zinc-600 text-white' : '',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-all",
        active ? colorClasses[color] : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-300"
      )}
    >
      {active && <CheckCircle2 className="w-3 h-3" />}
      {label}
    </button>
  );
}
