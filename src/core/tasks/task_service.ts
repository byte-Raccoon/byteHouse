import { Database as DatabaseType } from 'better-sqlite3';
import { Task } from '../db/schema.js';
import crypto from 'crypto';

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  due_at?: string;
}

export interface ListTasksFilter {
  status?: 'pending' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  limit?: number;
}

export class TaskService {
  constructor(private db: DatabaseType) {}

  public createTask(input: CreateTaskInput): Task {
    if (!input.title || !input.title.trim()) {
      throw new Error('Task title cannot be empty.');
    }

    const id = crypto.randomUUID();
    const title = input.title.trim();
    const description = input.description ? input.description.trim() : null;
    const priority = input.priority || 'medium';
    const dueAt = input.due_at || null;
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, due_at, completed_at, created_at)
      VALUES (?, ?, ?, 'pending', ?, ?, NULL, ?)
    `);
    stmt.run(id, title, description, priority, dueAt, createdAt);

    return {
      id,
      title,
      description,
      status: 'pending',
      priority,
      due_at: dueAt,
      completed_at: null,
      created_at: createdAt,
    };
  }

  public listTasks(filter?: ListTasksFilter): Task[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    if (filter?.priority) {
      conditions.push('priority = ?');
      params.push(filter.priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter?.limit || 50;
    params.push(limit);

    const query = `
      SELECT * FROM tasks
      ${whereClause}
      ORDER BY 
        CASE status WHEN 'pending' THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT ?
    `;

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Task[];
  }

  public completeTask(taskId: string): Task | null {
    const completedAt = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE tasks
      SET status = 'completed', completed_at = ?
      WHERE id = ?
    `);
    const result = stmt.run(completedAt, taskId);

    if (result.changes === 0) {
      return null;
    }

    return this.getTask(taskId);
  }

  public getTask(taskId: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(taskId);
    return (row as Task) || null;
  }

  public deleteTask(taskId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(taskId);
    return result.changes > 0;
  }
}
