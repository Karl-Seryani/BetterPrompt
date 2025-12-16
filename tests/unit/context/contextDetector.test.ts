/**
 * Unit tests for Context Detector
 */

import { formatContextForPrompt, WorkspaceContext, detectContext } from '../../../src/context/contextDetector';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock packageJsonCache
jest.mock('../../../src/context/packageJsonCache', () => ({
  getPackageJsonCache: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Get the mock for manipulation in tests
import { getPackageJsonCache } from '../../../src/context/packageJsonCache';
const mockGetPackageJsonCache = getPackageJsonCache as jest.Mock;

// Mock vscode
jest.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
  },
  workspace: {
    workspaceFolders: undefined,
  },
  languages: {
    getDiagnostics: jest.fn(() => []),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
}));

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

    it('should show languages when no frameworks present', () => {
      const context: WorkspaceContext = {
        techStack: {
          languages: ['Python', 'JavaScript'],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Language: Python, JavaScript');
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

    it('should show error count without message when firstError is undefined', () => {
      const context: WorkspaceContext = {
        diagnostics: {
          errors: 3,
          warnings: 0,
        },
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('3 error(s)');
      expect(result).not.toContain('":');
    });

    it('should not show diagnostics when errors is 0', () => {
      const context: WorkspaceContext = {
        diagnostics: {
          errors: 0,
          warnings: 5,
        },
        techStack: {
          languages: [],
          frameworks: [],
          hasTypeScript: false,
          hasTests: false,
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).not.toContain('error');
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

  describe('detectContext', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset vscode mocks
      (vscode.window as any).activeTextEditor = undefined;
      (vscode.workspace as any).workspaceFolders = undefined;
      (vscode.languages.getDiagnostics as jest.Mock).mockReturnValue([]);

      // Reset fs mocks
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      // Reset cache mock
      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });
    });

    it('should return empty context when no editor is open', async () => {
      const context = await detectContext();

      expect(context.currentFile).toBeUndefined();
      expect(context.selectedCode).toBeUndefined();
      expect(context.techStack.languages).toEqual([]);
      expect(context.techStack.frameworks).toEqual([]);
    });

    it('should detect current file info', async () => {
      const mockDocument = {
        uri: { fsPath: '/project/src/index.ts' },
        languageId: 'typescript',
        getText: jest.fn(),
      };

      const mockEditor = {
        document: mockDocument,
        selection: { isEmpty: true },
      };

      (vscode.window as any).activeTextEditor = mockEditor;
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      const context = await detectContext();

      expect(context.currentFile).toEqual({
        path: '/project/src/index.ts',
        name: 'index.ts',
        language: 'typescript',
        relativePath: 'src/index.ts',
      });
    });

    it('should detect selected code', async () => {
      const mockDocument = {
        uri: { fsPath: '/project/src/index.ts' },
        languageId: 'typescript',
        getText: jest.fn().mockReturnValue('const x = 1;'),
      };

      const mockEditor = {
        document: mockDocument,
        selection: { isEmpty: false },
      };

      (vscode.window as any).activeTextEditor = mockEditor;

      const context = await detectContext();

      expect(context.selectedCode).toBe('const x = 1;');
    });

    it('should not include selected code when selection is empty', async () => {
      const mockDocument = {
        uri: { fsPath: '/project/src/index.ts' },
        languageId: 'typescript',
        getText: jest.fn(),
      };

      const mockEditor = {
        document: mockDocument,
        selection: { isEmpty: true },
      };

      (vscode.window as any).activeTextEditor = mockEditor;

      const context = await detectContext();

      expect(context.selectedCode).toBeUndefined();
      expect(mockDocument.getText).not.toHaveBeenCalled();
    });

    it('should detect diagnostics with errors', async () => {
      const mockDocument = {
        uri: { fsPath: '/project/src/index.ts' },
        languageId: 'typescript',
        getText: jest.fn(),
      };

      const mockEditor = {
        document: mockDocument,
        selection: { isEmpty: true },
      };

      const mockDiagnostics = [
        { severity: vscode.DiagnosticSeverity.Error, message: 'Type error here' },
        { severity: vscode.DiagnosticSeverity.Error, message: 'Another error' },
        { severity: vscode.DiagnosticSeverity.Warning, message: 'A warning' },
      ];

      (vscode.window as any).activeTextEditor = mockEditor;
      (vscode.languages.getDiagnostics as jest.Mock).mockReturnValue(mockDiagnostics);

      const context = await detectContext();

      expect(context.diagnostics).toEqual({
        errors: 2,
        warnings: 1,
        firstError: 'Type error here',
      });
    });

    it('should not include diagnostics when no errors or warnings', async () => {
      const mockDocument = {
        uri: { fsPath: '/project/src/index.ts' },
        languageId: 'typescript',
        getText: jest.fn(),
      };

      const mockEditor = {
        document: mockDocument,
        selection: { isEmpty: true },
      };

      (vscode.window as any).activeTextEditor = mockEditor;
      (vscode.languages.getDiagnostics as jest.Mock).mockReturnValue([]);

      const context = await detectContext();

      expect(context.diagnostics).toBeUndefined();
    });

    it('should use absolute path when no workspace folder', async () => {
      const mockDocument = {
        uri: { fsPath: '/some/absolute/path/file.ts' },
        languageId: 'typescript',
        getText: jest.fn(),
      };

      const mockEditor = {
        document: mockDocument,
        selection: { isEmpty: true },
      };

      (vscode.window as any).activeTextEditor = mockEditor;
      (vscode.workspace as any).workspaceFolders = undefined;

      const context = await detectContext();

      expect(context.currentFile?.relativePath).toBe('/some/absolute/path/file.ts');
    });
  });

  describe('detectTechStack', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
    });

    it('should detect Node.js/JavaScript project with npm', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      // Mock package.json cache
      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          dependencies: { express: '^4.18.0' },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      // Mock file existence - npm lock file exists
      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('package-lock.json')) {
          return undefined; // file exists
        }
        throw new Error('ENOENT');
      });

      const context = await detectContext();

      expect(context.techStack.languages).toContain('JavaScript');
      expect(context.techStack.frameworks).toContain('Express');
      expect(context.techStack.packageManager).toBe('npm');
    });

    it('should detect TypeScript project', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          devDependencies: { typescript: '^5.0.0' },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      const context = await detectContext();

      expect(context.techStack.hasTypeScript).toBe(true);
      expect(context.techStack.languages).toContain('TypeScript');
    });

    it('should detect TypeScript from tsconfig.json', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          dependencies: {},
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('tsconfig.json')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const context = await detectContext();

      expect(context.techStack.hasTypeScript).toBe(true);
    });

    it('should detect React framework', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      const context = await detectContext();

      expect(context.techStack.frameworks).toContain('React');
    });

    it('should detect Next.js framework', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          dependencies: { next: '^14.0.0', react: '^18.0.0' },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      const context = await detectContext();

      expect(context.techStack.frameworks).toContain('Next.js');
      expect(context.techStack.frameworks).toContain('React');
    });

    it('should detect Vue framework', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          dependencies: { vue: '^3.0.0' },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      const context = await detectContext();

      expect(context.techStack.frameworks).toContain('Vue');
    });

    it('should detect NestJS from @nestjs/core', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          dependencies: { '@nestjs/core': '^10.0.0' },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      const context = await detectContext();

      expect(context.techStack.frameworks).toContain('NestJS');
    });

    it('should detect testing frameworks', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          devDependencies: { jest: '^29.0.0' },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      const context = await detectContext();

      expect(context.techStack.hasTests).toBe(true);
    });

    it('should detect pnpm package manager', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({ dependencies: {} }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('pnpm-lock.yaml')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const context = await detectContext();

      expect(context.techStack.packageManager).toBe('pnpm');
    });

    it('should detect yarn package manager', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({ dependencies: {} }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('yarn.lock')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const context = await detectContext();

      expect(context.techStack.packageManager).toBe('yarn');
    });

    it('should detect Python project from requirements.txt', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('requirements.txt')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (path) => {
        if (String(path).includes('requirements.txt')) {
          return 'flask==2.0.0\npytest==7.0.0';
        }
        throw new Error('ENOENT');
      });

      const context = await detectContext();

      expect(context.techStack.languages).toContain('Python');
      expect(context.techStack.frameworks).toContain('Flask');
      expect(context.techStack.hasTests).toBe(true);
      expect(context.techStack.packageManager).toBe('pip');
    });

    it('should detect Django framework', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('requirements.txt')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockResolvedValue('django==4.0.0');

      const context = await detectContext();

      expect(context.techStack.frameworks).toContain('Django');
    });

    it('should detect FastAPI framework', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('requirements.txt')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockResolvedValue('fastapi==0.100.0\nuvicorn==0.23.0');

      const context = await detectContext();

      expect(context.techStack.frameworks).toContain('FastAPI');
    });

    it('should detect Python from pyproject.toml', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('pyproject.toml')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const context = await detectContext();

      expect(context.techStack.languages).toContain('Python');
      expect(context.techStack.packageManager).toBe('pip');
    });

    it('should detect Rust project', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('Cargo.toml')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const context = await detectContext();

      expect(context.techStack.languages).toContain('Rust');
      expect(context.techStack.packageManager).toBe('cargo');
    });

    it('should detect Go project', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('go.mod')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const context = await detectContext();

      expect(context.techStack.languages).toContain('Go');
      expect(context.techStack.packageManager).toBe('go');
    });

    it('should handle requirements.txt read errors gracefully', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      mockFs.access.mockImplementation(async (path) => {
        if (String(path).includes('requirements.txt')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      // Reading fails even though file exists
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const context = await detectContext();

      // Should still detect Python, just not frameworks
      expect(context.techStack.languages).toContain('Python');
      expect(context.techStack.frameworks).toEqual([]);
    });

    it('should detect multiple frameworks', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          dependencies: {
            react: '^18.0.0',
            tailwindcss: '^3.0.0',
            express: '^4.18.0',
          },
          devDependencies: {
            typescript: '^5.0.0',
            vitest: '^1.0.0',
          },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      const context = await detectContext();

      expect(context.techStack.frameworks).toContain('React');
      expect(context.techStack.frameworks).toContain('Tailwind CSS');
      expect(context.techStack.frameworks).toContain('Express');
      expect(context.techStack.hasTypeScript).toBe(true);
      expect(context.techStack.hasTests).toBe(true);
    });

    it('should detect Svelte, Angular, Fastify, Hono, Electron', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          dependencies: {
            svelte: '^4.0.0',
            angular: '^17.0.0',
            fastify: '^4.0.0',
            hono: '^3.0.0',
            electron: '^28.0.0',
          },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      const context = await detectContext();

      expect(context.techStack.frameworks).toContain('Svelte');
      expect(context.techStack.frameworks).toContain('Angular');
      expect(context.techStack.frameworks).toContain('Fastify');
      expect(context.techStack.frameworks).toContain('Hono');
      expect(context.techStack.frameworks).toContain('Electron');
    });

    it('should detect mocha and cypress as testing frameworks', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project' } }];

      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          devDependencies: {
            mocha: '^10.0.0',
          },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      let context = await detectContext();
      expect(context.techStack.hasTests).toBe(true);

      // Test cypress
      mockGetPackageJsonCache.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          devDependencies: {
            cypress: '^13.0.0',
          },
        }),
        invalidate: jest.fn(),
        clear: jest.fn(),
      });

      context = await detectContext();
      expect(context.techStack.hasTests).toBe(true);
    });
  });
});
