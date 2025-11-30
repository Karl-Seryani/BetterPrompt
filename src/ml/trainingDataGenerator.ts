/**
 * Training Data Generator using GitHub Copilot
 *
 * This module generates labeled training data for the ML vagueness classifier
 * by using GitHub Copilot to analyze and label prompts.
 *
 * Run via VS Code command: "BetterPrompt: Generate Training Data (Dev)"
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

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

export interface GenerationProgress {
  current: number;
  total: number;
  successful: number;
  failed: number;
}

export interface GenerationConfig {
  targetCount: number;
  batchSize: number;
  delayBetweenBatches: number; // ms
  outputPath: string;
}

const DEFAULT_CONFIG: GenerationConfig = {
  targetCount: 20000,
  batchSize: 20,
  delayBetweenBatches: 250, // 0.25 second between batches - aggressive but within limits
  outputPath: 'data/training/labeled-prompts.json',
};

// Valid intent categories for validation
const VALID_INTENT_CATEGORIES = ['build', 'fix', 'learn', 'improve', 'configure', 'unknown'] as const;

// ============================================================================
// PROMPT TEMPLATES (inline for simplicity)
// ============================================================================

const PROMPT_TEMPLATES = {
  vague: [
    // Ultra-vague (80-100)
    'fix it',
    'make it work',
    'help me',
    'do something',
    'this is broken',
    'not working',
    'why',
    'how',
    'explain',
    'change it',
    'update it',
    // Generic requests (60-80)
    'fix the bug',
    'create a website',
    'build an app',
    'make a login',
    'add authentication',
    'improve the code',
    'optimize performance',
    'refactor this',
    'clean up the code',
    'explain this',
    'show me how',
    'help with the error',
    'set up the project',
    'configure the environment',
    'write some tests',
    'add styling',
    'make it faster',
    'make it look better',
    'add a feature',
    'remove this',
    // Component-based vague
    'fix the {component}',
    'create a {component}',
    'build {component}',
    'make {component} work',
    'add {component}',
    'update the {component}',
    'improve {component}',
    '{component} is broken',
    'help with {component}',
  ],
  medium: [
    // Has topic but missing context (40-60)
    'fix the authentication bug',
    'create a REST API',
    'build a React component for forms',
    'add JWT authentication',
    'implement caching with Redis',
    'refactor the user service',
    'add error handling to the API',
    'create unit tests for {component}',
    'optimize the database queries',
    'add validation to the {component} form',
    'implement pagination for the list',
    'add dark mode to the settings',
    'create a modal component',
    'fix the memory leak in useEffect',
    'add rate limiting to the API',
    // More medium prompts
    'set up ESLint and Prettier',
    'add TypeScript to the project',
    'create a login form with validation',
    'implement search functionality',
    'add file upload feature',
    'create a user profile page',
    'build a shopping cart component',
    'add Google OAuth login',
    'implement password reset flow',
    'create a dashboard layout',
    'add real-time updates with WebSocket',
    'implement drag and drop',
    'add lazy loading for images',
    'create a notification system',
    'build a comment section',
    'add keyboard shortcuts',
    'implement undo/redo functionality',
    'create an admin panel',
    'add multi-language support',
    'implement data export to CSV',
    // Error-related medium
    'fix the CORS error',
    'resolve the 500 error on login',
    'debug the infinite loop',
    'fix the null pointer exception',
    'resolve the import error',
    // Framework-specific medium
    'add a new route in Next.js',
    'create a custom hook in React',
    'add middleware in Express',
    'set up Prisma with PostgreSQL',
    'configure Tailwind CSS',
    'add Redux to the app',
    'implement React Query for data fetching',
    'set up Jest testing',
    'configure Docker for the project',
    'add Storybook for components',
  ],
  specific: [
    // Very specific with file paths, line numbers, exact requirements (0-30)
    'Fix the TypeError in src/auth/login.ts on line 42 where the async function fails to await the database query',
    'Refactor the handleSubmit function in components/Form.tsx to use async/await instead of .then() chaining',
    'Add input validation to the email field using zod schema with regex pattern for valid emails',
    'Implement JWT refresh token rotation with 7-day expiry and secure httpOnly cookies',
    'Add rate limiting middleware to /api/auth/* routes with 100 requests per 15 minutes per IP',
    'Create a React hook useDebounce with configurable delay and cleanup on unmount',
    'Fix the race condition in UserContext where multiple API calls overwrite state',
    'Implement infinite scroll for comments with 20 items per page and loading skeleton',
    'Add WebSocket connection for real-time notifications with automatic reconnection',
    'Create GitHub Actions CI/CD pipeline with test, lint, build, and deploy stages',
    'Fix the TypeError "Cannot read property map of undefined" in ProductList.tsx line 23 when products array is empty',
    'Add a loading spinner to the fetchUsers function in src/api/users.ts that shows during the 2 second API call',
    'Implement optimistic updates for the toggleTodo function in TodoContext - update UI immediately then sync with server',
    'Create a custom useLocalStorage hook that syncs state with localStorage and handles JSON parsing errors',
    'Add form validation to RegisterForm.tsx requiring: email (valid format), password (min 8 chars, 1 number), username (3-20 chars)',
    'Fix memory leak in useEffect on line 45 of Dashboard.tsx - the interval is not cleared on unmount',
    'Implement virtualized list rendering for the 10000+ row data table in Reports.tsx using react-window',
    'Add retry logic with exponential backoff (3 retries, starting at 1s) to the API client in src/lib/api.ts',
    'Create error boundary component that catches React errors, logs to Sentry, and shows user-friendly fallback UI',
    'Implement dark mode toggle that persists preference in localStorage and respects system preference on first load',
    'Add Stripe integration for one-time payments with webhook handling for payment confirmation in /api/webhooks/stripe',
    'Fix the stale closure issue in useCallback on line 67 of SearchComponent.tsx where query state is outdated',
    'Implement server-side pagination for /api/products endpoint with limit, offset, sort, and filter query params',
    'Create a reusable Table component with sortable columns, row selection, and column resizing using @tanstack/react-table',
    'Add image optimization pipeline: resize to max 1200px, convert to WebP, generate srcset for responsive images',
    'Implement role-based access control middleware that checks user.role against route permissions in middleware.ts',
    'Fix the hydration mismatch error in Header.tsx caused by accessing window.localStorage during SSR',
    'Add comprehensive error handling to the checkout flow: validation errors, payment failures, inventory checks',
    'Create unit tests for the calculateDiscount function covering: percentage off, fixed amount, minimum purchase, max discount',
    'Implement cursor-based pagination for the infinite scroll in Feed.tsx using the createdAt field as cursor',
    // Context-specific with error messages
    'Fix error "Module not found: Cannot find module ./components/Button" - the file exists but the import path is wrong',
    'Resolve the "Warning: Each child in a list should have a unique key prop" in CommentList.tsx',
    'Fix the "Hydration failed because the initial UI does not match what was rendered on the server" in next.js app',
    'Debug why the useEffect dependency array warning suggests adding "user" but adding it causes infinite loop',
    'Fix the TypeScript error "Type string is not assignable to type number" on line 34 of api/handlers.ts',
    // Component-specific templates (will be expanded with {component})
    'Fix the null pointer error in src/{component}/{component}.tsx on line 23 by adding optional chaining',
    'Add unit tests for {component} component covering: render, click handlers, loading state, error state',
    'Refactor {component} to use React.memo and useCallback for performance optimization',
    'Implement error boundary wrapper for {component} with fallback UI and error logging',
    'Add TypeScript strict types to {component} props interface with JSDoc documentation',
    'Fix the useEffect dependency warning in {component} by extracting callback to useCallback',
    'Add accessibility attributes (aria-label, role, tabIndex) to {component} for screen readers',
    'Implement loading skeleton for {component} that matches the final layout dimensions',
    'Add Storybook stories for {component} covering: default, loading, error, empty states',
    'Fix the CSS-in-JS performance issue in {component} by moving styles outside component',
    'Add integration tests for {component} using React Testing Library with user-event',
    'Implement keyboard navigation for {component} with arrow keys and Enter/Space handlers',
    'Add PropTypes validation to {component} as fallback for non-TypeScript consumers',
    'Fix the z-index stacking issue in {component} by using CSS custom properties',
    'Add responsive breakpoints to {component} for mobile (320px), tablet (768px), desktop (1024px)',
    // Backend specific templates
    'Add input validation to POST /api/{component} endpoint using zod schema with error messages',
    'Implement caching for GET /api/{component} with 5-minute TTL and cache invalidation on write',
    'Add rate limiting to /api/{component}/* routes with 100 requests per minute per user',
    'Create database migration to add indexes on {component} table for query optimization',
    'Implement soft delete for {component} model with deletedAt timestamp and restore endpoint',
    'Add audit logging to {component} service for create, update, delete operations',
    'Implement pagination for GET /api/{component} with cursor-based navigation and total count',
    'Add webhook endpoint for {component} events with signature verification and retry logic',
    'Create background job for {component} data sync with progress tracking and error handling',
    'Implement search endpoint for {component} with full-text search and filters',
    // Error fixing templates
    'Fix the 500 error on POST /api/{component} caused by missing database connection pooling',
    'Resolve the CORS error on {component} API by adding proper headers and preflight handling',
    'Fix the memory leak in {component} service caused by unclosed database connections',
    'Debug the slow query in {component} repository by adding database index on foreign key',
    'Fix the race condition in {component} update by implementing optimistic locking',
    // More specific standalone prompts
    'Create a custom ESLint rule to enforce consistent import ordering in the codebase',
    'Add Husky pre-commit hook that runs lint-staged on modified TypeScript files only',
    'Implement feature flags using LaunchDarkly SDK with React context provider',
    'Add Sentry error tracking with custom tags for user ID, environment, and release version',
    'Create a custom Webpack plugin to generate build manifest with chunk hashes',
    'Implement A/B testing framework with experiment assignment and analytics tracking',
    'Add OpenTelemetry tracing to all API endpoints with custom span attributes',
    'Create database seeding script for development with realistic fake data using Faker.js',
    'Implement GraphQL subscriptions for real-time updates using Apollo Server',
    'Add end-to-end tests using Playwright covering: login flow, checkout, profile update',
    'Create a custom React hook useIntersectionObserver for lazy loading images',
    'Implement service worker for offline support with cache-first strategy for assets',
    'Add Content Security Policy headers to Next.js config with nonce for inline scripts',
    'Create API documentation using OpenAPI 3.0 spec with request/response examples',
    'Implement database connection pooling with PgBouncer for PostgreSQL',
    'Add Redis session store for horizontal scaling across multiple server instances',
    'Create a CLI tool for database migrations with up, down, and seed commands',
    'Implement request signing for API authentication using HMAC-SHA256',
    'Add structured logging with correlation IDs for distributed tracing',
    'Create health check endpoint that verifies database, Redis, and external API connectivity',
  ],
};

const COMPONENTS = [
  // Auth & Users
  'authentication',
  'login',
  'signup',
  'user registration',
  'password reset',
  'user profile',
  'permissions',
  'session',
  // Core features
  'API',
  'database',
  'form validation',
  'error handling',
  'caching',
  'logging',
  'state management',
  // UI Components
  'dashboard',
  'navigation',
  'sidebar',
  'header',
  'footer',
  'modal',
  'dropdown',
  'table',
  'form',
  'button',
  'input',
  // Features
  'search',
  'notifications',
  'settings',
  'file upload',
  'image gallery',
  'comments',
  'chat',
  'checkout',
  'cart',
  'payment',
  'analytics',
  'reports',
  // Backend
  'middleware',
  'routes',
  'controller',
  'service',
  'repository',
  'websocket',
  'queue',
  'scheduler',
];

// ============================================================================
// PROMPT GENERATION
// ============================================================================

/**
 * Generates all prompt variations from templates
 */
