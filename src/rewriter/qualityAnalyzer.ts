/**
 * Enhancement Quality Analyzer
 * Measures REAL confidence based on actual enhancement quality
 *
 * Uses the `natural` NLP library for proper Porter stemming.
 *
 * Confidence weights are defined in core/constants.ts:
 * - CONFIDENCE_WEIGHT_SPECIFICITY_GAIN (default: 0.35) - How much more specific?
 * - CONFIDENCE_WEIGHT_ACTIONABILITY (default: 0.25) - Has clear actions/steps?
 * - CONFIDENCE_WEIGHT_ISSUE_COVERAGE (default: 0.25) - Addressed detected issues?
 * - CONFIDENCE_WEIGHT_RELEVANCE (default: 0.15) - Stayed on topic?
 */

import * as vscode from 'vscode';
import { PorterStemmer } from 'natural';
import { calculateSpecificityScore, analyzePrompt, type AnalysisResult, IssueType } from '../../core/analyzer';
import { ACTION_VERBS, TECH_OBJECTS, FRAMEWORK_PATTERN, VAGUE_WORDS_PATTERN, STOP_WORDS } from '../../core/patterns';
import {
  CONFIDENCE_WEIGHT_SPECIFICITY_GAIN,
  CONFIDENCE_WEIGHT_ACTIONABILITY,
  CONFIDENCE_WEIGHT_ISSUE_COVERAGE,
  CONFIDENCE_WEIGHT_RELEVANCE,
  SPECIFICITY_GAIN_NORMALIZER,
} from '../../core/constants';
import { ComparativeScorer } from '../ml/comparativeScorer';
import { logger } from '../utils/logger';

/**
 * Result of quality analysis with component breakdown
 */
export interface QualityResult {
  confidence: number; // 0-1, overall quality score
  specificityGain: number; // 0-1, how much specificity was added
  actionability: number; // 0-1, how actionable is the enhanced prompt
  issueCoverage: number; // 0-1, how well were detected issues addressed
  relevance: number; // 0-1, how relevant is enhancement to original
}

/**
 * Stems a word using Porter Stemmer from natural library
 * This properly handles all word variations (implementing, implemented, implements → implement)
 */
function stem(word: string): string {
  return PorterStemmer.stem(word.toLowerCase());
}

/**
 * Measures how much specificity was gained by the enhancement
 * Uses the same specificity scoring as the analyzer
 *
 * @param original Original prompt
 * @param enhanced Enhanced prompt
 * @returns Score 0-1 representing specificity gain
 */
export function measureSpecificityGain(original: string, enhanced: string): number {
  const originalScore = calculateSpecificityScore(original);
  const enhancedScore = calculateSpecificityScore(enhanced);

  // Calculate raw gain
  const rawGain = enhancedScore - originalScore;

  // Normalize: SPECIFICITY_GAIN_NORMALIZER+ point gain = 1.0, proportional below
  const normalizedGain = Math.min(rawGain / SPECIFICITY_GAIN_NORMALIZER, 1);

  // Can't have negative gain (if somehow enhanced is less specific)
  return Math.max(0, normalizedGain);
}

/**
 * Measures how actionable the enhanced prompt is
 * Actionable = can be acted on without clarifying questions
 *
 * Key insight: Actionability comes from CLARITY, not just technical terms.
 * "Add error handling" is actionable because verb + object is clear.
 *
 * @param enhanced Enhanced prompt
 * @returns Score 0-1 representing actionability
 */
