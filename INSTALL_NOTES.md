# Installation Notes

## Database Library Change

Due to native compilation issues with `better-sqlite3` on macOS (node-gyp permission errors), the project has been updated to use **sql.js** instead.

### What Changed

**Original:**
- `better-sqlite3` - Native SQLite binding (requires compilation)
- Synchronous API
- Faster performance

**Current:**
- `sql.js` - Pure JavaScript SQLite implementation
- Async API (with sync-like usage)
- No native compilation needed
- Slightly slower but more portable

### File Changes

1. **package.json** - Updated dependency from `better-sqlite3` to `sql.js`
2. **src/db/database-sqljs.ts** - New database implementation using sql.js
3. **src/db/database.ts** - Original better-sqlite3 implementation (kept for reference)

### Which to Use

**For Development (Recommended):**
Use `database-sqljs.ts` - No compilation issues, works everywhere

**For Production (Optional):**
If you fix the node-gyp permissions, you can switch back to `database.ts` for better performance

### How to Fix node-gyp Permissions (Optional)

If you want to use `better-sqlite3` instead:

```bash
# Fix permissions
sudo chown -R $(whoami) ~/Library/Caches/node-gyp

# Update package.json
npm uninstall sql.js
npm install better-sqlite3 @types/better-sqlite3

# Use src/db/database.ts instead of database-sqljs.ts
```

### Current Status

Installation completed successfully with sql.js:
```
✅ 715 packages installed
✅ 0 vulnerabilities
✅ Ready for development
```

### Next Steps

1. Update imports to use `database-sqljs.ts`
2. Update tests to work with async initialization
3. Continue with Sprint 2 development

The API is nearly identical, with one key difference:
- `db.initialize()` is now `await db.initialize()` (returns Promise)

All other methods remain the same.
