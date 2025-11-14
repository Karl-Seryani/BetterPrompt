#!/bin/bash
# Install MCP Servers for PromptForge Development

echo "🚀 Installing MCP Servers..."

# Essential servers
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-memory
npm install -g @modelcontextprotocol/server-brave-search
npm install -g @modelcontextprotocol/server-sequential-thinking

# Specialized servers
npm install -g @modelcontextprotocol/server-sqlite

echo "✅ MCP Servers installed!"
echo ""
echo "📝 Next steps:"
echo "1. Get a GitHub Personal Access Token: https://github.com/settings/tokens"
echo "2. Get a Brave Search API Key: https://brave.com/search/api/"
echo "3. Add servers to your Claude Desktop config"
echo ""
echo "Config file location (macOS): ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "Config file location (Linux): ~/.config/claude/claude_desktop_config.json"
echo "Config file location (Windows): %APPDATA%\Claude\claude_desktop_config.json"
