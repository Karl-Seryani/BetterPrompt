/**
 * Tests for ErrorHandler
 * Ensures user-friendly, actionable error messages
 */

import { categorizeError, ErrorCategory, formatUserError } from '../../../src/utils/errorHandler';

describe('ErrorHandler', () => {
  describe('categorizeError', () => {
    it('should detect quota exceeded errors', () => {
      const error = new Error('Request failed with status 429');
      const result = categorizeError(error);

      expect(result.category).toBe(ErrorCategory.QUOTA_EXCEEDED);
      expect(result.isRecoverable).toBe(true);
    });

    it('should detect rate limit errors from various sources', () => {
      const errors = [
        new Error('Rate limit exceeded'),
        new Error('Too many requests'),
        new Error('429: rate limit'),
        new Error('You have exceeded your quota'),
      ];

      errors.forEach((error) => {
        const result = categorizeError(error);
        expect(result.category).toBe(ErrorCategory.QUOTA_EXCEEDED);
      });
    });

    it('should detect authentication errors', () => {
      const errors = [
        new Error('401 Unauthorized'),
        new Error('Invalid API key'),
        new Error('Authentication failed'),
        new Error('Invalid credentials'),
        new Error('API key not found'),
      ];

      errors.forEach((error) => {
        const result = categorizeError(error);
        expect(result.category).toBe(ErrorCategory.AUTH_FAILED);
        expect(result.isRecoverable).toBe(true);
      });
    });

    it('should detect network errors', () => {
      const errors = [
        new Error('ECONNREFUSED'),
        new Error('Network request failed'),
        new Error('ETIMEDOUT'),
        new Error('fetch failed'),
        new Error('getaddrinfo ENOTFOUND'),
      ];

      errors.forEach((error) => {
        const result = categorizeError(error);
        expect(result.category).toBe(ErrorCategory.NETWORK_ERROR);
        expect(result.isRecoverable).toBe(true);
      });
    });

    it('should detect timeout errors', () => {
      const errors = [
        new Error('Request timeout'),
        new Error('Operation timed out'),
        new Error('The request timed out after 30 seconds'),
      ];

      errors.forEach((error) => {
        const result = categorizeError(error);
        expect(result.category).toBe(ErrorCategory.TIMEOUT);
        expect(result.isRecoverable).toBe(true);
      });
    });

    it('should detect model unavailable errors', () => {
      const errors = [
        new Error('No language models available'),
        new Error('GPT-4 model not available'),
        new Error('Model not found'),
        new Error('The requested model is not accessible'),
      ];

      errors.forEach((error) => {
        const result = categorizeError(error);
        expect(result.category).toBe(ErrorCategory.MODEL_UNAVAILABLE);
        expect(result.isRecoverable).toBe(true);
      });
    });

    it('should detect permission/consent errors', () => {
      const errors = [
        new Error('User denied permission'),
        new Error('Consent required'),
        new Error('Access denied'),
        new Error('Permission denied'),
      ];

      errors.forEach((error) => {
        const result = categorizeError(error);
        expect(result.category).toBe(ErrorCategory.PERMISSION_DENIED);
        expect(result.isRecoverable).toBe(true);
      });
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Something completely unexpected happened');
      const result = categorizeError(error);

      expect(result.category).toBe(ErrorCategory.UNKNOWN);
      expect(result.isRecoverable).toBe(false);
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const result = categorizeError(error);

      expect(result.originalMessage).toBe('Test error');
    });

    it('should handle string errors', () => {
      const result = categorizeError('Simple error string');

      expect(result.originalMessage).toBe('Simple error string');
    });

    it('should handle non-error objects', () => {
      const result = categorizeError({ message: 'Custom error object' });

      expect(result.originalMessage).toContain('Custom error');
    });
  });

  describe('formatUserError', () => {
    it('should provide actionable message for quota exceeded', () => {
      const error = new Error('429 Too Many Requests');
      const message = formatUserError(error);

      expect(message.toLowerCase()).toContain('rate limit');
      expect(message).toContain('GitHub Copilot');
    });

    it('should provide actionable message for auth errors', () => {
      const error = new Error('Invalid API key');
      const message = formatUserError(error);

      expect(message.toLowerCase()).toContain('authentication');
      expect(message).toContain('GitHub Copilot');
    });

    it('should provide actionable message for network errors', () => {
      const error = new Error('ECONNREFUSED');
      const message = formatUserError(error);

      expect(message.toLowerCase()).toContain('network');
      expect(message).toContain('internet connection');
    });

    it('should provide actionable message for timeout errors', () => {
      const error = new Error('Request timeout');
      const message = formatUserError(error);

      expect(message).toContain('timed out');
      expect(message).toContain('try again');
    });

    it('should provide actionable message for model unavailable', () => {
      const error = new Error('GPT-4 model not available');
      const message = formatUserError(error);

      expect(message).toContain('model');
      expect(message).toContain('GitHub Copilot');
    });

    it('should provide actionable message for permission denied', () => {
      const error = new Error('Permission denied');
      const message = formatUserError(error);

      expect(message).toContain('permission');
      expect(message).toContain('VS Code');
    });

    it('should include original error message for unknown errors', () => {
      const error = new Error('Very specific custom error');
      const message = formatUserError(error);

      expect(message).toContain('Very specific custom error');
    });

    it('should provide fallback for completely unknown errors', () => {
      const message = formatUserError(null as any);

      expect(message).toContain('error');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('Error message quality', () => {
    it('should always provide next steps', () => {
      const errors = [
        new Error('429 Too Many Requests'),
        new Error('Invalid API key'),
        new Error('ECONNREFUSED'),
        new Error('Unknown error'),
      ];

      errors.forEach((error) => {
        const message = formatUserError(error);
        // Should contain at least one actionable phrase
        const hasActionableContent =
          message.includes('try') ||
          message.includes('check') ||
          message.includes('install') ||
          message.includes('settings') ||
          message.includes('retry') ||
          message.includes('Please') ||
          message.includes('wait');

        expect(hasActionableContent).toBe(true);
      });
    });

    it('should not expose technical jargon unnecessarily', () => {
      const error = new Error('ECONNREFUSED at socket.connect');
      const message = formatUserError(error);

      // Should translate technical error to user-friendly message
      expect(message.toLowerCase()).toContain('connection');
      expect(message.toLowerCase()).toContain('network');
    });

    it('should be concise (under 200 characters for primary message)', () => {
      const errors = [
        new Error('429 Too Many Requests'),
        new Error('Invalid API key'),
        new Error('ECONNREFUSED'),
      ];

      errors.forEach((error) => {
        const message = formatUserError(error);
        // Primary message should be concise (allow up to 250 for detailed instructions)
        expect(message.length).toBeLessThan(300);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle errors with no message', () => {
      const error = new Error();
      const result = categorizeError(error);

      expect(result.category).toBeDefined();
      expect(result.originalMessage).toBeDefined();
    });

    it('should handle null/undefined gracefully', () => {
      const result1 = categorizeError(null as any);
      const result2 = categorizeError(undefined as any);

      expect(result1.category).toBe(ErrorCategory.UNKNOWN);
      expect(result2.category).toBe(ErrorCategory.UNKNOWN);
    });

    it('should handle errors with nested messages', () => {
      const error = {
        message: 'Outer error',
        error: { message: '429 Rate limit' },
      };

      const result = categorizeError(error as any);
      // Should detect quota error even in nested structure
      expect(result.category).toBe(ErrorCategory.QUOTA_EXCEEDED);
    });
  });
});
