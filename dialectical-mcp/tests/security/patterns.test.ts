import { PII_PATTERNS, IP_PATTERNS, SENSITIVE_PATTERNS, ALL_PATTERNS } from '../../src/security/patterns.js';

describe('Detection Patterns', () => {
  describe('PII Patterns', () => {
    describe('EMAIL Pattern', () => {
      it('should match valid email addresses', () => {
        const pattern = PII_PATTERNS.EMAIL.pattern as RegExp;
        const validEmails = [
          'user@example.com',
          'admin@company.org',
          'test.email+tag@domain.co.uk',
          'firstname.lastname@subdomain.example.com',
          'user123@test-domain.com',
          'a@b.co'
        ];

        validEmails.forEach(email => {
          expect(pattern.test(email)).toBe(true);
        });
      });

      it('should not match invalid email addresses', () => {
        const pattern = PII_PATTERNS.EMAIL.pattern as RegExp;
        const invalidEmails = [
          'not-an-email',
          '@domain.com',
          'user@',
          'user@.com',
          '.user@domain.com',
          'user..name@domain.com',
          'user name@domain.com'
        ];

        invalidEmails.forEach(email => {
          expect(pattern.test(email)).toBe(false);
        });
      });
    });

    describe('SSN Pattern', () => {
      it('should match valid SSN formats', () => {
        const pattern = PII_PATTERNS.SSN.pattern as RegExp;
        const validSSNs = [
          '123-45-6789',
          '123456789',
          '987-65-4321',
          '000-00-0001'
        ];

        validSSNs.forEach(ssn => {
          expect(pattern.test(ssn)).toBe(true);
        });
      });

      it('should not match invalid SSN formats', () => {
        const pattern = PII_PATTERNS.SSN.pattern as RegExp;
        const invalidSSNs = [
          '12-345-6789',
          '1234-56-789',
          '123-456-789',
          '123-45-67890',
          'abc-de-fghi'
        ];

        invalidSSNs.forEach(ssn => {
          expect(pattern.test(ssn)).toBe(false);
        });
      });
    });

    describe('PHONE Pattern', () => {
      it('should match valid phone number formats', () => {
        const pattern = PII_PATTERNS.PHONE.pattern as RegExp;
        const validPhones = [
          '(555) 123-4567',
          '555-123-4567',
          '555.123.4567',
          '5551234567',
          '+1-555-123-4567',
          '+1 (555) 123-4567'
        ];

        validPhones.forEach(phone => {
          expect(pattern.test(phone)).toBe(true);
        });
      });
    });

    describe('CREDIT_CARD Pattern', () => {
      it('should match valid credit card formats', () => {
        const pattern = PII_PATTERNS.CREDIT_CARD.pattern as RegExp;
        const validCards = [
          '4111111111111111', // Visa
          '5555555555554444', // MasterCard
          '378282246310005',  // American Express
          '6011111111111117', // Discover
          '4000000000000002'  // Visa
        ];

        validCards.forEach(card => {
          expect(pattern.test(card)).toBe(true);
        });
      });

      it('should not match invalid credit card numbers', () => {
        const pattern = PII_PATTERNS.CREDIT_CARD.pattern as RegExp;
        const invalidCards = [
          '1234567890123456', // Invalid format
          '4111-1111-1111-1111', // With dashes
          '411111111111111',  // Too short
          '41111111111111111', // Too long
          'abcdabcdabcdabcd'   // Not numbers
        ];

        invalidCards.forEach(card => {
          expect(pattern.test(card)).toBe(false);
        });
      });
    });

    describe('IP_ADDRESS Pattern', () => {
      it('should match valid IP addresses', () => {
        const pattern = PII_PATTERNS.IP_ADDRESS.pattern as RegExp;
        const validIPs = [
          '192.168.1.1',
          '10.0.0.1',
          '172.16.0.1',
          '8.8.8.8',
          '255.255.255.255',
          '0.0.0.0',
          '127.0.0.1'
        ];

        validIPs.forEach(ip => {
          expect(pattern.test(ip)).toBe(true);
        });
      });

      it('should not match invalid IP addresses', () => {
        const pattern = PII_PATTERNS.IP_ADDRESS.pattern as RegExp;
        const invalidIPs = [
          '256.256.256.256',
          '192.168.1',
          '192.168.1.1.1',
          'not.an.ip.address',
          '192.168.01.1', // Leading zeros should be handled correctly
          '192.168.-1.1'
        ];

        invalidIPs.forEach(ip => {
          expect(pattern.test(ip)).toBe(false);
        });
      });
    });
  });

  describe('IP Patterns', () => {
    describe('API_KEY Pattern', () => {
      it('should match API key assignments', () => {
        const pattern = IP_PATTERNS.API_KEY.pattern as RegExp;
        const validAPIKeys = [
          'API_KEY=sk-1234567890abcdefghijklmnop',
          'api-key: "bearer_token_abc123def456ghi789"',
          'SECRET_KEY = "secret_abc123def456ghi789jkl"',
          'access_token: ghp_1234567890abcdefghijklmnopqrstuvwxyz'
        ];

        validAPIKeys.forEach(apiKey => {
          pattern.lastIndex = 0; // Reset regex state
          expect(pattern.test(apiKey)).toBe(true);
        });
      });

      it('should not match short or placeholder keys', () => {
        const pattern = IP_PATTERNS.API_KEY.pattern as RegExp;
        const invalidAPIKeys = [
          'API_KEY=short',
          'api_key: "your-key-here"',
          'secret = ""',
          'token: 123' // Too short
        ];

        invalidAPIKeys.forEach(apiKey => {
          pattern.lastIndex = 0;
          expect(pattern.test(apiKey)).toBe(false);
        });
      });
    });

    describe('PASSWORD Pattern', () => {
      it('should match password assignments', () => {
        const pattern = IP_PATTERNS.PASSWORD.pattern as RegExp;
        const validPasswords = [
          'password=secretpass123',
          'pwd: "mypassword456"',
          'PASSWORD = SuperSecret789'
        ];

        validPasswords.forEach(password => {
          pattern.lastIndex = 0;
          expect(pattern.test(password)).toBe(true);
        });
      });
    });

    describe('CONNECTION_STRING Pattern', () => {
      it('should match database connection strings', () => {
        const pattern = IP_PATTERNS.CONNECTION_STRING.pattern as RegExp;
        const validConnections = [
          'mongodb://user:pass@localhost:27017/database',
          'postgres://admin:secret@db.company.com:5432/app_db',
          'mysql://root:password@localhost:3306/mydb',
          'redis://user:pass@redis-server:6379'
        ];

        validConnections.forEach(conn => {
          pattern.lastIndex = 0;
          expect(pattern.test(conn)).toBe(true);
        });
      });
    });
  });

  describe('Pattern Properties Validation', () => {
    it('should have required properties for all patterns', () => {
      Object.entries(ALL_PATTERNS).forEach(([key, pattern]) => {
        expect(pattern).toHaveProperty('type');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('riskLevel');
        expect(pattern).toHaveProperty('defaultAction');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern).toHaveProperty('examples');

        // Validate risk levels
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(pattern.riskLevel);

        // Validate actions
        expect(['MASK', 'TOKENIZE', 'GENERALIZE', 'SUPPRESS', 'REVIEW_REQUIRED']).toContain(pattern.defaultAction);

        // Validate confidence range
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);

        // Validate examples
        expect(Array.isArray(pattern.examples)).toBe(true);
        expect(pattern.examples.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent risk levels for critical data types', () => {
      const criticalTypes = ['SSN', 'CREDIT_CARD', 'API_KEY', 'PASSWORD', 'CONNECTION_STRING'];
      
      criticalTypes.forEach(type => {
        if (ALL_PATTERNS[type]) {
          expect(ALL_PATTERNS[type].riskLevel).toBe('CRITICAL');
        }
      });
    });

    it('should have appropriate default actions for risk levels', () => {
      Object.entries(ALL_PATTERNS).forEach(([key, pattern]) => {
        if (pattern.riskLevel === 'CRITICAL') {
          expect(['SUPPRESS', 'REVIEW_REQUIRED']).toContain(pattern.defaultAction);
        }
      });
    });

    it('should have examples that match their own patterns', () => {
      Object.entries(ALL_PATTERNS).forEach(([key, pattern]) => {
        const regex = typeof pattern.pattern === 'string' ? 
          new RegExp(pattern.pattern, 'gi') : 
          pattern.pattern;

        pattern.examples.forEach(example => {
          regex.lastIndex = 0;
          expect(regex.test(example)).toBe(true);
        });
      });
    });
  });

  describe('Pattern Uniqueness', () => {
    it('should not have duplicate detection types', () => {
      const types = Object.keys(ALL_PATTERNS);
      const uniqueTypes = [...new Set(types)];
      
      expect(types).toEqual(uniqueTypes);
    });

    it('should have unique pattern descriptions', () => {
      const descriptions = Object.values(ALL_PATTERNS).map(p => p.description);
      const uniqueDescriptions = [...new Set(descriptions)];
      
      expect(descriptions).toEqual(uniqueDescriptions);
    });
  });

  describe('Pattern Coverage', () => {
    it('should cover all major PII categories', () => {
      const requiredPIITypes = ['EMAIL', 'SSN', 'PHONE', 'CREDIT_CARD', 'IP_ADDRESS'];
      
      requiredPIITypes.forEach(type => {
        expect(PII_PATTERNS).toHaveProperty(type);
      });
    });

    it('should cover all major IP categories', () => {
      const requiredIPTypes = ['API_KEY', 'PASSWORD', 'CONNECTION_STRING'];
      
      requiredIPTypes.forEach(type => {
        expect(IP_PATTERNS).toHaveProperty(type);
      });
    });

    it('should cover sensitive data categories', () => {
      const requiredSensitiveTypes = ['FINANCIAL', 'MEDICAL', 'BIOMETRIC'];
      
      requiredSensitiveTypes.forEach(type => {
        expect(SENSITIVE_PATTERNS).toHaveProperty(type);
      });
    });
  });

  describe('Regular Expression Validity', () => {
    it('should have valid regex patterns', () => {
      Object.entries(ALL_PATTERNS).forEach(([key, pattern]) => {
        if (pattern.pattern instanceof RegExp) {
          // Test that the regex doesn't throw errors
          expect(() => pattern.pattern.test('test string')).not.toThrow();
        } else {
          // Test that string patterns can be converted to regex
          expect(() => new RegExp(pattern.pattern, 'gi')).not.toThrow();
        }
      });
    });

    it('should have global flag for string replacement', () => {
      Object.entries(ALL_PATTERNS).forEach(([key, pattern]) => {
        if (pattern.pattern instanceof RegExp) {
          expect(pattern.pattern.global).toBe(true);
        }
      });
    });
  });
});