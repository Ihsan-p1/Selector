import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// ═══════════════════════════════════════════════════════
// Selector — Preload Script (Context Bridge)
// Exposes safe IPC methods to the renderer process
// ═══════════════════════════════════════════════════════

const selectorAPI = {
  // ── File Operations ──
  openFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('file:open-folder'),

  scanDirectory: (folderPath: string): Promise<any[]> =>
    ipcRenderer.invoke('file:scan-directory', folderPath),

  readImage: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('file:read-image', filePath),

  // ── EXIF Operations ──
  getExif: (filePath: string): Promise<any> =>
    ipcRenderer.invoke('exif:get-metadata', filePath),

  getExifBatch: (filePaths: string[]): Promise<any> =>
    ipcRenderer.invoke('exif:get-metadata-batch', filePaths),

  extractPreview: (rawPath: string, outputPath: string): Promise<string> =>
    ipcRenderer.invoke('exif:extract-preview', rawPath, outputPath),

  // ── Thumbnail Operations ──
  getThumbnail: (photoId: string, filePath: string): Promise<string> =>
    ipcRenderer.invoke('thumbnail:get', photoId, filePath),

  getThumbnailBatch: (photos: { id: string; path: string }[]): Promise<any> =>
    ipcRenderer.invoke('thumbnail:get-batch', photos),

  // ── Session Operations ──
  createSession: (name: string, folderPath: string): Promise<string> =>
    ipcRenderer.invoke('session:create', name, folderPath),

  saveSession: (sessionId: string, photoStates: any[]): Promise<void> =>
    ipcRenderer.invoke('session:save', sessionId, photoStates),

  loadSession: (sessionId: string): Promise<any> =>
    ipcRenderer.invoke('session:load', sessionId),

  listSessions: (): Promise<any[]> =>
    ipcRenderer.invoke('session:list'),

  deleteSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('session:delete', sessionId),

  // ── Export Operations ──
  exportPhotos: (options: any, photos: any[]): Promise<any> =>
    ipcRenderer.invoke('export:start', options, photos),

  onExportProgress: (callback: (data: { current: number; total: number; fileName: string }) => void): void => {
    ipcRenderer.on('export:progress', (_event, data) => callback(data));
  },

  removeExportProgressListener: (): void => {
    ipcRenderer.removeAllListeners('export:progress');
  },

  // ── Dialog Operations ──
  chooseDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:choose-directory'),

  // ── App Info ──
  getVersion: (): Promise<string> =>
    ipcRenderer.invoke('app:get-version'),
};

// Expose APIs to renderer via contextBridge
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('selectorAPI', selectorAPI);
  } catch (error) {
    console.error('Failed to expose APIs:', error);
  }
} else {
  // @ts-ignore
  window.electron = electronAPI;
  // @ts-ignore
  window.selectorAPI = selectorAPI;
}
