/**
 * Tests for Logistic Regression Classifier
 * RED phase: These tests define the expected behavior
 */

import { LogisticRegressionClassifier, sigmoid, TrainingConfig } from '../../../src/ml/classifier';
import { FeatureVector } from '../../../src/ml/featureExtractor';

describe('Classifier', () => {
  describe('sigmoid', () => {
    it('should return 0.5 for input 0', () => {
      expect(sigmoid(0)).toBeCloseTo(0.5, 5);
    });

    it('should return close to 1 for large positive input', () => {
      expect(sigmoid(10)).toBeCloseTo(1, 2);
    });

    it('should return close to 0 for large negative input', () => {
      expect(sigmoid(-10)).toBeCloseTo(0, 2);
    });

    it('should be symmetric around 0.5', () => {
      expect(sigmoid(2) + sigmoid(-2)).toBeCloseTo(1, 5);
    });
  });

  describe('LogisticRegressionClassifier', () => {
    let classifier: LogisticRegressionClassifier;

    beforeEach(() => {
      classifier = new LogisticRegressionClassifier();
    });

    describe('train', () => {
      it('should train on labeled data', () => {
        // Simple XOR-like problem
        const features: FeatureVector[] = [
          [1, 0], // vague
          [0, 1], // specific
          [1, 1], // vague (mixed)
          [0, 0], // specific (empty)
        ];
        const labels = [1, 0, 1, 0]; // 1 = vague, 0 = specific

        const config: TrainingConfig = {
          learningRate: 0.1,
          epochs: 100,
          regularization: 0.01,
        };

        classifier.train(features, labels, config);

        // Should have learned weights
        expect(classifier.getWeights().length).toBe(2);
        expect(classifier.getBias()).toBeDefined();
      });

      it('should improve loss over training', () => {
        const features: FeatureVector[] = [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
          [1, 1, 0],
        ];
        const labels = [1, 0, 0, 1];

        const config: TrainingConfig = {
          learningRate: 0.5,
          epochs: 50,
          regularization: 0,
        };

        const history = classifier.train(features, labels, config);

        // Loss should decrease
        expect(history.losses.length).toBe(50);
        expect(history.losses[history.losses.length - 1]).toBeLessThan(history.losses[0]);
      });

      it('should handle empty training data', () => {
        expect(() => classifier.train([], [], { learningRate: 0.1, epochs: 10, regularization: 0 })).toThrow();
      });

      it('should handle mismatched features and labels', () => {
        const features: FeatureVector[] = [[1, 0], [0, 1]];
        const labels = [1]; // Missing one label

        expect(() =>
          classifier.train(features, labels, { learningRate: 0.1, epochs: 10, regularization: 0 })
        ).toThrow();
      });
    });

    describe('predict', () => {
      beforeEach(() => {
        // Train a simple classifier
        const features: FeatureVector[] = [
          [1, 0, 0], // vague pattern
          [0, 1, 0], // specific pattern
          [0, 0, 1], // specific pattern
          [1, 1, 0], // mixed -> vague
          [0, 1, 1], // specific pattern
        ];
        const labels = [1, 0, 0, 1, 0];

        classifier.train(features, labels, {
          learningRate: 1.0,
          epochs: 200,
          regularization: 0.01,
        });
      });

      it('should return probability between 0 and 1', () => {
        const prob = classifier.predict([1, 0, 0]);
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(1);
      });

      it('should predict higher probability for vague patterns', () => {
        const vagueProb = classifier.predict([1, 0, 0]);
        const specificProb = classifier.predict([0, 1, 1]);

        expect(vagueProb).toBeGreaterThan(specificProb);
      });

      it('should handle zero vector', () => {
        const prob = classifier.predict([0, 0, 0]);
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(1);
      });
    });

    describe('predictScore', () => {
      beforeEach(() => {
        const features: FeatureVector[] = [
          [1, 0],
          [0, 1],
        ];
        const labels = [1, 0];

        classifier.train(features, labels, {
          learningRate: 1.0,
          epochs: 100,
          regularization: 0,
        });
      });

      it('should return score between 0 and 100', () => {
        const score = classifier.predictScore([1, 0]);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should return integer score', () => {
        const score = classifier.predictScore([0.5, 0.5]);
        expect(Number.isInteger(score)).toBe(true);
      });
    });

    describe('serialization', () => {
      beforeEach(() => {
        const features: FeatureVector[] = [
          [1, 0],
          [0, 1],
        ];
        const labels = [1, 0];

        classifier.train(features, labels, {
          learningRate: 0.5,
          epochs: 50,
          regularization: 0,
        });
      });

      it('should serialize to JSON', () => {
        const json = classifier.toJSON();

        expect(json).toHaveProperty('version');
        expect(json).toHaveProperty('weights');
        expect(json).toHaveProperty('bias');
        expect(json).toHaveProperty('featureCount');
      });

      it('should deserialize from JSON', () => {
        const json = classifier.toJSON();
        const restored = LogisticRegressionClassifier.fromJSON(json);

        const testVector: FeatureVector = [0.5, 0.5];
        expect(restored.predict(testVector)).toBeCloseTo(classifier.predict(testVector), 5);
      });

      it('should produce identical predictions after round-trip', () => {
        const json = classifier.toJSON();
        const restored = LogisticRegressionClassifier.fromJSON(json);

        const testVectors: FeatureVector[] = [
          [1, 0],
          [0, 1],
          [0.5, 0.5],
          [0, 0],
        ];

        for (const vec of testVectors) {
          expect(restored.predict(vec)).toBeCloseTo(classifier.predict(vec), 10);
        }
      });
    });

    describe('getConfidence', () => {
      beforeEach(() => {
        const features: FeatureVector[] = [
          [1, 0],
          [0, 1],
        ];
        const labels = [1, 0];

        classifier.train(features, labels, {
          learningRate: 1.0,
          epochs: 100,
          regularization: 0,
        });
      });

      it('should return confidence between 0 and 1', () => {
        const conf = classifier.getConfidence([1, 0]);
        expect(conf).toBeGreaterThanOrEqual(0);
        expect(conf).toBeLessThanOrEqual(1);
      });

      it('should have high confidence for clear predictions', () => {
        // Strong vague pattern
        const vagueConf = classifier.getConfidence([1, 0]);
        // Strong specific pattern
        const specificConf = classifier.getConfidence([0, 1]);

        // Both should have high confidence (far from 0.5)
        expect(vagueConf).toBeGreaterThan(0.5);
        expect(specificConf).toBeGreaterThan(0.5);
      });

      it('should have lower confidence for uncertain predictions', () => {
        // Mixed/ambiguous pattern
        const ambiguousConf = classifier.getConfidence([0.5, 0.5]);

        // Should have lower confidence (closer to 0.5 probability)
        expect(ambiguousConf).toBeLessThan(1);
      });
    });
  });

  describe('Integration with real-world-like data', () => {
    it('should learn to distinguish vague from specific prompts', () => {
      const classifier = new LogisticRegressionClassifier();

      // Simulated TF-IDF features (simplified)
      // Features: [fix_tfidf, error_tfidf, line_tfidf, file_tfidf, it_tfidf]
      const features: FeatureVector[] = [
        // Vague prompts (high score for generic words, low for specific)
        [0.8, 0, 0, 0, 0.9], // "fix it"
        [0.7, 0, 0, 0, 0.8], // "fix something"
        [0, 0, 0, 0, 1.0], // "make it work"
        [0.5, 0, 0, 0, 0.6], // "help me fix"

        // Specific prompts (high score for specific terms)
        [0.3, 0.9, 0.8, 0.7, 0], // "fix the error on line 42 in file.ts"
        [0.4, 0.8, 0.9, 0.6, 0], // "fix TypeError at line 10"
        [0, 0.7, 0.6, 0.9, 0], // "error in config file"
        [0.2, 0.5, 0.7, 0.8, 0], // "line 5 has issue in main.ts"
      ];

      const labels = [1, 1, 1, 1, 0, 0, 0, 0]; // 1 = vague, 0 = specific

      classifier.train(features, labels, {
        learningRate: 0.5,
        epochs: 200,
        regularization: 0.01,
      });

      // Test predictions
      const vagueScore = classifier.predictScore([0.9, 0, 0, 0, 0.95]); // very vague
      const specificScore = classifier.predictScore([0.1, 0.9, 0.9, 0.8, 0]); // very specific

      expect(vagueScore).toBeGreaterThan(60); // Should predict vague (high score)
      expect(specificScore).toBeLessThan(40); // Should predict specific (low score)
    });
  });
});
