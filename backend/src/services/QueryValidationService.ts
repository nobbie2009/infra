import logger from '../utils/logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class QueryValidationService {
  /**
   * Dangerous keywords that should trigger a warning
   */
  private readonly dangerousKeywords = [
    'DROP',
    'TRUNCATE',
    'EXEC',
    'EXECUTE',
    'LOAD_FILE',
    'INTO_OUTFILE',
  ];

  /**
   * Validate SQL query - allows SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE, etc.
   */
  validateQuery(query: string): ValidationResult {
    const errors: string[] = [];

    if (!query || typeof query !== 'string') {
      return { valid: false, errors: ['Query must be a non-empty string'] };
    }

    // Check query length
    if (query.length > 10000) {
      errors.push('Query exceeds maximum length of 10,000 characters');
    }

    // Block SQL comments (-- and /* */)
    if (query.includes('--') || query.includes('/*') || query.includes('*/')) {
      errors.push('SQL comments are not allowed');
    }

    // Block common injection patterns
    if (this.containsInjectionPatterns(query)) {
      errors.push('Query contains potential SQL injection patterns');
    }

    // Block extremely dangerous keywords
    for (const keyword of this.dangerousKeywords) {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (keywordRegex.test(query)) {
        errors.push(`Query contains dangerous keyword that is blocked: ${keyword}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for common SQL injection patterns
   */
  private containsInjectionPatterns(query: string): boolean {
    const injectionPatterns = [
      /(\bOR\b.*=.*)/gi, // OR 1=1 type patterns
      /(\bAND\b.*=.*)/gi, // AND 1=1 type patterns
      /(;[\s]*(DROP|DELETE|UPDATE|INSERT))/gi, // Stacked queries
    ];

    // Check for quote termination patterns
    if (query.includes("'") && (query.includes("';") || query.includes("'--"))) {
      return true;
    }

    return injectionPatterns.some((pattern) => pattern.test(query));
  }

  /**
   * Sanitize query for logging (truncate long queries)
   */
  sanitizeForLogging(query: string, maxLength = 200): string {
    if (!query) return '';
    const trimmed = query.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    return trimmed.length > maxLength ? trimmed.substring(0, maxLength) + '...' : trimmed;
  }
}
