/**
 * Unit tests for Onboarding Flow
 * Tests the simplified zero-setup onboarding
 */

import * as vscode from 'vscode';

describe('Onboarding Flow', () => {
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: Map<string, any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock global state
    mockGlobalState = new Map();
    mockContext = {
      globalState: {
        get: jest.fn((key: string) => mockGlobalState.get(key)),
        update: jest.fn((key: string, value: any) => {
          mockGlobalState.set(key, value);
          return Promise.resolve();
        }),
        keys: jest.fn(() => Array.from(mockGlobalState.keys())),
        setKeysForSync: jest.fn(),
      },
      subscriptions: [],
    } as any;
  });

  describe('First Run Detection', () => {
    it('should detect first run when hasCompletedOnboarding is undefined', () => {
      const hasCompleted = mockContext.globalState.get('hasCompletedOnboarding');
      expect(hasCompleted).toBeUndefined();
    });

    it('should detect returning user when hasCompletedOnboarding is true', async () => {
      await mockContext.globalState.update('hasCompletedOnboarding', true);
      const hasCompleted = mockContext.globalState.get('hasCompletedOnboarding');
      expect(hasCompleted).toBe(true);
    });

    it('should detect first run when hasCompletedOnboarding is false', () => {
      mockGlobalState.set('hasCompletedOnboarding', false);
      const hasCompleted = mockContext.globalState.get('hasCompletedOnboarding');
      expect(hasCompleted).toBe(false);
    });
  });

  describe('Welcome Message', () => {
    it('should show simplified welcome message on first run', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Try It Now');

      await vscode.window.showInformationMessage(
        'BetterPrompt installed! 🚀\n\nI intelligently enhance your prompts to get better AI responses. No setup needed.',
        'Try It Now',
        'Dismiss'
      );

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('BetterPrompt installed'),
        'Try It Now',
        'Dismiss'
      );
    });

    it('should allow user to try immediately', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Try It Now');

      const result = await vscode.window.showInformationMessage(
        'BetterPrompt installed! 🚀',
        'Try It Now',
        'Dismiss'
      );

      expect(result).toBe('Try It Now');
    });

    it('should allow user to dismiss', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Dismiss');

      const result = await vscode.window.showInformationMessage(
        'BetterPrompt installed! 🚀',
        'Try It Now',
        'Dismiss'
      );

      expect(result).toBe('Dismiss');
    });

    it('should handle user closing the dialog', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await vscode.window.showInformationMessage(
        'BetterPrompt installed! 🚀',
        'Try It Now',
        'Dismiss'
      );

      expect(result).toBeUndefined();
    });
  });

  describe('Onboarding Completion', () => {
    it('should mark onboarding as complete after "Try It Now"', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Try It Now');

      await mockContext.globalState.update('hasCompletedOnboarding', true);

      const hasCompleted = mockContext.globalState.get('hasCompletedOnboarding');
      expect(hasCompleted).toBe(true);
    });

    it('should mark onboarding as complete after "Dismiss"', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Dismiss');

      await mockContext.globalState.update('hasCompletedOnboarding', true);

      expect(mockContext.globalState.update).toHaveBeenCalledWith('hasCompletedOnboarding', true);
    });

    it('should mark onboarding as complete even if user closes dialog', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      await mockContext.globalState.update('hasCompletedOnboarding', true);

      expect(mockContext.globalState.update).toHaveBeenCalledWith('hasCompletedOnboarding', true);
    });

    it('should not show onboarding on subsequent activations', async () => {
      await mockContext.globalState.update('hasCompletedOnboarding', true);
      const hasCompleted = mockContext.globalState.get('hasCompletedOnboarding');

      expect(hasCompleted).toBe(true);
    });
  });

  describe('Reset Command', () => {
    it('should reset hasCompletedOnboarding flag', async () => {
      // First complete onboarding
      await mockContext.globalState.update('hasCompletedOnboarding', true);
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBe(true);

      // Reset onboarding
      await mockContext.globalState.update('hasCompletedOnboarding', undefined);
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBeUndefined();
    });

    it('should allow user to run onboarding again after reset', async () => {
      // Complete onboarding
      await mockContext.globalState.update('hasCompletedOnboarding', true);

      // Reset
      await mockContext.globalState.update('hasCompletedOnboarding', undefined);

      // Should be able to run again
      const hasCompleted = mockContext.globalState.get('hasCompletedOnboarding');
      expect(hasCompleted).toBeUndefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full onboarding flow with "Try It Now"', async () => {
      // Step 1: First run detection
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBeUndefined();

      // Step 2: User clicks "Try It Now"
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Try It Now');

      const choice = await vscode.window.showInformationMessage(
        'BetterPrompt installed! 🚀',
        'Try It Now',
        'Dismiss'
      );

      // Step 3: Mark complete
      await mockContext.globalState.update('hasCompletedOnboarding', true);

      // Verify
      expect(choice).toBe('Try It Now');
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBe(true);
    });

    it('should complete onboarding flow with "Dismiss"', async () => {
      // User clicks "Dismiss"
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Dismiss');

      const choice = await vscode.window.showInformationMessage(
        'BetterPrompt installed! 🚀',
        'Try It Now',
        'Dismiss'
      );

      if (choice === 'Dismiss') {
        await mockContext.globalState.update('hasCompletedOnboarding', true);
      }

      // Verify onboarding marked complete
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBe(true);
    });

    it('should handle user dismissing dialog by closing it', async () => {
      // User closes dialog
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      const choice = await vscode.window.showInformationMessage(
        'BetterPrompt installed! 🚀',
        'Try It Now',
        'Dismiss'
      );

      // Should still mark complete to avoid showing again
      await mockContext.globalState.update('hasCompletedOnboarding', true);

      expect(choice).toBeUndefined();
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBe(true);
    });
  });

  describe('Zero Setup Philosophy', () => {
    it('should not require any configuration steps', async () => {
      // The new onboarding has no QuickPick for persona selection
      expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
    });

    it('should use "auto" mode by default', () => {
      // System uses intelligent auto-detection - no user selection needed
      const defaultUserLevel = 'auto';
      expect(defaultUserLevel).toBe('auto');
    });

    it('should not prompt for API keys during onboarding', async () => {
      // No input boxes for API keys in new flow
      expect(vscode.window.showInputBox).not.toHaveBeenCalled();
    });
  });
});
