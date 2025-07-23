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
import { PersistentSessionManager } from './sessions/persistent-manager.js';
import { CritiqueService } from './services/critique-service.js';
import { Orchestrator } from './services/orchestrator.js';
import { ContextualPromptBuilder } from './services/contextual-prompt-builder.js';
import { StructuredOutputParser } from './services/structured-output-parser.js';
import { LLMFactory } from './llm/factory.js';
import { buildSynthesisPrompt, buildPersonaSystemPrompt } from './tools/prompts.js';
// import { createTCPService, TCP_INTEGRATION_INFO } from '../../integrations/tcp/index.js';
const TCP_INTEGRATION_INFO = { version: '1.0', compressionStats: { vsDocumentation: '10:1' } };

// Initialize services
const llmProvider = LLMFactory.fromEnv();
const sessionManager = new PersistentSessionManager();
const critiqueService = new CritiqueService(llmProvider);
const contextBuilder = new ContextualPromptBuilder();
const outputParser = new StructuredOutputParser();
const orchestrator = new Orchestrator(sessionManager, critiqueService, contextBuilder, outputParser);

// Initialize TCP Service (disabled for now)
let tcpService: any = null;

// Schema definitions
const CritiqueArgsSchema = z.object({
  content: z.string().describe('The content to critique'),
  persona: z.enum(['helios', 'selene', 'prometheus', 'cassandra', 'gaia']).describe('The persona to use for critique'),
  sessionId: z.string().optional().describe('Optional session ID for stateful debates'),
  context: z.string().optional().describe('Additional context for the critique'),
  outputFormat: z.enum(['text', 'json', 'structured']).optional().describe('Output format for the critique')
});

const TeamDebateArgsSchema = z.object({
  content: z.string().describe('The content for team debate'),
  sessionId: z.string().optional().describe('Optional session ID to create or use'),
  context: z.string().optional().describe('Additional context for the debate'),
  parallel: z.boolean().optional().default(true).describe('Execute critiques in parallel')
});

const SequentialDebateArgsSchema = z.object({
  content: z.string().describe('The content for sequential debate'),
  sessionId: z.string().optional().describe('Session ID (will create if not provided)'),
  personaOrder: z.array(z.string()).optional().describe('Order of personas (default: helios, selene, prometheus, cassandra, gaia)'),
  context: z.string().optional().describe('Additional context')
});

const TargetedRebuttalArgsSchema = z.object({
  content: z.string().describe('The original content'),
  sessionId: z.string().describe('Session ID containing the debate'),
  sourcePersona: z.string().describe('Persona whose critique to rebut'),
  targetPersona: z.string().describe('Persona providing the rebuttal')
});

const AuditCodeArgsSchema = z.object({
  content: z.string().describe('Code to audit'),
  auditType: z.enum(['security', 'architecture', 'ux']).describe('Type of audit to perform'),
  sessionId: z.string().optional().describe('Session ID for storing results')
});

const SynthesizeArgsSchema = z.object({
  sessionId: z.string().describe('Session ID containing the critiques to synthesize'),
  additionalGuidance: z.string().optional().describe('Additional guidance for synthesis')
});

// TCP Integration Schema Definitions
const TCPAnalyzeCommandArgsSchema = z.object({
  command: z.string().describe('Command to analyze for safety'),
  persona: z.string().optional().describe('Persona context for risk assessment')
});

const TCPGetSafeAlternativeArgsSchema = z.object({
  command: z.string().describe('Dangerous command to find alternatives for')
});

const TCPValidateDebateArgsSchema = z.object({
  conclusion: z.string().describe('Debate conclusion to validate'),
  participatingPersonas: z.array(z.string()).describe('Personas that participated in the debate')
});

const TCPCompressDebateArgsSchema = z.object({
  topic: z.string().describe('Debate topic'),
  sessionId: z.string().describe('Session ID containing critiques to compress')
});

const TCPSystemStatsArgsSchema = z.object({});

