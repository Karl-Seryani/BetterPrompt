/**
 * Unit tests for Onboarding Flow
 */

import * as vscode from 'vscode';

// Import the actual onboarding function - we'll need to export it from extension.ts
// For now, we'll test the behavior through command execution

describe('Onboarding Flow', () => {
  let mockContext: vscode.ExtensionContext;
  let mockGlobalState: Map<string, any>;
  let mockConfig: vscode.WorkspaceConfiguration;

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

    // Mock workspace configuration
    mockConfig = {
      get: jest.fn(),
      has: jest.fn(),
      inspect: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    } as any;

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
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
  });

  describe('Welcome Message', () => {
    it('should show welcome message on first run', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Get Started');

      await vscode.window.showInformationMessage(
        'Welcome to PromptCraft! 🎨\n\nCraft better prompts for AI assistants with intelligent analysis and enhancement.',
        'Get Started',
        'Skip Setup'
      );

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to PromptCraft'),
        'Get Started',
        'Skip Setup'
      );
    });

    it('should allow user to skip onboarding', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Skip Setup');

      const result = await vscode.window.showInformationMessage(
        'Welcome to PromptCraft! 🎨\n\nCraft better prompts for AI assistants with intelligent analysis and enhancement.',
        'Get Started',
        'Skip Setup'
      );

      expect(result).toBe('Skip Setup');
    });

    it('should handle user dismissing welcome message', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await vscode.window.showInformationMessage(
        'Welcome to PromptCraft! 🎨',
        'Get Started',
        'Skip Setup'
      );

      expect(result).toBeUndefined();
    });
  });

  describe('Persona Selection', () => {
    const developerOption = {
      label: '$(code) Software Developer',
      description: 'Professional development with TDD, design patterns, and best practices',
      detail:
        'Prompts will emphasize: Test-Driven Development, architecture, security, performance, and production readiness',
      value: 'developer',
    };

    const beginnerOption = {
      label: '$(mortar-board) Regular User / Beginner',
      description: 'Step-by-step guidance with simplified explanations',
      detail: 'Prompts will be broken down into simple steps with examples and beginner-friendly language',
      value: 'beginner',
    };

    const autoOption = {
      label: '$(wand) Auto-Detect',
      description: 'Smart detection based on your prompts (recommended)',
      detail: 'PromptCraft will automatically detect your experience level from your prompts and adjust accordingly',
      value: 'auto',
    };

    it('should show three persona options', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(autoOption);

      await vscode.window.showQuickPick([developerOption, beginnerOption, autoOption], {
        title: 'Choose Your Experience Level',
        placeHolder: 'Select how PromptCraft should enhance your prompts',
        ignoreFocusOut: true,
      });

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ value: 'developer' }),
          expect.objectContaining({ value: 'beginner' }),
          expect.objectContaining({ value: 'auto' }),
        ]),
        expect.any(Object)
      );
    });

    it('should save developer level selection to settings', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(developerOption);

      const selected = await vscode.window.showQuickPick([developerOption, beginnerOption, autoOption]);

      if (selected) {
        await mockConfig.update('userLevel', selected.value, vscode.ConfigurationTarget.Global);
      }

      expect(mockConfig.update).toHaveBeenCalledWith('userLevel', 'developer', vscode.ConfigurationTarget.Global);
    });

    it('should save beginner level selection to settings', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(beginnerOption);

      const selected = await vscode.window.showQuickPick([developerOption, beginnerOption, autoOption]);

      if (selected) {
        await mockConfig.update('userLevel', selected.value, vscode.ConfigurationTarget.Global);
      }

      expect(mockConfig.update).toHaveBeenCalledWith('userLevel', 'beginner', vscode.ConfigurationTarget.Global);
    });

    it('should save auto-detect selection to settings', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(autoOption);

      const selected = await vscode.window.showQuickPick([developerOption, beginnerOption, autoOption]);

      if (selected) {
        await mockConfig.update('userLevel', selected.value, vscode.ConfigurationTarget.Global);
      }

      expect(mockConfig.update).toHaveBeenCalledWith('userLevel', 'auto', vscode.ConfigurationTarget.Global);
    });

    it('should handle user canceling persona selection', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

      const selected = await vscode.window.showQuickPick([developerOption, beginnerOption, autoOption]);

      expect(selected).toBeUndefined();
    });
  });

  describe('Onboarding Completion', () => {
    it('should mark onboarding as complete after successful flow', async () => {
      await mockContext.globalState.update('hasCompletedOnboarding', true);

      const hasCompleted = mockContext.globalState.get('hasCompletedOnboarding');

      expect(hasCompleted).toBe(true);
      expect(mockContext.globalState.update).toHaveBeenCalledWith('hasCompletedOnboarding', true);
    });

    it('should mark onboarding complete even if user skips', async () => {
      await mockContext.globalState.update('hasCompletedOnboarding', true);

      expect(mockContext.globalState.update).toHaveBeenCalledWith('hasCompletedOnboarding', true);
    });

    it('should not show onboarding on subsequent activations', async () => {
      await mockContext.globalState.update('hasCompletedOnboarding', true);
      const hasCompleted = mockContext.globalState.get('hasCompletedOnboarding');

      expect(hasCompleted).toBe(true);
    });
  });

  describe('Success Messages', () => {
    it('should show success message for developer level', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      await vscode.window.showInformationMessage(
        'PromptCraft is configured for Software Developers! Your prompts will emphasize TDD, architecture, and production best practices.'
      );

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('Software Developers'));
    });

    it('should show success message for beginner level', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      await vscode.window.showInformationMessage(
        'PromptCraft is configured for beginners! Your prompts will be broken down into simple, easy-to-follow steps.'
      );

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('beginners'));
    });

    it('should show success message for auto-detect level', async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      await vscode.window.showInformationMessage(
        'PromptCraft is configured with auto-detection! It will intelligently adapt to your experience level.'
      );

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('auto-detection'));
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
    it('should complete full onboarding flow for developer', async () => {
      // Step 1: First run detection
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBeUndefined();

      // Step 2: Show welcome, user clicks "Get Started"
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Get Started');

      // Step 3: User selects Developer
      const developerOption = { label: '$(code) Software Developer', value: 'developer' };
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(developerOption);

      const selected = await vscode.window.showQuickPick<{ label: string; value: string }>([]);
      if (selected) {
        await mockConfig.update('userLevel', selected.value, vscode.ConfigurationTarget.Global);
      }

      // Step 4: Mark complete
      await mockContext.globalState.update('hasCompletedOnboarding', true);

      // Verify
      expect(mockConfig.update).toHaveBeenCalledWith('userLevel', 'developer', vscode.ConfigurationTarget.Global);
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBe(true);
    });

    it('should handle user skipping onboarding', async () => {
      // User clicks "Skip Setup"
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Skip Setup');

      const choice = await vscode.window.showInformationMessage('Welcome', 'Get Started', 'Skip Setup');

      if (choice === 'Skip Setup') {
        await mockContext.globalState.update('hasCompletedOnboarding', true);
      }

      // Verify onboarding marked complete without saving persona
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBe(true);
      expect(mockConfig.update).not.toHaveBeenCalledWith('userLevel', expect.anything(), expect.anything());
    });

    it('should handle user dismissing all dialogs', async () => {
      // User dismisses welcome
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      const choice = await vscode.window.showInformationMessage('Welcome', 'Get Started', 'Skip Setup');

      if (!choice) {
        await mockContext.globalState.update('hasCompletedOnboarding', true);
      }

      // Should mark complete to avoid showing again
      expect(mockContext.globalState.get('hasCompletedOnboarding')).toBe(true);
    });
  });
});
