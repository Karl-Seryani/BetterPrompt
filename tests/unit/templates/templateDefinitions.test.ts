/**
 * Tests for Prompt Template Definitions
 * TDD: RED phase - these tests should fail until implementation
 */

import {
  TEMPLATES,
  getTemplate,
  getAllTemplates,
  getTemplatesByCategory,
  PromptTemplate,
  TemplateCategory,
} from '../../../src/templates/templateDefinitions';

describe('TemplateDefinitions', () => {
  describe('TEMPLATES constant', () => {
    it('should have fix-bug template', () => {
      const template = TEMPLATES.find((t) => t.id === 'fix-bug');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Fix Bug');
      expect(template?.category).toBe('debug');
    });

    it('should have add-feature template', () => {
      const template = TEMPLATES.find((t) => t.id === 'add-feature');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Add Feature');
      expect(template?.category).toBe('create');
    });

    it('should have refactor template', () => {
      const template = TEMPLATES.find((t) => t.id === 'refactor');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Refactor Code');
      expect(template?.category).toBe('improve');
    });

    it('should have explain template', () => {
      const template = TEMPLATES.find((t) => t.id === 'explain');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Explain Code');
      expect(template?.category).toBe('learn');
    });

    it('should have write-test template', () => {
      const template = TEMPLATES.find((t) => t.id === 'write-test');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Write Tests');
      expect(template?.category).toBe('test');
    });

    it('should have api-endpoint template', () => {
      const template = TEMPLATES.find((t) => t.id === 'api-endpoint');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Create API Endpoint');
      expect(template?.category).toBe('create');
    });
  });

  describe('Template structure validation', () => {
    it('all templates should have required fields', () => {
      TEMPLATES.forEach((template) => {
        expect(template.id).toBeDefined();
        expect(template.id.length).toBeGreaterThan(0);
        expect(template.name).toBeDefined();
        expect(template.name.length).toBeGreaterThan(0);
        expect(template.description).toBeDefined();
        expect(template.template).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.placeholders).toBeDefined();
        expect(Array.isArray(template.placeholders)).toBe(true);
      });
    });

    it('all templates should have valid placeholders', () => {
      TEMPLATES.forEach((template) => {
        template.placeholders.forEach((placeholder) => {
          expect(placeholder.id).toBeDefined();
          expect(placeholder.label).toBeDefined();
          // Each placeholder in template string should exist in placeholders array
          expect(template.template).toContain(`{{${placeholder.id}}}`);
        });
      });
    });

    it('all placeholders in template strings should be defined', () => {
      TEMPLATES.forEach((template) => {
        // Extract all {{placeholder}} from template string
        const matches = template.template.match(/\{\{(\w+)\}\}/g) || [];
        const placeholderIds = matches.map((m) => m.replace(/[{}]/g, ''));

        placeholderIds.forEach((id) => {
          const found = template.placeholders.find((p) => p.id === id);
          expect(found).toBeDefined();
        });
      });
    });

    it('template IDs should be unique', () => {
      const ids = TEMPLATES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getTemplate', () => {
    it('should return template by ID', () => {
      const template = getTemplate('fix-bug');
      expect(template).toBeDefined();
      expect(template?.id).toBe('fix-bug');
    });

    it('should return undefined for non-existent ID', () => {
      const template = getTemplate('non-existent');
      expect(template).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const template = getTemplate('FIX-BUG');
      expect(template).toBeUndefined();
    });
  });

  describe('getAllTemplates', () => {
    it('should return all templates', () => {
      const templates = getAllTemplates();
      expect(templates.length).toBe(TEMPLATES.length);
      expect(templates.length).toBeGreaterThanOrEqual(6);
    });

    it('should return a copy, not the original array', () => {
      const templates = getAllTemplates();
      templates.push({} as PromptTemplate);
      expect(getAllTemplates().length).toBe(TEMPLATES.length);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates filtered by category', () => {
      const debugTemplates = getTemplatesByCategory('debug');
      expect(debugTemplates.length).toBeGreaterThan(0);
      debugTemplates.forEach((t) => {
        expect(t.category).toBe('debug');
      });
    });

    it('should return empty array for category with no templates', () => {
      const templates = getTemplatesByCategory('nonexistent' as TemplateCategory);
      expect(templates).toEqual([]);
    });

    it('should return multiple templates for create category', () => {
      const createTemplates = getTemplatesByCategory('create');
      expect(createTemplates.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Placeholder autoFill hints', () => {
    it('fix-bug template should have autoFill for filePath', () => {
      const template = getTemplate('fix-bug');
      const filePathPlaceholder = template?.placeholders.find((p) => p.id === 'filePath');
      expect(filePathPlaceholder?.autoFill).toBe('currentFile');
    });

    it('fix-bug template should have autoFill for errorMessage', () => {
      const template = getTemplate('fix-bug');
      const errorPlaceholder = template?.placeholders.find((p) => p.id === 'errorMessage');
      expect(errorPlaceholder?.autoFill).toBe('firstError');
    });

    it('add-feature template should have autoFill for framework', () => {
      const template = getTemplate('add-feature');
      const frameworkPlaceholder = template?.placeholders.find((p) => p.id === 'framework');
      expect(frameworkPlaceholder?.autoFill).toBe('detectedFramework');
    });
  });

  describe('Template content quality', () => {
    it('fix-bug template should produce actionable prompt', () => {
      const template = getTemplate('fix-bug');
      expect(template?.template).toContain('{{errorType}}');
      expect(template?.template).toContain('{{filePath}}');
      expect(template?.template).toContain('{{errorMessage}}');
    });

    it('add-feature template should include where and what', () => {
      const template = getTemplate('add-feature');
      expect(template?.template).toContain('{{featureName}}');
      expect(template?.template).toContain('{{location}}');
    });

    it('refactor template should specify what to improve', () => {
      const template = getTemplate('refactor');
      expect(template?.template).toContain('{{targetCode}}');
      expect(template?.template).toContain('{{improvement}}');
    });

    it('write-test template should specify what to test', () => {
      const template = getTemplate('write-test');
      expect(template?.template).toContain('{{targetFunction}}');
      expect(template?.template).toContain('{{testCases}}');
    });
  });
});
