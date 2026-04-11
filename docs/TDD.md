# Selector — Technical Design Document / Test Plan (TDD)

**Version:** 1.0  
**Date:** April 11, 2026  
**Author:** Development Team  
**Status:** Draft — Pending Approval

---

## Table of Contents

1. [Test Strategy Overview](#1-test-strategy-overview)
2. [Testing Stack](#2-testing-stack)
3. [Test Architecture](#3-test-architecture)
4. [Unit Tests](#4-unit-tests)
5. [Component Tests](#5-component-tests)
6. [Integration Tests](#6-integration-tests)
7. [E2E Tests](#7-e2e-tests)
8. [Performance Tests](#8-performance-tests)
9. [Input Device Tests](#9-input-device-tests)
10. [Test Data & Fixtures](#10-test-data--fixtures)
11. [CI/CD Integration](#11-cicd-integration)
12. [Appendix: Test Matrix](#12-appendix-test-matrix)

---

## 1. Test Strategy Overview

### 1.1 Philosophy

Selector is a personal-use photo culling tool. The test strategy prioritizes:

1. **Store/logic correctness** — Culling decisions must never be lost or corrupted
2. **Export reliability** — Files must be copied/moved correctly, never truncated or lost
3. **Session persistence** — Sessions must survive app restarts without data loss
4. **Input reliability** — Keyboard + controller inputs must always map to correct actions

UI tests and E2E tests are secondary — they are written for critical workflows only, not for cosmetic rendering.

### 1.2 Coverage Targets

| Test Category | Coverage Target | Rationale |
|---------------|----------------|-----------|
| **Zustand Stores** | 90%+ | Core business logic, state mutations |
| **Main Process Services** | 85%+ | File I/O, EXIF, export — bugs here cause data loss |
| **Utility Functions** | 95%+ | Pure functions, easy to test exhaustively |
| **React Components** | Key flows only | Focus on interaction, not rendering |
| **E2E / Playwright** | 3-5 critical paths | Happy paths only, save for manual edge cases |

### 1.3 What We Test vs. What We Don't

| ✅ We Test | ❌ We Don't Test |
|-----------|-----------------|
| Photo store state transitions | CSS styling / visual appearance |
| Flag/rate/color mutations | Animation timing |
| Filter logic correctness | Tailwind class names |
| Export file operations | Third-party library internals |
| Session save/load integrity | Electron window management |
| Keyboard shortcut mapping | GPU rendering behavior |
| Controller input mapping | ExifTool binary parsing |
| Sharpness algorithm accuracy | Better-sqlite3 engine |
| Image format detection | OS file system edge cases |

---

## 2. Testing Stack

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | Latest | Unit tests, integration tests, code coverage |
| **@testing-library/react** | Latest | Component rendering + interaction |
| **@testing-library/user-event** | Latest | Keyboard/mouse simulation |
| **Playwright** | Latest | E2E testing with Electron |
| **msw (Mock Service Worker)** | Latest | Mock IPC calls in renderer tests |
| **memfs** | Latest | Virtual filesystem for file operation tests |

### 2.1 Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/components/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/renderer/stores/**',
        'src/renderer/hooks/**',
        'src/renderer/lib/**',
        'src/renderer/workers/**',
        'src/main/services/**',
      ],
      thresholds: {
        'src/renderer/stores/': { statements: 90 },
        'src/main/services/': { statements: 85 },
        'src/renderer/lib/': { statements: 95 },
      }
    },
  },
});
```

---

## 3. Test Architecture

### 3.1 Directory Structure

```
tests/
├── setup.ts                           # Global test setup
├── helpers/
│   ├── mock-electron-api.ts           # Mock window.electronAPI
│   ├── mock-photo-factory.ts          # Generate test PhotoEntry objects
│   ├── mock-gamepad.ts                # Simulate Xbox controller state
│   └── test-utils.tsx                 # Custom render with Zustand providers
│
├── unit/
│   ├── stores/
│   │   ├── photo.store.test.ts        # Photo collection state
│   │   ├── filter.store.test.ts       # Filter logic
│   │   ├── shortcut.store.test.ts     # Keybinding management
│   │   ├── session.store.test.ts      # Session state
│   │   └── ui.store.test.ts           # UI state
│   ├── services/
│   │   ├── scanner.service.test.ts    # Directory scanning
│   │   ├── exiftool.service.test.ts   # EXIF extraction
│   │   ├── thumbnail.service.test.ts  # Thumbnail generation
│   │   ├── session.service.test.ts    # SQLite operations
│   │   └── export.service.test.ts     # Copy/move operations
│   ├── workers/
│   │   ├── histogram.worker.test.ts   # Histogram algorithm
│   │   └── sharpness.worker.test.ts   # Sharpness algorithm
│   └── lib/
│       ├── utils.test.ts              # Utility functions
│       ├── image-formats.test.ts      # Format detection
│       └── gamepad-mapping.test.ts    # Controller action mapping
│
├── components/
│   ├── LoupeView.test.tsx             # Image viewer interactions
│   ├── GridView.test.tsx              # Grid selection + navigation
│   ├── Filmstrip.test.tsx             # Filmstrip navigation
│   ├── TopBar.test.tsx                # View controls
│   ├── FilterPanel.test.tsx           # Filter UI
│   ├── ExifPanel.test.tsx             # EXIF display
│   ├── ShortcutOverlay.test.tsx       # Shortcut help display
│   ├── ExportDialog.test.tsx          # Export configuration
│   └── WelcomeScreen.test.tsx         # Initial screen
│
├── integration/
│   ├── culling-workflow.test.ts       # Full culling pipeline
│   ├── session-persistence.test.ts    # Save → close → reload → verify
│   ├── export-pipeline.test.ts        # Filter → export → verify files
│   ├── keyboard-shortcuts.test.ts     # All shortcuts end-to-end
│   └── controller-input.test.ts       # Xbox controller end-to-end
│
├── e2e/
│   ├── playwright.config.ts          # Playwright Electron config
│   ├── first-launch.spec.ts          # Fresh app → open folder → view photos
│   ├── culling-session.spec.ts       # Full culling → export → verify
│   └── session-restore.spec.ts       # Persist → restart → verify state
│
└── fixtures/
    ├── images/
    │   ├── test-photo-1.jpg           # 1024x768 JPEG with full EXIF
    │   ├── test-photo-2.jpg           # 800x600 JPEG, no EXIF
    │   ├── test-photo-blurry.jpg      # Intentionally blurry (for sharpness test)
    │   ├── test-photo-sharp.jpg       # Intentionally sharp (for sharpness test)
    │   ├── test-photo-corrupt.jpg     # Truncated file
    │   ├── test-raw-sony.arw          # Sony ARW sample (small)
    │   ├── test-raw-canon.cr2         # Canon CR2 sample (small)
    │   ├── test-raw-nikon.nef         # Nikon NEF sample (small)
    │   └── test-photo.png             # PNG format
    ├── sessions/
    │   ├── mock-session.json          # Pre-built session data
    │   └── mock-states.json           # Pre-built photo states
    └── exif/
        ├── full-exif.json             # Complete EXIF data fixture
        └── minimal-exif.json          # Minimal EXIF data fixture
```

### 3.2 Test Helpers

```typescript
// tests/helpers/mock-photo-factory.ts

import { PhotoEntry, FlagStatus, StarRating, ColorLabel } from '@/shared/types';

let counter = 0;

export function createMockPhoto(overrides?: Partial<PhotoEntry>): PhotoEntry {
  counter++;
  return {
    id: `photo-${counter}`,
    filePath: `C:/Photos/test-${counter}.jpg`,
    fileName: `test-${counter}.jpg`,
    fileSize: 1024000 + counter * 100,
    format: 'jpg',
    isRaw: false,
    flag: 'unflagged',
    rating: 0,
    colorLabel: 'none',
    exif: {
      cameraMake: 'Sony',
      cameraModel: 'A7III',
      lens: '24-70mm f/2.8 GM',
      focalLength: 50,
      aperture: 2.8,
      shutterSpeed: '1/200',
      iso: 400,
      dateTime: '2026-01-15T10:30:00',
      width: 6000,
      height: 4000,
      orientation: 1,
      gps: null,
      flash: false,
      whiteBalance: 'Auto',
      exposureCompensation: 0,
      meteringMode: 'Multi',
    },
    thumbnailPath: null,
    histogram: null,
    sharpnessScore: null,
    sharpnessComputed: false,
    ...overrides,
  };
}

export function createMockPhotos(count: number, overrides?: Partial<PhotoEntry>): PhotoEntry[] {
  return Array.from({ length: count }, () => createMockPhoto(overrides));
}

export function createMockRawPhoto(format: string = 'arw'): PhotoEntry {
  return createMockPhoto({
    fileName: `test-raw.${format}`,
    filePath: `C:/Photos/test-raw.${format}`,
    format: format as any,
    isRaw: true,
  });
}
```

```typescript
// tests/helpers/mock-gamepad.ts

export function createMockGamepad(overrides?: Partial<Gamepad>): Gamepad {
  return {
    id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
    index: 0,
    connected: true,
    mapping: 'standard',
    timestamp: performance.now(),
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    })),
    hapticActuators: [],
    vibrationActuator: null,
    ...overrides,
  } as Gamepad;
}

export function pressButton(gamepad: Gamepad, buttonIndex: number): Gamepad {
  const buttons = [...gamepad.buttons];
  buttons[buttonIndex] = { pressed: true, touched: true, value: 1 };
  return { ...gamepad, buttons } as Gamepad;
}

export function moveAxis(gamepad: Gamepad, axisIndex: number, value: number): Gamepad {
  const axes = [...gamepad.axes];
  axes[axisIndex] = value;
  return { ...gamepad, axes } as Gamepad;
}
```

---

## 4. Unit Tests

### 4.1 Photo Store Tests

```typescript
// tests/unit/stores/photo.store.test.ts

describe('PhotoStore', () => {
  
  // ── Initialization ──
  
  describe('initialization', () => {
    it('should start with empty photo collection', () => {
      const store = usePhotoStore.getState();
      expect(store.photos).toEqual([]);
      expect(store.currentIndex).toBe(0);
    });
  });

  // ── Photo Management ──

  describe('setPhotos', () => {
    it('should set photos and reset index to 0', () => {});
    it('should sort photos by filename', () => {});
    it('should handle empty array', () => {});
    it('should handle 1000+ photos without performance degradation', () => {});
  });

  // ── Flagging ──
  
  describe('flagging', () => {
    it('should flag photo as pick', () => {
      const store = usePhotoStore.getState();
      store.setPhotos(createMockPhotos(5));
      store.flagPhoto(0, 'pick');
      expect(store.photos[0].flag).toBe('pick');
    });

    it('should flag photo as reject', () => {});
    it('should unflag a previously flagged photo', () => {});
    it('should toggle flag: pick → unflagged when picking already-picked', () => {});
    it('should not mutate other photos when flagging one', () => {});
    it('should preserve flag when navigating away and back', () => {});
    
    it('should count picks correctly', () => {
      const store = usePhotoStore.getState();
      store.setPhotos(createMockPhotos(10));
      store.flagPhoto(0, 'pick');
      store.flagPhoto(1, 'pick');
      store.flagPhoto(2, 'reject');
      expect(store.getStats().picks).toBe(2);
      expect(store.getStats().rejects).toBe(1);
      expect(store.getStats().unflagged).toBe(7);
    });
  });

  // ── Rating ──

  describe('rating', () => {
    it('should set rating 1-5', () => {});
    it('should clear rating with 0', () => {});
    it('should toggle rating: same value clears', () => {});
    it('should not accept values outside 0-5', () => {});
    it('should preserve rating across navigation', () => {});
    it('should count rated photos correctly', () => {});
  });

  // ── Color Labels ──

  describe('colorLabel', () => {
    it('should set each color label', () => {});
    it('should clear color label with none', () => {});
    it('should toggle: same color clears', () => {});
    it('should only allow valid color values', () => {});
  });

  // ── Navigation ──

  describe('navigation', () => {
    it('should navigate to next photo', () => {});
    it('should not navigate past last photo', () => {});
    it('should navigate to previous photo', () => {});
    it('should not navigate before first photo', () => {});
    it('should jump to first photo', () => {});
    it('should jump to last photo', () => {});
    it('should navigate to specific index', () => {});
    it('should clamp index to valid range', () => {});
  });

  // ── Bulk Operations ──

  describe('bulk operations', () => {
    it('should flag all selected photos', () => {});
    it('should rate all selected photos', () => {});
    it('should clear all flags', () => {});
    it('should clear all ratings', () => {});
  });

  // ── Serialization ──

  describe('serialization', () => {
    it('should export photo states for session save', () => {
      const store = usePhotoStore.getState();
      store.setPhotos(createMockPhotos(3));
      store.flagPhoto(0, 'pick');
      store.ratePhoto(1, 4);
      
      const states = store.exportStates();
      expect(states).toHaveLength(3);
      expect(states[0].flag).toBe('pick');
      expect(states[1].rating).toBe(4);
    });

    it('should import photo states from session load', () => {});
    it('should handle missing photos gracefully (deleted from disk)', () => {});
  });
});
```

### 4.2 Filter Store Tests

```typescript
// tests/unit/stores/filter.store.test.ts

describe('FilterStore', () => {

  describe('flag filter', () => {
    it('should filter to picks only', () => {
      const photos = createMockPhotos(10);
      photos[0].flag = 'pick';
      photos[3].flag = 'pick';
      photos[5].flag = 'reject';
      
      const store = useFilterStore.getState();
      store.setFlagFilter(['pick']);
      
      const filtered = store.applyFilters(photos);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.flag === 'pick')).toBe(true);
    });

    it('should filter to rejects only', () => {});
    it('should filter to unflagged only', () => {});
    it('should combine picks + rejects (exclude unflagged)', () => {});
    it('should show all when no flag filter', () => {});
  });

  describe('rating filter', () => {
    it('should filter by minimum rating', () => {});
    it('should include exact match on minimum', () => {});
    it('should treat 0 as no filter', () => {});
    it('should combine with flag filter', () => {});
  });

  describe('color filter', () => {
    it('should filter by single color', () => {});
    it('should filter by multiple colors', () => {});
    it('should combine with flag + rating filters', () => {});
  });

  describe('combined filters', () => {
    it('should apply AND logic across all filter types', () => {
      // picks AND 3+ stars AND green label
      const photos = createMockPhotos(20);
      photos[0].flag = 'pick'; photos[0].rating = 4; photos[0].colorLabel = 'green';
      photos[1].flag = 'pick'; photos[1].rating = 5; photos[1].colorLabel = 'green';
      photos[2].flag = 'pick'; photos[2].rating = 4; photos[2].colorLabel = 'red';
      photos[3].flag = 'reject'; photos[3].rating = 5; photos[3].colorLabel = 'green';
      
      const store = useFilterStore.getState();
      store.setFlagFilter(['pick']);
      store.setMinRating(3);
      store.setColorFilter(['green']);
      
      const filtered = store.applyFilters(photos);
      expect(filtered).toHaveLength(2);
    });
    
    it('should return empty array when no photos match all filters', () => {});
  });

  describe('filter counts', () => {
    it('should compute correct counts for each flag', () => {});
    it('should compute correct counts for each rating', () => {});
    it('should compute correct counts for each color', () => {});
  });

  describe('clear filters', () => {
    it('should clear all filters at once', () => {});
    it('should clear individual filter types', () => {});
  });
});
```

### 4.3 Shortcut Store Tests

```typescript
// tests/unit/stores/shortcut.store.test.ts

describe('ShortcutStore', () => {

  describe('default bindings', () => {
    it('should load default keyboard bindings on init', () => {
      const store = useShortcutStore.getState();
      const binding = store.getBinding('flag.pick');
      expect(binding.keyboard).toBe('P');
    });

    it('should load default controller bindings on init', () => {
      const store = useShortcutStore.getState();
      const binding = store.getBinding('flag.pick');
      expect(binding.gamepad).toBe(0); // A button
    });

    it('should have all action IDs mapped', () => {
      const store = useShortcutStore.getState();
      const allActions = store.getAllActions();
      expect(allActions.length).toBeGreaterThan(25);
      allActions.forEach(action => {
        expect(store.getBinding(action)).toBeDefined();
      });
    });
  });

  describe('rebinding', () => {
    it('should rebind keyboard shortcut', () => {
      const store = useShortcutStore.getState();
      store.rebindKeyboard('flag.pick', 'F');
      expect(store.getBinding('flag.pick').keyboard).toBe('F');
    });

    it('should detect conflict when binding already-used key', () => {
      const store = useShortcutStore.getState();
      const conflict = store.checkConflict('keyboard', 'X'); // X is flag.reject
      expect(conflict).toBe('flag.reject');
    });

    it('should allow swapping conflicting bindings', () => {});
    it('should rebind controller button', () => {});
    it('should persist bindings to config', () => {});
  });

  describe('reset', () => {
    it('should reset all to defaults', () => {
      const store = useShortcutStore.getState();
      store.rebindKeyboard('flag.pick', 'F');
      store.resetToDefaults();
      expect(store.getBinding('flag.pick').keyboard).toBe('P');
    });

    it('should reset single binding to default', () => {});
  });

  describe('action resolution', () => {
    it('should resolve keyboard key to action ID', () => {
      const store = useShortcutStore.getState();
      expect(store.resolveKeyboard('P')).toBe('flag.pick');
      expect(store.resolveKeyboard('X')).toBe('flag.reject');
      expect(store.resolveKeyboard('ArrowRight')).toBe('nav.next');
    });

    it('should resolve controller button to action ID', () => {
      const store = useShortcutStore.getState();
      expect(store.resolveGamepadButton(0)).toBe('flag.pick');    // A
      expect(store.resolveGamepadButton(1)).toBe('flag.reject');  // B
    });

    it('should return null for unmapped keys', () => {
      const store = useShortcutStore.getState();
      expect(store.resolveKeyboard('Q')).toBeNull();
    });

    it('should handle modifier keys', () => {
      const store = useShortcutStore.getState();
      expect(store.resolveKeyboard('Ctrl+E')).toBe('export.open');
      expect(store.resolveKeyboard('Ctrl+S')).toBe('session.save');
    });
  });
});
```

### 4.4 Sharpness Algorithm Tests

```typescript
// tests/unit/workers/sharpness.worker.test.ts

describe('Sharpness Detection (Laplacian Variance)', () => {

  describe('algorithm correctness', () => {
    it('should return high score (>70) for sharp image', async () => {
      const sharpImageData = loadTestImageData('test-photo-sharp.jpg');
      const score = computeSharpness(sharpImageData);
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should return low score (<40) for blurry image', async () => {
      const blurryImageData = loadTestImageData('test-photo-blurry.jpg');
      const score = computeSharpness(blurryImageData);
      expect(score).toBeLessThanOrEqual(40);
    });

    it('should return score between 0-100', () => {
      // Test with various synthetic ImageData
      const results = [
        computeSharpness(createUniformImageData()),     // all same color
        computeSharpness(createNoiseImageData()),        // random noise
        computeSharpness(createEdgeImageData()),         // sharp edges
        computeSharpness(createGradientImageData()),     // smooth gradient
      ];
      results.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should be consistent: same image → same score', () => {
      const imageData = loadTestImageData('test-photo-1.jpg');
      const score1 = computeSharpness(imageData);
      const score2 = computeSharpness(imageData);
      expect(score1).toBe(score2);
    });
  });

  describe('accuracy validation', () => {
    /**
     * Accuracy target: ≥75%
     * 
     * Test with a curated set of 20 images:
     * - 10 known-sharp images (manually verified)
     * - 10 known-blurry images (manually verified)
     * 
     * The algorithm must correctly classify at least 15/20 (75%)
     */
    it('should achieve ≥75% accuracy on curated dataset', () => {
      const sharpImages = loadTestImages('sharp-set/');  // 10 images
      const blurryImages = loadTestImages('blurry-set/'); // 10 images
      
      let correct = 0;
      const threshold = 50; // midpoint threshold
      
      sharpImages.forEach(img => {
        if (computeSharpness(img) >= threshold) correct++;
      });
      
      blurryImages.forEach(img => {
        if (computeSharpness(img) < threshold) correct++;
      });
      
      const accuracy = correct / 20;
      expect(accuracy).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('performance', () => {
    it('should process 400px image in under 150ms', () => {
      const imageData = createSizedImageData(400, 267);
      const start = performance.now();
      computeSharpness(imageData);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(150);
    });

    it('should handle 1px image without crashing', () => {
      const imageData = createSizedImageData(1, 1);
      expect(() => computeSharpness(imageData)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle all-black image', () => {
      const imageData = createSolidImageData(0, 0, 0);
      const score = computeSharpness(imageData);
      expect(score).toBe(0);
    });

    it('should handle all-white image', () => {
      const imageData = createSolidImageData(255, 255, 255);
      const score = computeSharpness(imageData);
      expect(score).toBe(0);
    });
  });
});
```

### 4.5 Service Tests

```typescript
// tests/unit/services/export.service.test.ts

describe('ExportService', () => {

  describe('copy mode', () => {
    it('should copy files to destination folder', async () => {
      const files = [
        { path: 'C:/Photos/img1.jpg', name: 'img1.jpg' },
        { path: 'C:/Photos/img2.jpg', name: 'img2.jpg' },
      ];
      
      const result = await exportService.exportPhotos({
        mode: 'copy',
        filter: { flags: ['pick'], minRating: 0, colorLabels: [] },
        destination: 'C:/Export',
        preserveSubfolders: false,
        createSubfolder: false,
      }, files);
      
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      // Verify files exist in destination
    });

    it('should preserve original files after copy', () => {});
    it('should handle filename collisions (append number)', () => {});
    it('should create destination directory if not exists', () => {});
  });

  describe('move mode', () => {
    it('should move files (delete source after copy)', () => {});
    it('should not delete source if copy failed', () => {});
  });

  describe('subfolder creation', () => {
    it('should create "Picks" subfolder when configured', () => {});
    it('should create "Rejects" subfolder when configured', () => {});
    it('should preserve original subfolder structure', () => {});
  });

  describe('error handling', () => {
    it('should skip and log permission-denied files', () => {});
    it('should skip and log missing files', () => {});
    it('should report disk-full error', () => {});
    it('should continue after individual file failures', () => {});
    it('should return accurate error count and messages', () => {});
  });

  describe('progress reporting', () => {
    it('should emit progress events during export', () => {});
    it('should report current file name in progress', () => {});
    it('should be cancellable mid-export', () => {});
  });
});
```

```typescript
// tests/unit/services/session.service.test.ts

describe('SessionService', () => {

  describe('create', () => {
    it('should create new session with unique ID', () => {});
    it('should store folder path and name', () => {});
    it('should set timestamps', () => {});
  });

  describe('save', () => {
    it('should save all photo states', () => {});
    it('should update existing states (upsert)', () => {});
    it('should update session timestamp on save', () => {});
    it('should handle 1000 photos in under 200ms', () => {});
  });

  describe('load', () => {
    it('should load session metadata', () => {});
    it('should load all photo states for session', () => {});
    it('should return empty states for new session', () => {});
    it('should handle missing session ID gracefully', () => {});
  });

  describe('list', () => {
    it('should list all sessions ordered by updated_at desc', () => {});
    it('should include stats in listing', () => {});
  });

  describe('delete', () => {
    it('should delete session and all associated photo states', () => {});
    it('should not affect other sessions', () => {});
  });

  describe('auto-save', () => {
    it('should auto-save every 30 seconds when dirty', () => {});
    it('should not auto-save when nothing changed', () => {});
    it('should save on app close/beforeunload', () => {});
  });
});
```

### 4.6 Utility Tests

```typescript
// tests/unit/lib/image-formats.test.ts

describe('Image Format Detection', () => {

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
    it('should accept .dng (Adobe)', () => expect(isImageFile('photo.dng')).toBe(true));
    it('should accept .pef (Pentax)', () => expect(isImageFile('photo.pef')).toBe(true));
    it('should accept .srw (Samsung)', () => expect(isImageFile('photo.srw')).toBe(true));
    it('should accept .x3f (Sigma)', () => expect(isImageFile('photo.x3f')).toBe(true));
    it('should accept .3fr (Hasselblad)', () => expect(isImageFile('photo.3fr')).toBe(true));
    it('should accept .iiq (Phase One)', () => expect(isImageFile('photo.iiq')).toBe(true));
    
    // Non-image
    it('should reject .txt', () => expect(isImageFile('readme.txt')).toBe(false));
    it('should reject .mp4', () => expect(isImageFile('video.mp4')).toBe(false));
    it('should reject .psd', () => expect(isImageFile('design.psd')).toBe(false));
    
    // Edge cases
    it('should be case-insensitive', () => expect(isImageFile('PHOTO.JPG')).toBe(true));
    it('should handle files with no extension', () => expect(isImageFile('noext')).toBe(false));
    it('should handle files with dots in name', () => expect(isImageFile('my.photo.jpg')).toBe(true));
  });

  describe('isRawFormat', () => {
    it('should identify all RAW formats', () => {
      const rawExts = ['arw','cr2','cr3','nef','nrw','orf','rw2','raf','dng','pef','srw','x3f','3fr','rwl','iiq','erf','dcr','kdc','mrw','srf','sr2'];
      rawExts.forEach(ext => {
        expect(isRawFormat(ext)).toBe(true);
      });
    });

    it('should not identify standard formats as RAW', () => {
      ['jpg','jpeg','png','webp','tiff','bmp'].forEach(ext => {
        expect(isRawFormat(ext)).toBe(false);
      });
    });
  });
});
```

### 4.7 Gamepad Mapping Tests

```typescript
// tests/unit/lib/gamepad-mapping.test.ts

describe('Gamepad Mapping', () => {
  
  describe('button mapping', () => {
    it('should map A button (0) to flag.pick', () => {
      expect(resolveGamepadButton(0)).toBe('flag.pick');
    });

    it('should map B button (1) to flag.reject', () => {
      expect(resolveGamepadButton(1)).toBe('flag.reject');
    });

    it('should map all 17 buttons', () => {
      for (let i = 0; i < 17; i++) {
        const action = resolveGamepadButton(i);
        expect(action).toBeDefined();
        expect(typeof action).toBe('string');
      }
    });
  });

  describe('axis mapping', () => {
    it('should ignore values within deadzone (-0.15 to 0.15)', () => {
      expect(resolveAxis(0, 0.1)).toBeNull();
      expect(resolveAxis(0, -0.1)).toBeNull();
    });

    it('should detect left stick right movement', () => {
      expect(resolveAxis(0, 0.8)).toBe('nav.next');
    });

    it('should detect left stick left movement', () => {
      expect(resolveAxis(0, -0.8)).toBe('nav.prev');
    });
  });

  describe('debouncing', () => {
    it('should not fire same action within cooldown period', () => {
      const handler = createDebouncedHandler(200);
      const results: string[] = [];
      
      handler('flag.pick', () => results.push('pick'));
      handler('flag.pick', () => results.push('pick')); // within 200ms
      
      expect(results).toHaveLength(1);
    });

    it('should fire after cooldown expires', async () => {
      const handler = createDebouncedHandler(50);
      const results: string[] = [];
      
      handler('flag.pick', () => results.push('pick'));
      await sleep(60);
      handler('flag.pick', () => results.push('pick'));
      
      expect(results).toHaveLength(2);
    });

    it('should track cooldowns per-action independently', () => {
      const handler = createDebouncedHandler(200);
      const results: string[] = [];
      
      handler('flag.pick', () => results.push('pick'));
      handler('flag.reject', () => results.push('reject')); // different action
      
      expect(results).toHaveLength(2);
    });
  });
});
```

---

## 5. Component Tests

### 5.1 Critical Components

```typescript
// tests/components/LoupeView.test.tsx

describe('LoupeView', () => {
  it('should render image when URL is available', () => {
    render(<LoupeView imageUrl="/test.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/test.jpg');
  });

  it('should show loading state when URL is null', () => {
    render(<LoupeView imageUrl={null} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show pick badge when photo is picked', () => {
    render(<LoupeView imageUrl="/test.jpg" flag="pick" />);
    expect(screen.getByText('PICK')).toBeInTheDocument();
  });

  it('should show reject badge when photo is rejected', () => {
    render(<LoupeView imageUrl="/test.jpg" flag="reject" />);
    expect(screen.getByText('REJECT')).toBeInTheDocument();
  });

  it('should show star rating', () => {
    render(<LoupeView imageUrl="/test.jpg" rating={4} />);
    const stars = screen.getAllByTestId('star-filled');
    expect(stars).toHaveLength(4);
  });

  it('should activate zoom on mouse down', async () => {
    const { container } = render(<LoupeView imageUrl="/test.jpg" />);
    await userEvent.pointer({ target: container.firstChild!, keys: '[MouseLeft>]' });
    expect(container.querySelector('.zoom-active')).toBeInTheDocument();
  });
});
```

```typescript
// tests/components/ExportDialog.test.tsx

describe('ExportDialog', () => {
  it('should show photo count matching filter', () => {
    render(<ExportDialog photos={createMockPhotos(10)} />);
    expect(screen.getByText(/10 photos/i)).toBeInTheDocument();
  });

  it('should allow selecting export mode (copy/move)', () => {
    render(<ExportDialog photos={createMockPhotos(5)} />);
    const copyRadio = screen.getByLabelText(/copy/i);
    const moveRadio = screen.getByLabelText(/move/i);
    expect(copyRadio).toBeChecked();
    
    fireEvent.click(moveRadio);
    expect(moveRadio).toBeChecked();
  });

  it('should disable export button when no destination selected', () => {
    render(<ExportDialog photos={createMockPhotos(5)} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
  });

  it('should call onExport with correct options', async () => {
    const onExport = vi.fn();
    render(<ExportDialog photos={createMockPhotos(5)} onExport={onExport} />);
    
    // Select destination, click export
    // ...
    
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'copy',
      destination: expect.any(String),
    }));
  });

  it('should show progress bar during export', () => {});
  it('should show completion summary', () => {});
  it('should show error details for failed files', () => {});
});
```

---

## 6. Integration Tests

### 6.1 Culling Workflow

```typescript
// tests/integration/culling-workflow.test.ts

describe('Full Culling Workflow', () => {
  let store: ReturnType<typeof usePhotoStore.getState>;
  
  beforeEach(() => {
    store = usePhotoStore.getState();
    store.setPhotos(createMockPhotos(20));
  });

  it('should support complete pick → review → export flow', () => {
    // Step 1: Navigate and flag
    store.flagPhoto(0, 'pick');
    store.flagPhoto(1, 'reject');
    store.flagPhoto(2, 'pick');
    store.ratePhoto(0, 5);
    store.ratePhoto(2, 4);
    store.setColorLabel(0, 'green');
    
    // Step 2: Verify state
    expect(store.getStats()).toEqual({
      total: 20, picks: 2, rejects: 1, unflagged: 17,
      rated: 2, averageRating: expect.any(Number),
    });
    
    // Step 3: Filter to picks
    const filterStore = useFilterStore.getState();
    filterStore.setFlagFilter(['pick']);
    const picks = filterStore.applyFilters(store.photos);
    expect(picks).toHaveLength(2);
    
    // Step 4: Prepare export
    const exportPhotos = picks.map(p => ({ path: p.filePath, name: p.fileName }));
    expect(exportPhotos).toHaveLength(2);
    expect(exportPhotos[0].name).toBe(store.photos[0].fileName);
  });

  it('should handle rapid flagging without state corruption', () => {
    // Simulate rapid P, P, X, P, X, P sequence
    for (let i = 0; i < 20; i++) {
      const flag = i % 3 === 2 ? 'reject' : 'pick';
      store.flagPhoto(i, flag);
    }
    
    // Verify all flags are correctly set
    const stats = store.getStats();
    expect(stats.picks + stats.rejects + stats.unflagged).toBe(20);
  });
});
```

### 6.2 Keyboard Shortcut Integration

```typescript
// tests/integration/keyboard-shortcuts.test.ts

describe('Keyboard Shortcuts End-to-End', () => {
  
  it('should handle complete keyboard culling session', async () => {
    // Setup: render app with 10 photos
    const { container } = render(<TestApp photos={createMockPhotos(10)} />);
    
    // Press P → flag pick, advance
    await userEvent.keyboard('p');
    expect(getCurrentPhoto().flag).toBe('pick');
    expect(getCurrentIndex()).toBe(1);
    
    // Press X → flag reject, advance
    await userEvent.keyboard('x');
    expect(getPhotoAt(1).flag).toBe('reject');
    expect(getCurrentIndex()).toBe(2);
    
    // Press 5 → rate 5 stars
    await userEvent.keyboard('5');
    expect(getCurrentPhoto().rating).toBe(5);
    
    // Press 8 → green color label
    await userEvent.keyboard('8');
    expect(getCurrentPhoto().colorLabel).toBe('green');
    
    // Press G → switch to grid
    await userEvent.keyboard('g');
    expect(screen.getByTestId('grid-view')).toBeInTheDocument();
    
    // Press G → back to loupe
    await userEvent.keyboard('g');
    expect(screen.getByTestId('loupe-view')).toBeInTheDocument();
    
    // Press → → next photo
    await userEvent.keyboard('{ArrowRight}');
    expect(getCurrentIndex()).toBe(3);
    
    // Press ← → prev photo
    await userEvent.keyboard('{ArrowLeft}');
    expect(getCurrentIndex()).toBe(2);
    
    // Press ? → show shortcut overlay
    await userEvent.keyboard('?');
    expect(screen.getByTestId('shortcut-overlay')).toBeInTheDocument();
  });

  it('should prevent shortcuts when modal is open', () => {});
  it('should handle modifier combos (Ctrl+E, Ctrl+S)', () => {});
});
```

### 6.3 Controller Integration

```typescript
// tests/integration/controller-input.test.ts

describe('Xbox Controller End-to-End', () => {
  
  it('should detect controller connection', () => {
    const gamepad = createMockGamepad();
    window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad }));
    
    expect(screen.getByTestId('controller-indicator')).toBeInTheDocument();
  });

  it('should navigate with D-Pad', async () => {
    let gamepad = createMockGamepad();
    simulateGamepadConnection(gamepad);
    
    // Press D-Pad Right
    gamepad = pressButton(gamepad, 15);
    simulateGamepadPoll(gamepad);
    await waitFor(() => expect(getCurrentIndex()).toBe(1));
    
    // Press D-Pad Left
    gamepad = pressButton(gamepad, 14);
    simulateGamepadPoll(gamepad);
    await waitFor(() => expect(getCurrentIndex()).toBe(0));
  });

  it('should flag with A and B buttons', async () => {
    let gamepad = createMockGamepad();
    simulateGamepadConnection(gamepad);
    
    // Press A (flag pick)
    gamepad = pressButton(gamepad, 0);
    simulateGamepadPoll(gamepad);
    await waitFor(() => expect(getPhotoAt(0).flag).toBe('pick'));
    
    // Press B (flag reject)
    gamepad = pressButton(gamepad, 1);
    simulateGamepadPoll(gamepad);
    await waitFor(() => expect(getCurrentPhoto().flag).toBe('reject'));
  });

  it('should debounce rapid button presses', async () => {
    let gamepad = createMockGamepad();
    simulateGamepadConnection(gamepad);
    
    // Rapid A button presses (within 200ms)
    for (let i = 0; i < 5; i++) {
      gamepad = pressButton(gamepad, 0);
      simulateGamepadPoll(gamepad);
    }
    
    // Should only register once due to debounce
    await waitFor(() => {
      const stats = getStats();
      expect(stats.picks).toBe(1);
    });
  });

  it('should handle controller disconnect gracefully', () => {
    const gamepad = createMockGamepad();
    window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad }));
    window.dispatchEvent(new GamepadEvent('gamepaddisconnected', { gamepad }));
    
    expect(screen.queryByTestId('controller-indicator')).not.toBeInTheDocument();
    // Keyboard should still work
  });
});
```

---

## 7. E2E Tests

### 7.1 Playwright Configuration

```typescript
// tests/e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Playwright Electron launch
      },
    },
  ],
});
```

### 7.2 Critical E2E Scenarios

```typescript
// tests/e2e/first-launch.spec.ts

