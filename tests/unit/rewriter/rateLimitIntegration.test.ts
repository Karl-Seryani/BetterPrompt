/**
 * Integration tests for rate limiting in PromptRewriter
 * Verifies dynamic behavior (not hardcoded results)
 */

import { PromptRewriter } from '../../../src/rewriter/promptRewriter';
import { resetGlobalRateLimiter, getGlobalRateLimiter } from '../../../src/utils/rateLimiter';
import { resetPromptCache } from '../../../src/utils/promptCache';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    show: jest.fn(),
    clear: jest.fn(),
    updateDebugSetting: jest.fn(),
  },
}));

// Mock context detector
jest.mock('../../../src/context/contextDetector', () => ({
  detectContext: jest.fn().mockReturnValue({
    techStack: { languages: ['TypeScript'], frameworks: [], hasTypeScript: true, hasTests: false },
  }),
  formatContextForPrompt: jest.fn().mockReturnValue('Tech: TypeScript'),
}));

// Mock VS Code LM
jest.mock('../../../src/rewriter/vscodeLmRewriter', () => ({
  isVsCodeLmAvailable: jest.fn().mockResolvedValue(false),
  VsCodeLmRewriter: jest.fn(),
}));

// Mock Groq with dynamic responses
jest.mock('../../../src/rewriter/groqRewriter', () => ({
  GroqRewriter: jest.fn().mockImplementation(() => ({
    enhancePrompt: jest.fn().mockResolvedValue({
      original: 'test',
      enhanced: 'Enhanced test prompt with details',
      model: 'llama-3.3-70b',
      confidence: 0.85,
    }),
  })),
}));

