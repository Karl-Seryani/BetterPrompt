# BetterPrompt - AI Context File

**Last Updated:** 2025-11-27
**Version:** 1.5.0
**Status:** Production Ready 🚀 - All Phases Complete

---

## ⚠️ CRITICAL INSTRUCTIONS

**BEFORE ANY CODE CHANGES:**
1. ✅ Read this file FIRST to understand current project state
2. ✅ Check "Current Status" section for what exists
3. ✅ Review "Code Conventions" for style guidelines

**AFTER MAKING CODE CHANGES:**
1. ✅ Update "Current Status" section
2. ✅ Update "Last Updated" timestamp at top
3. ✅ Verify changes align with project architecture
4. ✅ Run `npm run compile && npm run lint && npm test` before commit

**This file is the SINGLE SOURCE OF TRUTH for project state.**

---

## Project Overview

**BetterPrompt** is a VS Code extension for GitHub Copilot that transforms vague prompts into detailed, actionable requests. Use `@betterprompt` in Copilot Chat to get better AI responses.

**Key Features:**
- 🧠 Intelligent intent detection (BUILD, LEARN, FIX, IMPROVE, CONFIGURE)
- 📁 Context awareness (detects current file, tech stack, selected code, errors)
- ⚡ Fast vagueness analysis (<100ms, runs locally)
- 🔄 Smart fallback: GitHub Copilot → Groq → Error
- 🛡️ Rate limiting protection (10 requests/minute, configurable)
- 💬 User-friendly error messages with actionable steps

**Tech Stack:** TypeScript 5.3.3 (strict mode), VS Code Extension API 1.85+, Jest 29.7.0

**Main Directories:**
- `core/` - Shared analyzer module (used by both extension and MCP server)
- `src/` - VS Code extension source
  - `context/` - Workspace context detection + package.json caching (v1.5.0)
  - `rewriter/` - AI prompt enhancement
  - `chat/` - @betterprompt chat participant
  - `utils/` - Rate limiting, caching, error handling (v1.5.0)
- `mcp-server/` - Model Context Protocol server
- `tests/` - Unit tests (mirrors src/ structure)

---

## Current Status

### ✅ ALL TESTS PASSING (189/189 + 29 MCP)

**Test Coverage:**
- ✅ **189/189 extension tests passing (100%)**
- ✅ **29/29 MCP server tests passing (100%)**
- ✅ Analyzer: 40 tests
- ✅ Rewriter: 14 tests (including context awareness)
- ✅ VS Code LM Rewriter: 29 tests
- ✅ Context Detector: 7 tests
- ✅ Chat Participant: 16 tests
- ✅ Onboarding: 8 tests
- ✅ **NEW:** Rate Limiter: 21 tests
- ✅ **NEW:** Rate Limit Integration: 8 tests
- ✅ **NEW:** Error Handler: 25 tests
- ✅ **NEW:** Package.json Cache: 12 tests
- ✅ **NEW:** Logger: 10 tests

### 🎉 v1.5.0-beta Completed Features

**Phase 1: CRITICAL (All Complete ✅)**

**Phase 1.1 - Remove Database (COMPLETE)**
- ✅ Removed `src/db/database.ts` (236 lines)
- ✅ Removed `src/db/schema.ts` (109 lines)
- ✅ Removed `tests/unit/db/database.test.ts` (279 lines, 19 tests)
- ✅ Removed `sql.js` dependency from package.json (220MB bloat eliminated)
- ✅ Updated CLAUDE.md and package.json
- **Result:** 624 lines removed, 220MB bundle size reduction

**Phase 1.2 - Rate Limiting (COMPLETE)**
- ✅ Created `src/utils/rateLimiter.ts` (123 lines)
  - Sliding window algorithm (not fixed window)
  - Default: 10 requests/minute (configurable)
  - Dynamic countdown: `getTimeUntilReset()`
  - Global singleton pattern
- ✅ Created `tests/unit/utils/rateLimiter.test.ts` (21 tests)
- ✅ Created `tests/unit/rewriter/rateLimitIntegration.test.ts` (8 tests)
- ✅ Integrated into `src/rewriter/promptRewriter.ts`
  - Checks rate limit BEFORE API calls (line 79-88)
  - Records successful requests (lines 102, 111, 126)
- ✅ Added configuration: `betterprompt.maxRequestsPerMinute` (default: 10)
- **Result:** Prevents quota exhaustion for live users

