# PromptForge - Technical Specification

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌──────────────┐     ┌─────────────┐ │
│  │  Extension  │─────▶│   Analyzer   │────▶│  Rewriter   │ │
│  │  Activation │      │    Engine    │     │   Engine    │ │
│  └─────────────┘      └──────────────┘     └─────────────┘ │
│         │                     │                     │        │
│         │                     ▼                     ▼        │
│         │              ┌──────────────┐     ┌─────────────┐ │
│         │              │   Template   │     │     UI      │ │
│         │              │    Library   │     │  Components │ │
│         │              └──────────────┘     └─────────────┘ │
│         │                                           │        │
│         ▼                                           │        │
│  ┌─────────────────────────────────────────────────┘        │
│  │          Database Manager (SQLite)               │        │
│  └──────────────────────────────────────────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Breakdown

#### Extension Core (`src/extension.ts`)
- Entry point for activation/deactivation
- Command registration
- Lifecycle management
- Configuration management

#### Analyzer Engine (`src/analyzer/`)
- `promptAnalyzer.ts` - Main analysis logic
- `vaguenessDetector.ts` - Pattern matching for vague prompts
- `contextExtractor.ts` - Extract workspace context
- `scoringEngine.ts` - Calculate vagueness scores

#### Rewriter Engine (`src/rewriter/`)
- `promptRewriter.ts` - Main rewriting logic
- `templateMatcher.ts` - Match prompts to templates
- `contextInjector.ts` - Inject context into templates
- `optimizer.ts` - Optimize prompt structure

#### Template Library (`src/templates/`)
- `defaultTemplates.ts` - Built-in templates
- `templateEngine.ts` - Template rendering
- `templateValidator.ts` - Validate template syntax

#### UI Components (`src/ui/`)
- `diffViewer.ts` - Before/after comparison view
- `approvalDialog.ts` - User approval workflow
- `settingsPanel.ts` - Settings webview
- `analyticsView.ts` - Dashboard webview

#### Database Layer (`src/db/`)
- `database.ts` - Database manager
- `schema.ts` - Table definitions
- `migrations.ts` - Schema versioning

## 2. Data Models

### 2.1 Core Entities

```typescript
// Prompt Analysis Result
interface AnalysisResult {
  score: number;                    // 0-100 vagueness score
  issues: VaguenessIssue[];        // Detected issues
  suggestions: string[];            // Improvement suggestions
  context: WorkspaceContext;        // Extracted context
  metadata: AnalysisMetadata;      // Timing, version, etc.
}

// Vagueness Issue
interface VaguenessIssue {
  type: IssueType;                 // MISSING_CONTEXT, UNCLEAR_INTENT, etc.
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: { start: number; end: number };
  suggestion: string;
}

// Workspace Context
interface WorkspaceContext {
  currentFile?: string;
  selectedCode?: string;
  projectType?: string;             // 'react', 'node', 'python', etc.
  framework?: string;
  recentErrors?: string[];
}

// Template
interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  content: string;                  // Template with variables
  variables: TemplateVariable[];
  tags: string[];
  priority: number;
}

// Rewrite Result
interface RewriteResult {
  original: string;
  enhanced: string;
  template: Template;
  appliedContext: Record<string, string>;
  confidence: number;               // 0-1 confidence score
  tokensEstimate: {
    original: number;
    enhanced: number;
  };
}
```

### 2.2 Database Schema (SQLite)

See [schema.ts](../src/db/schema.ts) for complete definitions.

**Tables:**
- `user_templates` - Custom templates
- `prompt_history` - Optimization history
- `analytics` - Metrics and statistics

## 3. Core Algorithms

### 3.1 Vagueness Detection Algorithm

```typescript
/**
 * Analyzes a prompt for vagueness using rule-based patterns
 * Performance target: < 100ms
 */
function analyzePromptVagueness(prompt: string): AnalysisResult {
  const issues: VaguenessIssue[] = [];
  let score = 0;

  // 1. Check for vague verbs (weight: 20)
  const vagueVerbs = ['make', 'create', 'do', 'fix', 'help', 'change'];
  if (containsVagueVerb(prompt, vagueVerbs)) {
    score += 20;
    issues.push(/* UNCLEAR_INTENT issue */);
  }

  // 2. Check for missing context (weight: 30)
  if (!hasFileReference(prompt) && !hasCodeReference(prompt)) {
    score += 30;
    issues.push(/* MISSING_CONTEXT issue */);
  }

  // 3. Check for scope ambiguity (weight: 25)
  if (!hasClearScope(prompt)) {
    score += 25;
    issues.push(/* AMBIGUOUS_SCOPE issue */);
  }

  // 4. Check prompt length (weight: 15)
  if (prompt.length < 20) {
    score += 15;
    issues.push(/* TOO_SHORT issue */);
  }

  // 5. Check for requirements (weight: 10)
  if (!hasRequirements(prompt)) {
    score += 10;
    issues.push(/* NO_REQUIREMENTS issue */);
  }

  return { score, issues, /* ... */ };
}
```

### 3.2 Template Matching Algorithm

