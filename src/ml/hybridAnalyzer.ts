/**
 * Hybrid Analyzer - ML + LLM Fallback
 *
 * Combines fast ML-based analysis with LLM fallback for uncertain cases.
 * - Uses ML model for instant predictions when confidence is high
 * - Falls back to Copilot LLM when confidence is low or ML unavailable
 */

import * as vscode from 'vscode';
import { MLAnalyzer, MLModelJSON } from './mlAnalyzer';
import { DEFAULT_VAGUENESS_THRESHOLD } from '../../core/constants';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/** Source of the analysis result */
export type AnalysisSource = 'ml' | 'llm' | 'fallback';

export interface HybridAnalysisResult {
  /** Vagueness score from 0 (very specific) to 100 (very vague) */
  score: number;
  /** Confidence in the prediction (0-1) */
  confidence: number;
  /** Whether the prompt exceeds the vagueness threshold */
  isVague: boolean;
  /** Source of the analysis (ml, llm, or fallback) */
  source: AnalysisSource;
  /** Optional reasoning from LLM */
  reasoning?: string;
}

export interface HybridAnalyzerConfig {
  /** Confidence threshold below which to use LLM fallback (0-1) */
  confidenceThreshold: number;
  /** Vagueness threshold for isVague flag (0-100) */
  vaguenessThreshold: number;
  /** Whether to prefer LLM over ML (for verification) */
  preferLLM: boolean;
}

/** Default configuration */
export const DEFAULT_HYBRID_CONFIG: HybridAnalyzerConfig = {
  confidenceThreshold: 0.6, // Fall back to LLM if confidence < 60%
  vaguenessThreshold: DEFAULT_VAGUENESS_THRESHOLD,
  preferLLM: false,
};

// ============================================================================
// LLM ANALYSIS PROMPT
// ============================================================================

function buildAnalysisPrompt(prompt: string): string {
  return `Analyze this prompt that a developer might send to a coding assistant.

PROMPT TO ANALYZE:
"${prompt}"

Rate the vagueness from 0-100:
- 0-20: Very specific (has file paths, line numbers, exact error messages)
- 20-40: Specific (clear intent, mentions specific technologies/components)
- 40-60: Moderate (has topic but missing important context)
- 60-80: Vague (uses generic terms like "fix it", no specifics)
- 80-100: Very vague (no clear intent, like "help" or "do something")

Respond with ONLY valid JSON:
{"vaguenessScore": <number 0-100>, "reasoning": "<1 sentence explanation>"}`;
}

// ============================================================================
// LLM RESPONSE PARSING
// ============================================================================

interface LLMAnalysisResponse {
  vaguenessScore: number;
  reasoning: string;
}

function isValidLLMAnalysisResponse(obj: unknown): obj is LLMAnalysisResponse {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const response = obj as Record<string, unknown>;
  return typeof response.vaguenessScore === 'number' && typeof response.reasoning === 'string';
}

