/**
 * Tests for ML Analyzer - the unified interface for ML-based vagueness analysis
 */

import { MLAnalyzer, DEFAULT_TRAINING_CONFIG } from '../../../src/ml/mlAnalyzer';
import { LabeledPrompt } from '../../../src/ml/trainingDataGenerator';

describe('MLAnalyzer', () => {
  // Sample training data for tests
  const sampleTrainingData: LabeledPrompt[] = [
    // Vague prompts (score 60-100)
    { prompt: 'fix it', vaguenessScore: 90, intentCategory: 'fix', missingElements: ['what'], reasoning: 'very vague' },
    { prompt: 'make it work', vaguenessScore: 85, intentCategory: 'fix', missingElements: ['what'], reasoning: 'vague' },
    { prompt: 'help me', vaguenessScore: 95, intentCategory: 'unknown', missingElements: ['everything'], reasoning: 'no context' },
    { prompt: 'fix the bug', vaguenessScore: 75, intentCategory: 'fix', missingElements: ['which bug'], reasoning: 'vague' },
    { prompt: 'create a website', vaguenessScore: 70, intentCategory: 'build', missingElements: ['details'], reasoning: 'vague' },
    { prompt: 'build an app', vaguenessScore: 72, intentCategory: 'build', missingElements: ['type'], reasoning: 'vague' },
    { prompt: 'improve the code', vaguenessScore: 78, intentCategory: 'improve', missingElements: ['which code'], reasoning: 'vague' },
    { prompt: 'do something', vaguenessScore: 98, intentCategory: 'unknown', missingElements: ['what'], reasoning: 'extremely vague' },

    // Specific prompts (score 0-40)
    { prompt: 'fix the TypeError in src/auth/login.ts on line 42', vaguenessScore: 15, intentCategory: 'fix', missingElements: [], reasoning: 'specific' },
    { prompt: 'create REST API with JWT authentication and rate limiting', vaguenessScore: 25, intentCategory: 'build', missingElements: [], reasoning: 'detailed' },
    { prompt: 'refactor handleSubmit function to use async await', vaguenessScore: 20, intentCategory: 'improve', missingElements: [], reasoning: 'specific' },
    { prompt: 'add input validation to email field using zod schema', vaguenessScore: 22, intentCategory: 'build', missingElements: [], reasoning: 'specific' },
    { prompt: 'fix race condition in UserContext where API calls overwrite state', vaguenessScore: 18, intentCategory: 'fix', missingElements: [], reasoning: 'specific' },
    { prompt: 'implement infinite scroll with 20 items per page', vaguenessScore: 28, intentCategory: 'build', missingElements: [], reasoning: 'specific' },
    { prompt: 'add WebSocket connection for real-time notifications', vaguenessScore: 30, intentCategory: 'build', missingElements: [], reasoning: 'specific' },
    { prompt: 'create GitHub Actions pipeline with test lint build deploy', vaguenessScore: 25, intentCategory: 'configure', missingElements: [], reasoning: 'specific' },
  ];

  describe('constructor', () => {
    it('should create an untrained analyzer', () => {
      const analyzer = new MLAnalyzer();
      expect(analyzer.isTrained()).toBe(false);
    });
  });

  describe('train', () => {
    it('should train on labeled prompts', () => {
      const analyzer = new MLAnalyzer();
      const result = analyzer.train(sampleTrainingData);

      expect(analyzer.isTrained()).toBe(true);
      expect(result.samplesUsed).toBe(sampleTrainingData.length);
      expect(result.finalLoss).toBeDefined();
      expect(result.finalLoss).toBeLessThan(1); // Loss should be reasonable
    });

    it('should use custom training config', () => {
      const analyzer = new MLAnalyzer();
      const result = analyzer.train(sampleTrainingData, {
        ...DEFAULT_TRAINING_CONFIG,
        epochs: 50,
      });

      expect(result.samplesUsed).toBe(sampleTrainingData.length);
    });

    it('should throw on empty training data', () => {
      const analyzer = new MLAnalyzer();
      expect(() => analyzer.train([])).toThrow();
    });

    it('should handle minimum training data', () => {
      const analyzer = new MLAnalyzer();
      const minData: LabeledPrompt[] = [
        { prompt: 'fix it', vaguenessScore: 90, intentCategory: 'fix', missingElements: [], reasoning: 'vague' },
        { prompt: 'fix TypeError in login.ts line 42', vaguenessScore: 15, intentCategory: 'fix', missingElements: [], reasoning: 'specific' },
      ];

      const result = analyzer.train(minData);
      expect(analyzer.isTrained()).toBe(true);
      expect(result.samplesUsed).toBe(2);
    });
  });

  describe('analyze', () => {
    let trainedAnalyzer: MLAnalyzer;

    beforeAll(() => {
      trainedAnalyzer = new MLAnalyzer();
      trainedAnalyzer.train(sampleTrainingData, {
        ...DEFAULT_TRAINING_CONFIG,
        epochs: 200, // More epochs for better training
      });
    });

    it('should return MLAnalysisResult', () => {
      const result = trainedAnalyzer.analyze('fix the bug');

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('isVague');
    });

    it('should return score between 0 and 100', () => {
      const result = trainedAnalyzer.analyze('fix something');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return confidence between 0 and 1', () => {
      const result = trainedAnalyzer.analyze('help me');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should predict high score for vague prompts', () => {
      const vagueResult = trainedAnalyzer.analyze('fix it');
      const specificResult = trainedAnalyzer.analyze('fix the TypeError in src/auth/login.ts on line 42');

      expect(vagueResult.score).toBeGreaterThan(specificResult.score);
    });

    it('should set isVague based on threshold', () => {
      const vagueResult = trainedAnalyzer.analyze('help me', 30);
      const specificResult = trainedAnalyzer.analyze('fix TypeError in login.ts line 42', 30);

      expect(vagueResult.isVague).toBe(true);
      expect(specificResult.isVague).toBe(false);
    });

    it('should throw if analyzer is not trained', () => {
      const untrained = new MLAnalyzer();
      expect(() => untrained.analyze('test')).toThrow();
    });
  });

  describe('serialization', () => {
    let trainedAnalyzer: MLAnalyzer;

    beforeAll(() => {
      trainedAnalyzer = new MLAnalyzer();
      trainedAnalyzer.train(sampleTrainingData);
    });

    it('should serialize to JSON', () => {
      const json = trainedAnalyzer.toJSON();

      expect(json).toHaveProperty('version');
      expect(json).toHaveProperty('vectorizer');
      expect(json).toHaveProperty('classifier');
      expect(json).toHaveProperty('trainedAt');
    });

    it('should deserialize from JSON', () => {
      const json = trainedAnalyzer.toJSON();
      const restored = MLAnalyzer.fromJSON(json);

      expect(restored.isTrained()).toBe(true);
    });

    it('should produce identical predictions after round-trip', () => {
      const json = trainedAnalyzer.toJSON();
      const restored = MLAnalyzer.fromJSON(json);

      const testPrompts = [
        'fix it',
        'fix the TypeError in login.ts',
        'help me with the code',
        'create REST API with auth',
      ];

      for (const prompt of testPrompts) {
        const original = trainedAnalyzer.analyze(prompt);
        const restoredResult = restored.analyze(prompt);

        expect(restoredResult.score).toBe(original.score);
        expect(restoredResult.confidence).toBeCloseTo(original.confidence, 5);
      }
    });

    it('should throw when serializing untrained model', () => {
      const untrained = new MLAnalyzer();
      expect(() => untrained.toJSON()).toThrow();
    });
  });

  describe('DEFAULT_TRAINING_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_TRAINING_CONFIG.learningRate).toBeGreaterThan(0);
      expect(DEFAULT_TRAINING_CONFIG.learningRate).toBeLessThan(10);
      expect(DEFAULT_TRAINING_CONFIG.epochs).toBeGreaterThan(0);
      expect(DEFAULT_TRAINING_CONFIG.regularization).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_TRAINING_CONFIG.vaguenessThreshold).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_TRAINING_CONFIG.vaguenessThreshold).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge cases', () => {
    let trainedAnalyzer: MLAnalyzer;

    beforeAll(() => {
      trainedAnalyzer = new MLAnalyzer();
      trainedAnalyzer.train(sampleTrainingData);
    });

    it('should handle empty prompt', () => {
      const result = trainedAnalyzer.analyze('');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle very long prompt', () => {
      const longPrompt = 'fix the bug in '.repeat(100) + 'src/auth/login.ts';
      const result = trainedAnalyzer.analyze(longPrompt);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle prompt with only unknown words', () => {
      const result = trainedAnalyzer.analyze('xyzzy plugh qwerty');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle prompt with special characters', () => {
      const result = trainedAnalyzer.analyze('fix the @#$%^& in file!!!');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
