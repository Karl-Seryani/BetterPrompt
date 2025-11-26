/**
 * Shared types for prompt rewriters
 */

/**
 * Result of prompt enhancement from any rewriter
 */
export interface RewriteResult {
  original: string;
  enhanced: string;
  model: string;
  tokensUsed?: number;
  confidence: number;
}
