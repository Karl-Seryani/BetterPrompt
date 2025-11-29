/**
 * ML Vagueness Service - Manages ML model lifecycle and provides unified vagueness analysis
 *
 * This service:
 * - Manages ML model training and persistence
 * - Provides unified vagueness analysis (ML + rule-based hybrid)
 * - Integrates with PromptRewriter
 * - Uses singleton pattern for extension-wide model sharing
 */

import { analyzePrompt, AnalysisResult, VaguenessIssue } from '../../core/analyzer';
import { DEFAULT_VAGUENESS_THRESHOLD } from '../../core/constants';
import { MLAnalyzer, MLModelJSON, MLTrainingResult } from './mlAnalyzer';
import { LabeledPrompt } from './trainingDataGenerator';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/** Source of vagueness analysis */
export type VaguenessSource = 'ml' | 'rules' | 'hybrid';

/** Result of vagueness analysis - compatible with existing AnalysisResult */
export interface VaguenessAnalysisResult {
  /** Vagueness score from 0 (very specific) to 100 (very vague) */
  score: number;
  /** Whether the prompt exceeds the vagueness threshold */
  isVague: boolean;
  /** Source of the analysis */
  source: VaguenessSource;
  /** Confidence in the prediction (0-1) */
  confidence: number;
  /** Issues detected (from rule-based analysis) */
  issues: VaguenessIssue[];
  /** Flags from rule-based analysis */
  hasVagueVerb: boolean;
  hasMissingContext: boolean;
  hasUnclearScope: boolean;
  /** Specificity score from rule-based analysis */
  specificityScore: number;
}

/** Result of model training */
export interface TrainingResult {
  success: boolean;
  samplesUsed?: number;
  finalLoss?: number;
  vocabularySize?: number;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default confidence threshold for using ML score */
const ML_CONFIDENCE_THRESHOLD = 0.6;

/** Weight for ML score when combining with rule-based (0-1) */
const ML_SCORE_WEIGHT = 0.7;

/** Weight for rule-based score when combining (0-1) */
const RULES_SCORE_WEIGHT = 0.3;

// ============================================================================
// ML VAGUENESS SERVICE
// ============================================================================

/**
 * ML Vagueness Service
 *
 * Singleton service that manages ML-based vagueness analysis.
 * Uses ML when trained and confident, falls back to rule-based otherwise.
 */
export class MLVaguenessService {
  private static instance: MLVaguenessService | null = null;

  private mlAnalyzer: MLAnalyzer | null = null;
  private threshold: number = DEFAULT_VAGUENESS_THRESHOLD;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MLVaguenessService {
    if (!MLVaguenessService.instance) {
      MLVaguenessService.instance = new MLVaguenessService();
    }
    return MLVaguenessService.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    MLVaguenessService.instance = null;
  }

  /**
   * Check if ML model is trained and ready
   */
  isMLReady(): boolean {
    return this.mlAnalyzer !== null && this.mlAnalyzer.isTrained();
  }

  /**
   * Train the ML model on labeled data
   */
  trainModel(data: LabeledPrompt[]): TrainingResult {
    if (data.length === 0) {
      return {
        success: false,
        error: 'Cannot train on empty dataset',
      };
    }

    try {
      this.mlAnalyzer = new MLAnalyzer();
      const result: MLTrainingResult = this.mlAnalyzer.train(data);

      logger.info('ML model trained successfully', {
        samples: result.samplesUsed,
        vocabulary: result.vocabularySize,
        loss: result.finalLoss,
      });

      return {
        success: true,
        samplesUsed: result.samplesUsed,
        finalLoss: result.finalLoss,
        vocabularySize: result.vocabularySize,
      };
    } catch (error) {
      logger.error('ML model training failed', error);
      this.mlAnalyzer = null;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Export the trained model to JSON
   */
  exportModel(): MLModelJSON | null {
    if (!this.isMLReady()) {
      return null;
    }
    return this.mlAnalyzer!.toJSON();
  }

  /**
   * Import a trained model from JSON
   */
  importModel(json: MLModelJSON): void {
    this.mlAnalyzer = MLAnalyzer.fromJSON(json);
    logger.info('ML model imported', { trainedAt: json.trainedAt });
  }

  /**
   * Get the current vagueness threshold
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Set the vagueness threshold
   */
  setThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 100) {
      throw new Error('Threshold must be between 0 and 100');
    }
    this.threshold = threshold;
  }

