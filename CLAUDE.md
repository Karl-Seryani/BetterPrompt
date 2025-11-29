# BetterPrompt - AI Context File

**Version:** 1.7.0
**Last Updated:** 2025-11-28

---

## Project Overview

VS Code extension that transforms vague prompts into detailed, actionable requests for GitHub Copilot. Use `@betterprompt` in Copilot Chat.

**Tech Stack:** TypeScript 5.3.3 (strict), VS Code Extension API 1.85+, Jest 29.7.0, natural (NLP)

**Directory Structure:**
- `core/` - Shared modules (analyzer, patterns, constants)
- `src/` - VS Code extension
  - `context/` - Workspace detection, package.json cache
  - `rewriter/` - AI prompt enhancement (Copilot → Groq fallback)
  - `chat/` - @betterprompt chat participant
  - `utils/` - Rate limiting, error handling, logging
- `mcp-server/` - Model Context Protocol server
- `tests/` - Unit + integration tests (mirrors src/ structure)

---

## Code Conventions

- **TypeScript:** No `any`, explicit return types, strict null checks
- **Testing:** TDD (RED → GREEN → REFACTOR), tests mirror src/
- **Before commit:** `npm run compile && npm run lint && npm test`

---

## Current Status

**Tests:** 347 extension tests + 29 MCP server tests (all passing, 90%+ coverage)

---

## v1.7.0 Changes (Complete)

### Quality & Maintainability Overhaul

#### 1. Proper NLP Library (`natural`)
- **Replaced:** Custom 100-line `simpleStem()` function with Porter Stemmer from `natural` library
- **Impact:** qualityAnalyzer.ts reduced from 954 to ~330 lines
- **Benefit:** Proper word stemming (implementing, implemented, implements → implement)

#### 2. Shared Pattern Definitions (`core/patterns.ts`)
- **New file:** Single source of truth for all pattern definitions
- **Exports:** FRAMEWORKS, LANGUAGES, VAGUE_VERBS, LEARNING_VERBS, VAGUE_WORDS, BROAD_TERMS, ACTION_VERBS, TECH_OBJECTS, STOP_WORDS, CONTEXT_PATTERNS, compiled regex patterns
- **Removed duplication:** Between core/analyzer.ts and src/rewriter/qualityAnalyzer.ts

#### 3. Shared Constants (`core/constants.ts`)
- **New file:** Centralized configurable values
- **Exports:** ENHANCEMENT_TIMEOUT_MS, DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW_MS, DEFAULT_VAGUENESS_THRESHOLD

#### 4. Integration Tests
- **New file:** `tests/integration/fullFlow.test.ts`
- **Coverage:** Full enhancement flow, cancellation handling, rate limiting, error scenarios, analyzer integration, model preference

#### 5. Context-Aware Error Messages
- **Fixed:** Generic "Please make sure GitHub Copilot is installed" for all errors
- **Now:** Specific hints for rate limits, missing API keys, cancellation, timeouts

#### 6. Cancellation Check After Context Detection
- **Fixed:** Missing cancellation check after `detectContext()` async call
- **Now:** Properly checks `isCancellationRequested` before making AI calls

#### 7. Rate Limiter Lifecycle Management
- **New:** `initializeRateLimiter(context)` function
- **Benefit:** Proper cleanup on extension deactivation via ExtensionContext subscriptions

### Files Changed in v1.7.0

| File | Change |
|------|--------|
| `package.json` | Version 1.7.0, added `natural` + `@types/natural` |
| `core/patterns.ts` | NEW: Shared pattern definitions |
| `core/constants.ts` | NEW: Shared constants |
| `core/analyzer.ts` | Imports from patterns.ts |
| `src/rewriter/qualityAnalyzer.ts` | Uses natural's PorterStemmer, imports patterns |
| `src/rewriter/promptRewriter.ts` | Added cancellation check after context detection |
| `src/chat/chatParticipant.ts` | Context-aware error messages, uses ENHANCEMENT_TIMEOUT_MS |
| `src/utils/rateLimiter.ts` | Added initializeRateLimiter(), uses constants |
| `src/extension.ts` | Calls initializeRateLimiter(context) |
| `tests/integration/fullFlow.test.ts` | NEW: Integration test suite |

---

## v1.6.1 Changes (Previous)

### Bug Fixes
- **Cancellation token support:** Now properly passed end-to-end from chat participant → rewriter → API calls
- **Timeout memory leak:** Fixed - timer now cleared on success/error
- **Confidence floor removed:** Was artificially flooring at 30%, now shows real values
- **Jest worker warning:** Fixed with proper test cleanup hooks

### Removed Features
- **Claude model option:** Removed misleading `preferredModel: "claude"` option (no actual Claude extension exists)

### Code Quality
- **Circular import hack removed:** `calculateConfidence` moved from `sharedPrompts.ts` to `qualityAnalyzer.ts` with proper static imports
- **Long regex patterns extracted:** Framework and vague words patterns now use string concatenation to stay under line length limit
- **Deleted empty `core 2/` directory**

---

## v1.6.0 Changes (Previous)

### Phase 1: Critical Fixes ✅
- Fixed version mismatch (package.json now 1.6.0)
- Fixed duplicate error message in chat participant
- Removed dead icon.png reference

### Phase 2: Intelligent Analyzer ✅
**Problem solved:** "build a REST API with JWT auth" is no longer penalized for containing "build"

**New Features:**
- `calculateSpecificityScore()` in `core/analyzer.ts` - Measures how detailed a prompt is
- Context-aware scoring: `finalScore = rawVagueness - (specificityScore * 0.8)`
- `specificityScore` field added to `AnalysisResult`

**Key behavior change:**
- `"build something"` → score ~85 (vague, needs enhancement)
- `"build a REST API with JWT authentication, rate limiting"` → score <30 (specific, skip enhancement)

### Phase 3: Real Confidence Score ✅
**Formula:**
```
confidence = (
  specificityGain * 0.35 +    // How much more specific did it get?
  actionability * 0.25 +      // Does it have clear actions/steps?
  issueCoverage * 0.25 +      // Did it address the detected issues?
  relevance * 0.15            // Did it stay on topic?
)
```

### Phase 4: Async Handling ✅
- Cancellation token support (fully working in v1.6.1)
- 30-second timeout with proper cleanup
- Comment explaining VS Code LM API limitation (system prompt as user message)

---

## Architecture

```
User Prompt
    ↓
[Vagueness Analysis] ← Scores prompt 0-100 + specificity score
    ↓
[Specificity Offset] ← High specificity reduces vagueness score
    ↓
[Threshold Check] ← Skip if score < 30
    ↓
[Rate Limit Check] ← 10 req/min default (lifecycle managed)
    ↓
[Context Detection] ← File, tech stack, selection, errors
    ↓
[Cancellation Check] ← NEW in v1.7.0
    ↓
[AI Enhancement]
    ├─ GitHub Copilot (primary, supports cancellation)
    └─ Groq API (fallback, supports cancellation via AbortController)
    ↓
[Quality Analysis] ← Real confidence score (using natural NLP)
    ↓
Enhanced Prompt
```

---

## Quick Reference

```bash
npm run compile   # Build
npm run lint      # Lint
npm test          # Run tests
npm run watch     # Watch mode
```

**Debug:** Press F5 in VS Code
