# BetterPrompt - AI Context File

**Last Updated:** 2025-01-10
**Status:** Sprint 3 COMPLETE ✅ | Sprint 4 IN PROGRESS 🚀

---

## ⚠️ CRITICAL INSTRUCTIONS

**BEFORE ANY CODE CHANGES:**
1. ✅ Read this file FIRST to understand current project state
2. ✅ Check "Current Status" section for what exists
3. ✅ Review "Code Conventions" for style guidelines
4. ✅ Understand the current sprint objectives

**AFTER MAKING CODE CHANGES:**
1. ✅ Update "Current Status" section
2. ✅ Update "Last Updated" timestamp at top
3. ✅ Verify changes align with project architecture
4. ✅ Run `npm run compile && npm run lint` before commit

**This file is the SINGLE SOURCE OF TRUTH for project state.**

---

## Project Overview

**BetterPrompt** is a VS Code extension that crafts better prompts for AI coding assistants through intelligent analysis and AI-powered enhancement. It analyzes prompts for vagueness, enhances them using Groq AI with persona-based improvements, and shows before/after diffs for user approval.

**Tech Stack:** TypeScript 5.3.3 (strict mode), VS Code Extension API 1.85+, sql.js 1.10.3, Jest 29.7.0, Node.js 20.x

**Recent Change:** Renamed from "PromptForge" to "BetterPrompt" to avoid marketplace confusion.

**Main Directories:**
- `src/` - Source code (extension.ts, analyzer/, rewriter/, db/)
- `tests/` - Unit tests (mirrors src/ structure)
- `docs/` - Requirements, technical specs, user stories

---

## Current Status

### ✅ Sprint 2 COMPLETE (Core MVP)

**Implemented:**
- `src/analyzer/promptAnalyzer.ts` - Vagueness detection (<100ms)
- `src/rewriter/groqRewriter.ts` - Groq AI integration (Llama 3.3 70B)
- `src/rewriter/vscodeLmRewriter.ts` - VS Code Language Model API integration ✅ NEW
- `src/rewriter/promptRewriter.ts` - Orchestration layer with intelligent fallback
- `src/extension.ts` - Full VS Code integration with diff viewer + onboarding flow
- `src/db/database.ts` - sql.js database manager
- `src/db/schema.ts` - Database schema (templates, history, analytics)

**Features Working:**
1. Vagueness analysis (client-side scoring)
2. AI-powered enhancement with **smart fallback**: VS Code LM → Groq → Error ✅ NEW
3. Persona system (Auto/Beginner/Developer modes) with first-run onboarding ✅ NEW
4. Before/after diff viewer
5. User approval flow (View/Copy/Dismiss)
6. Error handling (30s timeout, graceful failures)
7. Zero-config support for Copilot/Claude Code users ✅ NEW

**Commands:**
- `betterprompt.optimizePrompt` - Main optimization command ✅
- `betterprompt.resetOnboarding` - Reset onboarding flow (Testing only) ✅
- `betterprompt.showSettings` - Settings panel (Sprint 4)
- `betterprompt.showAnalytics` - Analytics dashboard (Sprint 4)
- `betterprompt.manageTemplates` - Template manager (Sprint 4)

**Settings (package.json):**
- `betterprompt.enabled` - Enable/disable extension (default: true) ✅
- `betterprompt.groqApiKey` - Groq API key for fallback (optional) ✅
- `betterprompt.userLevel` - Experience level: auto/beginner/developer (default: auto) ✅
- `betterprompt.preferredModel` - Model preference: auto/gpt-4/claude/groq (default: auto) ✅ NEW
- `betterprompt.vaguenessThreshold` - Min score to trigger rewrite (default: 30) ✅
- `betterprompt.autoOptimize` - Auto-optimize without confirmation (default: false) ✅
- `betterprompt.showDiff` - Show before/after diff (default: true) ✅

### ✅ Sprint 3 COMPLETE (Advanced Features + TDD Enforcement)

