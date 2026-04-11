import { describe, it, expect, beforeEach } from 'vitest';
import { useShortcutStore } from '@renderer/stores/shortcut.store';

describe('ShortcutStore', () => {
  beforeEach(() => {
    useShortcutStore.getState().resetToDefaults();
  });

  describe('resolveKeyboard', () => {
    it('should resolve single key shortcuts', () => {
      const mods = { ctrl: false, shift: false, alt: false };
      expect(useShortcutStore.getState().resolveKeyboard('P', mods)).toBe('flag.pick');
      expect(useShortcutStore.getState().resolveKeyboard('X', mods)).toBe('flag.reject');
      expect(useShortcutStore.getState().resolveKeyboard('U', mods)).toBe('flag.unflag');
      expect(useShortcutStore.getState().resolveKeyboard('G', mods)).toBe('view.grid');
    });

    it('should resolve number keys for rating', () => {
      const mods = { ctrl: false, shift: false, alt: false };
      expect(useShortcutStore.getState().resolveKeyboard('1', mods)).toBe('rate.1');
      expect(useShortcutStore.getState().resolveKeyboard('5', mods)).toBe('rate.5');
      expect(useShortcutStore.getState().resolveKeyboard('0', mods)).toBe('rate.clear');
    });

    it('should resolve arrow keys for navigation', () => {
      const mods = { ctrl: false, shift: false, alt: false };
      expect(useShortcutStore.getState().resolveKeyboard('ArrowRight', mods)).toBe('nav.next');
      expect(useShortcutStore.getState().resolveKeyboard('ArrowLeft', mods)).toBe('nav.prev');
    });

    it('should resolve Ctrl+ combos', () => {
      expect(useShortcutStore.getState().resolveKeyboard('E', { ctrl: true, shift: false, alt: false })).toBe('export.open');
      expect(useShortcutStore.getState().resolveKeyboard('S', { ctrl: true, shift: false, alt: false })).toBe('session.save');
      expect(useShortcutStore.getState().resolveKeyboard('A', { ctrl: true, shift: false, alt: false })).toBe('select.all');
    });

    it('should return null for unmapped keys', () => {
      const mods = { ctrl: false, shift: false, alt: false };
      expect(useShortcutStore.getState().resolveKeyboard('Q', mods)).toBeNull();
      expect(useShortcutStore.getState().resolveKeyboard('W', mods)).toBeNull();
    });

    it('should be case-insensitive for single keys', () => {
      const mods = { ctrl: false, shift: false, alt: false };
      expect(useShortcutStore.getState().resolveKeyboard('p', mods)).toBe('flag.pick');
      expect(useShortcutStore.getState().resolveKeyboard('x', mods)).toBe('flag.reject');
    });
  });

  describe('resolveGamepadButton', () => {
    it('should resolve Xbox button A (0) to flag.pick', () => {
      expect(useShortcutStore.getState().resolveGamepadButton(0)).toBe('flag.pick');
    });

    it('should resolve Xbox button B (1) to flag.reject', () => {
      expect(useShortcutStore.getState().resolveGamepadButton(1)).toBe('flag.reject');
    });

    it('should resolve D-pad right (15) to nav.next', () => {
      expect(useShortcutStore.getState().resolveGamepadButton(15)).toBe('nav.next');
    });

    it('should resolve D-pad left (14) to nav.prev', () => {
      expect(useShortcutStore.getState().resolveGamepadButton(14)).toBe('nav.prev');
    });

    it('should return null for unmapped buttons', () => {
      expect(useShortcutStore.getState().resolveGamepadButton(5)).toBeNull();
    });
  });

  describe('rebinding', () => {
    it('should rebind keyboard shortcut', () => {
      useShortcutStore.getState().rebindKeyboard('flag.pick', 'K');
      const mods = { ctrl: false, shift: false, alt: false };
      expect(useShortcutStore.getState().resolveKeyboard('K', mods)).toBe('flag.pick');
      expect(useShortcutStore.getState().resolveKeyboard('P', mods)).toBeNull();
    });

    it('should rebind gamepad button', () => {
      useShortcutStore.getState().rebindGamepad('flag.pick', 5);
      expect(useShortcutStore.getState().resolveGamepadButton(5)).toBe('flag.pick');
      expect(useShortcutStore.getState().resolveGamepadButton(0)).toBeNull();
    });

    it('should detect keyboard conflicts', () => {
      expect(useShortcutStore.getState().checkKeyboardConflict('P')).toBe('flag.pick');
      expect(useShortcutStore.getState().checkKeyboardConflict('Q')).toBeNull();
    });
  });

  describe('resetToDefaults', () => {
    it('should restore all default bindings', () => {
      useShortcutStore.getState().rebindKeyboard('flag.pick', 'K');
      useShortcutStore.getState().resetToDefaults();

      const mods = { ctrl: false, shift: false, alt: false };
      expect(useShortcutStore.getState().resolveKeyboard('P', mods)).toBe('flag.pick');
      expect(useShortcutStore.getState().resolveKeyboard('K', mods)).toBeNull();
    });
  });

  describe('getByCategory', () => {
    it('should group bindings by category', () => {
      const categories = useShortcutStore.getState().getByCategory();
      expect(categories.has('Navigation')).toBe(true);
      expect(categories.has('Flagging')).toBe(true);
      expect(categories.has('Rating')).toBe(true);
      expect(categories.has('View')).toBe(true);
    });

    it('should have Navigation contain at least 4 bindings', () => {
      const categories = useShortcutStore.getState().getByCategory();
      const navBindings = categories.get('Navigation');
      expect(navBindings!.length).toBeGreaterThanOrEqual(4);
    });
  });
});
