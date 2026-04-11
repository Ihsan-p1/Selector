import { useRef, useState } from 'react';
import { Image as ImageIcon, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePhotoStore } from '../../stores/photo.store';
import { useFullImage, useImageCache } from '../../hooks/useImageCache';

export function LoupeView() {
  const currentPhoto = usePhotoStore(s => s.getCurrentPhoto)();
  const fullImageUrl = useFullImage(currentPhoto);
  const thumbnailUrl = useImageCache(currentPhoto);
  const imageUrl = fullImageUrl || thumbnailUrl; // Full res preferred, thumbnail as fallback

  const imageRef = useRef<HTMLImageElement>(null);
  const [loupeActive, setLoupeActive] = useState(false);
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !loupeActive) return;
    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setLoupePos({ x, y });
  };

  if (!currentPhoto) return null;

  return (
    <div className="flex-1 relative flex items-center justify-center overflow-hidden select-none">
      {imageUrl ? (
        <div
          className="relative w-full h-full flex items-center justify-center"
          onMouseDown={(e) => { setLoupeActive(true); handleMouseMove(e); }}
          onMouseUp={() => setLoupeActive(false)}
          onMouseLeave={() => setLoupeActive(false)}
          onMouseMove={handleMouseMove}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={currentPhoto.fileName}
            className={cn(
              "max-w-full max-h-full object-contain transition-opacity duration-150",
              loupeActive ? "opacity-0" : "opacity-100"
            )}
            draggable={false}
          />

          {loupeActive && (
            <div
              className="absolute inset-0 overflow-hidden cursor-crosshair"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundPosition: `${loupePos.x}% ${loupePos.y}%`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: '200%',
              }}
            />
          )}
        </div>
      ) : (
        <div className="text-zinc-600 animate-pulse flex flex-col items-center gap-3">
          <ImageIcon className="w-10 h-10 opacity-20" />
          <span className="text-sm">Loading Preview...</span>
        </div>
      )}

      {/* Status Overlays */}
      <PhotoOverlays photo={currentPhoto} />
    </div>
  );
}

function PhotoOverlays({ photo }: { photo: { flag: string; rating: number; colorLabel: string } }) {
  return (
    <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
      {photo.flag === 'pick' && (
        <div className="bg-green-500/90 text-white px-2.5 py-1 rounded text-[10px] font-bold tracking-wider shadow-lg backdrop-blur-sm">
          PICK
        </div>
      )}
      {photo.flag === 'reject' && (
        <div className="bg-red-500/90 text-white px-2.5 py-1 rounded text-[10px] font-bold tracking-wider shadow-lg backdrop-blur-sm">
          REJECT
        </div>
      )}
      {photo.rating > 0 && (
        <div className="bg-black/70 text-yellow-400 px-2 py-1 rounded flex items-center gap-0.5 shadow-lg backdrop-blur-sm">
          {[...Array(photo.rating)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-current" />
          ))}
        </div>
      )}
      {photo.colorLabel !== 'none' && (
        <div className={cn(
          "w-5 h-5 rounded-full shadow-lg border border-white/20",
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
