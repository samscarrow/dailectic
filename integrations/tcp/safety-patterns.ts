/**
 * TCP Safety Patterns for Dialectical Framework
 * 
 * Implements TCP-inspired safety patterns specifically for multi-persona debates,
 * preventing dangerous consensus and providing safe alternatives.
 * 
 * Key Features:
 * - Quarantine-over-delete patterns for safer operations
 * - Multi-persona safety validation
 * - Dangerous consensus detection and prevention
 * - TCP-guided safe alternative generation
 */

import { RiskLevel, AgentDecision, TCPAnalysisResult } from './tcp-types.js';

export interface SafetyValidationResult {
  isValid: boolean;
  riskLevel: RiskLevel;
  blockedReasons: string[];
  safeAlternatives: string[];
  consensusWarning?: string;
}

export interface PersonaSafetyContext {
  persona: string;
  riskTolerance: RiskLevel;
  previousPositions: string[];
  contributesToDangerous: boolean;
}

export interface DebateSafetyRule {
  name: string;
  description: string;
  pattern: RegExp;
  riskLevel: RiskLevel;
  preventConsensus: boolean;
  safeAlternative: string;
  reasoning: string;
}

/**
 * TCP Safety Patterns for Multi-Persona Debates
 */
export class DebateSafetyPatterns {
  private safetyRules: DebateSafetyRule[] = [];
  private quarantinePatterns: Map<string, string> = new Map();
  private dangerousConsensusPatterns: RegExp[] = [];

  constructor() {
    this.initializeSafetyRules();
    this.initializeQuarantinePatterns();
    this.initializeDangerousConsensusPatterns();
  }

