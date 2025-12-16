/**
 * Prompt Analyzer - Detects vagueness in user prompts
 * Shared module used by both VS Code extension and MCP server
 * Performance requirement: < 100ms for analysis
 */

import {
  VAGUE_VERBS,
  LEARNING_VERBS,
  CONTEXT_PATTERNS,
  BROAD_TERMS,
} from './patterns';
import {
  SCORE_WEIGHTS,
  LENGTH_THRESHOLDS,
  SPECIFICITY_OFFSET_MULTIPLIER,
  SPECIFICITY_HIGH_VALUE_MAX,
  SPECIFICITY_HIGH_VALUE_POINTS,
  SPECIFICITY_MEDIUM_VALUE_MAX,
  SPECIFICITY_MEDIUM_VALUE_POINTS,
  SPECIFICITY_LOW_VALUE_MAX,
  SPECIFICITY_LOW_VALUE_POINTS,
  SPECIFICITY_REQUIREMENTS_MAX,
  SPECIFICITY_REQUIREMENTS_POINTS,
  SPECIFICITY_LENGTH_BONUS_MAX,
  SPECIFICITY_LENGTH_BONUS_DIVISOR,
  MAX_VAGUENESS_SCORE,
} from './constants';

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
  score: number; // 0-100, higher = more vague
  issues: VaguenessIssue[];
  hasVagueVerb: boolean;
  hasMissingContext: boolean;
  hasUnclearScope: boolean;
  specificityScore: number; // 0-100, higher = more specific (NEW in v1.6.0)
}

// ============================================================================
// SPECIFICITY SCORING (NEW in v1.6.0)
// Measures how detailed/specific a prompt is, offsetting vague verb penalties
// ============================================================================

/**
 * Technical terms that indicate specificity (weighted by importance)
 */
const SPECIFICITY_PATTERNS = {
  // High value (15 points each) - Very specific technical details
  filePaths: [
    /\b(?:src|lib|app|components?|pages?|utils?|services?|api)\/[\w/.]+/i, // src/auth/login.ts
    /[\w/]+\.(ts|js|tsx|jsx|py|java|cpp|go|rs|rb|php|cs|swift|kt)/i, // filename.ext
    /\bline\s+\d+/i, // line 42
  ],
  httpMethods: [
    /\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\/[\w/]+/i, // POST /api/users
    /\b(GET|POST|PUT|DELETE|PATCH)\b/, // HTTP method alone
  ],
  codeReferences: [
    /\b\w+\(\)\s*(function|method)?/i, // handleSubmit() function
    /\b(function|method|class|interface|type|enum)\s+\w+/i, // function validateUser
    /\basync\/await\b|\basync\s+function\b/i, // async patterns
  ],

  // Medium value (10 points each) - Technical concepts
  authTerms: [/\b(jwt|oauth2?|authentication|authorization|bcrypt|hash|token|session|cookie|passport)\b/i],
  databaseTerms: [/\b(sql|nosql|mongodb|postgres|mysql|redis|query|schema|migration|orm|prisma|sequelize)\b/i],
  frameworkTerms: [
    /\b(react|vue|angular|svelte|next\.?js|nuxt|express|fastify|nest\.?js|django|flask|fastapi|spring|rails)\b/i,
  ],
  testingTerms: [/\b(jest|mocha|pytest|junit|test|spec|mock|stub|coverage|tdd|unit\s+test|e2e)\b/i],
  errorTerms: [
    /\b(error|exception|bug|null|undefined|crash|fail|broken)\b/i,
    /\b(NullPointer|TypeError|ReferenceError|SyntaxError)\w*/i,
  ],

  // Lower value (5 points each) - General technical terms
  generalTech: [
    /\b(api|endpoint|route|middleware|controller|service|repository|model|view)\b/i,
    /\b(component|hook|state|props|context|reducer|store)\b/i,
    /\b(validation|sanitization|rate\s*limit|caching|logging|monitoring)\b/i,
    /\b(docker|kubernetes|ci\/cd|deploy|build|compile)\b/i,
  ],

  // Requirements/constraints (8 points each) - Shows clear thinking
  requirements: [
    /\bwith\s+\w+(?:\s*,\s*\w+)+(?:\s*,?\s*and\s+\w+)?/i, // "with X, Y, and Z"
    /\b(must|should|needs?\s+to|requires?|accepts?|returns?|validates?)\b/i, // requirement language
    /\b(input|output|parameter|argument|return\s+type)\b/i, // I/O specs
  ],
} as const;

/**
 * Calculates how specific/detailed a prompt is
 * @param prompt The user's input prompt
 * @returns Score 0-100, higher = more specific
 */
