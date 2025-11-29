/**
 * ML Analyzer - Unified interface for ML-based vagueness analysis
 *
 * Combines TF-IDF feature extraction and logistic regression classification
 * into a single, easy-to-use interface.
 */

import { TfIdfVectorizer, VectorizerJSON } from './featureExtractor';
import { LogisticRegressionClassifier, ClassifierJSON, TrainingConfig } from './classifier';
import { LabeledPrompt } from './trainingDataGenerator';
import { DEFAULT_VAGUENESS_THRESHOLD } from '../../core/constants';

// ============================================================================
// TYPES
// ============================================================================

export interface MLAnalysisResult {
  /** Vagueness score from 0 (very specific) to 100 (very vague) */
  score: number;
  /** Model's confidence in the prediction (0-1) */
  confidence: number;
  /** Whether the prompt exceeds the vagueness threshold */
  isVague: boolean;
}

export interface MLTrainingResult {
  /** Number of samples used for training */
  samplesUsed: number;
  /** Final loss value after training */
  finalLoss: number;
  /** Vocabulary size (number of unique terms) */
  vocabularySize: number;
}

export interface MLModelJSON {
  version: string;
  vectorizer: VectorizerJSON;
  classifier: ClassifierJSON;
  trainedAt: string;
}

export interface MLTrainingConfig extends TrainingConfig {
  /** Threshold for considering a prompt "vague" (0-100) */
  vaguenessThreshold: number;
}

/** Default training configuration */
export const DEFAULT_TRAINING_CONFIG: MLTrainingConfig = {
  learningRate: 0.5,
  epochs: 100,
  regularization: 0.01,
  vaguenessThreshold: 50, // Score >= 50 is considered vague for binary classification
};

// ============================================================================
// ML ANALYZER
// ============================================================================

/**
 * ML Analyzer
 *
 * Provides ML-based vagueness analysis for prompts.
 * Must be trained on labeled data before use.
 */
export class MLAnalyzer {
  private vectorizer: TfIdfVectorizer | null = null;
  private classifier: LogisticRegressionClassifier | null = null;
  private trainedAt: Date | null = null;

  /**
   * Check if the analyzer has been trained
   */
  isTrained(): boolean {
    return this.vectorizer !== null && this.classifier !== null;
  }

  /**
   * Train the analyzer on labeled prompt data
   *
   * @param data - Array of labeled prompts from training data generator
   * @param config - Training configuration (optional)
   * @returns Training result with statistics
   */
  train(data: LabeledPrompt[], config: MLTrainingConfig = DEFAULT_TRAINING_CONFIG): MLTrainingResult {
    if (data.length === 0) {
      throw new Error('Cannot train on empty dataset');
    }

    // Extract prompts and convert scores to binary labels
    const prompts = data.map((d) => d.prompt);
    const labels = data.map((d) => (d.vaguenessScore >= config.vaguenessThreshold ? 1 : 0));

    // Train TF-IDF vectorizer
    this.vectorizer = new TfIdfVectorizer();
    const features = this.vectorizer.fitTransform(prompts);

    // Train classifier
    this.classifier = new LogisticRegressionClassifier();
    const history = this.classifier.train(features, labels, {
      learningRate: config.learningRate,
      epochs: config.epochs,
      regularization: config.regularization,
    });

    this.trainedAt = new Date();

    return {
      samplesUsed: data.length,
      finalLoss: history.finalLoss,
      vocabularySize: this.vectorizer.getVocabulary().length,
    };
  }

  /**
   * Analyze a prompt for vagueness
   *
   * @param prompt - The prompt to analyze
   * @param threshold - Vagueness threshold (0-100), defaults to DEFAULT_VAGUENESS_THRESHOLD
   * @returns Analysis result with score, confidence, and isVague flag
   */
  analyze(prompt: string, threshold = DEFAULT_VAGUENESS_THRESHOLD): MLAnalysisResult {
    if (!this.isTrained()) {
      throw new Error('Analyzer must be trained before use. Call train() first.');
    }

    // Transform prompt to feature vector
    const features = this.vectorizer!.transform(prompt);

    // Get prediction
    const score = this.classifier!.predictScore(features);
    const confidence = this.classifier!.getConfidence(features);

    return {
      score,
      confidence,
      isVague: score >= threshold,
    };
  }

  /**
   * Serialize the trained model to JSON
   */
  toJSON(): MLModelJSON {
    if (!this.isTrained()) {
      throw new Error('Cannot serialize untrained model');
    }

    return {
      version: '1.0.0',
      vectorizer: this.vectorizer!.toJSON(),
      classifier: this.classifier!.toJSON(),
      trainedAt: this.trainedAt!.toISOString(),
    };
  }

  /**
   * Restore a trained model from JSON
   */
  static fromJSON(json: MLModelJSON): MLAnalyzer {
    const analyzer = new MLAnalyzer();
    analyzer.vectorizer = TfIdfVectorizer.fromJSON(json.vectorizer);
    analyzer.classifier = LogisticRegressionClassifier.fromJSON(json.classifier);
    analyzer.trainedAt = new Date(json.trainedAt);
    return analyzer;
  }
}
