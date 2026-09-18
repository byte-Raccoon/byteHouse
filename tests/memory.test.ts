import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ByteHouseDatabase } from '../src/core/db/database.js';
import { MemoryService } from '../src/core/memory/memory_service.js';

describe('MemoryService', () => {
  let db: ByteHouseDatabase;
  let service: MemoryService;

  beforeEach(() => {
    db = new ByteHouseDatabase(':memory:');
    service = new MemoryService(db.getRawDb());
  });

  afterEach(() => {
    db.close();
  });

  it('explicitly stores and lists memories', () => {
    const mem = service.remember('My favorite editor is Antigravity');
    expect(mem.id).toBeDefined();
    expect(mem.content).toBe('My favorite editor is Antigravity');
    expect(mem.source).toBe('explicit');
    expect(mem.user_confirmed).toBe(1);

    const list = service.list();
    expect(list.length).toBe(1);
    expect(list[0].content).toBe('My favorite editor is Antigravity');
  });

  it('recalls memories using keyword search', () => {
    service.remember('My email is joy@example.com');
    service.remember('Meeting at 3pm tomorrow');

    const recalled = service.recall('email');
    expect(recalled.length).toBe(1);
    expect(recalled[0].content).toContain('joy@example.com');
  });

  it('forgets/deletes a memory by ID', () => {
    const mem = service.remember('Temporary fact');
    expect(service.list().length).toBe(1);

    const deleted = service.forget(mem.id);
    expect(deleted).toBe(true);
    expect(service.list().length).toBe(0);
  });

  it('rejects empty memory content', () => {
    expect(() => service.remember('   ')).toThrow('Memory content cannot be empty.');
  });
});
