# MCP Server Setup - Troubleshooting Guide

## ✅ Working Servers
- GitHub ✅
- Memory ✅
- Brave Search ✅
- Sequential Thinking ✅

## ❌ SQLite Server Issue

### Problem
The SQLite MCP server fails because it tries to open a database file that doesn't exist yet. Our database is created dynamically by the extension at runtime in VS Code's storage directory, not in the project root.

### Solutions

#### Option 1: Remove SQLite MCP Server (Recommended for now)

Since the database is created and managed by your VS Code extension in the extension storage directory (not the project root), the SQLite MCP server isn't useful yet.

**Updated Claude Desktop Config (without SQLite):**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/karlseryani/Documents/Cs shit/Project"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your_key_here"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

#### Option 2: Create a Test Database (For Testing Later)

If you want to test SQLite MCP server with a test database:

```bash
# Create a test database in project root
cd "/Users/karlseryani/Documents/Cs shit/Project"
npm run compile

# Create test database with Node
node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  const db = new SQL.Database();
  db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
  db.run('INSERT INTO test (name) VALUES (\"test\")');
  const data = db.export();
  fs.writeFileSync('test-promptforge.db', data);
  console.log('✅ Test database created: test-promptforge.db');
});
"
```

Then use this config:
```json
"sqlite": {
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-sqlite",
    "--db-path",
    "/Users/karlseryani/Documents/Cs shit/Project/test-promptforge.db"
  ]
}
```

#### Option 3: Wait Until Extension Creates Real Database

The actual database will be created in VS Code's extension storage when you first run the extension:

**Location will be:**
```
~/Library/Application Support/Code/User/globalStorage/<publisher>.<extension-name>/promptforge.db
```

Once the extension runs and creates the database, you can add the SQLite server pointing to that location.

## Current Recommended Setup

**Use these 5 MCP servers for now:**

1. ✅ **Filesystem** - Essential for file operations
2. ✅ **GitHub** - Automate Git workflow
3. ✅ **Memory** - Remember context across sessions
4. ✅ **Brave Search** - Research APIs and best practices
5. ✅ **Sequential Thinking** - Design complex algorithms

**Skip SQLite for now** - Add it later once the extension creates the real database.

## How to Update Your Config

**macOS:**
```bash
# Edit your Claude Desktop config
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Remove the `sqlite` section from `mcpServers` object.

**Then restart Claude Desktop.**

## Testing Your MCP Servers

After updating config and restarting Claude Desktop, verify in a new conversation:

```
List available MCP servers
```

You should see:
- ✅ filesystem
- ✅ github
- ✅ memory
- ✅ brave-search
- ✅ sequential-thinking

## When to Add SQLite Back

Add the SQLite MCP server later when:
1. You've run the extension at least once (F5 in VS Code)
2. The extension has created the database file
3. You know the exact path to the database file

At that point, you can query and debug the real database using the SQLite MCP server.

## Alternative: Use Node REPL for Database Testing

Instead of SQLite MCP server, you can test the database directly:

```bash
cd "/Users/karlseryani/Documents/Cs shit/Project"
npm run compile
node

# In Node REPL:
const { DatabaseManager } = require('./dist/db/database');
const db = new DatabaseManager('.');
await db.initialize();
db.getAllTemplates();
db.close();
```

This gives you direct database access during development without needing the MCP server.

## Summary

**Action:** Remove the SQLite server from your Claude Desktop config and restart.

**You'll have 5 working MCP servers** which is perfect for Sprint 2 development!
