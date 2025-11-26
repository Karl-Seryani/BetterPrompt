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

  // Register the reset onboarding command (for testing)
  const resetOnboardingCommand = vscode.commands.registerCommand('betterprompt.resetOnboarding', async () => {
    await context.globalState.update('hasCompletedOnboarding', false);
    void vscode.window.showInformationMessage('Onboarding reset! Reload the window to see it again.');
  });

  // Add all commands to subscriptions for proper cleanup
  context.subscriptions.push(optimizePromptCommand, showSettingsCommand, resetOnboardingCommand);

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
 * Show welcome message and onboarding on first activation
 */
function showWelcomeMessage(context: vscode.ExtensionContext): void {
  const hasCompletedOnboarding = context.globalState.get<boolean>('hasCompletedOnboarding', false);

  if (!hasCompletedOnboarding) {
    void showOnboardingFlow(context);
  }
}

/**
 * First-run onboarding flow - simple welcome, zero setup required
 */
async function showOnboardingFlow(context: vscode.ExtensionContext): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'BetterPrompt installed! 🚀\n\nI intelligently enhance your prompts to get better AI responses. No setup needed.',
    'Try It Now',
    'Dismiss'
  );

  if (choice === 'Try It Now') {
    await vscode.commands.executeCommand('betterprompt.optimizePrompt');
  }

  void context.globalState.update('hasCompletedOnboarding', true);
}
