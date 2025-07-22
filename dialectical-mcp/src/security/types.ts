// Security and Redaction Types

export type PIIType = 'EMAIL' | 'SSN' | 'PHONE' | 'CREDIT_CARD' | 'IP_ADDRESS' | 'NAME' | 'ADDRESS' | 'URL';
export type IPType = 'API_KEY' | 'PASSWORD' | 'CONNECTION_STRING' | 'PROPRIETARY_CODE' | 'TRADE_SECRET' | 'COPYRIGHT';
export type SensitiveDataType = 'FINANCIAL' | 'MEDICAL' | 'BIOMETRIC' | 'POLITICAL' | 'RELIGIOUS';

export type DetectionType = PIIType | IPType | SensitiveDataType;
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RedactionAction = 'MASK' | 'TOKENIZE' | 'GENERALIZE' | 'SUPPRESS' | 'REVIEW_REQUIRED';

export interface DetectionPattern {
  type: DetectionType;
  pattern: RegExp | string;
  description: string;
  riskLevel: RiskLevel;
  defaultAction: RedactionAction;
  confidence: number; // 0.0 - 1.0
  examples: string[];
}

export interface DetectionResult {
  type: DetectionType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  riskLevel: RiskLevel;
  suggestedAction: RedactionAction;
  context?: string; // Surrounding text for context analysis
}

export interface RedactionResult {
  originalContent: string;
  redactedContent: string;
  detections: DetectionResult[];
  redactionMap: Map<string, string>; // Original -> Token mapping for reversal
  riskAssessment: RiskAssessment;
  processingTime: number;
  requiresHumanReview: boolean;
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  riskFactors: string[];
  complianceFlags: string[];
  recommendedActions: string[];
  legalReviewRequired: boolean;
}

export interface RedactionConfig {
  enabledDetectors: DetectionType[];
  riskThresholds: {
    humanReviewRequired: RiskLevel;
    automaticSuppression: RiskLevel;
  };
  preserveFormatting: boolean;
  tokenizationEnabled: boolean;
  contextAnalysisEnabled: boolean;
  customPatterns?: DetectionPattern[];
}

export interface HumanReviewRequest {
  id: string;
  sessionId: string;
  content: string;
  detections: DetectionResult[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  submittedAt: Date;
  reviewDeadline: Date;
  requestedBy: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
}

export interface ReviewDecision {
  reviewId: string;
  decision: 'APPROVE' | 'APPROVE_WITH_REDACTION' | 'CUSTOM_REDACTION' | 'REJECT' | 'ESCALATE';
  customRedactions?: Array<{
    detection: DetectionResult;
    action: RedactionAction;
    replacement?: string;
  }>;
  comments?: string;
  reviewedBy: string;
  reviewedAt: Date;
}

export interface AuditRecord {
  id: string;
  sessionId: string;
  action: 'DETECTION' | 'REDACTION' | 'HUMAN_REVIEW' | 'POLICY_VIOLATION';
  details: Record<string, any>;
  riskLevel: RiskLevel;
  timestamp: Date;
  userId?: string;
  systemId: string;
}