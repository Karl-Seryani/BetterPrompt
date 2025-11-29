/**
 * Integration tests for full prompt enhancement flow
 * Tests the complete path from user input to enhanced output
 *
 * These tests verify that all components work together correctly,
 * not just individual units in isolation.
 */

import { PromptRewriter } from '../../src/rewriter/promptRewriter';
import { analyzePrompt } from '../../core/analyzer';
import { resetGlobalRateLimiter, getGlobalRateLimiter } from '../../src/utils/rateLimiter';
import { resetPromptCache } from '../../src/utils/promptCache';

// Mock VS Code
jest.mock('vscode', () => ({
  lm: {
    selectChatModels: jest.fn().mockResolvedValue([]),
  },
  workspace: {
    workspaceFolders: undefined,
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn(),
    }),
  },
  window: {
    activeTextEditor: undefined,
  },
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
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
jest.mock('../../src/context/contextDetector', () => ({
  detectContext: jest.fn().mockResolvedValue({
    techStack: { languages: ['TypeScript'], frameworks: [], hasTypeScript: true, hasTests: false },
  }),
  formatContextForPrompt: jest.fn().mockReturnValue('Tech: TypeScript'),
}));

// Mock VS Code LM availability
jest.mock('../../src/rewriter/vscodeLmRewriter', () => ({
  isVsCodeLmAvailable: jest.fn().mockResolvedValue(false),
  VsCodeLmRewriter: jest.fn(),
}));

// Mock Groq with controllable responses
const mockGroqEnhance = jest.fn();
jest.mock('../../src/rewriter/groqRewriter', () => ({
  GroqRewriter: jest.fn().mockImplementation(() => ({
    enhancePrompt: mockGroqEnhance,
  })),
}));

describe('Full Enhancement Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGlobalRateLimiter();

    // Default Groq mock response
    mockGroqEnhance.mockResolvedValue({
      original: 'test prompt',
      enhanced: 'Implement a comprehensive test suite with Jest covering unit and integration tests',
      model: 'llama-3.3-70b',
      confidence: 0.85,
    });
  });

  afterEach(() => {
    resetGlobalRateLimiter();
    resetPromptCache();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Vague prompt enhancement', () => {
    it('should analyze, enhance, and return result for vague prompt', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      const result = await rewriter.processPrompt('make a website');

      // Should trigger enhancement (vague prompt)
      expect(result.shouldRewrite).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.score).toBeGreaterThan(30);
      expect(result.rewrite).toBeDefined();
      expect(result.rewrite?.enhanced).toBeDefined();
    });

    it('should skip enhancement for clear prompts', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      const clearPrompt =
        'In src/components/LoginForm.tsx, refactor the handleSubmit function to use async/await with proper error handling';
      const result = await rewriter.processPrompt(clearPrompt);

      // Should skip (clear prompt below threshold)
      expect(result.skipped).toBe(true);
      expect(result.shouldRewrite).toBe(false);
      expect(result.analysis.score).toBeLessThan(30);
    });

    it('should include context detection in the flow', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
        includeContext: true,
      });

      const result = await rewriter.processPrompt('fix the bug');

      // Context should be detected and included
      expect(result.context).toBeDefined();
      expect(result.context?.techStack).toBeDefined();
    });
  });

  describe('Cancellation handling', () => {
    it('should return cancellation error when token is already cancelled', async () => {
      const mockToken = {
        isCancellationRequested: true,
        onCancellationRequested: jest.fn(),
      };

      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      const result = await rewriter.processPrompt('make something', mockToken as any);

      expect(result.shouldRewrite).toBe(false);
      expect(result.error).toContain('cancelled');
    });

    it('should pass cancellation token through to rewriter', async () => {
      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      };

      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      await rewriter.processPrompt('make something', mockToken as any);

      // Groq enhancePrompt should have been called with the token and analysis
      expect(mockGroqEnhance).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        mockToken,
        expect.objectContaining({ score: expect.any(Number) })
      );
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits across multiple requests', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      // Make 10 requests (max allowed)
      for (let i = 0; i < 10; i++) {
        await rewriter.processPrompt(`make thing ${i}`);
      }

      // 11th request should be blocked
      const result = await rewriter.processPrompt('make one more');

      expect(result.error).toBeDefined();
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should not count skipped prompts against rate limit', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      const clearPrompt =
        'In src/auth/login.ts, implement JWT token refresh with automatic retry on 401 responses';

      // Send 15 clear prompts (should all be skipped)
      for (let i = 0; i < 15; i++) {
        const result = await rewriter.processPrompt(clearPrompt);
        expect(result.skipped).toBe(true);
      }

      // Rate limiter should still have capacity
      const rateLimiter = getGlobalRateLimiter();
      expect(rateLimiter.getRemainingRequests()).toBe(10);
    });

    it('should provide accurate time until reset in error message', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      // Max out rate limit
      for (let i = 0; i < 10; i++) {
        await rewriter.processPrompt(`make thing ${i}`);
      }

      // Get blocked result
      const result = await rewriter.processPrompt('blocked');

      expect(result.error).toMatch(/Try again in \d+ seconds/);
    });
  });

  describe('Error scenarios', () => {
    it('should handle API errors gracefully', async () => {
      mockGroqEnhance.mockRejectedValueOnce(new Error('API connection failed'));

      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      const result = await rewriter.processPrompt('make something');

      expect(result.shouldRewrite).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when no AI model available', async () => {
      const rewriter = new PromptRewriter({
        // No Groq API key
        threshold: 30,
      });

      const result = await rewriter.processPrompt('make something');

      expect(result.shouldRewrite).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('No AI model available');
    });
  });

  describe('Analyzer integration', () => {
    it('should use analyzer to detect vagueness before enhancement', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
      });

      const result = await rewriter.processPrompt('create an app');

      // Analysis should detect vague verb
      expect(result.analysis.hasVagueVerb).toBe(true);
      expect(result.analysis.issues.length).toBeGreaterThan(0);
    });

    it('should use specificity scoring to offset vague verb penalty', async () => {
      // A prompt with vague verb but high specificity
      const specificPrompt =
        'build a REST API with JWT authentication, rate limiting, PostgreSQL database, and Docker deployment';

      const analysis = analyzePrompt(specificPrompt);

      // Should have vague verb but low overall score due to specificity
      expect(analysis.hasVagueVerb).toBe(true);
      expect(analysis.specificityScore).toBeGreaterThan(20); // Has technical terms
      expect(analysis.score).toBeLessThan(50); // Specificity offset should reduce score
    });
  });

  describe('Model preference', () => {
    it('should use Groq when specified as preferred model', async () => {
      const rewriter = new PromptRewriter({
        groqApiKey: 'test-key',
        threshold: 30,
        preferredModel: 'groq',
      });

      await rewriter.processPrompt('make something');

      // Groq should be called directly
      expect(mockGroqEnhance).toHaveBeenCalled();
    });

    it('should fail gracefully when Groq is preferred but no API key', async () => {
      const rewriter = new PromptRewriter({
        // No API key
        threshold: 30,
        preferredModel: 'groq',
      });

      const result = await rewriter.processPrompt('make something');

      expect(result.error).toContain('Groq API key not configured');
    });
  });
});
