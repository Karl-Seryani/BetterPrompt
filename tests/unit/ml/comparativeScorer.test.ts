/**
 * Tests for AI Comparative Scorer
 *
 * Uses Copilot to compare original vs enhanced prompts for real quality assessment
 */

import type { CancellationToken } from 'vscode';

// Must define mock function before jest.mock
const mockSendRequest = jest.fn();
const mockSelectChatModels = jest.fn();

// Mock vscode module
jest.mock('vscode', () => ({
  lm: {
    selectChatModels: mockSelectChatModels,
  },
  LanguageModelChatMessage: {
    User: jest.fn((content: string) => ({ role: 'user', content })),
  },
  CancellationTokenSource: jest.fn().mockImplementation(() => ({
    token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
    cancel: jest.fn(),
    dispose: jest.fn(),
  })),
  window: {
    createOutputChannel: jest.fn().mockReturnValue({
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    }),
  },
  workspace: {
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue(false),
    }),
  },
}));

import {
  ComparativeScorer,
  parseComparisonResponse,
  buildComparisonPrompt,
} from '../../../src/ml/comparativeScorer';

describe('ComparativeScorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: return a mock model
    mockSelectChatModels.mockResolvedValue([
      {
        vendor: 'copilot',
        family: 'gpt-4',
        sendRequest: mockSendRequest,
      },
    ]);
  });

  describe('buildComparisonPrompt', () => {
    it('should build a comparison prompt with original and enhanced', () => {
      const prompt = buildComparisonPrompt('fix it', 'Fix the TypeError in src/auth/login.ts on line 42');

      expect(prompt).toContain('fix it');
      expect(prompt).toContain('Fix the TypeError');
      expect(prompt).toContain('ORIGINAL');
      expect(prompt).toContain('ENHANCED');
    });

    it('should include scoring criteria', () => {
      const prompt = buildComparisonPrompt('help', 'Help with implementing JWT authentication');

      expect(prompt).toContain('specificity');
      expect(prompt).toContain('actionability');
      expect(prompt).toContain('JSON');
    });
  });

  describe('parseComparisonResponse', () => {
    it('should parse valid JSON response', () => {
      const response = `{"overallScore": 85, "specificityGain": 90, "actionability": 80, "issueCoverage": 85, "relevance": 90, "reasoning": "Good enhancement"}`;

      const result = parseComparisonResponse(response);

      expect(result).not.toBeNull();
      expect(result!.overallScore).toBe(85);
      expect(result!.specificityGain).toBe(90);
      expect(result!.reasoning).toBe('Good enhancement');
    });

    it('should parse JSON from markdown code block', () => {
      const response = `Here's my analysis:
\`\`\`json
{"overallScore": 75, "specificityGain": 80, "actionability": 70, "issueCoverage": 75, "relevance": 80, "reasoning": "Moderate improvement"}
\`\`\``;

      const result = parseComparisonResponse(response);

      expect(result).not.toBeNull();
      expect(result!.overallScore).toBe(75);
    });

    it('should clamp scores to 0-100 range', () => {
      const response = `{"overallScore": 150, "specificityGain": -10, "actionability": 80, "issueCoverage": 85, "relevance": 90, "reasoning": "Test"}`;

      const result = parseComparisonResponse(response);

      expect(result).not.toBeNull();
      expect(result!.overallScore).toBe(100);
      expect(result!.specificityGain).toBe(0);
    });

    it('should return null for invalid JSON', () => {
      const result = parseComparisonResponse('This is not JSON');
      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const response = `{"overallScore": 85}`;
      const result = parseComparisonResponse(response);
      expect(result).toBeNull();
    });
  });

  describe('ComparativeScorer.compare', () => {
    let scorer: ComparativeScorer;

    beforeEach(() => {
      scorer = new ComparativeScorer();
    });

    it('should return comparison result on success', async () => {
      // Mock successful response
      mockSendRequest.mockResolvedValueOnce({
        text: (async function* () {
          yield '{"overallScore": 85, "specificityGain": 90, "actionability": 80, "issueCoverage": 85, "relevance": 90, "reasoning": "Good"}';
        })(),
      });

      const result = await scorer.compare('fix it', 'Fix the TypeError in src/auth/login.ts');

      expect(result).not.toBeNull();
      expect(result!.overallScore).toBe(85);
    });

    it('should return null when Copilot is not available', async () => {
      // Mock no models available
      mockSelectChatModels.mockResolvedValueOnce([]);

      const result = await scorer.compare('fix it', 'Fix the bug');

      expect(result).toBeNull();
    });

    it('should return null on parse error', async () => {
      mockSendRequest.mockResolvedValueOnce({
        text: (async function* () {
          yield 'Invalid response';
        })(),
      });

      const result = await scorer.compare('fix it', 'Fix the bug');

      expect(result).toBeNull();
    });

    it('should handle cancellation', async () => {
      const token = {
        isCancellationRequested: true,
        onCancellationRequested: jest.fn(),
      } as unknown as CancellationToken;

      const result = await scorer.compare('fix it', 'Fix the bug', token);

      expect(result).toBeNull();
    });
  });

  describe('ComparativeScorer.getConfidence', () => {
    let scorer: ComparativeScorer;

    beforeEach(() => {
      scorer = new ComparativeScorer();
    });

    it('should return normalized confidence (0-1)', async () => {
      mockSendRequest.mockResolvedValueOnce({
        text: (async function* () {
          yield '{"overallScore": 80, "specificityGain": 85, "actionability": 75, "issueCoverage": 80, "relevance": 85, "reasoning": "Good"}';
        })(),
      });

      const confidence = await scorer.getConfidence('fix it', 'Fix the TypeError');

      expect(confidence).toBeCloseTo(0.8, 1);
    });

    it('should return 0 on error', async () => {
      mockSendRequest.mockRejectedValueOnce(new Error('API error'));

      const confidence = await scorer.getConfidence('fix it', 'Fix the bug');

      expect(confidence).toBe(0);
    });
  });
});
