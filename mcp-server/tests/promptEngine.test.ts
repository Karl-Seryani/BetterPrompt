/**
 * Unit tests for Prompt Engine (TDD - Written FIRST)
 */

import { analyzePrompt, enhancePrompt, IssueType, IssueSeverity } from '../src/promptEngine.js';

describe('Prompt Engine', () => {
  describe('analyzePrompt', () => {
    it('should return score 100 for empty prompt', () => {
      const result = analyzePrompt('');

      expect(result.score).toBe(100);
      expect(result.hasMissingContext).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe(IssueType.MISSING_CONTEXT);
    });

    it('should detect vague verbs', () => {
      const result = analyzePrompt('make a login');

      expect(result.hasVagueVerb).toBe(true);
      expect(result.issues.some(i => i.type === IssueType.VAGUE_VERB)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(30);
    });

    it('should detect missing context', () => {
      const result = analyzePrompt('update it');

      expect(result.hasMissingContext).toBe(true);
      expect(result.issues.some(i => i.type === IssueType.MISSING_CONTEXT)).toBe(true);
    });

    it('should detect unclear scope', () => {
      const result = analyzePrompt('build an app');

      expect(result.hasUnclearScope).toBe(true);
      expect(result.issues.some(i => i.type === IssueType.UNCLEAR_SCOPE)).toBe(true);
    });

    it('should NOT flag prompts with technical context', () => {
      const result = analyzePrompt('fix the authentication bug in src/auth.ts');

      expect(result.hasMissingContext).toBe(false);
      expect(result.score).toBeLessThan(50);
    });

    it('should return low score for specific prompts', () => {
      const result = analyzePrompt(
        'Implement JWT authentication with bcrypt password hashing in the User model'
      );

      expect(result.score).toBeLessThan(30);
      expect(result.hasVagueVerb).toBe(false);
    });

    it('should calculate correct score for multiple issues', () => {
      const result = analyzePrompt('make something');

      // Vague verb (30) + Missing context (35) + Unclear scope might add more
      expect(result.score).toBeGreaterThanOrEqual(65);
    });
  });

  describe('enhancePrompt', () => {
    it('should return enhanced prompt with original', async () => {
      const result = await enhancePrompt('make a login', 'auto');

      expect(result.original).toBe('make a login');
      expect(result.enhanced).toBeTruthy();
      expect(result.enhanced).not.toBe(result.original);
    });

    it('should include analysis when requested', async () => {
      const result = await enhancePrompt('make a login', 'auto');

      expect(result.analysis).toBeDefined();
      expect(result.analysis.score).toBeGreaterThan(0);
    });

    it('should have confidence score', async () => {
      const result = await enhancePrompt('fix bug', 'auto');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should specify model used', async () => {
      const result = await enhancePrompt('update it', 'developer');

      expect(result.model).toBeTruthy();
      expect(typeof result.model).toBe('string');
    });

    it('should tailor enhancement for developer level', async () => {
      const result = await enhancePrompt('make a login', 'developer');

      expect(result.enhanced.toLowerCase()).toContain('tdd');
    });

    it('should tailor enhancement for beginner level', async () => {
      const result = await enhancePrompt('make a login', 'beginner');

      expect(result.enhanced.toLowerCase()).toContain('step');
    });

    it('should not excessively enhance already good prompts', async () => {
      const goodPrompt = 'Implement secure JWT authentication using bcrypt';
      const result = await enhancePrompt(goodPrompt, 'auto');

      expect(result.confidence).toBeLessThan(0.6);
    });
  });
});