// Create MCP server
export const server = new Server(
  {
    name: 'dialectical-mcp',
    version: '3.0.0',
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
        description: 'Get a critique from a specific persona with bias-aware context',
        inputSchema: CritiqueArgsSchema,
      },
      {
        name: 'team_debate',
        description: 'Get critiques from all five personas (parallel execution)',
        inputSchema: TeamDebateArgsSchema,
      },
      {
        name: 'sequential_debate',
        description: 'Run a sequential debate where each persona responds to previous critiques',
        inputSchema: SequentialDebateArgsSchema,
      },
      {
        name: 'targeted_rebuttal',
        description: 'Have one persona directly rebut another\'s critique',
        inputSchema: TargetedRebuttalArgsSchema,
      },
      {
        name: 'audit_code',
        description: 'Perform a structured audit (security, architecture, or UX)',
        inputSchema: AuditCodeArgsSchema,
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
        description: 'List active debate sessions with details',
        inputSchema: z.object({}),
      },
      {
        name: 'get_session',
        description: 'Get details of a specific session',
        inputSchema: z.object({
          sessionId: z.string().describe('Session ID to retrieve')
        }),
      },
      // TCP Integration Tools
      {
        name: 'tcp_analyze_command',
        description: 'Analyze command safety using TCP intelligence (microsecond analysis)',
        inputSchema: TCPAnalyzeCommandArgsSchema,
      },
      {
        name: 'tcp_get_safe_alternatives', 
        description: 'Get TCP-guided safe alternatives for dangerous commands',
        inputSchema: TCPGetSafeAlternativeArgsSchema,
      },
      {
        name: 'tcp_validate_debate_conclusion',
        description: 'Validate debate conclusion safety using TCP patterns',
        inputSchema: TCPValidateDebateArgsSchema,
      },
      {
        name: 'tcp_compress_debate_knowledge',
        description: 'Apply hierarchical TCP compression to debate knowledge',
        inputSchema: TCPCompressDebateArgsSchema,
      },
      {
        name: 'tcp_system_statistics',
        description: 'Get TCP system statistics and compression metrics',
        inputSchema: TCPSystemStatsArgsSchema,
      },
    ],
  };
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      ...Object.keys(ALL_PERSONAS).map(personaId => ({
        name: `${personaId}_prompt`,
        description: `System prompt for ${ALL_PERSONAS[personaId].name} (${ALL_PERSONAS[personaId].role})`,
      })),
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
  
  try {
    switch (name) {
      case 'critique': {
        const { content, persona: personaId, sessionId, context, outputFormat } = CritiqueArgsSchema.parse(args);
        
        let fullContext = context || '';
        
        // Add session context if provided
        if (sessionId) {
          try {
            fullContext = sessionManager.getSessionContext(sessionId) + '\n' + fullContext;
          } catch (e) {
            // Session doesn't exist, create it
            sessionManager.createSession(content, context);
          }
        }
        
        // Add bias-aware context
        const biasContext = await contextBuilder.buildSequentialContext(
          personaId,
          content,
          new Map(),
          []
        );
        fullContext = biasContext + '\n' + fullContext;
        
        // Get actual critique from LLM
        const critiqueResponse = await critiqueService.getCritique(
          personaId,
          { content, outputFormat },
          fullContext
        );
        
        // Store in session if applicable
        if (sessionId) {
          sessionManager.addCritique(sessionId, personaId, critiqueResponse.critique);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: outputFormat === 'json' 
                ? JSON.stringify(critiqueResponse, null, 2)
                : critiqueResponse.critique,
            },
          ],
        };
      }
      
      case 'team_debate': {
        const { content, sessionId, context, parallel } = TeamDebateArgsSchema.parse(args);
        
        // Create or use session
        const actualSessionId = sessionId || sessionManager.createSession(content, context);
        
        if (parallel) {
          // Execute all critiques in parallel
          const critiques = await critiqueService.getTeamDebate(
            { content, context },
            ['helios', 'selene', 'prometheus', 'cassandra', 'gaia']
          );
          
          // Store all critiques in session
          for (const critique of critiques) {
            const personaId = critique.persona.toLowerCase();
            sessionManager.addCritique(actualSessionId, personaId, critique.critique);
          }
          
          // Format response
          const formattedResponse = critiques
            .map(c => `### ${c.persona.toUpperCase()}\n${c.critique}`)
            .join('\n\n');
          
          return {
            content: [
              {
                type: 'text',
                text: `Session ID: ${actualSessionId}\n\n${formattedResponse}`,
              },
            ],
          };
        } else {
          // Sequential execution
          let response = `Session ID: ${actualSessionId}\n\n`;
          
          for (const personaId of ['helios', 'selene', 'prometheus', 'cassandra', 'gaia']) {
            const critique = await critiqueService.getCritique(
              personaId,
              { content, context },
              context
            );
            sessionManager.addCritique(actualSessionId, personaId, critique.critique);
            response += `### ${personaId.toUpperCase()}\n${critique.critique}\n\n`;
          }
          
          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        }
      }
      
      case 'sequential_debate': {
        const { content, sessionId, personaOrder, context } = SequentialDebateArgsSchema.parse(args);
        
        // Create session if not provided
        const actualSessionId = sessionId || sessionManager.createSession(content, context);
        
        // Run sequential debate through orchestrator
        const results = await orchestrator.runSequentialDebate(
          content,
          actualSessionId,
          personaOrder
        );
        
        // Format results
        let response = `## Sequential Debate Results\nSession ID: ${actualSessionId}\n\n`;
        
        for (const [personaId, critique] of results) {
          response += `### ${personaId.toUpperCase()}\n${critique.critique}\n\n`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: response,
            },
          ],
        };
      }
      
      case 'targeted_rebuttal': {
        const { content, sessionId, sourcePersona, targetPersona } = TargetedRebuttalArgsSchema.parse(args);
        
        const rebuttal = await orchestrator.runTargetedRebuttal(
          content,
          sessionId,
          sourcePersona,
          targetPersona
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `## ${targetPersona.toUpperCase()} rebuts ${sourcePersona.toUpperCase()}\n\n${rebuttal.critique}`,
            },
          ],
        };
      }
      
      case 'audit_code': {
        const { content, auditType, sessionId } = AuditCodeArgsSchema.parse(args);
        
        // Create session if not provided
        const actualSessionId = sessionId || sessionManager.createSession(`${auditType} audit`, content);
        
        const auditResults = await orchestrator.runAuditWorkflow(
          content,
          actualSessionId,
          auditType
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(auditResults, null, 2),
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
        
        // Get synthesis from LLM
        const synthesisResponse = await llmProvider.complete({
          messages: [
            { role: 'system', content: SYNTHESIZER_PROMPT },
            { role: 'user', content: fullPrompt }
          ],
          temperature: 0.7,
          maxTokens: 3000
        });
        
        // Store synthesis in session
        sessionManager.addSynthesis(sessionId, synthesisResponse.content);
        
        return {
          content: [
            {
              type: 'text',
              text: synthesisResponse.content,
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
              text: JSON.stringify({
                sessionId,
                topic,
                created: new Date().toISOString(),
                status: 'active'
              }, null, 2),
            },
          ],
        };
      }
      
      case 'list_sessions': {
        const sessions = sessionManager.listActiveSessions();
        
        const sessionSummaries = sessions.map(s => ({
          id: s.id,
          topic: s.topic,
          startedAt: s.startedAt,
          participatingPersonas: s.metadata.participatingPersonas,
          critiqueCount: s.critiques.size,
          hasSynthesis: !!s.synthesis,
          lastActivity: Array.from(s.critiques.values()).slice(-1)[0]?.substring(0, 100) + '...'
        }));
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sessionSummaries, null, 2),
            },
          ],
        };
      }
      
      case 'get_session': {
        const { sessionId } = z.object({
          sessionId: z.string()
        }).parse(args);
        
        const session = sessionManager.getSession(sessionId);
        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }
        
        const sessionDetails = {
          id: session.id,
          topic: session.topic,
          startedAt: session.startedAt,
          context: session.context,
          status: session.metadata.status,
          participatingPersonas: session.metadata.participatingPersonas,
          critiques: Object.fromEntries(session.critiques),
          synthesis: session.synthesis
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sessionDetails, null, 2),
            },
          ],
        };
      }
      
      // TCP Integration Tool Cases
      case 'tcp_analyze_command': {
        if (!tcpService) {
          throw new Error('TCP service not initialized');
        }
        
        const { command, persona } = TCPAnalyzeCommandArgsSchema.parse(args);
        const analysis = await tcpService.analyzeCommandSafety(command, persona);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      }
      
      case 'tcp_get_safe_alternatives': {
        if (!tcpService) {
          throw new Error('TCP service not initialized');
        }
        
        const { command } = TCPGetSafeAlternativeArgsSchema.parse(args);
        const alternatives = await tcpService.getSafeAlternatives(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                dangerousCommand: command,
                safeAlternatives: alternatives,
                tcpRecommendation: alternatives.length > 0 ? alternatives[0] : 'No safe alternatives found'
              }, null, 2),
            },
          ],
        };
      }
      
      case 'tcp_validate_debate_conclusion': {
        if (!tcpService) {
          throw new Error('TCP service not initialized');
        }
        
        const { conclusion, participatingPersonas } = TCPValidateDebateArgsSchema.parse(args);
        const validation = await tcpService.validateDebateConclusion(conclusion, participatingPersonas);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                conclusion,
                participatingPersonas,
                validation,
                tcpRecommendation: validation.isApproved ? 'APPROVED' : 'REQUIRES_REVIEW'
              }, null, 2),
            },
          ],
        };
      }
      
      case 'tcp_compress_debate_knowledge': {
        if (!tcpService) {
          throw new Error('TCP service not initialized');
        }
        
        const { topic, sessionId } = TCPCompressDebateArgsSchema.parse(args);
        const session = sessionManager.getSession(sessionId);
        
        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }
        
        const compression = await tcpService.compressDebateKnowledge(topic, session.critiques);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sessionId,
                compressionResult: compression,
                tcpEfficiency: `${compression.compressionRatio.toFixed(1)}:1 compression ratio`
              }, null, 2),
            },
          ],
        };
      }
      
      case 'tcp_system_statistics': {
        if (!tcpService) {
          throw new Error('TCP service not initialized');
        }
        
        const stats = await tcpService.getSystemStatistics();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tcpIntegrationInfo: TCP_INTEGRATION_INFO,
                systemStatistics: stats,
                status: 'TCP integration active'
              }, null, 2),
            },
          ],
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Cleanup old sessions and workflows periodically
setInterval(async () => {
  await sessionManager.cleanupOldSessions();
  orchestrator.cleanupOldWorkflows();
}, 60 * 60 * 1000); // Every hour

