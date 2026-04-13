import { useState, useEffect } from 'react';
import { Clock, FolderOpen, Trash2, X, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSessionStore } from '../../stores/session.store';
import { usePhotoStore } from '../../stores/photo.store';
import { useUIStore } from '../../stores/ui.store';
import { createEmptyExif } from '@/shared/types';
import { generatePhotoId } from '../../lib/utils';
import type { PhotoEntry } from '@/shared/types';

interface SessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionDialog({ isOpen, onClose }: SessionDialogProps) {
  const sessions = useSessionStore(s => s.sessions);
  const activeSessionId = useSessionStore(s => s.activeSessionId);
  const fetchSessions = useSessionStore(s => s.fetchSessions);
  const loadSession = useSessionStore(s => s.loadSession);
  const deleteSession = useSessionStore(s => s.deleteSession);
  const setPhotos = usePhotoStore(s => s.setPhotos);
  const importStates = usePhotoStore(s => s.importStates);
  const showToast = useUIStore(s => s.showToast);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
      setConfirmDelete(null);
    }
  }, [isOpen, fetchSessions]);

  if (!isOpen) return null;

  const handleResume = async (sessionId: string) => {
    setLoadingId(sessionId);
    try {
      const result = await loadSession(sessionId);
      if (result && window.selectorAPI) {
        // Re-scan the folder to get current files
        const files = await window.selectorAPI.scanDirectory(result.session.folder_path);
        const entries: PhotoEntry[] = files.map((f: any) => ({
          id: generatePhotoId(f.path),
          filePath: f.path,
          fileName: f.name,
          fileSize: f.size,
          format: f.extension,
          isRaw: f.isRaw,
          flag: 'unflagged' as const,
          rating: 0 as const,
          colorLabel: 'none' as const,
          exif: createEmptyExif(),
          thumbnailPath: null,
          histogram: null,
          sharpnessScore: null,
          sharpnessComputed: false,
        }));
        entries.sort((a, b) => a.fileName.localeCompare(b.fileName));
        setPhotos(entries);
        // Restore saved states
        importStates(result.states);
        showToast(`✓ Resumed: ${result.session.name}`, 'success');
        onClose();
      }
    } catch (err) {
      showToast('Failed to resume session', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (sessionId: string) => {
    await deleteSession(sessionId);
    setConfirmDelete(null);
    showToast('Session deleted', 'info');
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[480px] max-h-[70vh] bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Sessions</h2>
            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
              {sessions.length}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No saved sessions yet.</p>
              <p className="text-[10px] mt-1">Open a folder and start culling!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-lg border transition-all",
                    session.id === activeSessionId
                      ? "bg-blue-500/10 border-blue-500/20"
                      : "bg-zinc-800/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
                  )}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 bg-zinc-700/50 rounded-lg flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4 text-zinc-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white truncate">{session.name}</span>
                      {session.id === activeSessionId && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {session.folder_path}
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-zinc-600">
                      <span>{session.photo_count} photos</span>
                      <span>Updated {formatDate(session.updated_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {session.id !== activeSessionId && (
                      <button
                        onClick={() => handleResume(session.id)}
                        disabled={loadingId === session.id}
                        className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                        title="Resume session"
                      >
                        {loadingId === session.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    {confirmDelete === session.id ? (
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="px-2 py-1 text-[10px] text-red-400 bg-red-500/10 rounded-md hover:bg-red-500/20 transition-colors"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(session.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 text-[10px] text-zinc-600 text-center">
          Sessions are auto-saved every 30 seconds
        </div>
      </div>
    </div>
  );
}
