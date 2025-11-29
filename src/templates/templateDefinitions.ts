/**
 * Prompt Template Definitions
 * Pre-built templates for common coding tasks
 * No AI needed - instant, structured prompts
 */

/**
 * Categories for organizing templates
 */
export type TemplateCategory = 'debug' | 'create' | 'improve' | 'learn' | 'test';

/**
 * Auto-fill hints that map to context values
 */
export type AutoFillHint =
  | 'currentFile' // Current file path
  | 'firstError' // First error message from diagnostics
  | 'selectedCode' // Currently selected code
  | 'detectedFramework' // Detected framework from tech stack
  | 'detectedLanguage'; // Detected language

/**
 * A placeholder in a template that needs to be filled
 */
export interface TemplatePlaceholder {
  /** Unique ID matching {{id}} in template string */
  id: string;
  /** Human-readable label */
  label: string;
  /** Hint text for user */
  hint?: string;
  /** Auto-fill from context if available */
  autoFill?: AutoFillHint;
  /** Whether this field is required */
  required?: boolean;
}

/**
 * A prompt template definition
 */
export interface PromptTemplate {
  /** Unique template ID */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Category for grouping */
  category: TemplateCategory;
  /** The template string with {{placeholder}} syntax */
  template: string;
  /** Placeholder definitions */
  placeholders: TemplatePlaceholder[];
}

/**
 * All available prompt templates
 */
