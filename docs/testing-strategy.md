# PromptForge - Testing Strategy

## 1. Testing Overview

### 1.1 Testing Goals
- Achieve minimum 80% code coverage
- Ensure all critical paths are tested
- Prevent regressions through automated testing
- Validate VS Code extension integration
- Ensure cross-platform compatibility (Windows, macOS, Linux)

### 1.2 Testing Pyramid

```
           ┌──────────────┐
          ╱  E2E Tests    ╱│  (10%) - Full user workflows
         ╱   ~5 tests    ╱ │
        ├──────────────┤  │
       ╱  Integration  ╱│ ╱   (20%) - Component integration
      ╱    ~20 tests  ╱ │╱
     ├──────────────┤  │
    ╱  Unit Tests   ╱│ ╱    (70%) - Individual functions
   ╱   ~100 tests  ╱ │╱
  └──────────────┘  ╱
```

### 1.3 Test-Driven Development (TDD)
All features should follow the Red-Green-Refactor cycle:
1. Write failing test
2. Implement minimum code to pass
3. Refactor while keeping tests green

## 2. Unit Testing

### 2.1 Scope
Test individual functions and methods in isolation.

### 2.2 Tools
- **Jest** - Test framework
- **ts-jest** - TypeScript support
- Custom mocks for VS Code API

### 2.3 Unit Test Categories

#### 2.3.1 Analyzer Tests
**File:** `tests/unit/analyzer/promptAnalyzer.test.ts`

```typescript
describe('PromptAnalyzer', () => {
  describe('analyzeVagueness', () => {
    it('should detect vague verbs', () => {
      const result = analyzeVagueness('make a website');
      expect(result.score).toBeGreaterThan(50);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ type: IssueType.UNCLEAR_INTENT })
      );
    });

    it('should detect missing context', () => {
      const result = analyzeVagueness('fix the bug');
      expect(result.issues).toContainEqual(
        expect.objectContaining({ type: IssueType.MISSING_CONTEXT })
      );
    });

    it('should handle empty prompts', () => {
      const result = analyzeVagueness('');
      expect(result.score).toBe(100);
    });

    it('should complete analysis in < 100ms', () => {
      const start = Date.now();
      analyzeVagueness('create a full-stack application');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });
});
```

**Test Coverage:**
- Vague verb detection (20+ test cases)
- Context detection (15+ test cases)
- Scope analysis (10+ test cases)
- Scoring algorithm (10+ test cases)
- Edge cases (empty, very long, special characters)
- Performance benchmarks

#### 2.3.2 Rewriter Tests
**File:** `tests/unit/rewriter/promptRewriter.test.ts`

```typescript
describe('PromptRewriter', () => {
  describe('rewritePrompt', () => {
    it('should apply template correctly', () => {
      const result = rewritePrompt('make a website', webDevTemplate);
      expect(result.enhanced).toContain('tech stack');
      expect(result.enhanced).toContain('requirements');
    });

    it('should inject context variables', () => {
      const context = { currentFile: 'app.ts', projectType: 'react' };
      const result = rewritePrompt('fix this', bugFixTemplate, context);
      expect(result.enhanced).toContain('app.ts');
      expect(result.enhanced).toContain('react');
    });

    it('should maintain original intent', () => {
      const result = rewritePrompt('create login feature');
      expect(result.enhanced.toLowerCase()).toContain('login');
    });

    it('should handle missing template', () => {
      const result = rewritePrompt('xyz abc 123');
      expect(result.template).toBeUndefined();
    });
  });
});
```

**Test Coverage:**
- Template matching (25+ test cases)
- Context injection (15+ test cases)
- Variable replacement (10+ test cases)
- Intent preservation (10+ test cases)
- Edge cases

#### 2.3.3 Template Tests
**File:** `tests/unit/templates/templateEngine.test.ts`

```typescript
describe('TemplateEngine', () => {
  describe('renderTemplate', () => {
    it('should replace all variables', () => {
      const template = 'File: {file}, Project: {project}';
      const vars = { file: 'test.ts', project: 'myapp' };
      const result = renderTemplate(template, vars);
      expect(result).toBe('File: test.ts, Project: myapp');
    });

    it('should handle missing variables', () => {
      const template = 'File: {file}';
      const result = renderTemplate(template, {});
      expect(result).toContain('[no file selected]');
    });

    it('should validate template syntax', () => {
      const invalid = 'File: {file';
      expect(() => validateTemplate(invalid)).toThrow();
    });
  });
});
```

