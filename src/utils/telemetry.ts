/**
 * Telemetry Module - Anonymous, Opt-In Usage Tracking
 *
 * This module collects anonymous usage metrics to help improve BetterPrompt.
 * All data collection is:
 * - Opt-in only (disabled by default)
 * - Completely anonymous (no personal data, no prompt content)
 * - Aggregated locally before any potential future reporting
 *
 * Currently, telemetry is stored locally only and not sent anywhere.
 * This provides a foundation for future analytics if users opt-in.
 */

import * as vscode from 'vscode';

/**
 * Telemetry event types
 */
export enum TelemetryEvent {
  ENHANCEMENT_SUCCESS = 'enhancement_success',
  ENHANCEMENT_SKIPPED = 'enhancement_skipped',
  ENHANCEMENT_CACHED = 'enhancement_cached',
  ENHANCEMENT_ERROR = 'enhancement_error',
  RATE_LIMIT_HIT = 'rate_limit_hit',
  MODEL_USED = 'model_used',
}

/**
 * Anonymous metrics for a single session
 */
interface SessionMetrics {
  /** Total enhancements performed */
  enhancements: number;
  /** Enhancements served from cache */
  cached: number;
  /** Prompts skipped (already clear) */
  skipped: number;
  /** Errors encountered */
  errors: number;
  /** Rate limit hits */
  rateLimitHits: number;
  /** Model usage counts (anonymized) */
  modelUsage: Record<string, number>;
  /** Average vagueness scores (binned) */
  vaguenessScores: number[];
  /** Session start time */
  sessionStart: number;
}

/**
 * Telemetry manager - handles opt-in anonymous metrics
 */
class TelemetryManager {
  private enabled: boolean = false;
  private metrics: SessionMetrics;

  constructor() {
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Creates empty metrics object for a new session
   */
  private createEmptyMetrics(): SessionMetrics {
    return {
      enhancements: 0,
      cached: 0,
      skipped: 0,
      errors: 0,
      rateLimitHits: 0,
      modelUsage: {},
      vaguenessScores: [],
      sessionStart: Date.now(),
    };
  }

  /**
   * Initializes telemetry based on user settings
   * @param context VS Code extension context
   */
  public initialize(context: vscode.ExtensionContext): void {
    // Check user preference
    const config = vscode.workspace.getConfiguration('betterprompt');
    this.enabled = config.get<boolean>('enableTelemetry', false);

    // Listen for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('betterprompt.enableTelemetry')) {
          const newConfig = vscode.workspace.getConfiguration('betterprompt');
          this.enabled = newConfig.get<boolean>('enableTelemetry', false);

          if (!this.enabled) {
            // Clear metrics when telemetry is disabled
            this.metrics = this.createEmptyMetrics();
          }
        }
      })
    );
  }

  /**
   * Records a telemetry event
   * Does nothing if telemetry is disabled
   */
  public record(event: TelemetryEvent, data?: Record<string, unknown>): void {
    if (!this.enabled) {
      return;
    }

    switch (event) {
      case TelemetryEvent.ENHANCEMENT_SUCCESS:
        this.metrics.enhancements++;
        if (data?.model && typeof data.model === 'string') {
          // Anonymize model names (just track vendor category)
          const vendor = this.anonymizeModel(data.model);
          this.metrics.modelUsage[vendor] = (this.metrics.modelUsage[vendor] || 0) + 1;
        }
        if (data?.vaguenessScore && typeof data.vaguenessScore === 'number') {
          // Bin scores to 10-point ranges for privacy
          const binned = Math.floor(data.vaguenessScore / 10) * 10;
          this.metrics.vaguenessScores.push(binned);
        }
        break;

      case TelemetryEvent.ENHANCEMENT_CACHED:
        this.metrics.cached++;
        break;

      case TelemetryEvent.ENHANCEMENT_SKIPPED:
        this.metrics.skipped++;
        break;

      case TelemetryEvent.ENHANCEMENT_ERROR:
        this.metrics.errors++;
        break;

      case TelemetryEvent.RATE_LIMIT_HIT:
        this.metrics.rateLimitHits++;
        break;

      case TelemetryEvent.MODEL_USED:
        if (data?.model && typeof data.model === 'string') {
          const vendor = this.anonymizeModel(data.model);
          this.metrics.modelUsage[vendor] = (this.metrics.modelUsage[vendor] || 0) + 1;
        }
        break;
    }
  }

  /**
   * Anonymizes model names to just vendor category
   * e.g., "copilot/gpt-4" -> "copilot", "llama-3.3-70b" -> "groq"
   */
  private anonymizeModel(model: string): string {
    const lower = model.toLowerCase();
    if (lower.includes('copilot') || lower.includes('gpt')) {
      return 'copilot';
    }
    if (lower.includes('llama') || lower.includes('groq')) {
      return 'groq';
    }
    return 'other';
  }

  /**
   * Gets current session metrics summary
   * Returns null if telemetry is disabled
   */
  public getMetricsSummary(): Record<string, unknown> | null {
    if (!this.enabled) {
      return null;
    }

    const sessionDuration = Date.now() - this.metrics.sessionStart;
    const avgVagueness =
      this.metrics.vaguenessScores.length > 0
        ? Math.round(this.metrics.vaguenessScores.reduce((a, b) => a + b, 0) / this.metrics.vaguenessScores.length)
        : 0;

    return {
      totalEnhancements: this.metrics.enhancements,
      cachedEnhancements: this.metrics.cached,
      skippedPrompts: this.metrics.skipped,
      errors: this.metrics.errors,
      rateLimitHits: this.metrics.rateLimitHits,
      modelUsage: { ...this.metrics.modelUsage },
      averageVaguenessScore: avgVagueness,
      sessionDurationMs: sessionDuration,
    };
  }

  /**
   * Checks if telemetry is currently enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Resets metrics (useful for testing)
   */
  public reset(): void {
    this.metrics = this.createEmptyMetrics();
  }
}

// Singleton instance
let telemetryInstance: TelemetryManager | null = null;

/**
 * Gets the telemetry manager instance
 */
export function getTelemetry(): TelemetryManager {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryManager();
  }
  return telemetryInstance;
}

/**
 * Initializes telemetry with extension context
 */
export function initializeTelemetry(context: vscode.ExtensionContext): void {
  getTelemetry().initialize(context);
}

/**
 * Resets the telemetry instance (for testing)
 */
export function resetTelemetry(): void {
  telemetryInstance = null;
}