**Phase 1.3 - Error Handler (COMPLETE)**
- ✅ Created `src/utils/errorHandler.ts` (226 lines)
  - 7 error categories: QUOTA_EXCEEDED, AUTH_FAILED, NETWORK_ERROR, TIMEOUT, MODEL_UNAVAILABLE, PERMISSION_DENIED, UNKNOWN
  - Pattern-based categorization (no hardcoded logic)
  - User-friendly messages with actionable steps
  - Handles nested error structures
- ✅ Created `tests/unit/utils/errorHandler.test.ts` (25 tests)
- ✅ Integrated into `src/rewriter/groqRewriter.ts` (line 66-68)
- ✅ Integrated into `src/rewriter/vscodeLmRewriter.ts` (line 84-86)
- ✅ Updated all test expectations in `vscodeLmRewriter.test.ts`
- **Result:** Users see "Permission denied. Please grant..." instead of "LanguageModelError: ..."

**Phase 2.1 - Package.json Cache (COMPLETE)**
- ✅ Created `src/context/packageJsonCache.ts` (97 lines)
  - TTL-based caching (60-second default, configurable)
  - Global singleton pattern
  - Handles JSON parse errors gracefully
  - Methods: `get()`, `invalidate()`, `clear()`
- ✅ Created `tests/unit/context/packageJsonCache.test.ts` (12 tests)
- ✅ Integrated into `src/context/contextDetector.ts`
  - Replaced `fs.readFileSync` + `JSON.parse` with cached version (line 113-116)
  - Removed unnecessary try-catch (cache handles errors)
- **Result:** 99% reduction in file I/O (100 calls = 1 read instead of 100)

**Phase 2.2 - Async File Operations (COMPLETE)**
- ✅ Created `fileExists()` helper using `fs.promises.access()`
- ✅ Converted `PackageJsonCache.get()` to async with `fs.promises.readFile()`
- ✅ Converted `detectTechStack()` to async (all 8+ `fs.existsSync()` calls → async)
- ✅ Converted `detectContext()` to async
- ✅ Updated `promptRewriter.ts` to await `detectContext()`
- ✅ Updated all cache tests to async/await pattern
- **Result:** Zero blocking I/O operations, VS Code stays responsive during file checks

**Phase 3 - Developer Experience (COMPLETE ✅)**
- ✅ Added `.env.example` with Groq API key template and usage notes
- ✅ Added `CONTRIBUTING.md` with comprehensive development setup guide
  - Development setup instructions
  - Project structure documentation
  - Code conventions and TDD methodology
  - Testing and debugging guides
  - PR submission guidelines
- ✅ Added debug logging system (`src/utils/logger.ts`)
  - VS Code Output panel integration
  - Configurable via `betterprompt.debugLogging` setting (default: false)
  - Multiple log levels: debug, info, warn, error
  - Integrated into extension.ts and promptRewriter.ts for troubleshooting
  - 10 comprehensive unit tests
- **Result:** Better developer onboarding for the 4 contributors + easier debugging for all 6 users

### ✅ Implemented Features

**v1.5.0 - Production Hardening & Developer Experience:**
- `src/utils/rateLimiter.ts` - Rate limiting protection (10 req/min)
- `src/utils/errorHandler.ts` - User-friendly error messages (7 categories)
- `src/utils/logger.ts` - Debug logging system (VS Code Output panel)
- `src/context/packageJsonCache.ts` - Package.json caching (99% I/O reduction)
- `.env.example` - Environment variable template
- `CONTRIBUTING.md` - Comprehensive development guide
- **NO DATABASE** - Removed sql.js entirely (220MB saved)

**v1.3.0 - Context Awareness:**
- `src/context/contextDetector.ts` - Detects workspace context
  - Current file path and language
  - Tech stack from package.json (React, Next.js, Vue, etc.)
  - Selected code in editor
  - Diagnostics (errors/warnings in current file)
- Context automatically included in prompt enhancement

**v1.2.0 - Intelligent Intent Detection:**
- System detects intent: BUILD, LEARN, FIX, IMPROVE, CONFIGURE
- Adapts response style based on intent
- Scope awareness: Small → concise, Large → phased approach

