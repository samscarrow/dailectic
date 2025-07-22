import { LLMProvider } from '../llm/types.js';
import { Persona, CritiqueRequest, CritiqueResponse } from '../personas/types.js';
import { buildPersonaSystemPrompt, buildCritiqueUserPrompt } from '../tools/prompts.js';
import { ALL_PERSONAS } from '../personas/definitions.js';

export class CritiqueService {
  constructor(private llmProvider: LLMProvider) {}

  async getCritique(
    personaId: string,
    request: CritiqueRequest,
    context?: string
  ): Promise<CritiqueResponse> {
    const persona = ALL_PERSONAS[personaId];
    if (!persona) {
      throw new Error(`Unknown persona: ${personaId}`);
    }

    const systemPrompt = buildPersonaSystemPrompt(persona);
    const userPrompt = buildCritiqueUserPrompt(request.content, context);

    const llmResponse = await this.llmProvider.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      maxTokens: 2000
    });

    // Parse structured response if requested
    if (request.outputFormat === 'json' || request.outputFormat === 'structured') {
      try {
        const parsed = this.parseStructuredResponse(llmResponse.content, persona);
        return {
          persona: persona.name,
          critique: parsed.critique,
          suggestions: parsed.suggestions,
          concerns: parsed.concerns,
          alternatives: parsed.alternatives,
          metadata: parsed.metadata
        };
      } catch (e) {
        // Fallback to plain text
        return {
          persona: persona.name,
          critique: llmResponse.content
        };
      }
    }

    return {
      persona: persona.name,
      critique: llmResponse.content
    };
  }

  async getTeamDebate(
    request: CritiqueRequest,
    personaIds: string[] = ['helios', 'selene', 'prometheus', 'cassandra', 'gaia']
  ): Promise<CritiqueResponse[]> {
    // Execute all critiques in parallel
    const critiquePromises = personaIds.map(personaId =>
      this.getCritique(personaId, request, request.context)
    );

    const critiques = await Promise.all(critiquePromises);
    return critiques;
  }

  async getStreamingCritique(
    personaId: string,
    request: CritiqueRequest,
    context?: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const persona = ALL_PERSONAS[personaId];
    if (!persona) {
      throw new Error(`Unknown persona: ${personaId}`);
    }

    if (!this.llmProvider.completeStream) {
      throw new Error('LLM provider does not support streaming');
    }

    const systemPrompt = buildPersonaSystemPrompt(persona);
    const userPrompt = buildCritiqueUserPrompt(request.content, context);

    const stream = this.llmProvider.completeStream({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      maxTokens: 2000
    });

    for await (const chunk of stream) {
      onChunk(chunk);
    }
  }

  private parseStructuredResponse(content: string, persona: Persona): any {
    // Simple heuristic parsing - in production, you'd want more robust parsing
    const sections: any = {
      critique: '',
      suggestions: [],
      concerns: [],
      alternatives: [],
      metadata: {}
    };

    // Try to extract sections based on common headers
    const critiqueMatch = content.match(/(?:critique|analysis|review):\s*([\s\S]*?)(?=\n(?:suggestions|concerns|alternatives|$))/i);
    if (critiqueMatch) {
      sections.critique = critiqueMatch[1].trim();
    } else {
      sections.critique = content; // Fallback to entire content
    }

    // Extract suggestions
    const suggestionsMatch = content.match(/(?:suggestions|recommendations):\s*([\s\S]*?)(?=\n(?:concerns|alternatives|$))/i);
    if (suggestionsMatch) {
      sections.suggestions = suggestionsMatch[1]
        .split(/\n[-•*]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // Extract concerns
    const concernsMatch = content.match(/(?:concerns|risks|issues):\s*([\s\S]*?)(?=\n(?:alternatives|$))/i);
    if (concernsMatch) {
      sections.concerns = concernsMatch[1]
        .split(/\n[-•*]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // Determine severity based on persona and content
    if (persona.id === 'cassandra') {
      const criticalKeywords = ['critical', 'severe', 'dangerous', 'vulnerability'];
      const hassCritical = criticalKeywords.some(kw => 
        content.toLowerCase().includes(kw)
      );
      sections.metadata.severity = hassCritical ? 'critical' : 'high';
    }

    return sections;
  }
}