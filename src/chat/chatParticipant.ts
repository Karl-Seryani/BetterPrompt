/**
 * Chat Participant Handler
 * Provides seamless prompt enhancement via @betterprompt in VS Code chat
 */

import * as vscode from 'vscode';
import { PromptRewriter, RewriteOptions } from '../rewriter/promptRewriter';
import { ENHANCEMENT_TIMEOUT_MS } from '../../core/constants';
import { getSecretStorage } from '../utils/secretStorage';
import { handleTemplateCommand } from '../templates/templateHandler';
import type { ImprovementBreakdown } from '../rewriter/types';

export interface ChatParticipantConfig {
  groqApiKey?: string;
  preferredModel: 'auto' | 'gpt-4' | 'groq';
  threshold: number;
  chatMode: 'review' | 'auto';
}

/**
 * Formats improvement breakdown as markdown checkmarks
 */
function formatImprovements(improvements: ImprovementBreakdown): string {
  const lines: string[] = [];

  if (improvements.addedSpecificity) {
    lines.push('- ✓ Added specificity (file paths, technical terms)');
  }
  if (improvements.madeActionable) {
    lines.push('- ✓ Made actionable (clear steps)');
  }
  if (improvements.addressedIssues) {
    lines.push('- ✓ Addressed unclear language');
  }
  if (improvements.stayedOnTopic) {
    lines.push('- ✓ Stayed on topic');
  }

  // If nothing was improved, show a note
  if (lines.length === 0) {
    lines.push('- Minor refinements applied');
  }

  return lines.join('\n');
}

/**
 * Registers the BetterPrompt chat participant
 */
