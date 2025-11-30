import * as vscode from 'vscode';
import { PromptRewriter, RewriteWorkflowResult } from './rewriter/promptRewriter';
import { registerChatParticipant } from './chat/chatParticipant';
import { logger } from './utils/logger';
import { initializeRateLimiter } from './utils/rateLimiter';
import { initializeTelemetry } from './utils/telemetry';
import { initializeSecretStorage, getSecretStorage } from './utils/secretStorage';
import { registerTrainingDataCommand } from './ml/trainingDataGenerator';

// Module-level state for diff content provider (registered once)
let diffContentProvider: DiffContentProvider | null = null;

/**
 * Content provider for diff view - stores current diff content
 */
class DiffContentProvider implements vscode.TextDocumentContentProvider {
  private originalContent = '';
  private enhancedContent = '';

  setContent(original: string, enhanced: string): void {
    this.originalContent = original;
    this.enhancedContent = enhanced;
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    if (uri.path === 'original.txt') {
      return this.originalContent;
    }
    return this.enhancedContent;
  }
}

/**
 * Extension activation entry point
 * Called when the extension is first activated
 */
export function activate(context: vscode.ExtensionContext): void {
  logger.info('BetterPrompt extension activated');
  logger.debug('Extension context', { extensionPath: context.extensionPath });

  // Initialize secure storage for API keys
  const secretStorage = initializeSecretStorage(context);

  // Migrate API key from old settings to secure storage (one-time migration)
  secretStorage
    .migrateFromSettings()
    .then((migrated) => {
      if (migrated) {
        logger.info('Migrated Groq API key from settings to secure storage');
        void vscode.window.showInformationMessage(
          'BetterPrompt: Your Groq API key has been migrated to secure storage for better security.'
        );
      }
    })
    .catch((error: unknown) => {
      logger.error('Failed to migrate API key to secure storage', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

  // Initialize rate limiter with proper lifecycle management
  initializeRateLimiter(context);

  // Initialize opt-in telemetry
  initializeTelemetry(context);

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

  // Register the set Groq API key command
  const setGroqApiKeyCommand = vscode.commands.registerCommand('betterprompt.setGroqApiKey', async () => {
    await handleSetGroqApiKey();
  });

  // Add all commands to subscriptions for proper cleanup
  context.subscriptions.push(optimizePromptCommand, showSettingsCommand, resetOnboardingCommand, setGroqApiKeyCommand);

  // Register diff content provider once (reused for all diff views)
  diffContentProvider = new DiffContentProvider();
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('betterprompt', diffContentProvider));

  // Register chat participant for @betterprompt in VS Code chat
  registerChatParticipant(context);

  // Register training data generation command (for ML development)
  registerTrainingDataCommand(context);

  // Show welcome message on first activation
  showWelcomeMessage(context);
}

/**
 * Extension deactivation cleanup
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  // Reset module-level state
  diffContentProvider = null;
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

  // Get Groq API key from secure storage (not plain settings)
  const groqApiKey = await getSecretStorage().getGroqApiKey();

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
        // Support both old and new setting names for backwards compatibility
        const threshold = config.get<number>('enhancementThreshold') ?? config.get<number>('vaguenessThreshold', 30);
        const preferredModel = config.get<string>('preferredModel', 'auto') as 'auto' | 'gpt-4' | 'groq';
        const rewriter = new PromptRewriter({
          groqApiKey,
          threshold,
          preferredModel,
        });

        // Process the prompt
        return await rewriter.processPrompt(userPrompt);
      } catch (error: unknown) {
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
    void vscode.window.showInformationMessage('Your prompt looks good! No enhancement needed.');
    return;
  }

  // If we have a rewrite, show it
  if (result.rewrite) {
    const { rewrite } = result;
    const enhancedPrompt = rewrite.enhanced;

    // Count improvements
    const improvementCount = Object.values(rewrite.improvements).filter(Boolean).length;
    const improvementText = improvementCount > 0 ? `${improvementCount} improvements made` : 'Refined';

    const choice = await vscode.window.showInformationMessage(
      `BetterPrompt enhanced your prompt!\n\nModel: ${rewrite.model}\n${improvementText}`,
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
async function showDiff(_context: vscode.ExtensionContext, original: string, enhanced: string): Promise<void> {
  if (!diffContentProvider) {
    logger.error('Diff content provider not initialized');
    return;
  }

  // Update the provider with new content
  diffContentProvider.setContent(original, enhanced);

  const originalUri = vscode.Uri.parse('betterprompt:/original.txt');
  const enhancedUri = vscode.Uri.parse('betterprompt:/enhanced.txt');

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
 * Handler for setting the Groq API key securely
 */
async function handleSetGroqApiKey(): Promise<void> {
  const secretStorage = getSecretStorage();
  const hasExistingKey = await secretStorage.hasGroqApiKey();

  const prompt = hasExistingKey
    ? 'Enter new Groq API key (leave empty to remove existing key)'
    : 'Enter your Groq API key (get free key at console.groq.com)';

  const apiKey = await vscode.window.showInputBox({
    prompt,
    placeHolder: 'gsk_...',
    password: true, // Mask the input
    ignoreFocusOut: true,
    validateInput: (value) => {
      // Allow empty (to clear key or skip)
      if (!value) {
        return null;
      }
      // Soft validation: warn if doesn't look like a Groq key
      if (!value.startsWith('gsk_')) {
        return 'Groq API keys typically start with "gsk_"';
      }
      return null;
    },
  });

  // User cancelled (pressed Escape)
  if (apiKey === undefined) {
    return;
  }

  // User submitted empty string
  if (apiKey === '') {
    if (hasExistingKey) {
      await secretStorage.deleteGroqApiKey();
      void vscode.window.showInformationMessage('Groq API key removed.');
    }
    return;
  }

  // Save the new key
  await secretStorage.setGroqApiKey(apiKey);
  void vscode.window.showInformationMessage('Groq API key saved securely.');
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
 * First-run onboarding flow - transparent about quota usage with option to use Groq
 */
async function showOnboardingFlow(context: vscode.ExtensionContext): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'BetterPrompt installed! 🚀\n\n' +
      'I enhance your prompts using GitHub Copilot (consumes your Copilot quota).\n\n' +
      'To preserve your Copilot quota, you can use free Groq API instead.',
    'Try It Now',
    'Use Groq Instead',
    'Dismiss'
  );

  if (choice === 'Try It Now') {
    await vscode.commands.executeCommand('betterprompt.optimizePrompt');
  } else if (choice === 'Use Groq Instead') {
    // Open the secure API key input
    await vscode.commands.executeCommand('betterprompt.setGroqApiKey');
    // Remind user to change preferred model
    void vscode.window.showInformationMessage(
      'After adding your key, set "Preferred Model" to "groq" in BetterPrompt settings.'
    );
  }

  void context.globalState.update('hasCompletedOnboarding', true);
}
