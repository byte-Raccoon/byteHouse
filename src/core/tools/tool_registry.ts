import { Database as DatabaseType } from 'better-sqlite3';
import { ToolDefinition, ToolHandler, ToolExecutionResult } from './contracts.js';
import { MemoryService } from '../memory/memory_service.js';
import { TaskService } from '../tasks/task_service.js';
import crypto from 'crypto';

export class ToolRegistry {
  private tools: Map<string, ToolHandler> = new Map();

  constructor(
    private db: DatabaseType,
    private memoryService: MemoryService,
    private taskService: TaskService
  ) {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    // 1. remember
    this.register({
      definition: {
        name: 'remember',
        description: 'Explicitly store a memory or fact about the user or preferences for long-term recall.',
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The exact fact or piece of information to remember.',
            },
          },
          required: ['content'],
        },
        sideEffects: 'Inserts an explicit memory into the permanent database.',
      },
      execute: async (input) => {
        const memory = this.memoryService.remember(input.content);
        return { success: true, memory };
      },
    });

    // 2. recall
    this.register({
      definition: {
        name: 'recall',
        description: 'Search and retrieve explicit memories stored by the user.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keywords or search terms to recall memories. Leave empty to recall recent memories.',
            },
          },
        },
        sideEffects: 'Reads memory entries from database.',
      },
      execute: async (input) => {
        const memories = this.memoryService.recall(input.query);
        return { count: memories.length, memories };
      },
    });

    // 3. forget
    this.register({
      definition: {
        name: 'forget',
        description: 'Remove/delete a specific stored memory by its ID.',
        parameters: {
          type: 'object',
          properties: {
            memory_id: {
              type: 'string',
              description: 'The unique ID of the memory to delete.',
            },
          },
          required: ['memory_id'],
        },
        sideEffects: 'Deletes a memory record from the database.',
      },
      execute: async (input) => {
        const deleted = this.memoryService.forget(input.memory_id);
        return { success: deleted, memory_id: input.memory_id };
      },
    });

    // 4. create_task
    this.register({
      definition: {
        name: 'create_task',
        description: 'Create a new personal todo or task for the user.',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title/description of the task.',
            },
            description: {
              type: 'string',
              description: 'Optional additional details about the task.',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority level. Default is medium.',
            },
            due_at: {
              type: 'string',
              description: 'Optional due date/time (e.g. ISO string or human-readable format).',
            },
          },
          required: ['title'],
        },
        sideEffects: 'Inserts a new task record into the database.',
      },
      execute: async (input) => {
        const task = this.taskService.createTask({
          title: input.title,
          description: input.description,
          priority: input.priority,
          due_at: input.due_at,
        });
        return { success: true, task };
      },
    });

    // 5. list_tasks
    this.register({
      definition: {
        name: 'list_tasks',
        description: 'Retrieve user tasks, optionally filtered by status (pending/completed).',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'cancelled'],
              description: 'Filter by task status.',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Filter by task priority.',
            },
          },
        },
        sideEffects: 'Reads task records from the database.',
      },
      execute: async (input) => {
        const tasks = this.taskService.listTasks({
          status: input.status,
          priority: input.priority,
        });
        return { count: tasks.length, tasks };
      },
    });

    // 6. complete_task
    this.register({
      definition: {
        name: 'complete_task',
        description: 'Mark an existing task as completed by task ID or title.',
        parameters: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'The unique ID of the task to complete.',
            },
            task_title: {
              type: 'string',
              description: 'If task_id is unknown, match against task title.',
            },
          },
        },
        sideEffects: 'Updates task status to completed and records completion timestamp.',
      },
      execute: async (input) => {
        let taskId = input.task_id;
        if (!taskId && input.task_title) {
          const matching = this.taskService.listTasks({ status: 'pending' }).find(
            t => t.title.toLowerCase().includes(input.task_title.toLowerCase())
          );
          if (matching) {
            taskId = matching.id;
          }
        }

        if (!taskId) {
          throw new Error('Task ID or matching task title is required to complete a task.');
        }

        const task = this.taskService.completeTask(taskId);
        if (!task) {
          throw new Error(`Task with ID ${taskId} not found.`);
        }

        return { success: true, task };
      },
    });
  }

  public register(handler: ToolHandler): void {
    this.tools.set(handler.definition.name, handler);
  }

  public getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(h => h.definition);
  }

  public async executeTool(name: string, input: Record<string, any>): Promise<ToolExecutionResult> {
    const handler = this.tools.get(name);
    if (!handler) {
      const errorMsg = `Unknown tool: ${name}`;
      this.recordTrace(name, input, { error: errorMsg }, 'error');
      return {
        tool_name: name,
        input,
        output: { error: errorMsg },
        status: 'error',
        error: errorMsg,
      };
    }

    try {
      const output = await handler.execute(input);
      this.recordTrace(name, input, output, 'success');
      return {
        tool_name: name,
        input,
        output,
        status: 'success',
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Tool execution failed';
      this.recordTrace(name, input, { error: errorMsg }, 'error');
      return {
        tool_name: name,
        input,
        output: { error: errorMsg },
        status: 'error',
        error: errorMsg,
      };
    }
  }

  private recordTrace(
    toolName: string,
    input: Record<string, any>,
    output: Record<string, any>,
    status: 'success' | 'error'
  ): void {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO tool_traces (id, tool_name, input, output, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, toolName, JSON.stringify(input), JSON.stringify(output), status, createdAt);
  }
}
