# BetterPrompt MCP Server

MCP (Model Context Protocol) server for BetterPrompt - provides intelligent prompt enhancement tools for AI assistants.

## Overview

This MCP server exposes BetterPrompt's prompt analysis and enhancement capabilities to AI assistants like Claude Code, enabling automatic prompt optimization behind the scenes.

## Tools Provided

### 1. `analyze_prompt`
Analyzes a prompt for vagueness, missing context, and unclear scope.

**Input:**
- `prompt` (string): The user prompt to analyze

**Output:**
- `score` (0-100): Vagueness score (higher = more vague)
- `issues`: Array of detected issues with descriptions and suggestions
- `hasVagueVerb`, `hasMissingContext`, `hasUnclearScope`: Boolean flags

**Example:**
```json
{
  "prompt": "make a login"
}
```

### 2. `enhance_prompt`
Enhances a vague prompt to be more specific and actionable.

**Input:**
- `prompt` (string): The vague prompt to enhance
- `userLevel` (optional): "auto" | "beginner" | "developer" (default: "auto")
- `showAnalysis` (optional): boolean (default: false)

**Output:**
- `original`: The original prompt
- `enhanced`: The enhanced prompt
- `confidence`: Confidence score (0-1)
- `model`: Model used for enhancement
- `analysis` (if showAnalysis=true): Full analysis results

**Example:**
```json
{
  "prompt": "make a login",
  "userLevel": "developer",
  "showAnalysis": true
}
```

## Installation

Already configured in your `.claude.json` for the BetterPrompt project!

## Usage with Claude Code

The MCP server is automatically loaded when you start Claude Code in the BetterPrompt directory.

### Method 1: Let Claude Use It Automatically
Just chat normally - Claude will automatically use `enhance_prompt` when it detects a vague prompt:

```
You: make a website to sell clothes
Claude: [Automatically calls enhance_prompt tool behind the scenes]
        [Uses enhanced prompt to generate better code]
```

### Method 2: Explicitly Request Analysis
```
You: Analyze this prompt: "fix the bug"
Claude: [Uses analyze_prompt tool]
        Shows vagueness score and suggestions
```

### Method 3: Request Enhancement
```
You: Enhance this prompt for a developer: "build an app"
Claude: [Uses enhance_prompt tool with userLevel="developer"]
        Returns enhanced version
```

## Development

```bash
# Build the server
cd mcp-server
npm install
npm run build

# Test the server with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Architecture

- **index.ts**: Main MCP server implementation
- **promptEngine.ts**: Prompt analysis and enhancement logic
- Uses `@modelcontextprotocol/sdk` for MCP protocol handling
- Communicates via stdio for fast, reliable transport

## How It Works

1. Claude Code loads the MCP server on startup
2. The server registers two tools: `analyze_prompt` and `enhance_prompt`
3. When you chat with Claude, it can automatically call these tools
4. Enhanced prompts are used to generate better responses
5. All happens transparently - you just get better results!

## Benefits

- **Zero friction**: No need to manually optimize prompts
- **Automatic**: Claude detects and fixes vague prompts behind the scenes
- **Smart**: Adapts to your experience level (beginner/developer)
- **Fast**: Local execution, no API calls needed for analysis

## License

MIT
