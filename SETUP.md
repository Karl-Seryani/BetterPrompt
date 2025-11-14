# PromptForge - Setup Guide

## Sprint 1 Complete! 🎉

Your project scaffolding is now complete and ready for development. This guide will help you get started.

## What's Been Created

### Project Configuration
- ✅ [package.json](package.json) - Dependencies and VS Code extension configuration
- ✅ [tsconfig.json](tsconfig.json) - TypeScript strict mode configuration
- ✅ [jest.config.js](jest.config.js) - Jest testing framework setup
- ✅ [.eslintrc.json](.eslintrc.json) - ESLint configuration
- ✅ [.prettierrc.json](.prettierrc.json) - Prettier code formatting
- ✅ [.gitignore](.gitignore) - Git ignore patterns

### Source Code
- ✅ [src/extension.ts](src/extension.ts) - Main extension entry point
- ✅ [src/db/schema.ts](src/db/schema.ts) - SQLite database schema
- ✅ [src/db/database.ts](src/db/database.ts) - Database manager class

### Documentation
- ✅ [docs/requirements.md](docs/requirements.md) - Detailed requirements document
- ✅ [docs/technical-spec.md](docs/technical-spec.md) - Technical specification
- ✅ [docs/user-stories.md](docs/user-stories.md) - User stories for all sprints
- ✅ [docs/testing-strategy.md](docs/testing-strategy.md) - Comprehensive testing guide
- ✅ [README.md](README.md) - Project documentation
- ✅ [CHANGELOG.md](CHANGELOG.md) - Version history

### GitHub Setup
- ✅ [.github/workflows/ci.yml](.github/workflows/ci.yml) - CI/CD pipeline
- ✅ [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md) - Bug report template
- ✅ [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md) - Feature request template
- ✅ [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) - PR template

### VS Code Configuration
- ✅ [.vscode/settings.json](.vscode/settings.json) - Editor settings
- ✅ [.vscode/launch.json](.vscode/launch.json) - Debug configurations
- ✅ [.vscode/tasks.json](.vscode/tasks.json) - Build tasks
- ✅ [.vscode/extensions.json](.vscode/extensions.json) - Recommended extensions

### Tests
- ✅ [tests/unit/db/database.test.ts](tests/unit/db/database.test.ts) - Sample database tests

### Other Files
- ✅ [LICENSE](LICENSE) - MIT License
- ✅ [.claude.md](.claude.md) - Project context for Claude

## Next Steps: Getting Started

### 1. Install Dependencies

```bash
npm install
```

This will install:
- TypeScript 5.3.3
- VS Code Extension API types
- better-sqlite3 for database
- Jest for testing
- ESLint and Prettier for code quality
- All other dev dependencies

### 2. Verify Setup

Run the following commands to ensure everything is working:

```bash
# Compile TypeScript
npm run compile

# Run linter
npm run lint

# Run tests
npm test

# Check formatting
npm run format:check
```

All commands should complete successfully.

### 3. Open in VS Code

```bash
code .
```

When VS Code opens:
1. Install recommended extensions (ESLint, Prettier, Jest)
2. TypeScript should compile automatically in watch mode
3. You'll see the project structure in the Explorer

### 4. Run the Extension

Press `F5` or go to Run > Start Debugging

This will:
1. Compile the TypeScript code
2. Open a new VS Code window with the extension loaded
3. You can test commands in the Command Palette (Ctrl+Shift+P)

### 5. Test Commands

In the Extension Development Host window:
- Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
- Try these commands:
  - `PromptForge: Optimize Current Prompt`
  - `PromptForge: Open Settings`
  - `PromptForge: View Analytics Dashboard`
  - `PromptForge: Manage Templates`

Currently, these show "Coming Soon" messages - you'll implement them in Sprint 2.

## Development Workflow

### Watch Mode

Run TypeScript in watch mode for automatic recompilation:

```bash
npm run watch
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

### Code Quality

```bash
# Lint your code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Building

```bash
# Compile TypeScript
npm run compile

# Package extension as .vsix
npm run package
```

