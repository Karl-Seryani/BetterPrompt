/**
 * Chat Participant Handler
 * Provides seamless prompt enhancement via @betterprompt in VS Code chat
 */

import * as vscode from 'vscode';
import { PromptRewriter, RewriteOptions } from '../rewriter/promptRewriter';

export interface ChatParticipantConfig {
  groqApiKey?: string;
  userLevel: 'auto' | 'beginner' | 'developer';
  preferredModel: 'auto' | 'gpt-4' | 'claude' | 'groq';
  vaguenessThreshold: number;
  chatMode: 'review' | 'auto';
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
        const chatConfig: ChatParticipantConfig = {
          groqApiKey: config.get<string>('groqApiKey', ''),
          userLevel: config.get<string>('userLevel', 'auto') as 'auto' | 'beginner' | 'developer',
          preferredModel: config.get<string>('preferredModel', 'auto') as 'auto' | 'gpt-4' | 'claude' | 'groq',
          vaguenessThreshold: config.get<number>('vaguenessThreshold', 30),
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
        const mode = command === 'auto' ? 'auto' : command === 'review' ? 'review' : chatConfig.chatMode;

        // Show analyzing indicator
        stream.progress('Analyzing prompt...');

        // Initialize rewriter
        const rewriterOptions: RewriteOptions = {
          groqApiKey: chatConfig.groqApiKey,
          threshold: chatConfig.vaguenessThreshold,
          userLevel: chatConfig.userLevel,
          preferredModel: chatConfig.preferredModel,
        };

        const rewriter = new PromptRewriter(rewriterOptions);

        // Process the prompt
        const result = await rewriter.processPrompt(userPrompt);

        // Handle errors
        if (result.error) {
          stream.markdown(`❌ **Error:** ${result.error}\n\n`);
          stream.markdown('Please make sure GitHub Copilot is installed and active.');
          return;
        }

        // Handle skipped (prompt already good)
        if (result.skipped) {
          stream.markdown(`✅ **Your prompt looks great!**\n\n`);
          stream.markdown(`Vagueness Score: **${result.analysis.score}/100** (below threshold)\n\n`);
          stream.markdown('No enhancement needed. You can use it as-is!');
          return;
        }

        // Handle successful enhancement
        if (result.rewrite) {
          const { analysis, rewrite } = result;

          // Mode 1: Review Mode (Show enhancement)
          if (mode === 'review') {
            stream.markdown(`## 📊 Analysis Results\n\n`);
            stream.markdown(`- **Vagueness Score:** ${analysis.score}/100\n`);
            stream.markdown(`- **Enhancement Model:** ${rewrite.model}\n`);
            stream.markdown(`- **Confidence:** ${Math.round(rewrite.confidence * 100)}%\n\n`);

            if (analysis.issues.length > 0) {
              stream.markdown(`### Issues Detected:\n`);
              analysis.issues.forEach((issue, index) => {
                stream.markdown(`${index + 1}. **${issue.type}**: ${issue.description}\n`);
              });
              stream.markdown(`\n`);
            }

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
              stream.markdown('❌ **Error:** No language model available.\n\n');
              stream.markdown('No language model available. Please install GitHub Copilot Chat.');
              return;
            }

            // Get the best available model
            const model =
              models.find((m) => m.family.toLowerCase().includes('gpt-4')) ||
              models.find((m) => m.family.toLowerCase().includes('claude')) ||
              models[0];

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
            stream.markdown(
              `_✨ Prompt enhanced by BetterPrompt (${analysis.score}/100 vagueness) using ${rewrite.model}_`
            );
          }
        }
      } catch (error) {
        stream.markdown(`❌ **Error:** ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Set metadata
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');

  context.subscriptions.push(participant);
}
