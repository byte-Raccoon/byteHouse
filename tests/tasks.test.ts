import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ByteHouseDatabase } from '../src/core/db/database.js';
import { TaskService } from '../src/core/tasks/task_service.js';

describe('TaskService', () => {
  let db: ByteHouseDatabase;
  let service: TaskService;

  beforeEach(() => {
    db = new ByteHouseDatabase(':memory:');
    service = new TaskService(db.getRawDb());
  });

  afterEach(() => {
    db.close();
  });

  it('creates a new task with default pending status and priority', () => {
    const task = service.createTask({ title: 'Finish ByteHouse Stage 0' });
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Finish ByteHouse Stage 0');
    expect(task.status).toBe('pending');
    expect(task.priority).toBe('medium');
    expect(task.completed_at).toBeNull();
  });

  it('lists tasks with status filters', () => {
    const t1 = service.createTask({ title: 'Task 1' });
    const t2 = service.createTask({ title: 'Task 2' });
    service.completeTask(t1.id);

    const pending = service.listTasks({ status: 'pending' });
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(t2.id);

    const completed = service.listTasks({ status: 'completed' });
    expect(completed.length).toBe(1);
    expect(completed[0].id).toBe(t1.id);
  });

  it('completes a task and timestamps it', () => {
    const task = service.createTask({ title: 'Complete me' });
    const completed = service.completeTask(task.id);
    expect(completed).not.toBeNull();
    expect(completed!.status).toBe('completed');
    expect(completed!.completed_at).toBeDefined();
  });

  it('rejects empty task title', () => {
    expect(() => service.createTask({ title: '' })).toThrow('Task title cannot be empty.');
  });
});
