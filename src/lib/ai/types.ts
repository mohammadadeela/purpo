export type AiTaskClass = "intent" | "architecture" | "code" | "review" | "image" | "video" | "vision";

export type JsonSchema = Record<string, unknown>;

export type AiRequestInput = {
  taskClass: AiTaskClass;
  system: string;
  prompt: string;
  schema?: JsonSchema;
  schemaName?: string;
  projectId?: string;
};

export type AiResult = {
  text: string;
  provider: string;
  model: string;
  requestId?: string;
  inputTokens?: number;
  outputTokens?: number;
};

export interface AiProviderAdapter {
  key: string;
  supports(task: AiTaskClass): boolean;
  generate(input: AiRequestInput, model: string): Promise<AiResult>;
}