export function generateAllPrompts(): string[] {
  const prompts = new Set<string>();

  // Add all vague prompts with component variations
  for (const template of PROMPT_TEMPLATES.vague) {
    if (template.includes('{component}')) {
      for (const component of COMPONENTS) {
        prompts.add(template.replace('{component}', component));
      }
    } else {
      prompts.add(template);
    }
  }

  // Add medium prompts
  for (const template of PROMPT_TEMPLATES.medium) {
    if (template.includes('{component}')) {
      for (const component of COMPONENTS) {
        prompts.add(template.replace('{component}', component));
      }
    } else {
      prompts.add(template);
    }
  }

  // Add specific prompts with component variations
  for (const template of PROMPT_TEMPLATES.specific) {
    if (template.includes('{component}')) {
      for (const component of COMPONENTS) {
        prompts.add(template.replace('{component}', component));
      }
    } else {
      prompts.add(template);
    }
  }

  return shuffleArray(Array.from(prompts));
}

/**
 * Shuffles array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// LLM LABELING
// ============================================================================

/**
 * Builds the prompt for Copilot to label a prompt
 */
function buildLabelingPrompt(promptToLabel: string): string {
  return `You are a prompt quality analyst. Analyze this prompt that a developer might send to a coding assistant.

PROMPT TO ANALYZE:
"${promptToLabel}"

Rate the vagueness from 0-100:
- 0-20: Very specific (has file paths, line numbers, exact error messages, clear requirements)
- 20-40: Specific (clear intent, mentions specific technologies/components/functions)
- 40-60: Moderate (has topic but missing important context like files, errors, or constraints)
- 60-80: Vague (uses generic terms like "fix it", "make it work", no specifics)
- 80-100: Very vague (no clear intent, like "help" or "do something")

Respond with ONLY valid JSON, no other text:
{"vaguenessScore": <number 0-100>, "intentCategory": "<build|fix|learn|improve|configure|unknown>", "missingElements": ["<specific info that is missing>"], "reasoning": "<1 sentence explanation>"}`;
}

