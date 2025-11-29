/**
 * Tests for Structural Context Extractor
 */

// Mock vscode BEFORE imports
const mockFindFiles = jest.fn();
const mockWorkspaceFolders: { uri: { fsPath: string }; name: string; index: number }[] | undefined = undefined;

jest.mock('vscode', () => {
  // Store reference to allow mutation
  const workspace = {
    workspaceFolders: mockWorkspaceFolders,
    findFiles: mockFindFiles,
  };
  return {
    workspace,
    Uri: {
      file: (path: string) => ({ fsPath: path }),
    },
  };
});

import * as vscode from 'vscode';
import {
  extractStructuralContext,
  formatStructuralContext,
  StructuralContext,
} from '../../../src/context/structuralContext';

// Helper to create mock URI
const mockUri = (path: string) => ({ fsPath: path });

// Helper to set workspace folders
const setWorkspaceFolders = (
  folders: { uri: { fsPath: string }; name: string; index: number }[] | undefined
) => {
  (vscode.workspace as { workspaceFolders: typeof folders }).workspaceFolders = folders;
};

describe('StructuralContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWorkspaceFolders(undefined);
  });

  describe('extractStructuralContext', () => {
    it('should return null when no workspace folders', async () => {
      setWorkspaceFolders(undefined);

      const result = await extractStructuralContext();

      expect(result).toBeNull();
    });

    it('should return null when workspace is empty', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([]);

      const result = await extractStructuralContext();

      expect(result).toBeNull();
    });

    it('should detect source directory', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([mockUri('/project/src/index.ts'), mockUri('/project/src/utils/helper.ts')]);

      const result = await extractStructuralContext();

      expect(result).not.toBeNull();
      expect(result!.directories.hasSourceDir).toBe(true);
    });

    it('should detect test directory', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([mockUri('/project/tests/unit/app.test.ts'), mockUri('/project/src/index.ts')]);

      const result = await extractStructuralContext();

      expect(result).not.toBeNull();
      expect(result!.directories.hasTestDir).toBe(true);
    });

    it('should detect components and pages for webapp', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([
        mockUri('/project/src/components/Button.tsx'),
        mockUri('/project/src/pages/Home.tsx'),
        mockUri('/project/src/index.ts'),
      ]);

      const result = await extractStructuralContext();

      expect(result).not.toBeNull();
      expect(result!.directories.hasComponentsDir).toBe(true);
      expect(result!.directories.hasPagesDir).toBe(true);
      expect(result!.patterns.hasTypicalWebApp).toBe(true);
      expect(result!.patterns.projectStyle).toBe('webapp');
    });

    it('should detect API project', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([mockUri('/project/src/api/routes.ts'), mockUri('/project/src/server/index.ts')]);

      const result = await extractStructuralContext();

      expect(result).not.toBeNull();
      expect(result!.directories.hasApiDir).toBe(true);
      expect(result!.patterns.hasTypicalApi).toBe(true);
    });

    it('should detect monorepo structure', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([
        mockUri('/project/packages/core/index.ts'),
        mockUri('/project/packages/ui/index.ts'),
        mockUri('/project/packages/api/index.ts'),
      ]);

      const result = await extractStructuralContext();

      expect(result).not.toBeNull();
      expect(result!.patterns.isMonorepo).toBe(true);
      expect(result!.patterns.projectStyle).toBe('monorepo');
    });

    it('should count file types correctly', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([
        mockUri('/project/src/index.ts'),
        mockUri('/project/src/App.tsx'),
        mockUri('/project/src/utils.js'),
        mockUri('/project/styles/main.css'),
        mockUri('/project/tests/app.test.ts'),
        mockUri('/project/package.json'),
        mockUri('/project/README.md'),
      ]);

      const result = await extractStructuralContext();

      expect(result).not.toBeNull();
      expect(result!.fileTypes.typescript).toBe(3); // .ts, .tsx, .test.ts
      expect(result!.fileTypes.javascript).toBe(1);
      expect(result!.fileTypes.styles).toBe(1);
      expect(result!.fileTypes.config).toBe(1);
      expect(result!.fileTypes.markdown).toBe(1);
      expect(result!.fileTypes.tests).toBe(1);
    });

    it('should calculate size metrics', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([
        mockUri('/project/src/index.ts'),
        mockUri('/project/src/components/Button.tsx'),
        mockUri('/project/src/components/ui/Modal.tsx'),
      ]);

      const result = await extractStructuralContext();

      expect(result).not.toBeNull();
      expect(result!.size.totalFiles).toBe(3);
      expect(result!.size.totalDirs).toBeGreaterThan(0);
      expect(result!.size.depth).toBe(3); // src/components/ui/Modal.tsx
    });

    it('should detect library project style', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([
        mockUri('/project/src/index.ts'),
        mockUri('/project/src/utils.ts'),
        mockUri('/project/package.json'),
      ]);

      const result = await extractStructuralContext();

      expect(result).not.toBeNull();
      expect(result!.directories.hasSourceDir).toBe(true);
      expect(result!.directories.hasPagesDir).toBe(false);
      expect(result!.directories.hasComponentsDir).toBe(false);
      expect(result!.patterns.projectStyle).toBe('library');
    });

    it('should detect mixed webapp + api', async () => {
      setWorkspaceFolders([{ uri: mockUri('/project'), name: 'project', index: 0 }]);
      mockFindFiles.mockResolvedValue([
        mockUri('/project/src/components/Button.tsx'),
        mockUri('/project/src/pages/Home.tsx'),
        mockUri('/project/src/api/users.ts'),
      ]);

      const result = await extractStructuralContext();

      expect(result).not.toBeNull();
      expect(result!.patterns.hasTypicalWebApp).toBe(true);
      expect(result!.patterns.hasTypicalApi).toBe(true);
      expect(result!.patterns.projectStyle).toBe('mixed');
    });
  });

  describe('formatStructuralContext', () => {
    it('should format project type', () => {
      const context: StructuralContext = {
        directories: {
          hasSourceDir: true,
          hasTestDir: true,
          hasComponentsDir: true,
          hasPagesDir: true,
          hasApiDir: false,
          hasUtilsDir: true,
          hasConfigDir: false,
          topLevelDirs: ['src', 'tests'],
        },
        fileTypes: {
          typescript: 20,
          javascript: 5,
          styles: 10,
          python: 0,
          rust: 0,
          go: 0,
          config: 3,
          markdown: 2,
          tests: 8,
        },
        patterns: {
          isMonorepo: false,
          hasTypicalWebApp: true,
          hasTypicalApi: false,
          hasTypicalCli: false,
          projectStyle: 'webapp',
        },
        size: {
          totalFiles: 40,
          totalDirs: 12,
          depth: 4,
        },
      };

      const formatted = formatStructuralContext(context);

      expect(formatted).toContain('Project type: webapp');
      expect(formatted).toContain('TypeScript');
      expect(formatted).toContain('40 files');
      expect(formatted).toContain('8 test file(s)');
    });

    it('should format languages correctly', () => {
      const context: StructuralContext = {
        directories: {
          hasSourceDir: true,
          hasTestDir: false,
          hasComponentsDir: false,
          hasPagesDir: false,
          hasApiDir: false,
          hasUtilsDir: false,
          hasConfigDir: false,
          topLevelDirs: ['src'],
        },
        fileTypes: {
          typescript: 0,
          javascript: 0,
          styles: 0,
          python: 15,
          rust: 0,
          go: 0,
          config: 2,
          markdown: 1,
          tests: 5,
        },
        patterns: {
          isMonorepo: false,
          hasTypicalWebApp: false,
          hasTypicalApi: false,
          hasTypicalCli: false,
          projectStyle: 'library',
        },
        size: {
          totalFiles: 20,
          totalDirs: 5,
          depth: 2,
        },
      };

      const formatted = formatStructuralContext(context);

      expect(formatted).toContain('Python');
      expect(formatted).toContain('15 files');
    });

    it('should format directory features', () => {
      const context: StructuralContext = {
        directories: {
          hasSourceDir: true,
          hasTestDir: true,
          hasComponentsDir: false,
          hasPagesDir: false,
          hasApiDir: true,
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
          config: 1,
          markdown: 0,
          tests: 3,
        },
        patterns: {
          isMonorepo: false,
          hasTypicalWebApp: false,
          hasTypicalApi: true,
          hasTypicalCli: false,
          projectStyle: 'api',
        },
        size: {
          totalFiles: 14,
          totalDirs: 4,
          depth: 3,
        },
      };

      const formatted = formatStructuralContext(context);

      expect(formatted).toContain('source');
      expect(formatted).toContain('tests');
      expect(formatted).toContain('API');
    });
  });
});
