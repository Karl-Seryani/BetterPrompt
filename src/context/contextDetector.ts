/**
 * Context Detector - Makes BetterPrompt aware of your current workspace
 * Detects: current file, language, selection, tech stack
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface WorkspaceContext {
  // Current file info
  currentFile?: {
    path: string;
    name: string;
    language: string;
    relativePath: string;
  };

  // Selected code (if any)
  selectedCode?: string;

  // Detected tech stack
  techStack: {
    languages: string[];
    frameworks: string[];
    hasTypeScript: boolean;
    hasTests: boolean;
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'cargo' | 'go';
  };

  // Current errors in file (if any)
  diagnostics?: {
    errors: number;
    warnings: number;
    firstError?: string;
  };
}

/**
 * Detects the current workspace context
 */
export function detectContext(): WorkspaceContext {
  const editor = vscode.window.activeTextEditor;
  const workspaceFolders = vscode.workspace.workspaceFolders;

  const context: WorkspaceContext = {
    techStack: {
      languages: [],
      frameworks: [],
      hasTypeScript: false,
      hasTests: false,
    },
  };

  // Detect current file
  if (editor) {
    const document = editor.document;
    const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || '';

    context.currentFile = {
      path: document.uri.fsPath,
      name: path.basename(document.uri.fsPath),
      language: document.languageId,
      relativePath: workspaceRoot ? path.relative(workspaceRoot, document.uri.fsPath) : document.uri.fsPath,
    };

    // Detect selected code
    const selection = editor.selection;
    if (!selection.isEmpty) {
      context.selectedCode = document.getText(selection);
    }

    // Detect diagnostics (errors/warnings)
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    if (diagnostics.length > 0) {
      const errors = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Error);
      const warnings = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Warning);

      context.diagnostics = {
        errors: errors.length,
        warnings: warnings.length,
        firstError: errors[0]?.message,
      };
    }
  }

  // Detect tech stack from workspace
  if (workspaceFolders && workspaceFolders.length > 0) {
    const rootPath = workspaceFolders[0].uri.fsPath;
    context.techStack = detectTechStack(rootPath);
  }

  return context;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Detects the tech stack from project files
 */
function detectTechStack(rootPath: string): WorkspaceContext['techStack'] {
  const stack: WorkspaceContext['techStack'] = {
    languages: [],
    frameworks: [],
    hasTypeScript: false,
    hasTests: false,
  };

  // Check for package.json (Node.js/JavaScript)
  const packageJsonPath = path.join(rootPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
      const allDeps: Record<string, string> = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Detect package manager
      if (fs.existsSync(path.join(rootPath, 'pnpm-lock.yaml'))) {
        stack.packageManager = 'pnpm';
      } else if (fs.existsSync(path.join(rootPath, 'yarn.lock'))) {
        stack.packageManager = 'yarn';
      } else if (fs.existsSync(path.join(rootPath, 'package-lock.json'))) {
        stack.packageManager = 'npm';
      }

      // Detect TypeScript
      if (allDeps['typescript'] || fs.existsSync(path.join(rootPath, 'tsconfig.json'))) {
        stack.hasTypeScript = true;
        stack.languages.push('TypeScript');
      } else {
        stack.languages.push('JavaScript');
      }

      // Detect frameworks
      if (allDeps['next']) {
        stack.frameworks.push('Next.js');
      }
      if (allDeps['react']) {
        stack.frameworks.push('React');
      }
      if (allDeps['vue']) {
        stack.frameworks.push('Vue');
      }
      if (allDeps['svelte']) {
        stack.frameworks.push('Svelte');
      }
      if (allDeps['angular']) {
        stack.frameworks.push('Angular');
      }
      if (allDeps['express']) {
        stack.frameworks.push('Express');
      }
      if (allDeps['fastify']) {
        stack.frameworks.push('Fastify');
      }
      if (allDeps['nestjs'] || allDeps['@nestjs/core']) {
        stack.frameworks.push('NestJS');
      }
      if (allDeps['hono']) {
        stack.frameworks.push('Hono');
      }
      if (allDeps['electron']) {
        stack.frameworks.push('Electron');
      }
      if (allDeps['tailwindcss']) {
        stack.frameworks.push('Tailwind CSS');
      }

      // Detect testing
      if (allDeps['jest'] || allDeps['vitest'] || allDeps['mocha'] || allDeps['cypress']) {
        stack.hasTests = true;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Check for Python
  const requirementsPath = path.join(rootPath, 'requirements.txt');
  const pyprojectPath = path.join(rootPath, 'pyproject.toml');
  if (fs.existsSync(requirementsPath) || fs.existsSync(pyprojectPath)) {
    stack.languages.push('Python');
    stack.packageManager = 'pip';

    // Try to detect Python frameworks
    if (fs.existsSync(requirementsPath)) {
      try {
        const requirements = fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
        if (requirements.includes('django')) {
          stack.frameworks.push('Django');
        }
        if (requirements.includes('flask')) {
          stack.frameworks.push('Flask');
        }
        if (requirements.includes('fastapi')) {
          stack.frameworks.push('FastAPI');
        }
        if (requirements.includes('pytest')) {
          stack.hasTests = true;
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // Check for Rust
  if (fs.existsSync(path.join(rootPath, 'Cargo.toml'))) {
    stack.languages.push('Rust');
    stack.packageManager = 'cargo';
  }

  // Check for Go
  if (fs.existsSync(path.join(rootPath, 'go.mod'))) {
    stack.languages.push('Go');
    stack.packageManager = 'go';
  }

  return stack;
}

/**
 * Formats context into a string for the AI prompt
 */
export function formatContextForPrompt(context: WorkspaceContext): string {
  const parts: string[] = [];

  // Current file context
  if (context.currentFile) {
    parts.push(`Currently editing: ${context.currentFile.relativePath} (${context.currentFile.language})`);
  }

  // Tech stack
  if (context.techStack.frameworks.length > 0) {
    parts.push(`Tech stack: ${context.techStack.frameworks.join(', ')}`);
  } else if (context.techStack.languages.length > 0) {
    parts.push(`Language: ${context.techStack.languages.join(', ')}`);
  }

  if (context.techStack.hasTypeScript) {
    parts.push('Using TypeScript');
  }

  // Selected code
  if (context.selectedCode) {
    const truncated =
      context.selectedCode.length > 500 ? context.selectedCode.substring(0, 500) + '...' : context.selectedCode;
    parts.push(`Selected code:\n\`\`\`\n${truncated}\n\`\`\``);
  }

  // Errors
  if (context.diagnostics && context.diagnostics.errors > 0) {
    parts.push(
      `Current file has ${context.diagnostics.errors} error(s)${
        context.diagnostics.firstError ? `: "${context.diagnostics.firstError}"` : ''
      }`
    );
  }

  return parts.join('\n');
}
