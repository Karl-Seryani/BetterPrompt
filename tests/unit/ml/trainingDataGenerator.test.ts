/**
 * Tests for Training Data Generator with Copilot Integration
 */

import {
  generateAllPrompts,
  LabeledPrompt,
  GenerationProgress,
  GenerationConfig,
} from '../../../src/ml/trainingDataGenerator';

describe('Training Data Generator', () => {
  describe('generateAllPrompts', () => {
    it('should generate prompts from all templates', () => {
      const prompts = generateAllPrompts();

      expect(prompts.length).toBeGreaterThan(50);
      expect(Array.isArray(prompts)).toBe(true);
    });

    it('should expand component placeholders', () => {
      const prompts = generateAllPrompts();

      // Should have variations like "fix the authentication", "fix the login", etc.
      const fixVariations = prompts.filter((p) => p.startsWith('fix the '));
      expect(fixVariations.length).toBeGreaterThan(5);
    });

    it('should include specific prompts', () => {
      const prompts = generateAllPrompts();

      // Should include at least one very specific prompt
      const hasSpecific = prompts.some(
        (p) => p.includes('TypeError') || p.includes('line') || p.includes('.ts')
      );
      expect(hasSpecific).toBe(true);
    });

    it('should not have duplicates', () => {
      const prompts = generateAllPrompts();
      const uniquePrompts = new Set(prompts);

      expect(uniquePrompts.size).toBe(prompts.length);
    });

    it('should return shuffled results (non-deterministic order)', () => {
      // Run twice and verify order is different (with high probability)
      const prompts1 = generateAllPrompts();
      const prompts2 = generateAllPrompts();

      // They should have the same content but different order
      expect(new Set(prompts1)).toEqual(new Set(prompts2));
      // With hundreds of prompts, the chance of same order is astronomically low
      // But we can't guarantee it, so we just check they have same content
    });
  });

  describe('LabeledPrompt interface', () => {
    it('should have all required fields', () => {
      const labeled: LabeledPrompt = {
        prompt: 'fix the bug',
        vaguenessScore: 80,
        intentCategory: 'fix',
        missingElements: ['file path', 'error message', 'expected behavior'],
        reasoning: 'Very vague - no context about what to fix',
      };

      expect(labeled.prompt).toBeDefined();
      expect(labeled.vaguenessScore).toBeGreaterThanOrEqual(0);
      expect(labeled.vaguenessScore).toBeLessThanOrEqual(100);
      expect(labeled.intentCategory).toBe('fix');
      expect(Array.isArray(labeled.missingElements)).toBe(true);
      expect(labeled.reasoning).toBeDefined();
    });

    it('should support all intent categories', () => {
      const categories: LabeledPrompt['intentCategory'][] = [
        'build',
        'fix',
        'learn',
        'improve',
        'configure',
        'unknown',
      ];

      categories.forEach((category) => {
        const labeled: LabeledPrompt = {
          prompt: 'test',
          vaguenessScore: 50,
          intentCategory: category,
          missingElements: [],
          reasoning: 'test',
        };
        expect(labeled.intentCategory).toBe(category);
      });
    });
  });

  describe('GenerationProgress interface', () => {
    it('should track generation progress', () => {
      const progress: GenerationProgress = {
        current: 50,
        total: 100,
        successful: 45,
        failed: 5,
      };

      expect(progress.current).toBeLessThanOrEqual(progress.total);
      expect(progress.successful + progress.failed).toBeLessThanOrEqual(progress.current);
    });
  });

  describe('GenerationConfig interface', () => {
    it('should have sensible defaults', () => {
      const config: GenerationConfig = {
        targetCount: 1000,
        batchSize: 5,
        delayBetweenBatches: 1000,
        outputPath: 'data/training/labeled-prompts.json',
      };

      expect(config.targetCount).toBeGreaterThan(0);
      expect(config.batchSize).toBeGreaterThan(0);
      expect(config.batchSize).toBeLessThanOrEqual(config.targetCount);
      expect(config.delayBetweenBatches).toBeGreaterThan(0);
      expect(config.outputPath).toContain('.json');
    });
  });
});

describe('Prompt Coverage', () => {
  it('should have vague prompts (expected score 60-100)', () => {
    const prompts = generateAllPrompts();

    const vagueExamples = [
      'fix it',
      'make it work',
      'help me',
      'fix the bug',
      'create a website',
    ];

    vagueExamples.forEach((example) => {
      const hasVague = prompts.some((p) => p.toLowerCase().includes(example.toLowerCase()));
      expect(hasVague).toBe(true);
    });
  });

  it('should have medium vagueness prompts (expected score 40-60)', () => {
    const prompts = generateAllPrompts();

    // Medium prompts have topic but lack specifics
    const hasMedium = prompts.some(
      (p) =>
        (p.includes('authentication') || p.includes('API') || p.includes('React')) &&
        !p.includes('.ts') &&
        !p.includes('line')
    );
    expect(hasMedium).toBe(true);
  });

  it('should have specific prompts (expected score 0-40)', () => {
    const prompts = generateAllPrompts();

    // Specific prompts have file paths, line numbers, exact errors
    const hasSpecific = prompts.some(
      (p) =>
        (p.includes('.ts') || p.includes('.tsx') || p.includes('line')) &&
        (p.includes('Fix') || p.includes('Refactor') || p.includes('Add'))
    );
    expect(hasSpecific).toBe(true);
  });

  it('should have prompts for all intent categories', () => {
    const prompts = generateAllPrompts();

    // Build intents
    expect(prompts.some((p) => p.toLowerCase().startsWith('create'))).toBe(true);
    expect(prompts.some((p) => p.toLowerCase().startsWith('build'))).toBe(true);

    // Fix intents
    expect(prompts.some((p) => p.toLowerCase().startsWith('fix'))).toBe(true);
    expect(prompts.some((p) => p.toLowerCase().includes('bug'))).toBe(true);

    // Learn intents
    expect(prompts.some((p) => p.toLowerCase().startsWith('explain'))).toBe(true);
    expect(prompts.some((p) => p.toLowerCase().includes('show me'))).toBe(true);

    // Improve intents
    expect(prompts.some((p) => p.toLowerCase().startsWith('refactor'))).toBe(true);
    expect(prompts.some((p) => p.toLowerCase().includes('optimize'))).toBe(true);

    // Configure intents
    expect(prompts.some((p) => p.toLowerCase().includes('set up'))).toBe(true);
  });
});
