import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../database.db'));

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT DEFAULT 'uploading',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS captions (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    segment_index INTEGER NOT NULL,
    start_time REAL NOT NULL,
    end_time REAL NOT NULL,
    text TEXT NOT NULL,
    confidence REAL DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_captions_video_id ON captions(video_id);
  CREATE INDEX IF NOT EXISTS idx_captions_segment_index ON captions(video_id, segment_index);
`);

export interface Video {
  id: string;
  filename: string;
  filepath: string;
  file_size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  created_at: number;
}

export interface Caption {
  id: string;
  video_id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  text: string;
  confidence: number;
  created_at: number;
}

// Video operations
export function createVideo(video: Omit<Video, 'created_at'>): Video {
  const stmt = db.prepare(`
    INSERT INTO videos (id, filename, filepath, file_size, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(video.id, video.filename, video.filepath, video.file_size, video.status);

  return getVideo(video.id)!;
}

export function getVideo(id: string): Video | undefined {
  const stmt = db.prepare('SELECT * FROM videos WHERE id = ?');
  return stmt.get(id) as Video | undefined;
}

export function updateVideoStatus(id: string, status: Video['status']): void {
  const stmt = db.prepare('UPDATE videos SET status = ? WHERE id = ?');
  stmt.run(status, id);
}

// Caption operations
export function createCaption(caption: Omit<Caption, 'created_at'>): Caption {
  const stmt = db.prepare(`
    INSERT INTO captions (id, video_id, segment_index, start_time, end_time, text, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    caption.id,
    caption.video_id,
    caption.segment_index,
    caption.start_time,
    caption.end_time,
    caption.text,
    caption.confidence
  );

  return getCaption(caption.id)!;
}

export function getCaption(id: string): Caption | undefined {
  const stmt = db.prepare('SELECT * FROM captions WHERE id = ?');
  return stmt.get(id) as Caption | undefined;
}

export function getCaptionsByVideoId(videoId: string): Caption[] {
  const stmt = db.prepare('SELECT * FROM captions WHERE video_id = ? ORDER BY segment_index ASC');
  return stmt.all(videoId) as Caption[];
}

export function updateCaption(id: string, text: string): Caption | undefined {
  const stmt = db.prepare('UPDATE captions SET text = ? WHERE id = ?');
  stmt.run(text, id);
  return getCaption(id);
}

export function deleteCaptionsByVideoId(videoId: string): void {
  const stmt = db.prepare('DELETE FROM captions WHERE video_id = ?');
  stmt.run(videoId);
}

export default db;
