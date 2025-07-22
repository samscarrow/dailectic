/**
 * Tool Capability Protocol (TCP) Types for TypeScript
 * 
 * Defines TypeScript interfaces for TCP binary descriptors, security flags,
 * and hierarchical encoding based on the proven tool-capability-protocol research.
 * 
 * References:
 * - TCP Specification v2.0: 24-byte binary descriptors
 * - Hierarchical Encoding v3.0: Parent + delta compression
 * - Proven compression: 362:1 vs documentation, 13,669:1 system-wide
 */

// Risk Level Classifications (5-tier system)
export enum RiskLevel {
  SAFE = 0,        // Read-only, no side effects (cat, echo, git status)
  LOW_RISK = 1,    // Information gathering (ps, find, git log) 
  MEDIUM_RISK = 2, // File/data modification (cp, mv, git commit)
  HIGH_RISK = 3,   // System changes, requires caution (chmod, mount, git rebase)
  CRITICAL = 4     // Data destruction possible (rm, dd, mkfs, git reset --hard)
}

// Security Capability Flags (32-bit field)
export enum SecurityFlags {
  // Risk levels (bits 0-4)
  SAFE = 1 << 0,
  LOW_RISK = 1 << 1,
  MEDIUM_RISK = 1 << 2,
  HIGH_RISK = 1 << 3,
  CRITICAL = 1 << 4,
  // Reserved bit 5
  
  // Capability flags (bits 6-11)
  REQUIRES_ROOT = 1 << 6,          // Needs sudo/administrator privileges
  DESTRUCTIVE = 1 << 7,            // Can permanently delete/destroy data
  NETWORK_ACCESS = 1 << 8,         // Makes network connections
  FILE_MODIFICATION = 1 << 9,      // Modifies file contents or metadata
  SYSTEM_MODIFICATION = 1 << 10,   // Changes system configuration/state
  PRIVILEGE_ESCALATION = 1 << 11,  // Can escalate user privileges
  
  // Reserved bits 12-15 for future capability flags
  // Bits 16-31 reserved for vendor-specific extensions
}

// First-Order TCP Descriptor (24 bytes)
export interface TCPDescriptor {
  magic: Uint8Array;           // 4 bytes: "TCP\x02" + version
  commandHash: Uint8Array;     // 4 bytes: MD5 hash of command name (first 4 bytes)
  securityFlags: number;       // 4 bytes: Risk level + capability bit flags
  performanceExec: number;     // 4 bytes: Execution time estimate (milliseconds)
  performanceMemory: number;   // 2 bytes: Memory usage estimate (megabytes)
  performanceOutput: number;   // 2 bytes: Output size estimate (kilobytes)
  reserved: number;            // 2 bytes: Command length + future extensions
  crc16: number;               // 2 bytes: CRC16 integrity verification
}

// Hierarchical Encoding - Parent Descriptor (16 bytes)
export interface TCPParentDescriptor {
  magic: Uint8Array;           // 4 bytes: "TCP\x03" (hierarchical version)
  familyHash: Uint8Array;      // 4 bytes: MD5 hash of tool name (first 4 bytes)
  commonFlags: number;         // 2 bytes: Properties shared by all subcommands
  subcommandCount: number;     // 1 byte: Number of commands in family (max 255)
  riskFloor: number;           // 1 byte: Minimum risk level across family
  familyProperties: number;    // 2 bytes: Tool type classification metadata
  crc16: number;               // 2 bytes: CRC16 integrity verification
}

// Hierarchical Encoding - Delta Descriptor (6-8 bytes)
export interface TCPDeltaDescriptor {
  subcommandHash: number;      // 1 byte: Hash of subcommand name (8-bit)
  riskDelta: number;           // 1 byte: Risk level above family floor
  specificFlags: number;       // 2 bytes: Capabilities unique to this command
  performanceProfile: number;  // 1 byte: Log-encoded time/memory estimates
  commandLength: number;       // 1 byte: Length of subcommand string
  extendedMetadata?: Uint8Array; // 0-2 bytes: Optional complex command properties
}

