/**
 * Tests for Tiered Context Detector
 */

// Mock vscode BEFORE imports
const mockGetConfiguration = jest.fn();
const mockWorkspaceFolders: { uri: { fsPath: string }; name: string; index: number }[] = [];
const mockFindFiles = jest.fn();
const mockActiveTextEditor: { document?: unknown } = {};

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: mockGetConfiguration,
    workspaceFolders: mockWorkspaceFolders,
    findFiles: mockFindFiles,
  },
  window: {
    activeTextEditor: mockActiveTextEditor,
    createOutputChannel: jest.fn().mockReturnValue({
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    }),
  },
  languages: {
    getDiagnostics: jest.fn().mockReturnValue([]),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
  },
}));

// Mock the context modules
jest.mock('../../../src/context/contextDetector', () => ({
  detectContext: jest.fn(),
}));

jest.mock('../../../src/context/structuralContext', () => ({
  extractStructuralContext: jest.fn(),
  formatStructuralContext: jest.fn((ctx) => {
    if (!ctx) {
      return '';
    }
    return `Project type: ${ctx.patterns?.projectStyle || 'unknown'}`;
  }),
}));

jest.mock('../../../src/context/semanticContext', () => ({
  extractSemanticContext: jest.fn(),
  formatSemanticContext: jest.fn((ctx) => {
    if (!ctx) {
      return '';
    }
    return `Functions: ${ctx.functions?.length || 0}`;
  }),
  hasSemanticConsent: jest.fn(),
}));

import type { CancellationToken } from 'vscode';
import type { WorkspaceContext } from '../../../src/context/contextDetector';
import {
  detectTieredContext,
  hasContext,
  getContextSummary,
  getFormattedContext,
} from '../../../src/context/tieredContextDetector';
import { detectContext } from '../../../src/context/contextDetector';
import { extractStructuralContext } from '../../../src/context/structuralContext';
import { extractSemanticContext, hasSemanticConsent } from '../../../src/context/semanticContext';

const mockDetectContext = detectContext as jest.MockedFunction<typeof detectContext>;
const mockExtractStructural = extractStructuralContext as jest.MockedFunction<typeof extractStructuralContext>;
const mockExtractSemantic = extractSemanticContext as jest.MockedFunction<typeof extractSemanticContext>;
const mockHasSemanticConsent = hasSemanticConsent as jest.MockedFunction<typeof hasSemanticConsent>;

// Helper to create valid WorkspaceContext
function createBasicContext(overrides: Partial<WorkspaceContext> = {}): WorkspaceContext {
  return {
    techStack: {
      languages: [],
      frameworks: [],
      hasTypeScript: false,
      hasTests: false,
    },
    ...overrides,
  };
}

