import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '@renderer/stores/session.store';

describe('SessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      activeSessionId: null,
      activeSessionName: null,
      activeFolderPath: null,
      sessions: [],
      isDirty: false,
      isLoading: false,
      lastSavedAt: null,
    });
  });

  describe('setActiveSession', () => {
    it('should set active session info', () => {
      useSessionStore.getState().setActiveSession('sess_1', 'My Session', 'C:/Photos');
      const state = useSessionStore.getState();
      expect(state.activeSessionId).toBe('sess_1');
      expect(state.activeSessionName).toBe('My Session');
      expect(state.activeFolderPath).toBe('C:/Photos');
      expect(state.isDirty).toBe(false);
    });
  });

  describe('clearActiveSession', () => {
    it('should clear all session state', () => {
      useSessionStore.getState().setActiveSession('sess_1', 'My Session', 'C:/Photos');
      useSessionStore.getState().clearActiveSession();

      const state = useSessionStore.getState();
      expect(state.activeSessionId).toBeNull();
      expect(state.activeSessionName).toBeNull();
      expect(state.activeFolderPath).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.lastSavedAt).toBeNull();
    });
  });

  describe('dirty tracking', () => {
    it('should mark as dirty', () => {
      useSessionStore.getState().markDirty();
      expect(useSessionStore.getState().isDirty).toBe(true);
    });

    it('should mark as clean and update timestamp', () => {
      useSessionStore.getState().markDirty();
      useSessionStore.getState().markClean();

      const state = useSessionStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.lastSavedAt).toBeTypeOf('number');
      expect(state.lastSavedAt).toBeGreaterThan(0);
    });
  });

  describe('loading state', () => {
    it('should toggle loading state', () => {
      useSessionStore.getState().setLoading(true);
      expect(useSessionStore.getState().isLoading).toBe(true);

      useSessionStore.getState().setLoading(false);
      expect(useSessionStore.getState().isLoading).toBe(false);
    });
  });

  describe('setSessions', () => {
    it('should set sessions list', () => {
      const sessions = [
        { id: 's1', name: 'Session 1', folder_path: 'C:/A', photo_count: 10, created_at: '2026-01-01', updated_at: '2026-01-02' },
        { id: 's2', name: 'Session 2', folder_path: 'C:/B', photo_count: 20, created_at: '2026-01-03', updated_at: '2026-01-04' },
      ];
      useSessionStore.getState().setSessions(sessions);
      expect(useSessionStore.getState().sessions).toHaveLength(2);
      expect(useSessionStore.getState().sessions[0].id).toBe('s1');
    });
  });

  describe('session lifecycle', () => {
    it('should handle full lifecycle: set active → mark dirty → clean', () => {
      useSessionStore.getState().setActiveSession('sess_1', 'Test', 'C:/Photos');
      expect(useSessionStore.getState().isDirty).toBe(false);

      useSessionStore.getState().markDirty();
      expect(useSessionStore.getState().isDirty).toBe(true);

      useSessionStore.getState().markClean();
      expect(useSessionStore.getState().isDirty).toBe(false);
      expect(useSessionStore.getState().lastSavedAt).not.toBeNull();
    });

    it('should keep session info after dirty/clean cycles', () => {
      useSessionStore.getState().setActiveSession('sess_1', 'Test', 'C:/Photos');
      useSessionStore.getState().markDirty();
      useSessionStore.getState().markClean();

      expect(useSessionStore.getState().activeSessionId).toBe('sess_1');
      expect(useSessionStore.getState().activeSessionName).toBe('Test');
    });
  });
});
