/**
 * Groq AI-powered prompt rewriter
 * Uses free Groq API with Llama 3.3 70B model
 */

import * as vscode from 'vscode';
import { buildSystemPrompt, buildUserPrompt } from './sharedPrompts';
import { calculateConfidenceAsync } from './qualityAnalyzer';
import type { RewriteResult } from './types';
import { formatUserError } from '../utils/errorHandler';
import type { AnalysisResult } from '../../core/analyzer';
import type { VaguenessAnalysisResult } from '../ml/vaguenessService';

export interface GroqConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_TEMPERATURE = 0.7;

/**
 * Groq API rewriter using Llama 3.3 70B model
 */
export class GroqRewriter {
  private config: GroqConfig;

  constructor(config: GroqConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error('Groq API key is required. Get a free key at console.groq.com');
    }

    this.config = {
      model: DEFAULT_MODEL,
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      ...config,
    };
  }

  /**
   * Enhances a vague prompt using Groq AI
   * @param vaguePrompt The original vague prompt
   * @param context Optional workspace context (current file, tech stack, etc.)
   * @param cancellationToken Optional token to cancel the request
   * @param analysis Optional pre-computed analysis to avoid re-analyzing for confidence
   * @returns Enhanced prompt with better context and clarity
   */
  public async enhancePrompt(
    vaguePrompt: string,
    context?: string,
    cancellationToken?: vscode.CancellationToken,
    analysis?: AnalysisResult | VaguenessAnalysisResult
  ): Promise<RewriteResult> {
    if (!vaguePrompt || vaguePrompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(vaguePrompt, context);

    try {
      const response = await this.callGroqAPI(systemPrompt, userPrompt, cancellationToken);
      const enhanced = this.extractEnhancedPrompt(response);

      // Calculate confidence using AI comparative scoring (with fallback to rules)
      const confidence = await calculateConfidenceAsync(vaguePrompt, enhanced, analysis, cancellationToken);

      return {
        original: vaguePrompt,
        enhanced,
        model: this.config.model || DEFAULT_MODEL,
        tokensUsed: response.usage?.total_tokens,
        confidence,
      };
    } catch (error) {
      // Use error handler to provide user-friendly message
      const userMessage = formatUserError(error);
      throw new Error(userMessage);
    }
  }

  /**
   * Calls the Groq API with timeout and cancellation support
   */
  private async callGroqAPI(
    systemPrompt: string,
    userPrompt: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<GroqResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Listen for VS Code cancellation and abort the fetch
    const cancellationListener = cancellationToken?.onCancellationRequested(() => {
      controller.abort();
    });

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      cancellationListener?.dispose();

      if (!response.ok) {
        const error = (await response.json().catch(() => ({
          error: { message: response.statusText },
        }))) as { error?: { message?: string } };
        throw new Error(`Groq API error: ${error.error?.message || `HTTP ${response.status}`}`);
      }

      const data: unknown = await response.json();
      validateGroqResponse(data);
      return data;
    } catch (error) {
      clearTimeout(timeout);
      cancellationListener?.dispose();

      if ((error as Error).name === 'AbortError') {
        // Check if it was user cancellation or timeout
        if (cancellationToken?.isCancellationRequested) {
          throw new Error('Request was cancelled');
        }
        throw new Error('Groq API request timed out after 30 seconds. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Extracts the enhanced prompt from Groq response
   */
  private extractEnhancedPrompt(response: GroqResponse): string {
    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in Groq response');
    }

    // Remove any meta-commentary or quotes
    let enhanced = content.trim();

    // Remove surrounding quotes if present
    if ((enhanced.startsWith('"') && enhanced.endsWith('"')) || (enhanced.startsWith("'") && enhanced.endsWith("'"))) {
      enhanced = enhanced.slice(1, -1);
    }

    return enhanced.trim();
  }
}

/**
 * Groq API response interface
 */
interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Validates that a response matches the expected Groq API schema
 * Throws descriptive errors if validation fails
 */
function validateGroqResponse(data: unknown): asserts data is GroqResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Groq API returned invalid response: expected object');
  }

  const response = data as Record<string, unknown>;

  // Validate required top-level fields
  if (typeof response.id !== 'string') {
    throw new Error('Groq API response missing or invalid "id" field');
  }

  if (!Array.isArray(response.choices)) {
    throw new Error('Groq API response missing or invalid "choices" array');
  }

  if (response.choices.length === 0) {
    throw new Error('Groq API response contains empty choices array');
  }

  // Validate first choice structure
  const choice = response.choices[0] as Record<string, unknown>;
  if (!choice || typeof choice !== 'object') {
    throw new Error('Groq API response has invalid choice object');
  }

  const message = choice.message as Record<string, unknown>;
  if (!message || typeof message !== 'object') {
    throw new Error('Groq API response missing message in choice');
  }

  if (typeof message.content !== 'string') {
    throw new Error('Groq API response missing or invalid message content');
  }
}