export function measureActionability(enhanced: string): number {
  let score = 0;
  const words = enhanced.toLowerCase().split(/\s+/);
  const stemmedWords = new Set(words.map(stem));

  // === STRONG ACTION VERBS (up to 0.20) ===
  // Stem the action verbs once for comparison
  const stemmedActionVerbs = new Set([...ACTION_VERBS].map(stem));

  let verbCount = 0;
  for (const stemmedWord of stemmedWords) {
    if (stemmedActionVerbs.has(stemmedWord)) {
      verbCount++;
    }
  }
  const hasVerb = verbCount > 0;
  score += Math.min(verbCount * 0.1, 0.2);

  // === TECHNICAL OBJECTS (up to 0.20) ===
  const stemmedTechObjects = new Set([...TECH_OBJECTS].map(stem));

  let objectCount = 0;
  for (const stemmedWord of stemmedWords) {
    if (stemmedTechObjects.has(stemmedWord)) {
      objectCount++;
    }
  }
  score += Math.min(objectCount * 0.05, 0.2);

  // === VERB + OBJECT COMBO BONUS (up to 0.15) ===
  // "Add error handling" is more actionable than "Add" or "error handling" alone
  if (hasVerb && objectCount > 0) {
    score += 0.1;
    if (objectCount >= 2) {
      score += 0.05;
    } // Extra bonus for multiple objects
  }

  // === CONCRETE DETAILS (up to 0.15) ===
  // File paths
  if (/(?:src|lib|app|components?|pages?|utils?)\/[\w/.]+|[\w/]+\.[tj]sx?/i.test(enhanced)) {
    score += 0.05;
  }
  // Line numbers
  if (/\bline\s+\d+|\bat\s+\d+|:\d+:\d+/i.test(enhanced)) {
    score += 0.05;
  }
  // Named entities (with X, using Y)
  if (/\b(with|using|via|through)\s+\w+/i.test(enhanced)) {
    score += 0.05;
  }

  // === STRUCTURE (up to 0.10) ===
  const numberedSteps = enhanced.match(/(?:^|\n)\s*\d+[.)]/gm);
  if (numberedSteps) {
    score += Math.min(numberedSteps.length * 0.03, 0.07);
  }
  const bullets = enhanced.match(/(?:^|\n)\s*[-•*]/gm);
  if (bullets) {
    score += Math.min(bullets.length * 0.02, 0.05);
  }

  // === QUESTIONS (up to 0.05) ===
  // Questions indicate thoughtful requirement gathering
  const questions = enhanced.match(/\?/g);
  if (questions) {
    score += Math.min(questions.length * 0.02, 0.05);
  }

  // === FRAMEWORK/TECH MENTIONS (up to 0.10) ===
  const fwMatches = enhanced.match(FRAMEWORK_PATTERN);
  if (fwMatches) {
    score += Math.min(new Set(fwMatches.map((f) => f.toLowerCase())).size * 0.04, 0.1);
  }

  // === PENALTIES ===

  // Vague language (up to -0.20)
  const vagueMatches = enhanced.match(VAGUE_WORDS_PATTERN);
  if (vagueMatches) {
    score -= Math.min(vagueMatches.length * 0.05, 0.2);
  }

  // No verb = hard to act on
  if (!hasVerb) {
    score -= 0.1;
  }

  // Very short + no verb + no object = not actionable
  if (enhanced.length < 15 && !hasVerb && objectCount === 0) {
    score -= 0.15;
  }

  // Round to avoid floating point precision issues (0.39999999 should be 0.40)
  return Math.round(Math.max(0, Math.min(score, 1)) * 100) / 100;
}

/**
 * Measures how well the enhancement addresses the original issues
 *
 * @param originalAnalysis Analysis result from the original prompt
 * @param enhanced Enhanced prompt
 * @returns Score 0-1 representing issue coverage
 */
export function measureIssueCoverage(originalAnalysis: AnalysisResult, enhanced: string): number {
  const issues = originalAnalysis.issues;

  // No issues to cover = return 0 (not relevant metric)
  if (issues.length === 0) {
    return 0;
  }

  let coveredCount = 0;

  for (const issue of issues) {
    switch (issue.type) {
      case IssueType.VAGUE_VERB:
        // Check if enhancement uses more specific verbs
        if (/\b(implement|refactor|debug|optimize|design|integrate|configure|migrate)\b/i.test(enhanced)) {
          coveredCount++;
        } else if (/\b(step|phase|requirement|feature|endpoint|component|function)\b/i.test(enhanced)) {
          coveredCount += 0.5; // Partial credit for adding structure
        }
        break;

      case IssueType.MISSING_CONTEXT:
        // Check if enhancement adds context
        if (
          /\b(?:src|lib|app|components?)\/[\w/.]+/i.test(enhanced) || // File paths
          /[\w/]+\.(ts|js|tsx|jsx|py|java)/i.test(enhanced) || // File extensions
          /\bline\s+\d+/i.test(enhanced) // Line numbers
        ) {
          coveredCount++;
        } else if (/\b(technology|framework|stack|file|directory|module)\b/i.test(enhanced)) {
          coveredCount += 0.5; // Partial credit for mentioning context
        }
        break;

      case IssueType.UNCLEAR_SCOPE:
        // Check if enhancement clarifies scope
        if (
          /\bwith\s+\w+(?:\s*,\s*\w+)+/i.test(enhanced) || // "with X, Y, Z"
          /\b(feature|requirement|constraint|include|exclude)\b/i.test(enhanced)
        ) {
          coveredCount++;
        } else if (/\b(should|must|need)\b/i.test(enhanced)) {
          coveredCount += 0.5; // Partial credit
        }
        break;
    }
  }

  return Math.min(coveredCount / issues.length, 1);
}

/**
 * Measures how relevant the enhancement is to the original prompt
 * Checks if key terms from original are preserved/expanded
 *
 * @param original Original prompt
 * @param enhanced Enhanced prompt
 * @returns Score 0-1 representing relevance
 */
