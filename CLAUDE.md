# BetterPrompt - AI Context File

**Version:** 1.9.0
**Last Updated:** 2025-11-29

---

## Project Overview

VS Code extension that transforms simple prompts into detailed, actionable requests for GitHub Copilot. Use `@betterprompt` in Copilot Chat.

**Tech Stack:** TypeScript 5.3.3 (strict), VS Code Extension API 1.85+

**Directory Structure:**
- `core/prompts/` - System prompt for enhancement
- `src/` - VS Code extension
  - `context/` - Tiered context detection (basic, structural, semantic)
  - `rewriter/` - AI prompt enhancement (GitHub Copilot only)
  - `chat/` - @betterprompt chat participant
  - `templates/` - Prompt templates
  - `utils/` - Rate limiting, error handling, caching

---

## Code Conventions

- **TypeScript:** No `any`, explicit return types, strict null checks, typed catch blocks (`catch (error: unknown)`)
- **Before commit:** `npm run compile && npm run lint`
- **Error handling:** All promises must have `.catch()` or be awaited

---

## Architecture

```
User Prompt
    ↓
[Rate Limit Check] ← 10 req/min (lifecycle managed)
    ↓
[Tiered Context Detection]
    ├─ Tier 1: Basic (file, tech stack, selection, errors)
    ├─ Tier 2: Structural (directories, file types, project patterns)
    └─ Tier 3: Semantic (functions, classes, imports - requires consent)
    ↓
[Cache Check]
    ↓
[Cancellation Check]
    ↓
[AI Enhancement] ← GitHub Copilot (via VS Code Language Model API)
    ↓
[Improvement Detection] ← ImprovementBreakdown
    ↓
Enhanced Prompt
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

## Quick Reference

```bash
npm run compile   # Build
npm run lint      # Lint
npm run watch     # Watch mode
npm run package   # Create .vsix package
```

**Debug:** Press F5 in VS Code
