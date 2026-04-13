import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@renderer/stores/ui.store';

describe('UIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
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
    });
  });

  describe('view mode', () => {
    it('should set view mode directly', () => {
      useUIStore.getState().setViewMode('grid');
      expect(useUIStore.getState().viewMode).toBe('grid');
    });

    it('should toggle between loupe and grid', () => {
      expect(useUIStore.getState().viewMode).toBe('loupe');
      useUIStore.getState().toggleViewMode();
      expect(useUIStore.getState().viewMode).toBe('grid');
      useUIStore.getState().toggleViewMode();
      expect(useUIStore.getState().viewMode).toBe('loupe');
    });
  });

  describe('panel toggles', () => {
    it('should toggle left panel', () => {
      expect(useUIStore.getState().showLeftPanel).toBe(true);
      useUIStore.getState().toggleLeftPanel();
      expect(useUIStore.getState().showLeftPanel).toBe(false);
      useUIStore.getState().toggleLeftPanel();
      expect(useUIStore.getState().showLeftPanel).toBe(true);
    });

    it('should toggle right panel', () => {
      useUIStore.getState().toggleRightPanel();
      expect(useUIStore.getState().showRightPanel).toBe(false);
    });

    it('should toggle filmstrip', () => {
      useUIStore.getState().toggleFilmstrip();
      expect(useUIStore.getState().showFilmstrip).toBe(false);
    });

    it('should toggle shortcut overlay', () => {
      useUIStore.getState().toggleShortcutOverlay();
      expect(useUIStore.getState().showShortcutOverlay).toBe(true);
      useUIStore.getState().toggleShortcutOverlay();
      expect(useUIStore.getState().showShortcutOverlay).toBe(false);
    });
  });

  describe('grid columns', () => {
    it('should set grid columns within valid range', () => {
      useUIStore.getState().setGridColumns(6);
      expect(useUIStore.getState().gridColumns).toBe(6);
    });

    it('should clamp grid columns to min 2', () => {
      useUIStore.getState().setGridColumns(1);
      expect(useUIStore.getState().gridColumns).toBe(2);
    });

    it('should clamp grid columns to max 8', () => {
      useUIStore.getState().setGridColumns(12);
      expect(useUIStore.getState().gridColumns).toBe(8);
    });
  });

  describe('zoom level', () => {
    it('should set zoom level', () => {
      useUIStore.getState().setZoomLevel(2);
      expect(useUIStore.getState().zoomLevel).toBe(2);
    });

    it('should clamp zoom to min 1', () => {
      useUIStore.getState().setZoomLevel(0);
      expect(useUIStore.getState().zoomLevel).toBe(1);
    });

    it('should clamp zoom to max 4', () => {
      useUIStore.getState().setZoomLevel(10);
      expect(useUIStore.getState().zoomLevel).toBe(4);
    });
  });

  describe('fullscreen', () => {
    it('should toggle fullscreen', () => {
      useUIStore.getState().toggleFullscreen();
      expect(useUIStore.getState().isFullscreen).toBe(true);
      useUIStore.getState().toggleFullscreen();
      expect(useUIStore.getState().isFullscreen).toBe(false);
    });
  });

  describe('toast', () => {
    it('should show toast message', () => {
      useUIStore.getState().showToast('Test message', 'success');
      expect(useUIStore.getState().toastMessage).toBe('Test message');
      expect(useUIStore.getState().toastType).toBe('success');
    });

    it('should default toast type to success', () => {
      useUIStore.getState().showToast('Test');
      expect(useUIStore.getState().toastType).toBe('success');
    });

    it('should clear toast', () => {
      useUIStore.getState().showToast('Test');
      useUIStore.getState().clearToast();
      expect(useUIStore.getState().toastMessage).toBeNull();
    });
  });
});
