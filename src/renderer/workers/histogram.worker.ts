// ═══════════════════════════════════════════
// Selector — Histogram Web Worker
// Computes RGB channel distribution from image
// ═══════════════════════════════════════════

interface HistogramMessage {
  type: 'compute';
  imageUrl: string;
  photoId: string;
}

interface HistogramResult {
  type: 'result';
  photoId: string;
  histogram: [number[], number[], number[]]; // [R, G, B] each 256 bins
}

self.onmessage = async (e: MessageEvent<HistogramMessage>) => {
  if (e.data.type !== 'compute') return;

  const { imageUrl, photoId } = e.data;

  try {
    // Fetch image and draw to OffscreenCanvas
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Initialize 256-bin arrays for R, G, B
    const r = new Array(256).fill(0);
    const g = new Array(256).fill(0);
    const b = new Array(256).fill(0);

    // Sample every Nth pixel for performance (if image is large)
    const totalPixels = data.length / 4;
    const step = totalPixels > 500000 ? 4 : 1; // Skip pixels for large images

    for (let i = 0; i < data.length; i += 4 * step) {
      r[data[i]]++;
      g[data[i + 1]]++;
      b[data[i + 2]]++;
    }

    // Normalize to 0-1 range
    const maxCount = Math.max(
      Math.max(...r),
      Math.max(...g),
      Math.max(...b),
    );

    if (maxCount > 0) {
      for (let i = 0; i < 256; i++) {
        r[i] = r[i] / maxCount;
        g[i] = g[i] / maxCount;
        b[i] = b[i] / maxCount;
      }
    }

    bitmap.close();

    const result: HistogramResult = {
      type: 'result',
      photoId,
      histogram: [r, g, b],
    };

    self.postMessage(result);
  } catch (err) {
    self.postMessage({
      type: 'error',
      photoId,
      error: String(err),
    });
  }
};
