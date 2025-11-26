/**
 * Groq AI-powered prompt rewriter
 * Uses free Groq API with Llama 3.3 70B model
 */

import { buildSystemPrompt, buildUserPrompt, calculateConfidence } from './sharedPrompts';
import type { RewriteResult } from './types';

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
   * @returns Enhanced prompt with better context and clarity
   */
  public async enhancePrompt(vaguePrompt: string, context?: string): Promise<RewriteResult> {
    if (!vaguePrompt || vaguePrompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(vaguePrompt, context);

    try {
      const response = await this.callGroqAPI(systemPrompt, userPrompt);
      const enhanced = this.extractEnhancedPrompt(response);

      return {
        original: vaguePrompt,
        enhanced,
        model: this.config.model || DEFAULT_MODEL,
        tokensUsed: response.usage?.total_tokens,
        confidence: calculateConfidence(vaguePrompt, enhanced),
      };
    } catch (error) {
      throw new Error(`Groq API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calls the Groq API with timeout
   */
  private async callGroqAPI(systemPrompt: string, userPrompt: string): Promise<GroqResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

      if (!response.ok) {
        const error = (await response.json().catch(() => ({
          error: { message: response.statusText },
        }))) as { error?: { message?: string } };
        throw new Error(`Groq API error: ${error.error?.message || `HTTP ${response.status}`}`);
      }

      return (await response.json()) as GroqResponse;
    } catch (error) {
      clearTimeout(timeout);
      if ((error as Error).name === 'AbortError') {
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
