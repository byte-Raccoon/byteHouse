import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ByteHouseDatabase } from '../src/core/db/database.js';
import { MemoryService } from '../src/core/memory/memory_service.js';
import { TaskService } from '../src/core/tasks/task_service.js';
import { ToolRegistry } from '../src/core/tools/tool_registry.js';

describe('ToolRegistry', () => {
  let db: ByteHouseDatabase;
  let registry: ToolRegistry;

  beforeEach(() => {
    db = new ByteHouseDatabase(':memory:');
    const memoryService = new MemoryService(db.getRawDb());
    const taskService = new TaskService(db.getRawDb());
    registry = new ToolRegistry(db.getRawDb(), memoryService, taskService);
  });

  afterEach(() => {
    db.close();
  });

  it('provides explicit tool definitions with schemas', () => {
    const definitions = registry.getToolDefinitions();
    const toolNames = definitions.map(d => d.name);

    expect(toolNames).toContain('remember');
    expect(toolNames).toContain('recall');
    expect(toolNames).toContain('forget');
    expect(toolNames).toContain('create_task');
    expect(toolNames).toContain('list_tasks');
    expect(toolNames).toContain('complete_task');
  });

  it('executes remember tool and records tool trace', async () => {
    const result = await registry.executeTool('remember', {
      content: 'Server IP is 192.168.1.100',
    });

    expect(result.status).toBe('success');
    expect(result.output.memory.content).toBe('Server IP is 192.168.1.100');

    // Verify trace in SQLite
    const traces = db.getRawDb().prepare('SELECT * FROM tool_traces').all();
    expect(traces.length).toBe(1);
    expect((traces[0] as any).tool_name).toBe('remember');
  });

  it('handles unknown tool execution with error trace', async () => {
    const result = await registry.executeTool('unregistered_tool', {});
    expect(result.status).toBe('error');

    const traces = db.getRawDb().prepare('SELECT * FROM tool_traces').all();
    expect(traces.length).toBe(1);
    expect((traces[0] as any).status).toBe('error');
  });
});