## Project Structure Reference

```
promptforge/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                 # GitHub Actions CI/CD
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md          # Bug report template
│   │   └── feature_request.md     # Feature request template
│   └── PULL_REQUEST_TEMPLATE.md   # PR template
├── .vscode/
│   ├── extensions.json            # Recommended extensions
│   ├── launch.json                # Debug configurations
│   ├── settings.json              # Editor settings
│   └── tasks.json                 # Build tasks
├── docs/
│   ├── requirements.md            # Requirements document
│   ├── technical-spec.md          # Technical specification
│   ├── user-stories.md            # User stories
│   └── testing-strategy.md        # Testing strategy
├── src/
│   ├── extension.ts               # Main entry point ⭐
│   ├── analyzer/                  # Prompt analysis (Sprint 2)
│   ├── rewriter/                  # Prompt rewriting (Sprint 2)
│   ├── templates/                 # Template library (Sprint 2)
│   ├── ui/                        # UI components (Sprint 3)
│   └── db/
│       ├── database.ts            # Database manager ⭐
│       └── schema.ts              # Database schema ⭐
├── tests/
│   ├── unit/
│   │   └── db/
│   │       └── database.test.ts   # Sample test ⭐
│   ├── integration/               # Integration tests (Sprint 4)
│   └── e2e/                       # E2E tests (Sprint 4)
├── .claude.md                     # Project context for Claude ⭐
├── .eslintrc.json                 # ESLint configuration
├── .gitignore                     # Git ignore patterns
├── .prettierrc.json               # Prettier configuration
├── CHANGELOG.md                   # Version history
├── jest.config.js                 # Jest configuration
├── LICENSE                        # MIT License
├── package.json                   # Package configuration ⭐
├── README.md                      # Project documentation
├── SETUP.md                       # This file
└── tsconfig.json                  # TypeScript configuration
```

⭐ = Files you'll be editing most

## Ready for Sprint 2

You're now ready to start Sprint 2: Core Logic implementation!

### Sprint 2 Tasks (Weeks 3-4)

1. **Prompt Analyzer** - Implement vagueness detection
   - Create `src/analyzer/promptAnalyzer.ts`
   - Create `src/analyzer/vaguenessDetector.ts`
   - Create `src/analyzer/scoringEngine.ts`
   - Write unit tests FIRST (TDD)

2. **Template System** - Create template library
   - Create `src/templates/defaultTemplates.ts`
   - Create `src/templates/templateEngine.ts`
   - Define 5 initial templates
   - Write unit tests

3. **Rewriter Logic** - Implement prompt rewriting
   - Create `src/rewriter/promptRewriter.ts`
   - Create `src/rewriter/templateMatcher.ts`
   - Create `src/rewriter/contextInjector.ts`
   - Write unit tests

4. **Integration** - Connect all components
   - Update `src/extension.ts` to use analyzer and rewriter
   - Write integration tests

### Test-Driven Development Workflow

For Sprint 2, follow TDD:

1. **Write failing test first**
   ```typescript
   // tests/unit/analyzer/promptAnalyzer.test.ts
   it('should detect vague verbs', () => {
     const result = analyzeVagueness('make a website');
     expect(result.score).toBeGreaterThan(50);
   });
   ```

2. **Run test - it should fail**
   ```bash
   npm test
   ```

3. **Implement minimum code to pass**
   ```typescript
   // src/analyzer/promptAnalyzer.ts
   export function analyzeVagueness(prompt: string): AnalysisResult {
     // Implement logic
   }
   ```

4. **Run test - it should pass**
   ```bash
   npm test
   ```

5. **Refactor while keeping tests green**

## Troubleshooting

### TypeScript Errors

If you see TypeScript errors:
```bash
# Clean build
rm -rf dist/
npm run compile
```

### Test Failures

If tests fail to run:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Extension Won't Load

If the extension doesn't activate:
1. Check the Debug Console for errors
2. Verify `package.json` activation events
3. Check TypeScript compilation succeeded

