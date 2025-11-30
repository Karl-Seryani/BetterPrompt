/**
 * Semantic Context Extractor (Tier 3)
 *
 * Extracts semantic information by reading file contents.
 * Requires user consent before reading any file content.
 *
 * This provides deeper context like:
 * - Function signatures and their purposes
 * - Class structures and relationships
 * - Import/export patterns
 * - Code comments and documentation
 */

import * as vscode from 'vscode';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Semantic information extracted from code
 */
export interface SemanticContext {
  /** Key functions and their signatures */
  functions: FunctionInfo[];
  /** Classes and their structure */
  classes: ClassInfo[];
  /** Import patterns */
  imports: ImportInfo[];
  /** Export patterns */
  exports: ExportInfo[];
  /** Code comments and documentation */
  documentation: DocumentationInfo[];
  /** Detected patterns (singleton, factory, etc.) */
  patterns: string[];
}

export interface FunctionInfo {
  name: string;
  signature: string;
  filePath: string;
  isAsync: boolean;
  isExported: boolean;
  hasJSDoc: boolean;
}

export interface ClassInfo {
  name: string;
  filePath: string;
  isExported: boolean;
  hasConstructor: boolean;
  methodCount: number;
  extendsClass?: string;
  implementsInterfaces: string[];
}

export interface ImportInfo {
  source: string;
  namedImports: string[];
  defaultImport?: string;
  isTypeOnly: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'const' | 'type' | 'interface' | 'default';
  filePath: string;
}

export interface DocumentationInfo {
  type: 'jsdoc' | 'comment' | 'readme';
  content: string;
  filePath: string;
}

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

/**
 * Check if user has given consent for semantic analysis
 */
export function hasSemanticConsent(): boolean {
  const config = vscode.workspace.getConfiguration('betterprompt');
  return config.get<boolean>('enableSemanticContext', false);
}

/**
 * Request consent from user for semantic analysis
 * Returns true if consent granted
 */
export async function requestSemanticConsent(): Promise<boolean> {
  const result = await vscode.window.showInformationMessage(
    'BetterPrompt can read file contents to provide better context. This helps generate more accurate prompt enhancements. Allow?',
    { modal: true },
    'Allow',
    'Deny'
  );

  if (result === 'Allow') {
    const config = vscode.workspace.getConfiguration('betterprompt');
    await config.update('enableSemanticContext', true, vscode.ConfigurationTarget.Global);
    return true;
  }

  return false;
}

// ============================================================================
// EXTRACTION LOGIC
// ============================================================================

// Patterns for TypeScript/JavaScript analysis
const PATTERNS = {
  // Function declarations and expressions
  function: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
  arrowFunction: /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g,

  // Class declarations
  class: /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g,

  // Import statements
  import: /import\s+(?:type\s+)?(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g,
  importDefault: /import\s+(\w+)\s*,?\s*(?:{([^}]+)})?\s+from\s+['"]([^'"]+)['"]/g,

  // Export statements
  exportNamed: /export\s+(?:const|let|function|class|type|interface)\s+(\w+)/g,
  exportDefault: /export\s+default\s+(?:class\s+)?(\w+)?/g,

  // JSDoc comments
  jsdoc: /\/\*\*[\s\S]*?\*\//g,

  // Design patterns
  singleton: /private\s+static\s+instance|getInstance\s*\(\)/,
  factory: /create\w+\s*\([^)]*\)\s*:\s*\w+|Factory/,
  observer: /subscribe|unsubscribe|notify|addEventListener/,
};

/**
 * Extract semantic context from the active file
 */
export function extractSemanticContext(
  document?: vscode.TextDocument,
  token?: vscode.CancellationToken
): SemanticContext | null {
  // Check consent first
  const hasConsent = hasSemanticConsent();
  if (!hasConsent) {
    return null;
  }

  // Check cancellation
  if (token?.isCancellationRequested) {
    return null;
  }

  // Get active document if not provided
  const doc = document || vscode.window.activeTextEditor?.document;
  if (!doc) {
    return null;
  }

  // Only analyze supported file types
  const supportedLanguages = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'];
  if (!supportedLanguages.includes(doc.languageId)) {
    return null;
  }

  const content = doc.getText();
  const filePath = doc.uri.fsPath;

  const context: SemanticContext = {
    functions: extractFunctions(content, filePath),
    classes: extractClasses(content, filePath),
    imports: extractImports(content),
    exports: extractExports(content, filePath),
    documentation: extractDocumentation(content, filePath),
    patterns: detectPatterns(content),
  };

  return context;
}

