export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

export interface LLMProvider {
  name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
  completeStream?(request: LLMRequest): AsyncIterator<string>;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'mock';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  defaultTemperature?: number;
  maxRetries?: number;
  timeout?: number;
}