/**
 * Tests for Hybrid Analyzer - ML + LLM fallback
 */

import {
  HybridAnalyzer,
  HybridAnalyzerConfig,
  DEFAULT_HYBRID_CONFIG,
  AnalysisSource,
} from '../../../src/ml/hybridAnalyzer';
import { MLAnalyzer } from '../../../src/ml/mlAnalyzer';
import { LabeledPrompt } from '../../../src/ml/trainingDataGenerator';

// Mock vscode module for unit tests
jest.mock('vscode', () => ({
  CancellationTokenSource: jest.fn().mockImplementation(() => ({
    token: { isCancellationRequested: false },
    cancel: jest.fn(),
    dispose: jest.fn(),
  })),
}));

describe('HybridAnalyzer', () => {
  // Sample training data
  const sampleTrainingData: LabeledPrompt[] = [
    { prompt: 'fix it', vaguenessScore: 90, intentCategory: 'fix', missingElements: ['what'], reasoning: 'very vague' },
    { prompt: 'make it work', vaguenessScore: 85, intentCategory: 'fix', missingElements: ['what'], reasoning: 'vague' },
    { prompt: 'help me', vaguenessScore: 95, intentCategory: 'unknown', missingElements: ['everything'], reasoning: 'no context' },
    { prompt: 'fix the bug', vaguenessScore: 75, intentCategory: 'fix', missingElements: ['which bug'], reasoning: 'vague' },
    { prompt: 'fix the TypeError in src/auth/login.ts on line 42', vaguenessScore: 15, intentCategory: 'fix', missingElements: [], reasoning: 'specific' },
    { prompt: 'create REST API with JWT authentication', vaguenessScore: 25, intentCategory: 'build', missingElements: [], reasoning: 'detailed' },
    { prompt: 'refactor handleSubmit function to use async await', vaguenessScore: 20, intentCategory: 'improve', missingElements: [], reasoning: 'specific' },
    { prompt: 'add WebSocket connection for real-time notifications', vaguenessScore: 30, intentCategory: 'build', missingElements: [], reasoning: 'specific' },
  ];

  describe('constructor', () => {
    it('should create analyzer with default config', () => {
      const analyzer = new HybridAnalyzer();
      expect(analyzer).toBeDefined();
    });

    it('should create analyzer with custom config', () => {
      const config: HybridAnalyzerConfig = {
        ...DEFAULT_HYBRID_CONFIG,
        confidenceThreshold: 0.8,
      };
      const analyzer = new HybridAnalyzer(config);
      expect(analyzer).toBeDefined();
    });
  });

  describe('setMLModel', () => {
    it('should accept a trained ML model', () => {
      const mlAnalyzer = new MLAnalyzer();
      mlAnalyzer.train(sampleTrainingData);

      const hybridAnalyzer = new HybridAnalyzer();
      hybridAnalyzer.setMLModel(mlAnalyzer);

      expect(hybridAnalyzer.hasMLModel()).toBe(true);
    });

    it('should accept model JSON for lazy loading', () => {
      const mlAnalyzer = new MLAnalyzer();
      mlAnalyzer.train(sampleTrainingData);
      const json = mlAnalyzer.toJSON();

      const hybridAnalyzer = new HybridAnalyzer();
      hybridAnalyzer.setMLModelJSON(json);

      expect(hybridAnalyzer.hasMLModel()).toBe(true);
    });
  });

  describe('analyze (ML-only mode)', () => {
    let hybridAnalyzer: HybridAnalyzer;

    beforeAll(() => {
      const mlAnalyzer = new MLAnalyzer();
      mlAnalyzer.train(sampleTrainingData, {
        learningRate: 0.5,
        epochs: 200,
        regularization: 0.01,
        vaguenessThreshold: 50,
      });

      hybridAnalyzer = new HybridAnalyzer({
        ...DEFAULT_HYBRID_CONFIG,
        confidenceThreshold: 0, // Always use ML (no fallback)
      });
      hybridAnalyzer.setMLModel(mlAnalyzer);
    });

    it('should return HybridAnalysisResult', async () => {
      const result = await hybridAnalyzer.analyze('fix the bug');

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('isVague');
      expect(result).toHaveProperty('source');
    });

    it('should use ML source when confidence is high', async () => {
      const result = await hybridAnalyzer.analyze('fix it');

      expect(result.source).toBe('ml');
    });

    it('should return score between 0 and 100', async () => {
      const result = await hybridAnalyzer.analyze('help me');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should predict high score for vague prompts', async () => {
      const vagueResult = await hybridAnalyzer.analyze('fix it');
      const specificResult = await hybridAnalyzer.analyze('fix the TypeError in src/auth/login.ts on line 42');

      expect(vagueResult.score).toBeGreaterThan(specificResult.score);
    });
  });

  describe('analyze (without ML model)', () => {
    it('should throw when no model and no LLM available', async () => {
      const analyzer = new HybridAnalyzer();

      await expect(analyzer.analyze('test prompt')).rejects.toThrow();
    });
  });

  describe('analyzeWithMLOnly', () => {
    let hybridAnalyzer: HybridAnalyzer;

    beforeAll(() => {
      const mlAnalyzer = new MLAnalyzer();
      mlAnalyzer.train(sampleTrainingData);

      hybridAnalyzer = new HybridAnalyzer();
      hybridAnalyzer.setMLModel(mlAnalyzer);
    });

    it('should always use ML regardless of confidence', async () => {
      const result = await hybridAnalyzer.analyzeWithMLOnly('ambiguous prompt here');

      expect(result.source).toBe('ml');
    });

    it('should throw if no ML model available', () => {
      const analyzer = new HybridAnalyzer();

      expect(() => analyzer.analyzeWithMLOnly('test')).toThrow();
    });
  });

  describe('DEFAULT_HYBRID_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_HYBRID_CONFIG.confidenceThreshold).toBeGreaterThan(0);
      expect(DEFAULT_HYBRID_CONFIG.confidenceThreshold).toBeLessThanOrEqual(1);
      expect(DEFAULT_HYBRID_CONFIG.vaguenessThreshold).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_HYBRID_CONFIG.vaguenessThreshold).toBeLessThanOrEqual(100);
    });
  });

  describe('AnalysisSource type', () => {
    it('should support all source types', () => {
      const sources: AnalysisSource[] = ['ml', 'llm', 'fallback'];
      expect(sources).toHaveLength(3);
    });
  });

  describe('Edge cases', () => {
    let hybridAnalyzer: HybridAnalyzer;

    beforeAll(() => {
      const mlAnalyzer = new MLAnalyzer();
      mlAnalyzer.train(sampleTrainingData);

      hybridAnalyzer = new HybridAnalyzer({
        ...DEFAULT_HYBRID_CONFIG,
        confidenceThreshold: 0,
      });
      hybridAnalyzer.setMLModel(mlAnalyzer);
    });

    it('should handle empty prompt', async () => {
      const result = await hybridAnalyzer.analyze('');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle very long prompt', async () => {
      const longPrompt = 'fix the bug in '.repeat(50) + 'src/auth/login.ts';
      const result = await hybridAnalyzer.analyze(longPrompt);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle special characters', async () => {
      const result = await hybridAnalyzer.analyze('fix the @#$%^& bug!!!');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
