# Selector — Software Design Document (SDD)

**Version:** 1.0  
**Date:** April 11, 2026  
**Author:** Development Team  
**Status:** Draft — Pending Approval

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Architecture Design](#3-architecture-design)
4. [Data Design](#4-data-design)
5. [Component Design](#5-component-design)
6. [Interface Design](#6-interface-design)
7. [Input Control Design](#7-input-control-design)
8. [Performance & Memory Design](#8-performance--memory-design)
9. [Error Handling Design](#9-error-handling-design)
10. [Security Considerations](#10-security-considerations)
11. [Appendix](#11-appendix)

---

## 1. Introduction

### 1.1 Purpose

This Software Design Document describes the architecture, components, interfaces, and data design of **Selector** — a local-first, keyboard-driven photo culling and sorting desktop application for Windows.

### 1.2 Scope

Selector enables photographers to rapidly triage large sets of photos using intuitive keyboard shortcuts and optional Xbox controller input. The application runs entirely offline with zero cloud dependency, supporting all major image formats including RAW files from every major camera manufacturer.

### 1.3 Definitions & Acronyms

| Term | Definition |
|------|-----------|
| **Culling** | The process of selecting the best photos from a set and rejecting the rest |
| **Flag** | A pick/reject/unflagged status assigned to a photo |
| **Loupe View** | Full-screen single image viewing mode |
| **Filmstrip** | Horizontal strip of thumbnail previews at the bottom |
| **EXIF** | Exchangeable Image File Format — metadata embedded in photos |
| **IPC** | Inter-Process Communication between Electron processes |
| **RAW** | Unprocessed image data directly from camera sensor |

### 1.4 Design Goals

1. **Speed**: Navigate 1000+ photos with zero perceptible lag
2. **Memory Efficiency**: Stay under 500MB RAM for typical sessions (100-500 photos), never exceed 1GB
3. **Stability**: Zero crashes, zero "Not Responding" states
4. **Intuitive Controls**: Keyboard shortcuts learnable in under 5 minutes
5. **Universal Format Support**: Handle every RAW format from every major camera
6. **Offline-First**: No internet required, ever

---

## 2. System Overview

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        Windows OS                                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Selector App                             │  │
│  │                                                             │  │
│  │  ┌─────────────┐   IPC Bridge   ┌───────────────────────┐  │  │
│  │  │ Main Process │◄─────────────►│  Renderer Process     │  │  │
│  │  │ (Node.js)    │               │  (Chromium + React)    │  │  │
│  │  │              │               │                        │  │  │
│  │  │ • File I/O   │               │  • UI Components       │  │  │
│  │  │ • ExifTool   │               │  • State Management    │  │  │
│  │  │ • Thumbnails │               │  • Image Viewer        │  │  │
│  │  │ • Export     │               │  • Keyboard Shortcuts  │  │  │
│  │  │ • Sessions   │               │  • Gamepad Controller  │  │  │
│  │  │ • Sharpness  │               │  • Canvas Processing   │  │  │
│  │  └─────────────┘               └───────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Photo    │  │ Session  │  │ Thumb    │  │ Config   │        │
│  │ Folders  │  │ Database │  │ Cache    │  │ Files    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Desktop Shell | Electron | 33+ | Mature ecosystem, Chromium-based |
| Build System | electron-vite | Latest | Unified Vite config for main/preload/renderer |
| Frontend | React + TypeScript | 19.x / 5.8 | Already established in prototype |
| Styling | TailwindCSS | v4 | Already established, rapid development |
| State Management | Zustand | 5.x | Lightweight, TypeScript-first |
| EXIF + RAW Preview | exiftool-vendored | Latest | Full RAW format support, embedded JPEG extraction |
| EXIF (fast/fallback) | exifr | Latest | Fast metadata-only parsing for standard formats |
| Image Processing | Canvas API + OffscreenCanvas | Web Standard | Histograms, sharpness — no native rebuild issues |
| Sharpness Detection | Custom Laplacian Variance | — | ≥75% accuracy, zero external dependencies |
| Persistence | better-sqlite3 | Latest | Embedded, fast session database |
| Animations | Framer Motion | Latest | Already partially installed as `motion` |
| Icons | Lucide React | Latest | Already in use |
| Controller Input | Web Gamepad API | W3C Standard | Native Xbox controller support |
| Packaging | electron-builder | Latest | NSIS installer for Windows |

### 2.3 Why Not sharp?

> **Decision**: We intentionally avoid `sharp` in this project.

`sharp` is a native Node.js module that requires `electron-rebuild` every time the Electron version changes. This creates:
- Build fragility on Windows
- CI/CD complexity
- Potential runtime crashes from ABI mismatch

**Alternatives used instead:**
- **Thumbnails**: `exiftool-vendored` extracts embedded JPEG previews from RAW; `nativeImage.createThumbnailFromPath()` for standard formats
- **Histograms**: Canvas API `getImageData()` in OffscreenCanvas Web Worker
- **Sharpness**: Custom Laplacian variance computed via Canvas API in Web Worker

---

## 3. Architecture Design

### 3.1 Process Architecture

Electron enforces a multi-process architecture. Selector uses this effectively:

```
┌──────────────────────────────────────────────────────┐
│                    Main Process                       │
│                                                       │
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │  Window Manager  │  │  IPC Handler Registry     │   │
│  │  • BrowserWindow │  │  • file:open-folder       │   │
│  │  • Lifecycle     │  │  • file:scan-directory    │   │
│  │  • Tray (future) │  │  • exif:get-metadata      │   │
│  └─────────────────┘  │  • exif:extract-preview   │   │
│                        │  • export:copy-files      │   │
│  ┌─────────────────┐  │  • session:save           │   │
│  │  Services        │  │  • session:load           │   │
│  │  • ExifTool Pool │  │  • session:list           │   │
│  │  • Session DB    │  │  • app:get-version        │   │
│  │  • File Scanner  │  └──────────────────────────┘   │
│  │  • Export Engine │                                  │
│  └─────────────────┘                                  │
└──────────────────────────────────────────────────────┘
            │ contextBridge (preload.ts)
            ▼
┌──────────────────────────────────────────────────────┐
│                   Renderer Process                    │
│                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ React App  │  │ Zustand    │  │ Web Workers    │  │
│  │            │  │ Stores     │  │                │  │
│  │ Components │◄►│ • photo    │  │ • histogram    │  │
│  │ • Viewer   │  │ • ui       │  │ • sharpness    │  │
│  │ • Grid     │  │ • filter   │  │                │  │
│  │ • Panels   │  │ • shortcut │  └────────────────┘  │
│  │ • Controls │  │ • session  │                       │
│  └────────────┘  └────────────┘  ┌────────────────┐  │
│                                   │ Input Engines  │  │
│  ┌──────────────────┐            │ • Keyboard     │  │
│  │ Image Cache      │            │ • Gamepad      │  │
│  │ • LRU Map        │            └────────────────┘  │
│  │ • Object URL mgmt│                                │
│  └──────────────────┘                                │
└──────────────────────────────────────────────────────┘
```

### 3.2 Data Flow — Photo Import

```
User clicks "Open Folder"
    │
    ▼
Renderer: invoke IPC "file:open-folder"
    │
    ▼
Main: Show native folder dialog (dialog.showOpenDialog)
    │
    ▼
Main: Scan directory recursively for image files
    │ (filter by extension: jpg, jpeg, png, webp, tiff,
    │  arw, cr2, cr3, nef, orf, rw2, raf, dng, pef, srw, etc.)
    │
    ▼
Main: Return file list to renderer (paths + basic stats)
    │
    ▼
Renderer: Store in photo.store → render Grid/Loupe
    │
    ├──► Background: Request EXIF for visible photos (IPC batch)
    │         │
    │         ▼
    │    Main: exiftool-vendored parses metadata
    │         │
    │         ▼
    │    Renderer: Update photo entries with real EXIF
    │
    ├──► Background: Request thumbnails for visible photos
    │         │
    │         ▼
    │    Main: Extract embedded JPEG (RAW) or resize (JPEG/PNG)
    │         │
    │         ▼
    │    Renderer: Cache thumbnail URLs, render in grid
    │
    └──► On photo select: Compute histogram + sharpness (Web Worker)
```

### 3.3 Data Flow — Culling Workflow

```
User presses "P" (Pick)
    │
    ▼
Keyboard/Gamepad Engine captures input
    │
    ▼
Shortcut Store resolves action: "flag-pick"
    │
    ▼
Photo Store: updatePhoto(currentId, { flag: 'pick' })
    │
    ├──► UI Toast: "✓ Flagged as Pick"
    ├──► Auto-advance to next photo
    └──► Session auto-save timer reset

User presses "→" (Next)
    │
    ▼
Photo Store: setCurrentIndex(current + 1)
    │
    ├──► Preload next N thumbnails
    ├──► Request EXIF for new photo
    └──► Compute histogram + sharpness in Web Worker
```

### 3.4 Data Flow — Export

```
User presses Ctrl+E or clicks Export
    │
    ▼
Export Dialog opens (filter selection, destination picker)
    │
    ▼
User configures: picks only → target folder → copy mode
    │
    ▼
Renderer: invoke IPC "export:copy-files" with options
    │
    ▼
Main Process:
    ├──► Validate destination folder (writable, enough space)
    ├──► For each file matching filter:
    │       • Copy (or move) file to destination
    │       • Report progress via IPC event
    │       • Handle errors per-file (skip + log)
    └──► Return summary { copied: N, failed: N, skipped: N }
    │
    ▼
Renderer: Show completion dialog with summary
```

---

## 4. Data Design

### 4.1 Core Types

```typescript
// ═══════════════════════════════════════════
// shared/types.ts — Shared across processes
// ═══════════════════════════════════════════

/** Supported image file extensions */
type ImageFormat = 
  // Standard
  | 'jpg' | 'jpeg' | 'png' | 'webp' | 'tiff' | 'bmp'
  // RAW Formats
  | 'arw'   // Sony
  | 'cr2'   // Canon (older)
  | 'cr3'   // Canon (newer)
  | 'nef'   // Nikon
  | 'nrw'   // Nikon (compact)
  | 'orf'   // Olympus / OM System
  | 'rw2'   // Panasonic / Lumix
  | 'raf'   // Fujifilm
  | 'dng'   // Adobe / Leica / others
  | 'pef'   // Pentax
  | 'srw'   // Samsung
  | 'x3f'   // Sigma
  | 'erf'   // Epson
  | '3fr'   // Hasselblad
  | 'rwl'   // Leica
  | 'iiq';  // Phase One

type FlagStatus = 'pick' | 'reject' | 'unflagged';
type StarRating = 0 | 1 | 2 | 3 | 4 | 5;
type ColorLabel = 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'none';

interface PhotoEntry {
  /** Unique ID — SHA-256 hash of absolute file path */
  id: string;
  /** Absolute file path on disk */
  filePath: string;
  /** Display filename */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** File extension (lowercase, no dot) */
  format: ImageFormat;
  /** Whether this is a RAW format */
  isRaw: boolean;
  
  // ── Culling State ──
  flag: FlagStatus;
  rating: StarRating;
  colorLabel: ColorLabel;
  
  // ── EXIF Metadata (populated async after import) ──
  exif: ExifData;
  
  // ── Computed Data ──
  /** Path to cached thumbnail file */
  thumbnailPath: string | null;
  /** Histogram data [R[256], G[256], B[256]] */
  histogram: [number[], number[], number[]] | null;
  /** Sharpness score 0-100 (Laplacian variance) */
  sharpnessScore: number | null;
  /** Whether sharpness computation is complete */
  sharpnessComputed: boolean;
}

interface ExifData {
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  focalLength: number | null;       // mm
  aperture: number | null;          // f-number
  shutterSpeed: string | null;      // e.g. "1/200"
  iso: number | null;
  dateTime: string | null;          // ISO 8601
  width: number | null;             // pixels
  height: number | null;            // pixels
  orientation: number | null;       // EXIF orientation tag
  gps: { lat: number; lng: number } | null;
  flash: boolean | null;
  whiteBalance: string | null;
  exposureCompensation: number | null;
  meteringMode: string | null;
}

interface Session {
  id: string;                       // UUID v4
  name: string;                     // User-given or folder name
  folderPath: string;               // Source folder
  createdAt: string;                // ISO 8601
  updatedAt: string;                // ISO 8601
  photoCount: number;
  stats: SessionStats;
}

interface SessionStats {
  total: number;
  picks: number;
  rejects: number;
  unflagged: number;
  rated: number;                    // photos with rating > 0
  averageRating: number;
}

interface PhotoState {
  /** Photo ID → culling state only (for session save) */
  id: string;
  flag: FlagStatus;
  rating: StarRating;
  colorLabel: ColorLabel;
}

interface ExportOptions {
  mode: 'copy' | 'move';
  filter: ExportFilter;
  destination: string;
  preserveSubfolders: boolean;
  createSubfolder: boolean;         // e.g. "Picks", "Rejects"
}

interface ExportFilter {
  flags: FlagStatus[];              // e.g. ['pick']
  minRating: StarRating;            // 0 = no filter
  colorLabels: ColorLabel[];        // empty = no filter
}

interface ExportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: { file: string; error: string }[];
}
```

### 4.2 Session Database Schema (SQLite)

```sql
-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  folder_path  TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  photo_count  INTEGER DEFAULT 0
);

-- Photo states (culling decisions)
CREATE TABLE IF NOT EXISTS photo_states (
  id           TEXT PRIMARY KEY,         -- SHA-256 of file path
  session_id   TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  flag         TEXT DEFAULT 'unflagged', -- pick | reject | unflagged
  rating       INTEGER DEFAULT 0,       -- 0-5
  color_label  TEXT DEFAULT 'none',      -- red|yellow|green|blue|purple|none
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_photo_session ON photo_states(session_id);
CREATE INDEX IF NOT EXISTS idx_photo_flag ON photo_states(flag);
CREATE INDEX IF NOT EXISTS idx_photo_rating ON photo_states(rating);

-- App settings
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 4.3 Thumbnail Cache Strategy

```
%APPDATA%/Selector/
├── sessions.db              # SQLite database
├── cache/
│   └── thumbnails/
│       ├── {photo-id-hash}.jpg    # 400px longest-edge JPEG
│       └── ...
├── config/
│   ├── shortcuts.json       # Custom keybindings
│   └── preferences.json     # App preferences
└── logs/
    └── selector.log         # Error log
```

**Thumbnail Specs:**
- Format: JPEG, quality 80
- Size: 400px on longest edge (preserving aspect ratio)
- RAW files: Extract embedded `JpgFromRaw` or `PreviewImage` via ExifTool
- Standard files: Resize using `nativeImage.resize()`
- Cache key: First 16 chars of SHA-256(filePath + fileSize + lastModified)
- Eviction: LRU with max 2000 cached thumbnails (~200MB max)

---

## 5. Component Design

### 5.1 Directory Structure

```
src/
├── main/                              # Electron main process
│   ├── index.ts                       # Entry: create window, register IPC
│   ├── preload.ts                     # Context bridge definitions
│   ├── ipc/
│   │   ├── index.ts                   # Register all handlers
│   │   ├── file.ipc.ts                # Folder open, directory scan
│   │   ├── exif.ipc.ts                # EXIF extraction, preview extraction
│   │   ├── export.ipc.ts              # Copy/move operations
│   │   └── session.ipc.ts             # CRUD session operations
│   └── services/
│       ├── scanner.service.ts         # Recursive directory scanner
│       ├── exiftool.service.ts        # ExifTool wrapper (singleton pool)
│       ├── thumbnail.service.ts       # Thumbnail generation & caching
│       ├── session.service.ts         # SQLite session operations
│       └── export.service.ts          # File copy/move with progress
│
├── renderer/                          # React frontend
│   ├── App.tsx                        # Root component with providers
│   ├── main.tsx                       # React DOM mount
│   ├── index.css                      # TailwindCSS imports + globals
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx           # Main 3-column layout
│   │   │   ├── TopBar.tsx             # Toolbar with view/export controls
│   │   │   ├── LeftPanel.tsx          # Folder info + filter sidebar
│   │   │   ├── RightPanel.tsx         # EXIF + histogram sidebar
│   │   │   └── StatusBar.tsx          # Bottom status info
│   │   │
│   │   ├── viewer/
│   │   │   ├── LoupeView.tsx          # Full image viewer with zoom
│   │   │   ├── GridView.tsx           # Virtual-scrolled thumbnail grid
│   │   │   ├── CompareView.tsx        # Side-by-side 2-photo compare
│   │   │   └── Filmstrip.tsx          # Bottom thumbnail strip
│   │   │
│   │   ├── photo/
│   │   │   ├── PhotoCard.tsx          # Grid cell with overlays
│   │   │   ├── FlagBadge.tsx          # Pick/Reject badge
│   │   │   ├── RatingStars.tsx        # Interactive star rating
│   │   │   └── ColorDot.tsx           # Color label dot
│   │   │
│   │   ├── panels/
│   │   │   ├── ExifPanel.tsx          # EXIF metadata table
│   │   │   ├── HistogramPanel.tsx     # RGB histogram (Canvas)
│   │   │   ├── SharpnessPanel.tsx     # Sharpness score meter
│   │   │   ├── FilterPanel.tsx        # Filter controls
│   │   │   └── ShortcutOverlay.tsx    # Full-screen shortcut guide
│   │   │
│   │   ├── dialogs/
│   │   │   ├── ExportDialog.tsx       # Export configuration modal
│   │   │   ├── SessionDialog.tsx      # Session management modal
│   │   │   ├── SettingsDialog.tsx     # App settings + shortcuts
│   │   │   └── WelcomeScreen.tsx      # First-launch / no-session screen
│   │   │
│   │   └── common/
│   │       ├── Button.tsx             
│   │       ├── Tooltip.tsx            
│   │       ├── Modal.tsx              
│   │       ├── Toast.tsx              # Action feedback toast
│   │       ├── ProgressBar.tsx        
│   │       ├── Kbd.tsx                # Keyboard key visual
│   │       └── Spinner.tsx            
│   │
│   ├── stores/
│   │   ├── photo.store.ts             # Photo collection + culling state
│   │   ├── ui.store.ts                # UI state (panels, view mode, zoom)
│   │   ├── filter.store.ts            # Active filter state
│   │   ├── shortcut.store.ts          # Keybinding configuration
│   │   └── session.store.ts           # Session management
│   │
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts    # Global keyboard listener
│   │   ├── useGamepad.ts              # Xbox controller polling
│   │   ├── useImageCache.ts           # LRU image URL cache
│   │   ├── usePhotoNavigation.ts      # Navigation with preloading
│   │   ├── useVirtualGrid.ts          # Virtual scrolling for grid
│   │   └── useAutoSave.ts             # Session auto-save timer
│   │
│   ├── workers/
│   │   ├── histogram.worker.ts        # OffscreenCanvas histogram computation
│   │   └── sharpness.worker.ts        # Laplacian variance sharpness scoring
│   │
│   ├── lib/
│   │   ├── utils.ts                   # cn(), formatFileSize(), etc.
│   │   ├── constants.ts               # Magic numbers, defaults
│   │   ├── image-formats.ts           # Format detection + categorization
│   │   └── gamepad-mapping.ts         # Xbox button → action mapping
│   │
│   └── types/
│       └── electron.d.ts              # Window.electronAPI types
│
└── shared/
    └── types.ts                       # Types used in both processes
```

### 5.2 Component Interaction Diagram

```
┌──────────────────────────────────────────────────────┐
│                     AppShell                          │
│  ┌──────────┬──────────────────────┬──────────────┐  │
│  │          │       TopBar         │              │  │
│  │          ├──────────────────────┤              │  │
│  │          │                      │              │  │
│  │  Left    │   LoupeView          │   Right      │  │
│  │  Panel   │   ─── OR ───         │   Panel      │  │
│  │          │   GridView           │              │  │
│  │  • Folder│   ─── OR ───         │  • EXIF      │  │
│  │  • Filter│   CompareView        │  • Histogram │  │
│  │          │                      │  • Sharpness │  │
│  │          ├──────────────────────┤  • Shortcuts │  │
│  │          │     Filmstrip        │              │  │
│  └──────────┴──────────────────────┴──────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │                  StatusBar                      │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌──── Overlays ────┐  ┌──── Modals ───────────────┐ │
│  │ ShortcutOverlay  │  │ ExportDialog              │ │
│  │ Toast            │  │ SessionDialog             │ │
│  └──────────────────┘  │ SettingsDialog            │ │
│                         └──────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 5.3 Key Component Specifications

#### LoupeView
- Renders full-resolution image (loaded from disk via IPC)
- Click-and-drag zoom (2x magnification)
- Scroll wheel zoom (1x → 4x range)
- Double-click to toggle fit/100%
- Shows flag badge, rating, color label as overlays
- Smooth crossfade transition between photos (CSS transition on opacity)

#### GridView  
- **Virtual scrolling** via `useVirtualGrid` hook — only renders visible rows
- Configurable columns: 3, 4, 5, 6, 8
- Multi-select with Ctrl+Click and Shift+Click
- Hover shows filename tooltip
- Click selects, double-click opens in Loupe
- Each cell: PhotoCard with FlagBadge + RatingStars + ColorDot overlays

#### Filmstrip
- Auto-centers on active photo via `scrollIntoView({ behavior: 'smooth' })`
- Click to navigate
- Shows color label stripe on bottom edge
- Shows small flag dot on top-left corner
- Thumbnail size: 100px wide, 64px tall

---

## 6. Interface Design

### 6.1 IPC Contract (Main ↔ Renderer)

#### File Operations

```typescript
// ── Open Folder ──
invoke('file:open-folder'): Promise<string | null>
// Returns: selected folder path, or null if cancelled

// ── Scan Directory ──
invoke('file:scan-directory', folderPath: string): Promise<FileInfo[]>
interface FileInfo {
  path: string;
  name: string;
  size: number;
  extension: string;
  isRaw: boolean;
  lastModified: string;
}

// ── Get Full Image ──
invoke('file:read-image', filePath: string): Promise<string>
// Returns: data URL (base64) or file:// protocol URL
```

#### EXIF Operations

```typescript
// ── Get Metadata ──
invoke('exif:get-metadata', filePath: string): Promise<ExifData>

// ── Get Metadata Batch ──
invoke('exif:get-metadata-batch', filePaths: string[]): Promise<Map<string, ExifData>>

// ── Extract RAW Preview ──
invoke('exif:extract-preview', filePath: string, outputPath: string): Promise<string>
// Returns: path to extracted JPEG preview
```

#### Thumbnail Operations

```typescript
// ── Get Thumbnail ──
invoke('thumbnail:get', photoId: string, filePath: string): Promise<string>
// Returns: path to cached thumbnail (generates if not cached)

// ── Get Thumbnail Batch ──
invoke('thumbnail:get-batch', photos: { id: string, path: string }[]): Promise<Map<string, string>>
```

#### Session Operations

```typescript
invoke('session:create', name: string, folderPath: string): Promise<string>       // returns session ID
invoke('session:save', sessionId: string, photoStates: PhotoState[]): Promise<void>
invoke('session:load', sessionId: string): Promise<{ session: Session, states: PhotoState[] }>
invoke('session:list'): Promise<Session[]>
invoke('session:delete', sessionId: string): Promise<void>
```

#### Export Operations

```typescript
invoke('export:start', options: ExportOptions, photos: { path: string, name: string }[]): Promise<ExportResult>

// Progress events (main → renderer)
on('export:progress', callback: (data: { current: number, total: number, fileName: string }) => void)
```

### 6.2 Preload / Context Bridge API

```typescript
// preload.ts — exposed to renderer as window.electronAPI
const electronAPI = {
  // File operations
  openFolder: () => ipcRenderer.invoke('file:open-folder'),
  scanDirectory: (path: string) => ipcRenderer.invoke('file:scan-directory', path),
  readImage: (path: string) => ipcRenderer.invoke('file:read-image', path),
  
  // EXIF operations
  getExif: (path: string) => ipcRenderer.invoke('exif:get-metadata', path),
  getExifBatch: (paths: string[]) => ipcRenderer.invoke('exif:get-metadata-batch', paths),
  extractPreview: (raw: string, out: string) => ipcRenderer.invoke('exif:extract-preview', raw, out),
  
  // Thumbnail operations
  getThumbnail: (id: string, path: string) => ipcRenderer.invoke('thumbnail:get', id, path),
  getThumbnailBatch: (photos: any[]) => ipcRenderer.invoke('thumbnail:get-batch', photos),
  
  // Session operations
  createSession: (name: string, folder: string) => ipcRenderer.invoke('session:create', name, folder),
  saveSession: (id: string, states: any[]) => ipcRenderer.invoke('session:save', id, states),
  loadSession: (id: string) => ipcRenderer.invoke('session:load', id),
  listSessions: () => ipcRenderer.invoke('session:list'),
  deleteSession: (id: string) => ipcRenderer.invoke('session:delete', id),
  
  // Export operations
  exportPhotos: (opts: any, photos: any[]) => ipcRenderer.invoke('export:start', opts, photos),
  onExportProgress: (cb: Function) => ipcRenderer.on('export:progress', (_, data) => cb(data)),
  
  // App
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  chooseDirectory: () => ipcRenderer.invoke('dialog:choose-directory'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

---

## 7. Input Control Design

### 7.1 Keyboard Shortcuts

All keyboard shortcuts are managed by the `ShortcutStore` and processed by the `useKeyboardShortcuts` hook. Shortcuts are customizable and persisted to `shortcuts.json`.

#### Default Keyboard Bindings

| Key | Action ID | Description | Category |
|-----|-----------|-------------|----------|
| `→` | `nav.next` | Next photo | Navigation |
| `←` | `nav.prev` | Previous photo | Navigation |
| `Home` | `nav.first` | First photo | Navigation |
| `End` | `nav.last` | Last photo | Navigation |
| `P` | `flag.pick` | Flag as Pick + advance | Flagging |
| `X` | `flag.reject` | Flag as Reject + advance | Flagging |
| `U` | `flag.unflag` | Remove flag | Flagging |
| `1` | `rate.1` | Rate 1 star | Rating |
| `2` | `rate.2` | Rate 2 stars | Rating |
| `3` | `rate.3` | Rate 3 stars | Rating |
| `4` | `rate.4` | Rate 4 stars | Rating |
| `5` | `rate.5` | Rate 5 stars | Rating |
| `0` | `rate.clear` | Clear rating | Rating |
| `6` | `color.red` | Red label | Color Label |
| `7` | `color.yellow` | Yellow label | Color Label |
| `8` | `color.green` | Green label | Color Label |
| `9` | `color.blue` | Blue label | Color Label |
| `-` | `color.purple` | Purple label | Color Label |
| `Backspace` | `color.clear` | Clear color label | Color Label |
| `G` | `view.grid` | Toggle Grid / Loupe | View |
| `C` | `view.compare` | Compare mode | View |
| `F` | `view.fit` | Fit image to screen | View |
| `Z` | `view.zoom100` | Toggle 100% zoom | View |
| `Space` | `view.fullscreen` | Toggle fullscreen | View |
| `Tab` | `panel.filmstrip` | Toggle filmstrip | Panels |
| `I` | `panel.info` | Toggle right panel | Panels |
| `L` | `panel.library` | Toggle left panel | Panels |
| `?` | `help.shortcuts` | Show shortcut overlay | Help |
| `Ctrl+E` | `export.open` | Open export dialog | Export |
| `Ctrl+S` | `session.save` | Save session | Session |
| `Ctrl+A` | `select.all` | Select all (grid) | Selection |
| `Ctrl+Shift+P` | `filter.picks` | Show picks only | Filter |
| `Ctrl+Shift+X` | `filter.rejects` | Show rejects only | Filter |
| `Ctrl+Shift+A` | `filter.all` | Show all | Filter |
| `Delete` | `photo.remove` | Remove from collection | Manage |

### 7.2 Xbox Controller Mapping

The Gamepad API (W3C standard) is used to poll Xbox controller state at 60fps via `requestAnimationFrame`. Button presses are debounced (200ms cooldown) to prevent rapid-fire unintended actions.

#### Default Xbox Controller Bindings

| Xbox Button | Button Index | Action ID | Description |
|-------------|-------------|-----------|-------------|
| **D-Pad Right** | 15 | `nav.next` | Next photo |
| **D-Pad Left** | 14 | `nav.prev` | Previous photo |
| **D-Pad Up** | 12 | `rate.up` | Increase rating by 1 |
| **D-Pad Down** | 13 | `rate.down` | Decrease rating by 1 |
| **A Button** | 0 | `flag.pick` | Flag as Pick + advance |
| **B Button** | 1 | `flag.reject` | Flag as Reject + advance |
| **X Button** | 2 | `flag.unflag` | Remove flag |
| **Y Button** | 3 | `view.grid` | Toggle Grid / Loupe |
| **LB (Left Bumper)** | 4 | `nav.prev` | Previous photo (alt) |
| **RB (Right Bumper)** | 5 | `nav.next` | Next photo (alt) |
| **LT (Left Trigger)** | 6 | `color.cycle-back` | Cycle color label backward |
| **RT (Right Trigger)** | 7 | `color.cycle-fwd` | Cycle color label forward |
| **View Button** | 8 | `panel.info` | Toggle info panel |
| **Menu Button** | 9 | `export.open` | Open export dialog |
| **Left Stick Press** | 10 | `view.fit` | Fit to screen |
| **Right Stick Press** | 11 | `view.zoom100` | Toggle 100% zoom |
| **Left Stick X/Y** | axes[0,1] | `zoom.pan` | Pan when zoomed in |
| **Right Stick X** | axes[2] | `filmstrip.scroll` | Scroll filmstrip |

#### Gamepad Engine Architecture

```typescript
// lib/gamepad-mapping.ts

interface GamepadAction {
  actionId: string;
  type: 'press' | 'axis';
  buttonIndex?: number;
  axisIndex?: number;
  axisDirection?: 'positive' | 'negative';
  /** Minimum axis value to trigger (deadzone) */
  threshold?: number;
}

const DEADZONE = 0.15;
const BUTTON_COOLDOWN = 200; // ms

// useGamepad.ts hook
// - Polls navigator.getGamepads() every frame
// - Detects button press (wasReleased → isPressed transition)
// - Applies deadzone to analog sticks
// - Routes to shortcut.store action handler
// - Shows controller icon in StatusBar when connected
```

#### Controller Visual Feedback

When an Xbox controller is connected:
1. A controller icon (🎮) appears in the StatusBar
2. On-screen button prompts switch from keyboard icons to Xbox button icons
3. The shortcut overlay shows both keyboard and controller bindings side-by-side

---

## 8. Performance & Memory Design

### 8.1 Memory Budget

| Component | Budget | Strategy |
|-----------|--------|----------|
| Electron Shell | ~120MB | Fixed overhead |
| React + UI | ~50MB | Keep component tree lean |
| Image Cache (thumbnails) | ~100MB max | LRU cache, 200 thumbnails × 500KB |
| Full Image (loupe) | ~50MB max | Only 1 full-res image in memory |
| EXIF data | ~20MB | ~20KB per photo × 1000 photos |
| SQLite | ~10MB | Embedded, low overhead |
| Web Workers | ~30MB | 2 workers (histogram + sharpness) |
| ExifTool | ~50MB | Singleton process, reused |
| **Total Target** | **<500MB** | For typical 500-photo session |

### 8.2 Performance Strategies

#### Image Loading
```
Priority Queue:
  1. Current photo (full resolution) — loaded immediately
  2. Next/prev photo (full resolution) — preloaded
  3. Visible grid thumbnails — loaded by intersection observer
  4. Filmstrip thumbnails — loaded in view order

Smart Preloading:
  - Preload N+1 and N-1 full images when navigating
  - Cancel preload if user navigates away before completion
  - Use AbortController for cancellable fetch/IPC calls
```

#### Virtual Scrolling (Grid View)
- Only render rows that are within viewport + 2 rows buffer
- Each row: fixed height based on column count
- Overscan: 2 rows above + 2 rows below viewport
- Recycle DOM elements when scrolling

#### Background Processing
- EXIF: Batch request in chunks of 20 (don't overwhelm ExifTool)
- Thumbnails: Generate on-demand, cache to disk
- Histogram: Compute in OffscreenCanvas Web Worker, only for current photo
- Sharpness: Compute in separate Web Worker, only for current photo

#### Memory Cleanup
```typescript
// Image URL lifecycle:
// 1. createObjectURL() when entering cache
// 2. revokeObjectURL() when evicting from cache
// 3. LRU eviction when cache exceeds MAX_CACHE_SIZE
// 4. Full cleanup on folder close / app exit

const MAX_THUMBNAIL_CACHE = 200;   // ~100MB
const MAX_FULL_IMAGE_CACHE = 3;    // current + prev + next
const CACHE_CLEANUP_INTERVAL = 30; // seconds
```

### 8.3 Preventing "Not Responding"

| Cause | Mitigation |
|-------|-----------|
| Large folder scan | Run in main process, stream results via IPC events |
| EXIF parsing | Batch processing with progress, never block renderer |
| Histogram | OffscreenCanvas in Web Worker |
| Sharpness | Separate Web Worker |
| Export (many files) | Async copy with progress events, cancellable |
| Memory pressure | LRU cache eviction, aggressive cleanup |
| UI jank | Virtual scrolling, CSS `will-change`, `requestAnimationFrame` |
| Startup | Show UI immediately, load data progressively |

### 8.4 Startup Performance

```
Target: UI visible in < 1 second
Target: First photo visible in < 2 seconds after folder select

Startup sequence:
  0ms    → Electron window created, show splash/welcome
  200ms  → React hydration complete
  300ms  → Welcome screen interactive
  500ms  → (User selects folder)
  800ms  → Directory scan begins (show progress skeleton)
  1200ms → First batch of file entries received
  1500ms → First thumbnails rendered in grid
  2000ms → EXIF data begins streaming in
```

---

## 9. Error Handling Design

### 9.1 Error Categories

| Category | Examples | User Impact | Recovery |
|----------|---------|-------------|----------|
| **File Access** | Permission denied, file moved/deleted | Show warning badge | Skip file, continue |
| **EXIF Parse** | Corrupt metadata, unknown format | Show "No EXIF" | Display available data |
| **RAW Preview** | No embedded JPEG in RAW | Show placeholder | Fallback to ExifTool thumbnail tag |
| **Thumbnail** | Generation fails | Show placeholder icon | Retry on next view |
| **Export** | Disk full, permission denied | Show error per-file | Skip + log, continue others |
| **Session DB** | Corrupt database | Show error dialog | Auto-backup, create new DB |
| **Controller** | Disconnected mid-session | Show toast | Revert to keyboard |

### 9.2 Error Reporting

- All errors logged to `%APPDATA%/Selector/logs/selector.log`
- Log rotation: max 5 files × 5MB each
- User-facing errors shown as non-blocking toasts (auto-dismiss 5s)
- Critical errors (DB corruption, crash) shown as modal dialogs

---

## 10. Security Considerations

### 10.1 Context Isolation

- `contextIsolation: true` — always
- `nodeIntegration: false` — renderer cannot access Node.js
- All file operations go through preload context bridge
- No `eval()`, no dynamic code execution
- No remote code loading (no CDN scripts)

### 10.2 File Access

- Only access files within user-selected folders
- No automatic indexing of system files
- Export only to user-selected destinations
- File paths sanitized before any operation

### 10.3 Data Privacy

- Zero telemetry, zero analytics
- No network requests
- All data stored locally in `%APPDATA%/Selector/`
- Session data is not encrypted (local-only, user responsibility)

---

## 11. Appendix

### 11.1 Supported RAW Formats (Comprehensive)

| Format | Camera Brand | Extension |
|--------|-------------|-----------|
| Sony Alpha RAW | Sony | `.arw` |
| Canon RAW 2 | Canon | `.cr2` |
| Canon RAW 3 | Canon | `.cr3` |
| Nikon Electronic Format | Nikon | `.nef` |
| Nikon RAW (compact) | Nikon | `.nrw` |
| Olympus RAW | Olympus / OM System | `.orf` |
| Panasonic RAW | Panasonic / Lumix | `.rw2` |
| Fujifilm RAW | Fujifilm | `.raf` |
| Digital Negative | Adobe / Leica / many | `.dng` |
| Pentax RAW | Pentax / Ricoh | `.pef` |
| Samsung RAW | Samsung | `.srw` |
| Sigma X3 Format | Sigma | `.x3f` |
| Epson RAW | Epson | `.erf` |
| Hasselblad RAW | Hasselblad | `.3fr` |
| Leica RAW | Leica | `.rwl` |
| Phase One RAW | Phase One | `.iiq` |
| Kodak RAW | Kodak | `.dcr`, `.kdc` |
| Minolta RAW | Minolta / Konica | `.mrw` |
| Sony RAW (older) | Sony | `.srf`, `.sr2` |

### 11.2 Performance Benchmarks (Target)

| Operation | Target | Measured On |
|-----------|--------|-------------|
| App startup to interactive | < 1s | i5-12400, 16GB RAM |
| Open folder (1000 JPEGs) | < 3s | SSD |
| Navigate next photo | < 100ms | Preloaded |
| Flag + advance | < 50ms | In-memory operation |
| Generate 1 thumbnail | < 200ms | JPEG, SSD |
| Extract RAW preview | < 500ms | ExifTool |
| Compute histogram | < 100ms | 400px thumbnail via Worker |
| Compute sharpness | < 150ms | 400px thumbnail via Worker |
| Export 100 picks | < 30s | SSD → SSD copy |
| Session save | < 200ms | SQLite write |