/**
 * Extract function information
 */
function extractFunctions(content: string, filePath: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  // Regular functions
  const funcRegex = /(?:export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const isAsync = !!match[1];
    const name = match[2];
    const params = match[3];
    const isExported = match[0].startsWith('export');
    const hasJSDoc = hasJSDocBefore(content, match.index);

    functions.push({
      name,
      signature: `${isAsync ? 'async ' : ''}function ${name}(${params})`,
      filePath,
      isAsync,
      isExported,
      hasJSDoc,
    });
  }

  // Arrow functions
  const arrowRegex = /(?:export\s+)?(const|let)\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g;
  while ((match = arrowRegex.exec(content)) !== null) {
    const name = match[2];
    const isAsync = !!match[3];
    const isExported = match[0].startsWith('export');
    const hasJSDoc = hasJSDocBefore(content, match.index);

    functions.push({
      name,
      signature: `${isAsync ? 'async ' : ''}const ${name} = () => ...`,
      filePath,
      isAsync,
      isExported,
      hasJSDoc,
    });
  }

  return functions;
}

/**
 * Extract class information
 */
function extractClasses(content: string, filePath: string): ClassInfo[] {
  const classes: ClassInfo[] = [];
  const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g;

  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const name = match[1];
    const extendsClass = match[2];
    const implementsStr = match[3];
    const isExported = match[0].startsWith('export');

    // Find class body to count methods
    const classStart = match.index;
    const classBody = extractClassBody(content, classStart);
    const methodCount = countMethods(classBody);
    const hasConstructor = /constructor\s*\(/.test(classBody);

    const implementsInterfaces = implementsStr ? implementsStr.split(',').map((s) => s.trim()) : [];

    classes.push({
      name,
      filePath,
      isExported,
      hasConstructor,
      methodCount,
      extendsClass,
      implementsInterfaces,
    });
  }

  return classes;
}

/**
 * Extract class body (content between { })
 */
function extractClassBody(content: string, startIndex: number): string {
  const openBrace = content.indexOf('{', startIndex);
  if (openBrace === -1) {
    return '';
  }

  let depth = 1;
  let i = openBrace + 1;

  while (i < content.length && depth > 0) {
    if (content[i] === '{') {
      depth++;
    } else if (content[i] === '}') {
      depth--;
    }
    i++;
  }

  return content.slice(openBrace, i);
}

/**
 * Count methods in class body
 */
function countMethods(classBody: string): number {
  // Match method declarations (not including constructor)
  const methodRegex =
    /(?:async\s+)?(?:static\s+)?(?:private\s+|public\s+|protected\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g;
  let count = 0;
  let match;

  while ((match = methodRegex.exec(classBody)) !== null) {
    const name = match[1];
    if (name !== 'constructor' && name !== 'if' && name !== 'for' && name !== 'while') {
      count++;
    }
  }

  return count;
}

/**
 * Extract import information
 */
function extractImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const importRegex = /import\s+(type\s+)?(?:{([^}]+)}|(\w+)(?:\s*,\s*{([^}]+)})?)\s+from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const isTypeOnly = !!match[1];
    const namedImports = match[2] || match[4];
    const defaultImport = match[3];
    const source = match[5];

    imports.push({
      source,
      namedImports: namedImports ? namedImports.split(',').map((s) => s.trim().split(' as ')[0]) : [],
      defaultImport,
      isTypeOnly,
    });
  }

  return imports;
}

/**
 * Extract export information
 */
function extractExports(content: string, filePath: string): ExportInfo[] {
  const exports: ExportInfo[] = [];

  // Named exports
  const namedRegex = /export\s+(const|let|function|class|type|interface)\s+(\w+)/g;
  let match;
  while ((match = namedRegex.exec(content)) !== null) {
    const keyword = match[1];
    const name = match[2];
    let type: ExportInfo['type'] = 'const';

    if (keyword === 'function') {
      type = 'function';
    } else if (keyword === 'class') {
      type = 'class';
    } else if (keyword === 'type') {
      type = 'type';
    } else if (keyword === 'interface') {
      type = 'interface';
    }

    exports.push({ name, type, filePath });
  }

  // Default exports
  const defaultRegex = /export\s+default\s+(?:(class|function)\s+)?(\w+)?/g;
  while ((match = defaultRegex.exec(content)) !== null) {
    const keyword = match[1];
    const name = match[2] || 'default';

    exports.push({
      name,
      type: keyword === 'class' ? 'class' : keyword === 'function' ? 'function' : 'default',
      filePath,
    });
  }

  return exports;
}

