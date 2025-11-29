/**
 * Tests for Telemetry Module
 */

import { TelemetryEvent, getTelemetry, initializeTelemetry, resetTelemetry } from '../../../src/utils/telemetry';
import * as vscode from 'vscode';

// Mock vscode workspace configuration
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  },
}));

describe('Telemetry', () => {
  let mockConfig: { get: jest.Mock };
  let mockContext: Partial<vscode.ExtensionContext>;

  beforeEach(() => {
    resetTelemetry();
    mockConfig = {
      get: jest.fn().mockReturnValue(false), // Telemetry disabled by default
    };
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    mockContext = {
      subscriptions: [],
    };
  });

  describe('TelemetryManager', () => {
    describe('isEnabled', () => {
      it('should return false before initialization', () => {
        const telemetry = getTelemetry();
        expect(telemetry.isEnabled()).toBe(false);
      });

      it('should return false when telemetry is disabled in settings', () => {
        mockConfig.get.mockReturnValue(false);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();
        expect(telemetry.isEnabled()).toBe(false);
      });

      it('should return true when telemetry is enabled in settings', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();
        expect(telemetry.isEnabled()).toBe(true);
      });
    });

    describe('record', () => {
      it('should not record events when telemetry is disabled', () => {
        mockConfig.get.mockReturnValue(false);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS);
        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS);

        const summary = telemetry.getMetricsSummary();
        expect(summary).toBeNull();
      });

      it('should record events when telemetry is enabled', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS);
        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS);

        const summary = telemetry.getMetricsSummary();
        expect(summary).not.toBeNull();
        expect(summary?.totalEnhancements).toBe(2);
      });

      it('should track different event types separately', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS);
        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS);
        telemetry.record(TelemetryEvent.ENHANCEMENT_SKIPPED);
        telemetry.record(TelemetryEvent.ENHANCEMENT_CACHED);
        telemetry.record(TelemetryEvent.ENHANCEMENT_ERROR);

        const summary = telemetry.getMetricsSummary();
        expect(summary?.totalEnhancements).toBe(2);
        expect(summary?.skippedPrompts).toBe(1);
        expect(summary?.cachedEnhancements).toBe(1);
        expect(summary?.errors).toBe(1);
      });

      it('should record events with additional data', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS, {
          model: 'gpt-4',
          vaguenessScore: 75,
        });

        const summary = telemetry.getMetricsSummary();
        expect(summary?.totalEnhancements).toBe(1);
        expect(summary?.modelUsage).toEqual({ copilot: 1 }); // gpt-4 maps to copilot
        expect(summary?.averageVaguenessScore).toBe(70); // Binned to 70
      });

      it('should track rate limit hits', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        telemetry.record(TelemetryEvent.RATE_LIMIT_HIT);
        telemetry.record(TelemetryEvent.RATE_LIMIT_HIT);
        telemetry.record(TelemetryEvent.RATE_LIMIT_HIT);

        const summary = telemetry.getMetricsSummary();
        expect(summary?.rateLimitHits).toBe(3);
      });

      it('should anonymize model names', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS, { model: 'copilot/gpt-4' });
        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS, { model: 'llama-3.3-70b' });
        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS, { model: 'unknown-model' });

        const summary = telemetry.getMetricsSummary();
        expect(summary?.modelUsage).toEqual({
          copilot: 1,
          groq: 1,
          other: 1,
        });
      });

      it('should bin vagueness scores for privacy', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        // 75 -> bins to 70, 82 -> bins to 80, 38 -> bins to 30
        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS, { vaguenessScore: 75 });
        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS, { vaguenessScore: 82 });
        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS, { vaguenessScore: 38 });

        const summary = telemetry.getMetricsSummary();
        // Average of 70, 80, 30 = 60
        expect(summary?.averageVaguenessScore).toBe(60);
      });
    });

    describe('getMetricsSummary', () => {
      it('should return null when telemetry is disabled', () => {
        mockConfig.get.mockReturnValue(false);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        const summary = telemetry.getMetricsSummary();
        expect(summary).toBeNull();
      });

      it('should return summary with zero events when enabled but no events recorded', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        const summary = telemetry.getMetricsSummary();
        expect(summary).not.toBeNull();
        expect(summary?.totalEnhancements).toBe(0);
        expect(summary?.cachedEnhancements).toBe(0);
        expect(summary?.skippedPrompts).toBe(0);
        expect(summary?.errors).toBe(0);
        expect(summary?.rateLimitHits).toBe(0);
      });

      it('should include session duration', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        const summary = telemetry.getMetricsSummary();
        expect(summary?.sessionDurationMs).toBeGreaterThanOrEqual(0);
      });
    });

    describe('singleton behavior', () => {
      it('should return the same instance on multiple calls', () => {
        const telemetry1 = getTelemetry();
        const telemetry2 = getTelemetry();
        expect(telemetry1).toBe(telemetry2);
      });

      it('should persist state across getInstance calls', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);

        const telemetry1 = getTelemetry();
        telemetry1.record(TelemetryEvent.ENHANCEMENT_SUCCESS);

        const telemetry2 = getTelemetry();
        const summary = telemetry2.getMetricsSummary();

        expect(summary?.totalEnhancements).toBe(1);
      });
    });

    describe('reset', () => {
      it('should reset metrics when reset() is called', () => {
        mockConfig.get.mockReturnValue(true);
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        const telemetry = getTelemetry();

        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS);
        telemetry.record(TelemetryEvent.ENHANCEMENT_SUCCESS);
        telemetry.reset();

        const summary = telemetry.getMetricsSummary();
        expect(summary?.totalEnhancements).toBe(0);
      });
    });

    describe('configuration change handling', () => {
      it('should register configuration change listener', () => {
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
      });

      it('should add disposable to context subscriptions', () => {
        initializeTelemetry(mockContext as vscode.ExtensionContext);
        expect(mockContext.subscriptions?.length).toBe(1);
      });
    });
  });

  describe('TelemetryEvent enum', () => {
    it('should have all expected event types', () => {
      expect(TelemetryEvent.ENHANCEMENT_SUCCESS).toBe('enhancement_success');
      expect(TelemetryEvent.ENHANCEMENT_SKIPPED).toBe('enhancement_skipped');
      expect(TelemetryEvent.ENHANCEMENT_CACHED).toBe('enhancement_cached');
      expect(TelemetryEvent.ENHANCEMENT_ERROR).toBe('enhancement_error');
      expect(TelemetryEvent.RATE_LIMIT_HIT).toBe('rate_limit_hit');
      expect(TelemetryEvent.MODEL_USED).toBe('model_used');
    });
  });
});
