# BetterPrompt Feature Implementation Plan

## Overview

Three new features to make BetterPrompt actually useful:
1. **Context-Aware Suggestions** (High effort, Very High value)
2. **Interactive Prompt Builder** (Medium effort, High value)
3. **Prompt Templates** (Low effort, Medium value)

---

## Feature 1: Context-Aware Suggestions

### What It Does
Instead of generic AI enhancement, analyze the user's workspace and suggest specific, actionable prompts based on real context.

**Example:**
```
User types: "fix the auth bug"

BetterPrompt sees:
- src/auth/login.ts (modified 2 min ago)
- Error in editor: "TypeError: user is undefined" at line 42
- Related test: tests/auth.test.ts (1 failing)

Suggests:
1. "Fix TypeError 'user is undefined' in src/auth/login.ts:42"
2. "Debug failing test in tests/auth.test.ts related to auth changes"
```

### Implementation Tasks (TDD Order)

#### Task 1.1: Enhanced Context Collector
**File:** `src/context/enhancedContextCollector.ts`

Collect richer context than current `contextDetector.ts`:

| Data Source | What to Collect |
|-------------|-----------------|
| Active Editor | File path, language, cursor position, visible range |
| Diagnostics | All errors/warnings with line numbers and messages |
| Git | Recently modified files (last 5), unstaged changes, current branch |
| Terminal | Last error output (if accessible via VS Code API) |
| Related Files | Files in same directory, imported files, test files |

**Tests to write first:**
```typescript
describe('EnhancedContextCollector', () => {
  describe('collectDiagnostics', () => {
    it('should collect all errors with line numbers');
    it('should collect warnings separately');
    it('should truncate long error messages');
    it('should handle files with no diagnostics');
  });

  describe('collectGitContext', () => {
    it('should get recently modified files');
    it('should get unstaged changes');
    it('should handle non-git repositories');
    it('should timeout after 2 seconds');
  });

  describe('findRelatedFiles', () => {
    it('should find test file for source file');
    it('should find source file for test file');
    it('should find files importing current file');
  });
});
```

#### Task 1.2: Prompt Intent Analyzer
**File:** `src/analyzer/intentAnalyzer.ts`

Detect what the user is trying to do from their vague prompt:

| Intent | Trigger Words | Required Context |
|--------|---------------|------------------|
| FIX_BUG | fix, bug, error, broken, crash | Needs: error message or file |
| ADD_FEATURE | add, create, implement, build | Needs: what + where |
| REFACTOR | refactor, clean, improve, optimize | Needs: what code |
| EXPLAIN | explain, how, why, what does | Needs: code reference |
| TEST | test, spec, coverage | Needs: what to test |
| DEBUG | debug, investigate, find why | Needs: symptoms |

**Tests to write first:**
```typescript
describe('IntentAnalyzer', () => {
  describe('detectIntent', () => {
    it('should detect FIX_BUG intent from "fix the login"');
    it('should detect ADD_FEATURE intent from "add dark mode"');
    it('should detect REFACTOR intent from "clean up this code"');
    it('should detect EXPLAIN intent from "how does this work"');
    it('should return UNKNOWN for ambiguous prompts');
  });

  describe('getMissingContext', () => {
    it('should identify missing error message for FIX_BUG');
    it('should identify missing location for ADD_FEATURE');
    it('should return empty array when context is complete');
  });
});
```

#### Task 1.3: Suggestion Generator
**File:** `src/suggestions/suggestionGenerator.ts`

Combine intent + context to generate specific suggestions:

**Tests to write first:**
```typescript
describe('SuggestionGenerator', () => {
  describe('generateSuggestions', () => {
    it('should generate fix suggestion when error exists in current file');
    it('should generate test suggestion when test file exists');
    it('should generate multiple suggestions ranked by relevance');
    it('should include file paths and line numbers in suggestions');
    it('should handle case with no useful context gracefully');
  });

  describe('rankSuggestions', () => {
    it('should rank suggestions with more context higher');
    it('should prioritize current file over other files');
    it('should limit to top 3 suggestions');
  });
});
```

#### Task 1.4: Chat Participant Integration
**File:** `src/chat/chatParticipant.ts` (modify existing)

Add new mode: `/suggest` that shows context-aware suggestions.

