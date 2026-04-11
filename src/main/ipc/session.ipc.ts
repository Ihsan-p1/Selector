import { ipcMain } from 'electron';
import {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  savePhotoStates,
  loadPhotoStates,
  getSetting,
  setSetting,
} from '../services/session.service';

export function registerSessionHandlers(): void {
  ipcMain.handle('session:create', (_event, name: string, folderPath: string) => {
    return createSession(name, folderPath);
  });

  ipcMain.handle('session:load', (_event, sessionId: string) => {
    const session = getSession(sessionId);
    if (!session) return null;
    const states = loadPhotoStates(sessionId);
    return { session, states };
  });

  ipcMain.handle('session:save', (_event, sessionId: string, photoStates: any[]) => {
    savePhotoStates(sessionId, photoStates);
  });

  ipcMain.handle('session:list', () => {
    return listSessions();
  });

  ipcMain.handle('session:delete', (_event, sessionId: string) => {
    deleteSession(sessionId);
  });

  // Settings KV
  ipcMain.handle('settings:get', (_event, key: string) => {
    return getSetting(key);
  });

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    setSetting(key, value);
  });
}
