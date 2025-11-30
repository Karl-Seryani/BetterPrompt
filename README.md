# BetterPrompt

Intelligent prompt enhancement for GitHub Copilot Chat.

Type `@betterprompt` followed by a simple request, and it transforms into a detailed, actionable prompt with context from your workspace.

## How It Works

1. **You type a simple prompt** → `@betterprompt make a login page`

2. **Context is gathered** → Detects your current file, tech stack, selected code, and project structure.

3. **Copilot enhances** → Uses your GitHub Copilot subscription to rewrite the prompt with relevant details.

4. **You get the result** → A detailed prompt ready to use, or sent directly to Copilot in auto mode.

```
@betterprompt make a login page

→ Create a login page with:
  - Email and password fields with validation
  - Form submission to /api/auth/login
  - Loading state during authentication
  - Error handling for invalid credentials
  - Redirect on success
  - Responsive design
```

## Context Detection

BetterPrompt automatically detects context from your workspace:

**Basic (always available)**
- Current file path and language
- Tech stack (React, Next.js, Express, Django, etc.)
- Selected code in your editor
- Diagnostic errors from TypeScript/ESLint

**Structural (always available)**
- Project structure (src/, tests/, components/)
- File type distribution
- Project style (monorepo, webapp, API, library)

**Semantic (opt-in)**
- Function signatures and exports
- Class structures
- Import/export patterns

This context is included when enhancing your prompt, so Copilot knows what you're working with.

## Usage

**Review mode** (default) - Shows the enhanced prompt before sending:
```
@betterprompt make an API endpoint
```

**Auto mode** - Enhances and sends directly to Copilot:
```
@betterprompt /auto make an API endpoint
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `chatMode` | review | Default mode (review or auto) |
| `maxRequestsPerMinute` | 10 | Rate limit for enhancements |

## Requirements

- VS Code 1.85+
- GitHub Copilot subscription
- GitHub Copilot Chat extension
