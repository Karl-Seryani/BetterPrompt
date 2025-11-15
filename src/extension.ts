import * as vscode from 'vscode';
import { PromptRewriter, RewriteWorkflowResult } from './rewriter/promptRewriter';
import { registerChatParticipant } from './chat/chatParticipant';

/**
 * Extension activation entry point
 * Called when the extension is first activated
 */
export function activate(context: vscode.ExtensionContext): void {
  // Extension activated successfully

  // Register the optimize prompt command
  const optimizePromptCommand = vscode.commands.registerCommand('betterprompt.optimizePrompt', () => {
    void handleOptimizePrompt(context);
  });

  // Register the settings command
  const showSettingsCommand = vscode.commands.registerCommand('betterprompt.showSettings', async () => {
    await handleShowSettings();
  });

  // Register the analytics dashboard command
  const showAnalyticsCommand = vscode.commands.registerCommand('betterprompt.showAnalytics', () => {
    handleShowAnalytics();
  });

  // Register the template management command
  const manageTemplatesCommand = vscode.commands.registerCommand('betterprompt.manageTemplates', () => {
    handleManageTemplates();
  });

  // Register the reset onboarding command (for testing)
  const resetOnboardingCommand = vscode.commands.registerCommand('betterprompt.resetOnboarding', async () => {
    await context.globalState.update('hasCompletedOnboarding', false);
    void vscode.window.showInformationMessage('Onboarding reset! Reload the window to see it again.');
  });

  // Add all commands to subscriptions for proper cleanup
  context.subscriptions.push(
    optimizePromptCommand,
    showSettingsCommand,
    showAnalyticsCommand,
    manageTemplatesCommand,
    resetOnboardingCommand
  );

  // Register chat participant for @betterprompt in VS Code chat
  registerChatParticipant(context);

  // Show welcome message on first activation
  showWelcomeMessage(context);
}

/**
 * Extension deactivation cleanup
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  // Cleanup will happen here (close DB connections, etc.)
}

/**
 * Handler for the optimize prompt command
 */