describe('TieredContextDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConfiguration.mockReturnValue({
      get: jest.fn().mockReturnValue(false),
    });
    mockHasSemanticConsent.mockReturnValue(false);
  });

  describe('detectTieredContext', () => {
    it('should collect Tier 1 (basic) context', async () => {
      const basicContext = createBasicContext({
        currentFile: {
          path: '/project/src/index.ts',
          name: 'index.ts',
          language: 'typescript',
          relativePath: 'src/index.ts',
        },
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['React'],
          hasTypeScript: true,
          hasTests: false,
        },
      });
      mockDetectContext.mockResolvedValue(basicContext);
      mockExtractStructural.mockResolvedValue(null);

      const result = await detectTieredContext();

      expect(result.basic).toEqual(basicContext);
      expect(result.tiersUsed.basic).toBe(true);
      expect(mockDetectContext).toHaveBeenCalled();
    });

    it('should collect Tier 2 (structural) context', async () => {
      mockDetectContext.mockResolvedValue(createBasicContext());
      const structuralContext = {
        directories: {
          hasSourceDir: true,
          hasTestDir: true,
          hasComponentsDir: false,
          hasPagesDir: false,
          hasApiDir: false,
          hasUtilsDir: false,
          hasConfigDir: false,
          topLevelDirs: ['src', 'tests'],
        },
        fileTypes: {
          typescript: 10,
          javascript: 0,
          styles: 0,
          python: 0,
          rust: 0,
          go: 0,
          config: 2,
          markdown: 1,
          tests: 3,
        },
        patterns: {
          isMonorepo: false,
          hasTypicalWebApp: false,
          hasTypicalApi: false,
          hasTypicalCli: false,
          projectStyle: 'library' as const,
        },
        size: {
          totalFiles: 15,
          totalDirs: 5,
          depth: 3,
        },
      };
      mockExtractStructural.mockResolvedValue(structuralContext);

      const result = await detectTieredContext();

      expect(result.structural).toEqual(structuralContext);
      expect(result.tiersUsed.structural).toBe(true);
    });

    it('should collect Tier 3 (semantic) context when consent granted', async () => {
      mockDetectContext.mockResolvedValue(createBasicContext());
      mockExtractStructural.mockResolvedValue(null);
      mockHasSemanticConsent.mockReturnValue(true);
      const semanticContext = {
        functions: [
          {
            name: 'test',
            signature: 'function test()',
            filePath: '/test.ts',
            isAsync: false,
            isExported: true,
            hasJSDoc: false,
          },
        ],
        classes: [],
        imports: [],
        exports: [],
        documentation: [],
        patterns: ['async/await'],
      };
      mockExtractSemantic.mockReturnValue(semanticContext);

      const result = await detectTieredContext();

      expect(result.semantic).toEqual(semanticContext);
      expect(result.tiersUsed.semantic).toBe(true);
    });

    it('should skip Tier 3 when no consent', async () => {
      mockDetectContext.mockResolvedValue(createBasicContext());
      mockExtractStructural.mockResolvedValue(null);
      mockHasSemanticConsent.mockReturnValue(false);

      const result = await detectTieredContext();

      expect(result.semantic).toBeNull();
      expect(result.tiersUsed.semantic).toBe(false);
      expect(mockExtractSemantic).not.toHaveBeenCalled();
    });

    it('should skip Tier 2 when skipStructural option is true', async () => {
      mockDetectContext.mockResolvedValue(createBasicContext());

      const result = await detectTieredContext({ skipStructural: true });

      expect(result.structural).toBeNull();
      expect(result.tiersUsed.structural).toBe(false);
      expect(mockExtractStructural).not.toHaveBeenCalled();
    });

    it('should skip Tier 3 when skipSemantic option is true', async () => {
      mockDetectContext.mockResolvedValue(createBasicContext());
      mockExtractStructural.mockResolvedValue(null);
      mockHasSemanticConsent.mockReturnValue(true);

      const result = await detectTieredContext({ skipSemantic: true });

      expect(result.semantic).toBeNull();
      expect(result.tiersUsed.semantic).toBe(false);
      expect(mockExtractSemantic).not.toHaveBeenCalled();
    });

    it('should handle cancellation early', async () => {
      const token = { isCancellationRequested: true } as CancellationToken;

      const result = await detectTieredContext({ token });

      expect(result.basic).toBeNull();
      expect(result.structural).toBeNull();
      expect(result.semantic).toBeNull();
      expect(result.formatted).toBe('');
    });

    it('should combine formatted context from all tiers', async () => {
      const basicContext = createBasicContext({
        currentFile: {
          path: '/project/src/App.tsx',
          name: 'App.tsx',
          language: 'typescriptreact',
          relativePath: 'src/App.tsx',
        },
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['React'],
          hasTypeScript: true,
          hasTests: false,
        },
      });
      mockDetectContext.mockResolvedValue(basicContext);

      const structuralContext = {
        directories: {
          hasSourceDir: true,
          hasTestDir: false,
          hasComponentsDir: true,
          hasPagesDir: true,
          hasApiDir: false,
          hasUtilsDir: false,
          hasConfigDir: false,
          topLevelDirs: ['src'],
        },
        fileTypes: {
          typescript: 20,
          javascript: 0,
          styles: 5,
          python: 0,
          rust: 0,
          go: 0,
          config: 2,
          markdown: 1,
          tests: 0,
        },
        patterns: {
          isMonorepo: false,
          hasTypicalWebApp: true,
          hasTypicalApi: false,
          hasTypicalCli: false,
          projectStyle: 'webapp' as const,
        },
        size: {
          totalFiles: 30,
          totalDirs: 8,
          depth: 4,
        },
      };
      mockExtractStructural.mockResolvedValue(structuralContext);

      const result = await detectTieredContext();

      expect(result.formatted).toContain('Currently editing: src/App.tsx');
      expect(result.formatted).toContain('Tech stack: TypeScript, React');
      expect(result.formatted).toContain('webapp');
    });
  });

  describe('hasContext', () => {
    it('should return true when any tier has context', () => {
      const context = {
        basic: null,
        structural: null,
        semantic: null,
        formatted: '',
        tiersUsed: { basic: true, structural: false, semantic: false },
      };

      expect(hasContext(context)).toBe(true);
    });

    it('should return false when no tiers have context', () => {
      const context = {
        basic: null,
        structural: null,
        semantic: null,
        formatted: '',
        tiersUsed: { basic: false, structural: false, semantic: false },
      };

      expect(hasContext(context)).toBe(false);
    });
  });

  describe('getContextSummary', () => {
    it('should return summary of used tiers', () => {
      const context = {
        basic: null,
        structural: null,
        semantic: null,
        formatted: '',
        tiersUsed: { basic: true, structural: true, semantic: false },
      };

      const summary = getContextSummary(context);

      expect(summary).toContain('2 tier(s)');
      expect(summary).toContain('basic');
      expect(summary).toContain('structural');
      expect(summary).not.toContain('semantic');
    });

    it('should return "No context available" when no tiers used', () => {
      const context = {
        basic: null,
        structural: null,
        semantic: null,
        formatted: '',
        tiersUsed: { basic: false, structural: false, semantic: false },
      };

      expect(getContextSummary(context)).toBe('No context available');
    });
  });

  describe('getFormattedContext', () => {
    it('should return full context when under limit', () => {
      const context = {
        basic: null,
        structural: null,
        semantic: null,
        formatted: 'Short context',
        tiersUsed: { basic: true, structural: false, semantic: false },
      };

      expect(getFormattedContext(context, 100)).toBe('Short context');
    });

    it('should truncate when over limit', () => {
      const context = {
        basic: null,
        structural: null,
        semantic: null,
        formatted: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
        tiersUsed: { basic: true, structural: false, semantic: false },
      };

      const result = getFormattedContext(context, 15);

      expect(result).toContain('Line 1');
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(20); // Some buffer for truncation marker
    });

    it('should return full context when no limit specified', () => {
      const longContext = 'A'.repeat(10000);
      const context = {
        basic: null,
        structural: null,
        semantic: null,
        formatted: longContext,
        tiersUsed: { basic: true, structural: false, semantic: false },
      };

      expect(getFormattedContext(context)).toBe(longContext);
    });
  });
});
