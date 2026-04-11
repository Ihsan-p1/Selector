import { create } from 'zustand';

// ═══════════════════════════════════════════
// Action IDs — unique identifier for each action
// ═══════════════════════════════════════════

export type ActionId =
  // Navigation
  | 'nav.next' | 'nav.prev' | 'nav.first' | 'nav.last'
  // Flagging
  | 'flag.pick' | 'flag.reject' | 'flag.unflag'
  // Rating
  | 'rate.1' | 'rate.2' | 'rate.3' | 'rate.4' | 'rate.5' | 'rate.clear'
  | 'rate.up' | 'rate.down'
  // Color labels
  | 'color.red' | 'color.yellow' | 'color.green' | 'color.blue' | 'color.purple' | 'color.clear'
  | 'color.cycle-fwd' | 'color.cycle-back'
  // View
  | 'view.grid' | 'view.compare' | 'view.fit' | 'view.zoom100' | 'view.fullscreen'
  // Panels
  | 'panel.filmstrip' | 'panel.info' | 'panel.library'
  // Help
  | 'help.shortcuts'
  // Export / Session
  | 'export.open' | 'session.save'
  // Selection
  | 'select.all'
  // Filter
  | 'filter.picks' | 'filter.rejects' | 'filter.all'
  // Manage
  | 'photo.remove';

export interface ShortcutBinding {
  actionId: ActionId;
  label: string;
  category: string;
  keyboard: string | null;    // e.g. 'P', 'ArrowRight', 'Ctrl+E'
  gamepadButton: number | null;  // W3C gamepad button index
  gamepadAxis?: { index: number; direction: 'positive' | 'negative' };
}

// ═══════════════════════════════════════════
// Default Bindings
// ═══════════════════════════════════════════

const DEFAULT_BINDINGS: ShortcutBinding[] = [
  // Navigation
  { actionId: 'nav.next', label: 'Next Photo', category: 'Navigation', keyboard: 'ArrowRight', gamepadButton: 15 },
  { actionId: 'nav.prev', label: 'Previous Photo', category: 'Navigation', keyboard: 'ArrowLeft', gamepadButton: 14 },
  { actionId: 'nav.first', label: 'First Photo', category: 'Navigation', keyboard: 'Home', gamepadButton: null },
  { actionId: 'nav.last', label: 'Last Photo', category: 'Navigation', keyboard: 'End', gamepadButton: null },

  // Flagging
  { actionId: 'flag.pick', label: 'Flag as Pick', category: 'Flagging', keyboard: 'P', gamepadButton: 0 },
  { actionId: 'flag.reject', label: 'Flag as Reject', category: 'Flagging', keyboard: 'X', gamepadButton: 1 },
  { actionId: 'flag.unflag', label: 'Remove Flag', category: 'Flagging', keyboard: 'U', gamepadButton: 2 },

  // Rating
  { actionId: 'rate.1', label: '1 Star', category: 'Rating', keyboard: '1', gamepadButton: null },
  { actionId: 'rate.2', label: '2 Stars', category: 'Rating', keyboard: '2', gamepadButton: null },
  { actionId: 'rate.3', label: '3 Stars', category: 'Rating', keyboard: '3', gamepadButton: null },
  { actionId: 'rate.4', label: '4 Stars', category: 'Rating', keyboard: '4', gamepadButton: null },
  { actionId: 'rate.5', label: '5 Stars', category: 'Rating', keyboard: '5', gamepadButton: null },
  { actionId: 'rate.clear', label: 'Clear Rating', category: 'Rating', keyboard: '0', gamepadButton: null },
  { actionId: 'rate.up', label: 'Rating Up', category: 'Rating', keyboard: null, gamepadButton: 12 },
  { actionId: 'rate.down', label: 'Rating Down', category: 'Rating', keyboard: null, gamepadButton: 13 },

  // Color Labels
  { actionId: 'color.red', label: 'Red Label', category: 'Color Label', keyboard: '6', gamepadButton: null },
  { actionId: 'color.yellow', label: 'Yellow Label', category: 'Color Label', keyboard: '7', gamepadButton: null },
  { actionId: 'color.green', label: 'Green Label', category: 'Color Label', keyboard: '8', gamepadButton: null },
  { actionId: 'color.blue', label: 'Blue Label', category: 'Color Label', keyboard: '9', gamepadButton: null },
  { actionId: 'color.purple', label: 'Purple Label', category: 'Color Label', keyboard: '-', gamepadButton: null },
  { actionId: 'color.clear', label: 'Clear Color', category: 'Color Label', keyboard: 'Backspace', gamepadButton: null },
  { actionId: 'color.cycle-fwd', label: 'Next Color', category: 'Color Label', keyboard: null, gamepadButton: 7 },
  { actionId: 'color.cycle-back', label: 'Prev Color', category: 'Color Label', keyboard: null, gamepadButton: 6 },

  // View
  { actionId: 'view.grid', label: 'Toggle Grid/Loupe', category: 'View', keyboard: 'G', gamepadButton: 3 },
  { actionId: 'view.compare', label: 'Compare Mode', category: 'View', keyboard: 'C', gamepadButton: null },
  { actionId: 'view.fit', label: 'Fit to Screen', category: 'View', keyboard: 'F', gamepadButton: 10 },
  { actionId: 'view.zoom100', label: 'Toggle 100% Zoom', category: 'View', keyboard: 'Z', gamepadButton: 11 },
  { actionId: 'view.fullscreen', label: 'Fullscreen', category: 'View', keyboard: ' ', gamepadButton: null },

  // Panels
  { actionId: 'panel.filmstrip', label: 'Toggle Filmstrip', category: 'Panels', keyboard: 'Tab', gamepadButton: null },
  { actionId: 'panel.info', label: 'Toggle Info Panel', category: 'Panels', keyboard: 'I', gamepadButton: 8 },
  { actionId: 'panel.library', label: 'Toggle Library Panel', category: 'Panels', keyboard: 'L', gamepadButton: null },

  // Help
  { actionId: 'help.shortcuts', label: 'Shortcut Guide', category: 'Help', keyboard: '?', gamepadButton: null },

  // Export / Session
  { actionId: 'export.open', label: 'Export Photos', category: 'Export', keyboard: 'Ctrl+E', gamepadButton: 9 },
  { actionId: 'session.save', label: 'Save Session', category: 'Session', keyboard: 'Ctrl+S', gamepadButton: null },

  // Selection
  { actionId: 'select.all', label: 'Select All', category: 'Selection', keyboard: 'Ctrl+A', gamepadButton: null },

  // Filter
  { actionId: 'filter.picks', label: 'Show Picks Only', category: 'Filter', keyboard: 'Ctrl+Shift+P', gamepadButton: null },
  { actionId: 'filter.rejects', label: 'Show Rejects Only', category: 'Filter', keyboard: 'Ctrl+Shift+X', gamepadButton: null },
  { actionId: 'filter.all', label: 'Show All', category: 'Filter', keyboard: 'Ctrl+Shift+A', gamepadButton: null },

  // Manage
  { actionId: 'photo.remove', label: 'Remove from Collection', category: 'Manage', keyboard: 'Delete', gamepadButton: null },
];