**Core Functionality:**
- `core/analyzer.ts` - Shared vagueness detection module
- `src/rewriter/groqRewriter.ts` - Groq AI (Llama 3.3 70B) with error handling
- `src/rewriter/vscodeLmRewriter.ts` - VS Code Language Model API (GitHub Copilot)
- `src/rewriter/promptRewriter.ts` - Orchestration with smart fallback + rate limiting
- `src/rewriter/sharedPrompts.ts` - Intelligent system prompts
- `src/chat/chatParticipant.ts` - @betterprompt chat integration
- `src/extension.ts` - VS Code integration

**Commands:**
- `betterprompt.optimizePrompt` - Main optimization command (Cmd+Shift+E)
- `betterprompt.showSettings` - Opens VS Code settings
- `betterprompt.resetOnboarding` - Reset onboarding (testing)

**Settings:**
- `betterprompt.enabled` - Enable/disable extension (default: true)
- `betterprompt.groqApiKey` - Groq API key for fallback (optional)
- `betterprompt.vaguenessThreshold` - Min score to trigger rewrite (default: 30)
- `betterprompt.chatMode` - Default chat behavior: review/auto
- `betterprompt.showDiff` - Show before/after diff (default: true)
- `betterprompt.preferredModel` - Preferred AI model: auto/gpt-4/claude/groq (default: auto)
- `betterprompt.maxRequestsPerMinute` - Rate limit (default: 10, range: 1-100)
- `betterprompt.debugLogging` - Enable debug logging to Output panel (default: false)

---

## Architecture

### AI Enhancement Flow

```
User Prompt
    ↓
[Vagueness Analysis] ← Scores prompt 0-100 (fast, local)
    ↓
[Threshold Check] ← Skip if score < 30
    ↓
[Rate Limit Check] ← Prevent quota exhaustion (10/min)
    ↓
[Context Detection] ← Detects file, tech stack, selection, errors
    │                  (Uses cached package.json for performance)
    ↓
[Intent Detection] ← BUILD/LEARN/FIX/IMPROVE/CONFIGURE
    ↓
[AI Enhancement - Smart Fallback]
    ├─ preferredModel = "groq" → Use Groq API
    ├─ preferredModel = "auto" (default)
    │   ├─ Try: GitHub Copilot (VS Code LM API)
    │   │   ├─ GPT-4 (preferred)
    │   │   ├─ Claude (fallback)
    │   │   └─ First available
    │   └─ Fallback: Groq API (if configured)
    └─ Error: User-friendly message with next steps
    ↓
Enhanced Prompt + Context
```

### How GitHub Copilot is Used (PRIMARY, NOT GROQ)

**Default User Experience:**
1. User installs BetterPrompt (has GitHub Copilot already)
2. Extension uses `vscode.lm.selectChatModels()` API
3. Finds GPT-4/Claude models from GitHub Copilot
4. Enhances prompts using Copilot (NO Groq API key needed)
5. Falls back to Groq only if Copilot fails or quota exceeded

**⚠️ Transparency About Quota Usage:**
- Onboarding message clearly states: "I enhance your prompts using GitHub Copilot (consumes your Copilot quota)"
- Settings description warns: "Using Copilot options will consume your GitHub Copilot quota"
- Users can click "Use Groq Instead" during onboarding to preserve Copilot quota
- Groq option prominently displayed as: "Always use free Groq API (preserves Copilot quota)"

**VS Code Language Model API** (`src/rewriter/vscodeLmRewriter.ts`):
- `isVsCodeLmAvailable()` - Checks if Copilot installed (line 18-24)
- `selectModel()` - Prefers GPT-4 > Claude > First available (line 93-130)
- Uses official `vscode.lm` API (not custom HTTP calls)

**Groq as Fallback Only:**
- Used when: User sets `preferredModel: "groq"`, Copilot unavailable, or Copilot quota exceeded
- Free tier: 30 requests/minute (more generous than Copilot)
- Model: Llama 3.3 70B

### Shared Core Module

The analyzer logic lives in `core/analyzer.ts` and is shared by:
- VS Code extension (direct import)
- MCP server (direct import)

### Performance Optimizations

**Package.json Caching** (`src/context/packageJsonCache.ts`):
- TTL: 60 seconds (configurable)
- Global singleton prevents duplicate caches
- Test proves: 100 calls = 1 file read (99% I/O reduction)
- Handles JSON parse errors gracefully (returns null)

**Rate Limiting** (`src/utils/rateLimiter.ts`):
- Sliding window algorithm (not fixed window)
- O(1) lookup time
- Cleans expired timestamps automatically
- Test proves: Dynamic countdown (60s → 58s after 2s wait)

