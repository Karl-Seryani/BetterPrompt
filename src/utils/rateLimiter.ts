/**
 * Rate Limiter - Sliding Window Implementation
 * Protects against API quota exhaustion for multiple users
 */

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
  private maxRequests: number;
  private windowMs: number;

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
 * Global rate limiter instance
 * Shared across all prompt enhancement requests
 */
let globalRateLimiter: RateLimiter | null = null;

/**
 * Gets or creates the global rate limiter instance
 * @param maxRequests Maximum requests per window (default: 10)
 * @param windowMs Window size in milliseconds (default: 60000 = 1 minute)
 * @returns The global rate limiter instance
 */
export function getGlobalRateLimiter(maxRequests = 10, windowMs = 60000): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(maxRequests, windowMs);
  }
  return globalRateLimiter;
}

/**
 * Resets the global rate limiter
 * Useful for testing or configuration changes
 */
export function resetGlobalRateLimiter(): void {
  globalRateLimiter = null;
}
