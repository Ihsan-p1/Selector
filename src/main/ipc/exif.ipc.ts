import { ipcMain } from 'electron';
import { extractExifData, extractRawPreview, getPreviewCacheDir } from '../services/exif.service';

export function registerExifHandlers(): void {
  // ── Single file EXIF ──
  ipcMain.handle('exif:get-metadata', async (_event, filePath: string) => {
    return await extractExifData(filePath);
  });

  // ── Batch EXIF ──
  ipcMain.handle('exif:get-metadata-batch', async (_event, filePaths: string[]) => {
    const results: Record<string, any> = {};
    // Process in chunks to avoid overwhelming ExifTool
    const CHUNK = 10;
    for (let i = 0; i < filePaths.length; i += CHUNK) {
      const chunk = filePaths.slice(i, i + CHUNK);
      const promises = chunk.map(async (fp) => {
        results[fp] = await extractExifData(fp);
      });
      await Promise.all(promises);
    }
    return results;
  });

  // ── Extract RAW preview ──
  ipcMain.handle('exif:extract-preview', async (_event, rawPath: string) => {
    const previewDir = getPreviewCacheDir();
    const previewPath = await extractRawPreview(rawPath, previewDir);
    if (previewPath) {
      return `file://${previewPath.replace(/\\/g, '/')}`;
    }
    return null;
  });
}
