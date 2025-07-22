// Jest test setup
import { jest } from '@jest/globals';

// Extend expect with custom matchers if needed
expect.extend({
  toBeValidDetection(received: any, type: string) {
    const pass = received && 
                 received.type === type && 
                 typeof received.confidence === 'number' &&
                 received.confidence >= 0 && received.confidence <= 1 &&
                 ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(received.riskLevel);
    
    return {
      message: () => `expected ${received} to be a valid detection of type ${type}`,
      pass
    };
  }
});

// Global test timeout
jest.setTimeout(30000);