test('First launch → Open folder → View photos', async ({ electronApp }) => {
  const window = await electronApp.firstWindow();
  
  // Welcome screen visible
  await expect(window.getByText('Selector')).toBeVisible();
  await expect(window.getByRole('button', { name: /open folder/i })).toBeVisible();
  
  // Open folder (mock dialog)
  await electronApp.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: ['C:/TestPhotos'],
    });
  });
  
  await window.getByRole('button', { name: /open folder/i }).click();
  
  // Photos should appear
  await expect(window.getByTestId('photo-counter')).toContainText(/\d+ \/ \d+/);
  
  // First photo visible in loupe view
  await expect(window.getByTestId('loupe-image')).toBeVisible();
});
```

```typescript
// tests/e2e/culling-session.spec.ts

test('Full culling session → Export picks', async ({ electronApp }) => {
  const window = await electronApp.firstWindow();
  
  // Setup: Open folder with test photos
  await openTestFolder(electronApp, window);
  
  // Cull photos using keyboard
  await window.keyboard.press('p');  // Pick photo 1
  await window.keyboard.press('p');  // Pick photo 2
  await window.keyboard.press('x');  // Reject photo 3
  await window.keyboard.press('5');  // Rate photo 4 = 5 stars
  
  // Open export
  await window.keyboard.press('Control+e');
  await expect(window.getByTestId('export-dialog')).toBeVisible();
  
  // Configure and execute export
  await window.getByRole('button', { name: /export/i }).click();
  
  // Verify completion
  await expect(window.getByText(/export complete/i)).toBeVisible({ timeout: 10000 });
});
```

---

## 8. Performance Tests

### 8.1 Memory Tests

```typescript
// tests/integration/performance.test.ts

