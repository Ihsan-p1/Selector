// ═══════════════════════════════════════════════════════
// Selector — Shared Types (Main ↔ Renderer)
// ═══════════════════════════════════════════════════════

/** Supported standard image formats */
export const STANDARD_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'bmp'] as const;

/** Supported RAW image formats (all major cameras) */
export const RAW_FORMATS = [
  'arw',   // Sony
  'cr2',   // Canon (older)
  'cr3',   // Canon (newer)
  'nef',   // Nikon
  'nrw',   // Nikon (compact)
  'orf',   // Olympus / OM System
  'rw2',   // Panasonic / Lumix
  'raf',   // Fujifilm
  'dng',   // Adobe / Leica / many
  'pef',   // Pentax / Ricoh
  'srw',   // Samsung
  'x3f',   // Sigma
  'erf',   // Epson
  '3fr',   // Hasselblad
  'rwl',   // Leica
  'iiq',   // Phase One
  'dcr',   // Kodak
  'kdc',   // Kodak
  'mrw',   // Minolta / Konica
  'srf',   // Sony (older)
  'sr2',   // Sony (older)
] as const;

/** All supported image formats */
export const ALL_FORMATS = [...STANDARD_FORMATS, ...RAW_FORMATS] as const;

export type ImageFormat = (typeof ALL_FORMATS)[number];
export type FlagStatus = 'pick' | 'reject' | 'unflagged';
export type StarRating = 0 | 1 | 2 | 3 | 4 | 5;
export type ColorLabel = 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'none';

export interface ExifData {
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

export interface PhotoEntry {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  format: string;
  isRaw: boolean;

  // Culling state
  flag: FlagStatus;
  rating: StarRating;
  colorLabel: ColorLabel;

  // EXIF metadata (populated async)
  exif: ExifData;

  // Computed data
  thumbnailPath: string | null;
  histogram: [number[], number[], number[]] | null;
  sharpnessScore: number | null;
  sharpnessComputed: boolean;
}

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  extension: string;
  isRaw: boolean;
  lastModified: string;
}

export interface Session {
  id: string;
  name: string;
  folderPath: string;
  createdAt: string;
  updatedAt: string;
  photoCount: number;
  stats: SessionStats;
}

export interface SessionStats {
  total: number;
  picks: number;
  rejects: number;
  unflagged: number;
  rated: number;
  averageRating: number;
}

export interface PhotoState {
  id: string;
  flag: FlagStatus;
  rating: StarRating;
  colorLabel: ColorLabel;
}

export interface ExportOptions {
  mode: 'copy' | 'move';
  filter: ExportFilter;
  destination: string;
  preserveSubfolders: boolean;
  createSubfolder: boolean;
}

export interface ExportFilter {
  flags: FlagStatus[];
  minRating: StarRating;
  colorLabels: ColorLabel[];
}

export interface ExportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: { file: string; error: string }[];
}

// ── Utility functions ──

export function isImageFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ALL_FORMATS.includes(ext as ImageFormat);
}

export function isRawFormat(ext: string): boolean {
  return RAW_FORMATS.includes(ext.toLowerCase() as (typeof RAW_FORMATS)[number]);
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function createEmptyExif(): ExifData {
  return {
    cameraMake: null,
    cameraModel: null,
    lens: null,
    focalLength: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    dateTime: null,
    width: null,
    height: null,
    orientation: null,
    gps: null,
    flash: null,
    whiteBalance: null,
    exposureCompensation: null,
    meteringMode: null,
  };
}
