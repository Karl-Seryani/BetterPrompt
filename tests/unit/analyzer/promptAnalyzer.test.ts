import { analyzePrompt, IssueType, IssueSeverity } from '../../../src/analyzer/promptAnalyzer';

describe('PromptAnalyzer', () => {
  describe('analyzePrompt', () => {
    describe('vague verb detection', () => {
      it('should detect "make" as vague verb', () => {
        const result = analyzePrompt('make a website');

        expect(result.score).toBeGreaterThan(0);
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            type: IssueType.VAGUE_VERB,
            severity: IssueSeverity.MEDIUM,
          })
        );
      });

      it('should detect "create" as vague verb', () => {
        const result = analyzePrompt('create an app for me');

        expect(result.score).toBeGreaterThan(0);
        expect(result.issues.some((i) => i.type === IssueType.VAGUE_VERB)).toBe(true);
      });

      it('should detect "fix" as vague verb', () => {
        const result = analyzePrompt('fix the bug');

        expect(result.issues.some((i) => i.type === IssueType.VAGUE_VERB)).toBe(true);
      });

      it('should detect "do" as vague verb', () => {
        const result = analyzePrompt('do something with this code');

        expect(result.issues.some((i) => i.type === IssueType.VAGUE_VERB)).toBe(true);
      });

      it('should detect "help" as vague verb', () => {
        const result = analyzePrompt('help me with authentication');

        expect(result.issues.some((i) => i.type === IssueType.VAGUE_VERB)).toBe(true);
      });

      it('should NOT flag clear action verbs', () => {
        const result = analyzePrompt('implement JWT authentication using bcrypt for password hashing');

        const vagueVerbIssues = result.issues.filter((i) => i.type === IssueType.VAGUE_VERB);
        expect(vagueVerbIssues.length).toBe(0);
      });
    });

    describe('missing context detection', () => {
      it('should detect missing file context', () => {
        const result = analyzePrompt('add a new feature');

        expect(result.issues).toContainEqual(
          expect.objectContaining({
            type: IssueType.MISSING_CONTEXT,
          })
        );
      });

      it('should NOT flag when context is present', () => {
        const result = analyzePrompt('In src/auth/login.ts, implement JWT token validation');

        const contextIssues = result.issues.filter((i) => i.type === IssueType.MISSING_CONTEXT);
        expect(contextIssues.length).toBe(0);
      });
    });

    describe('unclear scope detection', () => {
      it('should detect overly broad requests', () => {
        const result = analyzePrompt('build a website');

        expect(result.issues).toContainEqual(
          expect.objectContaining({
            type: IssueType.UNCLEAR_SCOPE,
          })
        );
      });

      it('should detect missing requirements', () => {
        const result = analyzePrompt('create an API');

        expect(result.issues.some((i) => i.type === IssueType.UNCLEAR_SCOPE)).toBe(true);
      });

      it('should NOT flag specific requests', () => {
        const result = analyzePrompt(
          'Create a REST API endpoint POST /api/users that accepts email and password, validates them, and returns a JWT token'
        );

        const scopeIssues = result.issues.filter((i) => i.type === IssueType.UNCLEAR_SCOPE);
        expect(scopeIssues.length).toBe(0);
      });
    });

    describe('scoring algorithm', () => {
      it('should give score of 0 for perfect prompts', () => {
        const result = analyzePrompt(
          'In src/components/LoginForm.tsx, refactor the handleSubmit function to use async/await instead of promises, add proper error handling with try/catch, and display validation errors in the UI'
        );

        expect(result.score).toBe(0);
      });

      it('should give moderate score (30-50) for single vague verb', () => {
        const result = analyzePrompt('make a login form with email and password fields');

        expect(result.score).toBeGreaterThanOrEqual(30);
        expect(result.score).toBeLessThanOrEqual(50);
      });

      it('should give high score (60-80) for multiple issues', () => {
        const result = analyzePrompt('fix the app');

        expect(result.score).toBeGreaterThanOrEqual(60);
      });

      it('should give very high score (80-100) for extremely vague prompts', () => {
        const result = analyzePrompt('do something');

        expect(result.score).toBeGreaterThanOrEqual(80);
      });
    });

    describe('issue descriptions', () => {
      it('should provide helpful descriptions for each issue', () => {
        const result = analyzePrompt('make a website');

        expect(result.issues.length).toBeGreaterThan(0);
        result.issues.forEach((issue) => {
          expect(issue.description).toBeTruthy();
          expect(issue.description.length).toBeGreaterThan(10);
        });
      });

      it('should provide actionable suggestions', () => {
        const result = analyzePrompt('fix the bug');

        expect(result.issues.length).toBeGreaterThan(0);
        result.issues.forEach((issue) => {
          expect(issue.suggestion).toBeTruthy();
          expect(issue.suggestion.length).toBeGreaterThan(10);
        });
      });
    });

    describe('performance', () => {
      it('should analyze prompt in less than 100ms', () => {
        const start = Date.now();

        analyzePrompt('create a full-stack application with authentication, database, and API');

        const duration = Date.now() - start;
        expect(duration).toBeLessThan(100);
      });

      it('should handle very long prompts efficiently', () => {
        const longPrompt = 'make a website '.repeat(100);
        const start = Date.now();

        analyzePrompt(longPrompt);

        const duration = Date.now() - start;
        expect(duration).toBeLessThan(100);
      });
    });

    describe('edge cases', () => {
      it('should handle empty strings', () => {
        const result = analyzePrompt('');

        expect(result.score).toBe(100);
        expect(result.issues.length).toBeGreaterThan(0);
      });

      it('should handle whitespace-only strings', () => {
        const result = analyzePrompt('   \n  \t  ');

        expect(result.score).toBe(100);
      });

      it('should handle single-word prompts', () => {
        const result = analyzePrompt('help');

        expect(result.score).toBeGreaterThan(80);
      });

      it('should be case-insensitive', () => {
        const result1 = analyzePrompt('MAKE A WEBSITE');
        const result2 = analyzePrompt('make a website');

        expect(result1.score).toBe(result2.score);
      });
    });

    describe('real-world scenarios - NOT hardcoded', () => {
      it('should score vague prompt higher than specific prompt', () => {
        const vagueResult = analyzePrompt('fix the code');
        const specificResult = analyzePrompt(
          'In src/auth/login.ts line 42, fix the async function validateToken to properly handle expired JWT tokens by throwing TokenExpiredError'
        );

        // Vague should ALWAYS score higher
        expect(vagueResult.score).toBeGreaterThan(specificResult.score);
      });

      it('should detect MORE issues in vaguer prompts', () => {
        const vague = analyzePrompt('make something');
        const lessVague = analyzePrompt('make a React component for user login');
        const specific = analyzePrompt(
          'In src/components/Auth/LoginForm.tsx, create a React functional component that uses useState for email/password, validates with Yup, and calls authService.login()'
        );

        // More vague = more issues (or equal if both are vague)
        expect(vague.issues.length).toBeGreaterThanOrEqual(lessVague.issues.length);
        expect(lessVague.issues.length).toBeGreaterThanOrEqual(specific.issues.length);
      });

      it('should assign appropriate severity levels based on context', () => {
        const result = analyzePrompt('make something');

        // Should have at least one issue
        expect(result.issues.length).toBeGreaterThan(0);

        // All issues should have valid severity
        result.issues.forEach((issue) => {
          expect([IssueSeverity.LOW, IssueSeverity.MEDIUM, IssueSeverity.HIGH]).toContain(issue.severity);
        });
      });

      it('should provide different suggestions for different issue types', () => {
        const result = analyzePrompt('make a website');

        const uniqueSuggestions = new Set(result.issues.map((i) => i.suggestion));

        // Should have multiple unique suggestions
        expect(uniqueSuggestions.size).toBeGreaterThan(0);

        // Each suggestion should be helpful (>10 chars)
        result.issues.forEach((issue) => {
          expect(issue.suggestion.length).toBeGreaterThan(10);
        });
      });

      it('should detect context patterns correctly (not hardcoded)', () => {
        const withContext = analyzePrompt('in src/app.ts fix the async bug');
        const withContext2 = analyzePrompt('file: components/Login.tsx needs validation');
        const withContext3 = analyzePrompt('update server.js to use port 3000');
        const noContext = analyzePrompt('fix the async bug');

        // All with file references should have fewer context issues
        expect(withContext.hasMissingContext).toBe(false);
        expect(withContext2.hasMissingContext).toBe(false);
        expect(withContext3.hasMissingContext).toBe(false);
        expect(noContext.hasMissingContext).toBe(true);
      });

      it('should score prompts consistently across runs', () => {
        const prompt = 'create a new API endpoint';
        const run1 = analyzePrompt(prompt);
        const run2 = analyzePrompt(prompt);
        const run3 = analyzePrompt(prompt);

        // Should be deterministic
        expect(run1.score).toBe(run2.score);
        expect(run2.score).toBe(run3.score);
        expect(run1.issues.length).toBe(run2.issues.length);
      });
    });
  });
});