// Common Family Flags (16-bit field for parent descriptor)
export enum FamilyFlags {
  ALL_REQUIRE_ROOT = 1 << 0,   // All subcommands need elevated privileges
  LARGE_FAMILY = 1 << 1,       // Tool has >10 subcommands
  HAS_DESTRUCTIVE = 1 << 2,    // Family includes destructive operations
  HAS_SAFE_OPS = 1 << 3,       // Family includes completely safe operations
  VERSION_CONTROL = 1 << 4,    // Git, SVN, Mercurial, etc.
  FILESYSTEM = 1 << 5,         // bcachefs, mkfs, mount, etc.
  CONTAINER = 1 << 6,          // Docker, Kubernetes, Podman, etc.
  CLOUD_CLI = 1 << 7,          // AWS, GCloud, Azure, etc.
  DATABASE = 1 << 8,           // MySQL, PostgreSQL, MongoDB, etc.
  PACKAGE_MANAGER = 1 << 9,    // apt, yum, pacman, npm, etc.
  // Reserved bits 10-15 for future family type classifications
}

// Complete hierarchical family encoding
export interface TCPHierarchicalFamily {
  parent: TCPParentDescriptor;
  deltas: Map<string, TCPDeltaDescriptor>;
  compressionRatio: number;
  commandCount: number;
}

// Agent safety decision types
export enum AgentDecision {
  APPROVED = 'APPROVED',           // Safe to execute automatically
  CAUTION_MODE = 'CAUTION_MODE',   // Execute with additional monitoring
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL', // Need human approval
  REJECT = 'REJECT'                // Too dangerous to execute
}

// Command analysis result
export interface TCPAnalysisResult {
  command: string;
  riskLevel: RiskLevel;
  securityFlags: number;
  agentDecision: AgentDecision;
  safeAlternative?: string;
  analysisTime: number; // microseconds
  reasoning: string;
}

// Performance metrics (logarithmic encoding)
export interface PerformanceMetrics {
  executionTimeMs: number;
  memoryUsageMB: number;
  outputSizeKB: number;
  logEncodedProfile: number; // Single byte combining time+memory logs
}

// TCP Database entry
export interface TCPDatabaseEntry {
  command: string;
  descriptor: TCPDescriptor;
  hierarchicalFamily?: string;
  lastUpdated: Date;
  validationSource: 'expert' | 'pattern' | 'ml';
}

// Safe alternative pattern
export interface SafeAlternativePattern {
  dangerousPattern: RegExp;
  safeAlternative: string;
  reasoning: string;
  preservesIntent: boolean;
}

// TCP service configuration
export interface TCPConfig {
  enableHierarchicalCompression: boolean;
  analysisTimeoutMs: number;
  cacheDescriptors: boolean;
  requireValidation: boolean;
  safetyLevel: 'permissive' | 'balanced' | 'strict';
}

// Constants from TCP specification
export const TCP_CONSTANTS = {
  // Magic bytes for descriptor versions
  MAGIC_V2: new Uint8Array([0x54, 0x43, 0x50, 0x02]), // "TCP\x02"
  MAGIC_V3: new Uint8Array([0x54, 0x43, 0x50, 0x03]), // "TCP\x03"
  
  // Descriptor sizes
  DESCRIPTOR_SIZE: 24,
  PARENT_DESCRIPTOR_SIZE: 16,
  DELTA_DESCRIPTOR_MIN_SIZE: 6,
  DELTA_DESCRIPTOR_MAX_SIZE: 8,
  
  // Performance encoding constants
  EXEC_TIME_BASE: 100,  // Base multiplier for execution time
  MEMORY_BASE: 10,      // Base multiplier for memory usage
  
  // Compression statistics (from research)
  PROVEN_COMPRESSION_RATIO: 362, // vs traditional documentation
  SYSTEM_WIDE_COMPRESSION: 13669, // Full PATH analysis
  HIERARCHICAL_COMPRESSION: 3.4,  // Additional compression for families
} as const;

// Error types
export class TCPError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'TCPError';
  }
}

export class TCPValidationError extends TCPError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class TCPParsingError extends TCPError {
  constructor(message: string) {
    super(message, 'PARSING_ERROR');
  }
}