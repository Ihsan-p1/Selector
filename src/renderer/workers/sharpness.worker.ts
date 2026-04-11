// ═══════════════════════════════════════════
// Selector — Sharpness Web Worker
// Laplacian Variance method for focus detection
// ═══════════════════════════════════════════

interface SharpnessMessage {
  type: 'compute';
  imageUrl: string;
  photoId: string;
}

interface SharpnessResult {
  type: 'result';
  photoId: string;
  score: number; // 0-100
  rawVariance: number;
}

// Sharpness thresholds for 0-100 normalization
const VARIANCE_MIN = 10;    // Below this = definitely blurry
const VARIANCE_MAX = 2000;  // Above this = definitely sharp

self.onmessage = async (e: MessageEvent<SharpnessMessage>) => {
  if (e.data.type !== 'compute') return;

  const { imageUrl, photoId } = e.data;

  try {
    // Fetch and decode image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // Downscale for performance — sharpness analysis doesn't need full res
    const MAX_DIM = 512;
    const scale = Math.min(MAX_DIM / bitmap.width, MAX_DIM / bitmap.height, 1);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    bitmap.close();

    // Step 1: Convert to grayscale
    const gray = new Float32Array(w * h);
    for (let i = 0; i < gray.length; i++) {
      const pi = i * 4;
      gray[i] = 0.299 * data[pi] + 0.587 * data[pi + 1] + 0.114 * data[pi + 2];
    }

    // Step 2: Apply Gaussian blur (3x3 kernel for noise reduction)
    const blurred = gaussianBlur3x3(gray, w, h);

    // Step 3: Apply Laplacian convolution (3x3 kernel)
    // Kernel: [0, 1, 0]
    //         [1,-4, 1]
    //         [0, 1, 0]
    const laplacian = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        laplacian[idx] =
          blurred[(y - 1) * w + x] +
          blurred[(y + 1) * w + x] +
          blurred[y * w + (x - 1)] +
          blurred[y * w + (x + 1)] -
          4 * blurred[idx];
      }
    }

    // Step 4: Compute variance of Laplacian
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const val = laplacian[y * w + x];
        sum += val;
        sumSq += val * val;
        count++;
      }
    }

    const mean = sum / count;
    const rawVariance = (sumSq / count) - (mean * mean);

    // Step 5: Normalize to 0-100
    const clamped = Math.max(VARIANCE_MIN, Math.min(VARIANCE_MAX, rawVariance));
    const score = Math.round(
      ((clamped - VARIANCE_MIN) / (VARIANCE_MAX - VARIANCE_MIN)) * 100
    );

    const result: SharpnessResult = {
      type: 'result',
      photoId,
      score,
      rawVariance,
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

/**
 * Gaussian blur 3x3
 * Kernel: [1, 2, 1]
 *         [2, 4, 2]  / 16
 *         [1, 2, 1]
 */
function gaussianBlur3x3(src: Float32Array, w: number, h: number): Float32Array {
  const dst = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      dst[idx] = (
        1 * src[(y - 1) * w + (x - 1)] +
        2 * src[(y - 1) * w + x] +
        1 * src[(y - 1) * w + (x + 1)] +
        2 * src[y * w + (x - 1)] +
        4 * src[y * w + x] +
        2 * src[y * w + (x + 1)] +
        1 * src[(y + 1) * w + (x - 1)] +
        2 * src[(y + 1) * w + x] +
        1 * src[(y + 1) * w + (x + 1)]
      ) / 16;
    }
  }

  return dst;
}
