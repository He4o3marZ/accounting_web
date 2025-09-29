import { TranslationMemory } from '@/lib/translation-memory';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    flushdb: jest.fn(),
  }));
});

describe('TranslationMemory', () => {
  let translationMemory: TranslationMemory;

  beforeEach(() => {
    translationMemory = new TranslationMemory({
      maxMemoryCacheSize: 10,
      defaultTtl: 1000, // 1 second for testing
    });
  });

  afterEach(async () => {
    await translationMemory.clear();
  });

  describe('generateKey', () => {
    it('should generate consistent keys for the same input', () => {
      const key1 = (translationMemory as any).generateKey('hello', 'ar', 'en');
      const key2 = (translationMemory as any).generateKey('hello', 'ar', 'en');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = (translationMemory as any).generateKey('hello', 'ar', 'en');
      const key2 = (translationMemory as any).generateKey('world', 'ar', 'en');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different languages', () => {
      const key1 = (translationMemory as any).generateKey('hello', 'ar', 'en');
      const key2 = (translationMemory as any).generateKey('hello', 'fr', 'en');
      expect(key1).not.toBe(key2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve translations', async () => {
      await translationMemory.set('hello', 'مرحبا', 'ar', 'en');
      const result = await translationMemory.get('hello', 'ar', 'en');
      expect(result).toBe('مرحبا');
    });

    it('should return null for non-existent translations', async () => {
      const result = await translationMemory.get('nonexistent', 'ar', 'en');
      expect(result).toBeNull();
    });

    it('should handle different source languages', async () => {
      await translationMemory.set('hello', 'مرحبا', 'ar', 'auto');
      const result = await translationMemory.get('hello', 'ar', 'auto');
      expect(result).toBe('مرحبا');
    });
  });

  describe('TTL handling', () => {
    it('should return null for expired entries', async () => {
      await translationMemory.set('hello', 'مرحبا', 'ar', 'en', 1); // 1ms TTL
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for expiration
      const result = await translationMemory.get('hello', 'ar', 'en');
      expect(result).toBeNull();
    });

    it('should return valid entries before expiration', async () => {
      await translationMemory.set('hello', 'مرحبا', 'ar', 'en', 1000);
      const result = await translationMemory.get('hello', 'ar', 'en');
      expect(result).toBe('مرحبا');
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when cache is full', async () => {
      // Fill cache beyond max size
      for (let i = 0; i < 15; i++) {
        await translationMemory.set(`text${i}`, `translation${i}`, 'ar', 'en');
      }

      // First entries should be evicted
      const result1 = await translationMemory.get('text0', 'ar', 'en');
      expect(result1).toBeNull();

      // Last entries should still be there
      const result14 = await translationMemory.get('text14', 'ar', 'en');
      expect(result14).toBe('translation14');
    });
  });

  describe('clear', () => {
    it('should clear all cached translations', async () => {
      await translationMemory.set('hello', 'مرحبا', 'ar', 'en');
      await translationMemory.clear();
      const result = await translationMemory.get('hello', 'ar', 'en');
      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await translationMemory.set('hello', 'مرحبا', 'ar', 'en');
      const stats = await translationMemory.getStats();
      expect(stats.memoryCacheSize).toBe(1);
      expect(typeof stats.redisConnected).toBe('boolean');
    });
  });
});








