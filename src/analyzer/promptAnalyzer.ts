/**
 * Prompt Analyzer - Re-exports from shared core module
 * The actual implementation lives in /core/analyzer.ts
 * This file exists for backward compatibility with existing imports
 */

export { analyzePrompt, IssueType, IssueSeverity, type VaguenessIssue, type AnalysisResult } from '../../core/analyzer';
