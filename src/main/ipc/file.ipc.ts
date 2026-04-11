import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ALL_FORMATS } from '../../shared/types';
import type { FileInfo } from '../../shared/types';

export function registerFileHandlers(): void {
  // ── Open Folder Dialog ──
  ipcMain.handle('file:open-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Photo Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // ── Scan Directory ──
  ipcMain.handle('file:scan-directory', async (_event, folderPath: string) => {
    const files: FileInfo[] = [];
    const supportedExtSet = new Set(ALL_FORMATS.map(f => `.${f}`));

    function scanDir(dirPath: string): void {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            // Skip hidden directories
            if (!entry.name.startsWith('.')) {
              scanDir(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (supportedExtSet.has(ext)) {
              try {
                const stat = fs.statSync(fullPath);
                const rawExt = ext.slice(1); // remove dot
                files.push({
                  path: fullPath,
                  name: entry.name,
                  size: stat.size,
                  extension: rawExt,
                  isRaw: isRawExtension(rawExt),
                  lastModified: stat.mtime.toISOString(),
                });
              } catch {
                // Skip files we can't stat
              }
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    scanDir(folderPath);
    files.sort((a, b) => a.name.localeCompare(b.name));
    return files;
  });

  // ── Read Image (for loupe view) ──
  ipcMain.handle('file:read-image', async (_event, filePath: string) => {
    // For standard formats, return file:// protocol URL
    // For RAW, this will be handled by exif:extract-preview (Phase 3)
    const ext = path.extname(filePath).toLowerCase().slice(1);
    if (isRawExtension(ext)) {
      // Placeholder — will be replaced with ExifTool preview extraction
      return null;
    }
    // Return as file protocol URL (Electron can load these)
    return `file://${filePath.replace(/\\/g, '/')}`;
  });
}

const RAW_EXTENSIONS = new Set([
  'arw', 'cr2', 'cr3', 'nef', 'nrw', 'orf', 'rw2', 'raf',
  'dng', 'pef', 'srw', 'x3f', 'erf', '3fr', 'rwl', 'iiq',
  'dcr', 'kdc', 'mrw', 'srf', 'sr2',
]);

function isRawExtension(ext: string): boolean {
  return RAW_EXTENSIONS.has(ext.toLowerCase());
}