---

## Code Conventions

### TypeScript (STRICT)
- ❌ No `any` types
- ❌ No `console.log` in production code
- ✅ Explicit return types on all functions
- ✅ Strict null checks enabled

### Testing (TDD Methodology Used)
- Test files mirror src/ structure
- RED → GREEN → REFACTOR cycle
- All tests must pass before commit
- Integration tests prove dynamic behavior (not hardcoded)

### Before Commit Checklist
```bash
npm run compile  # Must pass
npm run lint     # Must pass (0 errors)
npm test         # Must pass (179/179)
```

---

## Implementation Plan (Original Plan from Session)

### ✅ Phase 1: CRITICAL (All Complete)
- ✅ Phase 1.1: Remove database (sql.js) - 624 lines removed, 220MB saved
- ✅ Phase 1.2: Add rate limiting - 10 requests/minute default
- ✅ Phase 1.3: Improve error messages - 7 categories with actionable steps

### ✅ Phase 2: PERFORMANCE (Complete)
- ✅ Phase 2.1: Cache package.json parsing - 99% I/O reduction
- ✅ Phase 2.2: Convert to async file operations - Zero blocking I/O

### 🔲 Phase 3: DEVELOPER EXPERIENCE (Pending)
- 🔲 Add .env.example
- 🔲 Add CONTRIBUTING.md
- 🔲 Add debug logging

---

## Next Steps for Continuation

**Current Task:** Phase 3 - Developer Experience Improvements (Optional)

**What needs to be done:**
1. Add `.env.example` with Groq API key template
2. Add `CONTRIBUTING.md` with development setup guide
3. Add debug logging configuration (disabled by default)

**Files to create:**
- `.env.example` - Environment variable template
- `CONTRIBUTING.md` - Developer onboarding guide

**Phase 2 Complete Status:**
- ✅ All performance optimizations complete
- ✅ Zero blocking I/O operations
- ✅ 99% reduction in file reads (caching)
- ✅ Professional-grade extension quality

**Important notes:**
- Phase 3 is optional for production readiness
- Extension is already production-ready after Phase 2
- These improvements help future contributors

---

## Quick Reference

**Debug Extension:** Press `F5` in VS Code
**Watch Mode:** `npm run watch`
**Run Tests:** `npm test`
**Run MCP Tests:** `cd mcp-server && npm test`
**Lint & Fix:** `npm run lint:fix`
**Package Extension:** `npm run package`

**Project Path:** `/Users/karlseryani/.claude-worktrees/BetterPrompt/recursing-leavitt`

---

## Session Summary (What Was Done)

**Completed across sessions:**
1. ✅ Removed entire database module (sql.js) - Phase 1.1
2. ✅ Implemented rate limiting with TDD - Phase 1.2
3. ✅ Implemented error handler with TDD - Phase 1.3
4. ✅ Implemented package.json cache with TDD - Phase 2.1
5. ✅ Converted to async file operations - Phase 2.2
6. ✅ Added transparency about Copilot quota usage - UX Fix
7. ✅ Added debug logging system - Phase 3.1
8. ✅ Created .env.example - Phase 3.2
9. ✅ Created CONTRIBUTING.md - Phase 3.3

**Test results:**
- Started: 133 tests passing
- Final: 189 tests passing (+56 new tests)
- All phases verified with integration tests (not hardcoded)
- Zero blocking I/O operations (all async)

**User impact (6 live users):**
- 🛡️ Protected from quota exhaustion (rate limiting)
- 💬 Better error messages (actionable steps, not technical jargon)
- ⚡ Faster prompt enhancements (caching eliminates 99% of file I/O)
- 📦 Smaller extension bundle (220MB sql.js removed)
- 🚀 VS Code stays responsive during file operations (async I/O)
- 🚀 No UI freezes on network drives or slow storage
- 🔔 Transparent about Copilot quota consumption (onboarding + settings)
- 🔔 Easy opt-in to free Groq API to preserve Copilot quota
- 🐛 Debug logging available for troubleshooting (View → Output → BetterPrompt)
- 📚 CONTRIBUTING.md helps the 4 contributors get started

---

**Last Updated:** 2025-11-27
**Test Status:** 189/189 extension + 29/29 MCP server
**Production Status:** ALL PHASES COMPLETE 🎉 - Production Ready 🚀
