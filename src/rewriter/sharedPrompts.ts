/**
 * Intelligent prompt enhancement system
 * Detects intent and adapts response style accordingly
 */

import * as fs from 'fs';
import * as path from 'path';

// Cache the system prompt after first load
let cachedSystemPrompt: string | null = null;

/**
 * Builds the intelligent system prompt
 * Loads from external file (core/prompts/enhancement-system.txt) with caching
 * Adapts to different intents: build, learn, fix, improve
 */
export function buildSystemPrompt(): string {
  if (cachedSystemPrompt !== null) {
    return cachedSystemPrompt;
  }

  // Load from external file - path relative to compiled JS in dist/
  const promptPath = path.join(__dirname, '../../core/prompts/enhancement-system.txt');

  try {
    cachedSystemPrompt = fs.readFileSync(promptPath, 'utf-8');
    return cachedSystemPrompt;
  } catch (error) {
    // Fallback error message if file not found (shouldn't happen in production)
    throw new Error(
      `Failed to load system prompt from ${promptPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Clears the cached system prompt (useful for testing)
 */
export function clearSystemPromptCache(): void {
  cachedSystemPrompt = null;
}

/**
 * Builds the user prompt for the AI
 * @param vaguePrompt The user's original prompt
 * @param context Optional workspace context (file, tech stack, selection, errors)
 */
export function buildUserPrompt(vaguePrompt: string, context?: string): string {
  if (context && context.trim().length > 0) {
    return `WORKSPACE CONTEXT:
${context}

USER PROMPT:
"${vaguePrompt}"`;
  }
  return `"${vaguePrompt}"`;
}

// NOTE: calculateConfidence has been moved to qualityAnalyzer.ts
// Import it from there: import { calculateConfidence } from './qualityAnalyzer';
