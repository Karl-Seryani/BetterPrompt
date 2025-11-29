/**
 * Package.json Cache
 * Caches parsed package.json files with TTL to avoid redundant file I/O
 */

import * as fs from 'fs/promises';

interface CacheEntry {
  data: Record<string, unknown> | null;
  timestamp: number;
}

export interface PackageJsonCacheOptions {
  ttl?: number; // Time-to-live in milliseconds (default: 60000 = 1 minute)
}

/**
 * Simple in-memory cache for package.json files
 * Reduces file system I/O by caching parsed package.json with TTL
 */
export class PackageJsonCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number;

  constructor(options: PackageJsonCacheOptions = {}) {
    this.ttl = options.ttl ?? 60000; // Default: 1 minute
  }

  /**
   * Gets a parsed package.json from cache or file system
   * @param filePath Absolute path to package.json
   * @returns Parsed package.json or null if not found/invalid
   */
  public async get(filePath: string): Promise<Record<string, unknown> | null> {
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return null;
    }

    // Check cache
    const cached = this.cache.get(filePath);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.ttl) {
      // Cache hit and not expired
      return cached.data;
    }

    // Cache miss or expired - read from file system
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as Record<string, unknown>;

      // Store in cache
      this.cache.set(filePath, {
        data: parsed,
        timestamp: now,
      });

      return parsed;
    } catch {
      // JSON parse error or read error
      return null;
    }
  }

  /**
   * Invalidates a specific cache entry
   * Useful when package.json is modified
   * @param filePath Absolute path to package.json
   */
  public invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * Clears entire cache
   * Useful for testing or when workspace changes
   */
  public clear(): void {
    this.cache.clear();
  }
}

// Global singleton instance
let globalCache: PackageJsonCache | undefined;

/**
 * Gets the global package.json cache instance
 * @returns Shared cache instance
 */
export function getPackageJsonCache(): PackageJsonCache {
  if (!globalCache) {
    globalCache = new PackageJsonCache();
  }
  return globalCache;
}
