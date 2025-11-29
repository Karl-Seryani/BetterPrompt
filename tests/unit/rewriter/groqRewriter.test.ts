/**
 * Tests for Groq AI-powered prompt rewriter
 */

import { GroqRewriter, GroqConfig } from '../../../src/rewriter/groqRewriter';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock vscode
jest.mock('vscode', () => ({
  CancellationTokenSource: jest.fn().mockImplementation(() => ({
    token: {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn(() => ({ dispose: jest.fn() })),
    },
    cancel: jest.fn(),
    dispose: jest.fn(),
  })),
}));

// Mock sharedPrompts
jest.mock('../../../src/rewriter/sharedPrompts', () => ({
  buildSystemPrompt: jest.fn(() => 'You are a helpful assistant'),
  buildUserPrompt: jest.fn((prompt: string, context?: string) =>
    context ? `${prompt}\n\nContext: ${context}` : prompt
  ),
}));

// Mock qualityAnalyzer
jest.mock('../../../src/rewriter/qualityAnalyzer', () => ({
  calculateConfidence: jest.fn(() => 0.85),
}));

// Mock errorHandler
jest.mock('../../../src/utils/errorHandler', () => ({
  formatUserError: jest.fn((error: Error) => error.message),
}));

describe('GroqRewriter', () => {
  const validConfig: GroqConfig = {
    apiKey: 'test-api-key-12345',
  };

  const mockValidResponse = {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: 1234567890,
    model: 'llama-3.3-70b-versatile',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'Enhanced prompt: Create a responsive login page with email validation',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 100,
      total_tokens: 150,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create instance with valid API key', () => {
      const rewriter = new GroqRewriter(validConfig);
      expect(rewriter).toBeInstanceOf(GroqRewriter);
    });

    it('should throw error for empty API key', () => {
      expect(() => new GroqRewriter({ apiKey: '' })).toThrow(
        'Groq API key is required. Get a free key at console.groq.com'
      );
    });

    it('should throw error for whitespace-only API key', () => {
      expect(() => new GroqRewriter({ apiKey: '   ' })).toThrow(
        'Groq API key is required. Get a free key at console.groq.com'
      );
    });

    it('should use default model when not specified', () => {
      const rewriter = new GroqRewriter(validConfig);
      // Access private config via any for testing
      expect((rewriter as any).config.model).toBe('llama-3.3-70b-versatile');
    });

    it('should use custom model when specified', () => {
      const rewriter = new GroqRewriter({ ...validConfig, model: 'custom-model' });
      expect((rewriter as any).config.model).toBe('custom-model');
    });

    it('should use default maxTokens when not specified', () => {
      const rewriter = new GroqRewriter(validConfig);
      expect((rewriter as any).config.maxTokens).toBe(1000);
    });

    it('should use custom maxTokens when specified', () => {
      const rewriter = new GroqRewriter({ ...validConfig, maxTokens: 500 });
      expect((rewriter as any).config.maxTokens).toBe(500);
    });

    it('should use default temperature when not specified', () => {
      const rewriter = new GroqRewriter(validConfig);
      expect((rewriter as any).config.temperature).toBe(0.7);
    });

    it('should use custom temperature when specified', () => {
      const rewriter = new GroqRewriter({ ...validConfig, temperature: 0.5 });
      expect((rewriter as any).config.temperature).toBe(0.5);
    });
  });

  describe('enhancePrompt', () => {
    let rewriter: GroqRewriter;

    beforeEach(() => {
      rewriter = new GroqRewriter(validConfig);
    });

    it('should throw error for empty prompt', async () => {
      await expect(rewriter.enhancePrompt('')).rejects.toThrow('Prompt cannot be empty');
    });

    it('should throw error for whitespace-only prompt', async () => {
      await expect(rewriter.enhancePrompt('   ')).rejects.toThrow('Prompt cannot be empty');
    });

    it('should return enhanced prompt on successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidResponse),
      });

      const result = await rewriter.enhancePrompt('make a login page');

      expect(result).toEqual({
        original: 'make a login page',
        enhanced: 'Enhanced prompt: Create a responsive login page with email validation',
        model: 'llama-3.3-70b-versatile',
        tokensUsed: 150,
        confidence: 0.85,
      });
    });

    it('should include context in API request when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidResponse),
      });

      await rewriter.enhancePrompt('make a login', 'React project with TypeScript');

      const { buildUserPrompt } = require('../../../src/rewriter/sharedPrompts');
      expect(buildUserPrompt).toHaveBeenCalledWith('make a login', 'React project with TypeScript');
    });

    it('should pass pre-computed analysis to calculateConfidence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidResponse),
      });

      const mockAnalysis = { score: 75, issues: [], specificityScore: 20 };
      await rewriter.enhancePrompt('make a login', undefined, undefined, mockAnalysis as any);

      const { calculateConfidence } = require('../../../src/rewriter/qualityAnalyzer');
      expect(calculateConfidence).toHaveBeenCalledWith(
        'make a login',
        expect.any(String),
        mockAnalysis
      );
    });

    it('should remove surrounding double quotes from enhanced prompt', async () => {
      const responseWithQuotes = {
        ...mockValidResponse,
        choices: [
          {
            ...mockValidResponse.choices[0],
            message: {
              role: 'assistant',
              content: '"Create a login page with validation"',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithQuotes),
      });

      const result = await rewriter.enhancePrompt('make a login');
      expect(result.enhanced).toBe('Create a login page with validation');
    });

    it('should remove surrounding single quotes from enhanced prompt', async () => {
      const responseWithQuotes = {
        ...mockValidResponse,
        choices: [
          {
            ...mockValidResponse.choices[0],
            message: {
              role: 'assistant',
              content: "'Create a login page with validation'",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithQuotes),
      });

      const result = await rewriter.enhancePrompt('make a login');
      expect(result.enhanced).toBe('Create a login page with validation');
    });

    it('should handle response without usage stats', async () => {
      const responseWithoutUsage = {
        ...mockValidResponse,
        usage: undefined,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithoutUsage),
      });

      const result = await rewriter.enhancePrompt('make a login');
      expect(result.tokensUsed).toBeUndefined();
    });
  });

  describe('API error handling', () => {
    let rewriter: GroqRewriter;

    beforeEach(() => {
      rewriter = new GroqRewriter(validConfig);
    });

    it('should handle HTTP 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow('Groq API error: Invalid API key');
    });

    it('should handle HTTP 429 rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow('Groq API error: Rate limit exceeded');
    });

    it('should handle HTTP 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Internal error' } }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow('Groq API error: Internal error');
    });

    it('should handle error response with malformed JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow('Groq API error: Internal Server Error');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'TypeError';
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow('Network request failed');
    });
  });

  describe('timeout handling', () => {
    let rewriter: GroqRewriter;

    beforeEach(() => {
      rewriter = new GroqRewriter(validConfig);
    });

    it('should handle timeout abort error correctly', async () => {
      // Simulate an AbortError that occurs when timeout fires (but token not cancelled)
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      // Mock token that is NOT cancelled (so it's a timeout, not user cancel)
      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: jest.fn(() => ({ dispose: jest.fn() })),
      };

      mockFetch.mockRejectedValueOnce(abortError);

      await expect(rewriter.enhancePrompt('test', undefined, mockToken as any)).rejects.toThrow(
        'Groq API request timed out after 30 seconds'
      );
    });

    it('should distinguish timeout from user cancellation', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      // When token IS cancelled, should say "cancelled" not "timed out"
      const cancelledToken = {
        isCancellationRequested: true,
        onCancellationRequested: jest.fn(() => ({ dispose: jest.fn() })),
      };

      mockFetch.mockRejectedValueOnce(abortError);

      await expect(rewriter.enhancePrompt('test', undefined, cancelledToken as any)).rejects.toThrow(
        'Request was cancelled'
      );
    });
  });

  describe('cancellation handling', () => {
    let rewriter: GroqRewriter;

    beforeEach(() => {
      rewriter = new GroqRewriter(validConfig);
    });

    it('should handle cancellation via token', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      // Create a mock token that reports as cancelled
      const mockToken = {
        isCancellationRequested: true,
        onCancellationRequested: jest.fn(() => ({ dispose: jest.fn() })),
      };

      mockFetch.mockRejectedValueOnce(abortError);

      await expect(rewriter.enhancePrompt('test', undefined, mockToken as any)).rejects.toThrow(
        'Request was cancelled'
      );
    });

    it('should dispose cancellation listener on success', async () => {
      const mockDispose = jest.fn();
      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: jest.fn(() => ({ dispose: mockDispose })),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidResponse),
      });

      await rewriter.enhancePrompt('test', undefined, mockToken as any);

      expect(mockDispose).toHaveBeenCalled();
    });

    it('should dispose cancellation listener on error', async () => {
      const mockDispose = jest.fn();
      const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: jest.fn(() => ({ dispose: mockDispose })),
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
        json: () => Promise.resolve({ error: { message: 'Server error' } }),
      });

      await expect(rewriter.enhancePrompt('test', undefined, mockToken as any)).rejects.toThrow();
      expect(mockDispose).toHaveBeenCalled();
    });
  });

  describe('response validation', () => {
    let rewriter: GroqRewriter;

    beforeEach(() => {
      rewriter = new GroqRewriter(validConfig);
    });

    it('should reject null response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API returned invalid response: expected object'
      );
    });

    it('should reject non-object response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve('string response'),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API returned invalid response: expected object'
      );
    });

    it('should reject response missing id field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: mockValidResponse.choices,
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response missing or invalid "id" field'
      );
    });

    it('should reject response with non-string id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 12345,
            choices: mockValidResponse.choices,
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response missing or invalid "id" field'
      );
    });

    it('should reject response missing choices array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response missing or invalid "choices" array'
      );
    });

    it('should reject response with non-array choices', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
            choices: 'not an array',
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response missing or invalid "choices" array'
      );
    });

    it('should reject response with empty choices array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
            choices: [],
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response contains empty choices array'
      );
    });

    it('should reject response with invalid choice object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
            choices: [null],
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response has invalid choice object'
      );
    });

    it('should reject response missing message in choice', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
            choices: [{ index: 0 }],
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response missing message in choice'
      );
    });

    it('should reject response with non-object message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
            choices: [{ index: 0, message: 'not an object' }],
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response missing message in choice'
      );
    });

    it('should reject response missing content in message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
            choices: [{ index: 0, message: { role: 'assistant' } }],
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response missing or invalid message content'
      );
    });

    it('should reject response with non-string content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'test-id',
            choices: [{ index: 0, message: { role: 'assistant', content: 12345 } }],
          }),
      });

      await expect(rewriter.enhancePrompt('test')).rejects.toThrow(
        'Groq API response missing or invalid message content'
      );
    });
  });

  describe('API request format', () => {
    let rewriter: GroqRewriter;

    beforeEach(() => {
      rewriter = new GroqRewriter(validConfig);
    });

    it('should send correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidResponse),
      });

      await rewriter.enhancePrompt('test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key-12345',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should send correct body structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidResponse),
      });

      await rewriter.enhancePrompt('test prompt');

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body).toEqual({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'test prompt' },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
    });

    it('should use custom config values in request', async () => {
      const customRewriter = new GroqRewriter({
        apiKey: 'custom-key',
        model: 'custom-model',
        maxTokens: 500,
        temperature: 0.3,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidResponse),
      });

      await customRewriter.enhancePrompt('test');

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.model).toBe('custom-model');
      expect(body.max_tokens).toBe(500);
      expect(body.temperature).toBe(0.3);
      expect(callArgs.headers.Authorization).toBe('Bearer custom-key');
    });
  });
});
