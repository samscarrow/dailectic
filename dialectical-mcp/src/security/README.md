# Security Module

The Security module provides comprehensive PII/IP redaction, risk assessment, and human review workflows to ensure the Dialectical Engine v4.0 operates in compliance with privacy regulations and protects sensitive information.

## Quick Start

```typescript
import { createRedactionService } from './security/index.js';

// Create redaction service with default configuration
const redactionService = createRedactionService();

// Redact content
const content = 'Contact admin@company.com at (555) 123-4567 for API key access';
const result = await redactionService.redactContent(content, 'session-001', 'user-123');

if (result.requiresHumanReview) {
  console.log('Content queued for human review');
} else {
  console.log('Redacted content:', result.redactedContent);
  // Output: "Contact [EMAIL_REDACTED] at [PHONE_REDACTED] for API key access"
}
```

## Core Features

### ✅ PII Detection & Protection
- **Email addresses**: user@domain.com → `[EMAIL_REDACTED]`
- **Phone numbers**: (555) 123-4567 → `[PHONE_REDACTED]`
- **SSN**: 123-45-6789 → `[SUPPRESSED]`
- **Credit cards**: 4111111111111111 → `[CARD_REDACTED]`
- **IP addresses**: 192.168.1.1 → `[IP_ADDRESS_GENERALIZED]`
- **Personal names**: John Smith → `[NAME_REDACTED]`

### 🔐 Intellectual Property Protection
- **API keys**: `API_KEY=sk-abc123...` → `[API_KEY_REDACTED]`
- **Passwords**: `password=secret123` → `[PASSWORD_REDACTED]`
- **Connection strings**: `mongodb://user:pass@host` → `[CONNECTION_REDACTED]`
- **Proprietary code**: Class names, trade secrets
- **Copyright material**: Protected content identification

### ⚖️ Risk Assessment & Compliance
- **4-tier risk levels**: Low, Medium, High, Critical
- **Automated compliance checking**: GDPR, CCPA, HIPAA flags
- **Context analysis**: Reduces false positives in test/demo content
- **Confidence scoring**: Machine learning-enhanced detection

### 👤 Human-in-the-Loop Review
- **3-tier approval process**: Automated → Human Review → Legal Review
- **SLA-based queue management**: 4hr urgent, 24hr high priority
- **Audit trail**: Complete activity logging for compliance

## Architecture

```
┌─────────────────────────────────────────────┐
│            Content Input                     │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│         Pattern Detection                   │
│  • 20+ PII/IP/Sensitive patterns          │
│  • Context analysis                        │
│  • Confidence scoring                      │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│         Risk Assessment                     │
│  • Multi-factor risk calculation          │
│  • Compliance flag generation             │
│  • Human review determination              │
└─────────────┬───────────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
┌──────▼──────┐ ┌────▼─────────┐
│ Automatic   │ │ Human Review │
│ Redaction   │ │ Queue        │
│             │ │              │
│ • Mask      │ │ • Priority   │
│ • Tokenize  │ │ • SLA        │
│ • Suppress  │ │ • Approval   │
└─────────────┘ └──────────────┘
```

## Detection Patterns

### PII Patterns (High/Critical Risk)
```typescript
const examples = {
  EMAIL: ['user@company.com', 'admin@example.org'],
  SSN: ['123-45-6789', '123456789'],
  PHONE: ['(555) 123-4567', '555-123-4567', '+1-555-123-4567'],
  CREDIT_CARD: ['4111111111111111', '5555555555554444'],
  IP_ADDRESS: ['192.168.1.1', '10.0.0.1'],
  NAME: ['John Smith', 'Jane Doe'],
  ADDRESS: ['123 Main Street', '456 Oak Avenue']
};
```

