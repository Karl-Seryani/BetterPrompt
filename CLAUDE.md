# BetterPrompt - AI Context File

**Version:** 1.8.0-dev
**Last Updated:** 2025-11-29

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
  - `ml/` - Machine learning vagueness analysis (NEW in v1.8.0)
  - `utils/` - Rate limiting, error handling, logging
- `mcp-server/` - Model Context Protocol server
- `tests/` - Unit + integration tests (mirrors src/ structure)
- `data/training/` - ML training data (generated via Copilot)

---

## Code Conventions

- **TypeScript:** No `any`, explicit return types, strict null checks
- **Testing:** TDD (RED → GREEN → REFACTOR), tests mirror src/
- **Before commit:** `npm run compile && npm run lint && npm test`
- **Constants:** All thresholds/weights in `core/constants.ts`, no hardcoded values in business logic

---

## Current Status

**Tests:** 537 extension tests + 29 MCP server tests (all passing)

---

## v1.8.0-dev Changes (In Progress)

### Phase 1: ML-Based Vagueness Analysis ✅ COMPLETE

Built a complete ML pipeline for vagueness detection:

#### New Files Created:
| File | Purpose |
|------|---------|
| `src/ml/trainingDataGenerator.ts` | Generates labeled training data via Copilot |
| `src/ml/featureExtractor.ts` | TF-IDF vectorization for text → numbers |
| `src/ml/classifier.ts` | Logistic regression with gradient descent |
| `src/ml/mlAnalyzer.ts` | Unified ML interface (train/analyze/serialize) |
| `src/ml/hybridAnalyzer.ts` | ML + Copilot LLM fallback for low confidence |
| `src/ml/vaguenessService.ts` | Singleton service for extension integration |

#### How It Works:
1. **Training Data Generation** (one-time via command):
   - Command: `BetterPrompt: Generate Training Data (Dev)`
   - Uses Copilot to label ~220 prompt templates with vagueness scores
   - Outputs: `data/training/labeled-prompts.json`

2. **ML Pipeline**:
   ```
   Prompt → TF-IDF Vectorizer → Feature Vector → Logistic Regression → Score (0-100)
   ```

3. **Hybrid Analysis** (MLVaguenessService):
   - Runs rule-based analysis (fast, provides issues)
   - If ML trained + confidence ≥ 60%: combines scores (70% ML + 30% rules)
   - If ML confidence low: falls back to rules only

#### Test ML Locally:
```bash
# Generate training data first (in VS Code Extension Host)
# Then test:
npm test -- --testPathPattern="testVagueness" --verbose
```

### Phase 2: AI Comparative Scorer (NEXT)
- Replace heuristic confidence with AI-based comparison

### Phase 3: Context Detection (PENDING)
- Tier 1: Basic (current file, tech stack)
- Tier 2: Structural (imports, exports, types)
- Tier 3: Semantic (with user consent)

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

---

## Architecture

```
User Prompt
    ↓
[ML Vagueness Analysis] ← NEW: TF-IDF + Logistic Regression (if trained)
    ↓
[Rule-Based Analysis] ← Scores prompt 0-100 + specificity score
    ↓
[Hybrid Score] ← 70% ML + 30% Rules (if ML confident)
    ↓
[Threshold Check] ← Skip if score < 30
    ↓
[Rate Limit Check] ← 10 req/min default (lifecycle managed)
    ↓
[Context Detection] ← File, tech stack, selection, errors
    ↓
[Cancellation Check]
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

## ML System Details

### Training Data Format:
```json
{
  "prompt": "fix it",
  "vaguenessScore": 90,
  "intentCategory": "fix",
  "missingElements": ["what", "where"],
  "reasoning": "Very vague, no context"
}
```

### Model Persistence:
```typescript
const service = MLVaguenessService.getInstance();
service.trainModel(labeledPrompts);
const json = service.exportModel();  // Save for bundling
service.importModel(json);            // Load pre-trained
```

### Current Accuracy (100 samples):
| Prompt Type | Score Range | Status |
|-------------|-------------|--------|
| Vague ("fix it") | 87-94 | ✅ Correct |
| Medium ("fix the login bug") | 71-83 | ✅ Correct |
| Specific (with file paths) | 65-70 | ⚠️ Needs more training data |

---

## Quick Reference

```bash
npm run compile   # Build
npm run lint      # Lint
npm test          # Run tests (537 total)
npm run watch     # Watch mode
```

**Debug:** Press F5 in VS Code

**Test ML:**
```bash
npm test -- --testPathPattern="testVagueness" --verbose
```

**Generate Training Data:** Run command `BetterPrompt: Generate Training Data (Dev)` in Extension Host
