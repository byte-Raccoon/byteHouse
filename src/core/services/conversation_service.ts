import { Database as DatabaseType } from 'better-sqlite3';
import { Conversation, Message } from '../db/schema.js';
import { AIProvider, AIMessage } from '../ai/provider.js';
import { ToolRegistry } from '../tools/tool_registry.js';
import { MemoryService } from '../memory/memory_service.js';
import crypto from 'crypto';

export type SystemPresenceState = 'idle' | 'listening' | 'thinking' | 'working';

export interface ChatResponse {
  conversation_id: string;
  response: string;
  tools_executed: Array<{ tool_name: string; output: any; status: string }>;
}

export class ConversationService {
  constructor(
    private db: DatabaseType,
    private aiProvider: AIProvider,
    private toolRegistry: ToolRegistry,
    private memoryService: MemoryService
  ) {}

  public getOrCreateConversation(id?: string): Conversation {
    if (id) {
      const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
      const conv = stmt.get(id) as Conversation | undefined;
      if (conv) return conv;
    }

    const newId = id || crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, created_at, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(newId, now, now);
    return { id: newId, created_at: now, updated_at: now };
  }

  public getMessages(conversationId: string, limit: number = 50): Message[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `);
    return stmt.all(conversationId, limit) as Message[];
  }

  public async chat(
    userPrompt: string,
    conversationId?: string,
    onStateChange?: (state: SystemPresenceState) => void
  ): Promise<ChatResponse> {
    const conv = this.getOrCreateConversation(conversationId);
    const now = new Date().toISOString();

    // 1. Save user message
    const userMsgId = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `).run(userMsgId, conv.id, userPrompt, now);

    onStateChange?.('thinking');

    // 2. Build context
    // Load recent conversation messages
    const history = this.getMessages(conv.id, 20);

    // Retrieve recent explicit memories for context awareness (Principle 2)
    const recentMemories = this.memoryService.recall(undefined, 5);
    let systemInstruction = `You are ByteHouse, a calm, personal AI operating layer and companion inspired by Friday/JARVIS.
Help the user manage their tasks, remember important facts, and answer questions.
Be concise, proactive when appropriate, but never intrusive.
Always use explicit tools for tasks and memories. Never hallucinate that an action was taken without running the tool.`;

    if (recentMemories.length > 0) {
      systemInstruction += `\n\nKnown memories about the user:\n` + recentMemories.map(m => `- ${m.content}`).join('\n');
    }

    // Format messages for provider
    const aiMessages: AIMessage[] = history.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const tools = this.toolRegistry.getToolDefinitions();
    const toolsExecuted: Array<{ tool_name: string; output: any; status: string }> = [];

    // 3. Initial generation call
    let response = await this.aiProvider.generate(aiMessages, {
      tools,
      systemInstruction,
    });

    // 4. Handle tool execution loop if requested
    if (response.tool_calls && response.tool_calls.length > 0) {
      onStateChange?.('working');

      // Record assistant call in conversation history for the provider
      aiMessages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls,
      });

      for (const call of response.tool_calls) {
        const result = await this.toolRegistry.executeTool(call.name, call.arguments);
        toolsExecuted.push({
          tool_name: call.name,
          output: result.output,
          status: result.status,
        });

        // Add tool response to provider context
        aiMessages.push({
          role: 'tool',
          name: call.name,
          content: JSON.stringify(result.output),
        });
      }

      // Final response after tools have executed
      onStateChange?.('thinking');
      response = await this.aiProvider.generate(aiMessages, {
        tools,
        systemInstruction,
      });
    }

    const finalContent = response.content || 'I completed that for you.';

    // 5. Persist assistant message
    const assistantMsgId = crypto.randomUUID();
    const finishedAt = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, ?)
    `).run(assistantMsgId, conv.id, finalContent, finishedAt);

    // Update conversation timestamp
    this.db.prepare(`
      UPDATE conversations SET updated_at = ? WHERE id = ?
    `).run(finishedAt, conv.id);

    onStateChange?.('idle');

    return {
      conversation_id: conv.id,
      response: finalContent,
      tools_executed: toolsExecuted,
    };
  }
}
