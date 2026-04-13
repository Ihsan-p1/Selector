import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { nativeImage } from 'electron';
import { extractRawPreview, getThumbnailCacheDir, getPreviewCacheDir } from './exif.service';

// ═══════════════════════════════════════════
// Selector — Thumbnail Service (Main Process)
// Generates and caches thumbnails for all formats
// ═══════════════════════════════════════════

const THUMB_MAX_SIZE = 400; // Max dimension in px
const RAW_EXTENSIONS = new Set([
  'arw', 'cr2', 'cr3', 'nef', 'nrw', 'orf', 'rw2', 'raf',
  'dng', 'pef', 'srw', 'x3f', 'erf', '3fr', 'rwl', 'iiq',
  'dcr', 'kdc', 'mrw', 'srf', 'sr2',
]);

/**
 * Get or generate a thumbnail for any photo.
 * Returns a file:// URL to the cached thumbnail.
 */
export async function getThumbnail(photoId: string, filePath: string): Promise<string | null> {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const cacheDir = getThumbnailCacheDir();
  const hash = crypto.createHash('md5').update(filePath).digest('hex').slice(0, 12);
  const cachePath = path.join(cacheDir, `${hash}.jpg`);

  // Return cached thumbnail if exists
  if (fs.existsSync(cachePath)) {
    return `file:///${cachePath.replace(/\\/g, '/')}`;
  }

  try {
    if (RAW_EXTENSIONS.has(ext)) {
      return await generateRawThumbnail(filePath, cachePath);
    } else {
      return await generateStandardThumbnail(filePath, cachePath);
    }
  } catch (err) {
    console.error(`Thumbnail generation failed for ${filePath}:`, err);
    return null;
  }
}

/**
 * Generate thumbnail for standard image formats (JPEG, PNG, WebP, TIFF).
 * Uses Electron's nativeImage for fast resize.
 */
async function generateStandardThumbnail(filePath: string, cachePath: string): Promise<string | null> {
  try {
    const img = nativeImage.createFromPath(filePath);
    if (img.isEmpty()) return null;

    const size = img.getSize();
    const scale = Math.min(THUMB_MAX_SIZE / size.width, THUMB_MAX_SIZE / size.height, 1);
    const newWidth = Math.round(size.width * scale);
    const newHeight = Math.round(size.height * scale);

    const resized = img.resize({ width: newWidth, height: newHeight, quality: 'good' });
    const buffer = resized.toJPEG(80);

    fs.writeFileSync(cachePath, buffer);
    return `file:///${cachePath.replace(/\\/g, '/')}`;
  } catch (err) {
    console.error(`Standard thumbnail failed for ${filePath}:`, err);
    return null;
  }
}

/**
 * Generate thumbnail for RAW files by extracting embedded JPEG preview.
 */
async function generateRawThumbnail(filePath: string, cachePath: string): Promise<string | null> {
  const previewDir = getPreviewCacheDir();
  const previewPath = await extractRawPreview(filePath, previewDir);

  if (previewPath) {
    // Resize the extracted preview
    try {
      const img = nativeImage.createFromPath(previewPath);
      if (img.isEmpty()) return null;

      const size = img.getSize();
      const scale = Math.min(THUMB_MAX_SIZE / size.width, THUMB_MAX_SIZE / size.height, 1);
      const newWidth = Math.round(size.width * scale);
      const newHeight = Math.round(size.height * scale);

      const resized = img.resize({ width: newWidth, height: newHeight, quality: 'good' });
      const buffer = resized.toJPEG(80);

      fs.writeFileSync(cachePath, buffer);
      return `file:///${cachePath.replace(/\\/g, '/')}`;
    } catch (err) {
      console.error(`RAW thumbnail resize failed for ${filePath}:`, err);
      // Fallback: use the preview directly
      return `file:///${previewPath.replace(/\\/g, '/')}`;
    }
  }

  return null;
}

/**
 * Batch generate thumbnails. Returns map of photoId → URL.
 */
export async function getThumbnailBatch(
  photos: { id: string; path: string }[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // Process in chunks of 5 for concurrency
  const CHUNK_SIZE = 5;
  for (let i = 0; i < photos.length; i += CHUNK_SIZE) {
    const chunk = photos.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(async (p) => {
      const url = await getThumbnail(p.id, p.path);
      results.set(p.id, url);
    });
    await Promise.all(promises);
  }

  return results;
}