**Test Coverage:**
- Variable rendering (10+ test cases)
- Template validation (10+ test cases)
- Default templates (5+ test cases)
- Custom templates (5+ test cases)

#### 2.3.4 Database Tests
**File:** `tests/unit/db/database.test.ts`

```typescript
describe('DatabaseManager', () => {
  let db: DatabaseManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promptforge-test-'));
    db = new DatabaseManager(tempDir);
    db.initialize();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tempDir, { recursive: true });
  });

  describe('insertTemplate', () => {
    it('should insert template and return ID', () => {
      const template = {
        name: 'Test',
        content: 'Content',
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      const id = db.insertTemplate(template);
      expect(id).toBeGreaterThan(0);
    });

    it('should enforce unique names', () => {
      const template = { /* ... */ };
      db.insertTemplate(template);
      expect(() => db.insertTemplate(template)).toThrow();
    });
  });

  describe('getPromptHistory', () => {
    it('should return history in descending order', () => {
      // Insert multiple entries
      const history = db.getPromptHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(history[1].timestamp);
    });

    it('should respect limit parameter', () => {
      // Insert 100 entries
      const history = db.getPromptHistory(10);
      expect(history.length).toBe(10);
    });
  });
});
```

**Test Coverage:**
- CRUD operations (20+ test cases)
- Query performance (5+ benchmarks)
- Data integrity (10+ test cases)
- Edge cases (empty DB, large data)

## 3. Integration Testing

### 3.1 Scope
Test interactions between components and VS Code API integration.

### 3.2 Tools
- **Jest** - Test framework
- **@vscode/test-electron** - VS Code API testing
- Mock VS Code environment

### 3.3 Integration Test Categories

#### 3.3.1 Extension Activation Tests
**File:** `tests/integration/extension.test.ts`

```typescript
describe('Extension Integration', () => {
  it('should activate without errors', async () => {
    await vscode.extensions.getExtension('promptforge')?.activate();
    // Assert no errors
  });

  it('should register all commands', async () => {
    const commands = await vscode.commands.getCommands();
    expect(commands).toContain('promptforge.optimizePrompt');
    expect(commands).toContain('promptforge.showSettings');
  });

  it('should initialize database on activation', async () => {
    // Verify database file exists
    // Verify tables are created
  });
});
```

#### 3.3.2 Command Tests
**File:** `tests/integration/commands.test.ts`

```typescript
describe('Command Integration', () => {
  it('should execute optimizePrompt command', async () => {
    await vscode.commands.executeCommand('promptforge.optimizePrompt');
    // Assert UI is shown
  });

  it('should open settings panel', async () => {
    await vscode.commands.executeCommand('promptforge.showSettings');
    // Assert settings are displayed
  });
});
```

#### 3.3.3 Workflow Integration Tests
**File:** `tests/integration/workflow.test.ts`

```typescript
describe('Optimization Workflow', () => {
  it('should analyze, rewrite, and save prompt', async () => {
    const prompt = 'make a website';

    // Trigger analysis
    const analysis = await analyzePrompt(prompt);
    expect(analysis.score).toBeGreaterThan(0);

    // Trigger rewrite
    const rewrite = await rewritePrompt(prompt);
    expect(rewrite.enhanced).toBeDefined();

    // Save to history
    const saved = await savePromptHistory(analysis, rewrite);
    expect(saved).toBe(true);

    // Verify in database
    const history = await db.getPromptHistory(1);
    expect(history[0].original_prompt).toBe(prompt);
  });
});
```

**Test Coverage:**
- Extension lifecycle (5+ test cases)
- Command execution (10+ test cases)
- Full workflows (5+ test cases)
- VS Code API integration (10+ test cases)

## 4. End-to-End Testing

### 4.1 Scope
Test complete user workflows from UI interaction to database storage.

### 4.2 Tools
- **@vscode/test-electron** - VS Code extension testing
- Custom UI automation helpers

### 4.3 E2E Test Scenarios

#### 4.3.1 First-Time User Experience
```typescript
describe('E2E: First Time User', () => {
  it('should show welcome message and guide user through setup', async () => {
    // Install extension
    // Activate extension
    // Assert welcome message appears
    // Click "Get Started"
    // Assert documentation opens
  });
});
```

