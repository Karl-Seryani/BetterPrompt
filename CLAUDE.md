# BetterPrompt - AI Context File

**Version:** 1.8.0
**Last Updated:** 2025-11-29

---

## Project Overview

VS Code extension that transforms simple prompts into detailed, actionable requests for GitHub Copilot. Use `@betterprompt` in Copilot Chat.

**Tech Stack:** TypeScript 5.3.3 (strict), VS Code Extension API 1.85+, Jest 29.7.0, natural (NLP)

**Directory Structure:**
- `core/` - Shared modules (analyzer, patterns, constants)
- `src/` - VS Code extension
  - `context/` - Tiered context detection (basic, structural, semantic)
  - `rewriter/` - AI prompt enhancement (Copilot → Groq fallback)
  - `chat/` - @betterprompt chat participant
  - `ml/` - ML vagueness analysis (TF-IDF + logistic regression)
  - `utils/` - Rate limiting, error handling, logging, telemetry
- `mcp-server/` - Model Context Protocol server
- `tests/` - Unit + integration tests (mirrors src/ structure)
- `data/training/` - 1251 labeled training samples

---

## Code Conventions

- **TypeScript:** No `any`, explicit return types, strict null checks, typed catch blocks (`catch (error: unknown)`)
- **Testing:** TDD (RED → GREEN → REFACTOR), tests mirror src/
- **Before commit:** `npm run compile && npm run lint && npm test`
- **Constants:** All thresholds/weights in `core/constants.ts`
- **Error handling:** All promises must have `.catch()` or be awaited

---

## Current Status

**Tests:** 615 passing (extension) + 29 passing (MCP server)

**All phases complete:**
- Phase 1: ImprovementBreakdown (replaces fake confidence %) ✅
- Phase 2: ML training data scaled to 1251 samples ✅
- Phase 3: Tiered context detection ✅

---

## Architecture

```
User Prompt
    ↓
[ML Vagueness Analysis] ← TF-IDF + Logistic Regression (1251 samples)
    ↓
[Hybrid Score] ← 70% ML + 30% Rules (if ML confidence ≥ 60%)
    ↓
[Threshold Check] ← Skip if score < 30
    ↓
[Rate Limit Check] ← 10 req/min (lifecycle managed)
    ↓
[Tiered Context Detection]
    ├─ Tier 1: Basic (file, tech stack, selection, errors)
    ├─ Tier 2: Structural (directories, file types, project patterns)
    └─ Tier 3: Semantic (functions, classes, imports - requires consent)
    ↓
[Cancellation Check]
    ↓
[AI Enhancement]
    ├─ GitHub Copilot (primary, supports cancellation)
    └─ Groq API (fallback, AbortController timeout)
    ↓
[Quality Analysis] ← ImprovementBreakdown (not fake %)
    ↓
Enhanced Prompt
```

---

## ML System

### Training Data (1251 samples)
- **Distribution:** 40% medium-specific, 30% medium-vague, 26% vague, 4% specific
- **Location:** `data/training/labeled-prompts.json`
- **Generation:** `BetterPrompt: Generate Training Data (Dev)` command

### Accuracy Targets
| Prompt Type | Score Range | Status |
|-------------|-------------|--------|
| Vague ("fix it") | ≥70 | ✅ Passing |
| Specific (with file paths) | ≤50 | ✅ Passing |
| Gap (vague - specific) | ≥20 | ✅ Passing |

### Model Persistence
```typescript
const service = MLVaguenessService.getInstance();
service.trainModel(labeledPrompts);
const json = service.exportModel();  // Save for bundling
service.importModel(json);            // Load pre-trained
```

---

## Context Detection

### Tier 1: Basic (Always Available)
- Current file path and language
- Tech stack detection (languages, frameworks)
- Selected code snippet
- Diagnostic errors

### Tier 2: Structural (Always Available)
- Directory structure patterns (src/, tests/, components/)
- File type distribution (TypeScript, Python, etc.)
- Project style detection (monorepo, webapp, API, library)
- Size metrics (files, directories, depth)

### Tier 3: Semantic (Requires Consent)
- Function signatures and exports
- Class structures and inheritance
- Import/export patterns
- Design pattern detection (singleton, factory, observer)

---

## Security

See `SECURITY.md` for full details:
- API keys stored in VS Code SecretStorage (OS keychain)
- Rate limiting prevents API abuse
- No input sanitization needed (prompts go to AI, not executed)
- Telemetry is opt-in only

---

## Quick Reference

```bash
npm run compile   # Build
npm run lint      # Lint
npm test          # Run all 615 tests
npm run watch     # Watch mode
```

**Debug:** Press F5 in VS Code

**Test ML:**
```bash
npm test -- --testPathPattern="mlAccuracy" --verbose
```