interface ShortcutStore {
  bindings: ShortcutBinding[];

  // Lookup
  getBinding: (actionId: ActionId) => ShortcutBinding | undefined;
  resolveKeyboard: (key: string, modifiers: { ctrl: boolean; shift: boolean; alt: boolean }) => ActionId | null;
  resolveGamepadButton: (buttonIndex: number) => ActionId | null;
  getAllActions: () => ActionId[];
  getByCategory: () => Map<string, ShortcutBinding[]>;

  // Rebinding
  rebindKeyboard: (actionId: ActionId, newKey: string) => void;
  rebindGamepad: (actionId: ActionId, buttonIndex: number | null) => void;
  checkKeyboardConflict: (key: string) => ActionId | null;
  resetToDefaults: () => void;
}

function buildKeyString(key: string, modifiers: { ctrl: boolean; shift: boolean; alt: boolean }): string {
  const parts: string[] = [];
  if (modifiers.ctrl) parts.push('Ctrl');
  if (modifiers.shift) parts.push('Shift');
  if (modifiers.alt) parts.push('Alt');
  parts.push(key);
  return parts.join('+');
}

export const useShortcutStore = create<ShortcutStore>((set, get) => ({
  bindings: [...DEFAULT_BINDINGS],

  getBinding: (actionId) => {
    return get().bindings.find(b => b.actionId === actionId);
  },

  resolveKeyboard: (key, modifiers) => {
    const keyStr = buildKeyString(key, modifiers);
    // Try exact match with modifiers first
    const binding = get().bindings.find(b => b.keyboard === keyStr);
    if (binding) return binding.actionId;

    // Try case-insensitive single key (no modifiers)
    if (!modifiers.ctrl && !modifiers.shift && !modifiers.alt) {
      const upper = key.toUpperCase();
      const b = get().bindings.find(b =>
        b.keyboard !== null &&
        !b.keyboard.includes('+') &&
        b.keyboard.toUpperCase() === upper
      );
      if (b) return b.actionId;
    }

    return null;
  },

  resolveGamepadButton: (buttonIndex) => {
    const binding = get().bindings.find(b => b.gamepadButton === buttonIndex);
    return binding?.actionId ?? null;
  },

  getAllActions: () => {
    return get().bindings.map(b => b.actionId);
  },

  getByCategory: () => {
    const map = new Map<string, ShortcutBinding[]>();
    for (const b of get().bindings) {
      if (!map.has(b.category)) map.set(b.category, []);
      map.get(b.category)!.push(b);
    }
    return map;
  },

  rebindKeyboard: (actionId, newKey) => {
    const { bindings } = get();
    set({
      bindings: bindings.map(b =>
        b.actionId === actionId ? { ...b, keyboard: newKey } : b
      ),
    });
  },

  rebindGamepad: (actionId, buttonIndex) => {
    const { bindings } = get();
    set({
      bindings: bindings.map(b =>
        b.actionId === actionId ? { ...b, gamepadButton: buttonIndex } : b
      ),
    });
  },

  checkKeyboardConflict: (key) => {
    const binding = get().bindings.find(b => b.keyboard === key);
    return binding?.actionId ?? null;
  },

  resetToDefaults: () => set({ bindings: [...DEFAULT_BINDINGS] }),
}));

// Xbox button name helper
export const XBOX_BUTTON_NAMES: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'View',
  9: 'Menu',
  10: 'L Stick',
  11: 'R Stick',
  12: 'D-Up',
  13: 'D-Down',
  14: 'D-Left',
  15: 'D-Right',
  16: 'Xbox',
};
