import { PromptRewriter, RewriteOptions } from '../../../src/rewriter/promptRewriter';
import { IssueType } from '../../../core/analyzer';

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
jest.mock('../../../src/context/contextDetector', () => {
  return {
    detectContext: jest.fn().mockReturnValue({
      currentFile: {
        path: '/project/src/App.tsx',
        name: 'App.tsx',
        language: 'typescriptreact',
        relativePath: 'src/App.tsx',
      },
      techStack: {
        languages: ['TypeScript'],
        frameworks: ['React'],
        hasTypeScript: true,
        hasTests: true,
        packageManager: 'npm',
      },
    }),
    formatContextForPrompt: jest.fn().mockReturnValue('Currently editing: src/App.tsx (typescriptreact)\nTech stack: React\nUsing TypeScript'),
  };
});

// Mock VS Code LM - return false so tests use Groq
jest.mock('../../../src/rewriter/vscodeLmRewriter', () => {
  return {
    isVsCodeLmAvailable: jest.fn().mockResolvedValue(false),
    VsCodeLmRewriter: jest.fn().mockImplementation(() => {
      return {
        enhancePrompt: jest.fn().mockResolvedValue({
          original: 'test',
          enhanced: 'test enhanced',
          model: 'copilot/gpt-4',
          confidence: 0.9,
        }),
      };
    }),
  };
});

// Mock the Groq API calls
jest.mock('../../../src/rewriter/groqRewriter', () => {
  return {
    GroqRewriter: jest.fn().mockImplementation(() => {
      return {
        enhancePrompt: jest.fn().mockResolvedValue({
          original: 'make a website',
          enhanced:
            'Create a responsive website using React and TypeScript with the following pages: home, about, and contact. Include a navigation bar and footer.',
          model: 'mixtral-8x7b-32768',
          tokensUsed: 150,
          confidence: 0.85,
        }),
      };
    }),
  };
});

describe('PromptRewriter', () => {
  const mockOptions: RewriteOptions = {
    groqApiKey: 'test-api-key',
    threshold: 30,
  };

  describe('processPrompt', () => {
    it('should skip rewriting for clear prompts (score < threshold)', async () => {
      const rewriter = new PromptRewriter(mockOptions);
      const result = await rewriter.processPrompt(
        'In src/components/LoginForm.tsx, refactor the handleSubmit function to use async/await'
      );

      expect(result.shouldRewrite).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.rewrite).toBeUndefined();
      expect(result.analysis.score).toBeLessThan(30);
    });

    it('should trigger rewriting for vague prompts (score >= threshold)', async () => {
      const rewriter = new PromptRewriter(mockOptions);
      const result = await rewriter.processPrompt('make a website');

      expect(result.shouldRewrite).toBe(true);
      expect(result.skipped).toBeUndefined();
      expect(result.rewrite).toBeDefined();
      expect(result.rewrite?.enhanced).toContain('React');
      expect(result.analysis.score).toBeGreaterThanOrEqual(30);
    });

    it('should return analysis even when rewriting fails', async () => {
      // Override mock to throw error
      const GroqRewriter = require('../../../src/rewriter/groqRewriter').GroqRewriter;
      GroqRewriter.mockImplementationOnce(() => {
        return {
          enhancePrompt: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
        };
      });

      const rewriter = new PromptRewriter(mockOptions);
      const result = await rewriter.processPrompt('fix the bug');

      expect(result.shouldRewrite).toBe(false);
      expect(result.analysis).toBeDefined();
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('should detect vague verbs in analysis', async () => {
      const rewriter = new PromptRewriter(mockOptions);
      const result = await rewriter.processPrompt('create an app');

      expect(result.analysis.hasVagueVerb).toBe(true);
      expect(result.analysis.issues.some((i) => i.type === IssueType.VAGUE_VERB)).toBe(true);
    });

    it('should detect missing context in analysis', async () => {
      const rewriter = new PromptRewriter(mockOptions);
      const result = await rewriter.processPrompt('update it');

      expect(result.analysis.hasMissingContext).toBe(true);
      expect(result.analysis.issues.some((i) => i.type === IssueType.MISSING_CONTEXT)).toBe(true);
    });
  });

  describe('threshold management', () => {
    it('should allow setting custom threshold', () => {
      const rewriter = new PromptRewriter({ ...mockOptions, threshold: 50 });
      expect(rewriter.getThreshold()).toBe(50);
    });

    it('should allow updating threshold after construction', () => {
      const rewriter = new PromptRewriter(mockOptions);
      rewriter.setThreshold(60);
      expect(rewriter.getThreshold()).toBe(60);
    });

    it('should reject invalid thresholds', () => {
      const rewriter = new PromptRewriter(mockOptions);
      expect(() => rewriter.setThreshold(-10)).toThrow('Threshold must be between 0 and 100');
      expect(() => rewriter.setThreshold(150)).toThrow('Threshold must be between 0 and 100');
    });

    it('should use default threshold when not specified', () => {
      const rewriter = new PromptRewriter({ groqApiKey: 'test-key' });
      expect(rewriter.getThreshold()).toBe(30);
    });
  });

  describe('edge cases', () => {
    it('should handle empty prompts gracefully', async () => {
      const rewriter = new PromptRewriter(mockOptions);
      const result = await rewriter.processPrompt('');

      expect(result.analysis.score).toBe(100);
      expect(result.shouldRewrite).toBe(true);
    });

    it('should handle very long prompts', async () => {
      const rewriter = new PromptRewriter(mockOptions);
      const longPrompt = 'make a website '.repeat(100);
      const result = await rewriter.processPrompt(longPrompt);

      expect(result.analysis).toBeDefined();
    });
  });

  describe('context awareness', () => {
    it('should include context in result when enabled', async () => {
      const rewriter = new PromptRewriter({ ...mockOptions, includeContext: true });
      const result = await rewriter.processPrompt('make a website');

      // Context should be included in result
      expect(result.context).toBeDefined();
      expect(result.context?.techStack).toBeDefined();
    });

    it('should not include context when disabled', async () => {
      const rewriter = new PromptRewriter({ ...mockOptions, includeContext: false });
      const result = await rewriter.processPrompt('make a website');

      // Context should be undefined when disabled
      expect(result.context).toBeUndefined();
    });

    it('should include context by default', async () => {
      const rewriter = new PromptRewriter(mockOptions);
      const result = await rewriter.processPrompt('make a website');

      // Context should be included by default
      expect(result.context).toBeDefined();
    });
  });
});
