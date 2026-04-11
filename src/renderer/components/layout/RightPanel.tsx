import { Camera, Focus, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePhotoStore } from '../../stores/photo.store';
import { formatFileSize } from '../../lib/utils';

export function RightPanel() {
  const currentPhoto = usePhotoStore(s => s.getCurrentPhoto)();

  if (!currentPhoto) return null;

  const exif = currentPhoto.exif;
  const sharpness = currentPhoto.sharpnessScore;

  return (
    <aside className="w-64 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0 overflow-y-auto">
      {/* Histogram placeholder — will be real in Phase 3 */}
      <div className="p-3 border-b border-zinc-800">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" /> Histogram
        </h2>
        <div className="h-20 w-full bg-zinc-950 rounded border border-zinc-800 flex items-end overflow-hidden">
          {[...Array(48)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-zinc-700 mx-px rounded-t-sm"
              style={{ height: `${Math.sin(i * 0.3) * 40 + Math.random() * 30 + 10}%` }}
            />
          ))}
        </div>
      </div>

      {/* Sharpness */}
      <div className="p-3 border-b border-zinc-800">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Focus className="w-3 h-3" /> Sharpness
        </h2>
        <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded border border-zinc-800">
          <span className="text-xs text-zinc-400">Focus Score</span>
          <div className="flex items-center gap-2">
            {sharpness !== null ? (
              <>
                <span className={cn(
                  "text-xs font-mono font-bold",
                  sharpness >= 75 ? "text-green-400" :
                  sharpness >= 50 ? "text-yellow-400" : "text-red-400"
                )}>
                  {sharpness}%
                </span>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  sharpness >= 75 ? "bg-green-500" :
                  sharpness >= 50 ? "bg-yellow-500" : "bg-red-500"
                )} />
              </>
            ) : (
              <span className="text-xs text-zinc-600">—</span>
            )}
          </div>
        </div>
      </div>

      {/* EXIF Data */}
      <div className="p-3 flex-1">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Camera className="w-3 h-3" /> Metadata
        </h2>
        <div className="space-y-2 text-xs">
          <ExifRow label="File" value={currentPhoto.fileName} truncate />
          <ExifRow label="Size" value={formatFileSize(currentPhoto.fileSize)} />
          <ExifRow label="Format" value={currentPhoto.format.toUpperCase()} />

          {exif.cameraModel && (
            <>
              <div className="h-px bg-zinc-800 my-2" />
              <ExifRow label="Camera" value={`${exif.cameraMake ?? ''} ${exif.cameraModel}`} truncate />
            </>
          )}
          {exif.lens && <ExifRow label="Lens" value={exif.lens} truncate />}
          {exif.focalLength && <ExifRow label="Focal" value={`${exif.focalLength}mm`} />}
          {exif.aperture && <ExifRow label="Aperture" value={`f/${exif.aperture}`} />}
          {exif.shutterSpeed && <ExifRow label="Shutter" value={exif.shutterSpeed} />}
          {exif.iso && <ExifRow label="ISO" value={String(exif.iso)} />}
          {exif.dateTime && (
            <>
              <div className="h-px bg-zinc-800 my-2" />
              <ExifRow label="Date" value={new Date(exif.dateTime).toLocaleDateString()} />
              <ExifRow label="Time" value={new Date(exif.dateTime).toLocaleTimeString()} />
            </>
          )}
          {exif.width && exif.height && (
            <ExifRow label="Resolution" value={`${exif.width} × ${exif.height}`} />
          )}
        </div>
      </div>

      {/* Quick shortcuts reference */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/50">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Shortcuts</h2>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-500">
          <div><Kbd>P</Kbd> Pick</div>
          <div><Kbd>X</Kbd> Reject</div>
          <div><Kbd>1-5</Kbd> Stars</div>
          <div><Kbd>6-9</Kbd> Colors</div>
          <div><Kbd>G</Kbd> Grid</div>
          <div><Kbd>?</Kbd> All shortcuts</div>
        </div>
      </div>
    </aside>
  );
}

function ExifRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className={cn("text-zinc-200 font-mono text-right", truncate && "truncate max-w-[120px]")} title={value}>
        {value}
      </span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded text-[9px] font-mono border border-zinc-700/50">
      {children}
    </kbd>
  );
}