async function handleOptimizePrompt(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('betterprompt');
  const enabled = config.get<boolean>('enabled', true);

  if (!enabled) {
    void vscode.window.showWarningMessage('BetterPrompt is currently disabled. Enable it in settings.');
    return;
  }

  // Get Groq API key from configuration (optional - uses VS Code LM as primary)
  const groqApiKey = config.get<string>('groqApiKey', '');

  // Get user input prompt
  const userPrompt = await vscode.window.showInputBox({
    prompt: 'Enter your prompt to optimize',
    placeHolder: 'e.g., make a login page',
    ignoreFocusOut: true,
  });

  if (!userPrompt) {
    return; // User cancelled
  }

  // Show progress while processing
  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'BetterPrompt',
      cancellable: false,
    },
    async (progress): Promise<RewriteWorkflowResult | null> => {
      progress.report({ message: 'Analyzing prompt...' });

      try {
        // Initialize rewriter
        const threshold = config.get<number>('vaguenessThreshold', 30);
        const userLevel = config.get<string>('userLevel', 'auto') as 'auto' | 'beginner' | 'developer';
        const preferredModel = config.get<string>('preferredModel', 'auto') as 'auto' | 'gpt-4' | 'claude' | 'groq';
        const rewriter = new PromptRewriter({
          groqApiKey,
          threshold,
          userLevel,
          preferredModel,
        });

        // Process the prompt
        return await rewriter.processPrompt(userPrompt);
      } catch (error) {
        void vscode.window.showErrorMessage(
          `BetterPrompt Error: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    }
  );

  // Handle the result
  if (!result) {
    return;
  }

  if (result.error) {
    void vscode.window.showErrorMessage(`BetterPrompt Error: ${result.error}`);
    return;
  }

  if (result.skipped) {
    void vscode.window.showInformationMessage(
      `Your prompt looks good! (Vagueness score: ${result.analysis.score}/100)`
    );
    return;
  }

  // If we have a rewrite, show it
  if (result.rewrite) {
    const { analysis, rewrite } = result;
    const vaguenessScore = analysis.score;
    const confidencePercent = Math.round(rewrite.confidence * 100);
    const enhancedPrompt = rewrite.enhanced;

    const choice = await vscode.window.showInformationMessage(
      `BetterPrompt improved your prompt!\n\nModel: ${rewrite.model}\nVagueness Score: ${vaguenessScore}/100\nConfidence: ${confidencePercent}%`,
      'View Changes',
      'Copy Enhanced',
      'Dismiss'
    );

    if (choice === 'View Changes') {
      await showDiff(context, userPrompt, enhancedPrompt);
    } else if (choice === 'Copy Enhanced') {
      await vscode.env.clipboard.writeText(enhancedPrompt);
      void vscode.window.showInformationMessage('Enhanced prompt copied to clipboard!');
    }
  }
}

/**
 * Shows a diff view comparing original and enhanced prompts
 */
async function showDiff(context: vscode.ExtensionContext, original: string, enhanced: string): Promise<void> {
  const originalUri = vscode.Uri.parse('betterprompt:original.txt');
  const enhancedUri = vscode.Uri.parse('betterprompt:enhanced.txt');

  // Register text document content provider
  const provider = new (class implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(uri: vscode.Uri): string {
      if (uri.toString() === originalUri.toString()) {
        return original;
      }
      return enhanced;
    }
  })();

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('betterprompt', provider));

  // Open diff view
  await vscode.commands.executeCommand('vscode.diff', originalUri, enhancedUri, 'BetterPrompt: Original ↔ Enhanced');
}

/**
 * Handler for showing settings
 */
async function handleShowSettings(): Promise<void> {
  // Open VS Code settings filtered to BetterPrompt
  await vscode.commands.executeCommand('workbench.action.openSettings', 'betterprompt');
}

/**
 * Handler for showing analytics dashboard
 */
function handleShowAnalytics(): void {
  // TODO: Implement analytics dashboard
  void vscode.window.showInformationMessage('BetterPrompt: Analytics Dashboard - Coming Soon!');
}

/**
 * Handler for managing templates
 */
function handleManageTemplates(): void {
  // TODO: Implement template management UI
  void vscode.window.showInformationMessage('BetterPrompt: Template Manager - Coming Soon!');
}

/**
 * Show welcome message and onboarding on first activation
 */
function showWelcomeMessage(context: vscode.ExtensionContext): void {
  const hasCompletedOnboarding = context.globalState.get<boolean>('hasCompletedOnboarding', false);
  console.log('[BetterPrompt] hasCompletedOnboarding:', hasCompletedOnboarding);

  if (!hasCompletedOnboarding) {
    console.log('[BetterPrompt] Showing onboarding flow...');
    void showOnboardingFlow(context);
  } else {
    console.log('[BetterPrompt] Onboarding already completed, skipping.');
  }
}

/**
 * First-run onboarding flow - asks user to select their experience level
 */
async function showOnboardingFlow(context: vscode.ExtensionContext): Promise<void> {
  // Welcome message
  const welcomeChoice = await vscode.window.showInformationMessage(
    'Welcome to BetterPrompt! 🎨\n\nCraft better prompts for AI assistants with intelligent analysis and enhancement.',
    'Get Started',
    'Skip Setup'
  );

  if (welcomeChoice !== 'Get Started') {
    void context.globalState.update('hasCompletedOnboarding', true);
    return;
  }

  // Experience level selection
  interface LevelQuickPickItem extends vscode.QuickPickItem {
    value: 'developer' | 'beginner' | 'auto';
  }

  const levelOptions: LevelQuickPickItem[] = [
    {
      label: '$(code) Software Developer',
      description: 'Professional development with TDD, design patterns, and best practices',
      detail:
        'Prompts will emphasize: Test-Driven Development, architecture, security, performance, and production readiness',
      value: 'developer',
    },
    {
      label: '$(mortar-board) Regular User / Beginner',
      description: 'Step-by-step guidance with simplified explanations',
      detail: 'Prompts will be broken down into simple steps with examples and beginner-friendly language',
      value: 'beginner',
    },
    {
      label: '$(wand) Auto-Detect',
      description: 'Smart detection based on your prompts (recommended)',
      detail: 'BetterPrompt will automatically detect your experience level from your prompts and adjust accordingly',
      value: 'auto',
    },
  ];

  const selectedLevel = await vscode.window.showQuickPick(levelOptions, {
    placeHolder: 'Pick the one that relates to you the most',
    ignoreFocusOut: true,
    title: 'BetterPrompt Setup',
  });

  if (!selectedLevel) {
    // User cancelled - use auto as default
    void context.globalState.update('hasCompletedOnboarding', true);
    return;
  }

  // Save the user's choice to settings
  const config = vscode.workspace.getConfiguration('betterprompt');
  await config.update('userLevel', selectedLevel.value, vscode.ConfigurationTarget.Global);

  // Show confirmation based on selection
  let confirmationMessage = '';
  if (selectedLevel.value === 'developer') {
    confirmationMessage =
      'BetterPrompt is now configured for Software Developers!\n\nYour prompts will include: TDD workflows, design patterns, security best practices, and production considerations.';
  } else if (selectedLevel.value === 'beginner') {
    confirmationMessage =
      'BetterPrompt is now configured for Beginners!\n\nYour prompts will be broken down into simple, step-by-step guidance with examples.';
  } else {
    confirmationMessage =
      'BetterPrompt is now configured for Auto-Detection!\n\nIt will automatically adapt to your experience level based on your prompts.';
  }

  const finalChoice = await vscode.window.showInformationMessage(
    confirmationMessage,
    'Try It Now',
    'Setup API Key',
    'Done'
  );

  if (finalChoice === 'Try It Now') {
    // Run the optimize prompt command
    await vscode.commands.executeCommand('betterprompt.optimizePrompt');
  } else if (finalChoice === 'Setup API Key') {
    await handleShowSettings();
  }

  // Mark onboarding as complete
  void context.globalState.update('hasCompletedOnboarding', true);
}
