import Redis from 'ioredis';
import { createHash } from 'crypto';

export interface TranslationCache {
  [key: string]: {
    translation: string;
    timestamp: number;
    ttl: number;
  };
}

export interface TranslationMemoryOptions {
  redisUrl?: string;
  maxMemoryCacheSize?: number;
  defaultTtl?: number;
}

export class TranslationMemory {
  private redis?: Redis;
  private memoryCache: Map<string, { translation: string; timestamp: number; ttl: number }> = new Map();
  private maxMemoryCacheSize: number;
  private defaultTtl: number;

  constructor(options: TranslationMemoryOptions = {}) {
    this.maxMemoryCacheSize = options.maxMemoryCacheSize || 1000;
    this.defaultTtl = options.defaultTtl || 24 * 60 * 60 * 1000; // 24 hours

    if (options.redisUrl) {
      try {
        this.redis = new Redis(options.redisUrl, {
          maxRetriesPerRequest: 3,
        });
        console.log('Connected to Redis for translation memory');
      } catch (error) {
        console.warn('Failed to connect to Redis, using memory cache only:', error);
      }
    }
  }

  private generateKey(text: string, targetLang: string, sourceLang: string = 'auto'): string {
    const content = `${sourceLang}:${targetLang}:${text}`;
    return createHash('sha256').update(content).digest('hex');
  }

  async get(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string | null> {
    const key = this.generateKey(text, targetLang, sourceLang);
    
    // Try memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult && this.isValid(memoryResult)) {
      return memoryResult.translation;
    }

    // Try Redis cache
    if (this.redis) {
      try {
        const redisResult = await this.redis.get(key);
        if (redisResult) {
          const parsed = JSON.parse(redisResult);
          if (this.isValid(parsed)) {
            // Store in memory cache for faster access
            this.setMemoryCache(key, parsed.translation, parsed.ttl);
            return parsed.translation;
          }
        }
      } catch (error) {
        console.warn('Redis get error:', error);
      }
    }

    return null;
  }

  async set(text: string, translation: string, targetLang: string, sourceLang: string = 'auto', ttl?: number): Promise<void> {
    const key = this.generateKey(text, targetLang, sourceLang);
    const cacheTtl = ttl || this.defaultTtl;
    const cacheEntry = {
      translation,
      timestamp: Date.now(),
      ttl: cacheTtl,
    };

    // Store in memory cache
    this.setMemoryCache(key, translation, cacheTtl);

    // Store in Redis
    if (this.redis) {
      try {
        await this.redis.setex(key, Math.floor(cacheTtl / 1000), JSON.stringify(cacheEntry));
      } catch (error) {
        console.warn('Redis set error:', error);
      }
    }
  }

  private setMemoryCache(key: string, translation: string, ttl: number): void {
    // Implement LRU eviction
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, {
      translation,
      timestamp: Date.now(),
      ttl,
    });
  }

  private isValid(entry: { timestamp: number; ttl: number }): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.warn('Redis clear error:', error);
      }
    }
  }

  async getStats(): Promise<{ memoryCacheSize: number; redisConnected: boolean }> {
    return {
      memoryCacheSize: this.memoryCache.size,
      redisConnected: this.redis ? await this.redis.ping().then(() => true).catch(() => false) : false,
    };
  }
}

// Singleton instance
let translationMemory: TranslationMemory | null = null;

export function getTranslationMemory(): TranslationMemory {
  if (!translationMemory) {
    translationMemory = new TranslationMemory({
      redisUrl: process.env.REDIS_URL,
      maxMemoryCacheSize: 1000,
      defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  return translationMemory;
}