describe('Rate Limiting Integration', () => {
  beforeEach(() => {
    // Reset rate limiter and prompt cache before each test
    resetGlobalRateLimiter();
    resetPromptCache();
  });

  afterEach(() => {
    resetGlobalRateLimiter();
    resetPromptCache();
  });

  afterAll(() => {
    // Clean up any pending timers to prevent Jest worker exit warning
    jest.useRealTimers();
  });

  describe('Dynamic rate limit enforcement', () => {
    it('should allow requests up to the limit', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      // Make 10 vague prompts (should all succeed with default 10/min limit)
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await rewriter.processPrompt(`make thing ${i}`);
        results.push(result);
      }

      // All 10 should have succeeded (no rate limit errors)
      const successCount = results.filter((r) => !r.error).length;
      expect(successCount).toBe(10);

      // None should have rate limit errors
      const rateLimitErrors = results.filter((r) => r.error?.includes('Rate limit exceeded'));
      expect(rateLimitErrors).toHaveLength(0);
    });

    it('should block the 11th request with dynamic time remaining', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      // Max out the limit (10 requests)
      for (let i = 0; i < 10; i++) {
        await rewriter.processPrompt(`make thing ${i}`);
      }

      // 11th request should be blocked
      const blockedResult = await rewriter.processPrompt('make one more thing');

      expect(blockedResult.error).toBeDefined();
      expect(blockedResult.error).toContain('Rate limit exceeded');
      expect(blockedResult.error).toContain('Try again in');

      // Verify the time is dynamic (not hardcoded)
      // Should be close to 60 seconds (our window)
      const timeMatch = blockedResult.error?.match(/Try again in (\d+) seconds/);
      expect(timeMatch).toBeTruthy();

      if (timeMatch) {
        const secondsRemaining = parseInt(timeMatch[1], 10);
        // Should be between 55-60 seconds (allowing for execution time)
        expect(secondsRemaining).toBeGreaterThan(55);
        expect(secondsRemaining).toBeLessThanOrEqual(60);
      }
    });

    it('should dynamically update time remaining on repeated blocks', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      // Max out limit
      for (let i = 0; i < 10; i++) {
        await rewriter.processPrompt(`make thing ${i}`);
      }

      // First blocked request
      const blocked1 = await rewriter.processPrompt('blocked 1');
      const time1Match = blocked1.error?.match(/Try again in (\d+) seconds/);
      expect(time1Match).toBeTruthy();
      const time1 = time1Match ? parseInt(time1Match[1], 10) : 0;

      // Wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Second blocked request (time should be ~2 seconds less)
      const blocked2 = await rewriter.processPrompt('blocked 2');
      const time2Match = blocked2.error?.match(/Try again in (\d+) seconds/);
      expect(time2Match).toBeTruthy();
      const time2 = time2Match ? parseInt(time2Match[1], 10) : 0;

      // Time should have decreased (not hardcoded)
      expect(time2).toBeLessThan(time1);
      expect(time1 - time2).toBeGreaterThanOrEqual(1); // At least 1 second difference
      expect(time1 - time2).toBeLessThanOrEqual(3); // At most 3 seconds (allowing for variance)
    }, 10000); // Increase timeout for this test

    it('should only count successful enhancements (not skipped prompts)', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      // Send 15 clear prompts (should be skipped, not count against limit)
      for (let i = 0; i < 15; i++) {
        const result = await rewriter.processPrompt(
          'In src/components/LoginForm.tsx, refactor the handleSubmit function to use async/await with proper error handling'
        );
        expect(result.skipped).toBe(true);
      }

      // Now send vague prompts - should still be able to make 10
      for (let i = 0; i < 10; i++) {
        const result = await rewriter.processPrompt(`make thing ${i}`);
        expect(result.error).toBeUndefined();
      }

      // 11th vague prompt should be blocked
      const blocked = await rewriter.processPrompt('make one more');
      expect(blocked.error).toContain('Rate limit exceeded');
    });

    it('should record requests only after successful enhancement', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      const rateLimiter = getGlobalRateLimiter();

      // Initially should have all 10 requests available
      expect(rateLimiter.getRemainingRequests()).toBe(10);

      // Make 1 enhancement
      await rewriter.processPrompt('make something');

      // Should have 9 remaining (dynamic check)
      expect(rateLimiter.getRemainingRequests()).toBe(9);

      // Make 2 more
      await rewriter.processPrompt('create another');
      await rewriter.processPrompt('build stuff');

      // Should have 7 remaining
      expect(rateLimiter.getRemainingRequests()).toBe(7);
    });

    it('should use global rate limiter (shared across instances)', async () => {
      const rewriter1 = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      const rewriter2 = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      // Make 5 requests with rewriter1
      for (let i = 0; i < 5; i++) {
        await rewriter1.processPrompt(`make thing ${i}`);
      }

      // Make 5 requests with rewriter2
      for (let i = 0; i < 5; i++) {
        await rewriter2.processPrompt(`create thing ${i}`);
      }

      // Both should now be at limit (shared global limiter)
      const blocked1 = await rewriter1.processPrompt('one more');
      const blocked2 = await rewriter2.processPrompt('another one');

      expect(blocked1.error).toContain('Rate limit exceeded');
      expect(blocked2.error).toContain('Rate limit exceeded');
    });
  });

  describe('Edge cases', () => {
    it('should handle errors without consuming rate limit', async () => {
      // Mock Groq to throw error
      const GroqRewriter = require('../../../src/rewriter/groqRewriter').GroqRewriter;
      GroqRewriter.mockImplementationOnce(() => ({
        enhancePrompt: jest.fn().mockRejectedValue(new Error('API error')),
      }));

      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      const rateLimiter = getGlobalRateLimiter();
      const initialRemaining = rateLimiter.getRemainingRequests();

      // This should fail but not consume rate limit
      const result = await rewriter.processPrompt('make something');

      expect(result.error).toBeDefined();

      // Rate limit should NOT have been consumed (error occurred)
      expect(rateLimiter.getRemainingRequests()).toBe(initialRemaining);
    });

    it('should handle threshold check before rate limit check', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      // Max out rate limit
      for (let i = 0; i < 10; i++) {
        await rewriter.processPrompt(`make thing ${i}`);
      }

      // Send clear prompt (should skip due to threshold, not rate limit)
      const result = await rewriter.processPrompt(
        'In src/components/Button.tsx, add a loading prop that shows a spinner'
      );

      // Should be skipped (threshold check happens first)
      expect(result.skipped).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