// Start the server
async function main() {
  // Initialize persistent storage
  console.error('Initializing persistent storage...');
  try {
    await sessionManager.initialize();
    const healthCheck = await sessionManager.getStorageHealth();
    if (healthCheck.status === 'healthy') {
      console.error('✅ Storage initialized successfully');
    } else {
      console.error(`⚠️  Storage health check failed: ${healthCheck.details}`);
    }
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
    console.error('   Server will exit...');
    process.exit(1);
  }

  // TCP Service disabled for now
  // try {
  //   console.error('Initializing TCP Service...');
  //   tcpService = await createTCPService();
  //   console.error('✅ TCP Service initialized successfully');
  // } catch (error) {
  //   console.error('⚠️  TCP Service initialization failed:', error);
  //   console.error('   TCP tools will be unavailable');
  // }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Dialectical MCP server v3.0 running...');
  console.error('✨ New features:');
  console.error('  - Sequential debates with relationship awareness');
  console.error('  - Bias-triggered contextual prompts');
  console.error('  - Structured audit outputs');
  console.error('  - Targeted rebuttals between personas');
  
  if (tcpService) {
    console.error('🚀 TCP Integration features:');
    console.error('  - Microsecond command safety analysis');
    console.error('  - TCP-guided safe alternatives');
    console.error('  - Multi-persona risk assessment');
    console.error('  - Debate conclusion validation');
    console.error('  - Hierarchical knowledge compression');
    console.error(`  - TCP v${TCP_INTEGRATION_INFO.version} with ${TCP_INTEGRATION_INFO.compressionStats.vsDocumentation} compression`);
  }
  
  console.error(`\nLLM Provider: ${llmProvider.name}`);
  console.error('Environment variables:');
  console.error(`- LLM_PROVIDER: ${process.env.LLM_PROVIDER || 'mock (default)'}`);
  console.error(`- LLM_MODEL: ${process.env.LLM_MODEL || 'default'}`);
  console.error(`- LLM_API_KEY: ${process.env.LLM_API_KEY ? '***' : 'not set'}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});