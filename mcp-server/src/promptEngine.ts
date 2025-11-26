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
} from '../../core/analyzer.js';

// Import for local use
import { analyzePrompt, type AnalysisResult } from '../../core/analyzer.js';

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
 * Note: This is a simplified version for the MCP server
 * For full AI enhancement, the VS Code extension uses Groq/Copilot
 */
export async function enhancePrompt(prompt: string): Promise<EnhancementResult> {
  const analysis = analyzePrompt(prompt);

  // Rule-based enhancement based on detected issues
  const enhancements: string[] = [];

  if (analysis.hasVagueVerb) {
    enhancements.push('with specific requirements and acceptance criteria');
  }

  if (analysis.hasMissingContext) {
    enhancements.push('specifying the technology stack and environment');
  }

  if (analysis.hasUnclearScope) {
    enhancements.push('defining clear boundaries and success criteria');
  }

  let enhanced = prompt;
  if (enhancements.length > 0) {
    enhanced = `${prompt} - ${enhancements.join(', ')}`;
  }

  return {
    original: prompt,
    enhanced,
    confidence: analysis.score > 60 ? 0.7 : 0.5,
    model: 'rule-based',
    analysis,
  };
}
