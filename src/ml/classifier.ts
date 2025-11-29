/**
 * Logistic Regression Classifier for Vagueness Prediction
 *
 * A lightweight classifier that learns to predict vagueness scores
 * from TF-IDF feature vectors. Uses gradient descent for training.
 */

import { FeatureVector } from './featureExtractor';

// ============================================================================
// TYPES
// ============================================================================

export interface TrainingConfig {
  learningRate: number;
  epochs: number;
  regularization: number; // L2 regularization strength
}

export interface TrainingHistory {
  losses: number[];
  finalLoss: number;
}

export interface ClassifierJSON {
  version: string;
  weights: number[];
  bias: number;
  featureCount: number;
}

// ============================================================================
// MATH UTILITIES
// ============================================================================

/**
 * Sigmoid activation function
 * Maps any real number to (0, 1)
 */
export function sigmoid(x: number): number {
  // Clip to prevent overflow
  const clipped = Math.max(-500, Math.min(500, x));
  return 1 / (1 + Math.exp(-clipped));
}

/**
 * Binary cross-entropy loss
 */
function binaryCrossEntropy(predicted: number, actual: number): number {
  // Clip predictions to prevent log(0)
  const eps = 1e-15;
  const p = Math.max(eps, Math.min(1 - eps, predicted));
  return -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
}

/**
 * Dot product of two vectors
 */
function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

// ============================================================================
// LOGISTIC REGRESSION CLASSIFIER
// ============================================================================

/**
 * Logistic Regression Classifier
 *
 * Binary classifier that learns to predict vagueness (1) vs specific (0).
 * Uses gradient descent with optional L2 regularization.
 */
export class LogisticRegressionClassifier {
  private weights: number[] = [];
  private bias = 0;
  private featureCount = 0;

  /**
   * Train the classifier on labeled feature vectors
   *
   * @param features - Array of feature vectors (from TF-IDF)
   * @param labels - Array of labels (1 = vague, 0 = specific)
   * @param config - Training configuration
   * @returns Training history with loss values
   */
  train(features: FeatureVector[], labels: number[], config: TrainingConfig): TrainingHistory {
    // Validation
    if (features.length === 0) {
      throw new Error('Cannot train on empty dataset');
    }
    if (features.length !== labels.length) {
      throw new Error(`Feature count (${features.length}) must match label count (${labels.length})`);
    }

    this.featureCount = features[0].length;
    const n = features.length;

    // Initialize weights to small random values
    this.weights = Array.from({ length: this.featureCount }, () => (Math.random() - 0.5) * 0.1);
    this.bias = 0;

    const losses: number[] = [];

    // Gradient descent
    for (let epoch = 0; epoch < config.epochs; epoch++) {
      let epochLoss = 0;

      // Compute gradients over all samples
      const weightGradients = Array.from({ length: this.featureCount }, () => 0);
      let biasGradient = 0;

      for (let i = 0; i < n; i++) {
        const x = features[i];
        const y = labels[i];

        // Forward pass
        const z = dotProduct(this.weights, x) + this.bias;
        const predicted = sigmoid(z);

        // Compute loss
        epochLoss += binaryCrossEntropy(predicted, y);

        // Compute gradients (derivative of loss w.r.t. weights and bias)
        const error = predicted - y;

        for (let j = 0; j < this.featureCount; j++) {
          weightGradients[j] += error * x[j];
        }
        biasGradient += error;
      }

      // Average gradients
      for (let j = 0; j < this.featureCount; j++) {
        weightGradients[j] /= n;
        // Add L2 regularization gradient
        weightGradients[j] += config.regularization * this.weights[j];
      }
      biasGradient /= n;

      // Update weights and bias
      for (let j = 0; j < this.featureCount; j++) {
        this.weights[j] -= config.learningRate * weightGradients[j];
      }
      this.bias -= config.learningRate * biasGradient;

      // Record average loss
      epochLoss /= n;
      // Add L2 regularization to loss
      if (config.regularization > 0) {
        const l2Term = (config.regularization / 2) * this.weights.reduce((sum, w) => sum + w * w, 0);
        epochLoss += l2Term;
      }
      losses.push(epochLoss);
    }

    return {
      losses,
      finalLoss: losses[losses.length - 1],
    };
  }

  /**
   * Predict the probability of vagueness (0-1)
   *
   * @param features - Feature vector for a single prompt
   * @returns Probability that the prompt is vague (0 = specific, 1 = vague)
   */
  predict(features: FeatureVector): number {
    if (this.weights.length === 0) {
      return 0.5; // Untrained model returns neutral
    }

    const z = dotProduct(this.weights, features) + this.bias;
    return sigmoid(z);
  }

  /**
   * Predict vagueness score (0-100)
   *
   * @param features - Feature vector for a single prompt
   * @returns Vagueness score (0 = very specific, 100 = very vague)
   */
  predictScore(features: FeatureVector): number {
    const probability = this.predict(features);
    return Math.round(probability * 100);
  }

  /**
   * Get prediction confidence (0-1)
   *
   * Confidence is high when the prediction is far from 0.5
   * (i.e., the model is certain about vague or specific)
   */
  getConfidence(features: FeatureVector): number {
    const probability = this.predict(features);
    // Distance from 0.5, scaled to 0-1
    return Math.abs(probability - 0.5) * 2;
  }

  /**
   * Get the learned weights
   */
  getWeights(): number[] {
    return [...this.weights];
  }

  /**
   * Get the learned bias
   */
  getBias(): number {
    return this.bias;
  }

  /**
   * Serialize classifier to JSON for persistence
   */
  toJSON(): ClassifierJSON {
    return {
      version: '1.0.0',
      weights: [...this.weights],
      bias: this.bias,
      featureCount: this.featureCount,
    };
  }

  /**
   * Restore classifier from JSON
   */
  static fromJSON(json: ClassifierJSON): LogisticRegressionClassifier {
    const classifier = new LogisticRegressionClassifier();
    classifier.weights = [...json.weights];
    classifier.bias = json.bias;
    classifier.featureCount = json.featureCount;
    return classifier;
  }
}
