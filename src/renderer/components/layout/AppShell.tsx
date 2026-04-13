import { useState, useEffect, useCallback } from 'react';
import { usePhotoStore } from '../../stores/photo.store';
import { useUIStore } from '../../stores/ui.store';
import { useSessionStore } from '../../stores/session.store';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useGamepad } from '../../hooks/useGamepad';
import { usePhotoAnalysis } from '../../hooks/usePhotoAnalysis';
import { useAutoSave } from '../../hooks/useAutoSave';
import { TopBar } from './TopBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { StatusBar } from './StatusBar';
import { LoupeView } from '../viewer/LoupeView';
import { GridView } from '../viewer/GridView';
import { Filmstrip } from '../viewer/Filmstrip';
import { Toast } from '../common/Toast';
import { WelcomeScreen } from '../dialogs/WelcomeScreen';
import { ExportDialog } from '../dialogs/ExportDialog';
import { SessionDialog } from '../dialogs/SessionDialog';
import { ShortcutOverlay } from '../dialogs/ShortcutOverlay';

// Global export dialog opener — used by useKeyboardShortcuts
let _openExportDialog: (() => void) | null = null;
export function openExportDialog() {
  _openExportDialog?.();
}

export function AppShell() {
  const photos = usePhotoStore(s => s.photos);
  const viewMode = useUIStore(s => s.viewMode);
  const showLeftPanel = useUIStore(s => s.showLeftPanel);
  const showRightPanel = useUIStore(s => s.showRightPanel);
  const showFilmstrip = useUIStore(s => s.showFilmstrip);

  const [showExport, setShowExport] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  // Expose export dialog opener for keyboard shortcut system
  const openExport = useCallback(() => setShowExport(true), []);
  useEffect(() => {
    _openExportDialog = openExport;
    return () => { _openExportDialog = null; };
  }, [openExport]);

  // Register input handlers
  useKeyboardShortcuts();
  useGamepad();

  // Auto-compute histogram + sharpness for current photo
  usePhotoAnalysis();

  // Auto-save session
  useAutoSave();

  // No photos loaded — show welcome
  if (photos.length === 0) {
    return <WelcomeScreen />;
  }

  return (
    <div className="h-screen bg-[#09090b] text-zinc-200 flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      <TopBar
        onExport={() => setShowExport(true)}
        onSessionDialog={() => setShowSessionDialog(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {showLeftPanel && <LeftPanel />}

        <main className="flex-1 relative flex flex-col overflow-hidden bg-[#09090b]">
          {viewMode === 'loupe' ? (
            <LoupeView />
          ) : (
            <GridView />
          )}

          {viewMode === 'loupe' && showFilmstrip && <Filmstrip />}
        </main>

        {showRightPanel && <RightPanel />}
      </div>

      <StatusBar />
      <Toast />
      <ExportDialog isOpen={showExport} onClose={() => setShowExport(false)} />
      <SessionDialog isOpen={showSessionDialog} onClose={() => setShowSessionDialog(false)} />
      <ShortcutOverlay />
    </div>
  );
}
