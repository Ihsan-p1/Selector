# Selector

![Selector Icon](./build/icon.png)

**Fast, keyboard-driven photo culling for photographers.**

Selector is a high-performance Windows desktop application designed to make sorting through massive folders of photos quick, intuitive, and memory-efficient. Built natively for offline use, it allows you to flag picks, reject bad shots, rate with stars, and export — all without touching the mouse.

---

## 🎯 Design Goals

Based on our [Software Design Document (SDD)](./docs/SDD.md), Selector is built around four core pillars:
1. **Speed & Stability**: Navigate 1,000+ photos with zero perceptible lag. Built with a multi-process Electron architecture and Web Workers to offload heavy computations.
2. **Memory Efficiency**: Strict memory management utilizing LRU caches and standardizing on a target footprint of <500MB during active sessions.
3. **Universal Format Support**: Support for standard formats (JPEG, PNG, WebP) plus **20+ RAW formats** (Sony ARW, Canon CR2/CR3, Nikon NEF, Fujifilm RAF, and more) natively via ExifTool.
4. **Offline-First Privacy**: Operates entirely locally. No cloud sync, no tracking, pure desktop performance.

---

## ✨ Features

- **Blazing Fast RAW Previews** — Extracts embedded raw previews via `exiftool-vendored` instead of relying on heavy native parsing libraries like `sharp` (avoiding ABI mismatch errors).
- **Intelligent Sharpness Detection** — Custom Laplacian Variance algorithm running in an `OffscreenCanvas` Web Worker scores focus quality (0-100) instantly without freezing the UI.
- **Accurate RGB Histogram** — Real-time R/G/B channel distribution computed off-thread on photo selection.
- **Advanced Culling State** — Pick/Reject flags, 1-5 Star Ratings, and 5 Color Labels.
- **Hardware Controller Support** — Full mapping for Xbox Controllers via the W3C Gamepad API (with 60fps polling, deadzone handling, and debouncing).
- **Session Persistence** — Built-in local SQLite database (`better-sqlite3`) utilizing WAL mode for instantaneous, transparent auto-saves.
- **Smart Export Engine** — Filter by flags/ratings/colors and safely copy/move to destination folders featuring conflict resolution and per-file error recovery.

---

## 🚀 Quick Start

Ensure you are running **Node.js 20+** and **npm**.

```bash
# Clone the repository and install dependencies
npm install

# Start the development server with Hot Module Replacement (HMR)
npm run dev

# Run the Vitest test suite (138 tests passing)
npm test

# Build the production executable for Windows
npm run build
```

---

## 🏗 Architecture & Tech Stack

Selector utilizes a robust **3-process Electron Architecture**:

- **Main Process (Node.js)**: Manages OS-level interactions, the ExifTool singleton pool, SQLite session transactions, thumbnail caching, and the async Export engine.
- **Preload (Context Bridge)**: Exposes a secure, typed IPC contract to the frontend.
- **Renderer (React 19 + TypeScript)**: Powered by `electron-vite`, `Zustand` for state management, and `TailwindCSS v4` for UI styling.

```
src/
├── main/           # Main Process (File I/O, IPC Handlers, Services)
├── preload/        # Secure inter-process communication bridge
├── renderer/       # Chromium Frontend (UI, Stores, Hooks, Workers)
└── shared/         # Shared TypeScript definitions and format enums
```

---

## 🎮 Input Controls

Selector is built to be manipulated entirely without a mouse. Mappings are handled reactively by the `shortcut.store.ts`.

### Keyboard Layout
| Key | Action | Key | Action |
|-----|--------|-----|--------|
| `P` | Flag as Pick | `→` / `←` | Next / Previous Image |
| `X` | Flag as Reject | `G` | Toggle Grid/Loupe View |
| `U` | Remove Flag | `F` | Toggle Filmstrip |
| `1-5` | Toggle Star Rating | `I` | Toggle Right Info Panel |
| `0` | Clear Rating | `L` | Toggle Left Filter Panel |
| `6-9`, `-` | Apply Color Labels | `Ctrl+E` | Open Export Dialog |
| `?` | Show Shortcut Help | `Space` | Toggle Fullscreen |

### Xbox Controller (Supported natively)
| Xbox Input | Action |
|------------|--------|
| **A / B / X** | Pick / Reject / Unflag |
| **D-Pad ← / →** | Previous / Next Image |
| **D-Pad ↑ / ↓** | Increase / Decrease Star Rating |
| **Y** | Toggle Grid View / Loupe View |
| **Menu Button** | Export Selected Photos |

---

## 🧪 Testing Strategy (TDD)

Per the [Test-Driven Development Plan (TDD)](./docs/TDD.md), selector prioritizes business logic, data persistence, and input reliability over pure cosmetic component rendering.

- **Status**: **138/138 tests passing** across 8 test suites (execution time <1s).
- **Framework**: Powered by `Vitest`.
- **Coverage Areas**: 
  - `photo.store.ts`: State management and array manipulation (32 tests)
  - `filter.store.ts`: Flag/rating/color filtering queries and combination edge-cases (13 tests)
  - `shortcut.store.ts`: Gamepad and keyboard cross-mapping, conflict detections (17 tests)
  - `session.store.ts`: Session lifecycle, dirty tracking, save/restore state (8 tests)
  - `ui.store.ts`: View modes, panel toggles, zoom/grid clamping, toasts (16 tests)
  - `image-formats.ts`: Format detection, RAW brand identification, MIME types (34 tests)
  - `utils.ts`: Class merging, file size formatting, ID generation (14 tests)
  - **Integration**: Full culling workflow — import → flag → rate → filter → session restore (4 tests)

To run tests in watch mode:
```bash
npm run test:watch
```

---

## 📅 Roadmap & Implementation Phases

All required fundamental phases have been finalized:
- [x] **Phase 1 & 2**: Core Electron + Vite Architecture setup, split stores, basic IPC pipeline.
- [x] **Phase 3**: Data Pipeline — EXIF extraction, Thumbnail Caching, off-thread Histogram & Sharpness Web Workers.
- [x] **Phase 4**: UI/UX Upgrades — Glassmorphism dark theme, Shortcut Overlays, Status bar diagnostics.
- [x] **Phase 5-7**: SQLite Session Persistence, Async Export Engine, and Vitest suite finalization.
- [x] **Phase 8**: Final icon asset generation and production build validation.
