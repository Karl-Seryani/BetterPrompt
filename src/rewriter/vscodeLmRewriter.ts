/**
 * VS Code Language Model API Rewriter
 * Uses GitHub Copilot's language models
 */

import * as vscode from 'vscode';
import { buildSystemPrompt, buildUserPrompt } from './sharedPrompts';
import { getImprovements } from './qualityAnalyzer';
import type { RewriteResult } from './types';
import { formatUserError } from '../utils/errorHandler';

export interface VsCodeLmConfig {
  preferredModel?: 'auto' | 'gpt-4' | 'groq';
}

/**
 * Checks if VS Code Language Model API is available
 */
export async function isVsCodeLmAvailable(): Promise<boolean> {
  try {
    const models = await vscode.lm.selectChatModels();
    return models.length > 0;
  } catch {
    return false;
  }
}

/**
 * VS Code Language Model rewriter (uses GitHub Copilot)
 */
export class VsCodeLmRewriter {
  private config: VsCodeLmConfig;

  constructor(config: VsCodeLmConfig) {
    this.config = config;
  }

  /**
   * Enhances a prompt using VS Code Language Model API
   * @param prompt The original prompt
   * @param context Optional workspace context (current file, tech stack, etc.)
   * @param cancellationToken Optional cancellation token for request cancellation
   * @returns Enhanced prompt with improvement breakdown
   */
  public async enhancePrompt(
    prompt: string,
    context?: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<RewriteResult> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    // Select the best available model
    const models = await vscode.lm.selectChatModels();

    if (models.length === 0) {
      throw new Error('No language models available. Make sure GitHub Copilot is installed and active.');
    }

    // Select model based on user preference
    const model = this.selectModel(models);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(prompt, context);

    try {
      // NOTE: We send the system prompt as a User message because VS Code's
      // Language Model API doesn't have a dedicated System message type.
      // This is a known limitation - the model treats it as context.
      const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
        vscode.LanguageModelChatMessage.User(userPrompt),
      ];

      // Use provided cancellation token, or create a new one if not provided
      const token = cancellationToken ?? new vscode.CancellationTokenSource().token;
      const response = await model.sendRequest(messages, {}, token);

      let enhanced = '';
      for await (const fragment of response.text) {
        enhanced += fragment;
      }

      enhanced = this.cleanEnhancedPrompt(enhanced.trim());

      // Get improvement breakdown
      const improvements = getImprovements(prompt, enhanced);

      return {
        original: prompt,
        enhanced,
        model: `${model.vendor}/${model.family}`,
        tokensUsed: undefined, // VS Code API doesn't expose token counts
        improvements,
      };
    } catch (error: unknown) {
      // Use error handler to provide user-friendly message
      const userMessage = formatUserError(error);
      throw new Error(userMessage);
    }
  }

  /**
   * Selects the best model based on user preference and availability
   */
  private selectModel(models: vscode.LanguageModelChat[]): vscode.LanguageModelChat {
    const preference = this.config.preferredModel || 'auto';

    // If user prefers Groq, return null (handled by caller)
    if (preference === 'groq') {
      throw new Error('User prefers Groq API');
    }

    // Find GPT-4 models
    const gpt4Models = models.filter((m) => m.family.toLowerCase().includes('gpt-4'));

    // User preference: GPT-4
    if (preference === 'gpt-4') {
      if (gpt4Models.length > 0) {
        return gpt4Models[0];
      }
      throw new Error('GPT-4 model not available. Make sure GitHub Copilot Chat is installed.');
    }

    // Auto mode: Prefer GPT-4 > First available
    if (gpt4Models.length > 0) {
      return gpt4Models[0];
    }
    return models[0];
  }

  /**
   * Cleans the enhanced prompt by removing quotes and meta-commentary
   */
  private cleanEnhancedPrompt(enhanced: string): string {
    // Remove surrounding quotes if present
    if ((enhanced.startsWith('"') && enhanced.endsWith('"')) || (enhanced.startsWith("'") && enhanced.endsWith("'"))) {
      enhanced = enhanced.slice(1, -1);
    }

    return enhanced.trim();
  }
}
