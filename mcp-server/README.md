# BetterPrompt MCP Server

MCP (Model Context Protocol) server for BetterPrompt - provides intelligent prompt enhancement tools for AI assistants.

## Overview

This MCP server exposes BetterPrompt's prompt analysis and enhancement capabilities to AI assistants, enabling automatic prompt optimization.

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
  "showAnalysis": true
}
```

## Installation

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "betterprompt": {
      "command": "node",
      "args": ["/path/to/betterprompt/mcp-server/dist/index.js"]
    }
  }
}
```

## Development

```bash
# Build the server
cd mcp-server
npm install
npm run build

# Run tests
npm test

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Architecture

- **index.ts**: Main MCP server implementation
- **promptEngine.ts**: Prompt analysis and enhancement logic (imports from shared core)
- Uses `@modelcontextprotocol/sdk` for MCP protocol handling
- Communicates via stdio for fast, reliable transport

## How It Works

1. AI assistant loads the MCP server
2. Server registers two tools: `analyze_prompt` and `enhance_prompt`
3. When chatting, the AI can call these tools to improve prompts
4. Enhanced prompts lead to better AI responses

## License

MIT
