/**
 * Structural Context Extractor (Tier 2)
 *
 * Extracts structural information from the workspace without reading file contents.
 * This includes: directory structure, file type distribution, project patterns.
 *
 * Privacy-safe: Only analyzes file names and paths, never reads file contents.
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Structural information about the project
 */
export interface StructuralContext {
  // Directory structure patterns
  directories: {
    hasSourceDir: boolean; // src/, lib/, app/
    hasTestDir: boolean; // tests/, __tests__/, test/
    hasComponentsDir: boolean; // components/, ui/
    hasPagesDir: boolean; // pages/, routes/, views/
    hasApiDir: boolean; // api/, routes/api/, server/
    hasUtilsDir: boolean; // utils/, helpers/, lib/
    hasConfigDir: boolean; // config/, .config/
    topLevelDirs: string[]; // List of top-level directories
  };

  // File type distribution
  fileTypes: {
    typescript: number; // .ts, .tsx
    javascript: number; // .js, .jsx
    styles: number; // .css, .scss, .less
    python: number; // .py
    rust: number; // .rs
    go: number; // .go
    config: number; // .json, .yaml, .toml
    markdown: number; // .md
    tests: number; // *.test.*, *.spec.*
  };

  // Project structure patterns
  patterns: {
    isMonorepo: boolean; // packages/, workspaces
    hasTypicalWebApp: boolean; // components + pages
    hasTypicalApi: boolean; // routes/api or server
    hasTypicalCli: boolean; // bin/, cli/
    projectStyle: 'monorepo' | 'webapp' | 'api' | 'library' | 'cli' | 'mixed' | 'unknown';
  };

  // Size indicators
  size: {
    totalFiles: number;
    totalDirs: number;
    depth: number; // Max nesting depth
  };
}

// File patterns to exclude from analysis
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
  '**/__pycache__/**',
  '**/target/**', // Rust
  '**/vendor/**', // Go
  '**/.venv/**',
  '**/venv/**',
];

/**
 * Extracts structural context from the workspace
 */
export async function extractStructuralContext(): Promise<StructuralContext | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  // Find all files in workspace (excluding common ignore patterns)
  const files = await vscode.workspace.findFiles('**/*', `{${EXCLUDE_PATTERNS.join(',')}}`);

  if (files.length === 0) {
    return null;
  }

  // Analyze file paths
  const directories = analyzeDirectories(files, rootPath);
  const fileTypes = analyzeFileTypes(files);
  const patterns = detectPatterns(directories, fileTypes);
  const size = calculateSize(files, rootPath);

  return {
    directories,
    fileTypes,
    patterns,
    size,
  };
}

/**
 * Analyzes directory structure from file paths
 */
function analyzeDirectories(files: vscode.Uri[], rootPath: string): StructuralContext['directories'] {
  const topLevelDirs = new Set<string>();

  let hasSourceDir = false;
  let hasTestDir = false;
  let hasComponentsDir = false;
  let hasPagesDir = false;
  let hasApiDir = false;
  let hasUtilsDir = false;
  let hasConfigDir = false;

  for (const file of files) {
    const relativePath = path.relative(rootPath, file.fsPath);
    const parts = relativePath.split(path.sep);

    // Track top-level directories
    if (parts.length > 1) {
      topLevelDirs.add(parts[0]);
    }

    const lowerPath = relativePath.toLowerCase();

    // Source directories
    if (/^(src|lib|app)\//i.test(relativePath)) {
      hasSourceDir = true;
    }

    // Test directories
    if (/^(tests?|__tests__|spec)\//i.test(relativePath) || /\/(tests?|__tests__|spec)\//i.test(lowerPath)) {
      hasTestDir = true;
    }

    // Components directories
    if (/\/components?\//i.test(lowerPath) || /^components?\//i.test(relativePath)) {
      hasComponentsDir = true;
    }

    // Pages/routes directories
    if (/\/(pages|routes|views)\//i.test(lowerPath) || /^(pages|routes|views)\//i.test(relativePath)) {
      hasPagesDir = true;
    }

    // API directories
    if (/\/(api|server)\//i.test(lowerPath) || /^(api|server)\//i.test(relativePath)) {
      hasApiDir = true;
    }

    // Utils directories
    if (/\/(utils?|helpers?|lib)\//i.test(lowerPath)) {
      hasUtilsDir = true;
    }

    // Config directories
    if (/\/(config|\.config)\//i.test(lowerPath) || /^(config|\.config)\//i.test(relativePath)) {
      hasConfigDir = true;
    }
  }

  return {
    hasSourceDir,
    hasTestDir,
    hasComponentsDir,
    hasPagesDir,
    hasApiDir,
    hasUtilsDir,
    hasConfigDir,
    topLevelDirs: Array.from(topLevelDirs).sort(),
  };
}

/**
 * Analyzes file type distribution
 */