export function calculateSpecificityScore(prompt: string): number {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return 0;
  }

  let score = 0;
  const lowerPrompt = trimmed.toLowerCase();
  const words = lowerPrompt.split(/\s+/);

  // High value patterns (file paths, HTTP methods, code references)
  let highValueHits = 0;
  for (const pattern of SPECIFICITY_PATTERNS.filePaths) {
    if (pattern.test(trimmed)) highValueHits++;
  }
  for (const pattern of SPECIFICITY_PATTERNS.httpMethods) {
    if (pattern.test(trimmed)) highValueHits++;
  }
  for (const pattern of SPECIFICITY_PATTERNS.codeReferences) {
    if (pattern.test(trimmed)) highValueHits++;
  }
  score += Math.min(highValueHits * SPECIFICITY_HIGH_VALUE_POINTS, SPECIFICITY_HIGH_VALUE_MAX);

  // Medium value patterns (auth, database, framework, testing, error terms)
  let mediumValueHits = 0;
  for (const pattern of SPECIFICITY_PATTERNS.authTerms) {
    if (pattern.test(trimmed)) mediumValueHits++;
  }
  for (const pattern of SPECIFICITY_PATTERNS.databaseTerms) {
    if (pattern.test(trimmed)) mediumValueHits++;
  }
  for (const pattern of SPECIFICITY_PATTERNS.frameworkTerms) {
    if (pattern.test(trimmed)) mediumValueHits++;
  }
  for (const pattern of SPECIFICITY_PATTERNS.testingTerms) {
    if (pattern.test(trimmed)) mediumValueHits++;
  }
  for (const pattern of SPECIFICITY_PATTERNS.errorTerms) {
    if (pattern.test(trimmed)) mediumValueHits++;
  }
  score += Math.min(mediumValueHits * SPECIFICITY_MEDIUM_VALUE_POINTS, SPECIFICITY_MEDIUM_VALUE_MAX);

  // Lower value patterns (general technical terms)
  let lowValueHits = 0;
  for (const pattern of SPECIFICITY_PATTERNS.generalTech) {
    if (pattern.test(trimmed)) lowValueHits++;
  }
  score += Math.min(lowValueHits * SPECIFICITY_LOW_VALUE_POINTS, SPECIFICITY_LOW_VALUE_MAX);

  // Requirements/constraints patterns
  let requirementHits = 0;
  for (const pattern of SPECIFICITY_PATTERNS.requirements) {
    if (pattern.test(trimmed)) requirementHits++;
  }
  score += Math.min(requirementHits * SPECIFICITY_REQUIREMENTS_POINTS, SPECIFICITY_REQUIREMENTS_MAX);

  // Bonus for longer, detailed prompts
  // More words generally means more context
  const lengthBonus = Math.min(Math.floor(words.length / SPECIFICITY_LENGTH_BONUS_DIVISOR) * 2, SPECIFICITY_LENGTH_BONUS_MAX);
  score += lengthBonus;

  // Cap at 100
  return Math.min(score, 100);
}

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
      specificityScore: 0,
    };
  }

  // Calculate specificity score first (NEW in v1.6.0)
  const specificityScore = calculateSpecificityScore(trimmed);

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

  // Check 1b: Learning/explanation verbs
  // Only penalize if the learning request ALSO lacks context
  // "Explain the error on line 42 of auth.ts" is specific and shouldn't be penalized
  const hasLearningVerb = LEARNING_VERBS.some((verb) => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    return regex.test(trimmed);
  });

  // Only flag learning verbs if they lack context patterns
  const hasContext = CONTEXT_PATTERNS.some((pattern) => pattern.test(trimmed));
  const learningVerbNeedsHelp = hasLearningVerb && !hasContext && words.length < LENGTH_THRESHOLDS.CONTEXT_NEEDED;

  if (learningVerbNeedsHelp) {
    issues.push({
      type: IssueType.UNCLEAR_SCOPE,
      severity: IssueSeverity.MEDIUM,
      description: 'Learning/explanation request lacks structure or learning objectives',
      suggestion: 'Specify: What aspects? How deep? What format? Examples needed? Prerequisites?',
    });
  }

  // Check 2: Missing context (weight: 35 points)
  // Note: hasContext was already computed above for learning verb check
  const hasMissingContext = !hasContext && words.length < LENGTH_THRESHOLDS.CONTEXT_NEEDED;

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

  const isVeryShort = words.length < LENGTH_THRESHOLDS.SHORT;
  const lacksRequirements = !trimmed.includes('?') && !hasSpecificDetails(trimmed);
  const hasBroadScope = hasBroadTerms && (isVeryShort || lacksRequirements);

  if (hasBroadScope) {
    issues.push({
      type: IssueType.UNCLEAR_SCOPE,
      severity: IssueSeverity.MEDIUM,
      description: 'Request is too broad without clear requirements or constraints',
      suggestion: 'Define: What features? What technologies? Success criteria? Constraints?',
    });
  }

  // hasUnclearScope is true if either learning verb needs help OR broad scope detected
  const hasUnclearScope = learningVerbNeedsHelp || hasBroadScope;

  // Calculate raw vagueness score (0-100)
  let rawScore = 0;

  if (hasVagueVerb) {
    rawScore += SCORE_WEIGHTS.VAGUE_VERB;
  }

  if (learningVerbNeedsHelp) {
    rawScore += SCORE_WEIGHTS.LEARNING_VERB;
  }

  if (hasMissingContext) {
    rawScore += SCORE_WEIGHTS.MISSING_CONTEXT;
  }

  if (hasBroadScope) {
    rawScore += SCORE_WEIGHTS.BROAD_SCOPE;
  }

  // Adjust for very short prompts
  if (words.length <= LENGTH_THRESHOLDS.VERY_SHORT) {
    rawScore = Math.min(MAX_VAGUENESS_SCORE, rawScore + SCORE_WEIGHTS.VERY_SHORT_BONUS);
  }

  // Apply specificity offset (v1.6.0)
  // High specificity should reduce vagueness score significantly
  // Formula: final = max(0, rawScore - (specificityScore * SPECIFICITY_OFFSET_MULTIPLIER))
  // With default multiplier of 0.8, a specificityScore of 50+ can eliminate most vague verb penalties
  const specificityOffset = Math.floor(specificityScore * SPECIFICITY_OFFSET_MULTIPLIER);
  let score = Math.max(0, rawScore - specificityOffset);

  // Cap at maximum score
  score = Math.min(MAX_VAGUENESS_SCORE, score);

  return {
    score,
    issues,
    hasVagueVerb,
    hasMissingContext,
    hasUnclearScope,
    specificityScore,
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

