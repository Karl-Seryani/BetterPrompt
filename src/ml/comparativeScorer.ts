/**
 * AI Comparative Scorer
 *
 * Uses Copilot to compare original vs enhanced prompts and provide
 * a quality assessment based on real understanding, not just heuristics.
 *
 * This replaces/supplements the rule-based confidence calculation with
 * AI-powered semantic comparison.
 */

import * as vscode from 'vscode';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of AI comparison between original and enhanced prompts
 */
export interface ComparisonResult {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** How much more specific is the enhanced prompt (0-100) */
  specificityGain: number;
  /** How actionable is the enhanced prompt (0-100) */
  actionability: number;
  /** How well does it address the original issues (0-100) */
  issueCoverage: number;
  /** How relevant is the enhancement to the original (0-100) */
  relevance: number;
  /** AI's reasoning for the scores */
  reasoning: string;
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

/**
 * Builds the comparison prompt for Copilot
 */
export function buildComparisonPrompt(original: string, enhanced: string): string {
  return `You are evaluating how well a prompt enhancement improves on the original.

ORIGINAL PROMPT:
"${original}"

ENHANCED PROMPT:
"${enhanced}"

Rate the enhancement quality on these criteria (0-100 each):

1. **specificityGain**: How much more specific is the enhanced prompt?
   - 0-20: No improvement, still vague
   - 20-40: Minor improvements (added a few details)
   - 40-60: Moderate improvements (added context, technology)
   - 60-80: Good improvements (file paths, specific requirements)
   - 80-100: Excellent (complete specification with constraints)

2. **actionability**: Can a developer act on this without clarifying questions?
   - 0-20: Still needs many clarifications
   - 20-40: Needs some clarifications
   - 40-60: Reasonably actionable
   - 60-80: Clear and actionable
   - 80-100: Fully specified, ready to implement

3. **issueCoverage**: Does it address what made the original vague?
   - 0-20: Ignores the problems
   - 20-40: Addresses few issues
   - 40-60: Addresses some issues
   - 60-80: Addresses most issues
   - 80-100: Comprehensively addresses all issues

4. **relevance**: Does the enhancement stay true to the original intent?
   - 0-20: Completely off-topic
   - 20-40: Loosely related
   - 40-60: Related but adds unasked features
   - 60-80: Stays on topic with reasonable expansion
   - 80-100: Perfect expansion of original intent

5. **overallScore**: Your overall assessment (weighted average or judgment call)

Respond with ONLY valid JSON, no other text:
{"overallScore": <0-100>, "specificityGain": <0-100>, "actionability": <0-100>, "issueCoverage": <0-100>, "relevance": <0-100>, "reasoning": "<1-2 sentence explanation>"}`;
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

/**
 * Type guard for comparison response
 */
interface RawComparisonResponse {
  overallScore: number;
  specificityGain: number;
  actionability: number;
  issueCoverage: number;
  relevance: number;
  reasoning: string;
}

function isValidComparisonResponse(obj: unknown): obj is RawComparisonResponse {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const response = obj as Record<string, unknown>;
  return (
    typeof response.overallScore === 'number' &&
    typeof response.specificityGain === 'number' &&
    typeof response.actionability === 'number' &&
    typeof response.issueCoverage === 'number' &&
    typeof response.relevance === 'number' &&
    typeof response.reasoning === 'string'
  );
}

/**
 * Clamps a number to 0-100 range
 */
function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Parses the AI response into a ComparisonResult
 */
export function parseComparisonResponse(response: string): ComparisonResult | null {
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

    if (!isValidComparisonResponse(parsed)) {
      logger.warn('Comparison response missing required fields', { response: jsonStr });
      return null;
    }

    return {
      overallScore: clampScore(parsed.overallScore),
      specificityGain: clampScore(parsed.specificityGain),
      actionability: clampScore(parsed.actionability),
      issueCoverage: clampScore(parsed.issueCoverage),
      relevance: clampScore(parsed.relevance),
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    logger.warn('Failed to parse comparison response', { error, response });
    return null;
  }
}

// ============================================================================
// COMPARATIVE SCORER
// ============================================================================

/**
 * AI-powered comparative scorer
 *
 * Uses Copilot to semantically compare original vs enhanced prompts
 * and provide quality scores.
 */
export class ComparativeScorer {
  /**
   * Compare original and enhanced prompts using AI
   *
   * @param original The original user prompt
   * @param enhanced The enhanced prompt
   * @param token Optional cancellation token
   * @returns Comparison result or null if comparison fails
   */
  async compare(
    original: string,
    enhanced: string,
    token?: vscode.CancellationToken
  ): Promise<ComparisonResult | null> {
    // Check cancellation
    if (token?.isCancellationRequested) {
      return null;
    }

    try {
      // Get Copilot model
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
      });

      if (models.length === 0) {
        logger.warn('Copilot not available for comparison');
        return null;
      }

      // Prefer GPT-4 if available
      const model = models.find((m) => m.family.toLowerCase().includes('gpt-4')) || models[0];

      // Build and send request
      const comparisonPrompt = buildComparisonPrompt(original, enhanced);
      const messages = [vscode.LanguageModelChatMessage.User(comparisonPrompt)];

      const cancellationToken = token || new vscode.CancellationTokenSource().token;
      const response = await model.sendRequest(messages, {}, cancellationToken);

      // Collect response
      let fullResponse = '';
      for await (const fragment of response.text) {
        fullResponse += fragment;
      }

      // Parse and return
      const result = parseComparisonResponse(fullResponse);

      if (result) {
        logger.debug('AI comparison complete', {
          overallScore: result.overallScore,
          reasoning: result.reasoning,
        });
      }

      return result;
    } catch (error) {
      logger.warn('AI comparison failed', { error });
      return null;
    }
  }

  /**
   * Get confidence score (0-1) by comparing prompts
   *
   * Convenience method that returns just the normalized confidence
   *
   * @param original The original user prompt
   * @param enhanced The enhanced prompt
   * @param token Optional cancellation token
   * @returns Confidence 0-1, or 0 on failure
   */
  async getConfidence(original: string, enhanced: string, token?: vscode.CancellationToken): Promise<number> {
    try {
      const result = await this.compare(original, enhanced, token);

      if (!result) {
        return 0;
      }

      // Normalize 0-100 to 0-1
      return result.overallScore / 100;
    } catch {
      return 0;
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let comparativeScorerInstance: ComparativeScorer | null = null;

/**
 * Get the global comparative scorer instance
 */
export function getComparativeScorer(): ComparativeScorer {
  if (!comparativeScorerInstance) {
    comparativeScorerInstance = new ComparativeScorer();
  }
  return comparativeScorerInstance;
}
