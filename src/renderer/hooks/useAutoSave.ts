import { useEffect, useRef } from 'react';
import { usePhotoStore } from '../stores/photo.store';
import { useSessionStore } from '../stores/session.store';

// ═══════════════════════════════════════════
// Selector — Auto-Save Hook
// Auto-saves session every 30s when dirty
// Also saves on window close (beforeunload)
// ═══════════════════════════════════════════

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

export function useAutoSave() {
  const activeSessionId = useSessionStore(s => s.activeSessionId);
  const isDirty = useSessionStore(s => s.isDirty);
  const saveSession = useSessionStore(s => s.saveSession);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-save timer
  useEffect(() => {
    if (!activeSessionId) return;

    timerRef.current = setInterval(() => {
      const { isDirty } = useSessionStore.getState();
      if (!isDirty) return;

      const states = usePhotoStore.getState().exportStates();
      saveSession(states);
      console.log('[AutoSave] Session saved automatically');
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeSessionId, saveSession]);

  // Save on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const { activeSessionId, isDirty } = useSessionStore.getState();
      if (!activeSessionId || !isDirty) return;

      const states = usePhotoStore.getState().exportStates();
      // Use sync-like approach for beforeunload
      if (window.selectorAPI) {
        window.selectorAPI.saveSession(activeSessionId, states);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Mark session dirty when photos change
  useEffect(() => {
    const unsubscribe = usePhotoStore.subscribe((state, prevState) => {
      if (!useSessionStore.getState().activeSessionId) return;

      // Check if any culling-relevant state changed
      const hasChanged = state.photos.some((photo, i) => {
        const prev = prevState.photos[i];
        if (!prev) return true;
        return (
          photo.flag !== prev.flag ||
          photo.rating !== prev.rating ||
          photo.colorLabel !== prev.colorLabel
        );
      });

      if (hasChanged) {
        useSessionStore.getState().markDirty();
      }
    });

    return unsubscribe;
  }, []);
}