/**
 * Expected shape of LLM labeling response
 */
interface LLMLabelingResponse {
  vaguenessScore: number;
  intentCategory: string;
  missingElements: unknown[];
  reasoning: string;
}

/**
 * Type guard for LLM labeling response
 */
function isValidLLMResponse(obj: unknown): obj is LLMLabelingResponse {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const response = obj as Record<string, unknown>;
  return (
    typeof response.vaguenessScore === 'number' &&
    typeof response.intentCategory === 'string' &&
    Array.isArray(response.missingElements) &&
    typeof response.reasoning === 'string'
  );
}

/**
 * Parses LLM response into LabeledPrompt
 */
function parseLLMResponse(response: string, originalPrompt: string): LabeledPrompt | null {
  try {
    // Extract JSON from potential markdown code blocks
    let jsonStr = response.trim();
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON object in the response
    const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      jsonStr = jsonObjectMatch[0];
    }

    const parsed: unknown = JSON.parse(jsonStr);

    // Validate required fields using type guard
    if (!isValidLLMResponse(parsed)) {
      logger.warn('LLM response missing required fields', { response: jsonStr });
      return null;
    }

    // Clamp and validate
    const vaguenessScore = Math.max(0, Math.min(100, Math.round(parsed.vaguenessScore)));
    const intentCategory = VALID_INTENT_CATEGORIES.includes(
      parsed.intentCategory as (typeof VALID_INTENT_CATEGORIES)[number]
    )
      ? (parsed.intentCategory as LabeledPrompt['intentCategory'])
      : 'unknown';

    return {
      prompt: originalPrompt,
      vaguenessScore,
      intentCategory,
      missingElements: parsed.missingElements.map(String),
      reasoning: String(parsed.reasoning),
    };
  } catch (error) {
    logger.warn('Failed to parse LLM response', { error, response });
    return null;
  }
}