### Database Errors

If you see database errors:
1. Check that `better-sqlite3` installed correctly
2. Verify temp directory permissions
3. Check database file location in extension storage

## Resources

### Documentation
- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [better-sqlite3 Docs](https://github.com/WiseLibs/better-sqlite3/wiki/API)

### Project Docs
- [Requirements](docs/requirements.md) - What we're building
- [Technical Spec](docs/technical-spec.md) - How we're building it
- [User Stories](docs/user-stories.md) - Feature breakdown
- [Testing Strategy](docs/testing-strategy.md) - How to test

## Questions & Answers

**Q: Where do I start for Sprint 2?**
A: Start with the prompt analyzer. Create `src/analyzer/promptAnalyzer.ts` and its test file first.

**Q: How do I add a new dependency?**
A: Run `npm install <package>` and it will be added to `package.json`

**Q: How do I debug the extension?**
A: Press F5 to launch the Extension Development Host, then use breakpoints in your code

**Q: How do I run a single test file?**
A: Use `npm test -- <filename>` or use the Jest extension in VS Code

**Q: Where is the database stored?**
A: In VS Code's extension storage directory, managed by the `context.globalStorageUri`

## Answers to Your Questions

### 1. Best way to intercept prompts in VS Code?

For intercepting prompts before they reach Claude Code, you have a few options:

**Option A: Chat Participant Extension (Recommended)**
- Use VS Code's Chat API to create a chat participant
- Intercept messages in the chat interface
- Process and enhance before forwarding

**Option B: Command Wrapper**
- Create commands that wrap AI assistant commands
- Users invoke your command instead of direct AI
- You process, enhance, then call AI

**Option C: Middleware Approach**
- Listen for specific VS Code events
- Hook into chat submission events
- Modify before sending

**Recommendation:** Start with Option B (Command Wrapper) for v1.0, then explore Chat API integration in v2.0.

### 2. Rule-based vs AI-based analysis?

**For Sprint 2-4 (v1.0):**
Use **rule-based analysis**:
- Faster (< 100ms requirement)
- No external dependencies
- Predictable results
- Works offline
- No API costs

**For v2.0:**
Add **AI-based** analysis as optional feature:
- Call Claude API for deeper analysis
- Learn from user preferences
- Generate custom templates
- Hybrid mode combines both

**Recommendation:** Start rule-based, add AI in v2.0 based on user feedback.

### 3. VS Code extension boilerplate?

You already have a complete scaffold! But if starting fresh:

**Recommended Approach:**
```bash
# Use Yeoman generator
npm install -g yo generator-code
yo code

# Choose:
# - TypeScript
# - New Extension
# - Include all recommended features
```

**Your current setup is already optimized:**
- Strict TypeScript configuration
- Professional tooling (ESLint, Prettier, Jest)
- Proper folder structure
- VS Code configurations

### 4. Best practices for VS Code extension testing?

**Unit Tests (Jest):**
- Mock VS Code API: Create mocks in `tests/mocks/vscode.ts`
- Test business logic independently
- Fast execution, no VS Code instance needed

**Integration Tests (@vscode/test-electron):**
- Test VS Code API integration
- Runs in actual VS Code environment
- Slower but more realistic

**E2E Tests:**
- Test complete user workflows
- Use VS Code automation
- Run in CI/CD pipeline

**Best Practices:**
1. Write tests BEFORE implementation (TDD)
2. Mock external dependencies
3. Test edge cases and error handling
4. Maintain >80% coverage
5. Use descriptive test names

See [testing-strategy.md](docs/testing-strategy.md) for comprehensive guide.

## Ready to Code!

Your Sprint 1 foundation is complete. Time to start building the core functionality!

**Start Sprint 2 by:**
1. Reading [docs/user-stories.md](docs/user-stories.md) for Sprint 2 stories
2. Creating your first test: `tests/unit/analyzer/promptAnalyzer.test.ts`
3. Implementing the analyzer to make tests pass

Good luck! 🚀
