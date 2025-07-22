import OpenAI from 'openai';
import { LLMProvider, LLMRequest, LLMResponse } from '../types.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo-preview', baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.defaultModel = model;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: request.model || this.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens || 4096,
    });

    const choice = response.choices[0];
    
    return {
      content: choice.message.content || '',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined,
      model: response.model
    };
  }

  async *completeStream(request: LLMRequest): AsyncIterator<string> {
    const stream = await this.client.chat.completions.create({
      model: request.model || this.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens || 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}