function parseLLMAnalysisResponse(response: string): LLMAnalysisResponse | null {
  try {
    let jsonStr = response.trim();

    // Extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Find JSON object
    const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      jsonStr = jsonObjectMatch[0];
    }

    const parsed: unknown = JSON.parse(jsonStr);

    if (!isValidLLMAnalysisResponse(parsed)) {
      return null;
    }

    return {
      vaguenessScore: Math.max(0, Math.min(100, Math.round(parsed.vaguenessScore))),
      reasoning: parsed.reasoning,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// HYBRID ANALYZER
// ============================================================================

/**
 * Hybrid Analyzer
 *
 * Provides intelligent vagueness analysis using ML with LLM fallback.
 */
export class HybridAnalyzer {
  private config: HybridAnalyzerConfig;
  private mlAnalyzer: MLAnalyzer | null = null;

  constructor(config: HybridAnalyzerConfig = DEFAULT_HYBRID_CONFIG) {
    this.config = { ...config };
  }

  /**
   * Set the ML model directly
   */
  setMLModel(analyzer: MLAnalyzer): void {
    this.mlAnalyzer = analyzer;
  }

  /**
   * Set ML model from JSON
   */
  setMLModelJSON(json: MLModelJSON): void {
    this.mlAnalyzer = MLAnalyzer.fromJSON(json);
  }

  /**
   * Check if ML model is available
   */
  hasMLModel(): boolean {
    return this.mlAnalyzer !== null && this.mlAnalyzer.isTrained();
  }

  /**
   * Analyze a prompt for vagueness
   *
   * Uses ML when confident, falls back to LLM otherwise
   */
  async analyze(prompt: string, token?: vscode.CancellationToken): Promise<HybridAnalysisResult> {
    // If preferLLM is set, skip ML
    if (this.config.preferLLM) {
      return this.analyzeWithLLM(prompt, token);
    }

    // Try ML first if available
    if (this.hasMLModel()) {
      const mlResult = this.mlAnalyzer!.analyze(prompt, this.config.vaguenessThreshold);

      // If confidence is high enough, use ML result
      if (mlResult.confidence >= this.config.confidenceThreshold) {
        return {
          score: mlResult.score,
          confidence: mlResult.confidence,
          isVague: mlResult.isVague,
          source: 'ml',
        };
      }

      // Low confidence - try LLM fallback
      logger.debug('ML confidence low, trying LLM fallback', {
        prompt: prompt.substring(0, 50),
        mlConfidence: mlResult.confidence,
      });

      try {
        const llmResult = await this.analyzeWithLLM(prompt, token);
        return {
          ...llmResult,
          source: 'fallback',
        };
      } catch (error) {
        // LLM failed, return ML result anyway
        logger.warn('LLM fallback failed, using ML result', { error });
        return {
          score: mlResult.score,
          confidence: mlResult.confidence,
          isVague: mlResult.isVague,
          source: 'ml',
        };
      }
    }

    // No ML model - must use LLM
    return this.analyzeWithLLM(prompt, token);
  }

  /**
   * Force ML-only analysis (no LLM fallback)
   * Returns Promise for API consistency with analyze()
   */
  analyzeWithMLOnly(prompt: string): HybridAnalysisResult {
    if (!this.hasMLModel()) {
      throw new Error('ML model not available. Call setMLModel() first.');
    }

    const mlResult = this.mlAnalyzer!.analyze(prompt, this.config.vaguenessThreshold);

    return {
      score: mlResult.score,
      confidence: mlResult.confidence,
      isVague: mlResult.isVague,
      source: 'ml',
    };
  }

  /**
   * Force LLM analysis (skip ML)
   */
  async analyzeWithLLM(prompt: string, token?: vscode.CancellationToken): Promise<HybridAnalysisResult> {
    // Get Copilot model
    const models = await vscode.lm.selectChatModels({
      vendor: 'copilot',
    });

    if (models.length === 0) {
      throw new Error('GitHub Copilot not available for LLM analysis');
    }

    const model = models.find((m) => m.family.toLowerCase().includes('gpt-4')) || models[0];

    // Build and send request
    const analysisPrompt = buildAnalysisPrompt(prompt);
    const messages = [vscode.LanguageModelChatMessage.User(analysisPrompt)];

    const cancellationToken = token || new vscode.CancellationTokenSource().token;
    const response = await model.sendRequest(messages, {}, cancellationToken);

    // Collect response
    let fullResponse = '';
    for await (const fragment of response.text) {
      fullResponse += fragment;
    }

    // Parse response
    const parsed = parseLLMAnalysisResponse(fullResponse);

    if (!parsed) {
      throw new Error('Failed to parse LLM response');
    }

    return {
      score: parsed.vaguenessScore,
      confidence: 1.0, // LLM is considered authoritative
      isVague: parsed.vaguenessScore >= this.config.vaguenessThreshold,
      source: 'llm',
      reasoning: parsed.reasoning,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): HybridAnalyzerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<HybridAnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
