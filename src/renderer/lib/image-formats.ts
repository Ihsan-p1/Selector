// ═══════════════════════════════════════════
// Selector — Image Format Utilities
// Format detection, categorization, labels
// ═══════════════════════════════════════════

import { STANDARD_FORMATS, RAW_FORMATS, ALL_FORMATS, type ImageFormat } from '@/shared/types';

/** Check if a filename is a supported image file */
export function isImageFile(fileName: string): boolean {
  const ext = getExtension(fileName);
  return (ALL_FORMATS as readonly string[]).includes(ext);
}

/** Check if an extension is a RAW format */
export function isRawFormat(ext: string): boolean {
  return (RAW_FORMATS as readonly string[]).includes(ext.toLowerCase());
}

/** Check if an extension is a standard format */
export function isStandardFormat(ext: string): boolean {
  return (STANDARD_FORMATS as readonly string[]).includes(ext.toLowerCase());
}

/** Extract lowercase extension without dot */
export function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

/** Camera brand name from RAW extension */
export function getRawBrandName(ext: string): string {
  const map: Record<string, string> = {
    arw: 'Sony',
    cr2: 'Canon',
    cr3: 'Canon',
    nef: 'Nikon',
    nrw: 'Nikon',
    orf: 'Olympus / OM System',
    rw2: 'Panasonic',
    raf: 'Fujifilm',
    dng: 'Adobe DNG',
    pef: 'Pentax',
    srw: 'Samsung',
    x3f: 'Sigma',
    erf: 'Epson',
    '3fr': 'Hasselblad',
    rwl: 'Leica',
    iiq: 'Phase One',
    dcr: 'Kodak',
    kdc: 'Kodak',
    mrw: 'Minolta',
    srf: 'Sony',
    sr2: 'Sony',
  };
  return map[ext.toLowerCase()] ?? 'Unknown';
}

/** Format label for display (e.g. "JPEG", "Sony RAW") */
export function getFormatLabel(ext: string): string {
  if (isRawFormat(ext)) {
    return `${getRawBrandName(ext)} RAW`;
  }
  const labels: Record<string, string> = {
    jpg: 'JPEG',
    jpeg: 'JPEG',
    png: 'PNG',
    webp: 'WebP',
    tiff: 'TIFF',
    tif: 'TIFF',
    bmp: 'BMP',
  };
  return labels[ext.toLowerCase()] ?? ext.toUpperCase();
}

/** MIME type from extension */
export function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    bmp: 'image/bmp',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}