### IP Patterns (Critical Risk)
```typescript
const examples = {
  API_KEY: ['API_KEY=sk-1234567890abcdef', 'Bearer ghp_abc123...'],
  PASSWORD: ['password=secret123', 'pwd: "mypassword"'],
  CONNECTION_STRING: ['mongodb://user:pass@host:27017/db'],
  PROPRIETARY_CODE: ['class InternalProcessor', 'CompanySpecificAPI'],
  TRADE_SECRET: ['proprietary algorithm', 'confidential process'],
  COPYRIGHT: ['Copyright © 2024 Company Inc. All rights reserved']
};
```

### Context Analysis
```typescript
// Reduces false positives for development content
const developmentContexts = [
  'example', 'sample', 'test', 'demo', 'placeholder', 'mock',
  'localhost', '127.0.0.1', 'test@example.com', 'your-api-key'
];

// When detected, confidence is reduced by 30%
const confidence = baseConfidence * (hasDevContext ? 0.7 : 1.0);
```

## Configuration Options

### Basic Configuration
```typescript
const config = {
  enabledDetectors: ['EMAIL', 'SSN', 'PHONE', 'API_KEY', 'PASSWORD'],
  riskThresholds: {
    humanReviewRequired: 'HIGH',     // HIGH or CRITICAL triggers review
    automaticSuppression: 'CRITICAL' // CRITICAL items auto-suppressed
  },
  preserveFormatting: true,          // Maintain length/structure when possible
  tokenizationEnabled: true,         // Allow reversible tokenization
  contextAnalysisEnabled: true       // Reduce false positives
};

const redactionService = new RedactionService(config);
```

### Production Configuration
```typescript
const productionConfig = {
  enabledDetectors: [
    // PII
    'EMAIL', 'SSN', 'PHONE', 'CREDIT_CARD', 'IP_ADDRESS', 'NAME', 'ADDRESS', 'URL',
    // IP
    'API_KEY', 'PASSWORD', 'CONNECTION_STRING', 'PROPRIETARY_CODE', 'TRADE_SECRET', 'COPYRIGHT',
    // Sensitive
    'FINANCIAL', 'MEDICAL', 'BIOMETRIC', 'POLITICAL', 'RELIGIOUS'
  ],
  riskThresholds: {
    humanReviewRequired: 'MEDIUM',   // Lower threshold for production
    automaticSuppression: 'HIGH'     // More aggressive suppression
  },
  preserveFormatting: false,         // Security over formatting
  tokenizationEnabled: true,
  contextAnalysisEnabled: true,
  customPatterns: [
    // Add organization-specific patterns
    {
      type: 'COMPANY_ID',
      pattern: /EMP-\d{6}/g,
      description: 'Employee ID numbers',
      riskLevel: 'HIGH',
      defaultAction: 'MASK',
      confidence: 0.95,
      examples: ['EMP-123456', 'EMP-789012']
    }
  ]
};
```

## Usage Examples

### Basic Redaction
```typescript
const content = `
Please contact John Smith at john@company.com or call (555) 123-4567.
His employee SSN is 123-45-6789 and credit card 4111111111111111.
The API key is sk-1234567890abcdefghijk and database password is secret123.
`;

const result = await redactionService.redactContent(content, 'session-001');

console.log('Risk Level:', result.riskAssessment.overallRisk);
console.log('Requires Review:', result.requiresHumanReview);
console.log('Detections:', result.detections.length);
console.log('Processing Time:', result.processingTime, 'ms');

if (!result.requiresHumanReview) {
  console.log('Redacted Content:', result.redactedContent);
}
```

### Handling Human Review Queue
```typescript
// Check pending reviews
const pendingReviews = redactionService.getPendingReviews();
console.log(`${pendingReviews.length} items pending review`);

// Process by priority
pendingReviews.forEach(review => {
  console.log(`Review ${review.id}:
    Priority: ${review.priority}
    Detections: ${review.detections.length}
    Deadline: ${review.reviewDeadline.toLocaleDateString()}
    Content Preview: ${review.content.substring(0, 100)}...
  `);
});

// In a real application, you'd present these in a UI for human reviewers
```

