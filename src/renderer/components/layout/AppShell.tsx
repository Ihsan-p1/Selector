import { usePhotoStore } from '../../stores/photo.store';
import { useUIStore } from '../../stores/ui.store';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useGamepad } from '../../hooks/useGamepad';
import { TopBar } from './TopBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { LoupeView } from '../viewer/LoupeView';
import { GridView } from '../viewer/GridView';
import { Filmstrip } from '../viewer/Filmstrip';
import { Toast } from '../common/Toast';
import { WelcomeScreen } from '../dialogs/WelcomeScreen';

export function AppShell() {
  const photos = usePhotoStore(s => s.photos);
  const viewMode = useUIStore(s => s.viewMode);
  const showLeftPanel = useUIStore(s => s.showLeftPanel);
  const showRightPanel = useUIStore(s => s.showRightPanel);
  const showFilmstrip = useUIStore(s => s.showFilmstrip);

  // Register input handlers
  useKeyboardShortcuts();
  useGamepad();

  // No photos loaded — show welcome
  if (photos.length === 0) {
    return <WelcomeScreen />;
  }

  return (
    <div className="h-screen bg-[#09090b] text-zinc-200 flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      <TopBar />

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

      <Toast />
    </div>
  );
}
