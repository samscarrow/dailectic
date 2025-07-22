/**
 * TCP Integration Module for Dialectical-MCP
 * 
 * Provides clean exports for all TCP functionality integrated into
 * the dialectical framework.
 * 
 * This module bridges the breakthrough Tool Capability Protocol research
 * with the Team of Rivals dialectical methodology.
 */

// Core TCP Types
export {
  // Enums
  RiskLevel,
  SecurityFlags,
  FamilyFlags,
  AgentDecision,
  
  // Interfaces
  TCPDescriptor,
  TCPParentDescriptor,
  TCPDeltaDescriptor,
  TCPHierarchicalFamily,
  TCPAnalysisResult,
  PerformanceMetrics,
  TCPDatabaseEntry,
  SafeAlternativePattern,
  TCPConfig,
  
  // Constants
  TCP_CONSTANTS,
  
  // Errors
  TCPError,
  TCPValidationError,
  TCPParsingError,
} from './tcp-types.js';

// Database Management
export { TCPDescriptorDatabase } from './tcp-database.js';

// Hierarchical Compression
export { HierarchicalEncoder } from './hierarchical-encoder.js';

// Safety Patterns
export {
  DebateSafetyPatterns,
  SafetyValidationResult,
  PersonaSafetyContext,
  DebateSafetyRule,
} from './safety-patterns.js';

// Main Service
export {
  TCPService,
  TCPSafetyAssessment,
  PersonaSafetyProfile,
  DebateCompressionResult,
} from './tcp-service.js';

// Convenience function for quick TCP integration
export async function createTCPService(config?: any): Promise<import('./tcp-service.js').TCPService> {
  const { TCPService } = await import('./tcp-service.js');
  const service = new TCPService(config);
  await service.initialize();
  return service;
}

// TCP Integration Information
export const TCP_INTEGRATION_INFO = {
  version: '2.0',
  hierarchicalVersion: '3.0',
  description: 'Tool Capability Protocol integration for Dialectical-MCP',
  capabilities: [
    'Binary command descriptors (24 bytes)',
    'Hierarchical compression (3.4:1)',
    'Microsecond safety analysis',
    'Multi-persona risk assessment',
    'TCP-guided safe alternatives',
    'Dangerous consensus prevention',
  ],
  compressionStats: {
    vsDocumentation: '362:1',
    systemWide: '13,669:1',
    hierarchicalBonus: '3.4:1',
  },
  researchValidated: true,
  integrationFeatures: [
    'Persona-specific safety profiles',
    'Debate conclusion validation',
    'Knowledge compression for debates',
    'Real-time risk monitoring',
  ],
} as const;