/**
 * Tests for Semantic Context Extractor (Tier 3)
 */

// Mock vscode BEFORE imports
const mockGetConfiguration = jest.fn();
const mockShowInformationMessage = jest.fn();
const mockConfigUpdate = jest.fn();

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: mockGetConfiguration,
  },
  window: {
    showInformationMessage: mockShowInformationMessage,
    activeTextEditor: undefined,
    createOutputChannel: jest.fn().mockReturnValue({
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    }),
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

import * as vscode from 'vscode';
import {
  extractSemanticContext,
  formatSemanticContext,
  hasSemanticConsent,
  requestSemanticConsent,
  SemanticContext,
} from '../../../src/context/semanticContext';

// Helper to create mock document
const createMockDocument = (content: string, languageId = 'typescript') => ({
  getText: () => content,
  uri: { fsPath: '/project/src/test.ts' },
  languageId,
});

describe('SemanticContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: consent enabled
    mockGetConfiguration.mockReturnValue({
      get: jest.fn().mockReturnValue(true),
      update: mockConfigUpdate,
    });
  });

  describe('hasSemanticConsent', () => {
    it('should return true when consent is enabled', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn().mockReturnValue(true),
      });

      const result = hasSemanticConsent();

      expect(result).toBe(true);
      expect(mockGetConfiguration).toHaveBeenCalledWith('betterprompt');
    });

    it('should return false when consent is disabled', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn().mockReturnValue(false),
      });

      const result = hasSemanticConsent();

      expect(result).toBe(false);
    });
  });

  describe('requestSemanticConsent', () => {
    it('should enable consent when user allows', async () => {
      mockShowInformationMessage.mockResolvedValue('Allow');

      const result = await requestSemanticConsent();

      expect(result).toBe(true);
      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'enableSemanticContext',
        true,
        1 // ConfigurationTarget.Global
      );
    });

    it('should not enable consent when user denies', async () => {
      mockShowInformationMessage.mockResolvedValue('Deny');

      const result = await requestSemanticConsent();

      expect(result).toBe(false);
      expect(mockConfigUpdate).not.toHaveBeenCalled();
    });

    it('should not enable consent when dialog is dismissed', async () => {
      mockShowInformationMessage.mockResolvedValue(undefined);

      const result = await requestSemanticConsent();

      expect(result).toBe(false);
    });
  });

  describe('extractSemanticContext', () => {
    it('should return null when no consent', async () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn().mockReturnValue(false),
      });

      const doc = createMockDocument('const x = 1;');
      const result = extractSemanticContext(doc as any);

      expect(result).toBeNull();
    });

    it('should return null when cancelled', async () => {
      const doc = createMockDocument('const x = 1;');
      const token = { isCancellationRequested: true } as vscode.CancellationToken;

      const result = extractSemanticContext(doc as any, token);

      expect(result).toBeNull();
    });

    it('should return null for unsupported languages', async () => {
      const doc = createMockDocument('print("hello")', 'python');

      const result = extractSemanticContext(doc as any);

      expect(result).toBeNull();
    });

    it('should extract regular function declarations', async () => {
      const code = `
        export function greet(name: string): string {
          return \`Hello, \${name}\`;
        }

        async function fetchData(url: string) {
          return fetch(url);
        }
      `;
      const doc = createMockDocument(code);

      const result = extractSemanticContext(doc as any);

      expect(result).not.toBeNull();
      expect(result!.functions.length).toBe(2);
      expect(result!.functions[0].name).toBe('greet');
      expect(result!.functions[0].isExported).toBe(true);
      expect(result!.functions[0].isAsync).toBe(false);
      expect(result!.functions[1].name).toBe('fetchData');
      expect(result!.functions[1].isAsync).toBe(true);
    });

    it('should extract arrow functions', async () => {
      const code = `
        export const add = (a: number, b: number): number => a + b;
        const multiply = async (a: number, b: number) => a * b;
      `;
      const doc = createMockDocument(code);

      const result = extractSemanticContext(doc as any);

      expect(result).not.toBeNull();
      expect(result!.functions.length).toBe(2);
      expect(result!.functions[0].name).toBe('add');
      expect(result!.functions[0].isExported).toBe(true);
      expect(result!.functions[1].name).toBe('multiply');
      expect(result!.functions[1].isAsync).toBe(true);
    });

    it('should extract class declarations', async () => {
      const code = `
        export class UserService extends BaseService implements IUserService {
          constructor(private db: Database) {}

          async getUser(id: string) {
            return this.db.find(id);
          }

          updateUser(id: string, data: UserData) {
            return this.db.update(id, data);
          }
        }
      `;
      const doc = createMockDocument(code);

      const result = extractSemanticContext(doc as any);

      expect(result).not.toBeNull();
      expect(result!.classes.length).toBe(1);
      expect(result!.classes[0].name).toBe('UserService');
      expect(result!.classes[0].extendsClass).toBe('BaseService');
      expect(result!.classes[0].implementsInterfaces).toContain('IUserService');
      expect(result!.classes[0].hasConstructor).toBe(true);
      expect(result!.classes[0].methodCount).toBeGreaterThan(0);
    });

    it('should extract import statements', async () => {
      const code = `
        import React, { useState, useEffect } from 'react';
        import type { User } from './types';
        import { fetchData } from '../utils/api';
      `;
      const doc = createMockDocument(code);

      const result = extractSemanticContext(doc as any);

      expect(result).not.toBeNull();
      expect(result!.imports.length).toBe(3);

      const reactImport = result!.imports.find((i) => i.source === 'react');
      expect(reactImport).toBeDefined();
      expect(reactImport!.defaultImport).toBe('React');
      expect(reactImport!.namedImports).toContain('useState');
    });

    it('should extract export statements', async () => {
      const code = `
        export const API_URL = 'https://api.example.com';
        export function fetchUser(id: string) {}
        export class UserService {}
        export type UserId = string;
        export default App;
      `;
      const doc = createMockDocument(code);

      const result = extractSemanticContext(doc as any);

      expect(result).not.toBeNull();
      expect(result!.exports.length).toBeGreaterThanOrEqual(4);

      const constExport = result!.exports.find((e) => e.name === 'API_URL');
      expect(constExport).toBeDefined();
      expect(constExport!.type).toBe('const');

      const funcExport = result!.exports.find((e) => e.name === 'fetchUser');
      expect(funcExport).toBeDefined();
      expect(funcExport!.type).toBe('function');
    });

    it('should detect design patterns', async () => {
      const code = `
        class Singleton {
          private static instance: Singleton;

          static getInstance() {
            if (!Singleton.instance) {
              Singleton.instance = new Singleton();
            }
            return Singleton.instance;
          }
        }
      `;
      const doc = createMockDocument(code);

      const result = extractSemanticContext(doc as any);

      expect(result).not.toBeNull();
      expect(result!.patterns).toContain('singleton');
    });

    it('should detect React patterns', async () => {
      const code = `
        import { useState, useEffect, createContext, useContext } from 'react';

        const ThemeContext = createContext('light');

        function App() {
          const [count, setCount] = useState(0);
          const theme = useContext(ThemeContext);

          useEffect(() => {
            console.log('mounted');
          }, []);

          return <div>{count}</div>;
        }
      `;
      const doc = createMockDocument(code, 'typescriptreact');

      const result = extractSemanticContext(doc as any);

      expect(result).not.toBeNull();
      expect(result!.patterns).toContain('react-hooks');
      expect(result!.patterns).toContain('react-context');
    });

    it('should detect async patterns', async () => {
      const code = `
        async function fetchData() {
          const response = await fetch('/api');
          return response.json();
        }

        function promiseVersion() {
          return new Promise((resolve) => {
            setTimeout(resolve, 1000);
          });
        }
      `;
      const doc = createMockDocument(code);

      const result = extractSemanticContext(doc as any);

      expect(result).not.toBeNull();
      expect(result!.patterns).toContain('async/await');
      expect(result!.patterns).toContain('promise-based');
    });

    it('should extract JSDoc documentation', async () => {
      const code = `
        /**
         * Calculates the sum of two numbers
         * @param a First number
         * @param b Second number
         * @returns The sum
         */
        function add(a: number, b: number): number {
          return a + b;
        }
      `;
      const doc = createMockDocument(code);

      const result = extractSemanticContext(doc as any);

      expect(result).not.toBeNull();
      expect(result!.documentation.length).toBe(1);
      expect(result!.documentation[0].type).toBe('jsdoc');
      expect(result!.documentation[0].content).toContain('@param');
    });
  });

  describe('formatSemanticContext', () => {
    it('should format function summary', () => {
      const context: SemanticContext = {
        functions: [
          { name: 'greet', signature: 'function greet()', filePath: '/test.ts', isAsync: false, isExported: true, hasJSDoc: false },
          { name: 'fetch', signature: 'async function fetch()', filePath: '/test.ts', isAsync: true, isExported: true, hasJSDoc: false },
          { name: 'helper', signature: 'function helper()', filePath: '/test.ts', isAsync: false, isExported: false, hasJSDoc: false },
        ],
        classes: [],
        imports: [],
        exports: [],
        documentation: [],
        patterns: [],
      };

      const result = formatSemanticContext(context);

      expect(result).toContain('Functions: 3 total');
      expect(result).toContain('2 exported');
      expect(result).toContain('1 async');
      expect(result).toContain('greet');
      expect(result).toContain('fetch');
    });

    it('should format class information', () => {
      const context: SemanticContext = {
        functions: [],
        classes: [
          { name: 'UserService', filePath: '/test.ts', isExported: true, hasConstructor: true, methodCount: 3, extendsClass: 'BaseService', implementsInterfaces: [] },
        ],
        imports: [],
        exports: [],
        documentation: [],
        patterns: [],
      };

      const result = formatSemanticContext(context);

      expect(result).toContain('Classes: UserService extends BaseService');
    });

    it('should format dependencies', () => {
      const context: SemanticContext = {
        functions: [],
        classes: [],
        imports: [
          { source: 'react', namedImports: ['useState'], isTypeOnly: false },
          { source: 'lodash', namedImports: ['map'], isTypeOnly: false },
          { source: './local', namedImports: ['util'], isTypeOnly: false },
        ],
        exports: [],
        documentation: [],
        patterns: [],
      };

      const result = formatSemanticContext(context);

      expect(result).toContain('Dependencies: react, lodash');
      expect(result).not.toContain('./local'); // Local imports excluded
    });

    it('should format detected patterns', () => {
      const context: SemanticContext = {
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        documentation: [],
        patterns: ['singleton', 'react-hooks'],
      };

      const result = formatSemanticContext(context);

      expect(result).toContain('Patterns: singleton, react-hooks');
    });

    it('should handle empty context gracefully', () => {
      const context: SemanticContext = {
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        documentation: [],
        patterns: [],
      };

      const result = formatSemanticContext(context);

      expect(result).toBe('');
    });
  });
});
