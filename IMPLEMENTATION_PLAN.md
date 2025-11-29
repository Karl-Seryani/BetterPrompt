# BetterPrompt Production Hardening Plan

**Status:** LIVE with 6 users (1 developer + 5 end-users)
**Priority:** Fix critical issues first, then improvements
**Approach:** TDD - Test every change before implementation

---

## 🚨 CRITICAL PRIORITIES (Do First)

### Phase 1: Remove Dead Code & Security (Week 1, Days 1-2)

#### 1.1 Remove Unused Database Module ⚠️ CRITICAL
**Why Critical:**
- Adds 220MB+ to bundle size (sql.js dependency)
- Confusing for maintainers (fully implemented but never used)
- Security surface (unused code is tech debt)

**What to Remove:**
- `src/db/database.ts` (236 lines)
- `src/db/schema.ts` (109 lines)
- `tests/unit/db/database.test.ts` (279 lines)
- `sql.js` from package.json dependencies
- `@types/sql.js` from devDependencies

**Tests to Update:**
- Remove 19 database tests from test suite
- Update CLAUDE.md to reflect new test count (133 - 19 = 114)

**Verification:**
```bash
npm run compile  # Should pass
npm test         # Should show 114 tests passing (not 133)
npm run package  # Bundle size should drop significantly
```

**Risk:** LOW - Code is unused, safe to delete

---

#### 1.2 Add Rate Limiting Protection ⚠️ CRITICAL
**Why Critical:**
- 6 users hitting Copilot/Groq APIs could trigger rate limits
- No protection against accidental quota exhaustion
- Live users could hit errors without understanding why

**Implementation:**
Create new file: `src/utils/rateLimiter.ts`
```typescript
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: number[] = [];

  canMakeRequest(): boolean;
  recordRequest(): void;
  getTimeUntilReset(): number;
}
```

**Integration Points:**
- `src/rewriter/promptRewriter.ts` - Check before calling AI
- `src/chat/chatParticipant.ts` - Check before enhancement

**Limits:**
- Default: 10 requests per minute per user
- Configurable via setting: `betterprompt.maxRequestsPerMinute`

**Error Messages:**
```
Rate limit exceeded. You can make 10 enhancements per minute.
Try again in 23 seconds.
```

**Tests to Write:**
- `tests/unit/utils/rateLimiter.test.ts` (8-10 tests)
  - Should allow requests under limit
  - Should block requests over limit
  - Should reset after window expires
  - Should handle concurrent requests

**Verification:**
- Manually trigger 11 requests quickly
- Should see rate limit message on 11th request
- Wait 1 minute, should work again

**Risk:** MEDIUM - Must not block legitimate usage

---

#### 1.3 Improve Error Messages & Logging ⚠️ HIGH PRIORITY
**Why Critical:**
- Users hitting quota limits see generic "error" messages
- No way to debug why Copilot failed
- Silent fallbacks hide issues from users

**Current Issues:**
```typescript
// BAD: Silent failure
catch {
  // VS Code LM failed, silently fall back to Groq
}

// BAD: Generic error
catch (error) {
  return 'Error: ' + error.message;
}
```

**Implementation:**
Create: `src/utils/errorHandler.ts`
```typescript
enum ErrorCategory {
  RATE_LIMIT,
  QUOTA_EXCEEDED,
  AUTH_FAILED,
  NETWORK_ERROR,
  UNKNOWN
}

interface UserFriendlyError {
  category: ErrorCategory;
  message: string;
  actionableSteps: string[];
}

function categorizeError(error: Error): UserFriendlyError;
```

**Better Error Messages:**
- **Quota exceeded:** "GitHub Copilot quota exceeded. Add a free Groq API key in settings to continue."
- **Auth failed:** "Copilot authentication failed. Sign in to GitHub Copilot in VS Code."
- **Network error:** "Network request failed. Check your internet connection."
- **Rate limited:** "Rate limit reached (10 per minute). Try again in 23 seconds."

**Integration:**
- Update `groqRewriter.ts` error handling
- Update `vscodeLmRewriter.ts` error handling
- Update `promptRewriter.ts` error orchestration

**Tests:**
- `tests/unit/utils/errorHandler.test.ts` (6-8 tests)
- Mock different error scenarios
- Verify user-friendly messages

**Risk:** LOW - Only improves existing behavior

---

### Phase 2: Performance Optimizations (Week 1, Days 3-4)