export function measureRelevance(original: string, enhanced: string): number {
  const originalTrimmed = original.trim().toLowerCase();
  const enhancedLower = enhanced.toLowerCase();

  // Short originals get benefit of the doubt
  if (originalTrimmed.length < 5) {
    return 0.5;
  }

  // Extract significant words from original (ignore common words)
  const originalWords = originalTrimmed.split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  // If no significant words, give benefit of doubt
  if (originalWords.length === 0) {
    return 0.5;
  }

  // Count how many significant words are preserved in enhanced
  let preservedCount = 0;
  for (const word of originalWords) {
    // Check for the word or related forms
    const wordPattern = new RegExp(`\\b${word}\\w*\\b`, 'i');
    if (wordPattern.test(enhancedLower)) {
      preservedCount++;
    }
  }

  // Calculate relevance as ratio of preserved words
  const baseRelevance = preservedCount / originalWords.length;

  // Bonus if enhanced is longer (more elaboration = more relevant expansion)
  const lengthRatio = enhanced.length / original.length;
  const lengthBonus = lengthRatio > 1 && lengthRatio < 20 ? 0.1 : 0;

  return Math.min(baseRelevance + lengthBonus, 1);
}

/**
 * Calculates the overall enhancement quality using weighted components
 *
 * @param original Original prompt
 * @param enhanced Enhanced prompt
 * @param originalAnalysis Analysis of the original prompt
 * @returns Quality result with confidence and component scores
 */
export function calculateEnhancementQuality(
  original: string,
  enhanced: string,
  originalAnalysis: AnalysisResult
): QualityResult {
  // Handle edge cases
  if (!original || !enhanced) {
    return {
      confidence: 0,
      specificityGain: 0,
      actionability: 0,
      issueCoverage: 0,
      relevance: 0,
    };
  }

  // Calculate component scores
  const specificityGain = measureSpecificityGain(original, enhanced);
  const actionability = measureActionability(enhanced);
  const issueCoverage = measureIssueCoverage(originalAnalysis, enhanced);
  const relevance = measureRelevance(original, enhanced);

  // Weighted formula using configurable weights from constants
  const confidence =
    specificityGain * CONFIDENCE_WEIGHT_SPECIFICITY_GAIN +
    actionability * CONFIDENCE_WEIGHT_ACTIONABILITY +
    issueCoverage * CONFIDENCE_WEIGHT_ISSUE_COVERAGE +
    relevance * CONFIDENCE_WEIGHT_RELEVANCE;

  return {
    confidence: Math.max(0, Math.min(confidence, 1)),
    specificityGain,
    actionability,
    issueCoverage,
    relevance,
  };
}

/**
 * Calculates confidence score for the rewrite using rule-based analysis
 * Convenience wrapper around calculateEnhancementQuality
 *
 * @param original Original prompt
 * @param enhanced Enhanced prompt
 * @param existingAnalysis Optional pre-computed analysis to avoid re-analyzing
 * @returns Confidence score 0-1
 */
export function calculateConfidence(original: string, enhanced: string, existingAnalysis?: AnalysisResult): number {
  const analysis = existingAnalysis ?? analyzePrompt(original);
  const quality = calculateEnhancementQuality(original, enhanced, analysis);

  return quality.confidence;
}

// Singleton scorer instance (lazy initialized)
let comparativeScorer: ComparativeScorer | null = null;

function getComparativeScorer(): ComparativeScorer {
  if (!comparativeScorer) {
    comparativeScorer = new ComparativeScorer();
  }
  return comparativeScorer;
}

/**
 * Calculates confidence score using AI comparative scoring when available
 *
 * This function attempts to use Copilot to semantically compare the original
 * and enhanced prompts. If Copilot is unavailable or the comparison fails,
 * it falls back to the rule-based calculateConfidence.
 *
 * @param original Original prompt
 * @param enhanced Enhanced prompt
 * @param existingAnalysis Optional pre-computed analysis for fallback
 * @param cancellationToken Optional cancellation token
 * @returns Confidence score 0-1
 */
export async function calculateConfidenceAsync(
  original: string,
  enhanced: string,
  existingAnalysis?: AnalysisResult,
  cancellationToken?: vscode.CancellationToken
): Promise<number> {
  // Try AI comparative scoring first
  try {
    const scorer = getComparativeScorer();
    const aiConfidence = await scorer.getConfidence(original, enhanced, cancellationToken);

    if (aiConfidence > 0) {
      logger.debug(`AI confidence: ${(aiConfidence * 100).toFixed(1)}%`);
      return aiConfidence;
    }
  } catch (error) {
    logger.debug(`AI scoring failed, using rule-based: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Fall back to rule-based scoring
  const ruleConfidence = calculateConfidence(original, enhanced, existingAnalysis);
  logger.debug(`Rule-based confidence: ${(ruleConfidence * 100).toFixed(1)}%`);
  return ruleConfidence;
}