### Risk Assessment Details
```typescript
const result = await redactionService.redactContent(content, 'session-001');

console.log(`Risk Assessment:
  Overall Risk: ${result.riskAssessment.overallRisk}
  Risk Factors: ${result.riskAssessment.riskFactors.join(', ')}
  Compliance Flags: ${result.riskAssessment.complianceFlags.join(', ')}
  Legal Review Required: ${result.riskAssessment.legalReviewRequired}
  Recommended Actions: ${result.riskAssessment.recommendedActions.join(', ')}
`);

// Example output:
// Overall Risk: CRITICAL
// Risk Factors: 1 critical sensitive data items detected, 3 PII items detected
// Compliance Flags: GDPR, CCPA
// Legal Review Required: true
// Recommended Actions: Immediate human review required, Consider legal consultation
```

### Performance Monitoring
```typescript
// System health check
const health = redactionService.healthCheck();

console.log(`Security Service Health:
  Status: ${health.status}
  Pending Reviews: ${health.metrics.pendingReviews}
  Overdue Reviews: ${health.metrics.overduePendingReviews}
  Audit Records: ${health.metrics.auditRecordsCount}
`);

if (health.status !== 'healthy') {
  console.warn('Security service requires attention!');
  // Alert operations team
}
```

### Audit Trail Access
```typescript
// Get all audit records for a session
const auditRecords = redactionService.getAuditRecords('session-001');

auditRecords.forEach(record => {
  console.log(`${record.timestamp.toISOString()}: ${record.action}
    Risk Level: ${record.riskLevel}
    Details: ${JSON.stringify(record.details)}
    User: ${record.userId || 'system'}
  `);
});
```

## Custom Pattern Development

### Adding Organization-Specific Patterns
```typescript
// Define custom pattern
const customPattern = {
  type: 'BADGE_ID',
  pattern: /BADGE-[A-Z]{2}\d{4}/g,
  description: 'Security badge identifiers',
  riskLevel: 'MEDIUM',
  defaultAction: 'MASK',
  confidence: 0.9,
  examples: ['BADGE-AB1234', 'BADGE-XY5678']
};

// Use in configuration
const config = {
  ...defaultConfig,
  customPatterns: [customPattern]
};

const service = new RedactionService(config);
```

### Pattern Testing Utility
```typescript
// Test your patterns before deployment
function testPattern(pattern, testCases) {
  const regex = typeof pattern.pattern === 'string' ? 
    new RegExp(pattern.pattern, 'gi') : pattern.pattern;
  
  testCases.positive.forEach(text => {
    console.assert(regex.test(text), `Should match: ${text}`);
  });
  
  testCases.negative.forEach(text => {
    regex.lastIndex = 0; // Reset regex state
    console.assert(!regex.test(text), `Should NOT match: ${text}`);
  });
}

testPattern(customPattern, {
  positive: ['BADGE-AB1234', 'Employee BADGE-XY5678 has access'],
  negative: ['badge-ab1234', 'BADGE-123', 'BADGE-ABCD']
});
```

## Integration with Knowledge Store

### Secure Content Before Storage
```typescript
// Integrate with knowledge store
async function createSecureSession(sessionData, userId) {
  // 1. Redact session content
  const redactionResult = await redactionService.redactContent(
    JSON.stringify(sessionData), 
    sessionData.sessionId,
    userId
  );
  
  // 2. Handle human review if required
  if (redactionResult.requiresHumanReview) {
    throw new Error('Session requires human review before storage');
  }
  
  // 3. Parse redacted content back to session structure
  const redactedSessionData = JSON.parse(redactionResult.redactedContent);
  
  // 4. Store in knowledge store
  return await knowledgeStore.documents.createSession(redactedSessionData);
}
```