#### 2.1 Cache package.json Parsing ⚡ PERFORMANCE
**Why Important:**
- Currently reads & parses package.json on EVERY prompt
- Synchronous file I/O blocks the main thread
- package.json rarely changes during a session

**Current Code (src/context/contextDetector.ts:114):**
```typescript
// BAD: Reads on every call
const packageJsonPath = path.join(rootPath, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
```

**Solution:**
Create: `src/utils/packageJsonCache.ts`
```typescript
class PackageJsonCache {
  private cache: Map<string, {
    data: any;
    mtime: number;
  }> = new Map();

  get(rootPath: string): any | null;
  invalidate(rootPath: string): void;
  clear(): void;
}
```

**Behavior:**
- Cache based on file path + modification time
- If mtime changes, re-read file
- Auto-invalidate after 5 minutes
- Singleton pattern (one cache per extension instance)

**Integration:**
- Refactor `detectTechStack()` in contextDetector.ts
- Use cache.get() instead of fs.readFileSync()

**Performance Gain:**
- First call: ~5ms (read + parse)
- Cached calls: ~0.1ms (Map lookup)
- **50x faster** for subsequent calls

**Tests:**
- `tests/unit/utils/packageJsonCache.test.ts` (6-8 tests)
  - Should cache on first read
  - Should return cached data on second read
  - Should invalidate when file changes
  - Should handle missing files

**Risk:** LOW - Caching is transparent to users

---

#### 2.2 Async File Operations ⚡ PERFORMANCE
**Why Important:**
- All file reads are currently synchronous
- Blocks VS Code UI thread
- Bad UX on slow file systems (network drives)

**Current Issues:**
```typescript
// BAD: Synchronous I/O
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
}
```

**Solution:**
Convert to async/await pattern:
```typescript
// GOOD: Async I/O
const exists = await fs.promises.access(packageJsonPath).then(() => true).catch(() => false);
if (exists) {
  const data = await fs.promises.readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(data);
}
```

**Files to Update:**
- `src/context/contextDetector.ts` - detectTechStack()
- Update function signatures to async
- Update all callers to await

**Breaking Changes:**
- `detectContext()` becomes async
- All callers must update (promptRewriter.ts, chatParticipant.ts)

**Tests to Update:**
- All contextDetector tests need async/await
- Verify no performance regression

**Risk:** MEDIUM - Requires updating many call sites

---

### Phase 3: Developer Experience (Week 1, Days 5-7)

#### 3.1 Create .env.example File 📝 DX
**Why Important:**
- New contributors don't know what .env should contain
- .env is gitignored, no template available
- Users don't know how to set up Groq API key

**Create:** `.env.example`
```bash
# BetterPrompt Development Environment

# Groq API Key (Optional - Fallback if Copilot unavailable)
# Get free key at: https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# MCP Server Configuration (Optional)
MCP_SERVER_PORT=3000
```

**Documentation Update:**
Add to README.md:
```markdown
## Local Development Setup

1. Clone the repository
2. Copy `.env.example` to `.env`
3. (Optional) Add your Groq API key to `.env`
4. Run `npm install`
5. Press F5 to debug
```

**Risk:** ZERO - Documentation only

---

#### 3.2 Add CONTRIBUTING.md 📝 DX
**Why Important:**
- New contributors don't know the workflow
- Need to document testing requirements
- Set expectations for PRs

**Create:** `CONTRIBUTING.md`
```markdown
# Contributing to BetterPrompt

## Before Committing

✅ Run full test suite: `npm test` (must pass)
✅ Run linter: `npm run lint` (0 errors)
✅ Run compiler: `npm run compile` (must succeed)
✅ Update CLAUDE.md if architecture changes

## Testing Philosophy

We use TDD (Test-Driven Development):
1. Write test first (it should fail)
2. Implement feature
3. Verify test passes
4. Refactor if needed

## Code Style

- TypeScript strict mode (no `any`)
- Explicit return types on all functions
- No console.log in production code
- Use descriptive variable names
```

**Risk:** ZERO - Documentation only

---

#### 3.3 Add Logging Infrastructure 📝 DEBUGGING
**Why Important:**
- No way to debug issues users report
- Silent failures hide problems
- Need telemetry for understanding usage patterns

**Create:** `src/utils/logger.ts`
```typescript
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private outputChannel: vscode.OutputChannel;

  error(message: string, error?: Error): void;
  warn(message: string): void;
  info(message: string): void;
  debug(message: string): void;
}

export const logger = new Logger('BetterPrompt');
```

