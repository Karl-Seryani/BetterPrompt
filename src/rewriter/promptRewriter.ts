/**
 * Prompt Rewriter Orchestrator
 * Coordinates context detection and Copilot enhancement
 */

import * as vscode from 'vscode';
import type { RewriteResult } from './types';
import { VsCodeLmRewriter, isVsCodeLmAvailable } from './vscodeLmRewriter';
import { detectTieredContext, getFormattedContext, type TieredContext } from '../context/tieredContextDetector';
import { getGlobalRateLimiter } from '../utils/rateLimiter';
import { getPromptCache } from '../utils/promptCache';

export interface RewriteOptions {
  includeContext?: boolean; // Include workspace context (default: true)
}

export interface RewriteWorkflowResult {
  success: boolean;
  rewrite?: RewriteResult;
  error?: string;
  context?: TieredContext;
  cached?: boolean;
}

/**
 * Main orchestrator for the prompt rewriting workflow
 * Uses GitHub Copilot via VS Code Language Model API
 */
export class PromptRewriter {
  private vscodeLmRewriter: VsCodeLmRewriter;
  private includeContext: boolean;

  constructor(options: RewriteOptions = {}) {
    this.includeContext = options.includeContext ?? true;
    this.vscodeLmRewriter = new VsCodeLmRewriter({});
  }

  /**
   * Enhances a prompt using GitHub Copilot
   */
  public async processPrompt(
    prompt: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<RewriteWorkflowResult> {
    try {
      // Check if cancelled
      if (cancellationToken?.isCancellationRequested) {
        return { success: false, error: 'Request was cancelled' };
      }

      // Check rate limit
      const rateLimiter = getGlobalRateLimiter();
      if (!rateLimiter.canMakeRequest()) {
        const timeUntilReset = Math.ceil(rateLimiter.getTimeUntilReset() / 1000);
        return {
          success: false,
          error: `Rate limit exceeded. Try again in ${timeUntilReset} seconds.`,
        };
      }

      // Detect context
      let context: TieredContext | undefined;
      let contextString = '';
      if (this.includeContext) {
        context = await detectTieredContext({ token: cancellationToken });
        contextString = getFormattedContext(context);
      }

      // Check if cancelled after context detection
      if (cancellationToken?.isCancellationRequested) {
        return { success: false, error: 'Request was cancelled', context };
      }

      // Check cache
      const promptCache = getPromptCache();
      const cachedResult = promptCache.get(prompt, contextString);
      if (cachedResult) {
        return { success: true, rewrite: cachedResult, context, cached: true };
      }

      // Check Copilot availability
      const available = await isVsCodeLmAvailable();
      if (!available) {
        return {
          success: false,
          error: 'GitHub Copilot is not available. Make sure it is installed and you are signed in.',
          context,
        };
      }

      // Enhance with Copilot
      const rewrite = await this.vscodeLmRewriter.enhancePrompt(prompt, contextString, cancellationToken);
      rateLimiter.recordRequest();
      promptCache.set(prompt, contextString, rewrite);

      return { success: true, rewrite, context };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
