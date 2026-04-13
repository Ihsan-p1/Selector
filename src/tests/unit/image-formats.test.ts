import { describe, it, expect } from 'vitest';
import {
  isImageFile,
  isRawFormat,
  isStandardFormat,
  getExtension,
  getRawBrandName,
  getFormatLabel,
  getMimeType,
} from '@renderer/lib/image-formats';

describe('Image Format Utilities', () => {

  describe('isImageFile', () => {
    // Standard formats
    it('should accept .jpg', () => expect(isImageFile('photo.jpg')).toBe(true));
    it('should accept .jpeg', () => expect(isImageFile('photo.jpeg')).toBe(true));
    it('should accept .png', () => expect(isImageFile('photo.png')).toBe(true));
    it('should accept .webp', () => expect(isImageFile('photo.webp')).toBe(true));
    it('should accept .tiff', () => expect(isImageFile('photo.tiff')).toBe(true));
    it('should accept .bmp', () => expect(isImageFile('photo.bmp')).toBe(true));

    // RAW formats
    it('should accept .arw (Sony)', () => expect(isImageFile('photo.arw')).toBe(true));
    it('should accept .cr2 (Canon)', () => expect(isImageFile('photo.cr2')).toBe(true));
    it('should accept .cr3 (Canon)', () => expect(isImageFile('photo.cr3')).toBe(true));
    it('should accept .nef (Nikon)', () => expect(isImageFile('photo.nef')).toBe(true));
    it('should accept .orf (Olympus)', () => expect(isImageFile('photo.orf')).toBe(true));
    it('should accept .rw2 (Panasonic)', () => expect(isImageFile('photo.rw2')).toBe(true));
    it('should accept .raf (Fujifilm)', () => expect(isImageFile('photo.raf')).toBe(true));
    it('should accept .dng', () => expect(isImageFile('photo.dng')).toBe(true));

    // Unsupported
    it('should reject .txt', () => expect(isImageFile('readme.txt')).toBe(false));
    it('should reject .psd', () => expect(isImageFile('design.psd')).toBe(false));
    it('should reject .mp4', () => expect(isImageFile('video.mp4')).toBe(false));
    it('should reject empty string', () => expect(isImageFile('')).toBe(false));

    // Case insensitivity
    it('should accept .JPG (uppercase)', () => expect(isImageFile('photo.JPG')).toBe(true));
    it('should accept .NEF (uppercase)', () => expect(isImageFile('photo.NEF')).toBe(true));
  });

  describe('isRawFormat', () => {
    it('should identify RAW extensions', () => {
      expect(isRawFormat('arw')).toBe(true);
      expect(isRawFormat('cr2')).toBe(true);
      expect(isRawFormat('nef')).toBe(true);
      expect(isRawFormat('dng')).toBe(true);
    });

    it('should reject non-RAW extensions', () => {
      expect(isRawFormat('jpg')).toBe(false);
      expect(isRawFormat('png')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isRawFormat('ARW')).toBe(true);
      expect(isRawFormat('NEF')).toBe(true);
    });
  });

  describe('isStandardFormat', () => {
    it('should identify standard formats', () => {
      expect(isStandardFormat('jpg')).toBe(true);
      expect(isStandardFormat('png')).toBe(true);
      expect(isStandardFormat('webp')).toBe(true);
    });

    it('should reject RAW formats', () => {
      expect(isStandardFormat('arw')).toBe(false);
      expect(isStandardFormat('nef')).toBe(false);
    });
  });

  describe('getExtension', () => {
    it('should extract lowercase extension', () => {
      expect(getExtension('photo.JPG')).toBe('jpg');
      expect(getExtension('photo.CR2')).toBe('cr2');
      expect(getExtension('photo.png')).toBe('png');
    });

    it('should handle no extension', () => {
      expect(getExtension('noext')).toBe('noext');
    });

    it('should handle multiple dots', () => {
      expect(getExtension('my.photo.jpg')).toBe('jpg');
    });
  });

  describe('getRawBrandName', () => {
    it('should return camera brand for RAW extensions', () => {
      expect(getRawBrandName('arw')).toBe('Sony');
      expect(getRawBrandName('cr2')).toBe('Canon');
      expect(getRawBrandName('cr3')).toBe('Canon');
      expect(getRawBrandName('nef')).toBe('Nikon');
      expect(getRawBrandName('raf')).toBe('Fujifilm');
      expect(getRawBrandName('orf')).toContain('Olympus');
      expect(getRawBrandName('rw2')).toBe('Panasonic');
      expect(getRawBrandName('dng')).toContain('DNG');
    });

    it('should return Unknown for unrecognized extensions', () => {
      expect(getRawBrandName('xyz')).toBe('Unknown');
    });
  });

  describe('getFormatLabel', () => {
    it('should return readable labels for standard formats', () => {
      expect(getFormatLabel('jpg')).toBe('JPEG');
      expect(getFormatLabel('jpeg')).toBe('JPEG');
      expect(getFormatLabel('png')).toBe('PNG');
      expect(getFormatLabel('webp')).toBe('WebP');
    });

    it('should return brand RAW labels', () => {
      expect(getFormatLabel('arw')).toBe('Sony RAW');
      expect(getFormatLabel('nef')).toBe('Nikon RAW');
      expect(getFormatLabel('cr2')).toBe('Canon RAW');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      expect(getMimeType('jpg')).toBe('image/jpeg');
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('webp')).toBe('image/webp');
      expect(getMimeType('tiff')).toBe('image/tiff');
    });

    it('should return octet-stream for unknown types', () => {
      expect(getMimeType('arw')).toBe('application/octet-stream');
    });
  });
});
