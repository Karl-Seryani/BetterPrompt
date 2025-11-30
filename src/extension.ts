import * as vscode from 'vscode';
import { PromptRewriter, RewriteWorkflowResult } from './rewriter/promptRewriter';
import { registerChatParticipant } from './chat/chatParticipant';
import { initializeRateLimiter } from './utils/rateLimiter';

let diffContentProvider: DiffContentProvider | null = null;

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

export function activate(context: vscode.ExtensionContext): void {
  try {
    initializeRateLimiter(context);

    const optimizePromptCommand = vscode.commands.registerCommand('betterprompt.optimizePrompt', () => {
      void handleOptimizePrompt(context);
    });

    const showSettingsCommand = vscode.commands.registerCommand('betterprompt.showSettings', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'betterprompt');
    });

    context.subscriptions.push(optimizePromptCommand, showSettingsCommand);

    diffContentProvider = new DiffContentProvider();
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider('betterprompt', diffContentProvider)
    );

    registerChatParticipant(context);
    showWelcomeMessage(context);
  } catch (error: unknown) {
    console.error('[BetterPrompt] Activation failed:', error);
    throw error;
  }
}

export function deactivate(): void {
  diffContentProvider = null;
}

async function handleOptimizePrompt(_context: vscode.ExtensionContext): Promise<void> {
  const userPrompt = await vscode.window.showInputBox({
    prompt: 'Enter your prompt to enhance',
    placeHolder: 'e.g., make a login page',
    ignoreFocusOut: true,
  });

  if (!userPrompt) {
    return;
  }

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'BetterPrompt',
      cancellable: false,
    },
    async (progress): Promise<RewriteWorkflowResult | null> => {
      progress.report({ message: 'Enhancing prompt...' });
      try {
        const rewriter = new PromptRewriter();
        return await rewriter.processPrompt(userPrompt);
      } catch (error: unknown) {
        void vscode.window.showErrorMessage(
          `BetterPrompt Error: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    }
  );

  if (!result) {
    return;
  }

  if (!result.success || result.error) {
    void vscode.window.showErrorMessage(`BetterPrompt Error: ${result.error}`);
    return;
  }

  if (result.rewrite) {
    const { rewrite } = result;
    const choice = await vscode.window.showInformationMessage(
      `Prompt enhanced using ${rewrite.model}`,
      'View Changes',
      'Copy Enhanced',
      'Dismiss'
    );

    if (choice === 'View Changes') {
      await showDiff(userPrompt, rewrite.enhanced);
    } else if (choice === 'Copy Enhanced') {
      await vscode.env.clipboard.writeText(rewrite.enhanced);
      void vscode.window.showInformationMessage('Enhanced prompt copied to clipboard!');
    }
  }
}

async function showDiff(original: string, enhanced: string): Promise<void> {
  if (!diffContentProvider) {
    return;
  }
  diffContentProvider.setContent(original, enhanced);
  const originalUri = vscode.Uri.parse('betterprompt:/original.txt');
  const enhancedUri = vscode.Uri.parse('betterprompt:/enhanced.txt');
  await vscode.commands.executeCommand('vscode.diff', originalUri, enhancedUri, 'BetterPrompt: Original ↔ Enhanced');
}

function showWelcomeMessage(context: vscode.ExtensionContext): void {
  const hasCompletedOnboarding = context.globalState.get<boolean>('hasCompletedOnboarding', false);
  if (!hasCompletedOnboarding) {
    void vscode.window
      .showInformationMessage('BetterPrompt installed! Type @betterprompt in Copilot Chat.', 'Try It Now', 'Dismiss')
      .then((choice) => {
        if (choice === 'Try It Now') {
          void vscode.commands.executeCommand('betterprompt.optimizePrompt');
        }
        void context.globalState.update('hasCompletedOnboarding', true);
      });
  }
}
