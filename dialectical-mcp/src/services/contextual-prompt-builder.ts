import { Persona } from '../personas/types.js';
import { ALL_PERSONAS } from '../personas/definitions.js';

export class ContextualPromptBuilder {
  
  /**
   * Analyzes content for keywords that trigger a persona's biases
   */
  private analyzeBiasTriggers(content: string, persona: Persona): {
    towardTriggers: string[];
    againstTriggers: string[];
  } {
    const towardTriggers: string[] = [];
    const againstTriggers: string[] = [];
    
    // Convert content to lowercase for case-insensitive matching
    const lowerContent = content.toLowerCase();
    
    // Check for bias triggers
    persona.biases.toward.forEach(bias => {
      const biasLower = bias.toLowerCase();
      if (lowerContent.includes(biasLower)) {
        towardTriggers.push(bias);
      }
    });
    
    persona.biases.against.forEach(bias => {
      const biasLower = bias.toLowerCase();
      if (lowerContent.includes(biasLower)) {
        againstTriggers.push(bias);
      }
    });
    
    // Special pattern matching for common triggers
    const patterns = {
      'TODO': /\/\/\s*TODO:?|#\s*TODO:?/gi,
      'FIXME': /\/\/\s*FIXME:?|#\s*FIXME:?/gi,
      'HACK': /\/\/\s*HACK:?|#\s*HACK:?/gi,
      'globalState': /global\s+(state|variable|config)/gi,
      'magicNumber': /\b\d+\b(?!\s*[;,)])/g, // Numbers not immediately followed by punctuation
      'callback': /callback|cb\(/gi,
      'promise': /promise|async|await/gi,
      'class': /class\s+\w+/gi,
      'function': /function\s+\w+/gi,
      'var': /\bvar\s+/gi,
    };
    
    Object.entries(patterns).forEach(([trigger, pattern]) => {
      if (pattern.test(content)) {
        // Map common patterns to persona biases
        if (persona.id === 'selene' && ['TODO', 'FIXME', 'HACK', 'magicNumber', 'globalState'].includes(trigger)) {
          againstTriggers.push(`${trigger} pattern detected`);
        }
        if (persona.id === 'helios' && trigger === 'class' && content.includes('Factory')) {
          againstTriggers.push('Abstract Factory pattern');
        }
        if (persona.id === 'prometheus' && ['callback', 'var'].includes(trigger)) {
          againstTriggers.push('Legacy patterns detected');
        }
      }
    });
    
    return { towardTriggers, againstTriggers };
  }
  
  /**
   * Builds context for sequential debates with relationship awareness
   */
  async buildSequentialContext(
    currentPersonaId: string,
    content: string,
    previousCritiques: Map<string, string>,
    previousPersonaIds?: string[]
  ): Promise<string> {
    const currentPersona = ALL_PERSONAS[currentPersonaId];
    if (!currentPersona) throw new Error(`Unknown persona: ${currentPersonaId}`);
    
    let context = '';
    
    // Add bias trigger analysis
    const { towardTriggers, againstTriggers } = this.analyzeBiasTriggers(content, currentPersona);
    
    if (towardTriggers.length > 0) {
      context += `\nNote: The code contains elements you are biased TOWARD: ${towardTriggers.join(', ')}. `;
      context += `While you appreciate these, ensure your critique remains balanced.\n`;
    }
    
    if (againstTriggers.length > 0) {
      context += `\nImportant: The code contains elements you are biased AGAINST: ${againstTriggers.join(', ')}. `;
      context += `Address these directly in your critique, explaining why they concern you from your perspective.\n`;
    }
    
    // Add relationship context if this is a sequential critique
    if (previousPersonaIds && previousPersonaIds.length > 0 && currentPersona.interlocutorRelationships) {
      context += `\n## Previous Critiques to Consider\n\n`;
      
      previousPersonaIds.forEach(prevId => {
        const prevCritique = previousCritiques.get(prevId);
        const relationship = currentPersona.interlocutorRelationships[prevId];
        
        if (prevCritique && relationship) {
          context += `### Response to ${prevId.toUpperCase()}'s critique\n`;
          context += `Your perspective on ${prevId}: "${relationship}"\n`;
          context += `Keep this relationship in mind as you review their critique and formulate your response.\n\n`;
        }
      });
    }
    
    return context;
  }
  
