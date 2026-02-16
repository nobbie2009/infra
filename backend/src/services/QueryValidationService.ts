import logger from '../utils/logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class QueryValidationService {
  /**
   * Forbidden keywords that indicate dangerous SQL operations
   */
  private readonly forbiddenKeywords = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'TRUNCATE',
    'EXEC',
    'EXECUTE',
    'LOAD_FILE',
    'INTO_OUTFILE',
    'UNION',
    'ROLLBACK',
    'SAVEPOINT',
    'LOCK',
    'UNLOCK',
  ];

  /**
   * Validate SQL query - only SELECT statements allowed
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

    const trimmedQuery = query.trim().toUpperCase();

    // Check if starts with SELECT
    if (!trimmedQuery.startsWith('SELECT')) {
      errors.push('Only SELECT queries are allowed');
      return { valid: false, errors };
    }

    // Check for forbidden keywords
    for (const keyword of this.forbiddenKeywords) {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (keywordRegex.test(query)) {
        errors.push(`Query contains forbidden keyword: ${keyword}`);
      }
    }

    // Block SQL comments (-- and /* */)
    if (query.includes('--') || query.includes('/*') || query.includes('*/')) {
      errors.push('SQL comments are not allowed');
    }

    // Block common injection patterns
    if (this.containsInjectionPatterns(query)) {
      errors.push('Query contains potential SQL injection patterns');
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
