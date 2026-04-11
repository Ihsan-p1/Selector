import { describe, it, expect, beforeEach } from 'vitest';
import { usePhotoStore } from '@renderer/stores/photo.store';
import { createEmptyExif } from '@/shared/types';
import type { PhotoEntry } from '@/shared/types';

function createMockPhoto(overrides: Partial<PhotoEntry> = {}): PhotoEntry {
  return {
    id: `photo_${Math.random().toString(36).slice(2, 8)}`,
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

function createMockPhotos(count: number): PhotoEntry[] {
  return Array.from({ length: count }, (_, i) =>
    createMockPhoto({
      id: `photo_${i}`,
      fileName: `photo_${i}.jpg`,
      filePath: `/test/photo_${i}.jpg`,
    })
  );
}

describe('PhotoStore', () => {
  beforeEach(() => {
    usePhotoStore.setState({
      photos: [],
      currentIndex: 0,
      selectedIndices: new Set(),
    });
  });

  describe('setPhotos', () => {
    it('should set photos and reset index', () => {
      const photos = createMockPhotos(5);
      usePhotoStore.getState().setPhotos(photos);

      expect(usePhotoStore.getState().photos).toHaveLength(5);
      expect(usePhotoStore.getState().currentIndex).toBe(0);
    });

    it('should clear selection when setting new photos', () => {
      usePhotoStore.setState({ selectedIndices: new Set([0, 1, 2]) });
      usePhotoStore.getState().setPhotos(createMockPhotos(3));

      expect(usePhotoStore.getState().selectedIndices.size).toBe(0);
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      usePhotoStore.getState().setPhotos(createMockPhotos(10));
    });

    it('should navigate to next photo', () => {
      usePhotoStore.getState().navigateNext();
      expect(usePhotoStore.getState().currentIndex).toBe(1);
    });

    it('should not go past last photo', () => {
      usePhotoStore.getState().setCurrentIndex(9);
      usePhotoStore.getState().navigateNext();
      expect(usePhotoStore.getState().currentIndex).toBe(9);
    });

    it('should navigate to previous photo', () => {
      usePhotoStore.getState().setCurrentIndex(5);
      usePhotoStore.getState().navigatePrev();
      expect(usePhotoStore.getState().currentIndex).toBe(4);
    });

    it('should not go before first photo', () => {
      usePhotoStore.getState().navigatePrev();
      expect(usePhotoStore.getState().currentIndex).toBe(0);
    });

    it('should navigate to first photo', () => {
      usePhotoStore.getState().setCurrentIndex(5);
      usePhotoStore.getState().navigateFirst();
      expect(usePhotoStore.getState().currentIndex).toBe(0);
    });

    it('should navigate to last photo', () => {
      usePhotoStore.getState().navigateLast();
      expect(usePhotoStore.getState().currentIndex).toBe(9);
    });

    it('should clamp index within bounds', () => {
      usePhotoStore.getState().setCurrentIndex(999);
      expect(usePhotoStore.getState().currentIndex).toBe(9);
    });

    it('should clamp negative index to 0', () => {
      usePhotoStore.getState().setCurrentIndex(-5);
      expect(usePhotoStore.getState().currentIndex).toBe(0);
    });
  });

  describe('flagging', () => {
    beforeEach(() => {
      usePhotoStore.getState().setPhotos(createMockPhotos(3));
    });

    it('should flag photo as pick', () => {
      usePhotoStore.getState().flagPhoto(0, 'pick');
      expect(usePhotoStore.getState().photos[0].flag).toBe('pick');
    });

    it('should flag photo as reject', () => {
      usePhotoStore.getState().flagPhoto(1, 'reject');
      expect(usePhotoStore.getState().photos[1].flag).toBe('reject');
    });

    it('should toggle flag when same flag applied', () => {
      usePhotoStore.getState().flagPhoto(0, 'pick');
      expect(usePhotoStore.getState().photos[0].flag).toBe('pick');

      usePhotoStore.getState().flagPhoto(0, 'pick');
      expect(usePhotoStore.getState().photos[0].flag).toBe('unflagged');
    });

    it('should replace flag when different flag applied', () => {
      usePhotoStore.getState().flagPhoto(0, 'pick');
      usePhotoStore.getState().flagPhoto(0, 'reject');
      expect(usePhotoStore.getState().photos[0].flag).toBe('reject');
    });

    it('should not crash on out-of-bounds index', () => {
      expect(() => usePhotoStore.getState().flagPhoto(99, 'pick')).not.toThrow();
      expect(() => usePhotoStore.getState().flagPhoto(-1, 'pick')).not.toThrow();
    });
  });

  describe('rating', () => {
    beforeEach(() => {
      usePhotoStore.getState().setPhotos(createMockPhotos(3));
    });

    it('should rate photo 1-5', () => {
      for (let r = 1; r <= 5; r++) {
        usePhotoStore.getState().ratePhoto(0, r as any);
        expect(usePhotoStore.getState().photos[0].rating).toBe(r);
      }
    });

    it('should toggle rating to 0 when same rating applied', () => {
      usePhotoStore.getState().ratePhoto(0, 3);
      usePhotoStore.getState().ratePhoto(0, 3);
      expect(usePhotoStore.getState().photos[0].rating).toBe(0);
    });

    it('should clear rating with 0', () => {
      usePhotoStore.getState().ratePhoto(0, 5);
      usePhotoStore.getState().ratePhoto(0, 0);
      expect(usePhotoStore.getState().photos[0].rating).toBe(0);
    });
  });

  describe('color labels', () => {
    beforeEach(() => {
      usePhotoStore.getState().setPhotos(createMockPhotos(3));
    });

    it('should set color label', () => {
      usePhotoStore.getState().setColorLabel(0, 'red');
      expect(usePhotoStore.getState().photos[0].colorLabel).toBe('red');
    });

    it('should toggle color label when same applied', () => {
      usePhotoStore.getState().setColorLabel(0, 'blue');
      usePhotoStore.getState().setColorLabel(0, 'blue');
      expect(usePhotoStore.getState().photos[0].colorLabel).toBe('none');
    });

    it('should replace color label', () => {
      usePhotoStore.getState().setColorLabel(0, 'red');
      usePhotoStore.getState().setColorLabel(0, 'green');
      expect(usePhotoStore.getState().photos[0].colorLabel).toBe('green');
    });
  });

  describe('selection', () => {
    beforeEach(() => {
      usePhotoStore.getState().setPhotos(createMockPhotos(5));
    });

    it('should toggle selection', () => {
      usePhotoStore.getState().toggleSelect(0);
      expect(usePhotoStore.getState().selectedIndices.has(0)).toBe(true);

      usePhotoStore.getState().toggleSelect(0);
      expect(usePhotoStore.getState().selectedIndices.has(0)).toBe(false);
    });

    it('should select range', () => {
      usePhotoStore.getState().selectRange(1, 3);
      const sel = usePhotoStore.getState().selectedIndices;
      expect(sel.has(1)).toBe(true);
      expect(sel.has(2)).toBe(true);
      expect(sel.has(3)).toBe(true);
      expect(sel.has(0)).toBe(false);
    });

    it('should select all', () => {
      usePhotoStore.getState().selectAll();
      expect(usePhotoStore.getState().selectedIndices.size).toBe(5);
    });

    it('should clear selection', () => {
      usePhotoStore.getState().selectAll();
      usePhotoStore.getState().clearSelection();
      expect(usePhotoStore.getState().selectedIndices.size).toBe(0);
    });
  });

  describe('bulk operations', () => {
    beforeEach(() => {
      usePhotoStore.getState().setPhotos(createMockPhotos(5));
      usePhotoStore.getState().selectRange(0, 2);
    });

    it('should flag all selected photos', () => {
      usePhotoStore.getState().flagSelected('pick');
      const photos = usePhotoStore.getState().photos;
      expect(photos[0].flag).toBe('pick');
      expect(photos[1].flag).toBe('pick');
      expect(photos[2].flag).toBe('pick');
      expect(photos[3].flag).toBe('unflagged');
    });

    it('should rate all selected photos', () => {
      usePhotoStore.getState().rateSelected(4);
      const photos = usePhotoStore.getState().photos;
      expect(photos[0].rating).toBe(4);
      expect(photos[1].rating).toBe(4);
      expect(photos[2].rating).toBe(4);
      expect(photos[3].rating).toBe(0);
    });
  });

  describe('session serialization', () => {
    it('should export photo states', () => {
      const photos = createMockPhotos(3);
      photos[0].flag = 'pick';
      photos[1].rating = 5;
      photos[2].colorLabel = 'red';
      usePhotoStore.getState().setPhotos(photos);

      const states = usePhotoStore.getState().exportStates();
      expect(states).toHaveLength(3);
      expect(states[0].flag).toBe('pick');
      expect(states[1].rating).toBe(5);
      expect(states[2].colorLabel).toBe('red');
    });

    it('should import photo states', () => {
      usePhotoStore.getState().setPhotos(createMockPhotos(3));

      usePhotoStore.getState().importStates([
        { id: 'photo_0', flag: 'pick', rating: 3, colorLabel: 'green' },
        { id: 'photo_2', flag: 'reject', rating: 1, colorLabel: 'red' },
      ]);

      const photos = usePhotoStore.getState().photos;
      expect(photos[0].flag).toBe('pick');
      expect(photos[0].rating).toBe(3);
      expect(photos[0].colorLabel).toBe('green');
      expect(photos[1].flag).toBe('unflagged'); // Not in import
      expect(photos[2].flag).toBe('reject');
    });
  });

  describe('getCurrentPhoto', () => {
    it('should return current photo', () => {
      const photos = createMockPhotos(3);
      usePhotoStore.getState().setPhotos(photos);
      usePhotoStore.getState().setCurrentIndex(1);

      const current = usePhotoStore.getState().getCurrentPhoto();
      expect(current?.id).toBe('photo_1');
    });

    it('should return null when no photos', () => {
      const current = usePhotoStore.getState().getCurrentPhoto();
      expect(current).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should compute stats correctly', () => {
      const photos = createMockPhotos(5);
      photos[0].flag = 'pick';
      photos[1].flag = 'pick';
      photos[2].flag = 'reject';
      photos[3].rating = 4;
      photos[4].rating = 2;
      usePhotoStore.getState().setPhotos(photos);

      const stats = usePhotoStore.getState().getStats();
      expect(stats.total).toBe(5);
      expect(stats.picks).toBe(2);
      expect(stats.rejects).toBe(1);
      expect(stats.unflagged).toBe(2);
      expect(stats.rated).toBe(2);
      expect(stats.averageRating).toBe(3);
    });
  });
});