  /**
   * Builds context for targeted rebuttals between specific personas
   */
  async buildRebuttalContext(
    rebuttingPersonaId: string,
    targetPersonaId: string,
    originalContent: string,
    targetCritique: string
  ): Promise<string> {
    const rebuttingPersona = ALL_PERSONAS[rebuttingPersonaId];
    const targetPersona = ALL_PERSONAS[targetPersonaId];
    
    if (!rebuttingPersona || !targetPersona) {
      throw new Error('Invalid persona IDs');
    }
    
    let context = `## Direct Rebuttal Task\n\n`;
    context += `You are directly responding to ${targetPersona.name}'s critique.\n`;
    
    // Add relationship context if available
    if (rebuttingPersona.interlocutorRelationships?.[targetPersonaId]) {
      context += `\nYour perspective on ${targetPersona.name}: "${rebuttingPersona.interlocutorRelationships[targetPersonaId]}"\n`;
      context += `Frame your rebuttal through this lens.\n`;
    }
    
    // Add value conflicts
    const valueConflicts = this.identifyValueConflicts(rebuttingPersona, targetPersona);
    if (valueConflicts.length > 0) {
      context += `\n### Value Conflicts\n`;
      context += `You and ${targetPersona.name} have conflicting values on: ${valueConflicts.join(', ')}\n`;
      context += `Address these fundamental differences in your rebuttal.\n`;
    }
    
    context += `\n### ${targetPersona.name}'s Critique to Rebut:\n`;
    context += `${targetCritique}\n\n`;
    context += `Provide a thoughtful rebuttal from your perspective, challenging their assumptions while staying true to your own principles.`;
    
    return context;
  }
  
  /**
   * Identifies conflicting values between two personas
   */
  private identifyValueConflicts(persona1: Persona, persona2: Persona): string[] {
    const conflicts: string[] = [];
    
    // Check if one values what the other is biased against
    persona1.biases.toward.forEach(bias => {
      if (persona2.biases.against.some(against => 
        against.toLowerCase().includes(bias.toLowerCase()) ||
        bias.toLowerCase().includes(against.toLowerCase())
      )) {
        conflicts.push(bias);
      }
    });
    
    // Check for direct value oppositions
    const valueOpposites: Record<string, string[]> = {
      'Simplicity': ['Complexity', 'Sophistication'],
      'Velocity': ['Thoroughness', 'Perfection'],
      'Innovation': ['Stability', 'Proven Solutions'],
      'Security': ['Openness', 'Trust'],
      'Flexibility': ['Consistency', 'Standards'],
    };
    
    persona1.values.forEach(value1 => {
      const opposites = valueOpposites[value1] || [];
      persona2.values.forEach(value2 => {
        if (opposites.includes(value2) || valueOpposites[value2]?.includes(value1)) {
          conflicts.push(`${value1} vs ${value2}`);
        }
      });
    });
    
    return [...new Set(conflicts)]; // Remove duplicates
  }
  
  /**
   * Builds audit-specific context
   */
  async buildAuditContext(
    personaId: string,
    content: string,
    auditType: 'security' | 'architecture' | 'ux'
  ): Promise<string> {
    const persona = ALL_PERSONAS[personaId];
    if (!persona) throw new Error(`Unknown persona: ${personaId}`);
    
    let context = `## ${auditType.toUpperCase()} AUDIT REQUEST\n\n`;
    
    // Add audit-specific instructions based on type
    switch (auditType) {
      case 'security':
        context += `Perform a comprehensive security audit focusing on:\n`;
        context += `- Authentication and authorization vulnerabilities\n`;
        context += `- Input validation and sanitization\n`;
        context += `- Data exposure and leakage risks\n`;
        context += `- Injection vulnerabilities (SQL, XSS, etc.)\n`;
        context += `- Configuration and deployment security\n\n`;
        break;
        
      case 'architecture':
        context += `Perform a detailed architectural review focusing on:\n`;
        context += `- SOLID principle violations\n`;
        context += `- Coupling and cohesion issues\n`;
        context += `- Scalability bottlenecks\n`;
        context += `- Missing abstractions or over-engineering\n`;
        context += `- Technical debt accumulation\n\n`;
        break;
        
      case 'ux':
        context += `Perform a thorough UX/DX audit focusing on:\n`;
        context += `- API intuitiveness and consistency\n`;
        context += `- Error message clarity and helpfulness\n`;
        context += `- Documentation completeness\n`;
        context += `- Onboarding experience\n`;
        context += `- Accessibility compliance\n\n`;
        break;
    }
    
    // Add structured output requirement if schema exists
    if (persona.structuredOutputSchema) {
      context += `IMPORTANT: Return your findings in the following JSON format:\n`;
      context += `${JSON.stringify(persona.structuredOutputSchema, null, 2)}\n\n`;
    }
    
    return context;
  }
}