/**
 * Labels a single prompt using Copilot
 */
async function labelPromptWithCopilot(
  prompt: string,
  model: vscode.LanguageModelChat,
  token: vscode.CancellationToken
): Promise<LabeledPrompt | null> {
  try {
    const labelingPrompt = buildLabelingPrompt(prompt);
    const messages = [vscode.LanguageModelChatMessage.User(labelingPrompt)];

    const response = await model.sendRequest(messages, {}, token);

    // Collect full response
    let fullResponse = '';
    for await (const fragment of response.text) {
      fullResponse += fragment;
    }

    return parseLLMResponse(fullResponse, prompt);
  } catch (error) {
    logger.warn('Copilot labeling failed', { prompt, error });
    return null;
  }
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generates labeled training data using GitHub Copilot
 *
 * @param config Generation configuration
 * @param progress Progress callback
 * @param token Cancellation token
 * @returns Array of labeled prompts
 */
export async function generateTrainingData(
  config: GenerationConfig = DEFAULT_CONFIG,
  progress: (p: GenerationProgress) => void,
  token: vscode.CancellationToken
): Promise<LabeledPrompt[]> {
  // Get Copilot model
  const models = await vscode.lm.selectChatModels({
    vendor: 'copilot',
  });

  if (models.length === 0) {
    throw new Error('GitHub Copilot not available. Please make sure Copilot is installed and active.');
  }

  // Prefer GPT-4 if available
  const model = models.find((m) => m.family.toLowerCase().includes('gpt-4')) || models[0];
  logger.info(`Using model: ${model.vendor}/${model.family}`);

  // Generate all prompts
  const allPrompts = generateAllPrompts();
  const targetPrompts = allPrompts.slice(0, config.targetCount);
  logger.info(`Generated ${targetPrompts.length} prompts for labeling`);

  const labeledPrompts: LabeledPrompt[] = [];
  let failed = 0;

  // Process in batches
  for (let i = 0; i < targetPrompts.length; i += config.batchSize) {
    if (token.isCancellationRequested) {
      logger.info('Generation cancelled by user');
      break;
    }

    const batch = targetPrompts.slice(i, i + config.batchSize);
    const batchResults = await Promise.all(batch.map((prompt) => labelPromptWithCopilot(prompt, model, token)));

    for (const result of batchResults) {
      if (result) {
        labeledPrompts.push(result);
      } else {
        failed++;
      }
    }

    // Report progress
    progress({
      current: Math.min(i + config.batchSize, targetPrompts.length),
      total: targetPrompts.length,
      successful: labeledPrompts.length,
      failed,
    });

    // Delay between batches to avoid rate limiting
    if (i + config.batchSize < targetPrompts.length) {
      await new Promise((resolve) => setTimeout(resolve, config.delayBetweenBatches));
    }
  }

  return labeledPrompts;
}

/**
 * Saves labeled prompts to JSON file
 */
export function saveTrainingData(data: LabeledPrompt[], outputPath: string, workspaceRoot: string): string {
  const fullPath = path.join(workspaceRoot, outputPath);
  const dir = path.dirname(fullPath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save with pretty formatting
  const json = JSON.stringify(
    {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      count: data.length,
      prompts: data,
    },
    null,
    2
  );

  fs.writeFileSync(fullPath, json, 'utf-8');
  return fullPath;
}

// ============================================================================
// VS CODE COMMAND
// ============================================================================

/**
 * Registers the training data generation command
 */
export function registerTrainingDataCommand(context: vscode.ExtensionContext): void {
  const command = vscode.commands.registerCommand('betterprompt.generateTrainingData', async () => {
    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      void vscode.window.showErrorMessage('Please open a workspace folder first.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Ask for target count
    const countInput = await vscode.window.showInputBox({
      prompt: 'How many labeled prompts to generate? (Recommended: 10000+ for production-grade model)',
      value: '15000',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 10 || num > 50000) {
          return 'Enter a number between 10 and 50000';
        }
        return null;
      },
    });

    if (!countInput) {
      return; // User cancelled
    }

    const targetCount = parseInt(countInput, 10);

    // Run with progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating Training Data',
        cancellable: true,
      },
      async (progress, token) => {
        try {
          const config: GenerationConfig = {
            ...DEFAULT_CONFIG,
            targetCount,
          };

          const data = await generateTrainingData(
            config,
            (p) => {
              progress.report({
                message: `${p.current}/${p.total} (${p.successful} successful, ${p.failed} failed)`,
                increment: (config.batchSize / p.total) * 100,
              });
            },
            token
          );

          if (data.length === 0) {
            void vscode.window.showWarningMessage('No prompts were labeled. Check the output panel for errors.');
            return;
          }

          // Save to file
          const savedPath = saveTrainingData(data, config.outputPath, workspaceRoot);

          const selection = await vscode.window.showInformationMessage(
            `Generated ${data.length} labeled prompts! Saved to ${config.outputPath}`,
            'Open File'
          );

          if (selection === 'Open File') {
            const doc = await vscode.workspace.openTextDocument(savedPath);
            await vscode.window.showTextDocument(doc);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`Training data generation failed: ${message}`);
          logger.error('Training data generation failed', error);
        }
      }
    );
  });

  context.subscriptions.push(command);
}
