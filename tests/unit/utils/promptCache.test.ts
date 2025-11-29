/**
 * Tests for PromptCache
 */

import { PromptCache, getPromptCache, resetPromptCache } from '../../../src/utils/promptCache';
import { RewriteResult } from '../../../src/rewriter/types';

describe('PromptCache', () => {
  let cache: PromptCache;

  beforeEach(() => {
    cache = new PromptCache();
    resetPromptCache();
  });

  const createMockResult = (enhanced: string): RewriteResult => ({
    original: 'test prompt',
    enhanced,
    model: 'test-model',
    confidence: 0.85,
  });

  describe('get and set', () => {
    it('should return undefined for uncached prompts', () => {
      const result = cache.get('uncached prompt');
      expect(result).toBeUndefined();
    });

    it('should return cached result for same prompt', () => {
      const mockResult = createMockResult('enhanced prompt');
      cache.set('test prompt', undefined, mockResult);

      const result = cache.get('test prompt');
      expect(result).toEqual(mockResult);
    });

    it('should differentiate prompts with different contexts', () => {
      const result1 = createMockResult('enhanced with context 1');
      const result2 = createMockResult('enhanced with context 2');

      cache.set('test prompt', 'context1', result1);
      cache.set('test prompt', 'context2', result2);

      expect(cache.get('test prompt', 'context1')).toEqual(result1);
      expect(cache.get('test prompt', 'context2')).toEqual(result2);
    });

    it('should be case-insensitive for prompts', () => {
      const mockResult = createMockResult('enhanced');
      cache.set('Test Prompt', undefined, mockResult);

      expect(cache.get('test prompt')).toEqual(mockResult);
      expect(cache.get('TEST PROMPT')).toEqual(mockResult);
    });

    it('should trim whitespace from prompts', () => {
      const mockResult = createMockResult('enhanced');
      cache.set('  test prompt  ', undefined, mockResult);

      expect(cache.get('test prompt')).toEqual(mockResult);
    });
  });

  describe('TTL expiration', () => {
    it('should return undefined for expired entries', () => {
      // Use a very short TTL
      const shortTtlCache = new PromptCache({ ttlMs: 50 });
      const mockResult = createMockResult('enhanced');

      shortTtlCache.set('test', undefined, mockResult);
      expect(shortTtlCache.get('test')).toEqual(mockResult);

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortTtlCache.get('test')).toBeUndefined();
          resolve();
        }, 100);
      });
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      const smallCache = new PromptCache({ maxSize: 3 });

      smallCache.set('prompt1', undefined, createMockResult('enhanced1'));
      smallCache.set('prompt2', undefined, createMockResult('enhanced2'));
      smallCache.set('prompt3', undefined, createMockResult('enhanced3'));

      // All three should be cached
      expect(smallCache.get('prompt1')).toBeDefined();
      expect(smallCache.get('prompt2')).toBeDefined();
      expect(smallCache.get('prompt3')).toBeDefined();

      // Add a fourth entry - should evict prompt1 (oldest)
      smallCache.set('prompt4', undefined, createMockResult('enhanced4'));

      expect(smallCache.get('prompt1')).toBeUndefined();
      expect(smallCache.get('prompt2')).toBeDefined();
      expect(smallCache.get('prompt3')).toBeDefined();
      expect(smallCache.get('prompt4')).toBeDefined();
    });

    it('should refresh entry position on access', () => {
      const smallCache = new PromptCache({ maxSize: 3 });

      smallCache.set('prompt1', undefined, createMockResult('enhanced1'));
      smallCache.set('prompt2', undefined, createMockResult('enhanced2'));
      smallCache.set('prompt3', undefined, createMockResult('enhanced3'));

      // Access prompt1 to move it to the end
      smallCache.get('prompt1');

      // Add a fourth entry - should evict prompt2 (now oldest)
      smallCache.set('prompt4', undefined, createMockResult('enhanced4'));

      expect(smallCache.get('prompt1')).toBeDefined(); // Still cached (was accessed)
      expect(smallCache.get('prompt2')).toBeUndefined(); // Evicted
      expect(smallCache.get('prompt3')).toBeDefined();
      expect(smallCache.get('prompt4')).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('prompt1', undefined, createMockResult('enhanced1'));
      cache.set('prompt2', undefined, createMockResult('enhanced2'));

      expect(cache.size()).toBe(2);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('prompt1')).toBeUndefined();
      expect(cache.get('prompt2')).toBeUndefined();
    });
  });

  describe('prune', () => {
    it('should remove expired entries', async () => {
      const shortTtlCache = new PromptCache({ ttlMs: 50 });

      shortTtlCache.set('prompt1', undefined, createMockResult('enhanced1'));

      // Wait for entry to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      shortTtlCache.set('prompt2', undefined, createMockResult('enhanced2'));

      const prunedCount = shortTtlCache.prune();

      expect(prunedCount).toBe(1);
      expect(shortTtlCache.get('prompt1')).toBeUndefined();
      expect(shortTtlCache.get('prompt2')).toBeDefined();
    });
  });

  describe('global cache', () => {
    it('should return same instance on multiple calls', () => {
      const cache1 = getPromptCache();
      const cache2 = getPromptCache();

      expect(cache1).toBe(cache2);
    });

    it('should create new instance after reset', () => {
      const cache1 = getPromptCache();
      cache1.set('test', undefined, createMockResult('enhanced'));

      resetPromptCache();

      const cache2 = getPromptCache();
      expect(cache2.get('test')).toBeUndefined();
    });
  });
});
