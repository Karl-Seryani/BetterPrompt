/**
 * Tests for Package.json Cache
 * Ensures efficient caching with TTL and file watching
 */

import { PackageJsonCache } from '../../../src/context/packageJsonCache';
import * as fs from 'fs/promises';

// Mock fs/promises module
jest.mock('fs/promises');

describe('PackageJsonCache', () => {
  let cache: PackageJsonCache;
  const mockFsAccess = fs.access as jest.MockedFunction<typeof fs.access>;
  const mockFsReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new PackageJsonCache();
  });

  describe('get', () => {
    it('should return null when file does not exist', async () => {
      mockFsAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await cache.get('/fake/path/package.json');

      expect(result).toBeNull();
      expect(mockFsAccess).toHaveBeenCalledWith('/fake/path/package.json');
    });

    it('should parse and cache package.json on first read', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue(JSON.stringify({ name: 'test', version: '1.0.0' }));

      const result = await cache.get('/path/to/package.json');

      expect(result).toEqual({ name: 'test', version: '1.0.0' });
      expect(mockFsReadFile).toHaveBeenCalledTimes(1);
    });

    it('should return cached value on subsequent reads (no re-parsing)', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue(JSON.stringify({ name: 'cached', version: '2.0.0' }));

      const result1 = await cache.get('/path/to/package.json');
      const result2 = await cache.get('/path/to/package.json');

      expect(result1).toEqual(result2);
      expect(mockFsReadFile).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should cache multiple different package.json files separately', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile
        .mockResolvedValueOnce(JSON.stringify({ name: 'project1' }))
        .mockResolvedValueOnce(JSON.stringify({ name: 'project2' }));

      const result1 = await cache.get('/path/to/project1/package.json');
      const result2 = await cache.get('/path/to/project2/package.json');

      expect(result1).toEqual({ name: 'project1' });
      expect(result2).toEqual({ name: 'project2' });
      expect(mockFsReadFile).toHaveBeenCalledTimes(2);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue('invalid json{');

      const result = await cache.get('/path/to/broken/package.json');

      expect(result).toBeNull();
    });

    it('should re-read file after TTL expires', async () => {
      jest.useFakeTimers();
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile
        .mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }))
        .mockResolvedValueOnce(JSON.stringify({ version: '2.0.0' }));

      const result1 = await cache.get('/path/to/package.json');
      expect(result1).toEqual({ version: '1.0.0' });

      // Fast-forward 60 seconds (default TTL)
      jest.advanceTimersByTime(60000);

      const result2 = await cache.get('/path/to/package.json');
      expect(result2).toEqual({ version: '2.0.0' });
      expect(mockFsReadFile).toHaveBeenCalledTimes(2); // Re-read after TTL

      jest.useRealTimers();
    });

    it('should NOT re-read file before TTL expires', async () => {
      jest.useFakeTimers();
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue(JSON.stringify({ version: '1.0.0' }));

      const result1 = await cache.get('/path/to/package.json');

      // Fast-forward 30 seconds (half of TTL)
      jest.advanceTimersByTime(30000);

      const result2 = await cache.get('/path/to/package.json');

      expect(result1).toEqual(result2);
      expect(mockFsReadFile).toHaveBeenCalledTimes(1); // Still cached

      jest.useRealTimers();
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific cache entry', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile
        .mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }))
        .mockResolvedValueOnce(JSON.stringify({ version: '2.0.0' }));

      const result1 = await cache.get('/path/to/package.json');
      expect(result1).toEqual({ version: '1.0.0' });

      cache.invalidate('/path/to/package.json');

      const result2 = await cache.get('/path/to/package.json');
      expect(result2).toEqual({ version: '2.0.0' });
      expect(mockFsReadFile).toHaveBeenCalledTimes(2); // Re-read after invalidation
    });

    it('should not affect other cached entries when invalidating one', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile
        .mockResolvedValueOnce(JSON.stringify({ name: 'project1' }))
        .mockResolvedValueOnce(JSON.stringify({ name: 'project2' }));

      await cache.get('/path/to/project1/package.json');
      await cache.get('/path/to/project2/package.json');

      cache.invalidate('/path/to/project1/package.json');

      // project2 should still be cached
      const result2Again = await cache.get('/path/to/project2/package.json');
      expect(result2Again).toEqual({ name: 'project2' });
      expect(mockFsReadFile).toHaveBeenCalledTimes(2); // No re-read for project2
    });
  });

  describe('clear', () => {
    it('should clear entire cache', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile
        .mockResolvedValueOnce(JSON.stringify({ name: 'project1' }))
        .mockResolvedValueOnce(JSON.stringify({ name: 'project2' }))
        .mockResolvedValueOnce(JSON.stringify({ name: 'project1-reloaded' }))
        .mockResolvedValueOnce(JSON.stringify({ name: 'project2-reloaded' }));

      await cache.get('/path/to/project1/package.json');
      await cache.get('/path/to/project2/package.json');

      cache.clear();

      // Both should be re-read
      await cache.get('/path/to/project1/package.json');
      await cache.get('/path/to/project2/package.json');

      expect(mockFsReadFile).toHaveBeenCalledTimes(4); // 2 initial + 2 after clear
    });
  });

  describe('custom TTL', () => {
    it('should respect custom TTL value', async () => {
      jest.useFakeTimers();
      const customCache = new PackageJsonCache({ ttl: 5000 }); // 5 seconds
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile
        .mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }))
        .mockResolvedValueOnce(JSON.stringify({ version: '2.0.0' }));

      await customCache.get('/path/to/package.json');

      // Fast-forward 6 seconds (past custom TTL)
      jest.advanceTimersByTime(6000);

      await customCache.get('/path/to/package.json');

      expect(mockFsReadFile).toHaveBeenCalledTimes(2); // Re-read after custom TTL

      jest.useRealTimers();
    });
  });

  describe('performance benefits', () => {
    it('should significantly reduce file system calls', async () => {
      mockFsAccess.mockResolvedValue(undefined);
      mockFsReadFile.mockResolvedValue(JSON.stringify({ name: 'test' }));

      // Simulate 100 rapid calls (like multiple prompt enhancements)
      for (let i = 0; i < 100; i++) {
        await cache.get('/path/to/package.json');
      }

      // Should only read once, not 100 times
      expect(mockFsReadFile).toHaveBeenCalledTimes(1);
      expect(mockFsAccess).toHaveBeenCalledTimes(100); // Access check is cheap
    });
  });
});
