/**
 * Shared constants for BetterPrompt
 * Single source of truth for configurable values
 */

// ============================================================================
// TIMEOUTS
// ============================================================================

/**
 * Maximum time to wait for AI enhancement before timing out
 * Used in chat participant to prevent indefinite hangs
 */
export const ENHANCEMENT_TIMEOUT_MS = 30000;

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Default maximum requests per time window
 */
export const DEFAULT_RATE_LIMIT = 10;

/**
 * Default rate limit window in milliseconds (1 minute)
 */
export const DEFAULT_RATE_WINDOW_MS = 60000;

// ============================================================================
// ANALYSIS - VAGUENESS SCORING
// ============================================================================

/**
 * Default vagueness threshold - prompts scoring below this skip enhancement
 */
export const DEFAULT_VAGUENESS_THRESHOLD = 30;

/**
 * Maximum vagueness score (fully vague prompt)
 */
export const MAX_VAGUENESS_SCORE = 100;

/**
 * Scoring weights for different vagueness issue types
 * Higher weight = more impact on final vagueness score
 */
export const SCORE_WEIGHTS = {
  /** Weight for prompts using vague verbs like "make", "fix", "do" */
  VAGUE_VERB: 30,
  /** Weight for learning/explanation requests without structure */
  LEARNING_VERB: 25,
  /** Weight for prompts lacking file paths, code refs, etc. */
  MISSING_CONTEXT: 35,
  /** Weight for prompts with overly broad terms like "app", "system" */
  BROAD_SCOPE: 30,
  /** Extra penalty for very short prompts (<=2 words) */
  VERY_SHORT_BONUS: 20,
} as const;

/**
 * Thresholds for prompt length analysis
 */
export const LENGTH_THRESHOLDS = {
  /** Prompts with <= this many words get extra penalty */
  VERY_SHORT: 2,
  /** Prompts with < this many words are considered short */
  SHORT: 5,
  /** Prompts with < this many words need context patterns to be specific */
  CONTEXT_NEEDED: 20,
} as const;

/**
 * Multiplier for specificity offset
 * Higher value = specificity reduces vagueness score more aggressively
 * A value of 0.8 means specificityScore of 50 reduces vagueness by 40 points
 */
export const SPECIFICITY_OFFSET_MULTIPLIER = 0.8;

// ============================================================================
// ANALYSIS - SPECIFICITY SCORING
// ============================================================================

/**
 * Maximum points from high-value specificity patterns
 * (file paths, HTTP methods, code references)
 */
export const SPECIFICITY_HIGH_VALUE_MAX = 45;

/**
 * Points per high-value pattern match
 */
export const SPECIFICITY_HIGH_VALUE_POINTS = 15;

/**
 * Maximum points from medium-value specificity patterns
 * (auth terms, database terms, framework terms, testing terms)
 */
export const SPECIFICITY_MEDIUM_VALUE_MAX = 40;

/**
 * Points per medium-value pattern match
 */
export const SPECIFICITY_MEDIUM_VALUE_POINTS = 10;

/**
 * Maximum points from low-value specificity patterns
 * (general tech terms)
 */
export const SPECIFICITY_LOW_VALUE_MAX = 20;

/**
 * Points per low-value pattern match
 */
export const SPECIFICITY_LOW_VALUE_POINTS = 5;

/**
 * Maximum points from requirements/constraints patterns
 */
export const SPECIFICITY_REQUIREMENTS_MAX = 16;

/**
 * Points per requirements pattern match
 */
export const SPECIFICITY_REQUIREMENTS_POINTS = 8;

/**
 * Maximum length bonus for detailed prompts
 */
export const SPECIFICITY_LENGTH_BONUS_MAX = 10;

/**
 * Words per length bonus point (every N words = +2 points)
 */
export const SPECIFICITY_LENGTH_BONUS_DIVISOR = 5;

// ============================================================================
// QUALITY ANALYSIS - CONFIDENCE SCORING
// ============================================================================

/**
 * Weight for specificity gain in confidence calculation
 * How much more specific did the enhancement make the prompt?
 */
export const CONFIDENCE_WEIGHT_SPECIFICITY_GAIN = 0.35;

/**
 * Weight for actionability in confidence calculation
 * Does the enhanced prompt have clear actions/steps?
 */
export const CONFIDENCE_WEIGHT_ACTIONABILITY = 0.25;

/**
 * Weight for issue coverage in confidence calculation
 * Did the enhancement address the detected issues?
 */
export const CONFIDENCE_WEIGHT_ISSUE_COVERAGE = 0.25;

/**
 * Weight for relevance in confidence calculation
 * Did the enhancement stay on topic?
 */
export const CONFIDENCE_WEIGHT_RELEVANCE = 0.15;

/**
 * Maximum specificity gain (in points) that maps to 1.0 normalized gain
 * A gain of this many points = maximum specificity improvement
 */
export const SPECIFICITY_GAIN_NORMALIZER = 50;

// ============================================================================
// QUALITY ANALYSIS - IMPROVEMENT THRESHOLDS
// ============================================================================

/**
 * Threshold for considering "added specificity" as an improvement
 * Score >= this = specificity was meaningfully added (15%)
 */
export const IMPROVEMENT_SPECIFICITY_THRESHOLD = 0.15;

/**
 * Threshold for considering prompt "made actionable"
 * Score >= this = prompt has clear actionable steps (30%)
 */
export const IMPROVEMENT_ACTIONABILITY_THRESHOLD = 0.3;

/**
 * Threshold for considering issues "addressed"
 * Score >= this = detected issues were addressed (50%)
 */
export const IMPROVEMENT_ISSUE_COVERAGE_THRESHOLD = 0.5;

/**
 * Threshold for considering enhancement "stayed on topic"
 * Score >= this = enhancement is relevant to original (50%)
 */
export const IMPROVEMENT_RELEVANCE_THRESHOLD = 0.5;
