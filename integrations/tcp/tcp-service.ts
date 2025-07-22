/**
 * TCP Service Layer - Main integration point for Tool Capability Protocol
 * 
 * Provides high-level TCP intelligence services for the dialectical-mcp framework,
 * integrating binary descriptors, hierarchical encoding, and safety patterns.
 * 
 * Key Features:
 * - Microsecond command safety analysis 
 * - TCP-guided safe alternative generation
 * - Hierarchical compression for debate knowledge
 * - Real-time risk assessment for multi-persona interactions
 */

import { 
  TCPAnalysisResult, 
  AgentDecision, 
  RiskLevel, 
  SecurityFlags,
  SafeAlternativePattern,
  TCPConfig,
  TCPError 
} from './tcp-types.js';
import { TCPDescriptorDatabase } from './tcp-database.js';
import { HierarchicalEncoder } from './hierarchical-encoder.js';

export interface TCPSafetyAssessment {
  command: string;
  isApproved: boolean;
  riskLevel: RiskLevel;
  agentDecision: AgentDecision;
  safeAlternative?: string;
  reasoning: string;
  analysisTimeMs: number;
  tcpFlags: string[];
}

export interface PersonaSafetyProfile {
  persona: string;
  riskTolerance: RiskLevel;
  allowedCapabilities: string[];
  requiredApproval: string[];
  autoReject: string[];
}

export interface DebateCompressionResult {
  topic: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  hierarchicalEncoding: boolean;
  spaceSaved: number;
}

/**
 * Main TCP Service integrating all TCP capabilities
 */
export class TCPService {
  private database: TCPDescriptorDatabase;
  private encoder: HierarchicalEncoder;
  private config: TCPConfig;
  private personaProfiles: Map<string, PersonaSafetyProfile>;
  private safeAlternatives: SafeAlternativePattern[];

  constructor(config: Partial<TCPConfig> = {}) {
    this.config = {
      enableHierarchicalCompression: true,
      analysisTimeoutMs: 5000,
      cacheDescriptors: true,
      requireValidation: false,
      safetyLevel: 'balanced',
      ...config,
    };

    this.database = new TCPDescriptorDatabase();
    this.encoder = new HierarchicalEncoder();
    this.personaProfiles = new Map();
    this.safeAlternatives = this.initializeSafeAlternatives();
    
    this.initializePersonaProfiles();
  }

  /**
   * Initialize the TCP service - loads databases and configures profiles
   */
  async initialize(): Promise<void> {
    console.log('Initializing TCP Service...');
    
    try {
      await this.database.loadSystemCommands();
      console.log(`Loaded ${this.database.commandCount} TCP descriptors`);
      
      // Pre-analyze common tool families for hierarchical encoding
      const families = ['git', 'docker', 'kubectl'];
      for (const family of families) {
        await this.encoder.analyzeFamily(family);
      }
      
      console.log('TCP Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TCP Service:', error);
      throw new TCPError('TCP Service initialization failed', 'INITIALIZATION_ERROR');
    }
  }

