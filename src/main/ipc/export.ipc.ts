import { ipcMain, BrowserWindow } from 'electron';
import { exportPhotos, cancelExport, type ExportOptions, type ExportPhoto } from '../services/export.service';

export function registerExportHandlers(): void {
  ipcMain.handle('export:start', async (event, options: ExportOptions, photos: ExportPhoto[]) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return await exportPhotos(options, photos, window);
  });

  ipcMain.handle('export:cancel', async () => {
    cancelExport();
  });
}
