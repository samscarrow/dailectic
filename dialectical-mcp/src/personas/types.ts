export interface Persona {
  // --- Existing Fields ---
  id: string;
  name: string;
  emoji: string;
  role: string;
  philosophy: string;
  approach: string[];
  strengths: string[];
  blindSpots: string[];
  communicationStyle: {
    tone: string;
    structure: string;
    examples: string[];
  };
  focusAreas: string[];
  forbiddenPhrases?: string[];
  outputFormat?: {
    structure: string;
    requiredSections?: string[];
  };

  // --- NEW: For Deeper Motivation ---
  coreGoal: string;
  values: string[];

  // --- NEW: For Richer Interaction ---
  biases: {
    toward: string[];
    against: string[];
  };
  interlocutorRelationships?: Record<string, string>; // Optional, as it's complex

  // --- NEW: For More Structured Output ---
  structuredOutputSchema?: Record<string, any>; // Optional, for advanced use
}

export interface CritiqueRequest {
  content: string;
  context?: string;
  previousCritiques?: Record<string, string>;
  outputFormat?: 'text' | 'json' | 'structured';
}

export interface CritiqueResponse {
  persona: string;
  critique: string;
  suggestions?: string[];
  concerns?: string[];
  alternatives?: string[];
  metadata?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    confidence?: number;
    tags?: string[];
  };
}