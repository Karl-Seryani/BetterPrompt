/**
 * ML Data Generation Pipeline
 *
 * Generates labeled prompt examples for training the vagueness classifier.
 * Uses LLM (GitHub Copilot or Groq) to label prompts with:
 * - Vagueness score (0-100)
 * - Intent category (build, fix, learn, improve, configure, unknown)
 * - Missing elements
 * - Reasoning
 */

import { PromptTemplate, ALL_TEMPLATES } from './promptTemplates';

// ============================================================================
// TYPES
// ============================================================================

export interface LabeledPrompt {
  prompt: string;
  vaguenessScore: number;
  intentCategory: 'build' | 'fix' | 'learn' | 'improve' | 'configure' | 'unknown';
  missingElements: string[];
  reasoning: string;
}

export interface DataGeneratorConfig {
  targetCount: number;
  batchSize: number;
  outputPath: string;
  useCopilot: boolean;
  useGroq: boolean;
  groqApiKey?: string;
}

export interface GenerationProgress {
  generated: number;
  total: number;
  failed: number;
  cached: number;
}

// Re-export PromptTemplate for tests
export type { PromptTemplate };

// Valid intent categories
const VALID_INTENT_CATEGORIES = ['build', 'fix', 'learn', 'improve', 'configure', 'unknown'] as const;

// ============================================================================
// PROMPT VARIATION GENERATOR
// ============================================================================

/**
 * Generates all variations of a prompt template by substituting variables
 *
 * @param template The template with placeholders and variable options
 * @returns Array of all possible prompt variations
 */
export function generatePromptVariations(template: PromptTemplate): string[] {
  const { base, variables } = template;
  const variableNames = Object.keys(variables);

  // If no variables, return the base as-is
  if (variableNames.length === 0) {
    return [base];
  }

  // Generate all combinations using cartesian product
  const combinations = cartesianProduct(variableNames.map((name) => variables[name]));

  return combinations.map((combo) => {
    let result = base;
    variableNames.forEach((name, index) => {
      result = result.replace(`{${name}}`, combo[index]);
    });
    return result;
  });
}

/**
 * Computes cartesian product of multiple arrays
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map((item) => [item]);

  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap((combo) => curr.map((item) => [...combo, item])),
    [[]]
  );
}

// ============================================================================
// LLM RESPONSE PARSING
// ============================================================================

/**
 * Parses the LLM response into a LabeledPrompt
 *
 * @param response Raw LLM response string (may be JSON or markdown-wrapped JSON)
 * @param originalPrompt The prompt that was being labeled
 * @returns Parsed LabeledPrompt or null if parsing fails
 */
export function parseLLMResponse(response: string, originalPrompt: string): LabeledPrompt | null {
  try {
    // Try to extract JSON from markdown code blocks
    let jsonStr = response;

    // Handle ```json ... ``` wrapping
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Parse JSON
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (
      typeof parsed.vaguenessScore !== 'number' ||
      typeof parsed.intentCategory !== 'string' ||
      !Array.isArray(parsed.missingElements) ||
      typeof parsed.reasoning !== 'string'
    ) {
      return null;
    }

    // Clamp vagueness score to 0-100
    const clampedScore = Math.max(0, Math.min(100, parsed.vaguenessScore));

    // Validate intent category
    const intentCategory = VALID_INTENT_CATEGORIES.includes(parsed.intentCategory)
      ? parsed.intentCategory
      : 'unknown';

    return {
      prompt: originalPrompt,
      vaguenessScore: clampedScore,
      intentCategory: intentCategory as LabeledPrompt['intentCategory'],
      missingElements: parsed.missingElements.map(String),
      reasoning: parsed.reasoning,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates that a LabeledPrompt has all required fields with valid values
 *
 * @param labeled The labeled prompt to validate
 * @returns True if valid, false otherwise
 */
export function validateLabeledPrompt(labeled: LabeledPrompt): boolean {
  // Check prompt is non-empty
  if (!labeled.prompt || labeled.prompt.trim().length === 0) {
    return false;
  }

  // Check vagueness score is in range
  if (labeled.vaguenessScore < 0 || labeled.vaguenessScore > 100) {
    return false;
  }

  // Check intent category is valid
  if (!VALID_INTENT_CATEGORIES.includes(labeled.intentCategory)) {
    return false;
  }

  // Check missingElements is array (can be empty)
  if (!Array.isArray(labeled.missingElements)) {
    return false;
  }

  // Check reasoning is non-empty
  if (!labeled.reasoning || labeled.reasoning.trim().length === 0) {
    return false;
  }

  return true;
}

// ============================================================================
// PROMPT FOR LLM LABELING
// ============================================================================

/**
 * Builds the prompt to send to the LLM for labeling
 */
export function buildLabelingPrompt(promptToLabel: string): string {
  return `You are a prompt quality analyst. Analyze this prompt for a coding assistant and rate its vagueness.

PROMPT TO ANALYZE:
"${promptToLabel}"

Rate the vagueness from 0-100:
- 0-20: Very specific (has file paths, line numbers, exact requirements)
- 20-40: Specific (clear intent, mentions technologies/components)
- 40-60: Moderate (has topic but missing context)
- 60-80: Vague (uses generic terms like "fix it", "make it work")
- 80-100: Very vague (no clear intent, like "help" or "do something")

Respond ONLY with valid JSON in this exact format:
{
  "vaguenessScore": <number 0-100>,
  "intentCategory": "<build|fix|learn|improve|configure|unknown>",
  "missingElements": ["<what specific info is missing>"],
  "reasoning": "<1-2 sentence explanation>"
}`;
}

// ============================================================================
// DATASET GENERATION
// ============================================================================

/**
 * Generates all unique prompts from templates
 */
export function generateAllPrompts(): string[] {
  const allPrompts = new Set<string>();

  for (const template of ALL_TEMPLATES) {
    const variations = generatePromptVariations(template);
    variations.forEach((v) => allPrompts.add(v));
  }

  return Array.from(allPrompts);
}

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Main dataset generation function
 * Note: This is meant to be run as a script, not called from the extension
 */
export async function generateDataset(
  config: DataGeneratorConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _llmCaller?: (prompt: string) => Promise<string>
): Promise<LabeledPrompt[]> {
  const allPrompts = shuffleArray(generateAllPrompts());
  const targetPrompts = allPrompts.slice(0, config.targetCount);

  // For now, return empty array - actual LLM calling will be implemented
  // when we integrate with VS Code LM / Groq APIs
  console.log(`Generated ${targetPrompts.length} unique prompts for labeling`);
  console.log(`Target count: ${config.targetCount}`);
  console.log(`Output path: ${config.outputPath}`);

  // Placeholder - in actual implementation, this would call LLM for each prompt
  return [];
}

// ============================================================================
// CLI ENTRY POINT (for running as script)
// ============================================================================

if (require.main === module) {
  const config: DataGeneratorConfig = {
    targetCount: 1000,
    batchSize: 10,
    outputPath: 'data/training/labeled-prompts.json',
    useCopilot: true,
    useGroq: true,
    groqApiKey: process.env.GROQ_API_KEY,
  };

  generateDataset(config)
    .then((dataset) => {
      console.log(`Generated ${dataset.length} labeled prompts`);
    })
    .catch((error) => {
      console.error('Dataset generation failed:', error);
      process.exit(1);
    });
}
