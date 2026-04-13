// ═══════════════════════════════════════════
// Selector — Constants
// App-wide magic numbers and defaults
// ═══════════════════════════════════════════

// ── Thumbnail cache ──
export const THUMB_MAX_SIZE = 400;           // Max thumbnail dimension (px)
export const THUMB_CACHE_MAX = 2000;         // Max cached thumbnails
export const THUMB_QUALITY = 80;             // JPEG quality

// ── Auto-save ──
export const AUTO_SAVE_INTERVAL_MS = 30_000; // 30 seconds

// ── Gamepad ──
export const GAMEPAD_DEADZONE = 0.15;
export const GAMEPAD_BUTTON_COOLDOWN_MS = 200;
export const GAMEPAD_AXIS_COOLDOWN_MS = 300;

// ── Image Cache ──
export const IMAGE_CACHE_MAX = 20;           // Max images in LRU cache

// ── Grid ──
export const GRID_MIN_COLUMNS = 2;
export const GRID_MAX_COLUMNS = 8;
export const GRID_DEFAULT_COLUMNS = 4;

// ── Zoom ──
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;

// ── Toast ──
export const TOAST_DURATION_MS = 2500;

// ── EXIF batch ──
export const EXIF_BATCH_CHUNK_SIZE = 10;

// ── Export ──
export const EXPORT_YIELD_INTERVAL = 10;     // Yield to event loop every N files

// ── Filmstrip ──
export const FILMSTRIP_THUMB_WIDTH = 100;
export const FILMSTRIP_THUMB_HEIGHT = 64;

// ── Sharpness ──
export const SHARPNESS_MIN = 0;
export const SHARPNESS_MAX = 100;
export const SHARPNESS_ACCURACY_TARGET = 0.75; // 75%
