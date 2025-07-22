// Security module exports
export { RedactionService } from './redaction-service.js';
export * from './types.js';
export * from './patterns.js';

// Factory function for creating configured redaction service
import { RedactionService } from './redaction-service.js';
import { RedactionConfig } from './types.js';

export function createRedactionService(config?: Partial<RedactionConfig>): RedactionService {
  const defaultConfig: RedactionConfig = {
    enabledDetectors: [
      'EMAIL', 'SSN', 'PHONE', 'CREDIT_CARD', 'IP_ADDRESS', 'NAME', 'ADDRESS', 'URL',
      'API_KEY', 'PASSWORD', 'CONNECTION_STRING', 'PROPRIETARY_CODE', 'TRADE_SECRET', 'COPYRIGHT',
      'FINANCIAL', 'MEDICAL', 'BIOMETRIC', 'POLITICAL', 'RELIGIOUS'
    ],
    riskThresholds: {
      humanReviewRequired: 'HIGH',
      automaticSuppression: 'CRITICAL'
    },
    preserveFormatting: true,
    tokenizationEnabled: true,
    contextAnalysisEnabled: true
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return new RedactionService(mergedConfig);
}