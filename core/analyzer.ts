/**
 * Prompt Analyzer - Detects vagueness in user prompts
 * Shared module used by both VS Code extension and MCP server
 * Performance requirement: < 100ms for analysis
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
  location?: {
    start: number;
    end: number;
  };
}

export interface AnalysisResult {
  score: number; // 0-100, higher = more vague
  issues: VaguenessIssue[];
  hasVagueVerb: boolean;
  hasMissingContext: boolean;
  hasUnclearScope: boolean;
}

/**
 * Vague verbs that indicate unclear intent
 * These always need more specificity
 */
const VAGUE_VERBS = ['make', 'create', 'do', 'fix', 'help', 'change', 'update', 'build'];

/**
 * Learning/explanation verbs that need learning objectives
 * Even with a topic, they need structure (what aspects? how deep? what format?)
 */
const LEARNING_VERBS = ['show', 'tell', 'teach', 'explain', 'learn', 'understand'];

/**
 * Patterns that indicate specific context is present
 */
const CONTEXT_PATTERNS = [
  /in\s+[\w/.]+/i, // "in src/file.ts"
  /file:\s*[\w/.]+/i, // "file: app.js"
  /[\w/]+\.(ts|js|tsx|jsx|py|java|cpp|go)/i, // filename.ext
  /\b(react|vue|angular|node|python|java|typescript|javascript)\b/i, // Specific technologies
  /\b(authentication|database|api|component|function|class|interface)\b/i, // Technical terms
  /\b(security\+|comptia|aws|azure|certification|exam)\b/i, // Learning/certification topics
  /[\w\s]+(fundamentals|basics|advanced|tutorial|guide|concepts)/i, // Learning context
];

/**
 * Overly broad terms that indicate unclear scope
 */
const BROAD_TERMS = ['website', 'app', 'application', 'system', 'project', 'api', 'database'];

/**
 * Analyzes a prompt for vagueness
 * @param prompt The user's input prompt
 * @returns Analysis result with score and issues
 */
export function analyzePrompt(prompt: string): AnalysisResult {
  // Handle edge cases
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

  // Check 1: Vague verbs (weight: 30 points)
  const hasVagueVerb = VAGUE_VERBS.some((verb) => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    return regex.test(trimmed);
  });

  if (hasVagueVerb) {
    issues.push({
      type: IssueType.VAGUE_VERB,
      severity: IssueSeverity.MEDIUM,
      description: 'Prompt uses vague action verbs like "make", "fix", "do"',
      suggestion: 'Use specific verbs: implement, refactor, debug, optimize, design',
    });
  }

  // Check 1b: Learning/explanation verbs (weight: 35 points)
  // Learning requests are inherently vague - you don't know what you don't know
  const hasLearningVerb = LEARNING_VERBS.some((verb) => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    return regex.test(trimmed);
  });

  if (hasLearningVerb) {
    issues.push({
      type: IssueType.UNCLEAR_SCOPE,
      severity: IssueSeverity.MEDIUM,
      description: 'Learning/explanation request lacks structure or learning objectives',
      suggestion: 'Specify: What aspects? How deep? What format? Examples needed? Prerequisites?',
    });
  }

  // Check 2: Missing context (weight: 35 points)
  const hasContext = CONTEXT_PATTERNS.some((pattern) => pattern.test(trimmed));
  const hasMissingContext = !hasContext && words.length < 20; // Short prompts without context

  if (hasMissingContext) {
    issues.push({
      type: IssueType.MISSING_CONTEXT,
      severity: IssueSeverity.MEDIUM,
      description: 'Prompt lacks specific context (file paths, code references, project details)',
      suggestion: 'Specify: Which file? Which function? What technology stack? Current code?',
    });
  }

  // Check 3: Unclear scope (weight: 35 points)
  const hasBroadTerms = BROAD_TERMS.some((term) => {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    return regex.test(trimmed);
  });

  const isVeryShort = words.length < 5;
  const lacksRequirements = !trimmed.includes('?') && !hasSpecificDetails(trimmed);
  const hasUnclearScope = hasBroadTerms && (isVeryShort || lacksRequirements);

  if (hasUnclearScope) {
    issues.push({
      type: IssueType.UNCLEAR_SCOPE,
      severity: IssueSeverity.MEDIUM,
      description: 'Request is too broad without clear requirements or constraints',
      suggestion: 'Define: What features? What technologies? Success criteria? Constraints?',
    });
  }

  // Calculate score (0-100)
  let score = 0;

  if (hasVagueVerb) {
    score += 30;
  }

  if (hasLearningVerb) {
    score += 35; // Learning requests should always trigger enhancement
  }

  if (hasMissingContext) {
    score += 35;
  }

  if (hasUnclearScope) {
    score += 35;
  }

  // Adjust for very short prompts
  if (words.length <= 2) {
    score = Math.min(100, score + 20);
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    score,
    issues,
    hasVagueVerb,
    hasMissingContext,
    hasUnclearScope,
  };
}

/**
 * Checks if prompt has specific technical details
 */
function hasSpecificDetails(prompt: string): boolean {
  const detailIndicators = [
    /\b(function|class|method|endpoint|route|component)\b/i,
    /\b(POST|GET|PUT|DELETE|PATCH)\b/, // HTTP methods
    /\b(async|await|promise|callback)\b/i, // Async patterns
    /\b(jwt|auth|token|session|cookie)\b/i, // Auth terms
    /\b(database|sql|query|table|schema)\b/i, // Database terms
    /\{[^}]+\}/, // Code snippets or placeholders
  ];

  return detailIndicators.some((pattern) => pattern.test(prompt));
}

