import { useEffect, useRef } from 'react';
import { usePhotoStore } from '../stores/photo.store';
import HistogramWorker from '../workers/histogram.worker?worker';
import SharpnessWorker from '../workers/sharpness.worker?worker';

/**
 * Hook that automatically computes histogram and sharpness for the current photo.
 * Runs in Web Workers to avoid blocking the UI thread.
 */
export function usePhotoAnalysis() {
  const currentPhoto = usePhotoStore(s => s.getCurrentPhoto)();
  const updatePhoto = usePhotoStore(s => s.updatePhoto);
  const currentIndex = usePhotoStore(s => s.currentIndex);

  const histogramWorkerRef = useRef<Worker | null>(null);
  const sharpnessWorkerRef = useRef<Worker | null>(null);

  // Initialize workers
  useEffect(() => {
    const histWorker = new HistogramWorker();
    const sharpWorker = new SharpnessWorker();

    histogramWorkerRef.current = histWorker;
    sharpnessWorkerRef.current = sharpWorker;

    // Histogram result handler
    histWorker.onmessage = (e) => {
      if (e.data.type === 'result') {
        const { photoId, histogram } = e.data;
        const photos = usePhotoStore.getState().photos;
        const index = photos.findIndex(p => p.id === photoId);
        if (index >= 0) {
          updatePhoto(index, { histogram });
        }
      }
    };

    // Sharpness result handler
    sharpWorker.onmessage = (e) => {
      if (e.data.type === 'result') {
        const { photoId, score } = e.data;
        const photos = usePhotoStore.getState().photos;
        const index = photos.findIndex(p => p.id === photoId);
        if (index >= 0) {
          updatePhoto(index, { sharpnessScore: score, sharpnessComputed: true });
        }
      }
    };

    return () => {
      histWorker.terminate();
      sharpWorker.terminate();
      histogramWorkerRef.current = null;
      sharpnessWorkerRef.current = null;
    };
  }, []);

  // Compute for current photo when it changes
  useEffect(() => {
    if (!currentPhoto) return;

    const imageUrl = getImageUrl(currentPhoto);
    if (!imageUrl) return;

    // Compute histogram if not already done
    if (!currentPhoto.histogram) {
      histogramWorkerRef.current?.postMessage({
        type: 'compute',
        imageUrl,
        photoId: currentPhoto.id,
      });
    }

    // Compute sharpness if not already done
    if (!currentPhoto.sharpnessComputed) {
      sharpnessWorkerRef.current?.postMessage({
        type: 'compute',
        imageUrl,
        photoId: currentPhoto.id,
      });
    }
  }, [currentPhoto?.id]);
}

function getImageUrl(photo: { filePath: string; thumbnailPath: string | null }): string | null {
  // Use thumbnail if available (faster analysis), else try file path
  if (photo.thumbnailPath) return photo.thumbnailPath;
  // In Electron, use file:// protocol
  if (photo.filePath.includes(':')) {
    return `file://${photo.filePath.replace(/\\/g, '/')}`;
  }
  return null;
}