**Tests to write first:**
```typescript
describe('Chat Participant - Suggest Mode', () => {
  it('should show suggestions when /suggest command used');
  it('should show numbered suggestions user can pick');
  it('should allow user to pick suggestion by number');
  it('should fall back to enhancement if no good suggestions');
});
```

#### Task 1.5: UI for Suggestion Selection
**File:** `src/chat/suggestionPresenter.ts`

Present suggestions in a clean, clickable format:

```markdown
## Based on your workspace, did you mean:

1. **Fix TypeError in login.ts**
   `src/auth/login.ts:42` - "user is undefined"

2. **Debug failing auth test**
   `tests/auth.test.ts` - 1 test failing

3. **Something else?** Type more details...

_Reply with a number or refine your prompt_
```

---

## Feature 2: Interactive Prompt Builder

### What It Does
Instead of auto-enhancing, ask clarifying questions to build a specific prompt.

**Example:**
```
User types: "make a login"

BetterPrompt asks:
> What framework? [React] [Vue] [Express] [Other]
User clicks: React

> Auth method? [Email/Password] [OAuth] [Magic Link]
User clicks: Email/Password

> Where should it go? [New file] [Existing: src/components/]
User clicks: New file

Generated prompt:
"Create a React login component with email/password authentication.
Create as a new file. Include form validation and error states."
```

### Implementation Tasks (TDD Order)

#### Task 2.1: Question Templates
**File:** `src/builder/questionTemplates.ts`

Define question flows for different intents:

```typescript
interface QuestionTemplate {
  id: string;
  question: string;
  options: QuestionOption[];
  allowCustom: boolean;
  dependsOn?: { questionId: string; answer: string };
}

const FIX_BUG_QUESTIONS: QuestionTemplate[] = [
  { id: 'what', question: 'What is broken?', options: [...], allowCustom: true },
  { id: 'where', question: 'Where is the issue?', options: ['Current file', 'Other...'] },
  { id: 'symptoms', question: 'What happens?', options: ['Error', 'Wrong output', 'Crash'] },
];
```

**Tests to write first:**
```typescript
describe('QuestionTemplates', () => {
  it('should have templates for FIX_BUG intent');
  it('should have templates for ADD_FEATURE intent');
  it('should support conditional questions (dependsOn)');
  it('should allow custom answers for all questions');
});
```

#### Task 2.2: Prompt Composer
**File:** `src/builder/promptComposer.ts`

Turn answers into a structured prompt:

**Tests to write first:**
```typescript
describe('PromptComposer', () => {
  describe('compose', () => {
    it('should compose FIX_BUG prompt from answers');
    it('should compose ADD_FEATURE prompt from answers');
    it('should include file context when available');
    it('should handle partial answers gracefully');
  });
});
```

#### Task 2.3: Interactive Chat Flow
**File:** `src/chat/interactiveBuilder.ts`

Manage the Q&A conversation state:

**Tests to write first:**
```typescript
describe('InteractiveBuilder', () => {
  describe('startFlow', () => {
    it('should present first question with options');
    it('should track conversation state');
  });

  describe('processAnswer', () => {
    it('should accept numbered answers');
    it('should accept custom text answers');
    it('should move to next question');
    it('should generate prompt when all questions answered');
  });
});
```

#### Task 2.4: Chat Participant Integration
**File:** `src/chat/chatParticipant.ts` (modify)

Add `/build` command for interactive mode.

---

## Feature 3: Prompt Templates

### What It Does
Provide fill-in-the-blank templates for common tasks. No AI needed - instant.

**Example:**
```
@betterprompt /template fix-bug

Opens template:
"Fix the [error type] in [file path] at line [line number].
The error message is: [error message].
Expected behavior: [what should happen].
Current behavior: [what actually happens]."

User fills in brackets, gets a perfect prompt.
```

### Implementation Tasks (TDD Order)

#### Task 3.1: Template Definitions
**File:** `src/templates/templateDefinitions.ts`

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  placeholders: Placeholder[];
  autoFill?: Record<string, () => Promise<string>>; // Auto-fill from context
}

