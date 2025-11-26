/**
 * Unit tests for Context Detector
 */

import { formatContextForPrompt, WorkspaceContext } from '../../../src/context/contextDetector';

describe('Context Detector', () => {
  describe('formatContextForPrompt', () => {
    it('should format basic file context', () => {
      const context: WorkspaceContext = {
        currentFile: {
          path: '/project/src/index.ts',
          name: 'index.ts',
          language: 'typescript',
          relativePath: 'src/index.ts',
        },
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Currently editing: src/index.ts (typescript)');
    });

    it('should include tech stack when present', () => {
      const context: WorkspaceContext = {
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['React', 'Next.js'],
          hasTypeScript: true,
          hasTests: true,
          packageManager: 'npm',
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Tech stack: React, Next.js');
      expect(result).toContain('Using TypeScript');
    });

    it('should include selected code when present', () => {
      const context: WorkspaceContext = {
        selectedCode: 'function hello() { return "world"; }',
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Selected code:');
      expect(result).toContain('function hello()');
    });

    it('should truncate long selected code', () => {
      const longCode = 'x'.repeat(600);
      const context: WorkspaceContext = {
        selectedCode: longCode,
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('...');
      expect(result.length).toBeLessThan(longCode.length);
    });

    it('should include error diagnostics when present', () => {
      const context: WorkspaceContext = {
        diagnostics: {
          errors: 2,
          warnings: 1,
          firstError: "Cannot find name 'foo'",
        },
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('2 error(s)');
      expect(result).toContain("Cannot find name 'foo'");
    });

    it('should return empty string when no context available', () => {
      const context: WorkspaceContext = {
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toBe('');
    });

    it('should format full context correctly', () => {
      const context: WorkspaceContext = {
        currentFile: {
          path: '/project/src/App.tsx',
          name: 'App.tsx',
          language: 'typescriptreact',
          relativePath: 'src/App.tsx',
        },
        selectedCode: 'const [state, setState] = useState()',
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['React', 'Tailwind CSS'],
          hasTypeScript: true,
          hasTests: true,
          packageManager: 'npm',
        },
        diagnostics: {
          errors: 1,
          warnings: 3,
          firstError: 'Expected 1 argument, but got 0',
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('src/App.tsx');
      expect(result).toContain('React, Tailwind CSS');
      expect(result).toContain('Using TypeScript');
      expect(result).toContain('useState');
      expect(result).toContain('1 error(s)');
    });
  });
});

