/**
 * Prompt Templates for ML Training Data Generation
 *
 * These templates are used to generate diverse prompts at different
 * vagueness levels for training the ML classifier.
 */

export interface PromptTemplate {
  base: string;
  variables: Record<string, string[]>;
  expectedVagueness: 'high' | 'medium' | 'low';
}

// Common variable sets for template expansion
const COMPONENTS = [
  'authentication',
  'login',
  'user registration',
  'API',
  'database',
  'form validation',
  'error handling',
  'caching',
  'logging',
  'session management',
];

const VAGUE_TARGETS = ['it', 'the thing', 'this', 'stuff', 'the code', 'something', 'everything'];

const SPECIFIC_FILES = [
  'src/auth/login.ts',
  'api/users/controller.js',
  'components/Form.tsx',
  'lib/database.py',
  'services/payment.ts',
];

const FRAMEWORKS = ['React', 'Vue', 'Angular', 'Express', 'Django', 'FastAPI', 'Next.js', 'NestJS'];

const LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust'];

const ERROR_TYPES = [
  'TypeError: Cannot read property',
  'ReferenceError: undefined',
  'SyntaxError: Unexpected token',
  '500 Internal Server Error',
  'CORS policy blocked',
  'Connection refused',
];

// ============================================================================
// VAGUE TEMPLATES (Expected vagueness: 60-100)
// ============================================================================

