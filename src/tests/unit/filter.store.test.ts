import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@renderer/stores/filter.store';
import { createEmptyExif } from '@/shared/types';
import type { PhotoEntry } from '@/shared/types';

function mockPhoto(overrides: Partial<PhotoEntry> = {}): PhotoEntry {
  return {
    id: `p_${Math.random().toString(36).slice(2)}`,
    filePath: '/test/photo.jpg',
    fileName: 'photo.jpg',
    fileSize: 1024,
    format: 'jpg',
    isRaw: false,
    flag: 'unflagged',
    rating: 0,
    colorLabel: 'none',
    exif: createEmptyExif(),
    thumbnailPath: null,
    histogram: null,
    sharpnessScore: null,
    sharpnessComputed: false,
    ...overrides,
  };
}

describe('FilterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().clearAllFilters();
  });

  const mixedPhotos: PhotoEntry[] = [
    mockPhoto({ id: 'p1', flag: 'pick', rating: 5, colorLabel: 'red' }),
    mockPhoto({ id: 'p2', flag: 'pick', rating: 3, colorLabel: 'green' }),
    mockPhoto({ id: 'p3', flag: 'reject', rating: 0, colorLabel: 'none' }),
    mockPhoto({ id: 'p4', flag: 'unflagged', rating: 2, colorLabel: 'blue' }),
    mockPhoto({ id: 'p5', flag: 'unflagged', rating: 0, colorLabel: 'none' }),
  ];

  describe('flag filter', () => {
    it('should filter picks only', () => {
      useFilterStore.getState().setFlagFilter(['pick']);
      const result = useFilterStore.getState().applyFilters(mixedPhotos);
      expect(result).toHaveLength(2);
      expect(result.every(p => p.flag === 'pick')).toBe(true);
    });

    it('should filter rejects only', () => {
      useFilterStore.getState().setFlagFilter(['reject']);
      const result = useFilterStore.getState().applyFilters(mixedPhotos);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p3');
    });

    it('should filter multiple flags', () => {
      useFilterStore.getState().setFlagFilter(['pick', 'unflagged']);
      const result = useFilterStore.getState().applyFilters(mixedPhotos);
      expect(result).toHaveLength(4);
    });
  });

  describe('rating filter', () => {
    it('should filter by minimum rating', () => {
      useFilterStore.getState().setMinRating(3);
      const result = useFilterStore.getState().applyFilters(mixedPhotos);
      expect(result).toHaveLength(2);
      expect(result.every(p => p.rating >= 3)).toBe(true);
    });

    it('should show all when min rating is 0', () => {
      useFilterStore.getState().setMinRating(0);
      const result = useFilterStore.getState().applyFilters(mixedPhotos);
      expect(result).toHaveLength(5);
    });
  });

  describe('color label filter', () => {
    it('should filter by color label', () => {
      useFilterStore.getState().setColorFilter(['red']);
      const result = useFilterStore.getState().applyFilters(mixedPhotos);
      expect(result).toHaveLength(1);
      expect(result[0].colorLabel).toBe('red');
    });

    it('should filter multiple colors', () => {
      useFilterStore.getState().setColorFilter(['red', 'green', 'blue']);
      const result = useFilterStore.getState().applyFilters(mixedPhotos);
      expect(result).toHaveLength(3);
    });
  });

  describe('combined filters (AND logic)', () => {
    it('should apply flag AND rating filters', () => {
      useFilterStore.getState().setFlagFilter(['pick']);
      useFilterStore.getState().setMinRating(4);
      const result = useFilterStore.getState().applyFilters(mixedPhotos);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });

    it('should return empty when no photos match all filters', () => {
      useFilterStore.getState().setFlagFilter(['reject']);
      useFilterStore.getState().setMinRating(5);
      const result = useFilterStore.getState().applyFilters(mixedPhotos);
      expect(result).toHaveLength(0);
    });
  });

  describe('getCounts', () => {
    it('should count flags correctly', () => {
      const counts = useFilterStore.getState().getCounts(mixedPhotos);
      expect(counts.picks).toBe(2);
      expect(counts.rejects).toBe(1);
      expect(counts.unflagged).toBe(2);
      expect(counts.rated).toBe(3);
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false when no filters active', () => {
      expect(useFilterStore.getState().hasActiveFilters()).toBe(false);
    });

    it('should return true when flag filter active', () => {
      useFilterStore.getState().setFlagFilter(['pick']);
      expect(useFilterStore.getState().hasActiveFilters()).toBe(true);
    });

    it('should return false after clearing', () => {
      useFilterStore.getState().setFlagFilter(['pick']);
      useFilterStore.getState().clearAllFilters();
      expect(useFilterStore.getState().hasActiveFilters()).toBe(false);
    });
  });
});