**Integration:**
- Log all API calls (Copilot, Groq)
- Log rate limit hits
- Log errors with stack traces
- Log vagueness scores for debugging

**User Control:**
- Setting: `betterprompt.logLevel` (error/warn/info/debug)
- Output channel: "BetterPrompt Logs" in VS Code

**Tests:**
- `tests/unit/utils/logger.test.ts` (6-8 tests)
- Mock OutputChannel
- Verify log levels work

**Risk:** LOW - Opt-in debugging feature

---

## 🔧 MEDIUM PRIORITIES (Week 2)

### Phase 4: Analytics & Learning (Week 2, Days 1-3)

#### 4.1 Track Enhancement Acceptance Rate 📊 ANALYTICS
**Why Important:**
- Don't know if enhancements are actually useful
- Can't improve without feedback
- No data on which prompts need work

**Lightweight Implementation (NO DATABASE):**
Use VS Code's globalState:
```typescript
interface EnhancementStats {
  totalEnhancements: number;
  acceptedEnhancements: number;
  dismissedEnhancements: number;
  avgVaguenessScore: number;
  mostCommonVagueVerbs: Record<string, number>;
}
```

**Tracking Points:**
- User clicks "Copy Enhanced" → accepted++
- User clicks "Dismiss" → dismissed++
- Record vagueness score for running average

**Privacy:**
- Only store counts, NOT actual prompts
- All data stays local (globalState)
- No network requests

**Display:**
Add command: `betterprompt.showStats`
```
BetterPrompt Stats
─────────────────
Total Enhancements: 47
Acceptance Rate: 74% (35/47)
Avg Vagueness Score: 62/100

Top Vague Verbs:
1. make (23 times)
2. fix (12 times)
3. create (8 times)
```

**Tests:**
- `tests/unit/analytics/stats.test.ts` (8-10 tests)
- Mock globalState
- Verify acceptance tracking

**Risk:** LOW - Local-only, privacy-safe

---

#### 4.2 Improve Vagueness Scoring Algorithm 🧠 CORE
**Why Important:**
- Current scoring is too simplistic (regex only)
- False positives: "build production-ready CI/CD" flagged as vague
- False negatives: "do the thing" might pass

**Current Problems:**
```typescript
// Problem: Just checks for word "build" anywhere
const VAGUE_VERBS = ['make', 'create', 'build', 'fix'];
const hasVagueVerb = VAGUE_VERBS.some(verb =>
  new RegExp(`\\b${verb}\\b`).test(prompt)
);
```

**Improved Algorithm:**
```typescript
// Better: Context-aware scoring
function scoreVagueness(prompt: string): number {
  let score = 0;

  // 1. Vague verb penalty (but check context)
  if (hasVagueVerb && !hasSpecificContext) {
    score += 30;
  }

  // 2. Length penalty (progressive)
  const wordCount = prompt.split(/\s+/).length;
  if (wordCount <= 2) score += 40;
  else if (wordCount <= 5) score += 20;

  // 3. Specificity bonus (reduce score)
  const specificityScore = countSpecificTerms(prompt);
  score -= Math.min(specificityScore * 5, 30);

  // 4. Question words (slightly better)
  if (/\b(how|what|why|when|where)\b/.test(prompt)) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}
```

**Tests:**
- Expand `tests/unit/analyzer/promptAnalyzer.test.ts`
- Add 20+ new test cases with edge cases
- Verify false positive rate drops

**Benchmark:**
- Test against 100 real-world prompts
- Measure accuracy before/after

**Risk:** MEDIUM - Core algorithm change, needs extensive testing

---

### Phase 5: Configuration Improvements (Week 2, Days 4-5)

#### 5.1 Add Model Selection Customization ⚙️ CONFIG
**Why Important:**
- Users can't fine-tune model preference
- Hardcoded fallback order (GPT-4 > Claude > Groq)
- Some users prefer different models

**Current Limitation:**
```typescript
// Can't customize this order
if (gpt4Models.length > 0) return gpt4Models[0];
if (claudeModels.length > 0) return claudeModels[0];
return models[0];
```

**New Setting:**
`betterprompt.modelPriority` (array)
```json
{
  "betterprompt.modelPriority": [
    "claude-3.5",
    "gpt-4-turbo",
    "gpt-4",
    "groq"
  ]
}
```

**Implementation:**
- Allow users to specify order
- Fall back to default if setting not configured
- Validate model names