### Audit Integration
```typescript
// Enhanced audit logging
async function auditedRedaction(content, sessionId, userId) {
  const startTime = Date.now();
  
  try {
    const result = await redactionService.redactContent(content, sessionId, userId);
    
    // Additional audit logging
    await auditLogger.log({
      action: 'CONTENT_REDACTION',
      sessionId,
      userId,
      riskLevel: result.riskAssessment.overallRisk,
      detectionsCount: result.detections.length,
      processingTime: Date.now() - startTime,
      success: true
    });
    
    return result;
  } catch (error) {
    await auditLogger.log({
      action: 'CONTENT_REDACTION',
      sessionId,
      userId,
      error: error.message,
      processingTime: Date.now() - startTime,
      success: false
    });
    
    throw error;
  }
}
```

## Compliance Implementation

### GDPR Compliance
```typescript
// Right to be forgotten implementation
async function handleGDPRDeletion(userId) {
  // 1. Find all sessions for user
  const userSessions = await knowledgeStore.documents.getSessionsByUser(userId);
  
  // 2. Redact user PII from content
  for (const session of userSessions) {
    const redactedContent = await redactionService.redactContent(
      session.content, 
      session.sessionId,
      'gdpr-deletion'
    );
    
    // 3. Update with anonymized content
    await knowledgeStore.documents.updateSession(session.sessionId, {
      content: redactedContent.redactedContent,
      userId: null, // Remove user association
      gdprDeleted: true,
      deletionDate: new Date()
    });
  }
  
  // 4. Audit the deletion
  await auditLogger.log({
    action: 'GDPR_DELETION',
    userId,
    sessionsProcessed: userSessions.length,
    timestamp: new Date()
  });
}
```

### CCPA Compliance
```typescript
// California Consumer Privacy Act compliance
async function handleCCPARequest(userId, requestType) {
  switch (requestType) {
    case 'KNOW':
      return await knowledgeStore.getUserPersonalData(userId);
      
    case 'DELETE':
      return await handleGDPRDeletion(userId); // Similar process
      
    case 'OPT_OUT':
      await knowledgeStore.setUserDataSharingOptOut(userId, true);
      break;
  }
}
```

## Testing

### Unit Tests
```bash
# Run security module tests
npm test -- --testPathPattern=security

# Run specific test suites
npm test tests/security/redaction-service.test.ts
npm test tests/security/patterns.test.ts

# Coverage report
npm run test:coverage -- --testPathPattern=security
```

### Performance Testing
```typescript
// Load test the redaction service
async function performanceTest() {
  const content = generateLargeTestContent(10000); // 10k characters
  const iterations = 100;
  
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    await redactionService.redactContent(content, `perf-test-${i}`);
  }
  
  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`Performance Test Results:
    Iterations: ${iterations}
    Total Time: ${totalTime}ms
    Average Time: ${avgTime}ms per redaction
    Throughput: ${(1000 / avgTime).toFixed(2)} redactions/second
  `);
  
  // Assert performance requirements
  expect(avgTime).toBeLessThan(100); // <100ms per redaction
}
```

### Security Testing
```typescript
// Test for security vulnerabilities
describe('Security Vulnerabilities', () => {
  it('should not leak original content in error messages', async () => {
    const sensitiveContent = 'SSN: 123-45-6789, API Key: sk-very-secret-key';
    
    // Cause an error in processing
    const malformedService = new RedactionService(null as any);
    
    try {
      await malformedService.redactContent(sensitiveContent, 'test');
    } catch (error) {
      // Error message should not contain the sensitive content
      expect(error.message).not.toContain('123-45-6789');
      expect(error.message).not.toContain('sk-very-secret-key');
    }
  });
  
  it('should handle malicious regex patterns safely', async () => {
    const maliciousPattern = {
      type: 'MALICIOUS',
      pattern: /^(a+)+$/, // ReDoS vulnerability
      description: 'Malicious pattern',
      riskLevel: 'LOW',
      defaultAction: 'MASK',
      confidence: 0.5,
      examples: ['a']
    };
    
    const config = { ...defaultConfig, customPatterns: [maliciousPattern] };
    const service = new RedactionService(config);
    
    const maliciousInput = 'a'.repeat(1000) + 'b'; // Would cause ReDoS
    
    // Should timeout and fail gracefully, not hang
    const promise = service.redactContent(maliciousInput, 'test');
    await expect(promise).rejects.toThrow(/timeout|failed/i);
  });
});
```

