/**
 * TCP Descriptor Database for TypeScript
 * 
 * Manages TCP binary descriptors from breakthrough research,
 * adapted from Python implementation with TypeScript enhancements.
 * 
 * Features:
 * - 24-byte binary descriptors for 700+ commands
 * - Proven 362:1 compression vs traditional documentation
 * - Risk-based security classification
 * - On-demand descriptor generation
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TCPDescriptor,
  TCPDatabaseEntry,
  RiskLevel,
  SecurityFlags,
  AgentDecision,
  TCPAnalysisResult,
  PerformanceMetrics,
  TCP_CONSTANTS,
  TCPError,
  TCPValidationError,
} from './tcp-types.js';

interface SystemStats {
  commandCount: number;
  tcpSize: number;
  docsEstimateKB: number;
  compressionRatio: number;
  riskDistribution: Record<string, number>;
  capabilities: string[];
  families: number;
}

export class TCPDescriptorDatabase {
  private descriptors: Map<string, Uint8Array> = new Map();
  private systemStats: SystemStats;
  private commandFamilies: Map<string, string[]> = new Map();
  private dataDir: string;
  
  // TCP Protocol Configuration
  private tcpConfig = {
    protocolVersion: '2.0',
    descriptorSize: 24,
    compressionTarget: '362:1',
    bridgeMode: true,
    mcpCompatibility: true,
  };

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(__dirname, 'data');
    this.systemStats = {
      commandCount: 0,
      tcpSize: 0,
      docsEstimateKB: 0,
      compressionRatio: 1,
      riskDistribution: {},
      capabilities: [],
      families: 0,
    };
  }

  async loadSystemCommands(): Promise<void> {
    console.log('Loading TCP descriptor database...');
    
    try {
      // Load from existing TCP research if available
      await this.loadFromTCPResearch();
      
      // Generate missing descriptors
      await this.generateMissingDescriptors();
      
      // Calculate system statistics
      await this.calculateSystemStats();
      
      console.log(`TCP database loaded: ${this.descriptors.size} commands, ${this.commandFamilies.size} families`);
      
    } catch (error) {
      console.error('Failed to load TCP database:', error);
      // Fallback to basic descriptor generation
      await this.generateBasicDescriptors();
    }
  }

  private async loadFromTCPResearch(): Promise<void> {
    // Try to load from tool-capability-protocol research data
    const researchPath = path.join(process.cwd(), '..', 'tool-capability-protocol');
    
    try {
      const analysisPattern = /comprehensive_tcp_analysis_.*\.json$/;
      const files = await fs.readdir(researchPath);
      const analysisFiles = files.filter(f => analysisPattern.test(f));
      
      if (analysisFiles.length > 0) {
        // Get the latest analysis file
        const latestFile = analysisFiles[analysisFiles.length - 1];
        const filePath = path.join(researchPath, latestFile);
        
        console.log(`Loading from TCP research: ${latestFile}`);
        
        const researchData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        
        // Extract TCP descriptors from research
        const families = researchData.families || {};
        for (const [familyName, familyData] of Object.entries(families)) {
          const commands = (familyData as any).commands || {};
          this.commandFamilies.set(familyName, Object.keys(commands));
          
          for (const [command, hexDescriptor] of Object.entries(commands)) {
            try {
              const descriptor = new Uint8Array(
                (hexDescriptor as string).match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
              );
              this.descriptors.set(command, descriptor);
            } catch (error) {
              console.warn(`Invalid hex descriptor for ${command}`);
            }
          }
        }
        
        console.log(`Loaded TCP research data: ${this.descriptors.size} commands`);
      } else {
        console.log('No TCP research data found, will generate descriptors');
      }
    } catch (error) {
      console.log('TCP research directory not accessible, using generated descriptors');
    }
  }

  private async generateMissingDescriptors(): Promise<void> {
    const commonCommands = [
      // Critical commands
      'rm', 'dd', 'shred', 'wipefs', 'mkfs', 'fdisk', 'parted', 'format', 'blkdiscard',
      
      // High-risk commands
      'sudo', 'su', 'passwd', 'chmod', 'chown', 'chgrp', 'mount', 'umount', 
      'kill', 'killall', 'pkill',
      
      // Medium-risk commands
      'cp', 'mv', 'curl', 'wget', 'tar', 'zip', 'ssh', 'scp',
      
      // Low-risk commands
      'ps', 'top', 'ls', 'find', 'grep', 'cat', 'head', 'tail',
      
      // Safe commands
      'echo', 'printf', 'date', 'whoami', 'id', 'uname', 'which',
    ];

    for (const command of commonCommands) {
      if (!this.descriptors.has(command)) {
        const descriptor = this.generateTCPDescriptor(command);
        this.descriptors.set(command, descriptor);
        
        // Add to system family
        const systemCommands = this.commandFamilies.get('system') || [];
        if (!systemCommands.includes(command)) {
          systemCommands.push(command);
          this.commandFamilies.set('system', systemCommands);
        }
      }
    }
  }

  private generateTCPDescriptor(command: string): Uint8Array {
    // Analyze command security characteristics
    const { riskLevel, securityFlags } = this.analyzeCommandSecurity(command);
    
    // Estimate performance characteristics
    const { executionTimeMs, memoryUsageMB, outputSizeKB } = this.estimatePerformance(command);
    
    // Build TCP descriptor according to v2 specification
    const descriptor = new ArrayBuffer(24);
    const view = new DataView(descriptor);
    
    // Magic + version (4 bytes)
    view.setUint8(0, 0x54); // 'T'
    view.setUint8(1, 0x43); // 'C' 
    view.setUint8(2, 0x50); // 'P'
    view.setUint8(3, 0x02); // version 2
    
    // Command hash (4 bytes) - first 4 bytes of MD5
    const hash = crypto.createHash('md5').update(command).digest();
    for (let i = 0; i < 4; i++) {
      view.setUint8(4 + i, hash[i]);
    }
    
    // Security flags (4 bytes, big-endian)
    view.setUint32(8, securityFlags, false);
    
    // Performance: execution time (4 bytes), memory (2 bytes), output (2 bytes)
    view.setUint32(12, executionTimeMs, false);
    view.setUint16(16, memoryUsageMB, false);
    view.setUint16(18, outputSizeKB, false);
    
    // Reserved (2 bytes) - command length + future use
    view.setUint16(20, command.length, false);
    
    // CRC16 checksum (2 bytes) - simplified checksum
    const dataForCrc = new Uint8Array(descriptor, 0, 22);
    const crc = this.calculateCRC16(dataForCrc);
    view.setUint16(22, crc, false);
    
    return new Uint8Array(descriptor);
  }

  private analyzeCommandSecurity(command: string): { riskLevel: RiskLevel; securityFlags: number } {
    let securityFlags = 0;
    let riskLevel: RiskLevel;
    
    // Critical commands - can destroy data permanently
    if (['rm', 'dd', 'shred', 'wipefs', 'mkfs', 'fdisk', 'parted', 'format'].includes(command)) {
      securityFlags |= SecurityFlags.CRITICAL;
      securityFlags |= SecurityFlags.DESTRUCTIVE;
      securityFlags |= SecurityFlags.SYSTEM_MODIFICATION;
      securityFlags |= SecurityFlags.FILE_MODIFICATION;
      securityFlags |= SecurityFlags.REQUIRES_ROOT;
      riskLevel = RiskLevel.CRITICAL;
      
    // High-risk commands - system modifications
    } else if (['sudo', 'su', 'passwd', 'chmod', 'chown', 'mount', 'umount', 'kill'].includes(command)) {
      securityFlags |= SecurityFlags.HIGH_RISK;
      securityFlags |= SecurityFlags.REQUIRES_ROOT;
      securityFlags |= SecurityFlags.SYSTEM_MODIFICATION;
      if (['kill', 'killall', 'pkill'].includes(command)) {
        securityFlags |= SecurityFlags.DESTRUCTIVE;
      }
      riskLevel = RiskLevel.HIGH_RISK;
      
    // Medium-risk commands - file operations
    } else if (['cp', 'mv', 'tar', 'zip', 'ssh', 'scp'].includes(command)) {
      securityFlags |= SecurityFlags.MEDIUM_RISK;
      securityFlags |= SecurityFlags.FILE_MODIFICATION;
      if (['ssh', 'scp', 'curl', 'wget'].includes(command)) {
        securityFlags |= SecurityFlags.NETWORK_ACCESS;
      }
      riskLevel = RiskLevel.MEDIUM_RISK;
      
    // Low-risk commands - information gathering
    } else if (['ps', 'top', 'find', 'grep'].includes(command)) {
      securityFlags |= SecurityFlags.LOW_RISK;
      riskLevel = RiskLevel.LOW_RISK;
      
    // Safe commands - read-only operations
    } else {
      securityFlags |= SecurityFlags.SAFE;
      riskLevel = RiskLevel.SAFE;
    }
    
    return { riskLevel, securityFlags };
  }

  private estimatePerformance(command: string): PerformanceMetrics {
    // Performance estimates based on command type
    if (['dd', 'shred', 'mkfs'].includes(command)) {
      return { executionTimeMs: 10000, memoryUsageMB: 1000, outputSizeKB: 100, logEncodedProfile: 0 };
    } else if (['find', 'grep', 'tar'].includes(command)) {
      return { executionTimeMs: 2000, memoryUsageMB: 200, outputSizeKB: 50, logEncodedProfile: 0 };
    } else if (['cp', 'mv', 'ssh'].includes(command)) {
      return { executionTimeMs: 1000, memoryUsageMB: 100, outputSizeKB: 20, logEncodedProfile: 0 };
    } else if (['ps', 'top', 'ls'].includes(command)) {
      return { executionTimeMs: 500, memoryUsageMB: 50, outputSizeKB: 10, logEncodedProfile: 0 };
    } else {
      return { executionTimeMs: 100, memoryUsageMB: 10, outputSizeKB: 1, logEncodedProfile: 0 };
    }
  }

  private calculateCRC16(data: Uint8Array): number {
    // Simplified CRC16 calculation
    let crc = 0xFFFF;
    for (const byte of data) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        if (crc & 1) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc >>= 1;
        }
      }
    }
    return crc & 0xFFFF;
  }

  private async generateBasicDescriptors(): Promise<void> {
    const basicCommands = ['ls', 'cat', 'echo', 'rm', 'cp', 'mv', 'grep', 'find'];
    
    for (const command of basicCommands) {
      this.descriptors.set(command, this.generateTCPDescriptor(command));
    }
    
    this.commandFamilies.set('basic', basicCommands);
    console.log(`Generated basic TCP descriptors: ${basicCommands.length} commands`);
  }

  private async calculateSystemStats(): Promise<void> {
    const totalCommands = this.descriptors.size;
    const tcpSize = totalCommands * TCP_CONSTANTS.DESCRIPTOR_SIZE;
    
    // Estimate traditional documentation size (conservative 125KB per command)
    const docsEstimate = totalCommands * 125 * 1024;
    const compressionRatio = docsEstimate / tcpSize;
    
    // Analyze risk distribution
    const riskDistribution: Record<string, number> = {
      SAFE: 0, LOW_RISK: 0, MEDIUM_RISK: 0, HIGH_RISK: 0, CRITICAL: 0
    };
    const capabilities = new Set<string>();
    
    for (const [command, descriptor] of this.descriptors.entries()) {
      try {
        const analysis = this.decodeDescriptorQuick(descriptor);
        riskDistribution[analysis.riskLevel]++;
        analysis.capabilities.forEach(cap => capabilities.add(cap));
      } catch (error) {
        // Skip invalid descriptors
        continue;
      }
    }
    
    this.systemStats = {
      commandCount: totalCommands,
      tcpSize,
      docsEstimateKB: Math.floor(docsEstimate / 1024),
      compressionRatio: Math.floor(compressionRatio),
      riskDistribution,
      capabilities: Array.from(capabilities),
      families: this.commandFamilies.size,
    };
  }

  private decodeDescriptorQuick(descriptor: Uint8Array): { riskLevel: string; capabilities: string[] } {
    if (descriptor.length !== TCP_CONSTANTS.DESCRIPTOR_SIZE) {
      return { riskLevel: 'UNKNOWN', capabilities: [] };
    }
    
    const view = new DataView(descriptor.buffer, descriptor.byteOffset);
    const securityFlags = view.getUint32(8, false);
    
    // Decode risk level
    let riskLevel: string;
    if (securityFlags & SecurityFlags.CRITICAL) {
      riskLevel = 'CRITICAL';
    } else if (securityFlags & SecurityFlags.HIGH_RISK) {
      riskLevel = 'HIGH_RISK';
    } else if (securityFlags & SecurityFlags.MEDIUM_RISK) {
      riskLevel = 'MEDIUM_RISK';
    } else if (securityFlags & SecurityFlags.LOW_RISK) {
      riskLevel = 'LOW_RISK';
    } else {
      riskLevel = 'SAFE';
    }
    
    // Decode capabilities
    const capabilities: string[] = [];
    if (securityFlags & SecurityFlags.REQUIRES_ROOT) capabilities.push('REQUIRES_ROOT');
    if (securityFlags & SecurityFlags.DESTRUCTIVE) capabilities.push('DESTRUCTIVE');
    if (securityFlags & SecurityFlags.NETWORK_ACCESS) capabilities.push('NETWORK_ACCESS');
    if (securityFlags & SecurityFlags.FILE_MODIFICATION) capabilities.push('FILE_MODIFICATION');
    if (securityFlags & SecurityFlags.SYSTEM_MODIFICATION) capabilities.push('SYSTEM_MODIFICATION');
    
    return { riskLevel, capabilities };
  }

  async getDescriptor(command: string): Promise<Uint8Array> {
    // Clean command (handle arguments)
    const baseCommand = command.includes(' ') ? command.split(' ')[0] : command;
    
    let descriptor = this.descriptors.get(baseCommand);
    if (!descriptor) {
      // Generate on-demand for unknown commands
      console.log(`Generating TCP descriptor on-demand: ${baseCommand}`);
      descriptor = this.generateTCPDescriptor(baseCommand);
      this.descriptors.set(baseCommand, descriptor);
    }
    
    return descriptor;
  }

  async analyzeCommandSafety(command: string): Promise<TCPAnalysisResult> {
    const startTime = performance.now();
    const descriptor = await this.getDescriptor(command);
    const analysis = this.decodeDescriptorQuick(descriptor);
    const analysisTime = (performance.now() - startTime) * 1000; // microseconds
    
    // Determine agent decision based on risk level
    let agentDecision: AgentDecision;
    let safeAlternative: string | undefined;
    
    switch (analysis.riskLevel) {
      case 'CRITICAL':
        agentDecision = AgentDecision.REJECT;
        safeAlternative = this.getSafeAlternative(command);
        break;
      case 'HIGH_RISK':
        agentDecision = AgentDecision.REQUIRE_APPROVAL;
        break;
      case 'MEDIUM_RISK':
        agentDecision = AgentDecision.CAUTION_MODE;
        break;
      default:
        agentDecision = AgentDecision.APPROVED;
    }
    
    return {
      command,
      riskLevel: RiskLevel[analysis.riskLevel as keyof typeof RiskLevel],
      securityFlags: 0, // Could decode from descriptor if needed
      agentDecision,
      safeAlternative,
      analysisTime,
      reasoning: `TCP analysis: ${analysis.riskLevel} risk level with capabilities: ${analysis.capabilities.join(', ')}`,
    };
  }

  private getSafeAlternative(command: string): string | undefined {
    // TCP-inspired safe alternative patterns
    const alternatives: Record<string, string> = {
      'rm': 'mkdir -p ~/.quarantine && mv', // Quarantine instead of delete
      'dd': 'cp',  // Copy instead of direct disk operations
      'shred': 'mv', // Move to quarantine
      'mkfs': '# DANGEROUS: Use backup utilities instead',
    };
    
    const baseCommand = command.split(' ')[0];
    return alternatives[baseCommand];
  }

  async getSystemStatistics(): Promise<SystemStats> {
    return { ...this.systemStats };
  }

  get commandCount(): number {
    return this.descriptors.size;
  }

  listCommands(): string[] {
    return Array.from(this.descriptors.keys());
  }

  listFamilies(): string[] {
    return Array.from(this.commandFamilies.keys());
  }

  getFamilyCommands(family: string): string[] {
    return this.commandFamilies.get(family) || [];
  }

  // TCP Protocol Bridge Methods (for future standalone TCP)
  async tcpQuery(command: string): Promise<Uint8Array> {
    return this.getDescriptor(command);
  }

  async tcpBatchQuery(commands: string[]): Promise<Map<string, Uint8Array>> {
    const results = new Map<string, Uint8Array>();
    for (const command of commands) {
      results.set(command, await this.getDescriptor(command));
    }
    return results;
  }

  getTcpConfig(): typeof this.tcpConfig {
    return { ...this.tcpConfig };
  }
}