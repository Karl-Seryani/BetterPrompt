/**
 * Prompt Analysis and Enhancement Engine
 * Reused from the main VS Code extension
 */

export enum IssueType {
  VAGUE_VERB = 'VAGUE_VERB',
  MISSING_CONTEXT = 'MISSING_CONTEXT',
  UNCLEAR_SCOPE = 'UNCLEAR_SCOPE',
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface VaguenessIssue {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  suggestion: string;
}

export interface AnalysisResult {
  score: number;
  issues: VaguenessIssue[];
  hasVagueVerb: boolean;
  hasMissingContext: boolean;
  hasUnclearScope: boolean;
}

export interface EnhancementResult {
  original: string;
  enhanced: string;
  confidence: number;
  model: string;
  analysis: AnalysisResult;
}

const VAGUE_VERBS = ['make', 'create', 'do', 'fix', 'help', 'change', 'update', 'build'];
const LEARNING_VERBS = ['show', 'tell', 'teach', 'explain', 'learn', 'understand'];
const CONTEXT_PATTERNS = [
  /in\s+[\w/.]+/i,
  /file:\s*[\w/.]+/i,
  /[\w/]+\.(ts|js|tsx|jsx|py|java|cpp|go)/i,
  /\b(react|vue|angular|node|python|java|typescript|javascript)\b/i,
  /\b(authentication|database|api|component|function|class|interface)\b/i,
  /\b(security\+|comptia|aws|azure|certification|exam)\b/i,
  /[\w\s]+(fundamentals|basics|advanced|tutorial|guide|concepts)/i,
];
const BROAD_TERMS = ['website', 'app', 'application', 'system', 'project', 'api', 'database'];

/**
 * Analyzes a prompt for vagueness
 */
export function analyzePrompt(prompt: string): AnalysisResult {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return {
      score: 100,
      issues: [
        {
          type: IssueType.MISSING_CONTEXT,
          severity: IssueSeverity.HIGH,
          description: 'Prompt is empty',
          suggestion: 'Please describe what you need help with',
        },
      ],
      hasVagueVerb: false,
      hasMissingContext: true,
      hasUnclearScope: false,
    };
  }

  const issues: VaguenessIssue[] = [];
  const lowerPrompt = trimmed.toLowerCase();
  const words = lowerPrompt.split(/\s+/);

  // Check for vague verbs
  const hasVagueVerb = VAGUE_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(trimmed));
  if (hasVagueVerb) {
    issues.push({
      type: IssueType.VAGUE_VERB,
      severity: IssueSeverity.MEDIUM,
      description: 'Prompt uses vague action verbs like "make", "fix", "do"',
      suggestion: 'Use specific verbs: implement, refactor, debug, optimize, design',
    });
  }

  // Check for learning verbs
  const hasLearningVerb = LEARNING_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(trimmed));
  if (hasLearningVerb) {
    issues.push({
      type: IssueType.UNCLEAR_SCOPE,
      severity: IssueSeverity.MEDIUM,
      description: 'Learning/explanation request lacks structure or learning objectives',
      suggestion: 'Specify: What aspects? How deep? What format? Examples needed? Prerequisites?',
    });
  }

  // Check for missing context
  const hasContext = CONTEXT_PATTERNS.some((pattern) => pattern.test(trimmed));
  const hasMissingContext = !hasContext && words.length < 20;
  if (hasMissingContext) {
    issues.push({
      type: IssueType.MISSING_CONTEXT,
      severity: IssueSeverity.MEDIUM,
      description: 'Prompt lacks specific context (file paths, code references, project details)',
      suggestion: 'Specify: Which file? Which function? What technology stack? Current code?',
    });
  }

  // Check for unclear scope
  const hasBroadTerms = BROAD_TERMS.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(trimmed));
  const isVeryShort = words.length < 5;
  const hasUnclearScope = hasBroadTerms && (isVeryShort || !hasSpecificDetails(trimmed));
  if (hasUnclearScope) {
    issues.push({
      type: IssueType.UNCLEAR_SCOPE,
      severity: IssueSeverity.MEDIUM,
      description: 'Request is too broad without clear requirements or constraints',
      suggestion: 'Define: What features? What technologies? Success criteria? Constraints?',
    });
  }

  // Calculate score
  let score = 0;
  if (hasVagueVerb) score += 30;
  if (hasLearningVerb) score += 25;
  if (hasMissingContext) score += 35;
  if (hasUnclearScope) score += 35;
  if (words.length <= 2) score += 20;
  score = Math.min(100, score);

  return {
    score,
    issues,
    hasVagueVerb,
    hasMissingContext,
    hasUnclearScope,
  };
}

function hasSpecificDetails(prompt: string): boolean {
  const detailIndicators = [
    /\b(function|class|method|endpoint|route|component)\b/i,
    /\b(POST|GET|PUT|DELETE|PATCH)\b/,
    /\b(async|await|promise|callback)\b/i,
    /\b(jwt|auth|token|session|cookie)\b/i,
    /\b(database|sql|query|table|schema)\b/i,
    /\{[^}]+\}/,
  ];
  return detailIndicators.some((pattern) => pattern.test(prompt));
}

/**
 * Enhances a vague prompt using AI-powered rules and templates
 * Note: This is a simplified version for the MCP server
 * For full AI enhancement, the VS Code extension uses Groq/GPT-4/Claude
 */
export async function enhancePrompt(
  prompt: string,
  userLevel: 'auto' | 'beginner' | 'developer' = 'auto'
): Promise<EnhancementResult> {
  const analysis = analyzePrompt(prompt);

  // For MCP server, we'll use rule-based enhancement
  // Claude Code will call this tool, then use the enhanced prompt with its own AI
  let enhanced = prompt;

  // Add context based on detected issues
  const enhancements: string[] = [];

  if (analysis.hasVagueVerb) {
    if (userLevel === 'developer') {
      enhancements.push('following TDD principles and best practices');
    } else if (userLevel === 'beginner') {
      enhancements.push('with step-by-step instructions');
    }
  }

  if (analysis.hasMissingContext) {
    enhancements.push('specifying the technology stack and file structure');
  }

  if (analysis.hasUnclearScope) {
    enhancements.push('defining clear requirements and success criteria');
  }

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