  /**
   * Analyze command safety with TCP intelligence
   */
  async analyzeCommandSafety(command: string, persona?: string): Promise<TCPSafetyAssessment> {
    const startTime = performance.now();
    
    try {
      // Get base TCP analysis
      const tcpAnalysis = await this.database.analyzeCommandSafety(command);
      
      // Apply persona-specific safety assessment
      const personaProfile = persona ? this.personaProfiles.get(persona.toLowerCase()) : null;
      const finalDecision = this.applyPersonaFilter(tcpAnalysis, personaProfile);
      
      // Get TCP flags for detailed analysis
      const descriptor = await this.database.getDescriptor(command);
      const flags = this.decodeTCPFlags(descriptor);
      
      const analysisTime = performance.now() - startTime;
      
      return {
        command,
        isApproved: finalDecision === AgentDecision.APPROVED,
        riskLevel: tcpAnalysis.riskLevel,
        agentDecision: finalDecision,
        safeAlternative: tcpAnalysis.safeAlternative || this.findSafeAlternative(command),
        reasoning: this.buildReasoningExplanation(tcpAnalysis, personaProfile, flags),
        analysisTimeMs: analysisTime,
        tcpFlags: flags,
      };
    } catch (error) {
      throw new TCPError(`Command analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ANALYSIS_ERROR');
    }
  }

  /**
   * Get safe alternatives for dangerous commands using TCP patterns
   */
  async getSafeAlternatives(command: string): Promise<string[]> {
    const alternatives: string[] = [];
    
    for (const pattern of this.safeAlternatives) {
      if (pattern.dangerousPattern.test(command)) {
        alternatives.push(pattern.safeAlternative);
      }
    }
    
    // Add TCP-specific quarantine alternatives
    const baseCommand = command.split(' ')[0];
    if (['rm', 'shred', 'wipefs'].includes(baseCommand)) {
      alternatives.unshift(`mkdir -p ~/.quarantine && mv ${command.replace(baseCommand, '')}`);
    }
    
    return alternatives;
  }

  /**
   * Validate debate conclusion safety using TCP intelligence
   */
  async validateDebateConclusion(conclusion: string, participatingPersonas: string[]): Promise<TCPSafetyAssessment> {
    // Extract potential commands from debate conclusion
    const commands = this.extractCommandsFromText(conclusion);
    
    if (commands.length === 0) {
      return {
        command: 'debate_conclusion',
        isApproved: true,
        riskLevel: RiskLevel.SAFE,
        agentDecision: AgentDecision.APPROVED,
        reasoning: 'No executable commands found in debate conclusion',
        analysisTimeMs: 0,
        tcpFlags: [],
      };
    }

    // Analyze highest risk command in conclusion
    let highestRisk: TCPSafetyAssessment | null = null;
    
    for (const command of commands) {
      const analysis = await this.analyzeCommandSafety(command);
      if (!highestRisk || analysis.riskLevel > highestRisk.riskLevel) {
        highestRisk = analysis;
      }
    }

    if (!highestRisk) {
      throw new TCPError('Failed to analyze debate conclusion', 'ANALYSIS_ERROR');
    }

    // Override for debate context - be more conservative
    if (highestRisk.riskLevel >= RiskLevel.HIGH_RISK) {
      highestRisk.agentDecision = AgentDecision.REQUIRE_APPROVAL;
      highestRisk.reasoning += ' (Enhanced safety for multi-persona debate conclusion)';
    }

    return highestRisk;
  }

  /**
   * Compress debate session using hierarchical TCP encoding
   */
  async compressDebateKnowledge(topic: string, critiques: Map<string, string>): Promise<DebateCompressionResult> {
    const originalContent = JSON.stringify({
      topic,
      critiques: Object.fromEntries(critiques),
    });
    
    const originalSize = Buffer.byteLength(originalContent, 'utf8');
    
    // Try hierarchical encoding if content is structured
    let compressedSize = originalSize;
    let hierarchicalEncoding = false;
    
    if (this.config.enableHierarchicalCompression && critiques.size > 3) {
      // Apply TCP-inspired hierarchical compression principles
      const commonPatterns = this.extractCommonPatterns(Array.from(critiques.values()));
      const compressedContent = this.applyHierarchicalCompression(originalContent, commonPatterns);
      compressedSize = Buffer.byteLength(compressedContent, 'utf8');
      hierarchicalEncoding = true;
    }
    
    const compressionRatio = originalSize / compressedSize;
    const spaceSaved = originalSize - compressedSize;
    
    return {
      topic,
      originalSize,
      compressedSize,
      compressionRatio,
      hierarchicalEncoding,
      spaceSaved,
    };
  }

  /**
   * Get system-wide TCP statistics
   */
  async getSystemStatistics(): Promise<any> {
    const stats = await this.database.getSystemStatistics();
    const families = await this.encoder.listFamilies();
    
    return {
      ...stats,
      hierarchicalFamilies: families.length,
      configuredPersonas: this.personaProfiles.size,
      safeAlternativePatterns: this.safeAlternatives.length,
      tcpVersion: '2.0',
      hierarchicalVersion: '3.0',
    };
  }

  private initializePersonaProfiles(): void {
    // Helios - Pragmatist: Moderate risk tolerance, prefers simple solutions
    this.personaProfiles.set('helios', {
      persona: 'helios',
      riskTolerance: RiskLevel.MEDIUM_RISK,
      allowedCapabilities: ['FILE_MODIFICATION', 'NETWORK_ACCESS'],
      requiredApproval: ['SYSTEM_MODIFICATION', 'REQUIRES_ROOT'],
      autoReject: ['DESTRUCTIVE', 'CRITICAL'],
    });

    // Selene - Architect: Conservative, focuses on system integrity
    this.personaProfiles.set('selene', {
      persona: 'selene',
      riskTolerance: RiskLevel.LOW_RISK,
      allowedCapabilities: [],
      requiredApproval: ['FILE_MODIFICATION', 'SYSTEM_MODIFICATION'],
      autoReject: ['DESTRUCTIVE', 'CRITICAL', 'PRIVILEGE_ESCALATION'],
    });

    // Prometheus - Innovator: Higher risk tolerance for breakthrough solutions
    this.personaProfiles.set('prometheus', {
      persona: 'prometheus',
      riskTolerance: RiskLevel.HIGH_RISK,
      allowedCapabilities: ['FILE_MODIFICATION', 'SYSTEM_MODIFICATION', 'NETWORK_ACCESS'],
      requiredApproval: ['DESTRUCTIVE'],
      autoReject: ['CRITICAL'],
    });

    // Cassandra - Risk Analyst: Extremely conservative, security-first
    this.personaProfiles.set('cassandra', {
      persona: 'cassandra',
      riskTolerance: RiskLevel.SAFE,
      allowedCapabilities: [],
      requiredApproval: ['FILE_MODIFICATION', 'NETWORK_ACCESS', 'SYSTEM_MODIFICATION'],
      autoReject: ['DESTRUCTIVE', 'CRITICAL', 'HIGH_RISK', 'PRIVILEGE_ESCALATION'],
    });

    // Gaia - User Advocate: Moderate risk tolerance, emphasizes user experience
    this.personaProfiles.set('gaia', {
      persona: 'gaia',
      riskTolerance: RiskLevel.MEDIUM_RISK,
      allowedCapabilities: ['FILE_MODIFICATION', 'NETWORK_ACCESS'],
      requiredApproval: ['SYSTEM_MODIFICATION', 'DESTRUCTIVE'],
      autoReject: ['CRITICAL', 'PRIVILEGE_ESCALATION'],
    });
  }

  private initializeSafeAlternatives(): SafeAlternativePattern[] {
    return [
      {
        dangerousPattern: /^rm\s+-rf?\s+/,
        safeAlternative: 'mkdir -p ~/.quarantine && mv',
        reasoning: 'Move to quarantine instead of permanent deletion',
        preservesIntent: true,
      },
      {
        dangerousPattern: /^dd\s+if=/,
        safeAlternative: 'cp',
        reasoning: 'Use copy instead of direct disk operations',
        preservesIntent: false,
      },
      {
        dangerousPattern: /^shred\s+/,
        safeAlternative: 'mv',
        reasoning: 'Move file instead of secure deletion',
        preservesIntent: false,
      },
      {
        dangerousPattern: /^mkfs\./,
        safeAlternative: '# CRITICAL: Use backup utilities first',
        reasoning: 'Filesystem formatting requires explicit confirmation',
        preservesIntent: false,
      },
      {
        dangerousPattern: /^sudo\s+rm/,
        safeAlternative: 'sudo mkdir -p /var/quarantine && sudo mv',
        reasoning: 'Move to system quarantine instead of deletion',
        preservesIntent: true,
      },
    ];
  }

  private applyPersonaFilter(analysis: TCPAnalysisResult, profile: PersonaSafetyProfile | null): AgentDecision {
    if (!profile) {
      return analysis.agentDecision;
    }

    // Check auto-reject patterns
    const flags = this.decodeTCPFlags(new Uint8Array()); // Would need actual descriptor
    for (const rejectFlag of profile.autoReject) {
      if (flags.includes(rejectFlag) || analysis.riskLevel === RiskLevel.CRITICAL) {
        return AgentDecision.REJECT;
      }
    }

    // Check if requires approval
    for (const approvalFlag of profile.requiredApproval) {
      if (flags.includes(approvalFlag) || analysis.riskLevel > profile.riskTolerance) {
        return AgentDecision.REQUIRE_APPROVAL;
      }
    }

    // Check allowed capabilities
    if (analysis.riskLevel <= profile.riskTolerance) {
      return AgentDecision.APPROVED;
    }

    return AgentDecision.CAUTION_MODE;
  }

  private decodeTCPFlags(descriptor: Uint8Array): string[] {
    const flags: string[] = [];
    
    if (descriptor.length < 14) return flags;
    
    const view = new DataView(descriptor.buffer, descriptor.byteOffset);
    const securityFlags = view.getUint32(8, false);

    if (securityFlags & SecurityFlags.DESTRUCTIVE) flags.push('DESTRUCTIVE');
    if (securityFlags & SecurityFlags.REQUIRES_ROOT) flags.push('REQUIRES_ROOT');
    if (securityFlags & SecurityFlags.FILE_MODIFICATION) flags.push('FILE_MODIFICATION');
    if (securityFlags & SecurityFlags.SYSTEM_MODIFICATION) flags.push('SYSTEM_MODIFICATION');
    if (securityFlags & SecurityFlags.NETWORK_ACCESS) flags.push('NETWORK_ACCESS');
    if (securityFlags & SecurityFlags.PRIVILEGE_ESCALATION) flags.push('PRIVILEGE_ESCALATION');

    return flags;
  }

  private buildReasoningExplanation(
    analysis: TCPAnalysisResult,
    profile: PersonaSafetyProfile | null,
    flags: string[]
  ): string {
    let reasoning = `TCP Analysis: ${RiskLevel[analysis.riskLevel]} risk level`;
    
    if (flags.length > 0) {
      reasoning += ` with capabilities: ${flags.join(', ')}`;
    }
    
    if (profile) {
      reasoning += `. ${profile.persona.toUpperCase()} persona assessment applied`;
    }
    
    return reasoning;
  }

  private findSafeAlternative(command: string): string | undefined {
    for (const pattern of this.safeAlternatives) {
      if (pattern.dangerousPattern.test(command)) {
        return pattern.safeAlternative;
      }
    }
    return undefined;
  }

  private extractCommandsFromText(text: string): string[] {
    // Simple regex to find command-like patterns in text
    const commandPattern = /(?:^|\s)([a-z][a-z0-9-]*(?:\s+[^\s]+)*)/gm;
    const matches = text.match(commandPattern) || [];
    
    return matches
      .map(match => match.trim())
      .filter(cmd => cmd.length > 2) // Filter out very short matches
      .slice(0, 10); // Limit to first 10 potential commands
  }

  private extractCommonPatterns(texts: string[]): string[] {
    // Extract common phrases for hierarchical compression
    const phrases = new Map<string, number>();
    
    for (const text of texts) {
      const words = text.split(/\s+/);
      for (let i = 0; i < words.length - 2; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    }
    
    return Array.from(phrases.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([phrase, _]) => phrase);
  }

  private applyHierarchicalCompression(content: string, patterns: string[]): string {
    // Simple dictionary-based compression inspired by TCP hierarchical encoding
    let compressed = content;
    const dictionary = new Map<string, string>();
    
    patterns.forEach((pattern, index) => {
      const token = `#TCP${index.toString(16)}#`;
      dictionary.set(pattern, token);
      compressed = compressed.replace(new RegExp(pattern, 'g'), token);
    });
    
    // Prepend dictionary for decompression
    const dictJson = JSON.stringify(Object.fromEntries(dictionary));
    return `#TCPDICT:${dictJson}#${compressed}`;
  }
}