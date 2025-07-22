import { LLMProvider, LLMRequest, LLMResponse } from '../types.js';

export class MockProvider implements LLMProvider {
  name = 'mock';
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const systemPrompt = request.messages.find(m => m.role === 'system')?.content || '';
    const userPrompt = request.messages.find(m => m.role === 'user')?.content || '';
    
    // Generate a mock response based on the persona in the system prompt
    let personaName = 'Unknown';
    let mockResponse = '';
    
    if (systemPrompt.includes('Helios')) {
      personaName = 'Helios';
      mockResponse = `Just use a simple for loop here. No need to overcomplicate it. Here's what I'd do:\n\n\`\`\`javascript\nfor (let i = 0; i < items.length; i++) {\n  process(items[i]);\n}\n\`\`\`\n\nShip it and move on.`;
    } else if (systemPrompt.includes('Selene')) {
      personaName = 'Selene';
      mockResponse = `This code violates the Single Responsibility Principle. We need proper separation of concerns:\n\n1. Extract the processing logic into a dedicated service\n2. Implement proper dependency injection\n3. Add comprehensive error handling\n4. Consider the future scalability requirements\n\nLet me propose a more maintainable architecture...`;
    } else if (systemPrompt.includes('Prometheus')) {
      personaName = 'Prometheus';
      mockResponse = `Why are we even doing this synchronously? Have you considered:\n\n1. WebAssembly for performance-critical sections?\n2. A completely event-driven architecture?\n3. Perhaps we should rethink the entire approach using actor model?\n\nThere's a fascinating paper on lock-free data structures that could revolutionize this...`;
    } else if (systemPrompt.includes('Cassandra')) {
      personaName = 'Cassandra';
      mockResponse = `I see several critical issues:\n\n🚨 **Security Vulnerabilities:**\n- No input validation\n- Potential for injection attacks\n- Missing rate limiting\n\n⚠️ **Failure Modes:**\n- What happens when the service is unavailable?\n- No timeout handling\n- Memory leak potential in the event listener\n\nWe need to address these before this touches production.`;
    } else if (systemPrompt.includes('Gaia')) {
      personaName = 'Gaia';
      mockResponse = `From a user perspective, this is confusing:\n\n1. The error messages are cryptic - users won't understand "ECONNREFUSED"\n2. No loading indicators - users will think it's frozen\n3. The API naming is inconsistent with the rest of the codebase\n4. We need better documentation explaining why this exists\n\nLet's make this more developer-friendly...`;
    } else if (systemPrompt.includes('Synthesizer')) {
      mockResponse = `## Synthesis of All Perspectives\n\n**Core Insights:**\n- Helios: Keep it simple and shippable\n- Selene: Ensure proper architecture\n- Prometheus: Consider innovative approaches\n- Cassandra: Address security and failure modes\n- Gaia: Prioritize user experience\n\n**Final Solution:**\nA pragmatic approach that balances all concerns...`;
    } else {
      mockResponse = `Mock response for: ${userPrompt.substring(0, 50)}...`;
    }
    
    return {
      content: mockResponse,
      usage: {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250
      },
      model: 'mock-model'
    };
  }

  async *completeStream(request: LLMRequest): AsyncIterator<string> {
    const response = await this.complete(request);
    const words = response.content.split(' ');
    
    for (const word of words) {
      yield word + ' ';
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming
    }
  }
}