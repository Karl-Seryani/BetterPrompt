/**
 * Template Filler
 * Fills template placeholders from context or user input
 */

import { PromptTemplate, AutoFillHint } from './templateDefinitions';
import { WorkspaceContext } from '../context/contextDetector';

/** Maximum length for auto-filled code snippets */
const MAX_CODE_LENGTH = 500;

/**
 * Result of filling a template
 */
export interface FilledTemplate {
  /** The filled template string */
  filledTemplate: string;
  /** IDs of placeholders that were filled */
  filledPlaceholders: string[];
  /** IDs of placeholders that are still missing */
  missingPlaceholders: string[];
  /** IDs of required placeholders that are missing */
  missingRequired: string[];
  /** Whether all required placeholders are filled */
  isComplete: boolean;
}

/**
 * A prompt for user to fill a placeholder
 */
export interface PlaceholderPrompt {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
}

/**
 * Fills template placeholders from context or user values
 */
export class TemplateFiller {
  /**
   * Auto-fill placeholders from workspace context
   * Returns a map of placeholder ID -> value
   */
  autoFillFromContext(template: PromptTemplate, context: WorkspaceContext): Record<string, string> {
    const values: Record<string, string> = {};

    for (const placeholder of template.placeholders) {
      if (placeholder.autoFill) {
        const value = this.getAutoFillValue(placeholder.autoFill, context);
        values[placeholder.id] = value;
      }
    }

    return values;
  }

  /**
   * Get the auto-fill value for a given hint
   */
  private getAutoFillValue(hint: AutoFillHint, context: WorkspaceContext): string {
    switch (hint) {
      case 'currentFile':
        return context.currentFile?.relativePath || '';

      case 'firstError':
        return context.diagnostics?.firstError || '';

      case 'selectedCode': {
        if (!context.selectedCode) {
          return '';
        }
        if (context.selectedCode.length > MAX_CODE_LENGTH) {
          return context.selectedCode.substring(0, MAX_CODE_LENGTH) + '...';
        }
        return context.selectedCode;
      }

      case 'detectedFramework':
        return context.techStack?.frameworks?.[0] || '';

      case 'detectedLanguage':
        return context.techStack?.languages?.[0] || '';

      default:
        return '';
    }
  }

  /**
   * Fill a template with given values
   */
  fill(template: PromptTemplate, values: Record<string, string>): FilledTemplate {
    const filledPlaceholders: string[] = [];
    const missingPlaceholders: string[] = [];
    const missingRequired: string[] = [];

    let filledTemplate = template.template;

    for (const placeholder of template.placeholders) {
      const value = values[placeholder.id];
      const regex = new RegExp(`\\{\\{${placeholder.id}\\}\\}`, 'g');

      if (value && value.trim().length > 0) {
        filledTemplate = filledTemplate.replace(regex, value);
        filledPlaceholders.push(placeholder.id);
      } else {
        // Replace with empty string for unfilled placeholders
        filledTemplate = filledTemplate.replace(regex, '');
        missingPlaceholders.push(placeholder.id);

        if (placeholder.required) {
          missingRequired.push(placeholder.id);
        }
      }
    }

    // Clean up extra whitespace from removed placeholders
    filledTemplate = filledTemplate
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      filledTemplate,
      filledPlaceholders,
      missingPlaceholders,
      missingRequired,
      isComplete: missingRequired.length === 0,
    };
  }

  /**
   * Get prompts for unfilled placeholders, sorted by required first
   */
  getPlaceholderPrompts(template: PromptTemplate, filledValues: Record<string, string>): PlaceholderPrompt[] {
    const prompts: PlaceholderPrompt[] = [];

    for (const placeholder of template.placeholders) {
      const value = filledValues[placeholder.id];
      if (!value || value.trim().length === 0) {
        prompts.push({
          id: placeholder.id,
          label: placeholder.label,
          hint: placeholder.hint,
          required: placeholder.required ?? false,
        });
      }
    }

    // Sort: required first, then by order in template
    prompts.sort((a, b) => {
      if (a.required && !b.required) {
        return -1;
      }
      if (!a.required && b.required) {
        return 1;
      }
      return 0;
    });

    return prompts;
  }

  /**
   * Preview the template with filled values and [placeholder] for unfilled
   */
  preview(template: PromptTemplate, values: Record<string, string>): string {
    let preview = template.template;

    for (const placeholder of template.placeholders) {
      const value = values[placeholder.id];
      const regex = new RegExp(`\\{\\{${placeholder.id}\\}\\}`, 'g');

      if (value && value.trim().length > 0) {
        preview = preview.replace(regex, value);
      } else {
        // Show as [placeholderName] for unfilled
        preview = preview.replace(regex, `[${placeholder.id}]`);
      }
    }

    return preview;
  }
}