## Deployment Considerations

### Environment Variables
```bash
# Security configuration
REDACTION_HUMAN_REVIEW_THRESHOLD=HIGH
REDACTION_AUTO_SUPPRESS_THRESHOLD=CRITICAL
REDACTION_ENABLE_CONTEXT_ANALYSIS=true
REDACTION_PRESERVE_FORMATTING=false

# Review queue configuration  
REVIEW_QUEUE_URGENT_SLA_HOURS=4
REVIEW_QUEUE_HIGH_SLA_HOURS=24
REVIEW_QUEUE_MEDIUM_SLA_HOURS=48

# Audit configuration
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years
AUDIT_LOG_ENCRYPTION=true
```

### Monitoring & Alerting
```typescript
// Set up monitoring
const monitor = new SecurityMonitor(redactionService, {
  alerts: {
    queueBacklog: { threshold: 50, severity: 'warning' },
    overdueReviews: { threshold: 5, severity: 'critical' },
    highRiskContent: { threshold: 10, severity: 'info' },
    serviceErrors: { threshold: 1, severity: 'critical' }
  }
});

monitor.on('alert', (alert) => {
  console.error(`Security Alert: ${alert.type} - ${alert.message}`);
  // Send to monitoring system (e.g., DataDog, New Relic)
});
```

### Disaster Recovery
```typescript
// Backup and recovery procedures
async function backupSecurityData() {
  const backupData = {
    auditRecords: redactionService.getAuditRecords(),
    pendingReviews: redactionService.getPendingReviews(),
    configuration: redactionService.getConfiguration(),
    timestamp: new Date()
  };
  
  await secureStorage.backup('security-data', backupData);
}

async function restoreSecurityData(backupId) {
  const backupData = await secureStorage.restore('security-data', backupId);
  
  // Restore service state
  await redactionService.restoreState(backupData);
}
```

## Troubleshooting

### Common Issues

**High False Positive Rate**
```typescript
// Increase context analysis sensitivity
const config = {
  ...defaultConfig,
  contextAnalysisEnabled: true,
  customPatterns: [
    // Add negative patterns to reduce false positives
    {
      type: 'NOT_EMAIL',
      pattern: /test@example\.(com|org|net)/gi,
      riskLevel: 'LOW',
      confidence: 0.1  // Very low confidence
    }
  ]
};
```

**Performance Issues**
```typescript
// Optimize for performance
const optimizedConfig = {
  ...defaultConfig,
  enabledDetectors: ['EMAIL', 'SSN', 'API_KEY'], // Only essential patterns
  contextAnalysisEnabled: false,                  // Disable for speed
  preserveFormatting: false                       // Faster redaction
};
```

**Queue Backlog**
```typescript
// Monitor and manage review queue
setInterval(async () => {
  const health = redactionService.healthCheck();
  
  if (health.metrics.pendingReviews > 50) {
    console.warn('Review queue backlog detected');
    
    // Auto-approve low-risk items
    const pendingReviews = redactionService.getPendingReviews();
    const lowRiskReviews = pendingReviews.filter(r => r.priority === 'LOW');
    
    for (const review of lowRiskReviews) {
      await autoApproveReview(review.id);
    }
  }
}, 60000); // Check every minute
```

## API Reference

Complete API documentation:
- [`types.ts`](./types.ts) - Type definitions
- [`patterns.ts`](./patterns.ts) - Detection patterns
- [`redaction-service.ts`](./redaction-service.ts) - Main service implementation

Key interfaces:
- `RedactionService` - Main redaction engine
- `DetectionResult` - Pattern detection results
- `RedactionResult` - Complete redaction output
- `RiskAssessment` - Risk analysis results
- `HumanReviewRequest` - Review queue items