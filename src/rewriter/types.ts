/**
 * Shared types for prompt rewriters
 */

/**
 * Breakdown of what was improved in the enhancement
 */
export interface ImprovementBreakdown {
  /** Added specificity (file paths, technical terms) */
  addedSpecificity: boolean;
  /** Made actionable (clear steps, action verbs) */
  madeActionable: boolean;
  /** Addressed unclear language */
  addressedIssues: boolean;
  /** Stayed on topic */
  stayedOnTopic: boolean;
}

/**
 * Result of prompt enhancement from any rewriter
 */
export interface RewriteResult {
  original: string;
  enhanced: string;
  model: string;
  tokensUsed?: number;
  /** What was improved in the enhancement */
  improvements: ImprovementBreakdown;
}
