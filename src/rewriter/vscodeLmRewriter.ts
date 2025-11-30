/**
 * VS Code Language Model API Rewriter
 * Uses GitHub Copilot's language models
 */

import * as vscode from 'vscode';
import { buildSystemPrompt, buildUserPrompt } from './sharedPrompts';
import type { RewriteResult, ImprovementBreakdown } from './types';
import { formatUserError } from '../utils/errorHandler';

export interface VsCodeLmConfig {
  preferredModel?: 'auto' | 'gpt-4';
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
 * Simple improvement detection by comparing original and enhanced prompts
 */
function getImprovements(original: string, enhanced: string): ImprovementBreakdown {
  const originalLower = original.toLowerCase();
  const enhancedLower = enhanced.toLowerCase();

  return {
    addedSpecificity: enhanced.length > original.length * 1.5,
    madeActionable:
      enhancedLower.includes('step') ||
      enhancedLower.includes('create') ||
      enhancedLower.includes('implement') ||
      enhancedLower.includes('add'),
    addressedIssues: !originalLower.includes('fix') || enhancedLower.includes('error') || enhancedLower.includes('bug'),
    stayedOnTopic: true,
  };
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
   */
  public async enhancePrompt(
    prompt: string,
    context?: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<RewriteResult> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    const models = await vscode.lm.selectChatModels();

    if (models.length === 0) {
      throw new Error('No language models available. Make sure GitHub Copilot is installed and active.');
    }

    const model = this.selectModel(models);
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(prompt, context);

    try {
      const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
        vscode.LanguageModelChatMessage.User(userPrompt),
      ];

      const token = cancellationToken ?? new vscode.CancellationTokenSource().token;
      const response = await model.sendRequest(messages, {}, token);

      let enhanced = '';
      for await (const fragment of response.text) {
        enhanced += fragment;
      }

      enhanced = this.cleanEnhancedPrompt(enhanced.trim());
      const improvements = getImprovements(prompt, enhanced);

      return {
        original: prompt,
        enhanced,
        model: `${model.vendor}/${model.family}`,
        tokensUsed: undefined,
        improvements,
      };
    } catch (error: unknown) {
      const userMessage = formatUserError(error);
      throw new Error(userMessage);
    }
  }

  private selectModel(models: vscode.LanguageModelChat[]): vscode.LanguageModelChat {
    const preference = this.config.preferredModel || 'auto';
    const gpt4Models = models.filter((m) => m.family.toLowerCase().includes('gpt-4'));

    if (preference === 'gpt-4') {
      if (gpt4Models.length > 0) {
        return gpt4Models[0];
      }
      throw new Error('GPT-4 model not available. Make sure GitHub Copilot Chat is installed.');
    }

    if (gpt4Models.length > 0) {
      return gpt4Models[0];
    }
    return models[0];
  }

  private cleanEnhancedPrompt(enhanced: string): string {
    if ((enhanced.startsWith('"') && enhanced.endsWith('"')) || (enhanced.startsWith("'") && enhanced.endsWith("'"))) {
      enhanced = enhanced.slice(1, -1);
    }
    return enhanced.trim();
  }
}
