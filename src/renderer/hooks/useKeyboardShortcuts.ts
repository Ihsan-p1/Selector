import { useEffect } from 'react';
import { usePhotoStore } from '../stores/photo.store';
import { useUIStore } from '../stores/ui.store';
import { useFilterStore } from '../stores/filter.store';
import { useShortcutStore, type ActionId } from '../stores/shortcut.store';
import type { ColorLabel, StarRating } from '@/shared/types';

const COLOR_ORDER: ColorLabel[] = ['none', 'red', 'yellow', 'green', 'blue', 'purple'];

export function useKeyboardShortcuts() {
  const resolveKeyboard = useShortcutStore(s => s.resolveKeyboard);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const modifiers = {
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      };

      const actionId = resolveKeyboard(e.key, modifiers);
      if (!actionId) return;

      e.preventDefault();
      executeAction(actionId);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resolveKeyboard]);
}

export function executeAction(actionId: ActionId): void {
  const photoStore = usePhotoStore.getState();
  const uiStore = useUIStore.getState();
  const filterStore = useFilterStore.getState();

  const { currentIndex, photos } = photoStore;
  const currentPhoto = photos[currentIndex];
  if (!currentPhoto && !actionId.startsWith('filter.') && !actionId.startsWith('help.') && !actionId.startsWith('view.')) {
    return;
  }

  switch (actionId) {
    // Navigation
    case 'nav.next':
      photoStore.navigateNext();
      break;
    case 'nav.prev':
      photoStore.navigatePrev();
      break;
    case 'nav.first':
      photoStore.navigateFirst();
      break;
    case 'nav.last':
      photoStore.navigateLast();
      break;

    // Flagging
    case 'flag.pick':
      photoStore.flagPhoto(currentIndex, 'pick');
      if (photos[currentIndex]?.flag !== 'pick') {
        uiStore.showToast('✓ Flagged as Pick', 'success');
      }
      photoStore.navigateNext();
      break;
    case 'flag.reject':
      photoStore.flagPhoto(currentIndex, 'reject');
      if (photos[currentIndex]?.flag !== 'reject') {
        uiStore.showToast('✗ Flagged as Reject', 'error');
      }
      photoStore.navigateNext();
      break;
    case 'flag.unflag':
      photoStore.flagPhoto(currentIndex, 'unflagged');
      uiStore.showToast('Flag removed', 'info');
      break;

    // Rating
    case 'rate.1': case 'rate.2': case 'rate.3': case 'rate.4': case 'rate.5': {
      const rating = parseInt(actionId.split('.')[1]) as StarRating;
      photoStore.ratePhoto(currentIndex, rating);
      uiStore.showToast(`★ ${rating} star${rating > 1 ? 's' : ''}`, 'info');
      break;
    }
    case 'rate.clear':
      photoStore.ratePhoto(currentIndex, 0);
      uiStore.showToast('Rating cleared', 'info');
      break;
    case 'rate.up': {
      if (!currentPhoto) break;
      const newRating = Math.min(5, currentPhoto.rating + 1) as StarRating;
      photoStore.ratePhoto(currentIndex, newRating);
      uiStore.showToast(`★ ${newRating} star${newRating > 1 ? 's' : ''}`, 'info');
      break;
    }
    case 'rate.down': {
      if (!currentPhoto) break;
      const newRating = Math.max(0, currentPhoto.rating - 1) as StarRating;
      photoStore.ratePhoto(currentIndex, newRating);
      if (newRating === 0) uiStore.showToast('Rating cleared', 'info');
      else uiStore.showToast(`★ ${newRating} star${newRating > 1 ? 's' : ''}`, 'info');
      break;
    }

    // Color Labels
    case 'color.red':
      photoStore.setColorLabel(currentIndex, 'red');
      break;
    case 'color.yellow':
      photoStore.setColorLabel(currentIndex, 'yellow');
      break;
    case 'color.green':
      photoStore.setColorLabel(currentIndex, 'green');
      break;
    case 'color.blue':
      photoStore.setColorLabel(currentIndex, 'blue');
      break;
    case 'color.purple':
      photoStore.setColorLabel(currentIndex, 'purple');
      break;
    case 'color.clear':
      photoStore.setColorLabel(currentIndex, 'none');
      break;
    case 'color.cycle-fwd': {
      if (!currentPhoto) break;
      const curIdx = COLOR_ORDER.indexOf(currentPhoto.colorLabel);
      const nextColor = COLOR_ORDER[(curIdx + 1) % COLOR_ORDER.length];
      photoStore.setColorLabel(currentIndex, nextColor);
      break;
    }
    case 'color.cycle-back': {
      if (!currentPhoto) break;
      const curIdx = COLOR_ORDER.indexOf(currentPhoto.colorLabel);
      const prevColor = COLOR_ORDER[(curIdx - 1 + COLOR_ORDER.length) % COLOR_ORDER.length];
      photoStore.setColorLabel(currentIndex, prevColor);
      break;
    }

    // View
    case 'view.grid':
      uiStore.toggleViewMode();
      break;
    case 'view.fullscreen':
      uiStore.toggleFullscreen();
      break;

    // Panels
    case 'panel.filmstrip':
      uiStore.toggleFilmstrip();
      break;
    case 'panel.info':
      uiStore.toggleRightPanel();
      break;
    case 'panel.library':
      uiStore.toggleLeftPanel();
      break;

    // Help
    case 'help.shortcuts':
      uiStore.toggleShortcutOverlay();
      break;

    // Filter
    case 'filter.picks':
      filterStore.setFlagFilter(['pick']);
      uiStore.showToast('Showing picks only', 'info');
      break;
    case 'filter.rejects':
      filterStore.setFlagFilter(['reject']);
      uiStore.showToast('Showing rejects only', 'info');
      break;
    case 'filter.all':
      filterStore.clearAllFilters();
      uiStore.showToast('Showing all photos', 'info');
      break;

    // Selection
    case 'select.all':
      photoStore.selectAll();
      break;

    default:
      break;
  }
}
