import { describe, it, expect } from 'vitest';
import { cn, formatFileSize, formatShutterSpeed, generatePhotoId } from '@renderer/lib/utils';

describe('Utility Functions', () => {

  describe('cn (class name merge)', () => {
    it('should merge class names', () => {
      const result = cn('text-white', 'bg-black');
      expect(result).toContain('text-white');
      expect(result).toContain('bg-black');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', false && 'hidden', true && 'visible');
      expect(result).toContain('base');
      expect(result).toContain('visible');
      expect(result).not.toContain('hidden');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });
  });

  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('formatShutterSpeed', () => {
    it('should return dash for null', () => {
      expect(formatShutterSpeed(null)).toBe('—');
    });

    it('should format speeds >= 1 second', () => {
      expect(formatShutterSpeed(1)).toBe('1s');
      expect(formatShutterSpeed(2)).toBe('2s');
      expect(formatShutterSpeed(30)).toBe('30s');
    });

    it('should format fractional speeds', () => {
      expect(formatShutterSpeed(0.005)).toBe('1/200');
      expect(formatShutterSpeed(0.001)).toBe('1/1000');
      expect(formatShutterSpeed(1/60)).toBe('1/60');
    });
  });

  describe('generatePhotoId', () => {
    it('should generate a string id', () => {
      const id = generatePhotoId('C:/Photos/test.jpg');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should be deterministic (same input → same output)', () => {
      const id1 = generatePhotoId('C:/Photos/test.jpg');
      const id2 = generatePhotoId('C:/Photos/test.jpg');
      expect(id1).toBe(id2);
    });

    it('should produce different ids for different paths', () => {
      const id1 = generatePhotoId('C:/Photos/a.jpg');
      const id2 = generatePhotoId('C:/Photos/b.jpg');
      expect(id1).not.toBe(id2);
    });
  });
});
