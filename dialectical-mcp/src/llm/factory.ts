import { LLMProvider, LLMConfig } from './types.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { MockProvider } from './providers/mock.js';

export class LLMFactory {
  static create(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'openai':
        if (!config.apiKey) {
          throw new Error('OpenAI provider requires an API key');
        }
        return new OpenAIProvider(config.apiKey, config.model, config.baseUrl);
        
      case 'anthropic':
        if (!config.apiKey) {
          throw new Error('Anthropic provider requires an API key');
        }
        return new AnthropicProvider(config.apiKey, config.model);
        
      case 'mock':
        return new MockProvider();
        
      default:
        throw new Error(`Unknown LLM provider: ${config.provider}`);
    }
  }
  
  static fromEnv(): LLMProvider {
    const provider = process.env.LLM_PROVIDER || 'mock';
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    const baseUrl = process.env.LLM_BASE_URL;
    
    return this.create({
      provider: provider as 'openai' | 'anthropic' | 'mock',
      apiKey,
      model,
      baseUrl,
    });
  }
}