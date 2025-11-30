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

  // When bundled with webpack, files are copied to dist/core/prompts/
  // __dirname points to the dist folder, so we need core/prompts/ relative to it
  const promptPath = path.join(__dirname, 'core/prompts/enhancement-system.txt');

  try {
    cachedSystemPrompt = fs.readFileSync(promptPath, 'utf-8');
    return cachedSystemPrompt;
  } catch (error: unknown) {
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
