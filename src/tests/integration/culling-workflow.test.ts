import { describe, it, expect, beforeEach } from 'vitest';
import { usePhotoStore } from '@renderer/stores/photo.store';
import { useFilterStore } from '@renderer/stores/filter.store';
import { useSessionStore } from '@renderer/stores/session.store';
import { createEmptyExif } from '@/shared/types';
import type { PhotoEntry } from '@/shared/types';

// ═══════════════════════════════════════════
// Integration Test: Full Culling Workflow
// Tests the complete pipeline:
// Import → Flag → Rate → Color → Filter → Export states → Session save/restore
// ═══════════════════════════════════════════

function createPhoto(id: string, name: string): PhotoEntry {
  return {
    id,
    filePath: `C:/Photos/${name}`,
    fileName: name,
    fileSize: 1024000,
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
  };
}

describe('Culling Workflow Integration', () => {
  beforeEach(() => {
    usePhotoStore.setState({
      photos: [],
      currentIndex: 0,
      selectedIndices: new Set(),
    });
    useFilterStore.getState().clearAllFilters();
    useSessionStore.setState({
      activeSessionId: null,
      activeSessionName: null,
      activeFolderPath: null,
      sessions: [],
      isDirty: false,
      isLoading: false,
      lastSavedAt: null,
    });
  });

  it('should complete full culling workflow: import → flag → filter → export', () => {
    const photos = [
      createPhoto('p1', 'portrait_01.jpg'),
      createPhoto('p2', 'portrait_02.jpg'),
      createPhoto('p3', 'landscape_01.jpg'),
      createPhoto('p4', 'landscape_02.jpg'),
      createPhoto('p5', 'macro_01.jpg'),
      createPhoto('p6', 'macro_02.jpg'),
      createPhoto('p7', 'street_01.jpg'),
      createPhoto('p8', 'street_02.jpg'),
      createPhoto('p9', 'event_01.jpg'),
      createPhoto('p10', 'event_02.jpg'),
    ];

    // 1. Import photos
    usePhotoStore.getState().setPhotos(photos);
    expect(usePhotoStore.getState().photos).toHaveLength(10);
    expect(usePhotoStore.getState().currentIndex).toBe(0);

    // 2. Flag picks and rejects
    const store = usePhotoStore.getState();
    store.flagPhoto(0, 'pick');     // portrait_01 = pick
    store.flagPhoto(1, 'reject');   // portrait_02 = reject
    store.flagPhoto(2, 'pick');     // landscape_01 = pick
    store.flagPhoto(3, 'pick');     // landscape_02 = pick
    store.flagPhoto(4, 'reject');   // macro_01 = reject
    store.flagPhoto(5, 'pick');     // macro_02 = pick

    // 3. Rate the picks
    store.ratePhoto(0, 5);  // portrait_01 = 5 stars
    store.ratePhoto(2, 4);  // landscape_01 = 4 stars
    store.ratePhoto(3, 3);  // landscape_02 = 3 stars
    store.ratePhoto(5, 5);  // macro_02 = 5 stars

    // 4. Color label some
    store.setColorLabel(0, 'green');  // portrait_01 = green
    store.setColorLabel(5, 'green');  // macro_02 = green

    // 5. Verify stats
    const stats = usePhotoStore.getState().getStats();
    expect(stats.total).toBe(10);
    expect(stats.picks).toBe(4);
    expect(stats.rejects).toBe(2);
    expect(stats.unflagged).toBe(4);
    expect(stats.rated).toBe(4);

    // 6. Filter to picks only
    useFilterStore.getState().setFlagFilter(['pick']);
    const filtered = useFilterStore.getState().applyFilters(usePhotoStore.getState().photos);
    expect(filtered).toHaveLength(4);
    expect(filtered.every(p => p.flag === 'pick')).toBe(true);

    // 7. Filter to picks with 5 stars
    useFilterStore.getState().setMinRating(5);
    const topPicks = useFilterStore.getState().applyFilters(usePhotoStore.getState().photos);
    expect(topPicks).toHaveLength(2);
    expect(topPicks[0].fileName).toBe('portrait_01.jpg');
    expect(topPicks[1].fileName).toBe('macro_02.jpg');

    // 8. Filter to picks with green label
    useFilterStore.getState().setMinRating(0);
    useFilterStore.getState().setColorFilter(['green']);
    const greenPicks = useFilterStore.getState().applyFilters(usePhotoStore.getState().photos);
    expect(greenPicks).toHaveLength(2);

    // 9. Clear filters
    useFilterStore.getState().clearAllFilters();
    const all = useFilterStore.getState().applyFilters(usePhotoStore.getState().photos);
    expect(all).toHaveLength(10);
  });

  it('should preserve states through export/import cycle', () => {
    const photos = [
      createPhoto('p1', 'test_01.jpg'),
      createPhoto('p2', 'test_02.jpg'),
      createPhoto('p3', 'test_03.jpg'),
    ];

    // Set up state
    usePhotoStore.getState().setPhotos(photos);
    usePhotoStore.getState().flagPhoto(0, 'pick');
    usePhotoStore.getState().ratePhoto(0, 5);
    usePhotoStore.getState().setColorLabel(0, 'red');
    usePhotoStore.getState().flagPhoto(1, 'reject');
    usePhotoStore.getState().ratePhoto(2, 3);

    // Export states (session save)
    const exportedStates = usePhotoStore.getState().exportStates();
    expect(exportedStates).toHaveLength(3);
    expect(exportedStates[0]).toEqual({
      id: 'p1', flag: 'pick', rating: 5, colorLabel: 'red',
    });
    expect(exportedStates[1]).toEqual({
      id: 'p2', flag: 'reject', rating: 0, colorLabel: 'none',
    });

    // Reset photos (simulate app restart)
    usePhotoStore.getState().setPhotos([
      createPhoto('p1', 'test_01.jpg'),
      createPhoto('p2', 'test_02.jpg'),
      createPhoto('p3', 'test_03.jpg'),
    ]);

    // All should be unflagged after reset
    expect(usePhotoStore.getState().photos.every(p => p.flag === 'unflagged')).toBe(true);

    // Import states (session restore)
    usePhotoStore.getState().importStates(exportedStates);

    // Verify restoration
    const restored = usePhotoStore.getState().photos;
    expect(restored[0].flag).toBe('pick');
    expect(restored[0].rating).toBe(5);
    expect(restored[0].colorLabel).toBe('red');
    expect(restored[1].flag).toBe('reject');
    expect(restored[2].rating).toBe(3);
  });

  it('should handle session state tracking', () => {
    // Set up active session
    useSessionStore.getState().setActiveSession('sess_test', 'Test Session', 'C:/Photos');
    expect(useSessionStore.getState().activeSessionId).toBe('sess_test');
    expect(useSessionStore.getState().isDirty).toBe(false);

    // Make changes → should be able to mark dirty
    useSessionStore.getState().markDirty();
    expect(useSessionStore.getState().isDirty).toBe(true);

    // Save → should be clean
    useSessionStore.getState().markClean();
    expect(useSessionStore.getState().isDirty).toBe(false);
    expect(useSessionStore.getState().lastSavedAt).not.toBeNull();
  });

  it('should correctly count filtered results', () => {
    const photos = Array.from({ length: 20 }, (_, i) => createPhoto(`p${i}`, `photo_${i}.jpg`));

    usePhotoStore.getState().setPhotos(photos);

    // Flag first 5 as picks, next 3 as rejects
    for (let i = 0; i < 5; i++) usePhotoStore.getState().flagPhoto(i, 'pick');
    for (let i = 5; i < 8; i++) usePhotoStore.getState().flagPhoto(i, 'reject');

    // Rate some
    usePhotoStore.getState().ratePhoto(0, 5);
    usePhotoStore.getState().ratePhoto(1, 4);
    usePhotoStore.getState().ratePhoto(2, 3);

    // Counts
    const counts = useFilterStore.getState().getCounts(usePhotoStore.getState().photos);
    expect(counts.picks).toBe(5);
    expect(counts.rejects).toBe(3);
    expect(counts.unflagged).toBe(12);
    expect(counts.rated).toBe(3);

    // Filter picks with >= 4 stars
    useFilterStore.getState().setFlagFilter(['pick']);
    useFilterStore.getState().setMinRating(4);
    const result = useFilterStore.getState().applyFilters(usePhotoStore.getState().photos);
    expect(result).toHaveLength(2);
  });
});
