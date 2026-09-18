import { AIProvider, AIMessage, AIGenerateOptions, AIGenerateResponse } from './provider.js';
import crypto from 'crypto';

export class MockAIProvider implements AIProvider {
  public name = 'mock';

  public async generate(messages: AIMessage[], options?: AIGenerateOptions): Promise<AIGenerateResponse> {
    const lastMessage = messages[messages.length - 1];

    // Case 1: The model receives the tool result
    if (lastMessage && lastMessage.role === 'tool') {
      try {
        const parsed = JSON.parse(lastMessage.content);
        if (lastMessage.name === 'remember') {
          return {
            content: `I've noted that down: "${parsed.memory?.content || 'stored'}". I'll remember this for you.`,
          };
        }
        if (lastMessage.name === 'recall') {
          if (!parsed.memories || parsed.memories.length === 0) {
            return {
              content: "I searched my memory, but I don't have any record of that yet.",
            };
          }
          const memoriesList = parsed.memories.map((m: any) => `• ${m.content}`).join('\n');
          return {
            content: `Here is what I remember:\n${memoriesList}`,
          };
        }
        if (lastMessage.name === 'create_task') {
          return {
            content: `I've created the task: "${parsed.task?.title}" (Priority: ${parsed.task?.priority || 'medium'}).`,
          };
        }
        if (lastMessage.name === 'list_tasks') {
          if (!parsed.tasks || parsed.tasks.length === 0) {
            return {
              content: 'You have no active tasks right now.',
            };
          }
          const taskList = parsed.tasks
            .map((t: any) => `[${t.status === 'completed' ? 'x' : ' '}] ${t.title} (${t.priority})`)
            .join('\n');
          return {
            content: `Here are your tasks:\n${taskList}`,
          };
        }
        if (lastMessage.name === 'complete_task') {
          return {
            content: `Great job! I've marked "${parsed.task?.title}" as completed.`,
          };
        }
        if (lastMessage.name === 'forget') {
          return {
            content: 'I have removed that memory from my records.',
          };
        }
        return {
          content: `Action completed successfully.`,
        };
      } catch {
        return { content: 'Operation finished.' };
      }
    }

    // Case 2: User prompt - detect tool invocation intent
    const text = (lastMessage?.content || '').toLowerCase();

    // Check for "remember"
    const rememberMatch = lastMessage?.content.match(/(?:please\s+)?remember\s+(?:that\s+)?(.+)/i);
    if (rememberMatch && options?.tools?.some(t => t.name === 'remember')) {
      return {
        content: '',
        tool_calls: [
          {
            id: crypto.randomUUID(),
            name: 'remember',
            arguments: { content: rememberMatch[1].trim() },
          },
        ],
      };
    }

    // Check for "recall" / "what do you remember" / "what is my" / "do you remember"
    if (
      (text.includes('recall') || text.includes('what is my') || text.includes('what do you remember') || text.includes('do you remember')) &&
      options?.tools?.some(t => t.name === 'recall')
    ) {
      let query = '';
      if (text.includes('recall')) {
        query = text.split('recall')[1]?.trim() || '';
      } else if (text.includes('what is my')) {
        query = text.split('what is my')[1]?.replace(/\?/g, '').trim() || '';
      }
      return {
        content: '',
        tool_calls: [
          {
            id: crypto.randomUUID(),
            name: 'recall',
            arguments: { query },
          },
        ],
      };
    }

    // Check for "create task" / "add task" / "todo"
    const taskMatch = lastMessage?.content.match(/(?:add|create)\s+(?:a\s+)?task\s+(?:to\s+)?(.+)/i);
    if (taskMatch && options?.tools?.some(t => t.name === 'create_task')) {
      const taskText = taskMatch[1].trim();
      let priority: 'low' | 'medium' | 'high' = 'medium';
      if (taskText.toLowerCase().includes('urgent') || taskText.toLowerCase().includes('high priority')) {
        priority = 'high';
      }
      return {
        content: '',
        tool_calls: [
          {
            id: crypto.randomUUID(),
            name: 'create_task',
            arguments: { title: taskText, priority },
          },
        ],
      };
    }

    // Check for "list tasks" / "show tasks" / "what are my tasks"
    if (
      (text.includes('list tasks') || text.includes('show tasks') || text.includes('what are my tasks') || text.includes('my tasks')) &&
      options?.tools?.some(t => t.name === 'list_tasks')
    ) {
      return {
        content: '',
        tool_calls: [
          {
            id: crypto.randomUUID(),
            name: 'list_tasks',
            arguments: { status: 'pending' },
          },
        ],
      };
    }

    // Check for "complete task" / "mark task done" / "finish task"
    const completeMatch = lastMessage?.content.match(/(?:complete|finish|mark\s+as\s+done)\s+(?:the\s+)?task\s+(.+)/i);
    if (completeMatch && options?.tools?.some(t => t.name === 'complete_task')) {
      return {
        content: '',
        tool_calls: [
          {
            id: crypto.randomUUID(),
            name: 'complete_task',
            arguments: { task_title: completeMatch[1].trim() },
          },
        ],
      };
    }

    // Default conversational response
    if (text.includes('hello') || text.includes('hi')) {
      return {
        content: "Hello! I'm ByteHouse, your personal companion. How can I help you today?",
      };
    }

    return {
      content: `I'm ByteHouse. You can ask me to remember facts, recall information, or manage your tasks.`,
    };
  }
}
