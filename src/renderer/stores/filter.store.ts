import { create } from 'zustand';
import type { PhotoEntry, FlagStatus, StarRating, ColorLabel } from '@/shared/types';

interface FilterStore {
  flagFilter: FlagStatus[];
  minRating: StarRating;
  colorFilter: ColorLabel[];

  // Actions
  setFlagFilter: (flags: FlagStatus[]) => void;
  toggleFlagFilter: (flag: FlagStatus) => void;
  setMinRating: (rating: StarRating) => void;
  setColorFilter: (colors: ColorLabel[]) => void;
  toggleColorFilter: (color: ColorLabel) => void;
  clearAllFilters: () => void;
  hasActiveFilters: () => boolean;

  // Apply
  applyFilters: (photos: PhotoEntry[]) => PhotoEntry[];

  // Counts
  getCounts: (photos: PhotoEntry[]) => FilterCounts;
}

interface FilterCounts {
  picks: number;
  rejects: number;
  unflagged: number;
  rated: number;
  byRating: Record<number, number>;
  byColor: Record<string, number>;
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  flagFilter: [],
  minRating: 0,
  colorFilter: [],

  setFlagFilter: (flags) => set({ flagFilter: flags }),

  toggleFlagFilter: (flag) => {
    const { flagFilter } = get();
    if (flagFilter.includes(flag)) {
      set({ flagFilter: flagFilter.filter(f => f !== flag) });
    } else {
      set({ flagFilter: [...flagFilter, flag] });
    }
  },

  setMinRating: (rating) => set({ minRating: rating }),

  setColorFilter: (colors) => set({ colorFilter: colors }),

  toggleColorFilter: (color) => {
    const { colorFilter } = get();
    if (colorFilter.includes(color)) {
      set({ colorFilter: colorFilter.filter(c => c !== color) });
    } else {
      set({ colorFilter: [...colorFilter, color] });
    }
  },

  clearAllFilters: () => set({
    flagFilter: [],
    minRating: 0,
    colorFilter: [],
  }),

  hasActiveFilters: () => {
    const { flagFilter, minRating, colorFilter } = get();
    return flagFilter.length > 0 || minRating > 0 || colorFilter.length > 0;
  },

  applyFilters: (photos) => {
    const { flagFilter, minRating, colorFilter } = get();
    let result = photos;

    if (flagFilter.length > 0) {
      result = result.filter(p => flagFilter.includes(p.flag));
    }

    if (minRating > 0) {
      result = result.filter(p => p.rating >= minRating);
    }

    if (colorFilter.length > 0) {
      result = result.filter(p => colorFilter.includes(p.colorLabel));
    }

    return result;
  },

  getCounts: (photos) => {
    const byRating: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const byColor: Record<string, number> = { red: 0, yellow: 0, green: 0, blue: 0, purple: 0, none: 0 };
    let picks = 0, rejects = 0, unflagged = 0, rated = 0;

    for (const p of photos) {
      if (p.flag === 'pick') picks++;
      else if (p.flag === 'reject') rejects++;
      else unflagged++;

      byRating[p.rating]++;
      if (p.rating > 0) rated++;
      byColor[p.colorLabel]++;
    }

    return { picks, rejects, unflagged, rated, byRating, byColor };
  },
}));
