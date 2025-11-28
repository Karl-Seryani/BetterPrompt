/**
 * Tests for RateLimiter
 * Ensures API quota protection for multiple users
 */

import { RateLimiter } from '../../../src/utils/rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    // Default: 10 requests per minute
    rateLimiter = new RateLimiter(10, 60000);
  });

  describe('canMakeRequest', () => {
    it('should allow requests under the limit', () => {
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.canMakeRequest()).toBe(true);
        rateLimiter.recordRequest();
      }
    });

    it('should block requests over the limit', () => {
      // Max out the limit
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordRequest();
      }

      // 11th request should be blocked
      expect(rateLimiter.canMakeRequest()).toBe(false);
    });

    it('should allow requests after time window expires', async () => {
      // Use shorter window for testing (100ms)
      const shortLimiter = new RateLimiter(2, 100);

      // Make 2 requests (max out)
      shortLimiter.recordRequest();
      shortLimiter.recordRequest();

      // Should be blocked
      expect(shortLimiter.canMakeRequest()).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      expect(shortLimiter.canMakeRequest()).toBe(true);
    });

    it('should use sliding window (not fixed window)', async () => {
      // 3 requests per 200ms window
      const limiter = new RateLimiter(3, 200);

      // Make 3 requests at t=0
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();

      // Blocked at t=0
      expect(limiter.canMakeRequest()).toBe(false);

      // Wait 100ms (half the window)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Still blocked (all 3 requests still in 200ms window)
      expect(limiter.canMakeRequest()).toBe(false);

      // Wait another 150ms (total 250ms - first request should have expired)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed (oldest request expired)
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('should handle concurrent requests correctly', () => {
      const limiter = new RateLimiter(5, 60000);

      // Simulate 5 concurrent checks
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(limiter.canMakeRequest());
        limiter.recordRequest();
      }

      // All 5 should succeed
      expect(results.every((r) => r === true)).toBe(true);

      // 6th should fail
      expect(limiter.canMakeRequest()).toBe(false);
    });
  });

  describe('recordRequest', () => {
    it('should increment request count', () => {
      expect(rateLimiter.canMakeRequest()).toBe(true);

      rateLimiter.recordRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(9);

      rateLimiter.recordRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(8);
    });

    it('should not allow recording beyond limit', () => {
      // Max out
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordRequest();
      }

      expect(rateLimiter.getRemainingRequests()).toBe(0);

      // Try to record more (should be no-op or throw)
      rateLimiter.recordRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(0);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return correct remaining count', () => {
      expect(rateLimiter.getRemainingRequests()).toBe(10);

      rateLimiter.recordRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(9);

      rateLimiter.recordRequest();
      rateLimiter.recordRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(7);
    });

    it('should never return negative numbers', () => {
      for (let i = 0; i < 15; i++) {
        rateLimiter.recordRequest();
      }

      expect(rateLimiter.getRemainingRequests()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTimeUntilReset', () => {
    it('should return 0 when no requests made', () => {
      expect(rateLimiter.getTimeUntilReset()).toBe(0);
    });

    it('should return time until oldest request expires', async () => {
      const limiter = new RateLimiter(2, 1000);

      limiter.recordRequest();

      // Should be roughly 1000ms until reset
      const timeUntilReset = limiter.getTimeUntilReset();
      expect(timeUntilReset).toBeGreaterThan(900);
      expect(timeUntilReset).toBeLessThanOrEqual(1000);

      // Wait 500ms
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should be roughly 500ms until reset
      const timeAfterWait = limiter.getTimeUntilReset();
      expect(timeAfterWait).toBeGreaterThan(400);
      expect(timeAfterWait).toBeLessThanOrEqual(600);
    });

    it('should return 0 after window expires', async () => {
      const limiter = new RateLimiter(1, 100);

      limiter.recordRequest();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(limiter.getTimeUntilReset()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all requests', () => {
      // Max out
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordRequest();
      }

      expect(rateLimiter.canMakeRequest()).toBe(false);

      rateLimiter.reset();

      expect(rateLimiter.canMakeRequest()).toBe(true);
      expect(rateLimiter.getRemainingRequests()).toBe(10);
    });

    it('should reset time until reset', () => {
      rateLimiter.recordRequest();
      expect(rateLimiter.getTimeUntilReset()).toBeGreaterThan(0);

      rateLimiter.reset();
      expect(rateLimiter.getTimeUntilReset()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero limit gracefully', () => {
      const limiter = new RateLimiter(0, 60000);
      expect(limiter.canMakeRequest()).toBe(false);
    });

    it('should handle very short windows', async () => {
      const limiter = new RateLimiter(2, 10); // 10ms window

      limiter.recordRequest();
      limiter.recordRequest();

      expect(limiter.canMakeRequest()).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('should handle very long windows', () => {
      const limiter = new RateLimiter(5, 3600000); // 1 hour

      for (let i = 0; i < 5; i++) {
        limiter.recordRequest();
      }

      expect(limiter.canMakeRequest()).toBe(false);
      expect(limiter.getTimeUntilReset()).toBeGreaterThan(3500000);
    });

    it('should handle rapid successive requests', () => {
      const limiter = new RateLimiter(100, 60000);

      // Make 100 requests as fast as possible
      for (let i = 0; i < 100; i++) {
        expect(limiter.canMakeRequest()).toBe(true);
        limiter.recordRequest();
      }

      // 101st should fail
      expect(limiter.canMakeRequest()).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should respect custom limits', () => {
      const customLimiter = new RateLimiter(5, 30000);

      for (let i = 0; i < 5; i++) {
        customLimiter.recordRequest();
      }

      expect(customLimiter.canMakeRequest()).toBe(false);
    });

    it('should accept limit of 1', () => {
      const singleLimiter = new RateLimiter(1, 60000);

      singleLimiter.recordRequest();
      expect(singleLimiter.canMakeRequest()).toBe(false);
    });

    it('should handle large limits', () => {
      const largeLimiter = new RateLimiter(1000, 60000);

      for (let i = 0; i < 999; i++) {
        largeLimiter.recordRequest();
      }

      expect(largeLimiter.canMakeRequest()).toBe(true);
      expect(largeLimiter.getRemainingRequests()).toBe(1);
    });
  });
});
