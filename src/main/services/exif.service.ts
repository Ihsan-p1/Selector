import { ExifTool } from 'exiftool-vendored';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

// ═══════════════════════════════════════════
// Selector — ExifTool Service (Main Process)
// Singleton pool for metadata extraction
// ═══════════════════════════════════════════

let exiftool: ExifTool | null = null;

export function getExifTool(): ExifTool {
  if (!exiftool) {
    exiftool = new ExifTool({
      maxProcs: 2,
      taskTimeoutMillis: 30000,
    });
  }
  return exiftool;
}

export async function shutdownExifTool(): Promise<void> {
  if (exiftool) {
    await exiftool.end();
    exiftool = null;
  }
}

export interface ParsedExif {
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  focalLength: number | null;
  aperture: number | null;
  shutterSpeed: string | null;
  iso: number | null;
  dateTime: string | null;
  width: number | null;
  height: number | null;
  orientation: number | null;
  gps: { lat: number; lng: number } | null;
  flash: boolean | null;
  whiteBalance: string | null;
  exposureCompensation: number | null;
  meteringMode: string | null;
}

/**
 * Extract EXIF metadata from any supported image/RAW file.
 */
export async function extractExifData(filePath: string): Promise<ParsedExif> {
  const et = getExifTool();
  try {
    const tags = await et.read(filePath);

    return {
      cameraMake: tags.Make ?? null,
      cameraModel: tags.Model ?? null,
      lens: tags.LensModel ?? tags.Lens ?? null,
      focalLength: parseFocalLength(tags.FocalLength),
      aperture: parseAperture(tags.FNumber ?? tags.Aperture),
      shutterSpeed: formatShutterSpeed(tags.ExposureTime ?? tags.ShutterSpeedValue),
      iso: typeof tags.ISO === 'number' ? tags.ISO : null,
      dateTime: tags.DateTimeOriginal?.toString() ?? tags.CreateDate?.toString() ?? null,
      width: tags.ImageWidth ?? tags.ExifImageWidth ?? null,
      height: tags.ImageHeight ?? tags.ExifImageHeight ?? null,
      orientation: typeof tags.Orientation === 'number' ? tags.Orientation : null,
      gps: parseGPS(tags.GPSLatitude, tags.GPSLongitude),
      flash: parseFlash(tags.Flash),
      whiteBalance: typeof tags.WhiteBalance === 'string' ? tags.WhiteBalance : null,
      exposureCompensation: typeof tags.ExposureCompensation === 'number' ? tags.ExposureCompensation : null,
      meteringMode: typeof tags.MeteringMode === 'string' ? tags.MeteringMode : null,
    };
  } catch (err) {
    console.error(`EXIF read failed for ${filePath}:`, err);
    return createEmptyExif();
  }
}

/**
 * Extract embedded JPEG preview from RAW file.
 * Tries JpgFromRaw first, then PreviewImage, then ThumbnailImage.
 */
export async function extractRawPreview(rawPath: string, outputDir: string): Promise<string | null> {
  const et = getExifTool();
  const baseName = path.basename(rawPath, path.extname(rawPath));
  const outputPath = path.join(outputDir, `${baseName}_preview.jpg`);

  // Return cached if exists
  if (fs.existsSync(outputPath)) {
    return outputPath;
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Try extraction tags in order of quality
  const previewTags = ['JpgFromRaw', 'PreviewImage', 'ThumbnailImage'];

  for (const tag of previewTags) {
    try {
      await et.extractBinaryTag(tag, rawPath, outputPath);
      if (fs.existsSync(outputPath)) {
        const stat = fs.statSync(outputPath);
        if (stat.size > 1000) { // Valid preview should be > 1KB
          return outputPath;
        }
        // Too small, remove and try next tag
        fs.unlinkSync(outputPath);
      }
    } catch {
      // Tag not available, try next
    }
  }

  return null;
}

/**
 * Get the cache directory for thumbnails/previews.
 */
export function getCacheDir(): string {
  const cacheDir = path.join(app.getPath('userData'), 'cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  return cacheDir;
}

export function getThumbnailCacheDir(): string {
  const dir = path.join(getCacheDir(), 'thumbnails');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getPreviewCacheDir(): string {
  const dir = path.join(getCacheDir(), 'previews');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Helpers ──

function parseFocalLength(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (match) return parseFloat(match[1]);
  }
  return null;
}

function parseAperture(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (match) return parseFloat(match[1]);
  }
  return null;
}

function formatShutterSpeed(value: any): string | null {
  if (typeof value === 'number') {
    if (value >= 1) return `${value}s`;
    const denom = Math.round(1 / value);
    return `1/${denom}`;
  }
  if (typeof value === 'string') return value;
  return null;
}

function parseGPS(lat: any, lng: any): { lat: number; lng: number } | null {
  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng };
  }
  return null;
}

function parseFlash(value: any): boolean | null {
  if (typeof value === 'string') {
    return value.toLowerCase().includes('fired');
  }
  if (typeof value === 'number') {
    return (value & 1) === 1;
  }
  return null;
}

function createEmptyExif(): ParsedExif {
  return {
    cameraMake: null, cameraModel: null, lens: null, focalLength: null,
    aperture: null, shutterSpeed: null, iso: null, dateTime: null,
    width: null, height: null, orientation: null, gps: null,
    flash: null, whiteBalance: null, exposureCompensation: null, meteringMode: null,
  };
}