**Completed Features:**
- ✅ First-run onboarding flow with persona selection (Developer/Beginner/Auto)
- ✅ Persona-based prompt enhancement fully integrated (Developer/Beginner/Auto modes)
- ✅ Fixed TypeScript strict mode violations (no `any` types)
- ✅ Reset onboarding command for testing (`betterprompt.resetOnboarding`)
- ✅ VS Code Language Model API integration (Copilot/Claude Code support)
- ✅ Intelligent fallback system: VS Code LM → Groq → Error
- ✅ Zero-config experience for Copilot/Claude Code users
- ✅ User preference for model selection (Auto/GPT-4/Claude/Groq)
- ✅ Model name displayed in enhancement notification
- ✅ **Chat Participant (@betterprompt)** - GitHub Copilot integration with review/auto modes ✅ NEW
- ✅ **MCP Server** - Model Context Protocol integration for Claude Code ✅ NEW
- ✅ Project-specific `.claude.json` for MCP configuration ✅ NEW

**Test Coverage (COMPREHENSIVE):**
- ✅ **111/125 tests passing (89% pass rate)** - Up from 86%!
- ✅ **25 NEW tests added this session** (16 Chat Participant + 9 Model Selection)
- ✅ Analyzer: 96.42% coverage (27/27 tests)
- ✅ Rewriter: 94.11% coverage (29/29 tests - VS Code LM: 100%)
- ✅ Onboarding: 21/21 tests passing (100% coverage)
- ✅ Chat Participant: 16/16 tests passing (100% coverage) ✅ NEW
- ✅ Model Selection: 9/9 new tests passing (100% coverage) ✅ NEW
- ✅ MCP Server: 30/30 tests passing (14 promptEngine + 16 integration) ✅ NEW
- ⚠️ 14 database tests failing (async initialization - deferred to Sprint 4)

**Files Added:**
- `src/chat/chatParticipant.ts` - VS Code Chat Participant handler
- `tests/unit/chat/chatParticipant.test.ts` - 16 comprehensive tests
- `mcp-server/` - Full MCP server package (standalone)
- `mcp-server/src/index.ts` - MCP server implementation
- `mcp-server/src/promptEngine.ts` - Core analysis/enhancement logic
- `mcp-server/tests/` - 30 tests for MCP server
- `.claude.json` - Project-specific MCP configuration

**TDD Compliance:**
- ✅ All TDD violations from this session **resolved with tests**
- ✅ Enhanced CLAUDE.md with 6-step TDD workflow + regression testing
- ✅ Zero regressions in existing tests
- ✅ Comprehensive test coverage for all new features

**Deferred to Sprint 4:**
- Fix database async initialization (14 failing tests)
- Analytics tracking (acceptance rate, token savings, model usage)
- Integration tests for full optimization workflow

### 📅 Sprint 4 (Polish & Launch Prep)

**High Priority:**
- Fix database async initialization (14 failing tests)
- Analytics tracking (acceptance rate, token savings, model usage)
- Integration tests for full optimization workflow
- Performance optimization and monitoring

**Medium Priority:**
- Template management UI
- Analytics dashboard webview
- Keyboard shortcuts (e.g., Cmd+Shift+P → "Optimize")
- Context menu integration (right-click → "Optimize Prompt")

**Future:**
- Marketplace launch preparation
- Extension icon and branding
- Comprehensive documentation
- Video demo/tutorial

---

## Key Architectural Decisions

### 1. AI Rewriting Strategy ⭐ CRITICAL

**Decision:** Hybrid approach - VS Code Language Model API + Groq fallback
**Date:** 2025-01-08
**User Requirement:** "AI-powered, must be free, no setup wizards"

**Architecture:**
```typescript
// Auto-detection on activation (zero config)
1. Try: VS Code Language Model API (uses Copilot/Claude Code if available)
2. Fallback: Groq API (free, fast, Llama models)
3. No setup wizard - works immediately after install
```

**Implementation Timeline:**
- **Sprint 2 (Current):** Groq API only (mixtral-8x7b-32768)
- **Sprint 3:** Add VS Code LM API detection + auto-fallback
- **Sprint 4:** Optional BYOK for power users (Groq/HuggingFace/Together AI)