```typescript
/**
 * Matches a prompt to the best template using scoring
 */
function matchTemplate(prompt: string, context: WorkspaceContext): Template | null {
  const templates = getAvailableTemplates();
  const scores = new Map<Template, number>();

  for (const template of templates) {
    let score = 0;

    // Keyword matching (40%)
    score += calculateKeywordMatch(prompt, template.tags) * 0.4;

    // Context matching (30%)
    score += calculateContextMatch(context, template.category) * 0.3;

    // Intent matching (30%)
    score += calculateIntentMatch(prompt, template.content) * 0.3;

    scores.set(template, score);
  }

  // Return template with highest score (min threshold: 0.6)
  const bestMatch = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])[0];

  return bestMatch && bestMatch[1] > 0.6 ? bestMatch[0] : null;
}
```

### 3.3 Context Injection Strategy

```typescript
/**
 * Injects workspace context into template variables
 */
function injectContext(template: string, context: WorkspaceContext): string {
  const replacements: Record<string, string> = {
    '{file}': context.currentFile || '[no file selected]',
    '{selection}': context.selectedCode || '[no code selected]',
    '{project}': context.projectType || 'unknown',
    '{framework}': context.framework || 'none',
    '{errors}': context.recentErrors?.join('\n') || 'none',
  };

  let result = template;
  for (const [variable, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(escapeRegex(variable), 'g'), value);
  }

  return result;
}
```

## 4. API Interfaces

### 4.1 Public Extension API

```typescript
/**
 * Main API exposed by the extension
 */
export interface PromptForgeAPI {
  /**
   * Analyze a prompt for vagueness
   */
  analyzePrompt(prompt: string): Promise<AnalysisResult>;

  /**
   * Optimize a prompt using templates
   */
  optimizePrompt(prompt: string, context?: WorkspaceContext): Promise<RewriteResult>;

  /**
   * Get all available templates
   */
  getTemplates(): Promise<Template[]>;

  /**
   * Add a custom template
   */
  addTemplate(template: Omit<Template, 'id'>): Promise<string>;

  /**
   * Get optimization statistics
   */
  getStats(): Promise<OptimizationStats>;
}
```

### 4.2 Database API

See [database.ts](../src/db/database.ts) for implementation.

## 5. User Interface Design

### 5.1 Diff Viewer Component

**Purpose**: Show before/after comparison of prompts

**Features:**
- Side-by-side or inline diff
- Syntax highlighting for code snippets
- Action buttons: Send, Edit, Skip
- Vagueness score badge
- Issue highlights

**Implementation**: VS Code Webview API with custom HTML/CSS/JS

### 5.2 Settings Panel

**Configuration Options:**
- Enable/disable optimization
- Auto-optimize toggle
- Analysis mode selection
- Minimum prompt length
- Show diff preference

**Implementation**: VS Code settings contribution in `package.json`

### 5.3 Analytics Dashboard

**Metrics Displayed:**
- Total prompts analyzed
- Acceptance rate chart
- Token savings over time
- Most used templates
- Vagueness score trends

**Implementation**: Webview with Chart.js or similar

## 6. Performance Optimization

### 6.1 Analysis Performance
- Use regex caching for pattern matching
- Limit prompt length analysis (max 10,000 chars)
- Async processing with Web Workers (if needed)
- Debounce analysis triggers

### 6.2 Database Performance
- Use prepared statements for all queries
- Create indexes on frequently queried columns
- Batch insert operations
- Connection pooling (single connection for extension)

### 6.3 UI Performance
- Virtual scrolling for template lists
- Lazy loading for analytics charts
- Debounce user input in editors
- Cancel pending operations on view changes

## 7. Testing Strategy

### 7.1 Unit Tests (80%+ coverage)

**Analyzer Tests:**
- Test vagueness detection patterns
- Test scoring algorithm edge cases
- Test context extraction

**Rewriter Tests:**
- Test template matching accuracy
- Test context injection
- Test variable replacement

**Database Tests:**
- Test CRUD operations
- Test query performance
- Test migration logic

### 7.2 Integration Tests

- Test extension activation
- Test command registration
- Test VS Code API integration
- Test database initialization

### 7.3 E2E Tests

- Test full optimization workflow
- Test UI interactions
- Test settings changes
- Test error scenarios

## 8. Security Considerations

### 8.1 Data Privacy
- All data stored locally in VS Code extension storage
- No external API calls for core features
- No telemetry without user consent
- Code snippets never leave local machine

### 8.2 Input Validation
- Sanitize user input in templates
- Validate SQL inputs (use parameterized queries)
- Limit prompt length to prevent DoS
- Escape special characters in diff viewer

### 8.3 Dependency Security
- Regular dependency audits (`npm audit`)
- Use only well-maintained packages
- Pin dependency versions
- Review security advisories

## 9. Deployment & Distribution

### 9.1 Build Process
```bash
npm run compile       # TypeScript compilation
npm run lint          # ESLint checks
npm run test          # Run all tests
npm run package       # Create .vsix package
```

### 9.2 Release Process
1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag
4. Build package
5. Test package locally
6. Publish to VS Code Marketplace

### 9.3 Versioning
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Breaking changes = MAJOR bump
- New features = MINOR bump
- Bug fixes = PATCH bump

## 10. Future Enhancements (v2.0+)

### 10.1 AI-Powered Analysis
- Use Claude API for advanced analysis
- Learn from user preferences
- Generate custom templates automatically

### 10.2 Collaboration Features
- Share templates with team
- Template marketplace
- Usage analytics across team

### 10.3 Advanced Context
- Git history awareness
- Issue tracker integration
- Documentation lookup

## 11. References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
