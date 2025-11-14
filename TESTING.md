# PromptCraft Testing Guide

## How to Test the Extension Yourself

### 1. Unit Tests (Automated)

#### Run All Tests
```bash
npm test
```

#### Run Specific Test Files
```bash
# Test the prompt analyzer only
npm test -- promptAnalyzer.test.ts

# Test the Groq rewriter only
npm test -- groqRewriter.test.ts

# Test the orchestrator only
npm test -- promptRewriter.test.ts
```

#### Watch Mode (Auto-rerun on file changes)
```bash
npm run test:watch

# Or watch specific file
npm run test:watch -- promptAnalyzer.test.ts
```

#### Run Specific Test Cases
```bash
# Test specific scenario
npm test -- -t "should detect vague verbs"

# Test specific describe block
npm test -- -t "real-world scenarios"
```

#### Test Coverage Report
```bash
npm run test:coverage
```

**Expected Results:**
- ✅ 29 tests for prompt analyzer (all passing)
- ✅ 11 tests for prompt rewriter orchestrator (all passing)
- ⚠️ Database tests may fail (async initialization issue - Sprint 3 fix)

---

### 2. Manual Testing in VS Code

#### Setup Steps

1. **Get a Free Groq API Key**
   - Go to [console.groq.com/keys](https://console.groq.com/keys)
   - Sign up for free account (no credit card required)
   - Create new API key
   - Copy the key (starts with `gsk_...`)

2. **Configure the Extension**
   - Open VS Code settings: `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
   - Search for "PromptCraft"
   - Paste your Groq API key into `Groq Api Key` field
   - (Optional) Adjust `Vagueness Threshold` (default: 30)

3. **Launch Extension in Debug Mode**
   ```bash
   # From VS Code:
   # 1. Open this project folder
   # 2. Press F5 (or Run > Start Debugging)
   # 3. A new VS Code window will open with "[Extension Development Host]" in title
   ```

#### Test Scenarios

##### Test 1: Vague Prompt Detection
1. In the Extension Development Host window, press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "PromptCraft: Optimize Current Prompt"
3. Enter a vague prompt: `make a website`
4. **Expected Results:**
   - Progress notification appears
   - Analysis completes
   - Shows vagueness score (should be 65-100)
   - Offers "View Changes", "Copy Enhanced", "Dismiss" buttons
   - Click "View Changes" to see before/after diff
   - Enhanced prompt should include specific technologies, structure, and details

##### Test 2: Clear Prompt (Should Skip)
1. Run command again
2. Enter a clear prompt: `In src/components/LoginForm.tsx, refactor the handleSubmit function to use async/await instead of promises`
3. **Expected Results:**
   - Message: "Your prompt looks good! (Vagueness score: 0/100)"
   - No rewriting occurs (score below threshold)

##### Test 3: Moderate Vagueness
1. Run command again
2. Enter: `fix the authentication bug`
3. **Expected Results:**
   - Vagueness score: 60-80
   - Enhanced prompt adds context about which file, function, and specific error handling

##### Test 4: Error Handling (Invalid API Key)
1. Go to settings and change API key to `invalid-key`
2. Run command with vague prompt
3. **Expected Results:**
   - Error notification from Groq API
   - Graceful error handling (no crash)

##### Test 5: Empty Prompt
1. Run command
2. Press Enter without typing anything
3. **Expected Results:**
   - Command cancels (no error)

##### Test 6: Copy Enhanced Prompt
1. Run command with vague prompt: `create a login form`
2. Click "Copy Enhanced"
3. **Expected Results:**
   - Message: "Enhanced prompt copied to clipboard!"
   - Paste (`Cmd+V`) to verify clipboard contains enhanced version

---

### 3. Performance Testing

#### Analyzer Performance (Must be <100ms)
```bash
npm test -- -t "performance"
```

**Expected:**
- ✅ Analysis completes in <100ms (usually 1-5ms)
- ✅ Handles very long prompts (<100ms even with 1000+ words)

#### End-to-End Performance
1. Open VS Code with extension
2. Note the time when you run "Optimize Prompt"
3. **Expected Results:**
   - Analysis: <100ms (instant)
   - Groq API call: 1-3 seconds (network dependent)
   - Total: <5 seconds

---

### 4. Integration Testing

#### Test the Full Workflow
1. Start with vague prompt: `help me with auth`
2. **Verify each step:**
   - ✅ Analyzer detects vagueness
   - ✅ Calculates score (should be ~80-95)
   - ✅ Sends to Groq API
   - ✅ Receives enhanced prompt
   - ✅ Calculates confidence score
   - ✅ Shows before/after comparison
   - ✅ User can approve or dismiss

---

### 5. Edge Cases Testing

#### Test These Edge Cases:
```bash
# Empty string
""

# Whitespace only
"   \n  \t  "

# Single word
"help"

# Very long prompt (100+ words)
"make a website " (repeated 100 times)

# Prompt with code snippets
"fix this: function foo() { return bar; }"

# Prompt with file paths
"in src/app.ts fix the bug"
```

**Expected:** All should handle gracefully without crashing

---

### 6. Test Coverage Verification

```bash
npm run test:coverage
```

**Requirements (from .claude.md):**
- Overall coverage: ≥80%
- Statements: ≥80%
- Branches: ≥75%
- Functions: ≥80%
- Lines: ≥80%

**Current Status:**
- ✅ Analyzer: >95% coverage
- ✅ Rewriter orchestrator: >90% coverage
- ⚠️ Database: Pending fixes (Sprint 3)

---

## Common Issues

### Issue: "Groq API key required"
**Solution:** Configure API key in VS Code settings (`promptcraft.groqApiKey`)

### Issue: Tests fail with TypeScript errors
**Solution:**
```bash
npm run compile
```

### Issue: Extension doesn't load in debug mode
**Solution:**
```bash
# Rebuild and restart
npm run compile
# Press F5 again
```

### Issue: Slow API responses
**Solution:**
- Check internet connection
- Groq free tier may have rate limits
- Try again in a few minutes

---

## Debugging

### Enable Debug Logs
1. Open VS Code output panel: `View > Output`
2. Select "PromptCraft" from dropdown
3. Watch logs during command execution

### Inspect Network Requests
```bash
# Add to extension.ts for debugging:
console.log('Request:', userPrompt);
console.log('Response:', result);
```

---

## Continuous Testing (CI/CD)

Tests run automatically on:
- Every commit (pre-commit hook)
- Every push (GitHub Actions)
- Pull requests

**Platforms tested:**
- Ubuntu (latest)
- macOS (latest)
- Windows (latest)

---

## Next Steps

After verifying all tests pass:
1. ✅ Sprint 2 complete
2. 🔜 Sprint 3: Add VS Code Language Model API detection
3. 🔜 Sprint 4: Analytics dashboard and template management
