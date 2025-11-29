/**
 * Tests for ML Data Generation Pipeline
 * RED phase: These tests should FAIL until we implement the generator
 */

import {
  LabeledPrompt,
  PromptTemplate,
  generatePromptVariations,
  parseLLMResponse,
  validateLabeledPrompt,
  DataGeneratorConfig,
} from '../../../scripts/ml/dataGenerator';

describe('Data Generator', () => {
  describe('LabeledPrompt interface', () => {
    it('should have required fields', () => {
      const labeled: LabeledPrompt = {
        prompt: 'fix the bug',
        vaguenessScore: 75,
        intentCategory: 'fix',
        missingElements: ['which file', 'what bug', 'expected behavior'],
        reasoning: 'Very vague - no context about what to fix or where',
      };

      expect(labeled.prompt).toBeDefined();
      expect(labeled.vaguenessScore).toBeGreaterThanOrEqual(0);
      expect(labeled.vaguenessScore).toBeLessThanOrEqual(100);
      expect(labeled.intentCategory).toBeDefined();
      expect(Array.isArray(labeled.missingElements)).toBe(true);
      expect(labeled.reasoning).toBeDefined();
    });

    it('should support all intent categories', () => {
      const categories = ['build', 'fix', 'learn', 'improve', 'configure', 'unknown'];
      categories.forEach((cat) => {
        const labeled: LabeledPrompt = {
          prompt: 'test',
          vaguenessScore: 50,
          intentCategory: cat as LabeledPrompt['intentCategory'],
          missingElements: [],
          reasoning: 'test',
        };
        expect(labeled.intentCategory).toBe(cat);
      });
    });
  });

  describe('generatePromptVariations', () => {
    it('should generate variations from a base template', () => {
      const template: PromptTemplate = {
        base: 'fix the {component}',
        variables: {
          component: ['bug', 'error', 'issue', 'problem'],
        },
        expectedVagueness: 'high',
      };

      const variations = generatePromptVariations(template);

      expect(variations.length).toBe(4);
      expect(variations).toContain('fix the bug');
      expect(variations).toContain('fix the error');
      expect(variations).toContain('fix the issue');
      expect(variations).toContain('fix the problem');
    });

    it('should handle multiple variables', () => {
      const template: PromptTemplate = {
        base: '{action} the {component}',
        variables: {
          action: ['fix', 'update'],
          component: ['bug', 'code'],
        },
        expectedVagueness: 'high',
      };

      const variations = generatePromptVariations(template);

      // Should produce all combinations: 2 * 2 = 4
      expect(variations.length).toBe(4);
      expect(variations).toContain('fix the bug');
      expect(variations).toContain('fix the code');
      expect(variations).toContain('update the bug');
      expect(variations).toContain('update the code');
    });

    it('should handle templates with no variables', () => {
      const template: PromptTemplate = {
        base: 'make it work',
        variables: {},
        expectedVagueness: 'high',
      };

      const variations = generatePromptVariations(template);

      expect(variations.length).toBe(1);
      expect(variations[0]).toBe('make it work');
    });
  });

  describe('parseLLMResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        vaguenessScore: 85,
        intentCategory: 'fix',
        missingElements: ['file path', 'error message'],
        reasoning: 'Missing context about what to fix',
      });

      const parsed = parseLLMResponse(response, 'fix something');

      expect(parsed).not.toBeNull();
      expect(parsed!.prompt).toBe('fix something');
      expect(parsed!.vaguenessScore).toBe(85);
      expect(parsed!.intentCategory).toBe('fix');
      expect(parsed!.missingElements).toEqual(['file path', 'error message']);
    });

    it('should handle JSON wrapped in markdown code blocks', () => {
      const response = '```json\n{"vaguenessScore": 50, "intentCategory": "build", "missingElements": [], "reasoning": "ok"}\n```';

      const parsed = parseLLMResponse(response, 'build an api');

      expect(parsed).not.toBeNull();
      expect(parsed!.vaguenessScore).toBe(50);
    });

    it('should return null for invalid JSON', () => {
      const response = 'This is not valid JSON';

      const parsed = parseLLMResponse(response, 'test prompt');

      expect(parsed).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const response = JSON.stringify({
        vaguenessScore: 50,
        // missing intentCategory, missingElements, reasoning
      });

      const parsed = parseLLMResponse(response, 'test prompt');

      expect(parsed).toBeNull();
    });

    it('should clamp vaguenessScore to 0-100 range', () => {
      const responseOver = JSON.stringify({
        vaguenessScore: 150,
        intentCategory: 'fix',
        missingElements: [],
        reasoning: 'test',
      });

      const responseUnder = JSON.stringify({
        vaguenessScore: -20,
        intentCategory: 'fix',
        missingElements: [],
        reasoning: 'test',
      });

      const parsedOver = parseLLMResponse(responseOver, 'test');
      const parsedUnder = parseLLMResponse(responseUnder, 'test');

      expect(parsedOver!.vaguenessScore).toBe(100);
      expect(parsedUnder!.vaguenessScore).toBe(0);
    });
  });

  describe('validateLabeledPrompt', () => {
    it('should accept valid labeled prompts', () => {
      const valid: LabeledPrompt = {
        prompt: 'fix the authentication bug in login.ts',
        vaguenessScore: 35,
        intentCategory: 'fix',
        missingElements: ['error message'],
        reasoning: 'Has file and component, missing error details',
      };

      expect(validateLabeledPrompt(valid)).toBe(true);
    });

    it('should reject prompts with empty string', () => {
      const invalid: LabeledPrompt = {
        prompt: '',
        vaguenessScore: 50,
        intentCategory: 'fix',
        missingElements: [],
        reasoning: 'test',
      };

      expect(validateLabeledPrompt(invalid)).toBe(false);
    });

    it('should reject prompts with invalid vagueness score', () => {
      const invalidHigh: LabeledPrompt = {
        prompt: 'test',
        vaguenessScore: 101,
        intentCategory: 'fix',
        missingElements: [],
        reasoning: 'test',
      };

      const invalidLow: LabeledPrompt = {
        prompt: 'test',
        vaguenessScore: -1,
        intentCategory: 'fix',
        missingElements: [],
        reasoning: 'test',
      };

      expect(validateLabeledPrompt(invalidHigh)).toBe(false);
      expect(validateLabeledPrompt(invalidLow)).toBe(false);
    });

    it('should reject prompts with invalid intent category', () => {
      // Use unknown to bypass TypeScript's strict type checking for this test
      const invalid = {
        prompt: 'test',
        vaguenessScore: 50,
        intentCategory: 'invalid_category',
        missingElements: [],
        reasoning: 'test',
      } as unknown as LabeledPrompt;

      expect(validateLabeledPrompt(invalid)).toBe(false);
    });

    it('should reject prompts with empty reasoning', () => {
      const invalid: LabeledPrompt = {
        prompt: 'test',
        vaguenessScore: 50,
        intentCategory: 'fix',
        missingElements: [],
        reasoning: '',
      };

      expect(validateLabeledPrompt(invalid)).toBe(false);
    });
  });

  describe('DataGeneratorConfig', () => {
    it('should have sensible defaults', () => {
      const config: DataGeneratorConfig = {
        targetCount: 1000,
        batchSize: 10,
        outputPath: 'data/training/labeled-prompts.json',
        useCopilot: true,
        useGroq: true,
      };

      expect(config.targetCount).toBeGreaterThan(0);
      expect(config.batchSize).toBeGreaterThan(0);
      expect(config.batchSize).toBeLessThanOrEqual(config.targetCount);
    });
  });
});

describe('Prompt Templates', () => {
  // These tests verify our base prompt templates are well-formed
  // We'll import these from promptTemplates.ts

  it('should have templates for different vagueness levels', async () => {
    const { VAGUE_TEMPLATES, SPECIFIC_TEMPLATES } = await import('../../../scripts/ml/promptTemplates');

    expect(VAGUE_TEMPLATES.length).toBeGreaterThan(10);
    expect(SPECIFIC_TEMPLATES.length).toBeGreaterThan(10);
  });

  it('should have templates for all intent categories', async () => {
    const { TEMPLATES_BY_INTENT } = await import('../../../scripts/ml/promptTemplates');

    expect(TEMPLATES_BY_INTENT.build).toBeDefined();
    expect(TEMPLATES_BY_INTENT.fix).toBeDefined();
    expect(TEMPLATES_BY_INTENT.learn).toBeDefined();
    expect(TEMPLATES_BY_INTENT.improve).toBeDefined();
    expect(TEMPLATES_BY_INTENT.configure).toBeDefined();
  });
});
