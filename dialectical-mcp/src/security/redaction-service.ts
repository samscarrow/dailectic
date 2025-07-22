import {
  DetectionResult,
  RedactionResult,
  RedactionConfig,
  RiskAssessment,
  RiskLevel,
  DetectionType,
  RedactionAction,
  HumanReviewRequest,
  AuditRecord
} from './types.js';
import { ALL_PATTERNS, CONTEXT_PATTERNS, DOMAIN_PATTERNS, REDACTION_TEMPLATES } from './patterns.js';
import { randomUUID } from 'crypto';

export class RedactionService {
  private config: RedactionConfig;
  private reviewQueue: Map<string, HumanReviewRequest> = new Map();
  private tokenMap: Map<string, string> = new Map();
  private auditLog: AuditRecord[] = [];

  constructor(config: RedactionConfig) {
    this.config = {
      enabledDetectors: config.enabledDetectors || Object.keys(ALL_PATTERNS) as DetectionType[],
      riskThresholds: {
        humanReviewRequired: 'HIGH',
        automaticSuppression: 'CRITICAL',
        ...config.riskThresholds
      },
      preserveFormatting: config.preserveFormatting ?? true,
      tokenizationEnabled: config.tokenizationEnabled ?? true,
      contextAnalysisEnabled: config.contextAnalysisEnabled ?? true,
      customPatterns: config.customPatterns || []
    };
  }

  /**
   * Main redaction method - processes content and returns redacted version
   */
  async redactContent(
    content: string,
    sessionId: string,
    userId?: string
  ): Promise<RedactionResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Detect sensitive content
      const detections = await this.detectSensitiveContent(content);
      
      // Step 2: Assess risk
      const riskAssessment = this.assessRisk(detections);
      
      // Step 3: Determine if human review is required
      const requiresHumanReview = this.requiresHumanReview(riskAssessment);
      
      // Step 4: Apply redactions (if not requiring review)
      let redactedContent = content;
      const redactionMap = new Map<string, string>();
      
      if (!requiresHumanReview) {
        const redactionResult = await this.applyRedactions(content, detections);
        redactedContent = redactionResult.content;
        redactionMap = redactionResult.map;
      } else {
        // Queue for human review
        await this.queueForHumanReview(sessionId, content, detections, userId);
      }
      
      // Step 5: Create audit record
      await this.createAuditRecord({
        sessionId,
        action: 'REDACTION',
        details: {
          detectionsCount: detections.length,
          riskLevel: riskAssessment.overallRisk,
          requiresReview: requiresHumanReview,
          redactionsApplied: !requiresHumanReview
        },
        riskLevel: riskAssessment.overallRisk,
        userId
      });
      
      const processingTime = Date.now() - startTime;
      
