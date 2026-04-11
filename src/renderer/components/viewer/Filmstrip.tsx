import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { usePhotoStore } from '../../stores/photo.store';
import { useImageCache } from '../../hooks/useImageCache';

export function Filmstrip() {
  const photos = usePhotoStore(s => s.photos);
  const currentIndex = usePhotoStore(s => s.currentIndex);
  const setCurrentIndex = usePhotoStore(s => s.setCurrentIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active photo
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.children[currentIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentIndex]);

  return (
    <div
      ref={containerRef}
      className="h-20 bg-zinc-900 border-t border-zinc-800 shrink-0 flex items-center px-2 overflow-x-auto gap-1.5 no-scrollbar"
    >
      {photos.map((photo, idx) => (
        <FilmstripCell
          key={photo.id}
          photo={photo}
          isActive={idx === currentIndex}
          onClick={() => setCurrentIndex(idx)}
        />
      ))}
    </div>
  );
}

function FilmstripCell({
  photo,
  isActive,
  onClick,
}: {
  photo: any;
  isActive: boolean;
  onClick: () => void;
}) {
  const imageUrl = useImageCache(photo);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative h-14 min-w-[88px] rounded overflow-hidden cursor-pointer border-2 transition-all shrink-0 bg-zinc-950",
        isActive ? "border-blue-500 opacity-100" : "border-transparent opacity-40 hover:opacity-80"
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-600 font-mono">
          {photo.isRaw ? photo.format.toUpperCase() : '...'}
        </div>
      )}

      {/* Flag dot */}
      {photo.flag !== 'unflagged' && (
        <div className={cn(
          "absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full",
          photo.flag === 'pick' ? 'bg-green-500' : 'bg-red-500'
        )} />
      )}

      {/* Color stripe */}
      {photo.colorLabel !== 'none' && (
        <div className={cn(
          "absolute bottom-0 left-0 w-full h-[2px]",
          photo.colorLabel === 'red' && 'bg-red-500',
          photo.colorLabel === 'yellow' && 'bg-yellow-500',
          photo.colorLabel === 'green' && 'bg-green-500',
          photo.colorLabel === 'blue' && 'bg-blue-500',
          photo.colorLabel === 'purple' && 'bg-purple-500',
        )} />
      )}
    </div>
  );
}
