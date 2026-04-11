import { useState, useEffect } from 'react';
import type { PhotoEntry } from '@/shared/types';

const MAX_CACHE = 50;
const cache = new Map<string, string>();

/**
 * Returns a displayable URL for the given photo.
 * In Electron: uses thumbnail service (small) or file:// protocol (full).
 * In browser dev: returns null (no File object access).
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
          // Electron mode — get thumbnail via IPC
          imageUrl = await window.selectorAPI.getThumbnail(photo.id, photo.filePath);
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
 * Returns a full-resolution URL for loupe view.
 */
export function useFullImage(photo: PhotoEntry | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) {
      setUrl(null);
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      try {
        let imageUrl: string | null = null;

        if (window.selectorAPI) {
          // Electron mode — get full image
          imageUrl = await window.selectorAPI.readImage(photo.filePath);

          // If readImage returns null (RAW), try the extracted preview
          if (!imageUrl) {
            imageUrl = await window.selectorAPI.extractPreview(photo.filePath, '');
          }
        }

        // Fallback to file:// protocol
        if (!imageUrl && photo.filePath.includes(':')) {
          imageUrl = `file://${photo.filePath.replace(/\\/g, '/')}`;
        }

        if (!cancelled && imageUrl) {
          setUrl(imageUrl);
        }
      } catch (err) {
        console.error('Failed to load full image:', photo.fileName, err);
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
