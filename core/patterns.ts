/**
 * Shared pattern definitions for prompt analysis
 * Single source of truth for tech terms, frameworks, vague words, etc.
 *
 * Used by:
 * - core/analyzer.ts (vagueness analysis)
 * - src/rewriter/qualityAnalyzer.ts (enhancement quality)
 */

// ============================================================================
// FRAMEWORKS & LANGUAGES
// ============================================================================

/**
 * Web frameworks and backend frameworks
 */
export const FRAMEWORKS = [
  'react',
  'vue',
  'angular',
  'svelte',
  'next',
  'nuxt',
  'express',
  'nest',
  'fastify',
  'django',
  'flask',
  'fastapi',
  'spring',
  'rails',
  'laravel',
] as const;

/**
 * Programming languages
 */
export const LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'java',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'c#',
  'cpp',
  'node',
] as const;

/**
 * Combined pattern for framework/language detection
 */
export const FRAMEWORK_PATTERN = new RegExp(`\\b(${[...FRAMEWORKS, ...LANGUAGES].join('|')})\\b`, 'gi');

// ============================================================================
// VAGUE TERMS
// ============================================================================

/**
 * Vague verbs that indicate unclear intent
 * These always need more specificity
 */
export const VAGUE_VERBS = ['make', 'create', 'do', 'fix', 'help', 'change', 'update', 'build'] as const;

/**
 * Learning/explanation verbs that need learning objectives
 * Even with a topic, they need structure (what aspects? how deep? what format?)
 */
export const LEARNING_VERBS = ['show', 'tell', 'teach', 'explain', 'learn', 'understand'] as const;

/**
 * Vague/hedging words that reduce clarity
 */
export const VAGUE_WORDS = [
  'maybe',
  'perhaps',
  'might',
  'could',
  'possibly',
  'somehow',
  'something',
  'stuff',
  'things',
  'probably',
  'sometimes',
  'usually',
  'generally',
  'basically',
  'actually',
  'really',
  'quite',
  'rather',
  'somewhat',
] as const;

/**
 * Overly broad terms that indicate unclear scope
 */
export const BROAD_TERMS = ['website', 'app', 'application', 'system', 'project', 'api', 'database'] as const;

/**
 * Pattern to detect vague words
 */
export const VAGUE_WORDS_PATTERN = new RegExp(`\\b(${VAGUE_WORDS.join('|')})\\b`, 'gi');

// ============================================================================
// CONTEXT PATTERNS
// ============================================================================

/**
 * Patterns that indicate specific context is present
 */
export const CONTEXT_PATTERNS = [
  /in\s+[\w/.]+/i, // "in src/file.ts"
  /file:\s*[\w/.]+/i, // "file: app.js"
  /[\w/]+\.(ts|js|tsx|jsx|py|java|cpp|go)/i, // filename.ext
  /\b(react|vue|angular|node|python|java|typescript|javascript)\b/i, // Specific technologies
  /\b(authentication|database|api|component|function|class|interface)\b/i, // Technical terms
  /\b(security\+|comptia|aws|azure|certification|exam)\b/i, // Learning/certification topics
  /[\w\s]+(fundamentals|basics|advanced|tutorial|guide|concepts)/i, // Learning context
];

// ============================================================================
// TECHNICAL TERMS
// ============================================================================

/**
 * Essential action verbs for development tasks
 */
export const ACTION_VERBS = [
  // Core development actions
  'implement',
  'create',
  'build',
  'add',
  'fix',
  'refactor',
  'update',
  'remove',
  'delete',
  'configure',
  'migrate',
  'optimize',
  'debug',
  'test',
  'write',
  'display',
  'render',
  'fetch',
  'validate',
  'handle',
  'integrate',
  'deploy',
  'install',
  'setup',
  'design',
  'define',
  'check',
  'ensure',
  'verify',
  // Data operations
  'connect',
  'send',
  'receive',
  'process',
  'transform',
  'convert',
  'parse',
  'format',
  'encode',
  'decode',
  'encrypt',
  'decrypt',
  'authenticate',
  'authorize',
  // Flow control
  'cache',
  'log',
  'track',
  'monitor',
  'search',
  'filter',
  'sort',
  'merge',
  'split',
  // Lifecycle
  'initialize',
  'load',
  'start',
  'stop',
  'enable',
  'disable',
  'show',
  'hide',
  'toggle',
] as const;

/**
 * Essential technical objects/nouns
 */
export const TECH_OBJECTS = [
  // UI elements
  'form',
  'button',
  'component',
  'modal',
  'dialog',
  'table',
  'list',
  'card',
  'menu',
  'header',
  'footer',
  'input',
  'field',
  'panel',
  'grid',
  'layout',
  'view',
  'screen',
  'dashboard',
  // Data concepts
  'user',
  'admin',
  'role',
  'permission',
  'session',
  'token',
  'cookie',
  'cache',
  'storage',
  'database',
  'api',
  'endpoint',
  'route',
  'path',
  'url',
  'query',
  'request',
  'response',
  'error',
  'message',
  // Code concepts
  'event',
  'callback',
  'promise',
  'hook',
  'state',
  'prop',
  'context',
  'reducer',
  'action',
  'store',
  'middleware',
  'plugin',
  'module',
  'package',
  'service',
  'controller',
  'model',
  'schema',
  'interface',
  'class',
  'function',
  'method',
  'type',
  // Common task targets
  'bug',
  'issue',
  'feature',
  'test',
  'config',
  'setting',
  'authentication',
  'authorization',
  'security',
  'validation',
] as const;

// ============================================================================
// STOP WORDS
// ============================================================================

/**
 * Common words to ignore when measuring relevance
 */
export const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'dare',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'up',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
  'and',
  'but',
  'or',
  'nor',
  'so',
  'yet',
  'both',
  'either',
  'neither',
  'not',
  'only',
  'same',
  'than',
  'too',
  'very',
  'just',
  'also',
  'make',
  'create',
  'do',
  'fix',
  'help',
  'change',
  'update',
  'build',
  'it',
  'this',
  'that',
  'these',
  'those',
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
  'what',
  'which',
  'who',
  'whom',
  'whose',
  'i',
  'me',
  'we',
  'us',
  'you',
  'he',
  'she',
  'they',
  'them',
]);
