/**
 * Prompt Analysis and Enhancement Engine
 * Re-exports analyzer from shared core module and adds enhancement logic
 */

// Re-export everything from the shared core analyzer
export {
  analyzePrompt,
  IssueType,
  IssueSeverity,
  type VaguenessIssue,
  type AnalysisResult,
} from './core/analyzer.js';

// Import for local use
import { analyzePrompt, type AnalysisResult } from './core/analyzer.js';

/**
 * Result of prompt enhancement
 */
export interface EnhancementResult {
  original: string;
  enhanced: string;
  confidence: number;
  model: string;
  analysis: AnalysisResult;
}

/**
 * Enhances a vague prompt using rule-based improvements
 * Produces actual enhanced prompts, not meta-descriptions
 */
export async function enhancePrompt(prompt: string): Promise<EnhancementResult> {
  const analysis = analyzePrompt(prompt);

  // If prompt is already specific enough, return as-is
  if (analysis.score < 30) {
    return {
      original: prompt,
      enhanced: prompt,
      confidence: 0.9,
      model: 'rule-based',
      analysis,
    };
  }

  // Build an actually enhanced prompt
  const parts: string[] = [];
  const trimmed = prompt.trim();

  // Add the base request
  parts.push(trimmed);

  // Add specific questions based on issues
  const questions: string[] = [];

  if (analysis.hasVagueVerb) {
    questions.push('What are the specific requirements?');
    questions.push('What should the end result look like?');
  }

  if (analysis.hasMissingContext) {
    questions.push('What technology/framework should be used?');
    questions.push('What file or component should this be in?');
  }

  if (analysis.hasUnclearScope) {
    questions.push('What features should be included?');
    questions.push('What are the constraints or limitations?');
  }

  // Format as a proper prompt with follow-up questions
  let enhanced: string;
  if (questions.length > 0) {
    enhanced = `${trimmed}\n\nPlease clarify:\n${questions.map((q) => `- ${q}`).join('\n')}`;
  } else {
    enhanced = trimmed;
  }

  return {
    original: prompt,
    enhanced,
    confidence: analysis.score > 60 ? 0.7 : 0.5,
    model: 'rule-based',
    analysis,
  };
}
