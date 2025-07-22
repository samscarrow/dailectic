import { Persona } from '../personas/types.js';

export function buildPersonaSystemPrompt(persona: Persona): string {
  return `You are ${persona.name} (${persona.emoji}), ${persona.role}.

YOUR CORE GOAL: ${persona.coreGoal}

YOUR PHILOSOPHY: ${persona.philosophy}

YOUR VALUES: ${persona.values.join(', ')}

YOUR BIASES:
- Toward: ${persona.biases.toward.join(', ')}
- Against: ${persona.biases.against.join(', ')}

YOUR APPROACH:
${persona.approach.map(a => `- ${a}`).join('\n')}

YOUR STRENGTHS:
${persona.strengths.map(s => `- ${s}`).join('\n')}

YOUR BLIND SPOTS (be aware but don't completely avoid):
${persona.blindSpots.map(b => `- ${b}`).join('\n')}

COMMUNICATION STYLE:
- Tone: ${persona.communicationStyle.tone}
- Structure: ${persona.communicationStyle.structure}
- Example phrases: ${persona.communicationStyle.examples.map(e => `"${e}"`).join(', ')}

FOCUS AREAS: ${persona.focusAreas.join(', ')}

${persona.forbiddenPhrases ? `NEVER USE THESE PHRASES: ${persona.forbiddenPhrases.join(', ')}` : ''}

${persona.outputFormat ? `OUTPUT FORMAT:
- Structure: ${persona.outputFormat.structure}
- Required sections: ${persona.outputFormat.requiredSections?.join(', ')}` : ''}

Remember: You are providing a critique from YOUR unique perspective. Be true to your character and philosophy. Challenge other perspectives if they conflict with your principles.`;
}

export function buildCritiqueUserPrompt(content: string, context?: string): string {
  let prompt = `Please critique the following:\n\n${content}`;
  
  if (context) {
    prompt = `${context}\n\n${prompt}`;
  }
  
  return prompt;
}

export function buildSynthesisPrompt(critiques: Map<string, string>, originalContent: string): string {
  let prompt = `You are the Synthesizer. Your task is to combine insights from all five rivals into a superior solution.

ORIGINAL PROPOSAL:
${originalContent}

CRITIQUES FROM THE RIVALS:

`;

  for (const [persona, critique] of critiques) {
    prompt += `### ${persona.toUpperCase()}\n${critique}\n\n`;
  }

  prompt += `
Now synthesize these perspectives:

1. **Core Insights**: Identify the most valuable point from each rival
2. **Conflicts Resolved**: Explain how you balanced competing concerns
3. **Final Solution**: Present the synthesized approach
4. **Implementation Plan**: Provide concrete steps
5. **Trade-offs Acknowledged**: Be honest about what we're choosing to prioritize

Create a solution that addresses the core concerns while remaining practical and implementable.`;

  return prompt;
}

export function buildTeamDebatePrompt(content: string, context?: string): string {
  let prompt = `Simulate a "Team of Rivals" debate on the following:

${content}

${context ? `\nContext: ${context}\n` : ''}

Respond with critiques from ALL FIVE personas:
1. Helios (🧑‍💻 Pragmatist)
2. Selene (🏛️ Architect)
3. Prometheus (🚀 Innovator)
4. Cassandra (🕵️ Risk Analyst)
5. Gaia (❤️ User Advocate)

Each should provide a distinct critique from their perspective. Format as:

### HELIOS
[Pragmatic critique]

### SELENE
[Architectural critique]

### PROMETHEUS
[Innovative challenge]

### CASSANDRA
[Risk analysis]

### GAIA
[User-focused critique]`;

  return prompt;
}