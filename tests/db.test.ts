import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ByteHouseDatabase } from '../src/core/db/database.js';

describe('ByteHouse Database', () => {
  let db: ByteHouseDatabase;

  beforeEach(() => {
    db = new ByteHouseDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('initializes all core tables correctly', () => {
    const raw = db.getRawDb();
    const tables = raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row: any) => row.name);

    expect(tables).toContain('conversations');
    expect(tables).toContain('messages');
    expect(tables).toContain('memories');
    expect(tables).toContain('tasks');
    expect(tables).toContain('tool_traces');
  });

  it('enforces foreign key constraints between messages and conversations', () => {
    const raw = db.getRawDb();
    expect(() => {
      raw.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES ('m1', 'nonexistent', 'user', 'hello', '2026-09-18')
      `).run();
    }).toThrow();
  });
});
