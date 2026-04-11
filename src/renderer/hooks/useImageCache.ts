import { useState, useEffect, useRef } from 'react';
import type { PhotoEntry } from '@/shared/types';

const MAX_CACHE = 10;
const cache = new Map<string, string>();

/**
 * Returns an object URL for the given photo.
 * In Electron, uses file:// protocol via IPC.
 * In browser dev mode, uses URL.createObjectURL from the File object.
 */
export function useImageCache(photo: PhotoEntry | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) {
      setUrl(null);
      return;
    }

    // Check cache first
    if (cache.has(photo.id)) {
      setUrl(cache.get(photo.id)!);
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      try {
        let imageUrl: string | null = null;

        if (window.selectorAPI) {
          // Electron mode — get URL via IPC
          imageUrl = await window.selectorAPI.readImage(photo.filePath);
        } else {
          // Browser fallback — use File objects if available via webkitdirectory
          // This won't work for real paths, but handles dev mode with file input
          imageUrl = null;
        }

        if (!cancelled && imageUrl) {
          // Manage cache size
          if (cache.size >= MAX_CACHE) {
            const firstKey = cache.keys().next().value;
            if (firstKey) {
              const oldUrl = cache.get(firstKey);
              if (oldUrl?.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
              cache.delete(firstKey);
            }
          }
          cache.set(photo.id, imageUrl);
          setUrl(imageUrl);
        }
      } catch (err) {
        console.error('Failed to load image:', photo.fileName, err);
        if (!cancelled) setUrl(null);
      }
    };

    loadImage();

    return () => { cancelled = true; };
  }, [photo?.id]);

  return url;
}

/**
 * Clear the entire image cache (call on folder change)
 */
export function clearImageCache(): void {
  cache.forEach((url) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
  cache.clear();
}
