# BetterPrompt - AI Context File

**Last Updated:** 2025-11-26
**Version:** 1.3.0
**Status:** Production Ready 🚀

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
- 🔄 Smart fallback: Copilot → Groq → Error

**Tech Stack:** TypeScript 5.3.3 (strict mode), VS Code Extension API 1.85+, sql.js 1.10.3, Jest 29.7.0

**Main Directories:**
- `core/` - Shared analyzer module (used by both extension and MCP server)
- `src/` - VS Code extension source
  - `analyzer/` - Vagueness detection
  - `context/` - Workspace context detection (NEW in v1.3.0)
  - `rewriter/` - AI prompt enhancement
  - `chat/` - @betterprompt chat participant
  - `db/` - Local database (sql.js)
- `mcp-server/` - Model Context Protocol server
- `tests/` - Unit tests (mirrors src/ structure)

---

## Current Status

### ✅ ALL TESTS PASSING (133/133 + 29 MCP)

**Test Coverage:**
- ✅ **133/133 extension tests passing (100%)**
- ✅ **29/29 MCP server tests passing (100%)**
- ✅ Analyzer: 40 tests
- ✅ Rewriter: 14 tests (including context awareness)
- ✅ VS Code LM Rewriter: 29 tests
- ✅ Context Detector: 7 tests
- ✅ Chat Participant: 16 tests
- ✅ Database: 19 tests
- ✅ Onboarding: 8 tests (simplified)

### ✅ Implemented Features

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
- `src/rewriter/groqRewriter.ts` - Groq AI (Llama 3.3 70B)
- `src/rewriter/vscodeLmRewriter.ts` - VS Code Language Model API (Copilot)
- `src/rewriter/promptRewriter.ts` - Orchestration with smart fallback
- `src/rewriter/sharedPrompts.ts` - Intelligent system prompts
- `src/chat/chatParticipant.ts` - @betterprompt chat integration
- `src/extension.ts` - VS Code integration
- `src/db/database.ts` - sql.js database manager

**Commands:**
- `betterprompt.optimizePrompt` - Main optimization command (Cmd+Shift+E)
- `betterprompt.showSettings` - Opens VS Code settings
- `betterprompt.resetOnboarding` - Reset onboarding (testing)

**Settings:**
- `betterprompt.enabled` - Enable/disable extension (default: true)
- `betterprompt.groqApiKey` - Groq API key for fallback
- `betterprompt.vaguenessThreshold` - Min score to trigger rewrite (default: 30)
- `betterprompt.chatMode` - Default chat behavior: review/auto
- `betterprompt.showDiff` - Show before/after diff (default: true)

---

## Architecture

### AI Enhancement Flow

```
User Prompt
    ↓
[Context Detection] ← Detects file, tech stack, selection, errors
    ↓
[Vagueness Analysis] ← Scores prompt 0-100
    ↓
[Intent Detection] ← BUILD/LEARN/FIX/IMPROVE/CONFIGURE
    ↓
[AI Enhancement]
    ├─ Try: GitHub Copilot (VS Code LM API)
    ├─ Fallback: Groq API (free)
    └─ Error: Show setup instructions
    ↓
Enhanced Prompt + Context
```

### Shared Core Module

The analyzer logic lives in `core/analyzer.ts` and is shared by:
- VS Code extension (via `src/analyzer/promptAnalyzer.ts`)
- MCP server (via direct import)

### Database: sql.js

**Why:** Pure JavaScript SQLite (no native compilation)
**Note:** `db.initialize()` is async

---

## Code Conventions

### TypeScript (STRICT)
- ❌ No `any` types
- ❌ No `console.log` in production code
- ✅ Explicit return types on all functions
- ✅ Strict null checks enabled

### Testing
- Test files mirror src/ structure
- Run full suite after every change: `npm test`
- All tests must pass before commit

### Before Commit Checklist
```bash
npm run compile  # Must pass
npm run lint     # Must pass (0 errors)
npm test         # Must pass (132/132)
```

---

## Quick Reference

**Debug Extension:** Press `F5` in VS Code
**Watch Mode:** `npm run watch`
**Run Tests:** `npm test`
**Run MCP Tests:** `cd mcp-server && npm test`
**Lint & Fix:** `npm run lint:fix`
**Package Extension:** `npm run package`

---

**Last Updated:** 2025-11-26
**Test Status:** 133/133 extension + 29/29 MCP server
