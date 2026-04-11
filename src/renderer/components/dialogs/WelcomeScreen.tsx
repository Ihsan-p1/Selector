import { useRef } from 'react';
import { FolderOpen, Image as ImageIcon, Keyboard, Gamepad2 } from 'lucide-react';
import { usePhotoStore } from '../../stores/photo.store';
import { useUIStore } from '../../stores/ui.store';
import { isImageFile, isRawFormat, getFileExtension, createEmptyExif } from '@/shared/types';
import { generatePhotoId } from '../../lib/utils';
import type { PhotoEntry } from '@/shared/types';

export function WelcomeScreen() {
  const setPhotos = usePhotoStore(s => s.setPhotos);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const entries: PhotoEntry[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isImageFile(file.name)) continue;

      const ext = getFileExtension(file.name);
      const filePath = file.webkitRelativePath || file.name;

      entries.push({
        id: generatePhotoId(filePath),
        filePath: filePath,
        fileName: file.name,
        fileSize: file.size,
        format: ext,
        isRaw: isRawFormat(ext),
        flag: 'unflagged',
        rating: 0,
        colorLabel: 'none',
        exif: createEmptyExif(),
        thumbnailPath: null,
        histogram: null,
        sharpnessScore: null,
        sharpnessComputed: false,
      });
    }

    entries.sort((a, b) => a.fileName.localeCompare(b.fileName));
    setPhotos(entries);
  };

  // Try Electron native dialog first, fallback to HTML input
  const handleOpenFolder = async () => {
    if (window.selectorAPI) {
      const folderPath = await window.selectorAPI.openFolder();
      if (folderPath) {
        const files = await window.selectorAPI.scanDirectory(folderPath);
        const entries: PhotoEntry[] = files.map((f: any) => ({
          id: generatePhotoId(f.path),
          filePath: f.path,
          fileName: f.name,
          fileSize: f.size,
          format: f.extension,
          isRaw: f.isRaw,
          flag: 'unflagged' as const,
          rating: 0 as const,
          colorLabel: 'none' as const,
          exif: createEmptyExif(),
          thumbnailPath: null,
          histogram: null,
          sharpnessScore: null,
          sharpnessComputed: false,
        }));
        entries.sort((a, b) => a.fileName.localeCompare(b.fileName));
        setPhotos(entries);

        // Async: load EXIF data in background
        loadExifBatch(entries);
      }
    } else {
      // Fallback for browser dev mode
      fileInputRef.current?.click();
    }
  };

  // Load EXIF metadata asynchronously in chunks
  const loadExifBatch = async (entries: PhotoEntry[]) => {
    if (!window.selectorAPI) return;
    const updatePhoto = usePhotoStore.getState().updatePhoto;
    const photos = usePhotoStore.getState().photos;

    const CHUNK = 10;
    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      const paths = chunk.map(e => e.filePath);

      try {
        const exifResults = await window.selectorAPI.getExifBatch(paths);
        const currentPhotos = usePhotoStore.getState().photos;

        for (const entry of chunk) {
          const exifData = exifResults[entry.filePath];
          if (exifData) {
            const idx = currentPhotos.findIndex(p => p.id === entry.id);
            if (idx >= 0) {
              updatePhoto(idx, { exif: exifData });
            }
          }
        }
      } catch (err) {
        console.error('EXIF batch load failed:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
        {/* Icon */}
        <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-zinc-700/50">
          <ImageIcon className="w-7 h-7 text-zinc-400" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-white mb-1.5 tracking-tight">Selector</h1>
        <p className="text-zinc-500 mb-6 text-xs leading-relaxed">
          Fast, keyboard-driven photo culling.<br />
          Select a folder to start sorting.
        </p>

        {/* Hidden file input for browser fallback */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
        />

        {/* Open Folder button */}
        <button
          onClick={handleOpenFolder}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white transition-all py-2.5 px-4 rounded-lg font-medium text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98]"
        >
          <FolderOpen className="w-4 h-4" />
          Open Folder
        </button>

        {/* Supported formats */}
        <p className="mt-4 text-[10px] text-zinc-600">
          JPEG · PNG · WebP · TIFF · ARW · CR2 · CR3 · NEF · DNG · RAF · ORF · RW2 + more
        </p>

        {/* Input modes */}
        <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-zinc-600">
          <div className="flex items-center gap-1">
            <Keyboard className="w-3 h-3" />
            Keyboard
          </div>
          <div className="flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" />
            Xbox Controller
          </div>
        </div>
      </div>
    </div>
  );
}

// Augment window type for selectorAPI
declare global {
  interface Window {
    selectorAPI?: any;
  }
}
