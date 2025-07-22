#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { ALL_PERSONAS, SYNTHESIZER_PROMPT } from './personas/definitions.js';
import { SessionManager } from './sessions/manager.js';
import {
  buildPersonaSystemPrompt,
  buildCritiqueUserPrompt,
  buildSynthesisPrompt,
  buildTeamDebatePrompt
} from './tools/prompts.js';

const CritiqueArgsSchema = z.object({
  content: z.string().describe('The content to critique'),
  persona: z.enum(['helios', 'selene', 'prometheus', 'cassandra', 'gaia']).describe('The persona to use for critique'),
  sessionId: z.string().optional().describe('Optional session ID for stateful debates'),
  context: z.string().optional().describe('Additional context for the critique')
});

const TeamDebateArgsSchema = z.object({
  content: z.string().describe('The content for team debate'),
  sessionId: z.string().optional().describe('Optional session ID to create'),
  context: z.string().optional().describe('Additional context for the debate')
});

const SynthesizeArgsSchema = z.object({
  sessionId: z.string().describe('Session ID containing the critiques to synthesize'),
  additionalGuidance: z.string().optional().describe('Additional guidance for synthesis')
});

const sessionManager = new SessionManager();

const server = new Server(
  {
    name: 'dialectical-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'critique',
        description: 'Get a critique from a specific persona (Helios, Selene, Prometheus, Cassandra, or Gaia)',
        inputSchema: CritiqueArgsSchema,
      },
      {
        name: 'team_debate',
        description: 'Get critiques from all five personas in a single response',
        inputSchema: TeamDebateArgsSchema,
      },
      {
        name: 'synthesize',
        description: 'Synthesize critiques from a debate session into a final solution',
        inputSchema: SynthesizeArgsSchema,
      },
      {
        name: 'create_session',
        description: 'Create a new debate session for stateful conversations',
        inputSchema: z.object({
          topic: z.string().describe('The topic or title of the debate'),
          context: z.string().optional().describe('Initial context for the debate')
        }),
      },
      {
        name: 'list_sessions',
        description: 'List active debate sessions',
        inputSchema: z.object({}),
      },
    ],
  };
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'helios_prompt',
        description: 'System prompt for Helios (Pragmatist) persona',
      },
      {
        name: 'selene_prompt',
        description: 'System prompt for Selene (Architect) persona',
      },
      {
        name: 'prometheus_prompt',
        description: 'System prompt for Prometheus (Innovator) persona',
      },
      {
        name: 'cassandra_prompt',
        description: 'System prompt for Cassandra (Risk Analyst) persona',
      },
      {
        name: 'gaia_prompt',
        description: 'System prompt for Gaia (User Advocate) persona',
      },
      {
        name: 'synthesizer_prompt',
        description: 'System prompt for the Synthesizer role',
      },
    ],
  };
});

// Get specific prompts
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;
  
  if (name === 'synthesizer_prompt') {
    return {
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: SYNTHESIZER_PROMPT,
          },
        },
      ],
    };
  }
  
  const personaId = name.replace('_prompt', '');
  const persona = ALL_PERSONAS[personaId];
  
  if (!persona) {
    throw new Error(`Unknown prompt: ${name}`);
  }
  
  return {
    messages: [
      {
        role: 'system',
        content: {
          type: 'text',
          text: buildPersonaSystemPrompt(persona),
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'critique': {
      const { content, persona: personaId, sessionId, context } = CritiqueArgsSchema.parse(args);
      const persona = ALL_PERSONAS[personaId];
      
      if (!persona) {
        throw new Error(`Unknown persona: ${personaId}`);
      }
      
      let fullContext = context || '';
      
      // Add session context if provided
      if (sessionId) {
        try {
          fullContext = sessionManager.getSessionContext(sessionId) + '\n' + fullContext;
        } catch (e) {
          // Session doesn't exist, that's okay
        }
      }
      
      const systemPrompt = buildPersonaSystemPrompt(persona);
      const userPrompt = buildCritiqueUserPrompt(content, fullContext);
      
      // In a real implementation, this would call the LLM API
      // For now, we'll return the prompts for the host to handle
      const response = {
        persona: persona.name,
        systemPrompt,
        userPrompt,
        requiresLLM: true,
      };
      
      // If session exists, we would store the critique
      if (sessionId) {
        // This would be done after getting the actual LLM response
        // sessionManager.addCritique(sessionId, personaId, llmResponse);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }
    
    case 'team_debate': {
      const { content, sessionId, context } = TeamDebateArgsSchema.parse(args);
      
      // Create session if ID provided
      let actualSessionId = sessionId;
      if (sessionId) {
        actualSessionId = sessionManager.createSession(content, context);
      }
      
      const userPrompt = buildTeamDebatePrompt(content, context);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              sessionId: actualSessionId,
              userPrompt,
              requiresLLM: true,
              instruction: 'This prompt should generate critiques from all 5 personas',
            }, null, 2),
          },
        ],
      };
    }
    
    case 'synthesize': {
      const { sessionId, additionalGuidance } = SynthesizeArgsSchema.parse(args);
      const session = sessionManager.getSession(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      if (session.critiques.size === 0) {
        throw new Error('No critiques to synthesize');
      }
      
      const synthesisPrompt = buildSynthesisPrompt(session.critiques, session.topic);
      const fullPrompt = additionalGuidance 
        ? `${synthesisPrompt}\n\nAdditional guidance: ${additionalGuidance}`
        : synthesisPrompt;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              sessionId,
              systemPrompt: SYNTHESIZER_PROMPT,
              userPrompt: fullPrompt,
              requiresLLM: true,
            }, null, 2),
          },
        ],
      };
    }
    
    case 'create_session': {
      const { topic, context } = z.object({
        topic: z.string(),
        context: z.string().optional()
      }).parse(args);
      
      const sessionId = sessionManager.createSession(topic, context);
      
      return {
        content: [
          {
            type: 'text',
            text: `Created session: ${sessionId}`,
          },
        ],
      };
    }
    
    case 'list_sessions': {
      const sessions = sessionManager.listActiveSessions();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(sessions.map(s => ({
              id: s.id,
              topic: s.topic,
              startedAt: s.startedAt,
              participatingPersonas: s.metadata.participatingPersonas,
              hasSynthesis: !!s.synthesis,
            })), null, 2),
          },
        ],
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Cleanup old sessions periodically
setInterval(() => {
  sessionManager.cleanupOldSessions();
}, 60 * 60 * 1000); // Every hour

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Dialectical MCP server running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});