const TEMPLATES: PromptTemplate[] = [
  {
    id: 'fix-bug',
    name: 'Fix Bug',
    description: 'Report and fix a bug with full context',
    template: 'Fix the {{errorType}} in {{filePath}}...',
    placeholders: [
      { id: 'errorType', label: 'Error type', hint: 'e.g., TypeError, null reference' },
      { id: 'filePath', label: 'File path', autoFill: 'currentFile' },
    ],
  },
  // ... more templates
];
```

**Tests to write first:**
```typescript
describe('TemplateDefinitions', () => {
  it('should have fix-bug template');
  it('should have add-feature template');
  it('should have refactor template');
  it('should have explain template');
  it('should have write-test template');
  it('all templates should have valid placeholders');
});
```

#### Task 3.2: Template Filler
**File:** `src/templates/templateFiller.ts`

Fill placeholders from context or user input:

**Tests to write first:**
```typescript
describe('TemplateFiller', () => {
  describe('autoFill', () => {
    it('should auto-fill currentFile placeholder');
    it('should auto-fill firstError placeholder');
    it('should auto-fill framework placeholder');
    it('should leave unknown placeholders empty');
  });

  describe('fill', () => {
    it('should replace all placeholders with values');
    it('should handle missing values gracefully');
    it('should validate required placeholders');
  });
});
```

#### Task 3.3: Template Selector UI
**File:** `src/templates/templateSelector.ts`

Show template picker in chat:

**Tests to write first:**
```typescript
describe('TemplateSelector', () => {
  describe('showTemplates', () => {
    it('should list all available templates');
    it('should show template description');
    it('should allow filtering by keyword');
  });

  describe('selectTemplate', () => {
    it('should return selected template');
    it('should handle cancellation');
  });
});
```

#### Task 3.4: Chat Integration
**File:** `src/chat/chatParticipant.ts` (modify)

Add `/template` command:
- `/template` - show all templates
- `/template fix-bug` - use specific template

---

## Implementation Order

### Phase 1: Prompt Templates (1-2 days)
Lowest effort, teaches users good prompt structure immediately.

1. Task 3.1: Template Definitions
2. Task 3.2: Template Filler
3. Task 3.3: Template Selector UI
4. Task 3.4: Chat Integration

### Phase 2: Context-Aware Suggestions (3-4 days)
Highest value - makes the extension actually smart.

1. Task 1.1: Enhanced Context Collector
2. Task 1.2: Prompt Intent Analyzer
3. Task 1.3: Suggestion Generator
4. Task 1.4: Chat Participant Integration
5. Task 1.5: UI for Suggestion Selection

### Phase 3: Interactive Prompt Builder (2-3 days)
Builds on top of intents from Phase 2.

1. Task 2.1: Question Templates
2. Task 2.2: Prompt Composer
3. Task 2.3: Interactive Chat Flow
4. Task 2.4: Chat Participant Integration

---

## File Structure After Implementation

```
src/
├── context/
│   ├── contextDetector.ts        (existing)
│   ├── enhancedContextCollector.ts  (NEW - Task 1.1)
│   └── packageJsonCache.ts       (existing)
├── analyzer/
│   ├── intentAnalyzer.ts         (NEW - Task 1.2)
├── suggestions/
│   ├── suggestionGenerator.ts    (NEW - Task 1.3)
│   └── suggestionPresenter.ts    (NEW - Task 1.5)
├── builder/
│   ├── questionTemplates.ts      (NEW - Task 2.1)
│   ├── promptComposer.ts         (NEW - Task 2.2)
│   └── interactiveBuilder.ts     (NEW - Task 2.3)
├── templates/
│   ├── templateDefinitions.ts    (NEW - Task 3.1)
│   ├── templateFiller.ts         (NEW - Task 3.2)
│   └── templateSelector.ts       (NEW - Task 3.3)
├── chat/
│   └── chatParticipant.ts        (MODIFY - add /suggest, /build, /template)
└── ...
```

---

## New Chat Commands After Implementation

| Command | Description |
|---------|-------------|
| `@betterprompt <prompt>` | Original behavior - analyze and enhance |
| `@betterprompt /suggest <prompt>` | Show context-aware suggestions |
| `@betterprompt /build` | Start interactive prompt builder |
| `@betterprompt /template` | Show available templates |
| `@betterprompt /template fix-bug` | Use specific template |

---

## Success Metrics

1. **Templates**: User can get a good prompt in <5 seconds without AI
2. **Suggestions**: At least 1 suggestion is relevant 80% of the time
3. **Builder**: User completes flow in <30 seconds

---

## Ready to Start

Awaiting your go-ahead to begin implementation with Phase 1 (Prompt Templates).
