/**
 * Prompt Rewriter Orchestrator
 * Coordinates analysis, rewriting, and user approval workflow
 * Implements fallback: VS Code LM → Groq → Error
 */

import { analyzePrompt, AnalysisResult } from '../../core/analyzer';
import { GroqRewriter } from './groqRewriter';
import type { RewriteResult } from './types';
import { VsCodeLmRewriter, isVsCodeLmAvailable } from './vscodeLmRewriter';
import { detectContext, formatContextForPrompt, WorkspaceContext } from '../context/contextDetector';
import { getGlobalRateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';

export interface RewriteOptions {
  groqApiKey?: string; // Optional - fallback if VS Code LM not available
  threshold?: number; // Minimum vagueness score to trigger rewriting (default: 30)
  preferredModel?: 'auto' | 'gpt-4' | 'claude' | 'groq'; // Preferred AI model
  includeContext?: boolean; // Include workspace context (default: true)
}

export interface RewriteWorkflowResult {
  shouldRewrite: boolean;
  analysis: AnalysisResult;
  rewrite?: RewriteResult;
  skipped?: boolean;
  error?: string;
  context?: WorkspaceContext;
}

/**
 * Main orchestrator for the prompt rewriting workflow
 * Implements fallback: VS Code LM → Groq → Error
 */
export class PromptRewriter {
  private groqRewriter?: GroqRewriter;
  private vscodeLmRewriter: VsCodeLmRewriter;
  private threshold: number;
  private preferredModel: 'auto' | 'gpt-4' | 'claude' | 'groq';
  private includeContext: boolean;

  constructor(options: RewriteOptions) {
    this.threshold = options.threshold ?? 30;
    this.preferredModel = options.preferredModel || 'auto';
    this.includeContext = options.includeContext ?? true;

    // Initialize VS Code LM rewriter (always available)
    this.vscodeLmRewriter = new VsCodeLmRewriter({
      preferredModel: this.preferredModel,
    });

    // Initialize Groq rewriter as fallback (if API key provided)
    const trimmedKey = options.groqApiKey?.trim();
    if (trimmedKey) {
      this.groqRewriter = new GroqRewriter({
        apiKey: trimmedKey,
      });
    }
  }

  /**
   * Analyzes and optionally rewrites a prompt
   * Tries VS Code LM first, then falls back to Groq
   * @param prompt The original user prompt
   * @returns Workflow result with analysis and potential rewrite
   */
  public async processPrompt(prompt: string): Promise<RewriteWorkflowResult> {
    try {
      // Step 1: Analyze prompt for vagueness FIRST (fast, no I/O)
      logger.debug('Analyzing prompt', { promptLength: prompt.length });
      const analysis = analyzePrompt(prompt);
      logger.debug('Vagueness analysis complete', { score: analysis.score, threshold: this.threshold });

      // Step 2: Check if rewrite is needed BEFORE detecting context
      if (analysis.score < this.threshold) {
        logger.debug('Prompt below threshold, skipping rewrite');
        return {
          shouldRewrite: false,
          analysis,
          skipped: true,
        };
      }

      // Step 2.5: Check rate limit BEFORE making API calls
      const rateLimiter = getGlobalRateLimiter();
      if (!rateLimiter.canMakeRequest()) {
        const timeUntilReset = Math.ceil(rateLimiter.getTimeUntilReset() / 1000);
        logger.warn('Rate limit exceeded', { timeUntilReset });
        return {
          shouldRewrite: false,
          analysis,
          error: `Rate limit exceeded (10 enhancements/minute). Try again in ${timeUntilReset} seconds.`,
        };
      }

      // Step 3: Only detect context if we're going to rewrite
      logger.debug('Detecting workspace context', { includeContext: this.includeContext });
      let context: WorkspaceContext | undefined;
      let contextString = '';
      if (this.includeContext) {
        context = await detectContext();
        contextString = formatContextForPrompt(context);
        logger.debug('Context detected', {
          hasFile: !!context?.currentFile,
          frameworks: context?.techStack?.frameworks?.length || 0,
          languages: context?.techStack?.languages?.length || 0,
        });
      }

      // Step 4: If user prefers Groq, skip VS Code LM
      if (this.preferredModel === 'groq') {
        logger.debug('User prefers Groq, using Groq API');
        if (this.groqRewriter) {
          const rewrite = await this.groqRewriter.enhancePrompt(prompt, contextString);
          rateLimiter.recordRequest(); // Record successful request
          logger.info('Prompt enhanced successfully via Groq');
          return {
            shouldRewrite: true,
            analysis,
            rewrite,
            context,
          };
        }
        logger.error('Groq API key not configured');
        return {
          shouldRewrite: false,
          analysis,
          error: 'Groq API key not configured. Please add your API key in settings or change preferred model.',
          context,
        };
      }

      // Step 5: Try VS Code Language Model first (for auto, gpt-4, claude preferences)
      logger.debug('Checking VS Code LM availability');
      const vsCodeLmAvailable = await isVsCodeLmAvailable();
      if (vsCodeLmAvailable) {
        try {
          logger.debug('Attempting VS Code LM enhancement', { preferredModel: this.preferredModel });
          const rewrite = await this.vscodeLmRewriter.enhancePrompt(prompt, contextString);
          rateLimiter.recordRequest(); // Record successful request
          logger.info('Prompt enhanced successfully via VS Code LM');
          return {
            shouldRewrite: true,
            analysis,
            rewrite,
            context,
          };
        } catch (error) {
          logger.warn('VS Code LM failed, falling back to Groq', error);
        }
      } else {
        logger.debug('VS Code LM not available, will try Groq fallback');
      }

      // Step 6: Fallback to Groq API
      if (this.groqRewriter) {
        logger.debug('Using Groq API fallback');
        const rewrite = await this.groqRewriter.enhancePrompt(prompt, contextString);
        rateLimiter.recordRequest(); // Record successful request
        logger.info('Prompt enhanced successfully via Groq fallback');
        return {
          shouldRewrite: true,
          analysis,
          rewrite,
          context,
        };
      }

      // Step 7: No rewriter available
      logger.error('No AI model available');
      return {
        shouldRewrite: false,
        analysis,
        error: 'No AI model available. Make sure GitHub Copilot is installed and active.',
        context,
      };
    } catch (error) {
      logger.error('Unexpected error in prompt processing', error);
      return {
        shouldRewrite: false,
        analysis: analyzePrompt(prompt),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Updates the vagueness threshold
   */
  public setThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 100) {
      throw new Error('Threshold must be between 0 and 100');
    }
    this.threshold = threshold;
  }

  /**
   * Gets current threshold
   */
  public getThreshold(): number {
    return this.threshold;
  }
}