      return {
        originalContent: content,
        redactedContent,
        detections,
        redactionMap,
        riskAssessment,
        processingTime,
        requiresHumanReview
      };
      
    } catch (error) {
      console.error('Redaction service error:', error);
      
      // Fail-safe: if redaction fails, require human review
      await this.createAuditRecord({
        sessionId,
        action: 'POLICY_VIOLATION',
        details: { error: error.message },
        riskLevel: 'CRITICAL',
        userId
      });
      
      throw new Error('Content redaction failed - human review required');
    }
  }

  /**
   * Detect sensitive content using pattern matching and context analysis
   */
  private async detectSensitiveContent(content: string): Promise<DetectionResult[]> {
    const detections: DetectionResult[] = [];
    
    // Apply all enabled detection patterns
    for (const detectorType of this.config.enabledDetectors) {
      const pattern = ALL_PATTERNS[detectorType];
      if (!pattern) continue;
      
      const matches = this.findMatches(content, pattern);
      detections.push(...matches);
    }
    
    // Apply custom patterns if provided
    if (this.config.customPatterns) {
      for (const pattern of this.config.customPatterns) {
        const matches = this.findMatches(content, pattern);
        detections.push(...matches);
      }
    }
    
    // Context analysis to reduce false positives
    if (this.config.contextAnalysisEnabled) {
      return this.filterByContext(detections, content);
    }
    
    return detections;
  }

  /**
   * Find pattern matches in content
   */
  private findMatches(content: string, pattern: any): DetectionResult[] {
    const detections: DetectionResult[] = [];
    
    const regex = typeof pattern.pattern === 'string' ? 
      new RegExp(pattern.pattern, 'gi') : 
      pattern.pattern;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      detections.push({
        type: pattern.type,
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: pattern.confidence,
        riskLevel: pattern.riskLevel,
        suggestedAction: pattern.defaultAction,
        context: this.extractContext(content, match.index, 50)
      });
    }
    
    return detections;
  }

  /**
   * Extract surrounding context for better analysis
   */
  private extractContext(content: string, index: number, radius: number): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(content.length, index + radius);
    return content.substring(start, end);
  }

  /**
   * Filter detections based on context to reduce false positives
   */
  private filterByContext(detections: DetectionResult[], content: string): DetectionResult[] {
    return detections.filter(detection => {
      // Check for development/testing context
      const hasDevContext = Object.values(CONTEXT_PATTERNS).some(pattern =>
        pattern.test(detection.context || '')
      );
      
      if (hasDevContext) {
        // Reduce confidence for development contexts
        detection.confidence *= 0.7;
        if (detection.confidence < 0.5) {
          return false; // Filter out low-confidence matches
        }
      }
      
      // Check for domain-specific patterns that might be false positives
      if (detection.type === 'IP_ADDRESS') {
        const isDomainIP = DOMAIN_PATTERNS.DEVELOPMENT.LOCALHOST.test(detection.value);
        if (isDomainIP) {
          detection.riskLevel = 'LOW';
          detection.suggestedAction = 'GENERALIZE';
        }
      }
      
      if (detection.type === 'EMAIL') {
        const isTestEmail = DOMAIN_PATTERNS.DEVELOPMENT.TEST_EMAIL.test(detection.value);
        if (isTestEmail) {
          detection.riskLevel = 'LOW';
          detection.confidence *= 0.5;
        }
      }
      
      return true;
    });
  }

  /**
   * Assess overall risk based on detections
   */
  private assessRisk(detections: DetectionResult[]): RiskAssessment {
    if (detections.length === 0) {
      return {
        overallRisk: 'LOW',
        riskFactors: [],
        complianceFlags: [],
        recommendedActions: ['Content appears safe for processing'],
        legalReviewRequired: false
      };
    }
    
    // Calculate risk factors
    const criticalCount = detections.filter(d => d.riskLevel === 'CRITICAL').length;
    const highCount = detections.filter(d => d.riskLevel === 'HIGH').length;
    const piiCount = detections.filter(d => ['EMAIL', 'SSN', 'PHONE', 'CREDIT_CARD', 'NAME', 'ADDRESS'].includes(d.type)).length;
    const ipCount = detections.filter(d => ['API_KEY', 'PASSWORD', 'CONNECTION_STRING', 'TRADE_SECRET'].includes(d.type)).length;
    
    // Determine overall risk
    let overallRisk: RiskLevel = 'LOW';
    if (criticalCount > 0) overallRisk = 'CRITICAL';
    else if (highCount > 2) overallRisk = 'HIGH';
    else if (highCount > 0 || detections.length > 5) overallRisk = 'MEDIUM';
    
    // Generate risk factors
    const riskFactors: string[] = [];
    if (criticalCount > 0) riskFactors.push(`${criticalCount} critical sensitive data items detected`);
    if (piiCount > 0) riskFactors.push(`${piiCount} PII items detected`);
    if (ipCount > 0) riskFactors.push(`${ipCount} intellectual property items detected`);
    
    // Compliance flags
    const complianceFlags: string[] = [];
    if (piiCount > 0) complianceFlags.push('GDPR', 'CCPA');
    if (ipCount > 0) complianceFlags.push('Trade Secret Protection');
    if (detections.some(d => d.type === 'MEDICAL')) complianceFlags.push('HIPAA');
    
    // Recommended actions
    const recommendedActions: string[] = [];
    if (overallRisk === 'CRITICAL') {
      recommendedActions.push('Immediate human review required');
      recommendedActions.push('Consider legal consultation');
    } else if (overallRisk === 'HIGH') {
      recommendedActions.push('Human review recommended');
      recommendedActions.push('Apply redactions before processing');
    }
    
    const legalReviewRequired = criticalCount > 0 || 
      detections.some(d => ['TRADE_SECRET', 'COPYRIGHT', 'MEDICAL'].includes(d.type));
    
    return {
      overallRisk,
      riskFactors,
      complianceFlags,
      recommendedActions,
      legalReviewRequired
    };
  }

  /**
   * Determine if human review is required
   */
  private requiresHumanReview(riskAssessment: RiskAssessment): boolean {
    // Check risk threshold
    const riskLevels: Record<RiskLevel, number> = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'CRITICAL': 4
    };
    
    const currentRisk = riskLevels[riskAssessment.overallRisk];
    const threshold = riskLevels[this.config.riskThresholds.humanReviewRequired];
    
    return currentRisk >= threshold || riskAssessment.legalReviewRequired;
  }

  /**
   * Apply redactions to content
   */
  private async applyRedactions(
    content: string,
    detections: DetectionResult[]
  ): Promise<{ content: string; map: Map<string, string> }> {
    let redactedContent = content;
    const redactionMap = new Map<string, string>();
    
    // Sort detections by start index in reverse order to maintain indices
    const sortedDetections = [...detections].sort((a, b) => b.startIndex - a.startIndex);
    
    for (const detection of sortedDetections) {
      const originalValue = detection.value;
      let replacement: string;
      
      switch (detection.suggestedAction) {
        case 'MASK':
          replacement = this.getMaskTemplate(detection.type);
          break;
          
        case 'TOKENIZE':
          replacement = this.generateToken(originalValue);
          this.tokenMap.set(replacement, originalValue);
          break;
          
        case 'GENERALIZE':
          replacement = this.getGeneralizedValue(detection.type);
          break;
          
        case 'SUPPRESS':
          replacement = '';
          break;
          
        default:
          replacement = this.getMaskTemplate(detection.type);
      }
      
      // Apply replacement while preserving formatting if enabled
      if (this.config.preserveFormatting && replacement !== '') {
        replacement = this.preserveFormatting(originalValue, replacement);
      }
      
      redactedContent = redactedContent.substring(0, detection.startIndex) + 
                      replacement + 
                      redactedContent.substring(detection.endIndex);
      
      redactionMap.set(originalValue, replacement);
    }
    
    return { content: redactedContent, map: redactionMap };
  }

  /**
   * Get appropriate mask template for detection type
   */
  private getMaskTemplate(type: DetectionType): string {
    return REDACTION_TEMPLATES.MASK[type] || `[${type}_REDACTED]`;
  }

  /**
   * Get generalized value for detection type
   */
  private getGeneralizedValue(type: DetectionType): string {
    return REDACTION_TEMPLATES.GENERALIZE[type] || `[${type}_GENERALIZED]`;
  }

  /**
   * Generate reversible token
   */
  private generateToken(originalValue: string): string {
    const token = `TOKEN_${randomUUID().replace(/-/g, '').substring(0, 8)}`;
    return token;
  }

  /**
   * Preserve original formatting in replacement
   */
  private preserveFormatting(original: string, replacement: string): string {
    // Preserve length for certain types
    if (original.includes('@')) {
      // Email format preservation
      const parts = original.split('@');
      return `[EMAIL_${parts[1]}]`;
    }
    
    if (original.match(/\d{3}-\d{2}-\d{4}/)) {
      // SSN format preservation
      return '[XXX-XX-XXXX]';
    }
    
    return replacement;
  }

  /**
   * Queue content for human review
   */
  private async queueForHumanReview(
    sessionId: string,
    content: string,
    detections: DetectionResult[],
    userId?: string
  ): Promise<void> {
    const reviewId = randomUUID();
    
    // Determine priority based on risk level
    let priority: HumanReviewRequest['priority'] = 'MEDIUM';
    if (detections.some(d => d.riskLevel === 'CRITICAL')) priority = 'URGENT';
    else if (detections.some(d => d.riskLevel === 'HIGH')) priority = 'HIGH';
    else if (detections.length > 10) priority = 'HIGH';
    
    const reviewRequest: HumanReviewRequest = {
      id: reviewId,
      sessionId,
      content,
      detections,
      priority,
      submittedAt: new Date(),
      reviewDeadline: new Date(Date.now() + this.getReviewSLA(priority)),
      requestedBy: userId || 'system',
      status: 'PENDING'
    };
    
    this.reviewQueue.set(reviewId, reviewRequest);
    
    // In a real implementation, this would notify human reviewers
    console.log(`Queued content for human review: ${reviewId} (Priority: ${priority})`);
  }

  /**
   * Get SLA deadline for review priority
   */
  private getReviewSLA(priority: HumanReviewRequest['priority']): number {
    const slaHours = {
      'URGENT': 4,
      'HIGH': 24,
      'MEDIUM': 48,
      'LOW': 72
    };
    
    return slaHours[priority] * 60 * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Create audit record
   */
  private async createAuditRecord(record: Omit<AuditRecord, 'id' | 'timestamp' | 'systemId'>): Promise<void> {
    const auditRecord: AuditRecord = {
      id: randomUUID(),
      timestamp: new Date(),
      systemId: 'dialectical-engine-v4',
      ...record
    };
    
    this.auditLog.push(auditRecord);
    
    // In a real implementation, this would be persisted to secure storage
    console.log('Audit record created:', auditRecord.id);
  }

  /**
   * Get pending human reviews
   */
  getPendingReviews(): HumanReviewRequest[] {
    return Array.from(this.reviewQueue.values())
      .filter(r => r.status === 'PENDING')
      .sort((a, b) => {
        // Sort by priority then by deadline
        const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.reviewDeadline.getTime() - b.reviewDeadline.getTime();
      });
  }

  /**
   * Get audit records
   */
  getAuditRecords(sessionId?: string): AuditRecord[] {
    return this.auditLog.filter(record => 
      !sessionId || record.sessionId === sessionId
    );
  }

  /**
   * Health check for the service
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      pendingReviews: number;
      overduePendingReviews: number;
      auditRecordsCount: number;
      tokenMapSize: number;
    };
  } {
    const now = Date.now();
    const pendingReviews = this.getPendingReviews();
    const overdueReviews = pendingReviews.filter(r => r.reviewDeadline.getTime() < now);
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (overdueReviews.length > 0) {
      status = 'degraded';
    }
    
    if (overdueReviews.length > 10 || pendingReviews.length > 50) {
      status = 'unhealthy';
    }
    
    return {
      status,
      metrics: {
        pendingReviews: pendingReviews.length,
        overduePendingReviews: overdueReviews.length,
        auditRecordsCount: this.auditLog.length,
        tokenMapSize: this.tokenMap.size
      }
    };
  }
}