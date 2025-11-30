/**
 * Tiered Context Detector
 *
 * Orchestrates context detection across three privacy tiers:
 *
 * Tier 1 (Basic): Always available - active file, language, selection, errors
 * Tier 2 (Structural): Always available - project structure (no file contents read)
 * Tier 3 (Semantic): Requires consent - function signatures, imports, patterns
 *
 * Combines context from all tiers into a unified prompt context string.
 */

import * as vscode from 'vscode';
import { detectContext, type WorkspaceContext } from './contextDetector';
import { extractStructuralContext, formatStructuralContext, type StructuralContext } from './structuralContext';
import {
  extractSemanticContext,
  formatSemanticContext,
  hasSemanticConsent,
  type SemanticContext,
} from './semanticContext';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Combined context from all tiers
 */
export interface TieredContext {
  /** Tier 1: Basic workspace context */
  basic: WorkspaceContext | null;
  /** Tier 2: Structural context (no file contents) */
  structural: StructuralContext | null;
  /** Tier 3: Semantic context (requires consent) */
  semantic: SemanticContext | null;
  /** Combined formatted context for AI prompt */
  formatted: string;
  /** Which tiers were used */
  tiersUsed: {
    basic: boolean;
    structural: boolean;
    semantic: boolean;
  };
}

/**
 * Options for context detection
 */
export interface TieredContextOptions {
  /** Skip Tier 2 (structural) context */
  skipStructural?: boolean;
  /** Skip Tier 3 (semantic) context even if consent granted */
  skipSemantic?: boolean;
  /** Cancellation token */
  token?: vscode.CancellationToken;
}

// ============================================================================
// CONTEXT DETECTION
// ============================================================================

/**
 * Detect context from all available tiers
 *
 * Always collects Tier 1 (basic) and Tier 2 (structural).
 * Only collects Tier 3 (semantic) if user has granted consent.
 */
export async function detectTieredContext(options: TieredContextOptions = {}): Promise<TieredContext> {
  const { skipStructural = false, skipSemantic = false, token } = options;

  // Track which tiers we use
  const tiersUsed = {
    basic: false,
    structural: false,
    semantic: false,
  };

  // Check cancellation
  if (token?.isCancellationRequested) {
    return {
      basic: null,
      structural: null,
      semantic: null,
      formatted: '',
      tiersUsed,
    };
  }

  // Tier 1: Basic workspace context (always available)
  const basic = await detectContext();
  tiersUsed.basic = basic !== null;

  // Check cancellation
  if (token?.isCancellationRequested) {
    return {
      basic,
      structural: null,
      semantic: null,
      formatted: formatTier1Only(basic),
      tiersUsed,
    };
  }

  // Tier 2: Structural context (always available, no content reading)
  let structural: StructuralContext | null = null;
  if (!skipStructural) {
    structural = await extractStructuralContext();
    tiersUsed.structural = structural !== null;
  }

  // Check cancellation
  if (token?.isCancellationRequested) {
    return {
      basic,
      structural,
      semantic: null,
      formatted: formatTiersWithoutSemantic(basic, structural),
      tiersUsed,
    };
  }

  // Tier 3: Semantic context (requires consent)
  let semantic: SemanticContext | null = null;
  if (!skipSemantic && hasSemanticConsent()) {
    semantic = extractSemanticContext(undefined, token);
    tiersUsed.semantic = semantic !== null;
  }

  // Combine and format all contexts
  const formatted = formatAllTiers(basic, structural, semantic);

  return {
    basic,
    structural,
    semantic,
    formatted,
    tiersUsed,
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format only Tier 1 (basic) context
 */
function formatTier1Only(basic: WorkspaceContext | null): string {
  if (!basic) {
    return '';
  }

  const parts: string[] = [];

  // Current file
  if (basic.currentFile) {
    parts.push(`Currently editing: ${basic.currentFile.relativePath}`);
  }

  // Tech stack - combine languages and frameworks
  const techParts: string[] = [];
  if (basic.techStack.languages.length > 0) {
    techParts.push(...basic.techStack.languages);
  }
  if (basic.techStack.frameworks.length > 0) {
    techParts.push(...basic.techStack.frameworks);
  }
  if (techParts.length > 0) {
    parts.push(`Tech stack: ${techParts.join(', ')}`);
  }

  // Selection
  if (basic.selectedCode) {
    const preview = basic.selectedCode.length > 100 ? basic.selectedCode.slice(0, 100) + '...' : basic.selectedCode;
    parts.push(`Selected code: ${preview}`);
  }

  // Errors
  if (basic.diagnostics && basic.diagnostics.errors > 0) {
    let errMsg = `Errors: ${basic.diagnostics.errors}`;
    if (basic.diagnostics.firstError) {
      errMsg += ` (${basic.diagnostics.firstError})`;
    }
    parts.push(errMsg);
  }

  return parts.join('\n');
}

/**
 * Format Tier 1 and Tier 2 (without semantic)
 */
function formatTiersWithoutSemantic(basic: WorkspaceContext | null, structural: StructuralContext | null): string {
  const parts: string[] = [];

  // Tier 1
  const basicFormatted = formatTier1Only(basic);
  if (basicFormatted) {
    parts.push(basicFormatted);
  }

  // Tier 2
  if (structural) {
    const structuralFormatted = formatStructuralContext(structural);
    if (structuralFormatted) {
      parts.push(structuralFormatted);
    }
  }

  return parts.join('\n\n');
}

/**
 * Format all three tiers
 */
function formatAllTiers(
  basic: WorkspaceContext | null,
  structural: StructuralContext | null,
  semantic: SemanticContext | null
): string {
  const parts: string[] = [];

  // Tier 1: Basic context
  const basicFormatted = formatTier1Only(basic);
  if (basicFormatted) {
    parts.push(basicFormatted);
  }

  // Tier 2: Structural context
  if (structural) {
    const structuralFormatted = formatStructuralContext(structural);
    if (structuralFormatted) {
      parts.push(structuralFormatted);
    }
  }

  // Tier 3: Semantic context
  if (semantic) {
    const semanticFormatted = formatSemanticContext(semantic);
    if (semanticFormatted) {
      parts.push(semanticFormatted);
    }
  }

  return parts.join('\n\n');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if any meaningful context was detected
 */
export function hasContext(context: TieredContext): boolean {
  return context.tiersUsed.basic || context.tiersUsed.structural || context.tiersUsed.semantic;
}

/**
 * Get a summary of context richness for logging/debugging
 */
export function getContextSummary(context: TieredContext): string {
  const tiers: string[] = [];

  if (context.tiersUsed.basic) {
    tiers.push('basic');
  }
  if (context.tiersUsed.structural) {
    tiers.push('structural');
  }
  if (context.tiersUsed.semantic) {
    tiers.push('semantic');
  }

  if (tiers.length === 0) {
    return 'No context available';
  }

  return `Context from ${tiers.length} tier(s): ${tiers.join(', ')}`;
}

/**
 * Get the context formatted string, with optional length limit
 */
export function getFormattedContext(context: TieredContext, maxLength?: number): string {
  if (!maxLength || context.formatted.length <= maxLength) {
    return context.formatted;
  }

  // Truncate intelligently by keeping the most important parts
  const lines = context.formatted.split('\n');
  let result = '';

  for (const line of lines) {
    if (result.length + line.length + 1 > maxLength) {
      break;
    }
    result += (result ? '\n' : '') + line;
  }

  return result + '\n...';
}
