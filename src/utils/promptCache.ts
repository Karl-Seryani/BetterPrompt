/**
 * Prompt Enhancement Cache
 * Caches enhanced prompts to avoid redundant AI API calls
 *
 * Uses an LRU-like strategy with TTL expiration
 */

import { RewriteResult } from '../rewriter/types';

/**
 * Cache entry with timestamp for TTL expiration
 */
interface CacheEntry {
  result: RewriteResult;
  timestamp: number;
}

/**
 * Configuration for the prompt cache
 */
export interface PromptCacheConfig {
  /** Maximum number of entries to cache (default: 100) */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttlMs?: number;
}

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * LRU cache for prompt enhancements
 */
export class PromptCache {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(config: PromptCacheConfig = {}) {
    this.maxSize = config.maxSize ?? DEFAULT_MAX_SIZE;
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;
    this.cache = new Map();
  }

  /**
   * Generates a cache key from prompt and context
   * Uses a simple concatenation since prompts are typically short
   */
  private generateKey(prompt: string, context?: string): string {
    const normalizedPrompt = prompt.trim().toLowerCase();
    const normalizedContext = context?.trim().toLowerCase() || '';
    return `${normalizedPrompt}|${normalizedContext}`;
  }

  /**
   * Gets a cached result if it exists and hasn't expired
   * @param prompt Original prompt
   * @param context Optional workspace context
   * @returns Cached result or undefined if not found/expired
   */
  public get(prompt: string, context?: string): RewriteResult | undefined {
    const key = this.generateKey(prompt, context);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end of map to maintain LRU order (most recently accessed)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.result;
  }

  /**
   * Stores an enhancement result in the cache
   * @param prompt Original prompt
   * @param context Optional workspace context
   * @param result Enhancement result to cache
   */
  public set(prompt: string, context: string | undefined, result: RewriteResult): void {
    const key = this.generateKey(prompt, context);

    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clears all cached entries
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Gets current cache size
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Removes expired entries from the cache
   * Called periodically to prevent memory leaks
   */
  public prune(): number {
    const now = Date.now();
    let prunedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        prunedCount++;
      }
    }

    return prunedCount;
  }
}

/**
 * Global prompt cache instance
 */
let globalPromptCache: PromptCache | null = null;

/**
 * Gets or creates the global prompt cache
 */
export function getPromptCache(): PromptCache {
  if (!globalPromptCache) {
    globalPromptCache = new PromptCache();
  }
  return globalPromptCache;
}

/**
 * Resets the global prompt cache (useful for testing)
 */
export function resetPromptCache(): void {
  globalPromptCache = null;
}
