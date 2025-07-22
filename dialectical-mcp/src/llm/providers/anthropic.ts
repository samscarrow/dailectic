import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMRequest, LLMResponse } from '../types.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, model: string = 'claude-3-sonnet-20240229') {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');

    const response = await this.client.messages.create({
      model: request.model || this.defaultModel,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    });

    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return {
      content: textContent,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      },
      model: response.model
    };
  }

  async *completeStream(request: LLMRequest): AsyncIterator<string> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');

    const stream = await this.client.messages.create({
      model: request.model || this.defaultModel,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}