export const TEMPLATES: PromptTemplate[] = [
  // ==================== DEBUG ====================
  {
    id: 'fix-bug',
    name: 'Fix Bug',
    description: 'Fix an error or bug with full context',
    category: 'debug',
    template: `Fix the {{errorType}} in {{filePath}}.

Error message: {{errorMessage}}

Expected behavior: {{expectedBehavior}}
Current behavior: {{currentBehavior}}`,
    placeholders: [
      {
        id: 'errorType',
        label: 'Error type',
        hint: 'e.g., TypeError, null reference, crash',
        required: true,
      },
      {
        id: 'filePath',
        label: 'File path',
        hint: 'e.g., src/auth/login.ts',
        autoFill: 'currentFile',
        required: true,
      },
      {
        id: 'errorMessage',
        label: 'Error message',
        hint: 'The exact error message',
        autoFill: 'firstError',
        required: true,
      },
      {
        id: 'expectedBehavior',
        label: 'Expected behavior',
        hint: 'What should happen',
        required: true,
      },
      {
        id: 'currentBehavior',
        label: 'Current behavior',
        hint: 'What actually happens',
        required: true,
      },
    ],
  },
  {
    id: 'debug-issue',
    name: 'Debug Issue',
    description: 'Investigate why something is not working',
    category: 'debug',
    template: `Debug why {{symptom}} in {{filePath}}.

Steps to reproduce:
{{stepsToReproduce}}

What I've tried: {{attemptedFixes}}`,
    placeholders: [
      {
        id: 'symptom',
        label: 'Symptom',
        hint: 'What is going wrong',
        required: true,
      },
      {
        id: 'filePath',
        label: 'File path',
        autoFill: 'currentFile',
        required: true,
      },
      {
        id: 'stepsToReproduce',
        label: 'Steps to reproduce',
        hint: '1. Do X, 2. Click Y, 3. See error',
        required: true,
      },
      {
        id: 'attemptedFixes',
        label: 'What you tried',
        hint: 'Solutions you already attempted',
        required: false,
      },
    ],
  },

  // ==================== CREATE ====================
  {
    id: 'add-feature',
    name: 'Add Feature',
    description: 'Add a new feature to the codebase',
    category: 'create',
    template: `Add {{featureName}} to {{location}}.

Requirements:
{{requirements}}

Tech stack: {{framework}}

Constraints: {{constraints}}`,
    placeholders: [
      {
        id: 'featureName',
        label: 'Feature name',
        hint: 'e.g., dark mode toggle, user search',
        required: true,
      },
      {
        id: 'location',
        label: 'Location',
        hint: 'Where to add it (file, component, module)',
        autoFill: 'currentFile',
        required: true,
      },
      {
        id: 'requirements',
        label: 'Requirements',
        hint: 'What should it do? List features',
        required: true,
      },
      {
        id: 'framework',
        label: 'Framework/Stack',
        hint: 'e.g., React, Express, Django',
        autoFill: 'detectedFramework',
        required: false,
      },
      {
        id: 'constraints',
        label: 'Constraints',
        hint: 'e.g., must be accessible, no external deps',
        required: false,
      },
    ],
  },
  {
    id: 'api-endpoint',
    name: 'Create API Endpoint',
    description: 'Create a REST API endpoint',
    category: 'create',
    template: `Create a {{httpMethod}} {{endpointPath}} endpoint.

Purpose: {{purpose}}

Request body: {{requestBody}}
Response: {{responseFormat}}

Authentication: {{authRequired}}`,
    placeholders: [
      {
        id: 'httpMethod',
        label: 'HTTP Method',
        hint: 'GET, POST, PUT, DELETE, PATCH',
        required: true,
      },
      {
        id: 'endpointPath',
        label: 'Endpoint path',
        hint: 'e.g., /api/users/:id',
        required: true,
      },
      {
        id: 'purpose',
        label: 'Purpose',
        hint: 'What this endpoint does',
        required: true,
      },
      {
        id: 'requestBody',
        label: 'Request body',
        hint: 'Expected input format',
        required: false,
      },
      {
        id: 'responseFormat',
        label: 'Response format',
        hint: 'What it returns',
        required: true,
      },
      {
        id: 'authRequired',
        label: 'Auth required?',
        hint: 'yes/no, what type',
        required: false,
      },
    ],
  },
  {
    id: 'create-component',
    name: 'Create Component',
    description: 'Create a UI component',
    category: 'create',
    template: `Create a {{componentName}} component in {{framework}}.

Props: {{props}}
Behavior: {{behavior}}
Styling: {{styling}}`,
    placeholders: [
      {
        id: 'componentName',
        label: 'Component name',
        hint: 'e.g., UserCard, SearchBar',
        required: true,
      },
      {
        id: 'framework',
        label: 'Framework',
        hint: 'React, Vue, Svelte, etc.',
        autoFill: 'detectedFramework',
        required: true,
      },
      {
        id: 'props',
        label: 'Props',
        hint: 'What data it receives',
        required: true,
      },
      {
        id: 'behavior',
        label: 'Behavior',
        hint: 'What it does, interactions',
        required: true,
      },
      {
        id: 'styling',
        label: 'Styling approach',
        hint: 'CSS modules, Tailwind, styled-components',
        required: false,
      },
    ],
  },

  // ==================== IMPROVE ====================
  {
    id: 'refactor',
    name: 'Refactor Code',
    description: 'Refactor code for better quality',
    category: 'improve',
    template: `Refactor {{targetCode}} in {{filePath}}.

Goal: {{improvement}}

Keep: {{constraints}}`,
    placeholders: [
      {
        id: 'targetCode',
        label: 'Target code',
        hint: 'Function name, class, or description',
        autoFill: 'selectedCode',
        required: true,
      },
      {
        id: 'filePath',
        label: 'File path',
        autoFill: 'currentFile',
        required: true,
      },
      {
        id: 'improvement',
        label: 'Improvement goal',
        hint: 'e.g., reduce complexity, improve readability',
        required: true,
      },
      {
        id: 'constraints',
        label: 'Constraints',
        hint: 'What must stay the same (API, behavior)',
        required: false,
      },
    ],
  },
  {
    id: 'optimize',
    name: 'Optimize Performance',
    description: 'Optimize code for better performance',
    category: 'improve',
    template: `Optimize {{targetCode}} in {{filePath}} for {{optimizationGoal}}.

Current issue: {{currentIssue}}
Acceptable tradeoffs: {{tradeoffs}}`,
    placeholders: [
      {
        id: 'targetCode',
        label: 'Target code',
        autoFill: 'selectedCode',
        required: true,
      },
      {
        id: 'filePath',
        label: 'File path',
        autoFill: 'currentFile',
        required: true,
      },
      {
        id: 'optimizationGoal',
        label: 'Optimization goal',
        hint: 'speed, memory, bundle size',
        required: true,
      },
      {
        id: 'currentIssue',
        label: 'Current issue',
        hint: 'What is slow/heavy',
        required: true,
      },
      {
        id: 'tradeoffs',
        label: 'Acceptable tradeoffs',
        hint: 'e.g., can increase complexity',
        required: false,
      },
    ],
  },

  // ==================== LEARN ====================
  {
    id: 'explain',
    name: 'Explain Code',
    description: 'Explain how code works',
    category: 'learn',
    template: `Explain how {{targetCode}} works in {{filePath}}.

Focus on: {{focusArea}}
My level: {{experienceLevel}}`,
    placeholders: [
      {
        id: 'targetCode',
        label: 'Target code',
        hint: 'Function, class, or paste code',
        autoFill: 'selectedCode',
        required: true,
      },
      {
        id: 'filePath',
        label: 'File path',
        autoFill: 'currentFile',
        required: false,
      },
      {
        id: 'focusArea',
        label: 'Focus area',
        hint: 'e.g., the algorithm, data flow, error handling',
        required: false,
      },
      {
        id: 'experienceLevel',
        label: 'Your level',
        hint: 'beginner, intermediate, advanced',
        required: false,
      },
    ],
  },
  {
    id: 'review',
    name: 'Code Review',
    description: 'Review code for issues and improvements',
    category: 'learn',
    template: `Review {{targetCode}} in {{filePath}}.

Check for:
- {{reviewFocus}}

Context: {{context}}`,
    placeholders: [
      {
        id: 'targetCode',
        label: 'Target code',
        autoFill: 'selectedCode',
        required: true,
      },
      {
        id: 'filePath',
        label: 'File path',
        autoFill: 'currentFile',
        required: true,
      },
      {
        id: 'reviewFocus',
        label: 'Review focus',
        hint: 'bugs, security, performance, style',
        required: true,
      },
      {
        id: 'context',
        label: 'Context',
        hint: 'What this code does, why it exists',
        required: false,
      },
    ],
  },

  // ==================== TEST ====================
  {
    id: 'write-test',
    name: 'Write Tests',
    description: 'Write unit or integration tests',
    category: 'test',
    template: `Write tests for {{targetFunction}} in {{filePath}}.

Test cases:
{{testCases}}

Testing framework: {{testFramework}}`,
    placeholders: [
      {
        id: 'targetFunction',
        label: 'Target function/component',
        hint: 'What to test',
        autoFill: 'selectedCode',
        required: true,
      },
      {
        id: 'filePath',
        label: 'File path',
        autoFill: 'currentFile',
        required: true,
      },
      {
        id: 'testCases',
        label: 'Test cases',
        hint: 'What scenarios to test',
        required: true,
      },
      {
        id: 'testFramework',
        label: 'Test framework',
        hint: 'Jest, Vitest, Mocha, pytest',
        required: false,
      },
    ],
  },
  {
    id: 'fix-test',
    name: 'Fix Failing Test',
    description: 'Fix a failing test',
    category: 'test',
    template: `Fix the failing test in {{testFilePath}}.

Test name: {{testName}}
Error: {{testError}}

The test expects: {{expectedOutcome}}`,
    placeholders: [
      {
        id: 'testFilePath',
        label: 'Test file path',
        autoFill: 'currentFile',
        required: true,
      },
      {
        id: 'testName',
        label: 'Test name',
        hint: 'The failing test description',
        required: true,
      },
      {
        id: 'testError',
        label: 'Error message',
        autoFill: 'firstError',
        required: true,
      },
      {
        id: 'expectedOutcome',
        label: 'Expected outcome',
        hint: 'What the test should verify',
        required: true,
      },
    ],
  },
];

/**
 * Get a template by ID
 */
export function getTemplate(id: string): PromptTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all templates
 */
export function getAllTemplates(): PromptTemplate[] {
  return [...TEMPLATES];
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): PromptTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}