/**
 * Extract documentation (JSDoc comments)
 */
function extractDocumentation(content: string, filePath: string): DocumentationInfo[] {
  const docs: DocumentationInfo[] = [];
  const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;

  let match;
  while ((match = jsdocRegex.exec(content)) !== null) {
    // Only include meaningful JSDoc (not empty or single-line)
    const comment = match[0];
    if (comment.length > 20 && comment.includes('@')) {
      docs.push({
        type: 'jsdoc',
        content: cleanJSDoc(comment),
        filePath,
      });
    }
  }

  return docs;
}

/**
 * Clean JSDoc comment for display
 */
function cleanJSDoc(jsdoc: string): string {
  return jsdoc
    .replace(/\/\*\*|\*\//g, '')
    .replace(/^\s*\*\s?/gm, '')
    .trim()
    .slice(0, 200); // Limit length
}

/**
 * Detect design patterns in code
 */
function detectPatterns(content: string): string[] {
  const patterns: string[] = [];

  if (PATTERNS.singleton.test(content)) {
    patterns.push('singleton');
  }

  if (PATTERNS.factory.test(content)) {
    patterns.push('factory');
  }

  if (PATTERNS.observer.test(content)) {
    patterns.push('observer/event-driven');
  }

  // Detect React patterns
  if (/useState|useEffect|useCallback|useMemo/.test(content)) {
    patterns.push('react-hooks');
  }

  if (/createContext|useContext/.test(content)) {
    patterns.push('react-context');
  }

  // Detect async patterns
  if (/async\s+function|await\s+/.test(content)) {
    patterns.push('async/await');
  }

  if (/new\s+Promise/.test(content)) {
    patterns.push('promise-based');
  }

  return patterns;
}

/**
 * Check if there's a JSDoc comment before given position
 */
function hasJSDocBefore(content: string, position: number): boolean {
  // Look back up to 500 chars for JSDoc
  const lookback = content.slice(Math.max(0, position - 500), position);
  const jsdocEnd = lookback.lastIndexOf('*/');

  if (jsdocEnd === -1) {
    return false;
  }

  // Check that there's only whitespace between JSDoc and declaration
  const between = lookback.slice(jsdocEnd + 2);
  return /^\s*$/.test(between);
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format semantic context for AI prompt
 */
export function formatSemanticContext(context: SemanticContext): string {
  const parts: string[] = [];

  // Functions summary
  if (context.functions.length > 0) {
    const exported = context.functions.filter((f) => f.isExported);
    const asyncFuncs = context.functions.filter((f) => f.isAsync);

    parts.push(
      `Functions: ${context.functions.length} total (${exported.length} exported, ${asyncFuncs.length} async)`
    );

    // List top 5 exported functions
    const topFunctions = exported.slice(0, 5).map((f) => f.name);
    if (topFunctions.length > 0) {
      parts.push(`Key functions: ${topFunctions.join(', ')}`);
    }
  }

  // Classes summary
  if (context.classes.length > 0) {
    const classNames = context.classes.map((c) => {
      let desc = c.name;
      if (c.extendsClass) {
        desc += ` extends ${c.extendsClass}`;
      }
      return desc;
    });
    parts.push(`Classes: ${classNames.join(', ')}`);
  }

  // Import patterns
  if (context.imports.length > 0) {
    const externalImports = context.imports.filter((i) => !i.source.startsWith('.')).map((i) => i.source);
    const uniqueExternal = [...new Set(externalImports)].slice(0, 5);
    if (uniqueExternal.length > 0) {
      parts.push(`Dependencies: ${uniqueExternal.join(', ')}`);
    }
  }

  // Detected patterns
  if (context.patterns.length > 0) {
    parts.push(`Patterns: ${context.patterns.join(', ')}`);
  }

  return parts.join('\n');
}
