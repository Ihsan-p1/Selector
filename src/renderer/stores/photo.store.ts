import { create } from 'zustand';
import type { PhotoEntry, FlagStatus, StarRating, ColorLabel, PhotoState, SessionStats } from '@/shared/types';
import { createEmptyExif } from '@/shared/types';

interface PhotoStore {
  photos: PhotoEntry[];
  currentIndex: number;
  selectedIndices: Set<number>;

  // Actions
  setPhotos: (photos: PhotoEntry[]) => void;
  setCurrentIndex: (index: number) => void;
  navigateNext: () => void;
  navigatePrev: () => void;
  navigateFirst: () => void;
  navigateLast: () => void;

  // Culling
  flagPhoto: (index: number, flag: FlagStatus) => void;
  ratePhoto: (index: number, rating: StarRating) => void;
  setColorLabel: (index: number, color: ColorLabel) => void;
  updatePhoto: (index: number, updates: Partial<PhotoEntry>) => void;

  // Selection (grid)
  toggleSelect: (index: number) => void;
  selectRange: (from: number, to: number) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Bulk operations
  flagSelected: (flag: FlagStatus) => void;
  rateSelected: (rating: StarRating) => void;

  // Session serialization
  exportStates: () => PhotoState[];
  importStates: (states: PhotoState[]) => void;

  // Stats
  getStats: () => SessionStats;

  // Current photo helper
  getCurrentPhoto: () => PhotoEntry | null;
}

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  photos: [],
  currentIndex: 0,
  selectedIndices: new Set(),

  setPhotos: (photos) => set({
    photos,
    currentIndex: 0,
    selectedIndices: new Set(),
  }),

  setCurrentIndex: (index) => {
    const { photos } = get();
    const clamped = Math.max(0, Math.min(photos.length - 1, index));
    set({ currentIndex: clamped });
  },

  navigateNext: () => {
    const { currentIndex, photos } = get();
    if (currentIndex < photos.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  navigatePrev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  navigateFirst: () => set({ currentIndex: 0 }),

  navigateLast: () => {
    const { photos } = get();
    set({ currentIndex: Math.max(0, photos.length - 1) });
  },

  flagPhoto: (index, flag) => {
    const { photos } = get();
    if (index < 0 || index >= photos.length) return;
    const updated = [...photos];
    // Toggle: if same flag, unflag
    updated[index] = {
      ...updated[index],
      flag: updated[index].flag === flag ? 'unflagged' : flag,
    };
    set({ photos: updated });
  },

  ratePhoto: (index, rating) => {
    const { photos } = get();
    if (index < 0 || index >= photos.length) return;
    const updated = [...photos];
    // Toggle: if same rating, clear
    updated[index] = {
      ...updated[index],
      rating: updated[index].rating === rating ? 0 : rating,
    };
    set({ photos: updated });
  },

  setColorLabel: (index, color) => {
    const { photos } = get();
    if (index < 0 || index >= photos.length) return;
    const updated = [...photos];
    // Toggle: if same color, clear
    updated[index] = {
      ...updated[index],
      colorLabel: updated[index].colorLabel === color ? 'none' : color,
    };
    set({ photos: updated });
  },

  updatePhoto: (index, updates) => {
    const { photos } = get();
    if (index < 0 || index >= photos.length) return;
    const updated = [...photos];
    updated[index] = { ...updated[index], ...updates };
    set({ photos: updated });
  },

  toggleSelect: (index) => {
    const { selectedIndices } = get();
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    set({ selectedIndices: next });
  },

  selectRange: (from, to) => {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const next = new Set<number>();
    for (let i = start; i <= end; i++) next.add(i);
    set({ selectedIndices: next });
  },

  selectAll: () => {
    const { photos } = get();
    const next = new Set<number>();
    photos.forEach((_, i) => next.add(i));
    set({ selectedIndices: next });
  },

  clearSelection: () => set({ selectedIndices: new Set() }),

  flagSelected: (flag) => {
    const { photos, selectedIndices } = get();
    if (selectedIndices.size === 0) return;
    const updated = [...photos];
    selectedIndices.forEach(i => {
      if (i >= 0 && i < updated.length) {
        updated[i] = { ...updated[i], flag };
      }
    });
    set({ photos: updated });
  },

  rateSelected: (rating) => {
    const { photos, selectedIndices } = get();
    if (selectedIndices.size === 0) return;
    const updated = [...photos];
    selectedIndices.forEach(i => {
      if (i >= 0 && i < updated.length) {
        updated[i] = { ...updated[i], rating };
      }
    });
    set({ photos: updated });
  },

  exportStates: () => {
    const { photos } = get();
    return photos.map(p => ({
      id: p.id,
      flag: p.flag,
      rating: p.rating,
      colorLabel: p.colorLabel,
    }));
  },

  importStates: (states) => {
    const { photos } = get();
    const stateMap = new Map(states.map(s => [s.id, s]));
    const updated = photos.map(p => {
      const state = stateMap.get(p.id);
      if (state) {
        return { ...p, flag: state.flag, rating: state.rating, colorLabel: state.colorLabel };
      }
      return p;
    });
    set({ photos: updated });
  },

  getStats: () => {
    const { photos } = get();
    const picks = photos.filter(p => p.flag === 'pick').length;
    const rejects = photos.filter(p => p.flag === 'reject').length;
    const rated = photos.filter(p => p.rating > 0).length;
    const totalRating = photos.reduce((sum, p) => sum + p.rating, 0);
    return {
      total: photos.length,
      picks,
      rejects,
      unflagged: photos.length - picks - rejects,
      rated,
      averageRating: rated > 0 ? totalRating / rated : 0,
    };
  },

  getCurrentPhoto: () => {
    const { photos, currentIndex } = get();
    return photos[currentIndex] ?? null;
  },
}));
