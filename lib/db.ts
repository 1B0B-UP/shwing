import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'shwing.db')
  : path.join(process.cwd(), 'shwing.db');

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    initSchema(db);
  }
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`PRAGMA journal_mode = WAL`);
  db.exec(`PRAGMA foreign_keys = ON`);
  db.exec(`PRAGMA busy_timeout = 5000`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS anchors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_name TEXT NOT NULL,
      artist TEXT,
      anchor_type TEXT NOT NULL,
      anchor_value TEXT NOT NULL,
      anchor_detail TEXT,
      personal_note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      total_drills INTEGER DEFAULT 0,
      correct_drills INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS drill_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES sessions(id),
      drill_type TEXT NOT NULL,
      target TEXT NOT NULL,
      user_answer TEXT,
      correct INTEGER NOT NULL,
      response_time_ms INTEGER,
      input_method TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sm2_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drill_type TEXT NOT NULL,
      target TEXT NOT NULL,
      ease_factor REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 1,
      repetitions INTEGER DEFAULT 0,
      due_date TEXT DEFAULT (date('now')),
      UNIQUE(drill_type, target)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_drill_results_created_at ON drill_results(created_at);
    CREATE INDEX IF NOT EXISTS idx_drill_results_target ON drill_results(drill_type, target);
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sm2_cards_due ON sm2_cards(due_date, ease_factor);
  `);

  const intervals = ['m2','M2','m3','M3','P4','TT','P5','m6','M6','m7','M7','P8'];
  const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const chords = ['major','minor','dom7','maj7','min7','dim','aug'];
  const keys = [
    'C major','G major','D major','A major','E major','B major','F# major',
    'C minor','G minor','D minor','A minor','E minor'
  ];

  const insertCard = db.prepare('INSERT OR IGNORE INTO sm2_cards (drill_type, target) VALUES (?, ?)');
  for (const i of intervals) insertCard.run('interval', i);
  for (const n of notes) insertCard.run('note', n);
  for (const c of chords) insertCard.run('chord', c);
  for (const k of keys) insertCard.run('key', k);
}
