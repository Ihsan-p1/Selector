import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow } from 'electron';

// ═══════════════════════════════════════════
// Selector — Export Service (Main Process)
// Copies or moves photos to destination folder
// With cancellation support via AbortController
// ═══════════════════════════════════════════

export interface ExportOptions {
  mode: 'copy' | 'move';
  destination: string;
  createSubfolders: boolean;
}

export interface ExportPhoto {
  filePath: string;
  fileName: string;
}

export interface ExportResult {
  success: number;
  failed: number;
  cancelled: boolean;
  errors: string[];
}

// Active abort controller for current export
let activeAbortController: AbortController | null = null;

/**
 * Export photos to destination folder.
 * Sends progress events to renderer via IPC.
 * Supports cancellation via abort signal.
 */
export async function exportPhotos(
  options: ExportOptions,
  photos: ExportPhoto[],
  window: BrowserWindow | null
): Promise<ExportResult> {
  const { mode, destination } = options;

  // Create new abort controller for this export
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  // Ensure destination exists
  fs.mkdirSync(destination, { recursive: true });

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < photos.length; i++) {
    // Check for cancellation
    if (signal.aborted) {
      activeAbortController = null;
      return { success, failed, cancelled: true, errors };
    }

    const photo = photos[i];
    const destPath = path.join(destination, photo.fileName);

    // Send progress
    if (window && !window.isDestroyed()) {
      window.webContents.send('export:progress', {
        current: i + 1,
        total: photos.length,
        fileName: photo.fileName,
      });
    }

    try {
      // Handle filename collision
      const finalPath = getUniquePath(destPath);

      if (mode === 'copy') {
        fs.copyFileSync(photo.filePath, finalPath);
      } else {
        // Move = copy then delete
        fs.copyFileSync(photo.filePath, finalPath);
        fs.unlinkSync(photo.filePath);
      }
      success++;
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${photo.fileName}: ${errMsg}`);
      console.error(`Export failed for ${photo.fileName}:`, err);
    }

    // Yield to event loop every 10 files to prevent hanging
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  activeAbortController = null;
  return { success, failed, cancelled: false, errors };
}

/**
 * Cancel the currently running export.
 */
export function cancelExport(): void {
  if (activeAbortController) {
    activeAbortController.abort();
  }
}

/**
 * If file already exists, append (2), (3), etc.
 */
function getUniquePath(filePath: string): string {
  if (!fs.existsSync(filePath)) return filePath;

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);

  let counter = 2;
  let candidate: string;
  do {
    candidate = path.join(dir, `${name} (${counter})${ext}`);
    counter++;
  } while (fs.existsSync(candidate));

  return candidate;
}
