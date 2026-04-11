import { create } from 'zustand';

type ViewMode = 'loupe' | 'grid' | 'compare';

interface UIStore {
  viewMode: ViewMode;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  showFilmstrip: boolean;
  showShortcutOverlay: boolean;
  gridColumns: number;
  zoomLevel: number; // 1 = fit, 2 = 200%, etc.
  isFullscreen: boolean;

  // Toast
  toastMessage: string | null;
  toastType: 'success' | 'info' | 'warning' | 'error';

  // Actions
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleFilmstrip: () => void;
  toggleShortcutOverlay: () => void;
  setGridColumns: (cols: number) => void;
  setZoomLevel: (level: number) => void;
  toggleFullscreen: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  clearToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUIStore = create<UIStore>((set, get) => ({
  viewMode: 'loupe',
  showLeftPanel: true,
  showRightPanel: true,
  showFilmstrip: true,
  showShortcutOverlay: false,
  gridColumns: 4,
  zoomLevel: 1,
  isFullscreen: false,
  toastMessage: null,
  toastType: 'info',

  setViewMode: (mode) => set({ viewMode: mode }),

  toggleViewMode: () => {
    const { viewMode } = get();
    set({ viewMode: viewMode === 'loupe' ? 'grid' : 'loupe' });
  },

  toggleLeftPanel: () => set(s => ({ showLeftPanel: !s.showLeftPanel })),
  toggleRightPanel: () => set(s => ({ showRightPanel: !s.showRightPanel })),
  toggleFilmstrip: () => set(s => ({ showFilmstrip: !s.showFilmstrip })),
  toggleShortcutOverlay: () => set(s => ({ showShortcutOverlay: !s.showShortcutOverlay })),

  setGridColumns: (cols) => set({ gridColumns: Math.max(2, Math.min(8, cols)) }),

  setZoomLevel: (level) => set({ zoomLevel: Math.max(1, Math.min(4, level)) }),

  toggleFullscreen: () => set(s => ({ isFullscreen: !s.isFullscreen })),

  showToast: (message, type = 'success') => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: message, toastType: type });
    toastTimer = setTimeout(() => {
      set({ toastMessage: null });
      toastTimer = null;
    }, 2500);
  },

  clearToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: null });
    toastTimer = null;
  },
}));
