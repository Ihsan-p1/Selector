import { ipcMain } from 'electron';
import { getThumbnail, getThumbnailBatch } from '../services/thumbnail.service';

export function registerThumbnailHandlers(): void {
  // ── Single thumbnail ──
  ipcMain.handle('thumbnail:get', async (_event, photoId: string, filePath: string) => {
    return await getThumbnail(photoId, filePath);
  });

  // ── Batch thumbnails ──
  ipcMain.handle('thumbnail:get-batch', async (_event, photos: { id: string; path: string }[]) => {
    const results = await getThumbnailBatch(photos);
    return Object.fromEntries(results);
  });
}
