import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

// ═══════════════════════════════════════════
// Selector — Session Service (Main Process)
// SQLite-backed session persistence
// ═══════════════════════════════════════════

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'selector.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      folder_path TEXT NOT NULL,
      photo_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photo_states (
      session_id TEXT NOT NULL,
      photo_id TEXT NOT NULL,
      flag TEXT DEFAULT 'unflagged',
      rating INTEGER DEFAULT 0,
      color_label TEXT DEFAULT 'none',
      PRIMARY KEY (session_id, photo_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// ── Session CRUD ──

export function createSession(name: string, folderPath: string): string {
  const d = getDb();
  const id = generateSessionId();
  d.prepare('INSERT INTO sessions (id, name, folder_path) VALUES (?, ?, ?)').run(id, name, folderPath);
  return id;
}

export function getSession(sessionId: string): any | null {
  const d = getDb();
  return d.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) ?? null;
}

export function listSessions(): any[] {
  const d = getDb();
  return d.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all();
}

export function deleteSession(sessionId: string): void {
  const d = getDb();
  d.prepare('DELETE FROM photo_states WHERE session_id = ?').run(sessionId);
  d.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function updateSessionTimestamp(sessionId: string): void {
  const d = getDb();
  d.prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(sessionId);
}

// ── Photo State Persistence ──

export function savePhotoStates(
  sessionId: string,
  states: { id: string; flag: string; rating: number; colorLabel: string }[]
): void {
  const d = getDb();

  const upsert = d.prepare(`
    INSERT OR REPLACE INTO photo_states (session_id, photo_id, flag, rating, color_label)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = d.transaction((items: typeof states) => {
    for (const s of items) {
      upsert.run(sessionId, s.id, s.flag, s.rating, s.colorLabel);
    }
  });

  transaction(states);
  updateSessionTimestamp(sessionId);

  // Update photo count
  d.prepare('UPDATE sessions SET photo_count = ? WHERE id = ?').run(states.length, sessionId);
}

export function loadPhotoStates(
  sessionId: string
): { id: string; flag: string; rating: number; colorLabel: string }[] {
  const d = getDb();
  const rows = d.prepare(
    'SELECT photo_id as id, flag, rating, color_label as colorLabel FROM photo_states WHERE session_id = ?'
  ).all(sessionId);
  return rows as any;
}

// ── Settings ──

export function getSetting(key: string): string | null {
  const d = getDb();
  const row = d.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const d = getDb();
  d.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// ── Cleanup ──

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ── Helpers ──

function generateSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
