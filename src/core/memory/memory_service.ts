import { Database as DatabaseType } from 'better-sqlite3';
import { Memory } from '../db/schema.js';
import crypto from 'crypto';

export class MemoryService {
  constructor(private db: DatabaseType) {}

  public remember(content: string, source: string = 'explicit'): Memory {
    if (!content || !content.trim()) {
      throw new Error('Memory content cannot be empty.');
    }

    const trimmed = content.trim();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO memories (id, content, source, user_confirmed, created_at)
      VALUES (?, ?, ?, 1, ?)
    `);
    stmt.run(id, trimmed, source, createdAt);

    return {
      id,
      content: trimmed,
      source,
      user_confirmed: 1,
      created_at: createdAt,
    };
  }

  public recall(query?: string, limit: number = 10): Memory[] {
    if (!query || !query.trim()) {
      const stmt = this.db.prepare(`
        SELECT * FROM memories
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(limit) as Memory[];
    }

    const searchTerm = `%${query.trim()}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM memories
      WHERE content LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(searchTerm, limit) as Memory[];
  }

  public forget(memoryId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    const result = stmt.run(memoryId);
    return result.changes > 0;
  }

  public list(limit: number = 50): Memory[] {
    const stmt = this.db.prepare(`
      SELECT * FROM memories
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Memory[];
  }
}
