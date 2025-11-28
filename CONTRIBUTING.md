# Contributing to BetterPrompt

Thank you for your interest in contributing to BetterPrompt! This guide will help you get started with development.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Debugging](#debugging)
- [Code Conventions](#code-conventions)
- [Submitting Changes](#submitting-changes)

## Development Setup

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **VS Code** 1.85.0 or higher
- **GitHub Copilot** (optional, for testing primary AI integration)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/BetterPrompt.git
   cd BetterPrompt
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables (optional):**
   ```bash
   cp .env.example .env
   # Edit .env and add your Groq API key (for fallback testing)
   ```

4. **Compile TypeScript:**
   ```bash
   npm run compile
   ```

5. **Run tests to verify setup:**
   ```bash
   npm test
   ```
   Expected: All 180+ tests should pass

## Project Structure

```
BetterPrompt/
├── core/               # Shared analyzer module (used by extension & MCP server)
│   └── analyzer.ts     # Vagueness detection algorithm
├── src/                # VS Code extension source
│   ├── context/        # Workspace context detection
│   │   ├── contextDetector.ts      # Main context detection
│   │   └── packageJsonCache.ts     # Package.json caching (Phase 2.1)
│   ├── rewriter/       # AI prompt enhancement
│   │   ├── promptRewriter.ts       # Main orchestrator
│   │   ├── vscodeLmRewriter.ts     # GitHub Copilot integration (PRIMARY)
│   │   ├── groqRewriter.ts         # Groq API fallback
│   │   └── sharedPrompts.ts        # System prompts
│   ├── chat/           # @betterprompt chat participant
│   ├── utils/          # Utilities (Phase 1.2-1.3)
│   │   ├── rateLimiter.ts          # Rate limiting protection
│   │   └── errorHandler.ts         # User-friendly errors
│   └── extension.ts    # VS Code integration & onboarding
├── tests/              # Unit tests (mirrors src/ structure)
├── mcp-server/         # Model Context Protocol server
└── CLAUDE.md           # AI context file (SINGLE SOURCE OF TRUTH)
```

### Key Files to Understand

- **`CLAUDE.md`**: Read this FIRST! Contains project status, architecture, and conventions
- **`core/analyzer.ts`**: Vagueness detection (fast, local, no I/O)
- **`src/rewriter/promptRewriter.ts`**: Main orchestration logic
- **`src/extension.ts`**: VS Code activation, commands, onboarding

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Extension Tests Only
```bash
npm test -- --testPathPattern=tests/unit
```

### Run MCP Server Tests
```bash
cd mcp-server
npm test
```

### Test Coverage
All tests must pass before committing. Current status: **180/180 extension + 29/29 MCP server**

## Debugging

### Debug the Extension

1. **Open VS Code** in the BetterPrompt directory
2. **Press F5** to launch Extension Development Host
3. **Set breakpoints** in your code
4. **Test the extension** in the new window
5. **View debug console** in original VS Code window

### Debug Tests

1. **Open test file** in VS Code
2. **Click "Debug" above test** (requires Jest extension)
3. Or run: `npm run test:debug` and attach debugger

### Enable Watch Mode During Development

```bash
npm run watch
```

This compiles TypeScript on every file change.

## Code Conventions

### TypeScript Strict Mode

- ✅ Explicit return types on all functions
- ❌ No `any` types (use `unknown` if needed)
- ✅ Strict null checks enabled
- ❌ No `console.log` in production code (use debug logging instead)

**Example:**
```typescript
// Good
export async function detectContext(): Promise<WorkspaceContext> {
  // ...
}

// Bad
export async function detectContext() {  // Missing return type
  console.log('Detecting context...');   // No console.log
  return result as any;                   // No 'any' types
}
```

### Test-Driven Development (TDD)

We use **RED-GREEN-REFACTOR** methodology:

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to make test pass
3. **REFACTOR**: Clean up code while keeping tests green

**Example:**
```typescript
// Step 1: RED - Write failing test
it('should cache package.json for 60 seconds', async () => {
  // Test implementation that fails initially
});

// Step 2: GREEN - Implement feature
export class PackageJsonCache {
  // Minimal implementation
}

// Step 3: REFACTOR - Improve code quality
// Clean up, extract functions, improve names
```

### File Organization

- Test files mirror `src/` structure: `src/context/contextDetector.ts` → `tests/unit/context/contextDetector.test.ts`
- One class/module per file
- Export interfaces before implementations

### Async/Await Pattern (Phase 2.2)

All I/O operations must be async:

```typescript
// Good
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Bad
function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);  // Blocks VS Code UI!
}
```

### Error Handling

Use the error handler for user-facing errors:

```typescript
import { formatUserError } from '../utils/errorHandler';

try {
  // AI operation
} catch (error) {
  const userMessage = formatUserError(error);
  throw new Error(userMessage);
}
```

## Before Committing

**Run this checklist:**

```bash
# 1. Compile TypeScript
npm run compile

# 2. Lint code
npm run lint

# 3. Run all tests
npm test

# 4. Update CLAUDE.md if needed
# Add new features to "Current Status" section
# Update "Last Updated" timestamp
```

All commands must pass with zero errors.

## Submitting Changes

### Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes following conventions above**

3. **Add tests for new functionality** (TDD)

4. **Update CLAUDE.md** if you added features

5. **Run pre-commit checklist** (compile, lint, test)

6. **Commit with descriptive message:**
   ```bash
   git commit -m "Add feature: description of what changed"
   ```

7. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

```
<type>: <description>

<optional body>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `perf`: Performance improvement
- `refactor`: Code refactoring
- `test`: Add/update tests
- `docs`: Documentation changes

**Example:**
```
feat: Add package.json caching for 99% I/O reduction

Implemented TTL-based caching with 60-second default.
Reduces file system calls from 100 to 1 during rapid enhancements.

Closes #42
```

## Architecture Guidelines

### AI Enhancement Flow

BetterPrompt uses a **smart fallback** strategy:

1. Analyze prompt vagueness (fast, local)
2. Check rate limit (10 requests/minute default)
3. Detect workspace context (cached)
4. Try GitHub Copilot (PRIMARY)
5. Fallback to Groq API if needed

**Important:** GitHub Copilot is the PRIMARY model, not Groq. Groq is only a fallback.

### Performance Best Practices

- **Cache expensive operations** (see `packageJsonCache.ts`)
- **Use async I/O** (never block VS Code UI)
- **Rate limiting** protects user quotas (see `rateLimiter.ts`)
- **Early returns** skip unnecessary work

### User Experience Priorities

1. **Transparency**: Users must know about quota consumption
2. **Fail gracefully**: Show actionable error messages
3. **Fast feedback**: No UI freezes (async everywhere)
4. **Minimal setup**: Works out-of-box with GitHub Copilot

## Getting Help

- **Read CLAUDE.md first** - It's the single source of truth
- **Check existing tests** for examples
- **Open an issue** if you're stuck
- **Ask questions** in pull requests

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