  /**
   * Validate a debate conclusion for safety across all personas
   */
  validateDebateConclusion(
    conclusion: string,
    personaContexts: PersonaSafetyContext[]
  ): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      riskLevel: RiskLevel.SAFE,
      blockedReasons: [],
      safeAlternatives: [],
    };

    // Check against safety rules
    for (const rule of this.safetyRules) {
      if (rule.pattern.test(conclusion)) {
        result.isValid = false;
        result.riskLevel = Math.max(result.riskLevel, rule.riskLevel);
        result.blockedReasons.push(`${rule.name}: ${rule.description}`);
        
        if (rule.safeAlternative) {
          result.safeAlternatives.push(rule.safeAlternative);
        }
      }
    }

    // Check for dangerous consensus patterns
    const consensusRisk = this.checkDangerousConsensus(conclusion, personaContexts);
    if (consensusRisk) {
      result.consensusWarning = consensusRisk;
      result.riskLevel = Math.max(result.riskLevel, RiskLevel.HIGH_RISK);
    }

    // Apply TCP quarantine patterns
    const quarantineAlternatives = this.generateQuarantineAlternatives(conclusion);
    result.safeAlternatives.push(...quarantineAlternatives);

    return result;
  }

  /**
   * Generate safe alternatives using TCP quarantine patterns
   */
  generateSafeAlternatives(dangerousCommand: string): string[] {
    const alternatives: string[] = [];

    // Check quarantine patterns
    for (const [pattern, replacement] of this.quarantinePatterns) {
      if (dangerousCommand.includes(pattern)) {
        alternatives.push(dangerousCommand.replace(pattern, replacement));
      }
    }

    // Add universal quarantine fallback
    if (this.isDestructiveCommand(dangerousCommand)) {
      alternatives.push(this.wrapInQuarantine(dangerousCommand));
    }

    return alternatives;
  }

  /**
   * Check if personas are converging on a dangerous solution
   */
  checkDangerousConsensus(
    conclusion: string,
    personaContexts: PersonaSafetyContext[]
  ): string | null {
    // Check if multiple personas agree on dangerous action
    const dangerousPersonas = personaContexts.filter(ctx => 
      ctx.contributesToDangerous && 
      ctx.riskTolerance >= RiskLevel.HIGH_RISK
    );

    if (dangerousPersonas.length >= 3) {
      return `Warning: ${dangerousPersonas.length} personas converging on high-risk solution. ` +
             `TCP safety protocols recommend additional validation.`;
    }

    // Check for specific dangerous consensus patterns
    for (const pattern of this.dangerousConsensusPatterns) {
      if (pattern.test(conclusion)) {
        return 'Dangerous consensus detected: Multiple personas recommending destructive actions. ' +
               'TCP protocols require human oversight.';
      }
    }

    return null;
  }

  /**
   * Apply persona-specific safety filters
   */
  filterForPersona(
    solution: string,
    persona: string,
    riskTolerance: RiskLevel
  ): { filtered: string; warnings: string[] } {
    const warnings: string[] = [];
    let filtered = solution;

    // Cassandra (Risk Analyst) - most conservative
    if (persona.toLowerCase() === 'cassandra') {
      filtered = this.applyCassandraSafetyFilters(solution, warnings);
    }
    // Selene (Architect) - conservative, system-focused
    else if (persona.toLowerCase() === 'selene') {
      filtered = this.applySeleneSafetyFilters(solution, warnings);
    }
    // Other personas get standard filtering based on risk tolerance
    else {
      filtered = this.applyStandardSafetyFilters(solution, riskTolerance, warnings);
    }

    return { filtered, warnings };
  }

  /**
   * Get safety statistics for monitoring
   */
  getSafetyStatistics(): {
    safetyRules: number;
    quarantinePatterns: number;
    consensusPatterns: number;
    totalValidations: number;
    blockedActions: number;
  } {
    return {
      safetyRules: this.safetyRules.length,
      quarantinePatterns: this.quarantinePatterns.size,
      consensusPatterns: this.dangerousConsensusPatterns.length,
      totalValidations: 0, // Would track in real implementation
      blockedActions: 0,   // Would track in real implementation
    };
  }

  private initializeSafetyRules(): void {
    this.safetyRules = [
      {
        name: 'Critical Data Destruction',
        description: 'Commands that can permanently destroy data',
        pattern: /\b(rm\s+-rf?|dd\s+if=|shred|wipefs|mkfs\.|format|blkdiscard)\b/i,
        riskLevel: RiskLevel.CRITICAL,
        preventConsensus: true,
        safeAlternative: 'Use backup and quarantine procedures',
        reasoning: 'TCP protocols prevent irreversible data loss',
      },
      {
        name: 'System Modification',
        description: 'Commands that modify system state',
        pattern: /\b(sudo|su|passwd|chmod\s+777|chown\s+root|mount|umount)\b/i,
        riskLevel: RiskLevel.HIGH_RISK,
        preventConsensus: true,
        safeAlternative: 'Request human approval for system changes',
        reasoning: 'System modifications require explicit authorization',
      },
      {
        name: 'Network Security Risk',
        description: 'Commands with network security implications',
        pattern: /\b(curl|wget).*\|\s*(bash|sh|sudo)/i,
        riskLevel: RiskLevel.HIGH_RISK,
        preventConsensus: true,
        safeAlternative: 'Download and review before execution',
        reasoning: 'Prevent arbitrary code execution from network sources',
      },
      {
        name: 'Privilege Escalation',
        description: 'Commands that escalate privileges',
        pattern: /\b(sudo\s+su|pkexec|gksudo)\b/i,
        riskLevel: RiskLevel.HIGH_RISK,
        preventConsensus: false,
        safeAlternative: 'Use specific sudo commands instead of su',
        reasoning: 'Minimize privilege escalation scope',
      },
      {
        name: 'Destructive Git Operations',
        description: 'Git commands that can lose work',
        pattern: /\bgit\s+(reset\s+--hard|clean\s+-[fd]+|push\s+--force)\b/i,
        riskLevel: RiskLevel.MEDIUM_RISK,
        preventConsensus: false,
        safeAlternative: 'Create backup branch before destructive operations',
        reasoning: 'Preserve work history in version control',
      },
      {
        name: 'Container System Risk',
        description: 'Container commands with system access',
        pattern: /\bdocker\s+run.*--privileged/i,
        riskLevel: RiskLevel.HIGH_RISK,
        preventConsensus: true,
        safeAlternative: 'Use specific capabilities instead of --privileged',
        reasoning: 'Minimize container privilege escalation',
      },
    ];
  }

  private initializeQuarantinePatterns(): void {
    // TCP-inspired quarantine-over-delete patterns
    this.quarantinePatterns.set('rm -rf', 'mkdir -p ~/.quarantine && mv');
    this.quarantinePatterns.set('rm -f', 'mkdir -p ~/.quarantine && mv');
    this.quarantinePatterns.set('shred', 'mv');
    this.quarantinePatterns.set('dd if=', 'cp'); // Use copy instead of direct disk ops
    this.quarantinePatterns.set('wipefs', '# QUARANTINE: backup disk first');
    this.quarantinePatterns.set('mkfs.', '# QUARANTINE: verify backup completion');
    
    // System quarantine patterns
    this.quarantinePatterns.set('sudo rm', 'sudo mkdir -p /var/quarantine && sudo mv');
    this.quarantinePatterns.set('docker system prune', 'docker system prune --dry-run');
    this.quarantinePatterns.set('kubectl delete', 'kubectl get --export -o yaml && kubectl delete');
  }

  private initializeDangerousConsensusPatterns(): void {
    // Patterns that indicate dangerous consensus across personas
    this.dangerousConsensusPatterns = [
      /\b(rm\s+-rf\s+\/|dd\s+if=.*of=\/dev\/|mkfs\.|format\s+[cdefgh]:)/i,
      /\b(sudo\s+rm\s+-rf|sudo\s+dd|sudo\s+wipefs)/i,
      /\b(docker\s+system\s+prune.*--all|kubectl\s+delete\s+namespace)/i,
      /\b(git\s+reset\s+--hard\s+HEAD~\d+|git\s+clean\s+-fdx)/i,
    ];
  }

  private applyCassandraSafetyFilters(solution: string, warnings: string[]): string {
    let filtered = solution;

    // Cassandra rejects all destructive operations
    if (/\b(rm|dd|shred|wipefs|mkfs|format)\b/i.test(solution)) {
      warnings.push('CASSANDRA: Blocking all destructive operations');
      filtered = '# BLOCKED BY CASSANDRA: Destructive operation rejected\n' +
                '# Recommended: Use backup procedures and human validation';
    }

    // Block privilege escalation
    if (/\b(sudo|su|pkexec)\b/i.test(solution)) {
      warnings.push('CASSANDRA: Blocking privilege escalation');
      filtered = filtered.replace(/\b(sudo|su|pkexec)\s+/gi, '# BLOCKED: ');
    }

    return filtered;
  }

  private applySeleneSafetyFilters(solution: string, warnings: string[]): string {
    let filtered = solution;

    // Selene focuses on architectural integrity
    if (/\bchmod\s+777\b/i.test(solution)) {
      warnings.push('SELENE: Blocking overly permissive file permissions');
      filtered = filtered.replace(/chmod\s+777/gi, 'chmod 755');
    }

    // Block system-wide changes
    if (/\b(mount|umount|systemctl|service)\b/i.test(solution)) {
      warnings.push('SELENE: System service changes require review');
      filtered = '# SELENE REVIEW REQUIRED: System architecture changes\n' + filtered;
    }

    return filtered;
  }

  private applyStandardSafetyFilters(
    solution: string,
    riskTolerance: RiskLevel,
    warnings: string[]
  ): string {
    let filtered = solution;

    if (riskTolerance < RiskLevel.HIGH_RISK) {
      // Apply quarantine patterns
      for (const [dangerous, safe] of this.quarantinePatterns) {
        if (solution.includes(dangerous)) {
          warnings.push(`TCP: Applying quarantine pattern for ${dangerous}`);
          filtered = filtered.replace(dangerous, safe);
        }
      }
    }

    return filtered;
  }

  private generateQuarantineAlternatives(conclusion: string): string[] {
    const alternatives: string[] = [];

    for (const [dangerous, safe] of this.quarantinePatterns) {
      if (conclusion.includes(dangerous)) {
        alternatives.push(conclusion.replace(dangerous, safe));
      }
    }

    return alternatives;
  }

  private isDestructiveCommand(command: string): boolean {
    const destructivePatterns = [
      /\brm\s+-rf?\b/i,
      /\bdd\s+if=/i,
      /\bshred\b/i,
      /\bwipefs\b/i,
      /\bmkfs\./i,
      /\bformat\b/i,
    ];

    return destructivePatterns.some(pattern => pattern.test(command));
  }

  private wrapInQuarantine(command: string): string {
    return `# TCP Quarantine Wrapper
mkdir -p ~/.tcp-quarantine
echo "$(date): ${command}" >> ~/.tcp-quarantine/audit.log
# Original command quarantined: ${command}
# Execute manually after review if needed`;
  }
}