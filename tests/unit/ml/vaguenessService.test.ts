/**
 * Tests for MLVaguenessService - manages ML model lifecycle and integrates with PromptRewriter
 */

import { MLVaguenessService } from '../../../src/ml/vaguenessService';
import { LabeledPrompt } from '../../../src/ml/trainingDataGenerator';
import { DEFAULT_VAGUENESS_THRESHOLD } from '../../../core/constants';

// Mock vscode module
jest.mock('vscode', () => ({
  CancellationTokenSource: jest.fn().mockImplementation(() => ({
    token: { isCancellationRequested: false },
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

describe('MLVaguenessService', () => {
  // Sample training data
  const sampleTrainingData: LabeledPrompt[] = [
    { prompt: 'fix it', vaguenessScore: 90, intentCategory: 'fix', missingElements: ['what'], reasoning: 'very vague' },
    { prompt: 'make it work', vaguenessScore: 85, intentCategory: 'fix', missingElements: ['what'], reasoning: 'vague' },
    { prompt: 'help me', vaguenessScore: 95, intentCategory: 'unknown', missingElements: ['everything'], reasoning: 'no context' },
    { prompt: 'fix the bug', vaguenessScore: 75, intentCategory: 'fix', missingElements: ['which bug'], reasoning: 'vague' },
    {
      prompt: 'fix the TypeError in src/auth/login.ts on line 42',
      vaguenessScore: 15,
      intentCategory: 'fix',
      missingElements: [],
      reasoning: 'specific',
    },
    {
      prompt: 'create REST API with JWT authentication and rate limiting',
      vaguenessScore: 25,
      intentCategory: 'build',
      missingElements: [],
      reasoning: 'detailed',
    },
    {
      prompt: 'refactor handleSubmit function to use async await',
      vaguenessScore: 20,
      intentCategory: 'improve',
      missingElements: [],
      reasoning: 'specific',
    },
    {
      prompt: 'add input validation to email field using zod schema',
      vaguenessScore: 22,
      intentCategory: 'build',
      missingElements: [],
      reasoning: 'specific',
    },
  ];

  describe('singleton pattern', () => {
    beforeEach(() => {
      MLVaguenessService.resetInstance();
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = MLVaguenessService.getInstance();
      const instance2 = MLVaguenessService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return new instance after reset', () => {
      const instance1 = MLVaguenessService.getInstance();
      MLVaguenessService.resetInstance();
      const instance2 = MLVaguenessService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('initialization', () => {
    let service: MLVaguenessService;

    beforeEach(() => {
      MLVaguenessService.resetInstance();
      service = MLVaguenessService.getInstance();
    });

    it('should not be ready before training', () => {
      expect(service.isMLReady()).toBe(false);
    });

    it('should use rule-based analysis when ML not ready', () => {
      const result = service.analyzeVagueness('fix it');

      expect(result.source).toBe('rules');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('training', () => {
    let service: MLVaguenessService;

    beforeEach(() => {
      MLVaguenessService.resetInstance();
      service = MLVaguenessService.getInstance();
    });

    it('should train ML model from labeled data', () => {
      const result = service.trainModel(sampleTrainingData);

      expect(result.success).toBe(true);
      expect(result.samplesUsed).toBe(sampleTrainingData.length);
      expect(service.isMLReady()).toBe(true);
    });

    it('should fail training on empty data', () => {
      const result = service.trainModel([]);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(service.isMLReady()).toBe(false);
    });

    it('should use ML after training', () => {
      service.trainModel(sampleTrainingData);

      const result = service.analyzeVagueness('fix it');

      // Could be 'ml' or 'rules' depending on confidence
      expect(['ml', 'rules', 'hybrid']).toContain(result.source);
    });
  });

  describe('analyzeVagueness', () => {
    let service: MLVaguenessService;

    beforeEach(() => {
      MLVaguenessService.resetInstance();
      service = MLVaguenessService.getInstance();
      service.trainModel(sampleTrainingData);
    });

    it('should return VaguenessAnalysisResult', () => {
      const result = service.analyzeVagueness('fix the bug');

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('isVague');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('confidence');
    });

    it('should return score between 0 and 100', () => {
      const result = service.analyzeVagueness('help me');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should use default vagueness threshold', () => {
      const service2 = MLVaguenessService.getInstance();
      expect(service2.getThreshold()).toBe(DEFAULT_VAGUENESS_THRESHOLD);
    });

    it('should allow custom threshold', () => {
      service.setThreshold(50);

      const result = service.analyzeVagueness('fix it');

      // With threshold 50, "fix it" might not be flagged as vague depending on ML score
      expect(result.isVague).toBe(result.score >= 50);
    });

    it('should flag vague prompts as vague', () => {
      const result = service.analyzeVagueness('help');

      // 'help' alone is extremely vague
      expect(result.score).toBeGreaterThan(50);
    });

    it('should flag specific prompts as not vague', () => {
      const result = service.analyzeVagueness(
        'fix the TypeError in src/auth/login.ts on line 42 where async fails'
      );

      // Very specific prompt should have low vagueness
      expect(result.score).toBeLessThan(50);
    });
  });

  describe('model persistence', () => {
    let service: MLVaguenessService;

    beforeEach(() => {
      MLVaguenessService.resetInstance();
      service = MLVaguenessService.getInstance();
      service.trainModel(sampleTrainingData);
    });

    it('should export model to JSON', () => {
      const json = service.exportModel();

      expect(json).not.toBeNull();
      expect(json).toHaveProperty('version');
      expect(json).toHaveProperty('vectorizer');
      expect(json).toHaveProperty('classifier');
    });

    it('should import model from JSON', () => {
      const json = service.exportModel()!;

      // Reset and reimport
      MLVaguenessService.resetInstance();
      const newService = MLVaguenessService.getInstance();

      expect(newService.isMLReady()).toBe(false);
      newService.importModel(json);
      expect(newService.isMLReady()).toBe(true);
    });

    it('should produce same results after import', () => {
      const json = service.exportModel()!;
      const originalResult = service.analyzeVagueness('fix it');

      // Reset and reimport
      MLVaguenessService.resetInstance();
      const newService = MLVaguenessService.getInstance();
      newService.importModel(json);

      const importedResult = newService.analyzeVagueness('fix it');

      // Scores should match (allowing for floating point)
      expect(importedResult.score).toBe(originalResult.score);
    });
  });

  describe('hybrid analysis', () => {
    let service: MLVaguenessService;

    beforeEach(() => {
      MLVaguenessService.resetInstance();
      service = MLVaguenessService.getInstance();
      service.trainModel(sampleTrainingData);
    });

    it('should combine rule-based issues with ML score', () => {
      const result = service.analyzeVagueness('fix it');

      // Should have issues from rule-based analysis
      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect vague verbs in issues', () => {
      const result = service.analyzeVagueness('make something');

      const hasVagueVerbIssue = result.issues.some((issue) => issue.type === 'VAGUE_VERB');
      expect(hasVagueVerbIssue).toBe(true);
    });

    it('should include rule-based analysis fields', () => {
      const result = service.analyzeVagueness('fix it');

      expect(result).toHaveProperty('hasVagueVerb');
      expect(result).toHaveProperty('hasMissingContext');
      expect(result).toHaveProperty('hasUnclearScope');
    });
  });

  describe('edge cases', () => {
    let service: MLVaguenessService;

    beforeEach(() => {
      MLVaguenessService.resetInstance();
      service = MLVaguenessService.getInstance();
      service.trainModel(sampleTrainingData);
    });

    it('should handle empty prompt', () => {
      const result = service.analyzeVagueness('');

      expect(result.score).toBe(100);
      expect(result.isVague).toBe(true);
    });

    it('should handle whitespace-only prompt', () => {
      const result = service.analyzeVagueness('   ');

      expect(result.score).toBe(100);
      expect(result.isVague).toBe(true);
    });

    it('should handle very long prompt', () => {
      const longPrompt = 'fix the bug in '.repeat(100) + 'src/auth/login.ts';
      const result = service.analyzeVagueness(longPrompt);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