export const VAGUE_TEMPLATES: PromptTemplate[] = [
  // Ultra-vague (90-100)
  { base: 'fix {target}', variables: { target: VAGUE_TARGETS }, expectedVagueness: 'high' },
  { base: 'make {target} work', variables: { target: VAGUE_TARGETS }, expectedVagueness: 'high' },
  { base: 'help me with {target}', variables: { target: VAGUE_TARGETS }, expectedVagueness: 'high' },
  { base: 'do {target}', variables: { target: VAGUE_TARGETS }, expectedVagueness: 'high' },
  { base: '{target} is broken', variables: { target: VAGUE_TARGETS }, expectedVagueness: 'high' },
  { base: "I don't know what's wrong", variables: {}, expectedVagueness: 'high' },
  { base: 'something is not working', variables: {}, expectedVagueness: 'high' },
  { base: 'make it better', variables: {}, expectedVagueness: 'high' },
  { base: 'improve the code', variables: {}, expectedVagueness: 'high' },
  { base: 'optimize performance', variables: {}, expectedVagueness: 'high' },

  // Vague with topic (70-85)
  { base: 'fix the {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
  { base: 'create a {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
  { base: 'help with {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
  { base: 'build {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
  { base: 'make a {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
  { base: 'update the {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
  { base: 'add {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
  { base: 'how do I do {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
  { base: 'explain {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
  { base: 'show me {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },

  // Vague requests (60-75)
  { base: 'make a website', variables: {}, expectedVagueness: 'high' },
  { base: 'build an app', variables: {}, expectedVagueness: 'high' },
  { base: 'create an API', variables: {}, expectedVagueness: 'high' },
  { base: 'set up a database', variables: {}, expectedVagueness: 'high' },
  { base: 'make a login page', variables: {}, expectedVagueness: 'high' },
  { base: 'add user authentication', variables: {}, expectedVagueness: 'high' },
  { base: 'implement caching', variables: {}, expectedVagueness: 'high' },
  { base: 'add tests', variables: {}, expectedVagueness: 'high' },
  { base: 'refactor the code', variables: {}, expectedVagueness: 'high' },
  { base: 'clean up the project', variables: {}, expectedVagueness: 'high' },
];

// ============================================================================
// SPECIFIC TEMPLATES (Expected vagueness: 0-40)
// ============================================================================

export const SPECIFIC_TEMPLATES: PromptTemplate[] = [
  // Very specific with file, action, and context (0-20)
  {
    base: 'Fix the {error} in {file} on line 42 where the async function fails to await the database query',
    variables: { error: ERROR_TYPES.slice(0, 3), file: SPECIFIC_FILES },
    expectedVagueness: 'low',
  },
  {
    base: 'Refactor the handleSubmit function in {file} to use async/await instead of .then() chaining',
    variables: { file: SPECIFIC_FILES },
    expectedVagueness: 'low',
  },
  {
    base: 'Add input validation to the email field in {file} using zod schema with regex pattern for valid emails',
    variables: { file: SPECIFIC_FILES },
    expectedVagueness: 'low',
  },
  {
    base: 'Implement JWT refresh token rotation in {file} with 7-day expiry and secure httpOnly cookies',
    variables: { file: SPECIFIC_FILES },
    expectedVagueness: 'low',
  },
  {
    base: 'Add rate limiting middleware to the /api/auth/* routes with 100 requests per 15 minutes per IP',
    variables: {},
    expectedVagueness: 'low',
  },

  // Specific with framework context (20-35)
  {
    base: 'Create a {framework} component for a paginated data table with sorting, filtering, and row selection',
    variables: { framework: FRAMEWORKS.slice(0, 3) },
    expectedVagueness: 'low',
  },
  {
    base: 'Implement a custom useDebounce hook in {framework} with configurable delay and cleanup on unmount',
    variables: { framework: ['React', 'Vue'] },
    expectedVagueness: 'low',
  },
  {
    base: 'Set up {framework} project with {language}, ESLint, Prettier, and Jest for unit testing',
    variables: { framework: FRAMEWORKS.slice(0, 4), language: LANGUAGES.slice(0, 2) },
    expectedVagueness: 'low',
  },
  {
    base: 'Add server-side rendering to the product listing page in {framework} with data fetching from /api/products',
    variables: { framework: ['Next.js', 'Nuxt'] },
    expectedVagueness: 'low',
  },

  // Specific bug fixes (15-30)
  {
    base: 'Fix the memory leak in useEffect where the interval is not cleared on component unmount in {file}',
    variables: { file: SPECIFIC_FILES.slice(0, 2) },
    expectedVagueness: 'low',
  },
  {
    base: 'Debug why the form submission in {file} throws {error} when the email field contains special characters',
    variables: { file: SPECIFIC_FILES, error: ERROR_TYPES.slice(0, 2) },
    expectedVagueness: 'low',
  },
  {
    base: 'Fix the race condition in {file} where multiple API calls overwrite each other in state',
    variables: { file: SPECIFIC_FILES },
    expectedVagueness: 'low',
  },

  // Specific feature requests (25-40)
  {
    base: 'Add dark mode toggle to the Settings component that persists preference to localStorage',
    variables: {},
    expectedVagueness: 'low',
  },
  {
    base: 'Implement infinite scroll for the comments section with 20 items per page and loading skeleton',
    variables: {},
    expectedVagueness: 'low',
  },
  {
    base: 'Create a reusable Modal component with focus trap, escape key close, and click-outside-to-dismiss',
    variables: {},
    expectedVagueness: 'low',
  },
  {
    base: 'Add Stripe payment integration to the checkout flow with support for card and Apple Pay',
    variables: {},
    expectedVagueness: 'low',
  },
  {
    base: 'Implement WebSocket connection in {file} for real-time notifications with automatic reconnection',
    variables: { file: SPECIFIC_FILES },
    expectedVagueness: 'low',
  },
];

// ============================================================================
// MEDIUM VAGUENESS TEMPLATES (Expected vagueness: 40-60)
// ============================================================================

export const MEDIUM_TEMPLATES: PromptTemplate[] = [
  {
    base: 'Add error handling to the {component}',
    variables: { component: COMPONENTS },
    expectedVagueness: 'medium',
  },
  {
    base: 'Improve the performance of {component}',
    variables: { component: COMPONENTS },
    expectedVagueness: 'medium',
  },
  {
    base: 'Refactor {component} to be more maintainable',
    variables: { component: COMPONENTS },
    expectedVagueness: 'medium',
  },
  { base: 'Add tests for {component}', variables: { component: COMPONENTS }, expectedVagueness: 'medium' },
  {
    base: 'Fix the bug in {component} that causes the page to crash',
    variables: { component: COMPONENTS },
    expectedVagueness: 'medium',
  },
  {
    base: 'Create a {framework} app with {component}',
    variables: { framework: FRAMEWORKS.slice(0, 4), component: COMPONENTS.slice(0, 4) },
    expectedVagueness: 'medium',
  },
  {
    base: 'Help me understand how {component} works in {framework}',
    variables: { component: COMPONENTS.slice(0, 4), framework: FRAMEWORKS.slice(0, 4) },
    expectedVagueness: 'medium',
  },
  {
    base: 'Debug the {error} issue',
    variables: { error: ERROR_TYPES },
    expectedVagueness: 'medium',
  },
  {
    base: 'Optimize the database queries in the {component}',
    variables: { component: ['user service', 'product API', 'order system'] },
    expectedVagueness: 'medium',
  },
  {
    base: 'Add validation to the {component} form',
    variables: { component: ['registration', 'login', 'checkout', 'profile'] },
    expectedVagueness: 'medium',
  },
];

// ============================================================================
// TEMPLATES BY INTENT CATEGORY
// ============================================================================

export const TEMPLATES_BY_INTENT = {
  build: [
    { base: 'create a {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
    { base: 'build an API for {component}', variables: { component: COMPONENTS }, expectedVagueness: 'medium' },
    {
      base: 'implement {component} with {framework}',
      variables: { component: COMPONENTS, framework: FRAMEWORKS },
      expectedVagueness: 'medium',
    },
    { base: 'set up a new project with {framework}', variables: { framework: FRAMEWORKS }, expectedVagueness: 'medium' },
    { base: 'create a REST API with JWT auth and rate limiting', variables: {}, expectedVagueness: 'low' },
  ] as PromptTemplate[],

  fix: [
    { base: 'fix the bug', variables: {}, expectedVagueness: 'high' },
    { base: 'fix the {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
    { base: 'debug {error}', variables: { error: ERROR_TYPES }, expectedVagueness: 'medium' },
    { base: 'fix {error} in {file}', variables: { error: ERROR_TYPES, file: SPECIFIC_FILES }, expectedVagueness: 'low' },
    {
      base: 'resolve the memory leak in useEffect hook in {file}',
      variables: { file: SPECIFIC_FILES },
      expectedVagueness: 'low',
    },
  ] as PromptTemplate[],

  learn: [
    { base: 'explain {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
    { base: 'how does {component} work', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
    { base: 'teach me {framework}', variables: { framework: FRAMEWORKS }, expectedVagueness: 'high' },
    {
      base: 'explain how {component} works in {framework} with code examples',
      variables: { component: COMPONENTS, framework: FRAMEWORKS },
      expectedVagueness: 'medium',
    },
    {
      base: 'show me step-by-step how to implement JWT authentication with refresh tokens',
      variables: {},
      expectedVagueness: 'low',
    },
  ] as PromptTemplate[],

  improve: [
    { base: 'optimize the code', variables: {}, expectedVagueness: 'high' },
    { base: 'improve {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
    { base: 'refactor {component}', variables: { component: COMPONENTS }, expectedVagueness: 'high' },
    {
      base: 'optimize {component} for better performance',
      variables: { component: COMPONENTS },
      expectedVagueness: 'medium',
    },
    {
      base: 'refactor {file} to use async/await instead of callbacks',
      variables: { file: SPECIFIC_FILES },
      expectedVagueness: 'low',
    },
  ] as PromptTemplate[],

  configure: [
    { base: 'set up the project', variables: {}, expectedVagueness: 'high' },
    { base: 'configure {component}', variables: { component: ['ESLint', 'Prettier', 'Jest', 'Docker', 'CI/CD'] }, expectedVagueness: 'high' },
    {
      base: 'set up {framework} with TypeScript',
      variables: { framework: FRAMEWORKS },
      expectedVagueness: 'medium',
    },
    {
      base: 'configure ESLint with airbnb rules, Prettier integration, and TypeScript support',
      variables: {},
      expectedVagueness: 'low',
    },
    {
      base: 'set up GitHub Actions CI/CD with test, lint, and deploy stages for {framework}',
      variables: { framework: FRAMEWORKS.slice(0, 3) },
      expectedVagueness: 'low',
    },
  ] as PromptTemplate[],
};

// ============================================================================
// ALL TEMPLATES COMBINED
// ============================================================================

export const ALL_TEMPLATES: PromptTemplate[] = [
  ...VAGUE_TEMPLATES,
  ...SPECIFIC_TEMPLATES,
  ...MEDIUM_TEMPLATES,
];