**Tests:**
- Test custom priority orders
- Test invalid model names
- Test empty array

**Risk:** LOW - Backwards compatible (default unchanged)

---

#### 5.2 Add Request Timeout Configuration ⚙️ CONFIG
**Why Important:**
- Groq API has 30s hardcoded timeout
- Some users on slow networks need more time
- Some want faster failures

**New Settings:**
```json
{
  "betterprompt.requestTimeout": 30000,  // milliseconds
  "betterprompt.retryOnTimeout": true
}
```

**Implementation:**
- Make timeout configurable
- Add retry logic (max 2 retries)
- Exponential backoff

**Risk:** LOW - Improves reliability

---

## 📦 LOW PRIORITIES (Week 3+)

### Phase 6: Future Enhancements

#### 6.1 User Templates (Post-launch)
- Allow users to save custom enhancement templates
- Share templates between team members
- Export/import template packs

#### 6.2 A/B Test System Prompts (Post-launch)
- Track which system prompts produce best results
- Rotate prompts to gather data
- Use analytics to optimize

#### 6.3 Semantic Vagueness Detection (Future)
- Use embeddings instead of regex
- Machine learning model for scoring
- Context-aware analysis

---

## 📋 TESTING STRATEGY

### Test Requirements (EVERY PHASE):

**Before Implementation:**
1. Write failing test first (TDD)
2. Document expected behavior
3. Get approval if changing core logic

**During Implementation:**
1. Run `npm test` after each change
2. Ensure no regressions
3. Add edge case tests

**After Implementation:**
1. All tests pass: `npm test`
2. No lint errors: `npm run lint`
3. Compiles clean: `npm run compile`
4. Manual smoke test in VS Code

### Coverage Requirements:
- New code: 80%+ coverage minimum
- Critical paths: 100% coverage
- Edge cases: Documented with tests

---

## 🎯 SUCCESS METRICS

### Phase 1 (Critical):
- ✅ Bundle size reduced by 40%+ (removing sql.js)
- ✅ Zero rate limit errors in production
- ✅ User error messages actionable 90%+ of time

### Phase 2 (Performance):
- ✅ Context detection <50ms (down from ~100ms)
- ✅ No UI blocking during file I/O
- ✅ Cache hit rate >80% for package.json

### Phase 3 (DX):
- ✅ New contributor onboarding <30 minutes
- ✅ All errors logged to output channel
- ✅ Debug logs help resolve 80%+ of issues

### Phase 4 (Analytics):
- ✅ Acceptance rate tracked
- ✅ Vagueness false positive rate <10%
- ✅ Users understand their usage patterns

---

## 🚢 DEPLOYMENT PLAN

### Pre-Release Checklist:
1. All Phase 1 changes complete
2. All tests passing (114 after DB removal)
3. No linter errors
4. Update version in package.json (1.5.0)
5. Update CLAUDE.md with changes
6. Create GitHub release notes

### Release Process:
```bash
# 1. Verify everything works
npm run compile && npm run lint && npm test

# 2. Package extension
npm run package

# 3. Test .vsix locally
code --install-extension betterprompt-1.5.0.vsix

# 4. If all good, publish
npm run deploy
```

### Post-Release:
1. Monitor error logs (ask users to share)
2. Watch for GitHub issues
3. Quick hotfix if critical bugs found

---

## ⏱️ TIMELINE ESTIMATE

**Week 1:**
- Days 1-2: Phase 1 (Critical fixes)
- Days 3-4: Phase 2 (Performance)
- Days 5-7: Phase 3 (DX)

**Week 2:**
- Days 1-3: Phase 4 (Analytics)
- Days 4-5: Phase 5 (Config)
- Days 6-7: Testing & bug fixes

**Week 3:**
- Release prep & documentation
- User feedback incorporation

**Total: 2-3 weeks for production-ready**

---

## 🎓 LESSONS LEARNED (To Document)

1. **Database Over-Engineering:** Built full DB system before validating need
   - **Fix:** Start with simple solutions (globalState), upgrade if needed

2. **Synchronous File I/O:** Didn't consider slow file systems
   - **Fix:** Always use async for I/O operations

3. **Silent Failures:** Made debugging impossible
   - **Fix:** Log everything, give users visibility

4. **No Rate Limiting:** Assumed low usage
   - **Fix:** Always add rate limiting for external APIs

---

**Last Updated:** 2025-11-27
**Status:** Ready for Implementation
**Approval Required:** YES
