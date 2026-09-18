import { ToolDefinition } from '../tools/contracts.js';

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: AIToolCall[];
  name?: string;
}

export interface AIGenerateOptions {
  tools?: ToolDefinition[];
  systemInstruction?: string;
  temperature?: number;
}

export interface AIGenerateResponse {
  content: string;
  tool_calls?: AIToolCall[];
}

export interface AIProvider {
  name: string;
  generate(messages: AIMessage[], options?: AIGenerateOptions): Promise<AIGenerateResponse>;
}
