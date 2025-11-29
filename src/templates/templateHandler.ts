/**
 * Template Handler
 * Handles the /template command in chat
 */

import * as vscode from 'vscode';
import { getAllTemplates, getTemplate, PromptTemplate, TemplateCategory } from './templateDefinitions';
import { TemplateFiller } from './templateFiller';
import { detectContext } from '../context/contextDetector';

/**
 * Category display names
 */
const CATEGORY_NAMES: Record<TemplateCategory, string> = {
  debug: '🐛 Debug',
  create: '✨ Create',
  improve: '🔧 Improve',
  learn: '📚 Learn',
  test: '🧪 Test',
};

/**
 * Handles the /template command
 * @param templateId Optional template ID to use directly
 * @param stream The chat response stream
 * @returns The selected/filled template or undefined if cancelled
 */
export async function handleTemplateCommand(
  templateId: string | undefined,
  stream: vscode.ChatResponseStream
): Promise<string | undefined> {
  // If a specific template ID is provided, use it directly
  if (templateId && templateId.trim()) {
    const template = getTemplate(templateId.trim());
    if (template) {
      return showTemplateWithAutoFill(template, stream);
    } else {
      stream.markdown(`❌ Template \`${templateId}\` not found.\n\n`);
      showTemplateList(stream);
      return undefined;
    }
  }

  // No template ID - show the template list
  showTemplateList(stream);
  return undefined;
}

/**
 * Show list of all available templates
 */
function showTemplateList(stream: vscode.ChatResponseStream): void {
  stream.markdown(`## 📝 Available Prompt Templates\n\n`);
  stream.markdown(`Use \`@betterprompt /template <id>\` to select a template.\n\n`);

  const templates = getAllTemplates();

  // Group by category
  const byCategory = new Map<TemplateCategory, PromptTemplate[]>();
  for (const template of templates) {
    const list = byCategory.get(template.category) || [];
    list.push(template);
    byCategory.set(template.category, list);
  }

  // Display each category
  for (const [category, categoryTemplates] of byCategory) {
    const categoryName = CATEGORY_NAMES[category];
    stream.markdown(`### ${categoryName}\n\n`);

    for (const template of categoryTemplates) {
      stream.markdown(`- **\`${template.id}\`** - ${template.name}\n`);
      stream.markdown(`  _${template.description}_\n\n`);
    }
  }

  stream.markdown(`---\n`);
  stream.markdown(`**Example:** \`@betterprompt /template fix-bug\`\n`);
}

/**
 * Show a template with auto-filled values from context
 */
async function showTemplateWithAutoFill(
  template: PromptTemplate,
  stream: vscode.ChatResponseStream
): Promise<string | undefined> {
  stream.markdown(`## 📝 ${template.name}\n\n`);
  stream.markdown(`_${template.description}_\n\n`);

  // Detect context for auto-fill
  const context = await detectContext();
  const filler = new TemplateFiller();

  // Auto-fill what we can from context
  const autoFilledValues = filler.autoFillFromContext(template, context);

  // Show preview with placeholders
  const preview = filler.preview(template, autoFilledValues);

  stream.markdown(`### Template Preview\n\n`);
  stream.markdown('```\n' + preview + '\n```\n\n');

  // Show what was auto-filled
  const filledKeys = Object.entries(autoFilledValues).filter(([, v]) => v && v.length > 0);
  if (filledKeys.length > 0) {
    stream.markdown(`### Auto-filled from context:\n\n`);
    for (const [key, value] of filledKeys) {
      const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
      stream.markdown(`- **${key}**: \`${displayValue}\`\n`);
    }
    stream.markdown(`\n`);
  }

  // Show what still needs to be filled
  const prompts = filler.getPlaceholderPrompts(template, autoFilledValues);
  if (prompts.length > 0) {
    stream.markdown(`### Fill in these values:\n\n`);
    for (const prompt of prompts) {
      const requiredTag = prompt.required ? ' *(required)*' : '';
      const hint = prompt.hint ? ` - ${prompt.hint}` : '';
      stream.markdown(`- **${prompt.label}**${requiredTag}${hint}\n`);
    }
    stream.markdown(`\n`);
  }

  // Instructions for using the template
  stream.markdown(`---\n\n`);
  stream.markdown(`**How to use:**\n`);
  stream.markdown(`1. Copy the template above\n`);
  stream.markdown(`2. Replace \`[placeholder]\` values with your specifics\n`);
  stream.markdown(`3. Use the completed prompt with Copilot\n\n`);

  // If we have enough auto-filled, show a ready-to-use version
  const result = filler.fill(template, autoFilledValues);
  if (result.filledPlaceholders.length > 0) {
    stream.markdown(`**Quick copy (auto-filled values):**\n`);
    stream.markdown('```\n' + result.filledTemplate + '\n```\n');
  }

  return preview;
}

/**
 * Get a simple template string for quick use (no streaming)
 */
export function getQuickTemplate(templateId: string): string | undefined {
  const template = getTemplate(templateId);
  if (!template) {
    return undefined;
  }
  return template.template;
}