function analyzeFileTypes(files: vscode.Uri[]): StructuralContext['fileTypes'] {
  const counts = {
    typescript: 0,
    javascript: 0,
    styles: 0,
    python: 0,
    rust: 0,
    go: 0,
    config: 0,
    markdown: 0,
    tests: 0,
  };

  for (const file of files) {
    const fileName = path.basename(file.fsPath).toLowerCase();
    const ext = path.extname(fileName);

    // TypeScript
    if (ext === '.ts' || ext === '.tsx') {
      counts.typescript++;
    }

    // JavaScript
    if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
      counts.javascript++;
    }

    // Styles
    if (ext === '.css' || ext === '.scss' || ext === '.sass' || ext === '.less') {
      counts.styles++;
    }

    // Python
    if (ext === '.py') {
      counts.python++;
    }

    // Rust
    if (ext === '.rs') {
      counts.rust++;
    }

    // Go
    if (ext === '.go') {
      counts.go++;
    }

    // Config files
    if (ext === '.json' || ext === '.yaml' || ext === '.yml' || ext === '.toml') {
      counts.config++;
    }

    // Markdown
    if (ext === '.md' || ext === '.mdx') {
      counts.markdown++;
    }

    // Test files
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(fileName) || /_test\.(py|go)$/i.test(fileName)) {
      counts.tests++;
    }
  }

  return counts;
}

/**
 * Detects project patterns from directory and file analysis
 */
function detectPatterns(
  directories: StructuralContext['directories'],
  fileTypes: StructuralContext['fileTypes']
): StructuralContext['patterns'] {
  const topLevel = directories.topLevelDirs.map((d) => d.toLowerCase());

  // Check for monorepo
  const isMonorepo =
    topLevel.includes('packages') ||
    topLevel.includes('workspaces') ||
    topLevel.includes('apps') ||
    (topLevel.includes('packages') && topLevel.includes('apps'));

  // Check for typical web app (has components and pages, or has styles)
  const hasTypicalWebApp =
    (directories.hasComponentsDir && directories.hasPagesDir) || (directories.hasComponentsDir && fileTypes.styles > 0);

  // Check for typical API (has api or server directory)
  const hasTypicalApi = directories.hasApiDir;

  // Check for typical CLI (has bin or cli directory)
  const hasTypicalCli = topLevel.includes('bin') || topLevel.includes('cli');

  // Determine project style
  let projectStyle: StructuralContext['patterns']['projectStyle'] = 'unknown';

  if (isMonorepo) {
    projectStyle = 'monorepo';
  } else if (hasTypicalWebApp && hasTypicalApi) {
    projectStyle = 'mixed';
  } else if (hasTypicalWebApp) {
    projectStyle = 'webapp';
  } else if (hasTypicalApi) {
    projectStyle = 'api';
  } else if (hasTypicalCli) {
    projectStyle = 'cli';
  } else if (directories.hasSourceDir && !directories.hasPagesDir) {
    // Has src but no pages/components - likely a library
    projectStyle = 'library';
  }

  return {
    isMonorepo,
    hasTypicalWebApp,
    hasTypicalApi,
    hasTypicalCli,
    projectStyle,
  };
}

/**
 * Calculates size metrics for the project
 */
function calculateSize(files: vscode.Uri[], rootPath: string): StructuralContext['size'] {
  const dirs = new Set<string>();
  let maxDepth = 0;

  for (const file of files) {
    const relativePath = path.relative(rootPath, file.fsPath);
    const parts = relativePath.split(path.sep);

    // Track depth (exclude the file itself)
    const depth = parts.length - 1;
    if (depth > maxDepth) {
      maxDepth = depth;
    }

    // Track unique directories
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? path.join(currentPath, parts[i]) : parts[i];
      dirs.add(currentPath);
    }
  }

  return {
    totalFiles: files.length,
    totalDirs: dirs.size,
    depth: maxDepth,
  };
}

/**
 * Formats structural context for AI prompt
 */
export function formatStructuralContext(context: StructuralContext): string {
  const parts: string[] = [];

  // Project style
  if (context.patterns.projectStyle !== 'unknown') {
    parts.push(`Project type: ${context.patterns.projectStyle}`);
  }

  // Key directories
  const dirFeatures: string[] = [];
  if (context.directories.hasSourceDir) {
    dirFeatures.push('source');
  }
  if (context.directories.hasTestDir) {
    dirFeatures.push('tests');
  }
  if (context.directories.hasComponentsDir) {
    dirFeatures.push('components');
  }
  if (context.directories.hasPagesDir) {
    dirFeatures.push('pages/routes');
  }
  if (context.directories.hasApiDir) {
    dirFeatures.push('API');
  }

  if (dirFeatures.length > 0) {
    parts.push(`Structure: ${dirFeatures.join(', ')}`);
  }

  // Primary language
  const languages: string[] = [];
  if (context.fileTypes.typescript > context.fileTypes.javascript) {
    languages.push(`TypeScript (${context.fileTypes.typescript} files)`);
  } else if (context.fileTypes.javascript > 0) {
    languages.push(`JavaScript (${context.fileTypes.javascript} files)`);
  }
  if (context.fileTypes.python > 0) {
    languages.push(`Python (${context.fileTypes.python} files)`);
  }
  if (context.fileTypes.rust > 0) {
    languages.push(`Rust (${context.fileTypes.rust} files)`);
  }
  if (context.fileTypes.go > 0) {
    languages.push(`Go (${context.fileTypes.go} files)`);
  }

  if (languages.length > 0) {
    parts.push(`Languages: ${languages.join(', ')}`);
  }

  // Test coverage indication
  if (context.fileTypes.tests > 0) {
    parts.push(`Has ${context.fileTypes.tests} test file(s)`);
  }

  // Size
  parts.push(`Size: ${context.size.totalFiles} files, ${context.size.totalDirs} directories`);

  return parts.join('\n');
}
