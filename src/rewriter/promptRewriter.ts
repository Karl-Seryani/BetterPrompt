/**
 * Prompt Rewriter Orchestrator
 * Coordinates analysis, rewriting, and user approval workflow
 * Implements fallback: VS Code LM → Groq → Error
 */

import { analyzePrompt, AnalysisResult } from '../../core/analyzer';
import { GroqRewriter, RewriteResult } from './groqRewriter';
import { VsCodeLmRewriter, isVsCodeLmAvailable } from './vscodeLmRewriter';
import { detectContext, formatContextForPrompt, WorkspaceContext } from '../context/contextDetector';

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
      const analysis = analyzePrompt(prompt);

      // Step 2: Check if rewrite is needed BEFORE detecting context
      if (analysis.score < this.threshold) {
        return {
          shouldRewrite: false,
          analysis,
          skipped: true,
        };
      }

      // Step 3: Only detect context if we're going to rewrite
      let context: WorkspaceContext | undefined;
      let contextString = '';
      if (this.includeContext) {
        context = detectContext();
        contextString = formatContextForPrompt(context);
      }

      // Step 4: If user prefers Groq, skip VS Code LM
      if (this.preferredModel === 'groq') {
        if (this.groqRewriter) {
          const rewrite = await this.groqRewriter.enhancePrompt(prompt, contextString);
          return {
            shouldRewrite: true,
            analysis,
            rewrite,
            context,
          };
        }
        return {
          shouldRewrite: false,
          analysis,
          error: 'Groq API key not configured. Please add your API key in settings or change preferred model.',
          context,
        };
      }

      // Step 5: Try VS Code Language Model first (for auto, gpt-4, claude preferences)
      const vsCodeLmAvailable = await isVsCodeLmAvailable();
      if (vsCodeLmAvailable) {
        try {
          const rewrite = await this.vscodeLmRewriter.enhancePrompt(prompt, contextString);
          return {
            shouldRewrite: true,
            analysis,
            rewrite,
            context,
          };
        } catch {
          // VS Code LM failed, silently fall back to Groq
        }
      }

      // Step 6: Fallback to Groq API
      if (this.groqRewriter) {
        const rewrite = await this.groqRewriter.enhancePrompt(prompt, contextString);
        return {
          shouldRewrite: true,
          analysis,
          rewrite,
          context,
        };
      }

      // Step 7: No rewriter available
      return {
        shouldRewrite: false,
        analysis,
        error: 'No AI model available. Make sure GitHub Copilot is installed and active.',
        context,
      };
    } catch (error) {
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