describe('Memory Performance', () => {
  
  it('should not leak object URLs on navigation', () => {
    const store = usePhotoStore.getState();
    store.setPhotos(createMockPhotos(100));
    
    const initialUrls = getAllActiveObjectUrls();
    
    // Navigate through all photos
    for (let i = 0; i < 100; i++) {
      store.navigateTo(i);
    }
    
    const finalUrls = getAllActiveObjectUrls();
    
    // Should not have more than MAX_CACHE_SIZE active URLs
    expect(finalUrls.length).toBeLessThanOrEqual(MAX_FULL_IMAGE_CACHE + MAX_THUMBNAIL_CACHE);
  });

  it('should evict LRU cache entries when exceeding limit', () => {
    const cache = createImageCache(5);
    
    // Add 10 items (5 should be evicted)
    for (let i = 0; i < 10; i++) {
      cache.set(`photo-${i}`, `url-${i}`);
    }
    
    expect(cache.size).toBe(5);
    expect(cache.has('photo-0')).toBe(false); // evicted
    expect(cache.has('photo-9')).toBe(true);  // most recent
  });
});
```

### 8.2 Load Tests

```typescript
describe('Load Performance', () => {
  
  it('should handle 1000 photos without UI freeze', async () => {
    const photos = createMockPhotos(1000);
    const start = performance.now();
    
    const store = usePhotoStore.getState();
    store.setPhotos(photos);
    
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100); // State update < 100ms
  });

  it('should filter 1000 photos in under 50ms', () => {
    const photos = createMockPhotos(1000);
    photos.forEach((p, i) => {
      p.flag = i % 3 === 0 ? 'pick' : i % 3 === 1 ? 'reject' : 'unflagged';
      p.rating = (i % 6) as StarRating;
    });
    
    const filterStore = useFilterStore.getState();
    filterStore.setFlagFilter(['pick']);
    filterStore.setMinRating(3);
    
    const start = performance.now();
    const filtered = filterStore.applyFilters(photos);
    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(50);
  });

  it('should serialize 1000 photo states in under 200ms', () => {
    const store = usePhotoStore.getState();
    store.setPhotos(createMockPhotos(1000));
    
    // Flag and rate some
    for (let i = 0; i < 500; i++) {
      store.flagPhoto(i, 'pick');
      store.ratePhoto(i, 3);
    }
    
    const start = performance.now();
    const states = store.exportStates();
    const elapsed = performance.now() - start;
    
    expect(states).toHaveLength(1000);
    expect(elapsed).toBeLessThan(200);
  });
});
```

---

## 9. Input Device Tests

### 9.1 Keyboard Test Matrix

| Shortcut | Action | Pre-condition | Expected State After |
|----------|--------|--------------|---------------------|
| `P` | Flag pick | Photo unflagged | flag='pick', index++ |
| `P` | Flag pick | Photo already picked | flag='unflagged' |
| `X` | Flag reject | Photo unflagged | flag='reject', index++ |
| `U` | Unflag | Photo picked | flag='unflagged' |
| `→` | Next | index=0, length=10 | index=1 |
| `→` | Next | index=9 (last) | index=9 (no change) |
| `←` | Prev | index=5 | index=4 |
| `←` | Prev | index=0 (first) | index=0 (no change) |
| `1`-`5` | Rate | rating=0 | rating=N |
| `0` | Clear | rating=3 | rating=0 |
| `6` | Red label | colorLabel='none' | colorLabel='red' |
| `G` | Grid toggle | viewMode='loupe' | viewMode='grid' |
| `Ctrl+E` | Export | photos loaded | Export dialog opens |
| `Ctrl+S` | Save | session active | Session saved |
| `?` | Help | overlay hidden | Shortcut overlay visible |

### 9.2 Xbox Controller Test Matrix

| Button | Action | Pre-condition | Expected State After |
|--------|--------|--------------|---------------------|
| A (0) | Flag pick | Photo unflagged | flag='pick', index++ |
| B (1) | Flag reject | Photo unflagged | flag='reject', index++ |
| X (2) | Unflag | Photo picked | flag='unflagged' |
| Y (3) | Grid toggle | viewMode='loupe' | viewMode='grid' |
| D-Right (15) | Next | index=0 | index=1 |
| D-Left (14) | Prev | index=5 | index=4 |
| D-Up (12) | Rate up | rating=3 | rating=4 |
| D-Down (13) | Rate down | rating=3 | rating=2 |
| D-Up (12) | Rate up | rating=5 | rating=5 (max) |
| D-Down (13) | Rate down | rating=0 | rating=0 (min) |
| LB (4) | Prev | index=5 | index=4 |
| RB (5) | Next | index=0 | index=1 |
| RT (7) | Color fwd | colorLabel='none' | colorLabel='red' |
| RT (7) | Color fwd | colorLabel='blue' | colorLabel='purple' |
| LT (6) | Color back | colorLabel='red' | colorLabel='none' |
| View (8) | Info panel | panel visible | panel hidden |
| Menu (9) | Export | — | Export dialog opens |

---

## 10. Test Data & Fixtures

### 10.1 Required Test Images

| File | Description | Size | Purpose |
|------|------------|------|---------|
| `test-photo-1.jpg` | Standard JPEG, full EXIF | ~200KB | General testing |
| `test-photo-2.jpg` | JPEG, no EXIF metadata | ~150KB | Missing EXIF handling |
| `test-photo-sharp.jpg` | Intentionally very sharp | ~200KB | Sharpness validation |
| `test-photo-blurry.jpg` | Intentionally blurry | ~200KB | Sharpness validation |
| `test-photo-corrupt.jpg` | Truncated/corrupt JPEG | ~50KB | Error handling |
| `test-raw-sony.arw` | Sony RAW sample | ~1MB | RAW preview extraction |
| `test-raw-canon.cr2` | Canon RAW sample | ~1MB | RAW preview extraction |
| `test-raw-nikon.nef` | Nikon RAW sample | ~1MB | RAW preview extraction |
| `test-photo.png` | PNG format | ~300KB | Multi-format support |
| `test-photo.webp` | WebP format | ~100KB | Multi-format support |

### 10.2 Curated Sharpness Dataset

For validating the ≥75% accuracy requirement:

```
tests/fixtures/sharpness/
├── sharp/
│   ├── portrait-sharp-1.jpg     # In-focus portrait
│   ├── landscape-sharp-1.jpg    # Landscape with detail
│   ├── macro-sharp-1.jpg        # Macro with sharp focus
│   ├── street-sharp-1.jpg       # Street photo, sharp
│   ├── sports-sharp-1.jpg       # Action, frozen motion
│   ├── portrait-sharp-2.jpg
│   ├── landscape-sharp-2.jpg
│   ├── product-sharp-1.jpg
│   ├── architecture-sharp-1.jpg
│   └── wildlife-sharp-1.jpg
│
└── blurry/
    ├── portrait-blur-motion.jpg   # Motion blur
    ├── portrait-blur-focus.jpg    # Out of focus
    ├── landscape-blur-shake.jpg   # Camera shake
    ├── street-blur-motion.jpg     # Subject motion blur
    ├── sports-blur-slow.jpg       # Slow shutter action
    ├── macro-blur-miss.jpg        # Missed focus on macro
    ├── portrait-blur-soft.jpg     # Soft/defocused
    ├── night-blur-hand.jpg        # Handheld night shot
    ├── interior-blur-iso.jpg      # High ISO noise + blur
    └── wildlife-blur-moving.jpg   # Moving animal, blurred