  /**
   * Analyze a prompt for vagueness
   *
   * Uses hybrid approach:
   * 1. Always runs rule-based analysis (fast, provides issues)
   * 2. If ML is ready and confident, combines scores
   * 3. Falls back to rule-based if ML not ready or uncertain
   */
  analyzeVagueness(prompt: string): VaguenessAnalysisResult {
    // Always run rule-based analysis first (fast, provides issues)
    const rulesResult: AnalysisResult = analyzePrompt(prompt);

    // Handle empty prompts
    if (!prompt || prompt.trim().length === 0) {
      return {
        score: 100,
        isVague: true,
        source: 'rules',
        confidence: 1.0,
        issues: rulesResult.issues,
        hasVagueVerb: rulesResult.hasVagueVerb,
        hasMissingContext: rulesResult.hasMissingContext,
        hasUnclearScope: rulesResult.hasUnclearScope,
        specificityScore: rulesResult.specificityScore,
      };
    }

    // If ML not ready, use rule-based only
    if (!this.isMLReady()) {
      return {
        score: rulesResult.score,
        isVague: rulesResult.score >= this.threshold,
        source: 'rules',
        confidence: 0.7, // Rule-based has moderate confidence
        issues: rulesResult.issues,
        hasVagueVerb: rulesResult.hasVagueVerb,
        hasMissingContext: rulesResult.hasMissingContext,
        hasUnclearScope: rulesResult.hasUnclearScope,
        specificityScore: rulesResult.specificityScore,
      };
    }

    // Run ML analysis
    const mlResult = this.mlAnalyzer!.analyze(prompt, this.threshold);

    // If ML confidence is low, prefer rule-based
    if (mlResult.confidence < ML_CONFIDENCE_THRESHOLD) {
      logger.debug('ML confidence low, using rule-based', {
        mlConfidence: mlResult.confidence,
        mlScore: mlResult.score,
        rulesScore: rulesResult.score,
      });

      return {
        score: rulesResult.score,
        isVague: rulesResult.score >= this.threshold,
        source: 'rules',
        confidence: 0.7,
        issues: rulesResult.issues,
        hasVagueVerb: rulesResult.hasVagueVerb,
        hasMissingContext: rulesResult.hasMissingContext,
        hasUnclearScope: rulesResult.hasUnclearScope,
        specificityScore: rulesResult.specificityScore,
      };
    }

    // Combine ML and rule-based scores (weighted average)
    const combinedScore = Math.round(mlResult.score * ML_SCORE_WEIGHT + rulesResult.score * RULES_SCORE_WEIGHT);

    logger.debug('Hybrid vagueness analysis', {
      mlScore: mlResult.score,
      rulesScore: rulesResult.score,
      combinedScore,
      mlConfidence: mlResult.confidence,
    });

    return {
      score: combinedScore,
      isVague: combinedScore >= this.threshold,
      source: 'hybrid',
      confidence: mlResult.confidence,
      issues: rulesResult.issues,
      hasVagueVerb: rulesResult.hasVagueVerb,
      hasMissingContext: rulesResult.hasMissingContext,
      hasUnclearScope: rulesResult.hasUnclearScope,
      specificityScore: rulesResult.specificityScore,
    };
  }

  /**
   * Force ML-only analysis (for testing/debugging)
   * Returns null if ML not ready
   */
  analyzeWithMLOnly(prompt: string): { score: number; confidence: number } | null {
    if (!this.isMLReady()) {
      return null;
    }
    const result = this.mlAnalyzer!.analyze(prompt, this.threshold);
    return {
      score: result.score,
      confidence: result.confidence,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get the global ML vagueness service instance
 */
export function getVaguenessService(): MLVaguenessService {
  return MLVaguenessService.getInstance();
}
