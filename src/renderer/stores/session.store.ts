import { create } from 'zustand';
import type { PhotoState } from '@/shared/types';

// ═══════════════════════════════════════════
// Selector — Session Store (Renderer)
// Reactive session state management
// ═══════════════════════════════════════════

interface SessionInfo {
  id: string;
  name: string;
  folder_path: string;
  photo_count: number;
  created_at: string;
  updated_at: string;
}

interface SessionStore {
  // State
  activeSessionId: string | null;
  activeSessionName: string | null;
  activeFolderPath: string | null;
  sessions: SessionInfo[];
  isDirty: boolean;
  isLoading: boolean;
  lastSavedAt: number | null;

  // Actions
  setActiveSession: (id: string, name: string, folderPath: string) => void;
  clearActiveSession: () => void;
  markDirty: () => void;
  markClean: () => void;
  setLoading: (loading: boolean) => void;
  setSessions: (sessions: SessionInfo[]) => void;

  // Async operations (call selectorAPI)
  createSession: (name: string, folderPath: string) => Promise<string | null>;
  saveSession: (photoStates: PhotoState[]) => Promise<void>;
  loadSession: (sessionId: string) => Promise<{ session: SessionInfo; states: PhotoState[] } | null>;
  fetchSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  activeSessionId: null,
  activeSessionName: null,
  activeFolderPath: null,
  sessions: [],
  isDirty: false,
  isLoading: false,
  lastSavedAt: null,

  setActiveSession: (id, name, folderPath) => set({
    activeSessionId: id,
    activeSessionName: name,
    activeFolderPath: folderPath,
    isDirty: false,
  }),

  clearActiveSession: () => set({
    activeSessionId: null,
    activeSessionName: null,
    activeFolderPath: null,
    isDirty: false,
    lastSavedAt: null,
  }),

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false, lastSavedAt: Date.now() }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSessions: (sessions) => set({ sessions }),

  createSession: async (name, folderPath) => {
    if (!window.selectorAPI) return null;
    try {
      const sessionId = await window.selectorAPI.createSession(name, folderPath);
      set({
        activeSessionId: sessionId,
        activeSessionName: name,
        activeFolderPath: folderPath,
        isDirty: false,
      });
      // Refresh list
      await get().fetchSessions();
      return sessionId;
    } catch (err) {
      console.error('Failed to create session:', err);
      return null;
    }
  },

  saveSession: async (photoStates) => {
    const { activeSessionId } = get();
    if (!activeSessionId || !window.selectorAPI) return;
    try {
      await window.selectorAPI.saveSession(activeSessionId, photoStates);
      set({ isDirty: false, lastSavedAt: Date.now() });
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  },

  loadSession: async (sessionId) => {
    if (!window.selectorAPI) return null;
    try {
      set({ isLoading: true });
      const result = await window.selectorAPI.loadSession(sessionId);
      if (result) {
        set({
          activeSessionId: sessionId,
          activeSessionName: result.session.name,
          activeFolderPath: result.session.folder_path,
          isDirty: false,
          isLoading: false,
        });
        return result;
      }
      set({ isLoading: false });
      return null;
    } catch (err) {
      console.error('Failed to load session:', err);
      set({ isLoading: false });
      return null;
    }
  },

  fetchSessions: async () => {
    if (!window.selectorAPI) return;
    try {
      const sessions = await window.selectorAPI.listSessions();
      set({ sessions });
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  },

  deleteSession: async (sessionId) => {
    if (!window.selectorAPI) return;
    try {
      await window.selectorAPI.deleteSession(sessionId);
      // If deleting active session, clear it
      if (get().activeSessionId === sessionId) {
        get().clearActiveSession();
      }
      await get().fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  },
}));
