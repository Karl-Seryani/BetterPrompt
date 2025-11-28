/**
 * Error Handler - Categorizes errors and provides user-friendly messages
 * Improves UX by giving actionable steps instead of technical jargon
 */

export enum ErrorCategory {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  AUTH_FAILED = 'AUTH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN = 'UNKNOWN',
}

export interface CategorizedError {
  category: ErrorCategory;
  originalMessage: string;
  isRecoverable: boolean;
}

/**
 * Categorizes an error based on its message content
 * @param error The error to categorize (Error, string, or any)
 * @returns Categorized error with metadata
 */
export function categorizeError(error: unknown): CategorizedError {
  const errorMessage = extractErrorMessage(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for quota/rate limit errors
  if (
    lowerMessage.includes('429') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('quota')
  ) {
    return {
      category: ErrorCategory.QUOTA_EXCEEDED,
      originalMessage: errorMessage,
      isRecoverable: true,
    };
  }

  // Check for authentication errors
  if (
    lowerMessage.includes('401') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('invalid api key') ||
    lowerMessage.includes('authentication failed') ||
    lowerMessage.includes('invalid credentials') ||
    lowerMessage.includes('api key not found')
  ) {
    return {
      category: ErrorCategory.AUTH_FAILED,
      originalMessage: errorMessage,
      isRecoverable: true,
    };
  }

  // Check for permission/consent errors
  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('consent') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('denied')
  ) {
    return {
      category: ErrorCategory.PERMISSION_DENIED,
      originalMessage: errorMessage,
      isRecoverable: true,
    };
  }

  // Check for network errors (before timeout, since ETIMEDOUT is network-related)
  if (
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('enotfound') ||
    lowerMessage.includes('etimedout') ||
    lowerMessage.includes('connection')
  ) {
    return {
      category: ErrorCategory.NETWORK_ERROR,
      originalMessage: errorMessage,
      isRecoverable: true,
    };
  }

  // Check for timeout errors (application-level timeouts)
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      category: ErrorCategory.TIMEOUT,
      originalMessage: errorMessage,
      isRecoverable: true,
    };
  }

  // Check for model availability errors
  if (
    lowerMessage.includes('model not available') ||
    lowerMessage.includes('model not found') ||
    lowerMessage.includes('no language models') ||
    lowerMessage.includes('not accessible')
  ) {
    return {
      category: ErrorCategory.MODEL_UNAVAILABLE,
      originalMessage: errorMessage,
      isRecoverable: true,
    };
  }

  // Unknown error
  return {
    category: ErrorCategory.UNKNOWN,
    originalMessage: errorMessage,
    isRecoverable: false,
  };
}

/**
 * Formats an error into a user-friendly message with actionable steps
 * @param error The error to format
 * @returns User-friendly error message
 */
export function formatUserError(error: unknown): string {
  const categorized = categorizeError(error);

  switch (categorized.category) {
    case ErrorCategory.QUOTA_EXCEEDED:
      return (
        'GitHub Copilot quota exceeded. ' +
        'Add a free Groq API key in settings to continue using BetterPrompt. ' +
        'Get your key at: https://console.groq.com'
      );

    case ErrorCategory.AUTH_FAILED:
      return (
        'Authentication failed. ' +
        'Please check your API key in BetterPrompt settings. ' +
        'If using Groq, get a free API key at https://console.groq.com'
      );

    case ErrorCategory.NETWORK_ERROR:
      return (
        'Network connection failed. ' +
        'Please check your internet connection and try again. ' +
        'If the problem persists, the API service may be temporarily unavailable.'
      );

    case ErrorCategory.TIMEOUT:
      return (
        'Request timed out. ' +
        'The AI service is taking longer than usual to respond. ' +
        'Please try again in a moment.'
      );

    case ErrorCategory.MODEL_UNAVAILABLE:
      return (
        'AI model not available. ' +
        'Make sure GitHub Copilot is installed and active. ' +
        'Alternatively, configure a Groq API key in settings as a fallback.'
      );

    case ErrorCategory.PERMISSION_DENIED:
      return (
        'Permission denied. ' +
        'Please grant BetterPrompt permission to access the AI model in VS Code settings. ' +
        'You may need to reload VS Code after granting permissions.'
      );

    case ErrorCategory.UNKNOWN:
    default:
      // For unknown errors, include the original message but make it user-friendly
      return (
        `An error occurred: ${categorized.originalMessage}. ` +
        'Please try again. If the problem persists, check your settings or report the issue on GitHub.'
      );
  }
}

/**
 * Extracts error message from various error types
 * @param error Any error type
 * @returns Error message string
 */
function extractErrorMessage(error: unknown): string {
  if (!error) {
    return 'Unknown error occurred';
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message || 'Unknown error';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle objects with message property
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;

    // Try nested error structures
    if (obj.error && typeof obj.error === 'object') {
      const nested = obj.error as Record<string, unknown>;
      if (nested.message && typeof nested.message === 'string') {
        return nested.message;
      }
    }

    // Try direct message
    if (obj.message && typeof obj.message === 'string') {
      return obj.message;
    }

    // Stringify the object
    return JSON.stringify(error);
  }

  return String(error);
}
