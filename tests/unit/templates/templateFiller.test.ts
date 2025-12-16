/**
 * Tests for Template Filler
 * Fills placeholders from context or user input
 */

import { TemplateFiller } from '../../../src/templates/templateFiller';
import { getTemplate } from '../../../src/templates/templateDefinitions';
import { WorkspaceContext } from '../../../src/context/contextDetector';

describe('TemplateFiller', () => {
  let filler: TemplateFiller;

  beforeEach(() => {
    filler = new TemplateFiller();
  });

  describe('autoFillFromContext', () => {
    it('should auto-fill currentFile placeholder', () => {
      const context: WorkspaceContext = {
        currentFile: {
          path: '/full/path/src/auth/login.ts',
          name: 'login.ts',
          language: 'typescript',
          relativePath: 'src/auth/login.ts',
        },
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['React'],
          hasTypeScript: true,
          hasTests: true,
        },
      };

      const template = getTemplate('fix-bug')!;
      const autoFilled = filler.autoFillFromContext(template, context);

      expect(autoFilled['filePath']).toBe('src/auth/login.ts');
    });

    it('should auto-fill firstError placeholder', () => {
      const context: WorkspaceContext = {
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
        diagnostics: {
          errors: 2,
          warnings: 1,
          firstError: "Cannot read property 'id' of undefined",
        },
      };

      const template = getTemplate('fix-bug')!;
      const autoFilled = filler.autoFillFromContext(template, context);

      expect(autoFilled['errorMessage']).toBe("Cannot read property 'id' of undefined");
    });

    it('should auto-fill selectedCode placeholder', () => {
      const context: WorkspaceContext = {
        selectedCode: 'function handleSubmit() { /* ... */ }',
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const template = getTemplate('refactor')!;
      const autoFilled = filler.autoFillFromContext(template, context);

      expect(autoFilled['targetCode']).toBe('function handleSubmit() { /* ... */ }');
    });

    it('should auto-fill detectedFramework placeholder', () => {
      const context: WorkspaceContext = {
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['Next.js', 'React'],
          hasTypeScript: true,
          hasTests: true,
        },
      };

      const template = getTemplate('add-feature')!;
      const autoFilled = filler.autoFillFromContext(template, context);

      expect(autoFilled['framework']).toBe('Next.js');
    });

    it('should auto-fill detectedLanguage placeholder', () => {
      const context: WorkspaceContext = {
        techStack: {
          languages: ['Python', 'JavaScript'],
          frameworks: ['Django'],
          hasTypeScript: false,
          hasTests: true,
        },
      };

      const template = getTemplate('add-feature')!;
      const autoFilled = filler.autoFillFromContext(template, context);

      // Should prefer first detected language
      expect(autoFilled['framework']).toBe('Django');
    });

    it('should leave unknown placeholders empty', () => {
      const context: WorkspaceContext = {
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const template = getTemplate('fix-bug')!;
      const autoFilled = filler.autoFillFromContext(template, context);

      // No current file, so filePath should be empty
      expect(autoFilled['filePath']).toBe('');
      expect(autoFilled['errorMessage']).toBe('');
    });

    it('should truncate long selected code', () => {
      const longCode = 'x'.repeat(1000);
      const context: WorkspaceContext = {
        selectedCode: longCode,
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const template = getTemplate('refactor')!;
      const autoFilled = filler.autoFillFromContext(template, context);

      expect(autoFilled['targetCode'].length).toBeLessThanOrEqual(503); // 500 + "..."
      expect(autoFilled['targetCode'].endsWith('...')).toBe(true);
    });
  });

  describe('fill', () => {
    it('should replace all placeholders with values', () => {
      const template = getTemplate('fix-bug')!;
      const values = {
        errorType: 'TypeError',
        filePath: 'src/auth/login.ts',
        errorMessage: 'user is undefined',
        expectedBehavior: 'Login should work',
        currentBehavior: 'Throws error on submit',
      };

      const result = filler.fill(template, values);

      expect(result.filledTemplate).toContain('TypeError');
      expect(result.filledTemplate).toContain('src/auth/login.ts');
      expect(result.filledTemplate).toContain('user is undefined');
      expect(result.filledTemplate).not.toContain('{{');
      expect(result.filledTemplate).not.toContain('}}');
    });

    it('should handle missing optional values gracefully', () => {
      const template = getTemplate('add-feature')!;
      const values = {
        featureName: 'dark mode',
        location: 'src/App.tsx',
        requirements: 'Toggle between light and dark themes',
        // framework and constraints are optional
      };

      const result = filler.fill(template, values);

      expect(result.filledTemplate).toContain('dark mode');
      expect(result.filledTemplate).toContain('src/App.tsx');
      // Optional fields should be empty, not {{placeholder}}
      expect(result.filledTemplate).not.toContain('{{framework}}');
      expect(result.filledTemplate).not.toContain('{{constraints}}');
    });

    it('should track which placeholders were filled', () => {
      const template = getTemplate('fix-bug')!;
      const values = {
        errorType: 'TypeError',
        filePath: 'src/auth/login.ts',
        // Missing: errorMessage, expectedBehavior, currentBehavior
      };

      const result = filler.fill(template, values);

      expect(result.filledPlaceholders).toContain('errorType');
      expect(result.filledPlaceholders).toContain('filePath');
      expect(result.missingPlaceholders).toContain('errorMessage');
      expect(result.missingPlaceholders).toContain('expectedBehavior');
      expect(result.missingPlaceholders).toContain('currentBehavior');
    });

    it('should report missing required placeholders', () => {
      const template = getTemplate('fix-bug')!;
      const values = {
        // Only optional values, missing required ones
      };

      const result = filler.fill(template, values);

      expect(result.missingRequired.length).toBeGreaterThan(0);
      expect(result.missingRequired).toContain('errorType');
      expect(result.missingRequired).toContain('filePath');
    });

    it('should return isComplete=true when all required filled', () => {
      const template = getTemplate('fix-bug')!;
      const values = {
        errorType: 'TypeError',
        filePath: 'src/auth/login.ts',
        errorMessage: 'user is undefined',
        expectedBehavior: 'Should work',
        currentBehavior: 'Crashes',
      };

      const result = filler.fill(template, values);

      expect(result.isComplete).toBe(true);
      expect(result.missingRequired).toEqual([]);
    });

    it('should return isComplete=false when required missing', () => {
      const template = getTemplate('fix-bug')!;
      const values = {
        errorType: 'TypeError',
        // Missing other required fields
      };

      const result = filler.fill(template, values);

      expect(result.isComplete).toBe(false);
    });
  });

  describe('getPlaceholderPrompts', () => {
    it('should return prompts for unfilled placeholders', () => {
      const template = getTemplate('fix-bug')!;
      const filledValues = {
        errorType: 'TypeError',
        filePath: 'src/auth/login.ts',
      };

      const prompts = filler.getPlaceholderPrompts(template, filledValues);

      // Should not include already filled ones
      expect(prompts.find((p) => p.id === 'errorType')).toBeUndefined();
      expect(prompts.find((p) => p.id === 'filePath')).toBeUndefined();

      // Should include unfilled ones
      const errorMessagePrompt = prompts.find((p) => p.id === 'errorMessage');
      expect(errorMessagePrompt).toBeDefined();
      expect(errorMessagePrompt?.label).toBe('Error message');
    });

    it('should prioritize required placeholders first', () => {
      const template = getTemplate('add-feature')!;
      const filledValues = {};

      const prompts = filler.getPlaceholderPrompts(template, filledValues);

      // Required ones should come before optional
      const requiredIndexes = prompts
        .filter((p) => template.placeholders.find((tp) => tp.id === p.id)?.required)
        .map((p) => prompts.indexOf(p));

      const optionalIndexes = prompts
        .filter((p) => !template.placeholders.find((tp) => tp.id === p.id)?.required)
        .map((p) => prompts.indexOf(p));

      if (requiredIndexes.length > 0 && optionalIndexes.length > 0) {
        expect(Math.max(...requiredIndexes)).toBeLessThan(Math.min(...optionalIndexes));
      }
    });
  });

  describe('preview', () => {
    it('should show filled values and placeholders for unfilled', () => {
      const template = getTemplate('fix-bug')!;
      const values = {
        errorType: 'TypeError',
        filePath: 'src/auth/login.ts',
      };

      const preview = filler.preview(template, values);

      expect(preview).toContain('TypeError');
      expect(preview).toContain('src/auth/login.ts');
      // Unfilled should show placeholder with brackets
      expect(preview).toContain('[errorMessage]');
      expect(preview).toContain('[expectedBehavior]');
    });
  });
});
