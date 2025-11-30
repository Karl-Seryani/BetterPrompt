/**
 * Chat Participant Handler
 * Provides prompt enhancement via @betterprompt in VS Code chat
 */

import * as vscode from 'vscode';
import { PromptRewriter } from '../rewriter/promptRewriter';
import { handleTemplateCommand } from '../templates/templateHandler';
import type { ImprovementBreakdown } from '../rewriter/types';

export interface ChatParticipantConfig {
  chatMode: 'review' | 'auto';
}

/**
 * Formats improvement breakdown as markdown
 */
function formatImprovements(improvements: ImprovementBreakdown): string {
  const lines: string[] = [];

  if (improvements.addedSpecificity) {
    lines.push('- Added specificity (file paths, technical terms)');
  }
  if (improvements.madeActionable) {
    lines.push('- Made actionable (clear steps)');
  }
  if (improvements.addressedIssues) {
    lines.push('- Addressed unclear language');
  }
  if (improvements.stayedOnTopic) {
    lines.push('- Stayed on topic');
  }

  if (lines.length === 0) {
    lines.push('- Minor refinements applied');
  }

  return lines.join('\n');
}

/**
 * Registers the BetterPrompt chat participant
 */
export function registerChatParticipant(context: vscode.ExtensionContext): void {
  const participant = vscode.chat.createChatParticipant(
    'betterprompt.chat',
    async (request, _chatContext, stream, token) => {
      try {
        const config = vscode.workspace.getConfiguration('betterprompt');
        const chatConfig: ChatParticipantConfig = {
          chatMode: config.get<string>('chatMode', 'review') as 'review' | 'auto',
        };

        const userPrompt = request.prompt.trim();

        if (!userPrompt) {
          stream.markdown('Please provide a prompt to enhance.\n\nExample: `@betterprompt make a login page`');
          return;
        }

        // Handle slash commands
        const command = request.command;

        if (command === 'template') {
          await handleTemplateCommand(userPrompt, stream);
          return;
        }

        const mode = command === 'auto' ? 'auto' : command === 'review' ? 'review' : chatConfig.chatMode;

        stream.progress('Enhancing prompt...');

        const rewriter = new PromptRewriter();
        const result = await rewriter.processPrompt(userPrompt, token);

        // Handle errors
        if (!result.success || !result.rewrite) {
          stream.markdown(`**Error:** ${result.error || 'Failed to enhance prompt'}\n\n`);
          if (result.error?.includes('Rate limit')) {
            stream.markdown('Try again in a minute.');
          } else if (result.error?.includes('Copilot')) {
            stream.markdown('Make sure GitHub Copilot is installed and active.');
          }
          return;
        }

        const { rewrite } = result;

        if (mode === 'review') {
          stream.markdown(`## Enhanced Prompt\n\n`);
          stream.markdown(`**Model:** ${rewrite.model}\n\n`);
          stream.markdown(`### Improvements:\n${formatImprovements(rewrite.improvements)}\n\n`);
          stream.markdown(`---\n\n`);
          stream.markdown(`**Original:**\n\`\`\`\n${rewrite.original}\n\`\`\`\n\n`);
          stream.markdown(`**Enhanced:**\n\`\`\`\n${rewrite.enhanced}\n\`\`\`\n\n`);
          stream.markdown(`---\n`);
          stream.markdown(`Use \`/auto\` to send enhanced prompts directly to Copilot.`);
        } else {
          stream.progress('Sending to Copilot...');

          const models = await vscode.lm.selectChatModels();
          if (models.length === 0) {
            stream.markdown('**Error:** No language model available. Install GitHub Copilot Chat.');
            return;
          }

          const model = models.find((m) => m.family.toLowerCase().includes('gpt-4')) || models[0];
          const messages = [vscode.LanguageModelChatMessage.User(rewrite.enhanced)];
          const lmResponse = await model.sendRequest(messages, {}, token);

          for await (const fragment of lmResponse.text) {
            stream.markdown(fragment);
          }

          stream.markdown(`\n\n---\n_Enhanced by BetterPrompt using ${rewrite.model}_`);
        }
      } catch (error: unknown) {
        stream.markdown(`**Error:** ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  context.subscriptions.push(participant);
}
