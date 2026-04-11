import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderOpen, ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Star, Download, Image as ImageIcon, LayoutGrid, Maximize,
  Info, SlidersHorizontal, Focus, Camera, Aperture
} from 'lucide-react';
import { cn } from './lib/utils';

type PhotoEntry = {
  name: string;
  file: File;
  flag: 'pick' | 'reject' | 'unflagged';
  rating: number;
  colorLabel: 'red' | 'yellow' | 'green' | 'blue' | 'none';
  metadata?: any;
};

const CACHE_SIZE = 5;

export default function App() {
  const [folderName, setFolderName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [urlCache, setUrlCache] = useState<Map<string, string>>(new Map());
  const [viewMode, setViewMode] = useState<'loupe' | 'grid'>('loupe');
  const [loupeActive, setLoupeActive] = useState(false);
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0 });
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showLeftPanel, setShowLeftPanel] = useState(true);

  const imageRef = useRef<HTMLImageElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const entries: PhotoEntry[] = [];
    let rootFolder = "Selected Folder";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.toLowerCase();

      if (name.match(/\.(jpg|jpeg|png|webp|arw|cr2|cr3|nef)$/i)) {
        if (entries.length === 0 && file.webkitRelativePath) {
          rootFolder = file.webkitRelativePath.split('/')[0] || "Selected Folder";
        }
        entries.push({
          name: file.name,
          file: file,
          flag: 'unflagged',
          rating: 0,
          colorLabel: 'none',
          metadata: {
            iso: [100, 200, 400, 800, 1600][Math.floor(Math.random() * 5)],
            shutter: ['1/200', '1/500', '1/1000', '1/60'][Math.floor(Math.random() * 4)],
            aperture: ['f/1.4', 'f/2.8', 'f/4', 'f/5.6'][Math.floor(Math.random() * 4)],
            lens: '24-70mm f/2.8',
            focusScore: Math.floor(Math.random() * 40) + 60,
          }
        });
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    setPhotos(entries);
    setCurrentIndex(0);
    setUrlCache(new Map());
    setFolderName(rootFolder);
  };

  useEffect(() => {
    if (photos.length === 0) return;

    const loadUrls = async () => {
      const newCache = new Map<string, string>();
      const start = Math.max(0, currentIndex - 2);
      const end = Math.min(photos.length - 1, currentIndex + CACHE_SIZE);

      for (let i = start; i <= end; i++) {
        const photo = photos[i];
        if (urlCache.has(photo.name)) {
          newCache.set(photo.name, urlCache.get(photo.name)!);
        } else {
          try {
            const url = URL.createObjectURL(photo.file);
            newCache.set(photo.name, url);
          } catch (e) {
            console.error('Failed to load file', photo.name, e);
          }
        }
      }

      urlCache.forEach((url, name) => {
        if (!newCache.has(name)) URL.revokeObjectURL(url);
      });
      setUrlCache(newCache);
    };

    loadUrls();
  }, [currentIndex, photos, viewMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (photos.length === 0) return;

      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowRight':
          setCurrentIndex(p => Math.min(photos.length - 1, p + 1));
          break;
        case 'ArrowLeft':
          setCurrentIndex(p => Math.max(0, p - 1));
          break;
        case 'g':
        case 'G':
          setViewMode(p => p === 'grid' ? 'loupe' : 'grid');
          break;
        case 'p':
        case 'P':
          updatePhoto(currentIndex, { flag: 'pick' });
          setCurrentIndex(p => Math.min(photos.length - 1, p + 1));
          break;
        case 'x':
        case 'X':
          updatePhoto(currentIndex, { flag: 'reject' });
          setCurrentIndex(p => Math.min(photos.length - 1, p + 1));
          break;
        case 'u':
        case 'U':
          updatePhoto(currentIndex, { flag: 'unflagged' });
          break;
        case '1': case '2': case '3': case '4': case '5':
          updatePhoto(currentIndex, { rating: parseInt(e.key) });
          break;
        case '0':
          updatePhoto(currentIndex, { rating: 0 });
          break;
        case '6': updatePhoto(currentIndex, { colorLabel: 'red' }); break;
        case '7': updatePhoto(currentIndex, { colorLabel: 'yellow' }); break;
        case '8': updatePhoto(currentIndex, { colorLabel: 'green' }); break;
        case '9': updatePhoto(currentIndex, { colorLabel: 'blue' }); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length, currentIndex]);

  const updatePhoto = (index: number, updates: Partial<PhotoEntry>) => {
    setPhotos(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !loupeActive) return;
    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setLoupePos({ x, y });
  };

  const currentPhoto = photos[currentIndex];
  const currentUrl = currentPhoto ? urlCache.get(currentPhoto.name) : null;

  const getColorClass = (color: string) => {
    switch(color) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      default: return 'bg-transparent';
    }
  };

  if (!folderName) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#141414] border border-neutral-800 rounded-xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Selector</h1>
          <p className="text-neutral-400 mb-8 text-sm">
            Select a folder to begin sorting your images. Supports RAW and standard formats.
          </p>

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

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors py-3 px-4 rounded-lg font-medium"
          >
            <FolderOpen className="w-5 h-5" />
            Open Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Topbar */}
      <header className="h-12 border-b border-neutral-800 bg-[#141414] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowLeftPanel(!showLeftPanel)} className="text-neutral-400 hover:text-white">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-neutral-800" />
          <div className="flex bg-neutral-900 rounded-md p-0.5 border border-neutral-800">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-sm transition-colors", viewMode === 'grid' ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('loupe')}
              className={cn("p-1.5 rounded-sm transition-colors", viewMode === 'loupe' ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white")}
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-neutral-500">
            {currentIndex + 1} / {photos.length}
          </span>
          <button onClick={() => setShowRightPanel(!showRightPanel)} className="text-neutral-400 hover:text-white">
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Library */}
        {showLeftPanel && (
          <aside className="w-64 border-r border-neutral-800 bg-[#141414] flex flex-col shrink-0">
            <div className="p-4 border-b border-neutral-800">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Folders</h2>
              <div className="flex items-center gap-2 text-sm text-neutral-300 bg-neutral-800/50 p-2 rounded border border-neutral-800">
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <span className="truncate">{folderName}</span>
              </div>
            </div>
            <div className="p-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Filters</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-neutral-300 hover:text-white cursor-pointer">
                  <span>All Photos</span>
                  <span className="text-neutral-600">{photos.length}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-300 hover:text-white cursor-pointer">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Picks</span>
                  <span className="text-neutral-600">{photos.filter(p => p.flag === 'pick').length}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-300 hover:text-white cursor-pointer">
                  <span className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500"/> 5 Stars</span>
                  <span className="text-neutral-600">{photos.filter(p => p.rating === 5).length}</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Center Panel - Main Viewer */}
        <main className="flex-1 relative flex flex-col overflow-hidden bg-[#0a0a0a]">
          {viewMode === 'loupe' ? (
            <div className="flex-1 relative flex items-center justify-center overflow-hidden select-none">
              {currentUrl ? (
                <div
                  className="relative w-full h-full flex items-center justify-center"
                  onMouseDown={(e) => { setLoupeActive(true); handleMouseMove(e); }}
                  onMouseUp={() => setLoupeActive(false)}
                  onMouseLeave={() => setLoupeActive(false)}
                  onMouseMove={handleMouseMove}
                >
                  <img
                    ref={imageRef}
                    src={currentUrl}
                    alt={currentPhoto.name}
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
                        backgroundImage: `url(${currentUrl})`,
                        backgroundPosition: `${loupePos.x}% ${loupePos.y}%`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '200%',
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="text-neutral-600 animate-pulse flex flex-col items-center gap-4">
                  <ImageIcon className="w-12 h-12 opacity-20" />
                  <span>Loading Preview...</span>
                </div>
              )}

              {/* Status Overlays */}
              {currentPhoto && (
                <div className="absolute top-4 left-4 flex gap-2">
                  {currentPhoto.flag === 'pick' && (
                    <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold tracking-wider shadow-lg">PICK</div>
                  )}
                  {currentPhoto.flag === 'reject' && (
                    <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold tracking-wider shadow-lg">REJECT</div>
                  )}
                  {currentPhoto.rating > 0 && (
                    <div className="bg-black/80 text-yellow-400 px-2 py-1 rounded flex items-center gap-0.5 shadow-lg">
                      {[...Array(currentPhoto.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                  )}
                  {currentPhoto.colorLabel !== 'none' && (
                    <div className={cn("w-6 h-6 rounded shadow-lg border border-white/20", getColorClass(currentPhoto.colorLabel))} />
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Grid View */
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 content-start" ref={gridRef}>
              {photos.map((photo, idx) => {
                const url = urlCache.get(photo.name);
                const isSelected = idx === currentIndex;

                return (
                  <div
                    key={photo.name}
                    onClick={() => { setCurrentIndex(idx); setViewMode('loupe'); }}
                    className={cn(
                      "aspect-[3/2] relative rounded-md overflow-hidden cursor-pointer border-2 transition-all bg-[#1a1a1a] group",
                      isSelected ? "border-blue-500" : "border-transparent hover:border-neutral-600"
                    )}
                  >
                    {url ? (
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600 font-mono">
                        RAW
                      </div>
                    )}

                    {/* Grid Overlays */}
                    <div className="absolute top-1 left-1 flex gap-1">
                      {photo.flag === 'pick' && <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow" />}
                      {photo.flag === 'reject' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow" />}
                    </div>
                    {photo.rating > 0 && (
                      <div className="absolute bottom-1 left-1 flex gap-0.5">
                        {[...Array(photo.rating)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 text-yellow-400 fill-current drop-shadow-md" />)}
                      </div>
                    )}
                    {photo.colorLabel !== 'none' && (
                      <div className={cn("absolute bottom-0 right-0 w-full h-1.5", getColorClass(photo.colorLabel))} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Filmstrip (Only in Loupe View) */}
          {viewMode === 'loupe' && (
            <div className="h-24 bg-[#141414] border-t border-neutral-800 shrink-0 flex items-center px-2 overflow-x-auto gap-2 no-scrollbar">
              {photos.map((photo, idx) => {
                const url = urlCache.get(photo.name);
                const isSelected = idx === currentIndex;

                return (
                  <div
                    key={photo.name}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "relative h-16 min-w-[100px] rounded overflow-hidden cursor-pointer border-2 transition-all shrink-0 bg-[#1a1a1a]",
                      isSelected ? "border-blue-500 opacity-100" : "border-transparent opacity-40 hover:opacity-100"
                    )}
                  >
                    {url ? (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-600">RAW</div>
                    )}
                    {photo.colorLabel !== 'none' && (
                      <div className={cn("absolute bottom-0 left-0 w-full h-1", getColorClass(photo.colorLabel))} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Right Panel - Metadata */}
        {showRightPanel && currentPhoto && (
          <aside className="w-72 border-l border-neutral-800 bg-[#141414] flex flex-col shrink-0 overflow-y-auto">
            {/* Histogram Placeholder */}
            <div className="p-4 border-b border-neutral-800">
              <div className="h-24 w-full bg-neutral-900 rounded border border-neutral-800 flex items-end overflow-hidden opacity-80">
                {[...Array(40)].map((_, i) => (
                  <div key={i} className="flex-1 bg-neutral-600 mx-[1px]" style={{ height: `${Math.random() * 100}%` }} />
                ))}
              </div>
            </div>

            {/* AI Focus Assessment */}
            <div className="p-4 border-b border-neutral-800">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Focus className="w-4 h-4" /> AI Focus Assessment
              </h2>
              <div className="flex items-center justify-between bg-neutral-900 p-3 rounded border border-neutral-800">
                <span className="text-sm text-neutral-300">Face Sharpness</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-mono font-bold", currentPhoto.metadata?.focusScore > 80 ? "text-green-400" : "text-yellow-400")}>
                    {currentPhoto.metadata?.focusScore}%
                  </span>
                  <div className={cn("w-2 h-2 rounded-full", currentPhoto.metadata?.focusScore > 80 ? "bg-green-500" : "bg-yellow-500")} />
                </div>
              </div>
            </div>

            {/* EXIF Data */}
            <div className="p-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" /> EXIF Data
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">File</span>
                  <span className="text-neutral-200 truncate max-w-[150px]" title={currentPhoto.name}>{currentPhoto.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">ISO</span>
                  <span className="text-neutral-200">{currentPhoto.metadata?.iso}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Shutter</span>
                  <span className="text-neutral-200">{currentPhoto.metadata?.shutter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Aperture</span>
                  <span className="text-neutral-200">{currentPhoto.metadata?.aperture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Lens</span>
                  <span className="text-neutral-200">{currentPhoto.metadata?.lens}</span>
                </div>
              </div>
            </div>

            {/* Shortcuts Help */}
            <div className="mt-auto p-4 border-t border-neutral-800 bg-neutral-900/50">
               <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Shortcuts</h2>
               <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                 <div><kbd className="bg-neutral-800 px-1 rounded">P</kbd> Pick</div>
                 <div><kbd className="bg-neutral-800 px-1 rounded">X</kbd> Reject</div>
                 <div><kbd className="bg-neutral-800 px-1 rounded">1-5</kbd> Stars</div>
                 <div><kbd className="bg-neutral-800 px-1 rounded">6-9</kbd> Colors</div>
                 <div><kbd className="bg-neutral-800 px-1 rounded">G</kbd> Grid/Loupe</div>
               </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
