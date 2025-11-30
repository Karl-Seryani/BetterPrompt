# Security & Privacy

This document explains BetterPrompt's security model and data handling practices.

## Data Flow Overview

```
User Prompt → Vagueness Analysis (local) → API Enhancement → Enhanced Prompt
                     ↓
              ML Model (local)
```

## What Data Is Sent Externally

### 1. GitHub Copilot (Primary Model)
- **What**: Your prompt text + workspace context
- **Where**: Microsoft/OpenAI servers via VS Code Language Model API
- **When**: Only when enhancement is triggered (vagueness score ≥ threshold)
- **Privacy**: Governed by [GitHub Copilot Terms](https://docs.github.com/en/copilot/overview-of-github-copilot/about-github-copilot-individual#privacy)

### 2. Groq API (Fallback)
- **What**: Your prompt text + workspace context
- **Where**: Groq's servers (`api.groq.com`)
- **When**: Only if Copilot unavailable or user prefers Groq
- **Privacy**: Governed by [Groq Privacy Policy](https://groq.com/privacy-policy/)

### 3. Telemetry (Opt-in Only)
- **What**: Anonymous usage metrics (enhancement counts, error types)
- **When**: Only if user enables `betterprompt.enableTelemetry`
- **What's NOT sent**: Prompt content, API keys, file paths, personal data

## Local-Only Processing

The following NEVER leave your machine:

1. **ML Vagueness Analysis** - TF-IDF vectorization and classification run entirely locally
2. **API Key Storage** - Keys stored in VS Code's SecretStorage (OS keychain)
3. **Workspace Context Detection** - File paths, tech stack detection
4. **Prompt Caching** - Cached enhancements stored in memory only

## Input Handling & Sanitization

### Why No Explicit Sanitization?

BetterPrompt does NOT sanitize or filter prompt content because:

1. **User Intent**: Prompts are user-provided and intentional
2. **Output Only**: Prompts go to AI APIs, not executed as code
3. **No Injection Risk**: We don't interpolate prompts into shell commands, SQL, or HTML
4. **AI Filtering**: AI providers (Copilot, Groq) have their own content policies

### What We DO Validate

```typescript
// API key format validation (groqRewriter.ts)
if (!value.startsWith('gsk_')) {
  return 'Groq API keys typically start with "gsk_"';
}

// Empty prompt check
if (!prompt || prompt.trim().length === 0) {
  throw new Error('Prompt cannot be empty');
}

// Groq response schema validation
validateGroqResponse(data); // Type assertion with field checks
```

## API Key Security

- **Storage**: VS Code SecretStorage (uses OS keychain: Keychain on macOS, Credential Vault on Windows)
- **Migration**: One-time migration from old plain-text settings (v1.5.0)
- **Display**: API key inputs are masked (`password: true`)
- **Transmission**: Only sent over HTTPS to respective APIs

## Rate Limiting

Built-in rate limiting (10 requests/minute) protects against:
- Accidental API overuse
- Runaway processes
- Cost control for paid APIs

## Reporting Security Issues

Please report security vulnerabilities privately to: [create a GitHub Security Advisory](https://github.com/your-username/betterprompt/security/advisories/new)

Do NOT open public issues for security vulnerabilities.