#### 4.3.2 Optimize Vague Prompt
```typescript
describe('E2E: Optimize Prompt', () => {
  it('should detect, rewrite, show diff, and send enhanced prompt', async () => {
    // User types vague prompt
    // Trigger optimization
    // Assert diff view appears
    // Click "Send"
    // Assert enhanced prompt is sent
    // Assert history is recorded
  });
});
```

#### 4.3.3 Create Custom Template
```typescript
describe('E2E: Custom Template', () => {
  it('should create, save, and use custom template', async () => {
    // Open template manager
    // Create new template
    // Save template
    // Use template for optimization
    // Assert template is applied
  });
});
```

#### 4.3.4 View Analytics
```typescript
describe('E2E: Analytics Dashboard', () => {
  it('should display accurate statistics', async () => {
    // Optimize several prompts
    // Open analytics dashboard
    // Assert counts are correct
    // Assert charts render
  });
});
```

**Test Coverage:**
- 5+ complete user workflows
- UI interactions
- Data persistence
- Cross-component integration

## 5. Performance Testing

### 5.1 Benchmarks

```typescript
describe('Performance Benchmarks', () => {
  it('should analyze prompt in < 100ms', () => {
    const start = performance.now();
    analyzePrompt('create a full-stack application with auth');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should handle 1000 database inserts in < 1s', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      db.insertPromptHistory(/* ... */);
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
```

### 5.2 Load Testing
- Test with 10,000+ prompts in history
- Test with 100+ custom templates
- Test with very long prompts (10,000+ chars)

## 6. Cross-Platform Testing

### 6.1 Platforms
- Windows 10/11
- macOS (Intel and Apple Silicon)
- Linux (Ubuntu 22.04)

### 6.2 VS Code Versions
- Minimum supported: 1.85.0
- Latest stable
- Insiders (optional)

## 7. Test Automation & CI/CD

### 7.1 GitHub Actions Workflow
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### 7.2 Pre-commit Hooks
```bash
# .husky/pre-commit
npm run lint
npm run test
```

## 8. Test Data Management

### 8.1 Test Fixtures
**Location:** `tests/fixtures/`

```
fixtures/
├── prompts/
│   ├── vague.json         # Vague prompt examples
│   ├── clear.json         # Clear prompt examples
│   └── edge-cases.json    # Edge case prompts
├── templates/
│   └── default.json       # Default template data
└── database/
    └── sample-data.json   # Sample DB records
```

### 8.2 Mock Data Generators
```typescript
// tests/helpers/generators.ts
export function generateRandomPrompt(): string;
export function generateVaguePrompt(): string;
export function generateClearPrompt(): string;
export function generateTemplate(): Template;
```

## 9. Coverage Requirements

### 9.1 Minimum Coverage Thresholds
- **Overall:** 80%
- **Statements:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Lines:** 80%

### 9.2 Critical Path Coverage
The following must have 100% coverage:
- Database CRUD operations
- Prompt analysis scoring
- Template variable replacement
- Extension activation/deactivation

## 10. Testing Checklist

### Before Every Commit
- [ ] All unit tests pass
- [ ] ESLint passes with no errors
- [ ] Prettier formatting applied
- [ ] No console.log statements (use proper logging)

### Before Every PR
- [ ] All integration tests pass
- [ ] Coverage thresholds met
- [ ] Manual testing on primary OS
- [ ] Documentation updated if needed

### Before Every Release
- [ ] All E2E tests pass
- [ ] Manual testing on all platforms
- [ ] Performance benchmarks pass
- [ ] No critical bugs in issue tracker
- [ ] CHANGELOG.md updated

## 11. Bug Reporting & Regression Tests

### 11.1 Bug Workflow
1. Bug is reported
2. Create failing test that reproduces bug
3. Fix bug
4. Verify test passes
5. Add test to regression suite

### 11.2 Regression Test Suite
Maintain a suite of tests for all fixed bugs to prevent recurrence.

**Location:** `tests/regression/`

## 12. Test Maintenance

### 12.1 Regular Reviews
- Review test coverage monthly
- Update tests when features change
- Remove obsolete tests
- Refactor duplicate test code

### 12.2 Test Documentation
- Document complex test setups
- Explain non-obvious assertions
- Keep test names descriptive
- Use consistent naming conventions

## 13. Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