export function registerChatParticipant(context: vscode.ExtensionContext): void {
  // Create the chat participant
  const participant = vscode.chat.createChatParticipant(
    'betterprompt.chat',
    async (request, _chatContext, stream, token) => {
      try {
        // Get configuration
        const config = vscode.workspace.getConfiguration('betterprompt');
        // Get API key from secure storage (not plain settings)
        const groqApiKey = await getSecretStorage().getGroqApiKey();
        const chatConfig: ChatParticipantConfig = {
          groqApiKey,
          preferredModel: config.get<string>('preferredModel', 'auto') as 'auto' | 'gpt-4' | 'groq',
          // Support both old and new setting names for backwards compatibility
          threshold: config.get<number>('enhancementThreshold') ?? config.get<number>('vaguenessThreshold', 30),
          chatMode: config.get<string>('chatMode', 'review') as 'review' | 'auto',
        };

        // Get user's prompt from chat
        const userPrompt = request.prompt.trim();

        if (!userPrompt) {
          stream.markdown('Please provide a prompt to enhance.\n\nExample: `@betterprompt make a login system`');
          return;
        }

        // Check for slash commands
        const command = request.command;

        // Handle /template command
        if (command === 'template') {
          await handleTemplateCommand(userPrompt || undefined, stream);
          return;
        }

        const mode = command === 'auto' ? 'auto' : command === 'review' ? 'review' : chatConfig.chatMode;

        // Show analyzing indicator
        stream.progress('Analyzing prompt...');

        // Initialize rewriter
        const rewriterOptions: RewriteOptions = {
          groqApiKey: chatConfig.groqApiKey,
          threshold: chatConfig.threshold,
          preferredModel: chatConfig.preferredModel,
        };

        const rewriter = new PromptRewriter(rewriterOptions);

        // Process the prompt with a timeout to prevent indefinite hangs
        // Use a wrapper object to safely track the timeout ID without non-null assertions
        const timeout = { id: null as ReturnType<typeof setTimeout> | null };
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeout.id = setTimeout(() => {
            const seconds = ENHANCEMENT_TIMEOUT_MS / 1000;
            reject(new Error(`Request timed out after ${seconds} seconds. Please try again.`));
          }, ENHANCEMENT_TIMEOUT_MS);
        });

        // Pass the cancellation token so the request can be aborted if user cancels
        let result;
        try {
          result = await Promise.race([rewriter.processPrompt(userPrompt, token), timeoutPromise]);
        } finally {
          // Always clear the timeout to prevent memory leaks
          if (timeout.id !== null) {
            clearTimeout(timeout.id);
          }
        }

        // Handle errors with context-appropriate hints
        if (result.error) {
          stream.markdown(`❌ **Error:** ${result.error}\n\n`);

          // Provide helpful hints based on the error type
          if (result.error.includes('Rate limit')) {
            stream.markdown(
              '💡 **Tip:** Wait a moment before trying again, or use clearer prompts that skip enhancement.'
            );
          } else if (result.error.includes('No AI model available')) {
            stream.markdown(
              '💡 **Tip:** Configure a Groq API key in settings, or install ' +
                '[GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat).'
            );
          } else if (result.error.includes('Groq API key not configured')) {
            stream.markdown(
              '💡 **Tip:** Add your Groq API key in Settings → BetterPrompt → Groq API Key, ' +
                'or change preferred model to "auto".'
            );
          } else if (result.error.includes('cancelled')) {
            stream.markdown('💡 **Tip:** The request was cancelled. Try again when ready.');
          } else if (result.error.includes('timed out')) {
            stream.markdown('💡 **Tip:** The AI service is slow. Try again or check your network connection.');
          } else {
            stream.markdown('💡 **Tip:** Please make sure GitHub Copilot is installed and active.');
          }
          return;
        }

        // Handle skipped (prompt already good)
        if (result.skipped) {
          stream.markdown(`✅ **Your prompt looks great!**\n\n`);
          stream.markdown('No enhancement needed. You can use it as-is!');
          return;
        }

        // Handle successful enhancement
        if (result.rewrite) {
          const { rewrite } = result;

          // Mode 1: Review Mode (Show enhancement)
          if (mode === 'review') {
            stream.markdown(`## 📊 Enhancement Results\n\n`);
            stream.markdown(`**Model:** ${rewrite.model}\n\n`);

            stream.markdown(`### What Was Improved:\n`);
            stream.markdown(formatImprovements(rewrite.improvements) + '\n\n');

            stream.markdown(`---\n\n`);
            stream.markdown(`## 🎯 Original Prompt\n\n`);
            stream.markdown(`\`\`\`\n${rewrite.original}\n\`\`\`\n\n`);
            stream.markdown(`## ✨ Enhanced Prompt\n\n`);
            stream.markdown(`\`\`\`\n${rewrite.enhanced}\n\`\`\`\n\n`);
            stream.markdown(`---\n\n`);
            stream.markdown(`💡 **Tip:** Use \`/auto\` for transparent mode (auto-sends to language model)\n`);
            stream.markdown(`Example: \`@betterprompt /auto make a login system\``);
          }
          // Mode 2: Auto Mode (Transparent - send to LM and return response)
          else {
            // Show brief indicator that we're enhancing
            stream.progress('Enhancing prompt...');

            // Send enhanced prompt to the language model
            const models = await vscode.lm.selectChatModels();
            if (models.length === 0) {
              stream.markdown(
                '❌ **Error:** No language model available.\n\n' +
                  'Please install [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) to use auto mode.'
              );
              return;
            }

            // Get the best available model (prefer GPT-4)
            const gpt4Model = models.find((m) => m.family.toLowerCase().includes('gpt-4'));
            const model = gpt4Model || models[0];

            stream.progress(`Using ${model.vendor}/${model.family}...`);

            // Send the ENHANCED prompt to the language model
            const messages = [vscode.LanguageModelChatMessage.User(rewrite.enhanced)];

            const lmResponse = await model.sendRequest(messages, {}, token);

            // Stream the response back to the user
            for await (const fragment of lmResponse.text) {
              stream.markdown(fragment);
            }

            // Add footer showing it was enhanced
            stream.markdown(`\n\n---\n`);
            stream.markdown(`_✨ Prompt enhanced by BetterPrompt using ${rewrite.model}_`);
          }
        }
      } catch (error: unknown) {
        stream.markdown(`❌ **Error:** ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  context.subscriptions.push(participant);
}
