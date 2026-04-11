import { ipcMain, dialog, app } from 'electron';
import { registerFileHandlers } from './file.ipc';
import { registerExifHandlers } from './exif.ipc';
import { registerThumbnailHandlers } from './thumbnail.ipc';

export function registerAllIPC(): void {
  registerFileHandlers();
  registerExifHandlers();
  registerThumbnailHandlers();

  // App info
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  // Directory chooser for export
  ipcMain.handle('dialog:choose-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose Export Destination',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}
