/**
 * Unit tests for Enhancement Quality Analyzer
 * Tests the improvement analysis system
 */

import {
  analyzeEnhancementQuality,
  measureSpecificityGain,
  measureActionability,
  measureIssueCoverage,
  measureRelevance,
} from '../../../src/rewriter/qualityAnalyzer';
import { analyzePrompt } from '../../../core/analyzer';

describe('EnhancementQualityAnalyzer', () => {
  describe('measureSpecificityGain', () => {
    it('should return 0 for identical prompts', () => {
      const original = 'make a login';
      const enhanced = 'make a login';

      const gain = measureSpecificityGain(original, enhanced);

      expect(gain).toBe(0);
    });

    it('should return positive gain when enhanced adds file paths', () => {
      const original = 'fix the login bug';
      const enhanced = 'fix the login bug in src/auth/login.ts line 42';

      const gain = measureSpecificityGain(original, enhanced);

      expect(gain).toBeGreaterThan(0);
      expect(gain).toBeGreaterThanOrEqual(0.3); // Significant gain
    });

    it('should return higher gain for more technical terms added', () => {
      const original = 'make a login';
      const enhancedBasic = 'create a login form with email field';
      const enhancedDetailed =
        'implement a React login component with useState hooks, JWT authentication, bcrypt password hashing, and form validation using Yup';

      const basicGain = measureSpecificityGain(original, enhancedBasic);
      const detailedGain = measureSpecificityGain(original, enhancedDetailed);

      expect(detailedGain).toBeGreaterThan(basicGain);
    });

    it('should cap gain at 1.0', () => {
      const original = 'help';
      const enhanced =
        'In src/components/Auth/LoginForm.tsx, implement OAuth2 authentication with Google, GitHub, and Microsoft providers using NextAuth.js, including JWT token refresh, session management, role-based access control, CSRF protection, and rate limiting with Redis';

      const gain = measureSpecificityGain(original, enhanced);

      expect(gain).toBeLessThanOrEqual(1);
    });
  });

  describe('measureActionability', () => {
    it('should return low score for prompts without clear actions', () => {
      const enhanced = 'maybe add some stuff to the thing';

      const score = measureActionability(enhanced);

      expect(score).toBeLessThan(0.3);
    });

    it('should return higher score for numbered steps', () => {
      const enhanced = `Create a login system:
1. Add email/password form
2. Implement validation
3. Connect to authentication API
4. Handle error states`;

      const score = measureActionability(enhanced);

      expect(score).toBeGreaterThan(0.5);
    });

    it('should return higher score for bullet points', () => {
      const enhanced = `Build an API with:
- User authentication
- Input validation
- Rate limiting
- Error handling`;

      const score = measureActionability(enhanced);

      // 4 bullets (0.10) + "Build" verb (0.07) + tech terms like "authentication", "validation" (0.06)
      // Total ~0.22
      expect(score).toBeGreaterThan(0.2);
    });

    it('should return higher score for imperative verbs', () => {
      const vague = 'maybe some authentication would be nice';
      const actionable = 'implement JWT authentication, add password hashing, create login endpoint';

      const vagueScore = measureActionability(vague);
      const actionableScore = measureActionability(actionable);

      expect(actionableScore).toBeGreaterThan(vagueScore);
    });

    it('should recognize question-based prompts as actionable', () => {
      const withQuestions = `Create a login system:
- What technology/framework should be used?
- What are the security requirements?
- Should it support social login?`;

      const score = measureActionability(withQuestions);

      // "Create" verb (0.08) + 3 bullets (0.075) + 3 questions (0.06) = 0.215
      // Plus "framework" tech match = 0.03
      // Questions contribute to actionability as they show thoughtful requirement gathering
      expect(score).toBeGreaterThan(0.2);
    });
  });

  describe('measureIssueCoverage', () => {
    it('should return 1 when no issues were in original', () => {
      const perfectPrompt =
        'In src/auth/login.ts, implement JWT validation with proper error handling';
      const originalAnalysis = analyzePrompt(perfectPrompt);
      const enhanced = perfectPrompt; // Same prompt

      const coverage = measureIssueCoverage(originalAnalysis, enhanced);

      expect(coverage).toBe(1); // No issues to cover = fully covered
    });

    it('should return positive when enhanced addresses vague verb issue', () => {
      const originalAnalysis = analyzePrompt('make a login'); // Has VAGUE_VERB
      const enhanced =
        'Implement a login system with email/password authentication and session management';

      const coverage = measureIssueCoverage(originalAnalysis, enhanced);

      expect(coverage).toBeGreaterThan(0);
    });

    it('should return higher when enhanced adds file context', () => {
      const originalAnalysis = analyzePrompt('fix the bug'); // Has MISSING_CONTEXT
      const enhancedNoContext = 'Fix the bug by adding validation';
      const enhancedWithContext = 'Fix the bug in src/auth/login.ts by adding null check on line 42';

      const noContextCoverage = measureIssueCoverage(originalAnalysis, enhancedNoContext);
      const withContextCoverage = measureIssueCoverage(originalAnalysis, enhancedWithContext);

      expect(withContextCoverage).toBeGreaterThan(noContextCoverage);
    });

    it('should return higher when enhanced adds scope clarification', () => {
      const originalAnalysis = analyzePrompt('build a website'); // Has UNCLEAR_SCOPE
      const enhancedVague = 'Build a website with some stuff';
      // Use pattern that matches the UNCLEAR_SCOPE detection: "with X, Y, Z" or words like "feature"
      const enhancedSpecific =
        'Build a React website. Requirements include: user auth, dashboard, profile management';

      const vagueCoverage = measureIssueCoverage(originalAnalysis, enhancedVague);
      const specificCoverage = measureIssueCoverage(originalAnalysis, enhancedSpecific);

      // The specific one mentions "requirement" which triggers UNCLEAR_SCOPE coverage
      expect(specificCoverage).toBeGreaterThan(vagueCoverage);
    });
  });

  describe('measureRelevance', () => {
    it('should return high score when enhanced stays on topic', () => {
      const original = 'fix the login bug';
      const enhanced = 'Fix the login bug by adding null check for user email in authentication flow';

      const relevance = measureRelevance(original, enhanced);

      expect(relevance).toBeGreaterThan(0.7);
    });

    it('should return lower score when enhanced goes off topic', () => {
      const original = 'fix the login bug';
      const enhanced =
        'Refactor the entire application architecture, migrate to microservices, implement GraphQL';

      const relevance = measureRelevance(original, enhanced);

      expect(relevance).toBeLessThan(0.5);
    });

    it('should handle short original prompts', () => {
      const original = 'help';
      const enhanced = 'What do you need help with? Please provide more details.';

      const relevance = measureRelevance(original, enhanced);

      // Short originals get benefit of doubt
      expect(relevance).toBeGreaterThanOrEqual(0.3);
    });

    it('should recognize preserved key terms as relevant', () => {
      const original = 'add authentication to the React app';
      const enhanced =
        'Implement authentication in the React app using NextAuth.js with Google OAuth';

      const relevance = measureRelevance(original, enhanced);

      expect(relevance).toBeGreaterThan(0.8); // All key terms preserved
    });
  });

  describe('analyzeEnhancementQuality (composite result)', () => {
    it('should return false improvements for poor enhancements', () => {
      const original = 'make a login';
      const enhanced = 'make a login'; // No change
      const originalAnalysis = analyzePrompt(original);

      const quality = analyzeEnhancementQuality(original, enhanced, originalAnalysis);

      // No improvement should be detected
      expect(quality.improvements.addedSpecificity).toBe(false);
      expect(quality.improvements.madeActionable).toBe(false);
    });

    it('should return true improvements for good enhancements', () => {
      const original = 'make a login';
      const enhanced = `Implement a login system in React:
1. Create LoginForm component with email/password fields
2. Add form validation using Yup schema
3. Connect to /api/auth/login endpoint
4. Handle success (redirect to dashboard) and error states
5. Store JWT token in httpOnly cookie

Tech stack: React, TypeScript, Axios for API calls`;

      const originalAnalysis = analyzePrompt(original);

      const quality = analyzeEnhancementQuality(original, enhanced, originalAnalysis);

      // Should detect multiple improvements
      expect(quality.improvements.addedSpecificity).toBe(true);
      expect(quality.improvements.madeActionable).toBe(true);
    });

    it('should break down quality into component scores', () => {
      const original = 'fix the bug';
      const enhanced = 'Fix the NullPointerException in UserService.java line 42';
      const originalAnalysis = analyzePrompt(original);

      const quality = analyzeEnhancementQuality(original, enhanced, originalAnalysis);

      expect(quality).toHaveProperty('improvements');
      expect(quality).toHaveProperty('scores');
      expect(quality.scores).toHaveProperty('specificityGain');
      expect(quality.scores).toHaveProperty('actionability');
      expect(quality.scores).toHaveProperty('issueCoverage');
      expect(quality.scores).toHaveProperty('relevance');
    });

    it('should have improvements boolean and raw scores', () => {
      const original = 'make something';
      const enhanced = `Create a REST API:
1. Set up Express.js server
2. Add authentication middleware
3. Implement CRUD endpoints for users`;

      const originalAnalysis = analyzePrompt(original);

      const quality = analyzeEnhancementQuality(original, enhanced, originalAnalysis);

      // Check improvements are booleans
      expect(typeof quality.improvements.addedSpecificity).toBe('boolean');
      expect(typeof quality.improvements.madeActionable).toBe('boolean');
      expect(typeof quality.improvements.addressedIssues).toBe('boolean');
      expect(typeof quality.improvements.stayedOnTopic).toBe('boolean');

      // Check scores are numbers
      expect(typeof quality.scores.specificityGain).toBe('number');
      expect(typeof quality.scores.actionability).toBe('number');
      expect(typeof quality.scores.issueCoverage).toBe('number');
      expect(typeof quality.scores.relevance).toBe('number');
    });

    it('should always return scores between 0 and 1', () => {
      const testCases = [
        { original: '', enhanced: '' },
        { original: 'help', enhanced: 'What do you need help with?' },
        { original: 'make a website', enhanced: 'Build a React website with authentication' },
        { original: 'x', enhanced: 'x'.repeat(10000) },
      ];

      for (const { original, enhanced } of testCases) {
        const analysis = analyzePrompt(original || 'help');
        const quality = analyzeEnhancementQuality(original, enhanced, analysis);

        expect(quality.scores.specificityGain).toBeGreaterThanOrEqual(0);
        expect(quality.scores.specificityGain).toBeLessThanOrEqual(1);
        expect(quality.scores.actionability).toBeGreaterThanOrEqual(0);
        expect(quality.scores.actionability).toBeLessThanOrEqual(1);
        expect(quality.scores.issueCoverage).toBeGreaterThanOrEqual(0);
        expect(quality.scores.issueCoverage).toBeLessThanOrEqual(1);
        expect(quality.scores.relevance).toBeGreaterThanOrEqual(0);
        expect(quality.scores.relevance).toBeLessThanOrEqual(1);
      }
    });
  });
});
