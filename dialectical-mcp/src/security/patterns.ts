import { DetectionPattern, PIIType, IPType, SensitiveDataType } from './types.js';

// PII Detection Patterns
export const PII_PATTERNS: Record<PIIType, DetectionPattern> = {
  EMAIL: {
    type: 'EMAIL',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    description: 'Email addresses',
    riskLevel: 'HIGH',
    defaultAction: 'MASK',
    confidence: 0.95,
    examples: ['user@example.com', 'admin@company.org']
  },

  SSN: {
    type: 'SSN',
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    description: 'Social Security Numbers',
    riskLevel: 'CRITICAL',
    defaultAction: 'SUPPRESS',
    confidence: 0.98,
    examples: ['123-45-6789', '123456789']
  },

  PHONE: {
    type: 'PHONE',
    pattern: /\b(?:\+1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    description: 'Phone numbers',
    riskLevel: 'HIGH',
    defaultAction: 'MASK',
    confidence: 0.90,
    examples: ['(555) 123-4567', '+1-555-123-4567', '555.123.4567']
  },

  CREDIT_CARD: {
    type: 'CREDIT_CARD',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    description: 'Credit card numbers',
    riskLevel: 'CRITICAL',
    defaultAction: 'SUPPRESS',
    confidence: 0.97,
    examples: ['4111111111111111', '5555555555554444']
  },

  IP_ADDRESS: {
    type: 'IP_ADDRESS',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    description: 'IP addresses',
    riskLevel: 'MEDIUM',
    defaultAction: 'GENERALIZE',
    confidence: 0.85,
    examples: ['192.168.1.1', '10.0.0.1']
  },

  NAME: {
    type: 'NAME',
    pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    description: 'Potential personal names',
    riskLevel: 'HIGH',
    defaultAction: 'REVIEW_REQUIRED',
    confidence: 0.60,
    examples: ['John Smith', 'Jane Doe']
  },

  ADDRESS: {
    type: 'ADDRESS',
    pattern: /\b\d+\s+[A-Z][a-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court)\b/g,
    description: 'Street addresses',
    riskLevel: 'HIGH',
    defaultAction: 'MASK',
    confidence: 0.80,
    examples: ['123 Main Street', '456 Oak Avenue']
  },

  URL: {
    type: 'URL',
    pattern: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/g,
    description: 'URLs that may contain sensitive information',
    riskLevel: 'MEDIUM',
    defaultAction: 'REVIEW_REQUIRED',
    confidence: 0.75,
    examples: ['https://internal-server.company.com', 'http://admin.example.org']
  }
};

// Intellectual Property Detection Patterns
export const IP_PATTERNS: Record<IPType, DetectionPattern> = {
  API_KEY: {
    type: 'API_KEY',
    pattern: /(?:api[_-]?key|access[_-]?token|secret[_-]?key|bearer)\s*[=:]\s*['"]?([a-zA-Z0-9\-_]{20,})/gi,
    description: 'API keys and access tokens',
    riskLevel: 'CRITICAL',
    defaultAction: 'SUPPRESS',
    confidence: 0.92,
    examples: ['API_KEY=sk-1234567890abcdef', 'Bearer token: abc123...']
  },

  PASSWORD: {
    type: 'PASSWORD',
    pattern: /(?:password|pwd|pass)\s*[=:]\s*['"]?([^\s'",;]{6,})/gi,
    description: 'Passwords and credentials',
    riskLevel: 'CRITICAL',
    defaultAction: 'SUPPRESS',
    confidence: 0.88,
    examples: ['password=secret123', 'pwd: mypassword']
  },

  CONNECTION_STRING: {
    type: 'CONNECTION_STRING',
    pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^\s]+/gi,
    description: 'Database connection strings',
    riskLevel: 'CRITICAL',
    defaultAction: 'SUPPRESS',
    confidence: 0.95,
    examples: ['mongodb://user:pass@server:27017/db', 'postgres://admin:secret@db:5432']
  },

  PROPRIETARY_CODE: {
    type: 'PROPRIETARY_CODE',
    pattern: /(?:class|function|interface)\s+(?:Internal|Private|Proprietary|Company)[A-Z][a-zA-Z0-9]+/g,
    description: 'Proprietary class/function names',
    riskLevel: 'HIGH',
    defaultAction: 'GENERALIZE',
    confidence: 0.70,
    examples: ['class InternalProcessor', 'function CompanySpecificLogic']
  },

  TRADE_SECRET: {
    type: 'TRADE_SECRET',
    pattern: /(?:algorithm|formula|process|method)\s+(?:proprietary|confidential|secret|internal)/gi,
    description: 'References to trade secrets',
    riskLevel: 'CRITICAL',
    defaultAction: 'REVIEW_REQUIRED',
    confidence: 0.80,
    examples: ['proprietary algorithm', 'confidential process']
  },

  COPYRIGHT: {
    type: 'COPYRIGHT',
    pattern: /copyright\s+©?\s*\d{4}.*?(?:all rights reserved|proprietary|confidential)/gi,
    description: 'Copyright notices and proprietary claims',
    riskLevel: 'HIGH',
    defaultAction: 'REVIEW_REQUIRED',
    confidence: 0.85,
    examples: ['Copyright © 2024 Company Inc. All rights reserved']
  }
};

// Sensitive Data Patterns
export const SENSITIVE_PATTERNS: Record<SensitiveDataType, DetectionPattern> = {
  FINANCIAL: {
    type: 'FINANCIAL',
    pattern: /(?:account\s+number|routing\s+number|iban|swift|salary|income|financial|revenue)\s*[:\-]?\s*[\d,.$]+/gi,
    description: 'Financial information',
    riskLevel: 'HIGH',
    defaultAction: 'MASK',
    confidence: 0.75,
    examples: ['Account number: 1234567890', 'Salary: $75,000']
  },

  MEDICAL: {
    type: 'MEDICAL',
    pattern: /(?:medical|health|diagnosis|treatment|medication|patient|doctor)\s+(?:record|information|data)/gi,
    description: 'Medical and health information',
    riskLevel: 'CRITICAL',
    defaultAction: 'SUPPRESS',
    confidence: 0.85,
    examples: ['medical record', 'patient information']
  },

  BIOMETRIC: {
    type: 'BIOMETRIC',
    pattern: /(?:fingerprint|biometric|facial\s+recognition|iris\s+scan|dna)/gi,
    description: 'Biometric identifiers',
    riskLevel: 'CRITICAL',
    defaultAction: 'SUPPRESS',
    confidence: 0.90,
    examples: ['fingerprint data', 'facial recognition']
  },

  POLITICAL: {
    type: 'POLITICAL',
    pattern: /(?:political\s+affiliation|voting\s+record|party\s+membership|political\s+opinion)/gi,
    description: 'Political affiliations and opinions',
    riskLevel: 'HIGH',
    defaultAction: 'REVIEW_REQUIRED',
    confidence: 0.80,
    examples: ['political affiliation', 'voting record']
  },

  RELIGIOUS: {
    type: 'RELIGIOUS',
    pattern: /(?:religious\s+belief|faith|denomination|spiritual\s+practice)/gi,
    description: 'Religious beliefs and practices',
    riskLevel: 'HIGH',
    defaultAction: 'REVIEW_REQUIRED',
    confidence: 0.80,
    examples: ['religious belief', 'spiritual practice']
  }
};

// Combined pattern sets for easy access
export const ALL_PATTERNS = {
  ...PII_PATTERNS,
  ...IP_PATTERNS,
  ...SENSITIVE_PATTERNS
};

// Context-based pattern refinements
export const CONTEXT_PATTERNS = {
  // Reduce false positives when these contexts are present
  CODE_CONTEXT: /(?:example|sample|test|demo|placeholder|mock)/gi,
  DOCUMENTATION_CONTEXT: /(?:documentation|readme|guide|tutorial|example)/gi,
  FICTIONAL_CONTEXT: /(?:fictional|fake|dummy|lorem ipsum|jane doe|john smith)/gi
};

// Domain-specific patterns for better accuracy
export const DOMAIN_PATTERNS = {
  DEVELOPMENT: {
    LOCALHOST: /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/g,
    TEST_EMAIL: /(?:test|example|demo)@(?:test|example|demo)\.(?:com|org|net)/gi,
    PLACEHOLDER: /(?:your-api-key|your-password|replace-with|todo|fixme)/gi
  },
  
  SECURITY: {
    HASH: /(?:sha256|md5|hash):\s*[a-f0-9]{32,}/gi,
    UUID: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    JWT: /eyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*/g
  }
};

// Redaction templates
export const REDACTION_TEMPLATES = {
  MASK: {
    EMAIL: '[EMAIL_REDACTED]',
    PHONE: '[PHONE_REDACTED]',
    SSN: '[SSN_REDACTED]',
    CREDIT_CARD: '[CARD_REDACTED]',
    NAME: '[NAME_REDACTED]',
    ADDRESS: '[ADDRESS_REDACTED]',
    API_KEY: '[API_KEY_REDACTED]',
    PASSWORD: '[PASSWORD_REDACTED]',
    CONNECTION_STRING: '[CONNECTION_REDACTED]',
    FINANCIAL: '[FINANCIAL_REDACTED]',
    MEDICAL: '[MEDICAL_REDACTED]',
    BIOMETRIC: '[BIOMETRIC_REDACTED]'
  },
  
  GENERALIZE: {
    IP_ADDRESS: '[IP_ADDRESS_GENERALIZED]',
    PROPRIETARY_CODE: '[PROPRIETARY_CLASS]',
    URL: '[INTERNAL_URL]'
  }
};