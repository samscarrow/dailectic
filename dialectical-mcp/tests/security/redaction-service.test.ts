import { RedactionService } from '../../src/security/redaction-service.js';
import { RedactionConfig, DetectionResult, RiskLevel } from '../../src/security/types.js';

describe('RedactionService', () => {
  let redactionService: RedactionService;
  let defaultConfig: RedactionConfig;

  beforeEach(() => {
    defaultConfig = {
      enabledDetectors: ['EMAIL', 'SSN', 'PHONE', 'API_KEY', 'PASSWORD'],
      riskThresholds: {
        humanReviewRequired: 'HIGH',
        automaticSuppression: 'CRITICAL'
      },
      preserveFormatting: true,
      tokenizationEnabled: true,
      contextAnalysisEnabled: true
    };
    
    redactionService = new RedactionService(defaultConfig);
  });

  describe('PII Detection', () => {
    describe('Email Detection', () => {
      it('should detect valid email addresses', async () => {
        const testCases = [
          'user@example.com',
          'admin@company.org',
          'test.email+tag@domain.co.uk',
          'firstname.lastname@subdomain.example.com'
        ];

        for (const email of testCases) {
          const content = `Contact us at ${email} for support`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          expect(result.detections).toHaveLength(1);
          expect(result.detections[0].type).toBe('EMAIL');
          expect(result.detections[0].value).toBe(email);
          expect(result.detections[0].confidence).toBeGreaterThan(0.9);
        }
      });

      it('should not detect invalid email patterns', async () => {
        const testCases = [
          'not-an-email',
          '@domain.com',
          'user@',
          'user@.com',
          'user name@domain.com' // spaces not allowed
        ];

        for (const invalidEmail of testCases) {
          const content = `This is not an email: ${invalidEmail}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const emailDetections = result.detections.filter(d => d.type === 'EMAIL');
          expect(emailDetections).toHaveLength(0);
        }
      });

      it('should reduce confidence for test/example emails', async () => {
        const testEmails = [
          'test@example.com',
          'demo@test.org',
          'example@demo.net'
        ];

        for (const email of testEmails) {
          const content = `Test email: ${email}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          expect(result.detections).toHaveLength(1);
          expect(result.detections[0].type).toBe('EMAIL');
          // Confidence should be reduced for test emails
          expect(result.detections[0].confidence).toBeLessThan(0.9);
        }
      });
    });

    describe('SSN Detection', () => {
      it('should detect SSN patterns', async () => {
        const testCases = [
          { ssn: '123-45-6789', formatted: true },
          { ssn: '123456789', formatted: false },
          { ssn: '987-65-4321', formatted: true }
        ];

        for (const { ssn } of testCases) {
          const content = `SSN: ${ssn}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          expect(result.detections).toHaveLength(1);
          expect(result.detections[0].type).toBe('SSN');
          expect(result.detections[0].value).toBe(ssn);
          expect(result.detections[0].riskLevel).toBe('CRITICAL');
          expect(result.detections[0].suggestedAction).toBe('SUPPRESS');
        }
      });

      it('should not detect invalid SSN patterns', async () => {
        const invalidSSNs = [
          '12-345-6789', // wrong format
          '1234-56-789', // wrong format
          '000-00-0000', // invalid SSN
          '666-00-0000', // invalid SSN
          '123-45-67890' // too many digits
        ];

        for (const invalidSSN of invalidSSNs) {
          const content = `Not an SSN: ${invalidSSN}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const ssnDetections = result.detections.filter(d => d.type === 'SSN');
          expect(ssnDetections).toHaveLength(0);
        }
      });
    });

    describe('Phone Number Detection', () => {
      it('should detect various phone number formats', async () => {
        const testCases = [
          '(555) 123-4567',
          '555-123-4567',
          '555.123.4567',
          '+1-555-123-4567',
          '5551234567'
        ];

        for (const phone of testCases) {
          const content = `Call us at ${phone}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const phoneDetections = result.detections.filter(d => d.type === 'PHONE');
          expect(phoneDetections).toHaveLength(1);
          expect(phoneDetections[0].riskLevel).toBe('HIGH');
        }
      });

      it('should not detect invalid phone patterns', async () => {
        const invalidPhones = [
          '123-45-6789', // looks like SSN
          '12345', // too short
          '555-CALL-NOW', // letters
          '1-800-FLOWERS' // mixed format
        ];

        for (const invalidPhone of invalidPhones) {
          const content = `Not a phone: ${invalidPhone}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const phoneDetections = result.detections.filter(d => d.type === 'PHONE');
          expect(phoneDetections).toHaveLength(0);
        }
      });
    });

    describe('Credit Card Detection', () => {
      it('should detect valid credit card numbers', async () => {
        const testCases = [
          { number: '4111111111111111', type: 'Visa' },
          { number: '5555555555554444', type: 'MasterCard' },
          { number: '378282246310005', type: 'American Express' },
          { number: '6011111111111117', type: 'Discover' }
        ];

        for (const { number } of testCases) {
          const content = `Card number: ${number}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          expect(result.detections).toHaveLength(1);
          expect(result.detections[0].type).toBe('CREDIT_CARD');
          expect(result.detections[0].value).toBe(number);
          expect(result.detections[0].riskLevel).toBe('CRITICAL');
        }
      });
    });

    describe('IP Address Detection', () => {
      it('should detect valid IP addresses', async () => {
        const testCases = [
          '192.168.1.1',
          '10.0.0.1',
          '172.16.0.1',
          '8.8.8.8',
          '255.255.255.255'
        ];

        for (const ip of testCases) {
          const content = `Server IP: ${ip}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const ipDetections = result.detections.filter(d => d.type === 'IP_ADDRESS');
          expect(ipDetections).toHaveLength(1);
          expect(ipDetections[0].value).toBe(ip);
        }
      });

      it('should treat localhost IPs as low risk', async () => {
        const localhostIPs = ['127.0.0.1', '0.0.0.0'];

        for (const ip of localhostIPs) {
          const content = `Localhost: ${ip}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const ipDetections = result.detections.filter(d => d.type === 'IP_ADDRESS');
          if (ipDetections.length > 0) {
            expect(ipDetections[0].riskLevel).toBe('LOW');
          }
        }
      });

      it('should not detect invalid IP addresses', async () => {
        const invalidIPs = [
          '256.256.256.256',
          '192.168.1',
          '192.168.1.1.1',
          'not.an.ip.address'
        ];

        for (const invalidIP of invalidIPs) {
          const content = `Invalid IP: ${invalidIP}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const ipDetections = result.detections.filter(d => d.type === 'IP_ADDRESS');
          expect(ipDetections).toHaveLength(0);
        }
      });
    });
  });

  describe('Intellectual Property Detection', () => {
    describe('API Key Detection', () => {
      it('should detect API keys in various formats', async () => {
        const testCases = [
          'API_KEY=sk-1234567890abcdefghijklmnop',
          'api-key: "bearer_token_abc123def456ghi789"',
          'SECRET_KEY = "secret_abc123def456ghi789jkl"',
          'access_token: "ghp_1234567890abcdefghijklmnopqrstuvwxyz"'
        ];

        for (const apiKey of testCases) {
          const content = `Configuration: ${apiKey}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const apiDetections = result.detections.filter(d => d.type === 'API_KEY');
          expect(apiDetections).toHaveLength(1);
          expect(apiDetections[0].riskLevel).toBe('CRITICAL');
          expect(apiDetections[0].suggestedAction).toBe('SUPPRESS');
        }
      });

      it('should not detect placeholder API keys', async () => {
        const placeholders = [
          'API_KEY=your-api-key-here',
          'secret_key: "replace-with-actual-key"',
          'access_token = "TODO: add real token"'
        ];

        for (const placeholder of placeholders) {
          const content = `Example config: ${placeholder}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const apiDetections = result.detections.filter(d => d.type === 'API_KEY');
          expect(apiDetections).toHaveLength(0);
        }
      });
    });

    describe('Password Detection', () => {
      it('should detect password assignments', async () => {
        const testCases = [
          'password=secretpass123',
          'pwd: "mypassword456"',
          'PASSWORD = "SuperSecret789"'
        ];

        for (const password of testCases) {
          const content = `Database config: ${password}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const passwordDetections = result.detections.filter(d => d.type === 'PASSWORD');
          expect(passwordDetections).toHaveLength(1);
          expect(passwordDetections[0].riskLevel).toBe('CRITICAL');
        }
      });
    });

    describe('Connection String Detection', () => {
      it('should detect database connection strings', async () => {
        const testCases = [
          'mongodb://user:pass@localhost:27017/database',
          'postgres://admin:secret@db.company.com:5432/app_db',
          'mysql://root:password@localhost:3306/mydb',
          'redis://user:pass@redis-server:6379'
        ];

        for (const connectionString of testCases) {
          const content = `Connection: ${connectionString}`;
          const result = await redactionService.redactContent(content, 'test-session');
          
          const connDetections = result.detections.filter(d => d.type === 'CONNECTION_STRING');
          expect(connDetections).toHaveLength(1);
          expect(connDetections[0].riskLevel).toBe('CRITICAL');
        }
      });
    });
  });

  describe('Risk Assessment', () => {
    it('should correctly assess LOW risk for safe content', async () => {
      const content = 'This is a safe message with no sensitive information.';
      const result = await redactionService.redactContent(content, 'test-session');
      
      expect(result.riskAssessment.overallRisk).toBe('LOW');
      expect(result.requiresHumanReview).toBe(false);
      expect(result.detections).toHaveLength(0);
    });

    it('should correctly assess MEDIUM risk', async () => {
      const content = 'Contact admin at admin@company.com for access';
      const result = await redactionService.redactContent(content, 'test-session');
      
      expect(result.riskAssessment.overallRisk).toBe('MEDIUM');
      expect(result.detections).toHaveLength(1);
    });

    it('should correctly assess HIGH risk', async () => {
      const content = 'Employee SSN: 123-45-6789 and email: john.doe@company.com';
      const result = await redactionService.redactContent(content, 'test-session');
      
      expect(result.riskAssessment.overallRisk).toBe('HIGH');
      expect(result.detections.length).toBeGreaterThan(1);
    });

    it('should correctly assess CRITICAL risk', async () => {
      const content = 'API_KEY=sk-abc123, SSN: 123-45-6789, Credit Card: 4111111111111111';
      const result = await redactionService.redactContent(content, 'test-session');
      
      expect(result.riskAssessment.overallRisk).toBe('CRITICAL');
      expect(result.requiresHumanReview).toBe(true);
      expect(result.detections.some(d => d.riskLevel === 'CRITICAL')).toBe(true);
    });
  });

  describe('Redaction Actions', () => {
    it('should mask email addresses correctly', async () => {
      const content = 'Send report to admin@company.com immediately';
      
      // Configure for automatic processing (no human review)
      const lowThresholdConfig = {
        ...defaultConfig,
        riskThresholds: {
          humanReviewRequired: 'CRITICAL',
          automaticSuppression: 'CRITICAL'
        }
      };
      const service = new RedactionService(lowThresholdConfig);
      
      const result = await service.redactContent(content, 'test-session');
      
      expect(result.requiresHumanReview).toBe(false);
      expect(result.redactedContent).toContain('[EMAIL_REDACTED]');
      expect(result.redactedContent).not.toContain('admin@company.com');
    });

    it('should suppress SSNs completely', async () => {
      const content = 'Employee SSN is 123-45-6789 for verification';
      
      const lowThresholdConfig = {
        ...defaultConfig,
        riskThresholds: {
          humanReviewRequired: 'CRITICAL',
          automaticSuppression: 'CRITICAL'
        }
      };
      const service = new RedactionService(lowThresholdConfig);
      
      const result = await service.redactContent(content, 'test-session');
      
      expect(result.redactedContent).not.toContain('123-45-6789');
      expect(result.redactedContent).not.toContain('[SSN_REDACTED]');
      // SSN should be completely suppressed (removed)
    });

    it('should preserve formatting when enabled', async () => {
      const content = 'Call us at (555) 123-4567';
      
      const service = new RedactionService({
        ...defaultConfig,
        preserveFormatting: true,
        riskThresholds: {
          humanReviewRequired: 'CRITICAL',
          automaticSuppression: 'CRITICAL'
        }
      });
      
      const result = await service.redactContent(content, 'test-session');
      
      // Should maintain some formatting structure
      expect(result.redactedContent).toContain('[PHONE_REDACTED]');
    });
  });

  describe('Human Review Queue', () => {
    it('should queue high-risk content for human review', async () => {
      const content = 'SSN: 123-45-6789, API Key: sk-abc123def456';
      const result = await redactionService.redactContent(content, 'test-session', 'user123');
      
      expect(result.requiresHumanReview).toBe(true);
      expect(result.redactedContent).toBe(content); // Original content unchanged
      
      const pendingReviews = redactionService.getPendingReviews();
      expect(pendingReviews).toHaveLength(1);
      expect(pendingReviews[0].sessionId).toBe('test-session');
      expect(pendingReviews[0].priority).toBe('URGENT');
    });

    it('should set appropriate review priorities', async () => {
      const testCases = [
        {
          content: 'Credit card: 4111111111111111',
          expectedPriority: 'URGENT'
        },
        {
          content: 'Email: user@company.com',
          expectedPriority: 'MEDIUM'
        }
      ];

      let sessionCounter = 0;
      for (const { content, expectedPriority } of testCases) {
        await redactionService.redactContent(content, `session-${++sessionCounter}`);
      }

      const reviews = redactionService.getPendingReviews();
      expect(reviews).toHaveLength(2);
      
      const urgentReview = reviews.find(r => r.priority === 'URGENT');
      const mediumReview = reviews.find(r => r.priority === 'MEDIUM');
      
      expect(urgentReview).toBeDefined();
      expect(mediumReview).toBeDefined();
    });
  });

  describe('Context Analysis', () => {
    it('should reduce confidence for development contexts', async () => {
      const content = 'Example email for testing: test@example.com';
      const result = await redactionService.redactContent(content, 'test-session');
      
      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].confidence).toBeLessThan(0.9);
    });

    it('should maintain high confidence for production contexts', async () => {
      const content = 'Production alert: admin@company.com needs immediate attention';
      const result = await redactionService.redactContent(content, 'test-session');
      
      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Configuration Handling', () => {
    it('should respect enabledDetectors configuration', async () => {
      const limitedConfig = {
        ...defaultConfig,
        enabledDetectors: ['EMAIL'] as const
      };
      
      const service = new RedactionService(limitedConfig);
      const content = 'Email: user@test.com, Phone: (555) 123-4567';
      const result = await service.redactContent(content, 'test-session');
      
      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].type).toBe('EMAIL');
    });

    it('should handle disabled context analysis', async () => {
      const noContextConfig = {
        ...defaultConfig,
        contextAnalysisEnabled: false
      };
      
      const service = new RedactionService(noContextConfig);
      const content = 'Example: test@example.com';
      const result = await service.redactContent(content, 'test-session');
      
      // Without context analysis, confidence should remain high
      expect(result.detections[0].confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', async () => {
      const malformedContent = null as any;
      
      await expect(
        redactionService.redactContent(malformedContent, 'test-session')
      ).rejects.toThrow();
    });

    it('should create audit records for errors', async () => {
      try {
        await redactionService.redactContent(null as any, 'test-session');
      } catch (error) {
        // Error expected
      }
      
      const auditRecords = redactionService.getAuditRecords('test-session');
      expect(auditRecords.some(record => record.action === 'POLICY_VIOLATION')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should process content within reasonable time limits', async () => {
      const largeContent = 'user@test.com '.repeat(1000);
      const startTime = Date.now();
      
      await redactionService.redactContent(largeContent, 'test-session');
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Health Check', () => {
    it('should return healthy status initially', () => {
      const health = redactionService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.metrics.pendingReviews).toBe(0);
      expect(health.metrics.overduePendingReviews).toBe(0);
    });

    it('should detect degraded status with overdue reviews', async () => {
      // Create a review with past deadline
      const content = 'SSN: 123-45-6789';
      await redactionService.redactContent(content, 'test-session');
      
      // Mock past deadline by accessing private queue (normally not recommended)
      const reviews = redactionService.getPendingReviews();
      if (reviews.length > 0) {
        (reviews[0] as any).reviewDeadline = new Date(Date.now() - 1000);
      }
      
      const health = redactionService.healthCheck();
      expect(['degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit records for all redaction operations', async () => {
      const content = 'Contact: admin@company.com';
      await redactionService.redactContent(content, 'test-session', 'user123');
      
      const auditRecords = redactionService.getAuditRecords('test-session');
      expect(auditRecords).toHaveLength(1);
      expect(auditRecords[0].action).toBe('REDACTION');
      expect(auditRecords[0].userId).toBe('user123');
    });
  });
});