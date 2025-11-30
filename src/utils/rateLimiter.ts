/**
 * Rate Limiter - Sliding Window Implementation
 * Protects against API quota exhaustion for multiple users
 *
 * Lifecycle managed via VS Code ExtensionContext for proper cleanup
 */

import * as vscode from 'vscode';

// Default rate limiting configuration
const DEFAULT_RATE_LIMIT = 10; // 10 requests per minute
const DEFAULT_RATE_WINDOW_MS = 60000; // 1 minute in milliseconds

export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Sliding window rate limiter
 * Tracks requests by timestamp and enforces limits
 */
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  /**
   * Creates a new rate limiter
   * @param maxRequests Maximum number of requests allowed in the window
   * @param windowMs Time window in milliseconds
   */
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Checks if a new request can be made without exceeding the limit
   * @returns true if request is allowed, false if rate limited
   */
  public canMakeRequest(): boolean {
    this.cleanExpiredRequests();
    return this.requests.length < this.maxRequests;
  }

  /**
   * Records a new request timestamp
   * Should be called after canMakeRequest() returns true
   */
  public recordRequest(): void {
    this.cleanExpiredRequests();

    // Only record if we're under the limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(Date.now());
    }
  }

  /**
   * Gets the number of requests remaining in the current window
   * @returns Number of requests still available
   */
  public getRemainingRequests(): number {
    this.cleanExpiredRequests();
    const remaining = this.maxRequests - this.requests.length;
    return Math.max(0, remaining);
  }

  /**
   * Gets the time in milliseconds until the rate limit resets
   * @returns Milliseconds until oldest request expires, or 0 if no requests
   */
  public getTimeUntilReset(): number {
    this.cleanExpiredRequests();

    if (this.requests.length === 0) {
      return 0;
    }

    // Time until oldest request expires
    const oldestRequest = this.requests[0];
    const expirationTime = oldestRequest + this.windowMs;
    const now = Date.now();
    const timeRemaining = expirationTime - now;

    return Math.max(0, timeRemaining);
  }

  /**
   * Resets the rate limiter, clearing all tracked requests
   */
  public reset(): void {
    this.requests = [];
  }

  /**
   * Gets the configured max requests (for debugging/testing)
   */
  public getMaxRequests(): number {
    return this.maxRequests;
  }

  /**
   * Gets the configured window size (for debugging/testing)
   */
  public getWindowMs(): number {
    return this.windowMs;
  }

  /**
   * Removes expired requests from the tracking array
   * Uses sliding window algorithm
   */
  private cleanExpiredRequests(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    // Remove all requests older than the window
    this.requests = this.requests.filter((timestamp) => timestamp > cutoff);
  }
}

/**
 * WeakMap to associate rate limiters with ExtensionContext
 * Allows proper garbage collection when context is disposed
 */
const contextRateLimiters = new WeakMap<vscode.ExtensionContext, RateLimiter>();

/**
 * Global rate limiter instance (fallback for non-extension usage like tests)
 * Shared across all prompt enhancement requests
 */
let globalRateLimiter: RateLimiter | null = null;

/**
 * Tracks if rate limiter has been initialized with specific config
 * Prevents silent config changes on subsequent calls
 */
let isInitialized = false;
let initializedConfig: RateLimiterConfig | null = null;

/**
 * Initializes the global rate limiter with ExtensionContext lifecycle management
 * Should be called once during extension activation
 *
 * @param context VS Code ExtensionContext for lifecycle management
 * @param maxRequests Maximum requests per window (default from constants)
 * @param windowMs Window size in milliseconds (default from constants)
 * @returns The initialized rate limiter
 * @throws Error if already initialized with different configuration
 */
export function initializeRateLimiter(
  context: vscode.ExtensionContext,
  maxRequests = DEFAULT_RATE_LIMIT,
  windowMs = DEFAULT_RATE_WINDOW_MS
): RateLimiter {
  const newConfig: RateLimiterConfig = { maxRequests, windowMs };

  // Check for conflicting re-initialization
  if (isInitialized && initializedConfig) {
    if (initializedConfig.maxRequests !== maxRequests || initializedConfig.windowMs !== windowMs) {
      throw new Error(
        `Rate limiter already initialized with different config. ` +
          `Existing: ${initializedConfig.maxRequests}/${initializedConfig.windowMs}ms, ` +
          `Requested: ${maxRequests}/${windowMs}ms`
      );
    }
    // Same config, return existing
    return globalRateLimiter!;
  }

  // Create and store the rate limiter
  globalRateLimiter = new RateLimiter(maxRequests, windowMs);
  isInitialized = true;
  initializedConfig = newConfig;

  // Store in WeakMap for proper lifecycle management
  contextRateLimiters.set(context, globalRateLimiter);

  // Register cleanup on deactivation
  context.subscriptions.push({
    dispose: () => {
      globalRateLimiter = null;
      isInitialized = false;
      initializedConfig = null;
    },
  });

  return globalRateLimiter;
}

/**
 * Gets the global rate limiter instance
 * Uses defaults if not explicitly initialized
 *
 * @returns The global rate limiter instance
 */
export function getGlobalRateLimiter(): RateLimiter {
  if (!globalRateLimiter) {
    // Lazy initialization with defaults (for tests or non-extension usage)
    globalRateLimiter = new RateLimiter(DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW_MS);
  }
  return globalRateLimiter;
}

/**
 * Resets the global rate limiter
 * Useful for testing or configuration changes
 */
export function resetGlobalRateLimiter(): void {
  globalRateLimiter = null;
  isInitialized = false;
  initializedConfig = null;
}
