export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  sideEffects: string;
}

export interface ToolExecutionResult {
  tool_name: string;
  input: Record<string, any>;
  output: Record<string, any>;
  status: 'success' | 'error';
  error?: string;
}

export interface ToolHandler {
  definition: ToolDefinition;
  execute(input: Record<string, any>): Promise<Record<string, any>> | Record<string, any>;
}