**Why This Approach:**
- ✅ Zero setup friction (critical for adoption)
- ✅ Free for everyone (Groq free tier unlimited, or user's existing AI sub)
- ✅ Better quality than rule-based (user explicitly rejected rules)
- ✅ Works offline after initial setup

**Why NOT Rule-Based:**
- ❌ User explicitly rejected this
- ❌ Lower quality, inflexible patterns
- ❌ High maintenance burden

**Risk Mitigation:**
- If Groq becomes paid → Switch to HuggingFace or add BYOK
- VS Code LM API changes → Groq fallback still works

### 2. Database: sql.js (NOT better-sqlite3)

**Decision:** Use sql.js instead of better-sqlite3
**Reason:** better-sqlite3 requires native compilation (node-gyp) - had macOS permission issues
**Trade-off:** Slightly slower, but pure JavaScript (no compilation needed)
**API Impact:** `db.initialize()` is async (returns Promise)

**Schema:** 3 tables - `user_templates`, `prompt_history`, `analytics` (see src/db/schema.ts for details)

### 3. Data Storage & Privacy

**Decision:** Local-only SQLite (VS Code extension global storage)
- No cloud sync
- No telemetry without consent
- Code never transmitted externally
- Works offline

---

## Code Conventions

### TypeScript (STRICT)
- ❌ No `any` types (use `unknown` with type guards)
- ✅ Explicit return types on all functions
- ✅ Strict null checks enabled
- ❌ No `console.log` (use proper logging)
- ❌ No unused variables (prefix with `_` if intentional)

### Functions & Files
- Max 50 lines per function
- Single responsibility principle
- JSDoc comments for public APIs
- File naming: `camelCase.ts`, classes: `PascalCase`

### Testing (TDD Required) ⚠️ CRITICAL - ABSOLUTE TOP PRIORITY

**🚨 THIS IS THE #1 PRIORITY. VIOLATING TDD IS UNACCEPTABLE. 🚨**

**MANDATORY WORKFLOW - NO EXCEPTIONS:**

1. **STOP** - Before writing ANY code, ask yourself: "Have I written the tests?"
   - If NO → Write tests FIRST, then come back
   - If YES → Proceed

2. **Write Tests FIRST** (TDD - Red Phase)
   - Create test file BEFORE any implementation
   - Write failing tests for ALL expected behavior
   - **Review test cases** - Are they complete? Do they cover edge cases?
   - Run `npm test` to confirm they fail (must see red)
   - ❌ **NEVER SKIP THIS STEP**

3. **Implement Feature** (Green Phase)
   - Write minimal code to make tests pass
   - Run `npm test` to confirm they pass (must see green)
   - If tests don't pass, fix implementation, NOT tests
   - **Review implementation** - Does it do what user asked? Is it clean?

4. **Regression Testing** (Integration Check)
   - Run **FULL test suite** (`npm test`) to ensure nothing broke
   - Check that ALL existing tests still pass
   - If any test fails, fix the new code, NOT the old tests
   - **Verify integration** - Does new feature work with existing features?

5. **Refactor** (Refactor Phase)
   - Clean up code while keeping all tests green
   - Run `npm test` after each refactor
   - Ensure code quality and readability

6. **Show Results to User**
   - Present implementation
   - Show test results with coverage report
   - Show that ALL tests pass (new + existing)
   - **WAIT FOR USER TO MANUALLY TEST**
   - ❌ **NEVER mark feature as "complete" without user approval**

**Test Requirements:**
- Test files mirror src/ structure: `src/analyzer/` → `tests/unit/analyzer/`
- Descriptive names: `it('should detect vague verbs in prompts', ...)`
- Arrange-Act-Assert pattern
- **Minimum 80% coverage per file**
- All tests must pass before showing to user
- **NO CODE WITHOUT TESTS - PERIOD**
- **Test EVERYTHING** - Every function, every feature, every edge case

**After Every Feature:**
- ✅ Run full test suite to ensure no regressions
- ✅ Verify integration with existing features
- ✅ Check that nothing else broke
- ✅ Confirm all tests still pass

**PRD Compliance:**
- Every feature must have corresponding PRD section
- Implementation must match PRD specifications exactly
- Any deviations require user approval FIRST

**Recent TDD Violations to NEVER Repeat:**
- ❌ Chat Participant - implemented without tests
- ❌ Model selection preference - implemented without tests
- ❌ MCP server index.ts - implemented without tests
- ❌ Onboarding flow - implemented without tests first (fixed later)
- ❌ VS Code LM integration - implemented without tests first (fixed later)
- ✅ ALWAYS write tests BEFORE implementation from now on

### Commits
- Format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`
- Example: `feat(analyzer): add vague verb detection`

### Before Commit Checklist
```bash
npm run compile  # Must pass
npm run lint     # Must pass with no errors
npm test         # Must pass with >80% coverage
npm run format   # Auto-format
```

---

## Performance Requirements

**Hard Requirements:**
- Prompt analysis: **<100ms** ✅
- Database queries: **<20ms**
- Extension activation: **<500ms**

**Optimization Strategy:** Regex caching, prepared statements, debounced inputs

---

## Configuration Settings

**User Settings (package.json):**
- `betterprompt.enabled` - Enable/disable extension (default: true)
- `betterprompt.groqApiKey` - Groq API key for AI enhancement
- `betterprompt.userLevel` - Experience level (auto/beginner/developer)
- `betterprompt.vaguenessThreshold` - Min score to trigger rewrite (default: 30)
- `betterprompt.autoOptimize` - Auto-optimize without confirmation
- `betterprompt.showDiff` - Show before/after diff view

---

## MCP Servers Configured

**Active in Claude Code (6 servers):**
1. ✅ **betterprompt** - BetterPrompt's own MCP server for prompt analysis/enhancement ✅ NEW
2. ✅ **context7** - Up-to-date library documentation (add "use context7" to prompts for latest docs)
3. ✅ **filesystem** - File operations (scoped to BetterPrompt directory)
4. ✅ **memory** - Knowledge graph for context persistence across sessions
5. ✅ **sequential-thinking** - Complex problem-solving and algorithm design assistance
6. ✅ **brave-search** - Web search capabilities (API key configured)

**Configuration Locations:**
- Global: `~/.claude.json` (context7, filesystem, memory, sequential-thinking, brave-search)
- Project-specific: `.claude.json` (betterprompt MCP server) ✅ NEW

**Usage Notes:**
- MCP servers load on session start - restart Claude Code after adding new servers
- Use `/mcp` command to verify servers are loaded in current session
- Tools are automatically available (no need to explicitly invoke servers)

**Why These Servers:**
- `context7` → Always-current library docs (Node.js, TypeScript, VS Code API, Jest)
- `filesystem` → Enhanced file operations beyond standard VS Code tools
- `memory` → Maintain project context across multiple coding sessions
- `sequential-thinking` → Break down complex refactoring/architectural tasks
- `brave-search` → Research APIs, best practices, troubleshooting

---

## Important Notes

### When Adding New Files
1. Update "Current Status" section in this file
2. Create corresponding test file (TDD)
3. Run `npm run compile && npm run lint`
4. Update timestamp at top of this file

### When Modifying Database Schema
1. Update `src/db/schema.ts`
2. Update TypeScript interfaces
3. Update database tests
4. Create migration (when migrations.ts exists)

### When Adding Dependencies
1. Check license compatibility (MIT-compatible only)
2. Run `npm audit` after install
3. Document reason in PR/commit message

### Known Issues
- ⚠️ Database async initialization needs fixes (Sprint 3)
- ⚠️ 14 database tests failing (deferred to Sprint 3)

---

## Quick Reference

**Debug Extension:** Press `F5` in VS Code
**Watch Mode:** `npm run watch`
**Run Tests:** `npm test`
**Lint & Format:** `npm run lint:fix && npm run format`
**Package Extension:** `npm run package`

**Project Docs:**
- `docs/requirements.md` - Complete requirements
- `docs/technical-spec.md` - Technical architecture
- `docs/user-stories.md` - 24 user stories
- `TESTING.md` - Manual testing guide
- `SETUP.md` - Development setup

---

**Last Updated:** 2025-01-10
**Sprint Progress:** 3/4 Complete (75%)
**Next Milestone:** Sprint 4 - Database fixes, Analytics, Integration tests