```

---

## 11. CI/CD Integration

### 11.1 npm Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit",
    "test:components": "vitest run tests/components",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test",
    "lint": "tsc --noEmit"
  }
}
```

### 11.2 Pre-commit Checks

```bash
# Run before committing:
npm run lint          # TypeScript type check
npm run test:unit     # Unit tests only (fast)
```

### 11.3 Full CI Pipeline

```bash
# Run in CI:
npm run lint
npm run test:coverage  # All Vitest tests + coverage report
npm run test:e2e       # Playwright E2E (requires display)
npm run build          # Verify production build
```

---

## 12. Appendix: Test Matrix

### Complete Test Count Estimate

| Category | Test File Count | Estimated Tests | Priority |
|----------|----------------|-----------------|----------|
| Store Unit Tests | 5 files | ~120 tests | 🔴 Critical |
| Service Unit Tests | 5 files | ~80 tests | 🔴 Critical |
| Worker Unit Tests | 2 files | ~20 tests | 🟡 High |
| Utility Unit Tests | 3 files | ~50 tests | 🟡 High |
| Component Tests | 9 files | ~60 tests | 🟢 Medium |
| Integration Tests | 5 files | ~30 tests | 🔴 Critical |
| E2E Tests | 3 files | ~10 tests | 🟢 Medium |
| **Total** | **32 files** | **~370 tests** | |

### Test Execution Time Targets

| Suite | Target Time | Actual (TBD) |
|-------|-------------|-------------|
| Unit Tests | < 10s | — |
| Component Tests | < 15s | — |
| Integration Tests | < 20s | — |
| E2E Tests | < 60s | — |
| **Total** | **< 2 min** | — |
