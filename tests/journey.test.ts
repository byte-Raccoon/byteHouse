import { describe, it, expect, afterAll } from 'vitest';
import { ByteHouseDatabase } from '../src/core/db/database.js';
import { MemoryService } from '../src/core/memory/memory_service.js';
import { TaskService } from '../src/core/tasks/task_service.js';
import { ToolRegistry } from '../src/core/tools/tool_registry.js';
import { MockAIProvider } from '../src/core/ai/mock_provider.js';
import { ConversationService } from '../src/core/services/conversation_service.js';
import fs from 'fs';
import path from 'path';

describe('Stage 0: End-to-End Validation Journey', () => {
  const testDbPath = path.join(process.cwd(), 'test_bytehouse_stage0.db');

  afterAll(() => {
    // Cleanup temporary test database files
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  it('completes the entire 10-step target user journey and verifies persistence', async () => {
    // -------------------------------------------------------------
    // Step 1: Open ByteHouse (Initialize system on persistent DB)
    // -------------------------------------------------------------
    let db = new ByteHouseDatabase(testDbPath);
    let memoryService = new MemoryService(db.getRawDb());
    let taskService = new TaskService(db.getRawDb());
    let toolRegistry = new ToolRegistry(db.getRawDb(), memoryService, taskService);
    let aiProvider = new MockAIProvider();
    let conversationService = new ConversationService(db.getRawDb(), aiProvider, toolRegistry, memoryService);

    // -------------------------------------------------------------
    // Step 2: Talk to ByteHouse
    // -------------------------------------------------------------
    let chatRes = await conversationService.chat('Hello ByteHouse!');
    expect(chatRes.conversation_id).toBeDefined();
    expect(chatRes.response).toContain('ByteHouse');
    const conversationId = chatRes.conversation_id;

    // -------------------------------------------------------------
    // Step 3: Explicitly ask ByteHouse to remember something
    // -------------------------------------------------------------
    chatRes = await conversationService.chat(
      'Remember that my primary email is joy@example.com',
      conversationId
    );
    expect(chatRes.tools_executed.length).toBe(1);
    expect(chatRes.tools_executed[0].tool_name).toBe('remember');
    expect(chatRes.response).toContain('joy@example.com');

    // -------------------------------------------------------------
    // Step 4: Verify memory is stored in SQLite
    // -------------------------------------------------------------
    const memoriesInDb = memoryService.list();
    expect(memoriesInDb.length).toBe(1);
    expect(memoriesInDb[0].content).toContain('joy@example.com');

    // -------------------------------------------------------------
    // Step 5: Ask ByteHouse to recall it
    // -------------------------------------------------------------
    chatRes = await conversationService.chat('What is my email?', conversationId);
    expect(chatRes.tools_executed.length).toBe(1);
    expect(chatRes.tools_executed[0].tool_name).toBe('recall');
    expect(chatRes.response).toContain('joy@example.com');

    // -------------------------------------------------------------
    // Step 6: Create a task using natural language
    // -------------------------------------------------------------
    chatRes = await conversationService.chat(
      'Add a task to review project specs by 5 PM',
      conversationId
    );
    expect(chatRes.tools_executed.length).toBe(1);
    expect(chatRes.tools_executed[0].tool_name).toBe('create_task');
    expect(chatRes.response).toContain('review project specs');

    // -------------------------------------------------------------
    // Step 7: List tasks
    // -------------------------------------------------------------
    chatRes = await conversationService.chat('What are my tasks?', conversationId);
    expect(chatRes.tools_executed.length).toBe(1);
    expect(chatRes.tools_executed[0].tool_name).toBe('list_tasks');
    expect(chatRes.response).toContain('review project specs');

    // -------------------------------------------------------------
    // Step 8: Complete a task
    // -------------------------------------------------------------
    chatRes = await conversationService.chat(
      'Complete the task review project specs',
      conversationId
    );
    expect(chatRes.tools_executed.length).toBe(1);
    expect(chatRes.tools_executed[0].tool_name).toBe('complete_task');
    expect(chatRes.response).toContain('completed');

    const tasksInDb = taskService.listTasks();
    expect(tasksInDb.length).toBe(1);
    expect(tasksInDb[0].status).toBe('completed');
    expect(tasksInDb[0].completed_at).not.toBeNull();

    // -------------------------------------------------------------
    // Step 9: Restart the application (Simulate process shutdown and restart)
    // -------------------------------------------------------------
    db.close();

    // Reopen with fresh database instance pointing to the exact same database file
    db = new ByteHouseDatabase(testDbPath);
    memoryService = new MemoryService(db.getRawDb());
    taskService = new TaskService(db.getRawDb());
    toolRegistry = new ToolRegistry(db.getRawDb(), memoryService, taskService);
    aiProvider = new MockAIProvider();
    conversationService = new ConversationService(db.getRawDb(), aiProvider, toolRegistry, memoryService);

    // -------------------------------------------------------------
    // Step 10: Verify persistent state remains available
    // -------------------------------------------------------------
    // A. Verify conversation & messages persisted
    const restoredMessages = conversationService.getMessages(conversationId);
    expect(restoredMessages.length).toBeGreaterThanOrEqual(10); // User prompts + assistant replies

    // B. Verify memories persisted
    const restoredMemories = memoryService.list();
    expect(restoredMemories.length).toBe(1);
    expect(restoredMemories[0].content).toContain('joy@example.com');

    // C. Verify tasks persisted with completed status
    const restoredTasks = taskService.listTasks();
    expect(restoredTasks.length).toBe(1);
    expect(restoredTasks[0].title).toContain('review project specs');
    expect(restoredTasks[0].status).toBe('completed');

    db.close();
  });
});
