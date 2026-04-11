import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePhotoStore } from '../../stores/photo.store';
import { useFilterStore } from '../../stores/filter.store';
import { useUIStore } from '../../stores/ui.store';
import { useImageCache } from '../../hooks/useImageCache';

export function GridView() {
  const photos = usePhotoStore(s => s.photos);
  const currentIndex = usePhotoStore(s => s.currentIndex);
  const setCurrentIndex = usePhotoStore(s => s.setCurrentIndex);
  const setViewMode = useUIStore(s => s.setViewMode);
  const filteredPhotos = useFilterStore(s => s.applyFilters)(photos);

  return (
    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 content-start">
      {filteredPhotos.map((photo, idx) => {
        const realIndex = photos.indexOf(photo);
        const isSelected = realIndex === currentIndex;

        return (
          <GridCell
            key={photo.id}
            photo={photo}
            isSelected={isSelected}
            onClick={() => {
              setCurrentIndex(realIndex);
              setViewMode('loupe');
            }}
          />
        );
      })}
    </div>
  );
}

function GridCell({
  photo,
  isSelected,
  onClick,
}: {
  photo: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  const imageUrl = useImageCache(photo);

  return (
    <div
      onClick={onClick}
      className={cn(
        "aspect-[3/2] relative rounded overflow-hidden cursor-pointer border-2 transition-all bg-zinc-900 group",
        isSelected ? "border-blue-500 ring-1 ring-blue-500/30" : "border-transparent hover:border-zinc-600"
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 font-mono">
          {photo.isRaw ? photo.format.toUpperCase() : '...'}
        </div>
      )}

      {/* Grid overlays */}
      <div className="absolute top-1 left-1 flex gap-1">
        {photo.flag === 'pick' && <div className="w-2 h-2 rounded-full bg-green-500 shadow" />}
        {photo.flag === 'reject' && <div className="w-2 h-2 rounded-full bg-red-500 shadow" />}
      </div>

      {photo.rating > 0 && (
        <div className="absolute bottom-1 left-1 flex gap-px">
          {[...Array(photo.rating)].map((_, i) => (
            <Star key={i} className="w-2 h-2 text-yellow-400 fill-current drop-shadow" />
          ))}
        </div>
      )}

      {photo.colorLabel !== 'none' && (
        <div className={cn(
          "absolute bottom-0 right-0 w-full h-1",
          photo.colorLabel === 'red' && 'bg-red-500',
          photo.colorLabel === 'yellow' && 'bg-yellow-500',
          photo.colorLabel === 'green' && 'bg-green-500',
          photo.colorLabel === 'blue' && 'bg-blue-500',
          photo.colorLabel === 'purple' && 'bg-purple-500',
        )} />
      )}

      {/* Hover filename */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-1.5 pt-4">
        <p className="text-[9px] text-white truncate">{photo.fileName}</p>
      </div>
    </div>
  );
}
