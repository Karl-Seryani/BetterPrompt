/**
 * Error Handler - Categorizes errors and provides user-friendly messages
 * Improves UX by giving actionable steps instead of technical jargon
 *
 * Uses structured error patterns instead of fragile string matching
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
 * Error pattern definition for categorization
 */
interface ErrorPattern {
  category: ErrorCategory;
  isRecoverable: boolean;
  // HTTP status codes that map to this category
  statusCodes?: number[];
  // Error codes (Node.js, fetch, etc.) that map to this category
  errorCodes?: string[];
  // Keywords as a fallback (case-insensitive)
  keywords?: string[];
}

/**
 * Structured error patterns - ordered by specificity (most specific first)
 * Prefer error codes over string matching when possible
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // Quota/Rate Limit errors
  {
    category: ErrorCategory.QUOTA_EXCEEDED,
    isRecoverable: true,
    statusCodes: [429],
    errorCodes: ['RATE_LIMIT', 'QUOTA_EXCEEDED', 'TOO_MANY_REQUESTS'],
    keywords: ['rate limit', 'too many requests', 'quota exceeded', 'quota', '429'],
  },

  // Authentication errors
  {
    category: ErrorCategory.AUTH_FAILED,
    isRecoverable: true,
    statusCodes: [401, 403],
    errorCodes: ['UNAUTHORIZED', 'INVALID_API_KEY', 'AUTH_FAILED', 'FORBIDDEN'],
    keywords: [
      'unauthorized',
      'invalid api key',
      'authentication failed',
      'invalid credentials',
      'api key not found',
      '401',
    ],
  },

  // Permission/Consent errors (VS Code specific)
  {
    category: ErrorCategory.PERMISSION_DENIED,
    isRecoverable: true,
    errorCodes: ['EPERM', 'EACCES'],
    keywords: ['permission denied', 'consent required', 'access denied', 'not permitted', 'permission', 'consent'],
  },

  // Network errors (check before timeout since ETIMEDOUT is network-related)
  {
    category: ErrorCategory.NETWORK_ERROR,
    isRecoverable: true,
    errorCodes: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'EAI_AGAIN'],
    // Include error codes as keywords since they may appear in message strings too
    keywords: [
      'network error',
      'network request failed',
      'network failed',
      'fetch failed',
      'connection refused',
      'dns lookup failed',
      'econnrefused',
      'enotfound',
      'etimedout',
      'econnreset',
    ],
  },

  // Timeout errors (application-level)
  {
    category: ErrorCategory.TIMEOUT,
    isRecoverable: true,
    statusCodes: [408, 504],
    errorCodes: ['TIMEOUT', 'REQUEST_TIMEOUT', 'GATEWAY_TIMEOUT'],
    keywords: ['timed out', 'timeout exceeded', 'request timeout'],
  },

  // Model availability errors
  {
    category: ErrorCategory.MODEL_UNAVAILABLE,
    isRecoverable: true,
    statusCodes: [503, 502],
    errorCodes: ['MODEL_NOT_FOUND', 'SERVICE_UNAVAILABLE', 'MODEL_OVERLOADED'],
    keywords: ['model not available', 'model not found', 'no language models', 'not accessible', 'service unavailable'],
  },
];

/**
 * Extracts error code from various error formats
 */
function extractErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const obj = error as Record<string, unknown>;

  // Node.js error code (ECONNREFUSED, etc.)
  if (typeof obj.code === 'string') {
    return obj.code.toUpperCase();
  }

  // Nested error with code
  if (obj.error && typeof obj.error === 'object') {
    const nested = obj.error as Record<string, unknown>;
    if (typeof nested.code === 'string') {
      return nested.code.toUpperCase();
    }
  }

  // Cause chain (modern Error.cause)
  if (obj.cause && typeof obj.cause === 'object') {
    const cause = obj.cause as Record<string, unknown>;
    if (typeof cause.code === 'string') {
      return cause.code.toUpperCase();
    }
  }

  return null;
}

/**
 * Extracts HTTP status code from various error formats
 */
function extractStatusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const obj = error as Record<string, unknown>;

  // Direct status property
  if (typeof obj.status === 'number') {
    return obj.status;
  }
  if (typeof obj.statusCode === 'number') {
    return obj.statusCode;
  }

  // Response object
  if (obj.response && typeof obj.response === 'object') {
    const resp = obj.response as Record<string, unknown>;
    if (typeof resp.status === 'number') {
      return resp.status;
    }
  }

  // Nested error
  if (obj.error && typeof obj.error === 'object') {
    const nested = obj.error as Record<string, unknown>;
    if (typeof nested.status === 'number') {
      return nested.status;
    }
  }

  return null;
}

/**
 * Categorizes an error based on structured patterns
 * Priority: status codes > error codes > keywords
 *
 * @param error The error to categorize (Error, string, or any)
 * @returns Categorized error with metadata
 */
export function categorizeError(error: unknown): CategorizedError {
  const errorMessage = extractErrorMessage(error);
  const errorCode = extractErrorCode(error);
  const statusCode = extractStatusCode(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Try each pattern in order of specificity
  for (const pattern of ERROR_PATTERNS) {
    // Check status codes first (most reliable)
    if (statusCode && pattern.statusCodes?.includes(statusCode)) {
      return {
        category: pattern.category,
        originalMessage: errorMessage,
        isRecoverable: pattern.isRecoverable,
      };
    }

    // Check error codes second (reliable)
    if (errorCode && pattern.errorCodes?.includes(errorCode)) {
      return {
        category: pattern.category,
        originalMessage: errorMessage,
        isRecoverable: pattern.isRecoverable,
      };
    }

    // Check keywords as fallback (least reliable, but necessary for some cases)
    if (pattern.keywords?.some((keyword) => lowerMessage.includes(keyword))) {
      return {
        category: pattern.category,
        originalMessage: errorMessage,
        isRecoverable: pattern.isRecoverable,
      };
    }
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
