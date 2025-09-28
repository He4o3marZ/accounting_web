import crypto from 'crypto';
import { logger } from './logger';

interface CacheEntry {
    result: any;
    timestamp: number;
    ttl: number;
    context: string;
    accessCount: number;
    lastAccessed: number;
}

interface CacheConfig {
    similarityThreshold: number;
    maxCacheSize: number;
    defaultTTL: number;
}

/**
 * Smart Caching System with intelligent cache management
 */
export class SmartCache {
    private cache: Map<string, CacheEntry>;
    private config: CacheConfig;
    private stats: any;

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = {
            similarityThreshold: 0.85,
            maxCacheSize: 1000,
            defaultTTL: 3600000, // 1 hour
            ...config
        };
        
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalAccesses: 0
        };
    }

    /**
     * Generate a consistent hash for the input data
     */
    generateHash(data: any): string {
        const normalized = this.normalizeData(data);
        const dataString = JSON.stringify(normalized, Object.keys(normalized).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Normalize data for consistent hashing
     */
    private normalizeData(data: any): any {
        if (Array.isArray(data)) {
            return data.map(item => this.normalizeData(item)).sort();
        }
        
        if (typeof data === 'object' && data !== null) {
            const normalized: any = {};
            Object.keys(data).sort().forEach(key => {
                normalized[key] = this.normalizeData(data[key]);
            });
            return normalized;
        }
        
        return data;
    }

    /**
     * Check if a cached entry is still valid
     */
    private isStillValid(entry: CacheEntry): boolean {
        return (Date.now() - entry.timestamp) < entry.ttl;
    }

    /**
     * Get a result from the cache
     */
    async getCachedResult(data: any, context: string): Promise<any | null> {
        this.stats.totalAccesses++;
        
        const dataHash = this.generateHash(data);
        const cached = this.cache.get(dataHash);

        if (cached) {
            if (this.isStillValid(cached)) {
                // Update access statistics
                cached.accessCount++;
                cached.lastAccessed = Date.now();
                this.stats.hits++;
                
                logger.debug('SMART_CACHE', `Cache hit for ${context}`, { 
                    hash: dataHash,
                    accessCount: cached.accessCount 
                });
                return cached.result;
            } else {
                logger.debug('SMART_CACHE', `Cache expired for ${context}`, { hash: dataHash });
                this.cache.delete(dataHash);
                this.stats.evictions++;
            }
        }

        // Try to find similar cached results
        const similar = this.findSimilarCached(data, context);
        if (similar) {
            this.stats.hits++;
            logger.debug('SMART_CACHE', `Found similar cached result for ${context}`);
            return this.adaptResult(similar, data);
        }

        this.stats.misses++;
        logger.debug('SMART_CACHE', `Cache miss for ${context}`, { hash: dataHash });
        return null;
    }

    /**
     * Store a result in the cache
     */
    async setCachedResult(data: any, result: any, context: string, ttl?: number): Promise<void> {
        // Check cache size and evict if necessary
        if (this.cache.size >= this.config.maxCacheSize) {
            this.evictLeastRecentlyUsed();
        }

        const dataHash = this.generateHash(data);
        const entry: CacheEntry = {
            result,
            timestamp: Date.now(),
            ttl: ttl || this.config.defaultTTL,
            context,
            accessCount: 0,
            lastAccessed: Date.now()
        };

        this.cache.set(dataHash, entry);
        logger.debug('SMART_CACHE', `Cached result for ${context}`, { 
            hash: dataHash, 
            ttl: entry.ttl,
            cacheSize: this.cache.size 
        });
    }

    /**
     * Find similar cached results
     */
    private findSimilarCached(data: any, context: string): any | null {
        for (const [hash, entry] of this.cache.entries()) {
            if (entry.context === context && this.isStillValid(entry)) {
                const similarity = this.calculateSimilarity(data, entry.result);
                if (similarity >= this.config.similarityThreshold) {
                    return entry.result;
                }
            }
        }
        return null;
    }

    /**
     * Calculate similarity between two data objects
     */
    private calculateSimilarity(data1: any, data2: any): number {
        // Simple similarity calculation based on structure and key overlap
        const keys1 = this.getKeys(data1);
        const keys2 = this.getKeys(data2);
        
        const intersection = keys1.filter(key => keys2.includes(key));
        const union = [...new Set([...keys1, ...keys2])];
        
        return union.length > 0 ? intersection.length / union.length : 0;
    }

    /**
     * Get all keys from a nested object
     */
    private getKeys(obj: any, prefix: string = ''): string[] {
        const keys: string[] = [];
        
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                keys.push(...this.getKeys(item, `${prefix}[${index}]`));
            });
        } else if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                keys.push(fullKey);
                keys.push(...this.getKeys(obj[key], fullKey));
            });
        }
        
        return keys;
    }

    /**
     * Adapt a similar result to new data
     */
    private adaptResult(similarResult: any, newData: any): any {
        // Simple adaptation - in a real system, this would be more sophisticated
        return { ...similarResult, adapted: true };
    }

    /**
     * Evict least recently used entries
     */
    private evictLeastRecentlyUsed(): void {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        // Remove 10% of entries
        const toRemove = Math.ceil(entries.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
            this.stats.evictions++;
        }
        
        logger.debug('SMART_CACHE', `Evicted ${toRemove} entries`, { 
            remainingSize: this.cache.size 
        });
    }

    /**
     * Clear cache entries by context
     */
    clearCache(context?: string): void {
        if (context) {
            const toDelete: string[] = [];
            this.cache.forEach((entry, key) => {
                if (entry.context === context) {
                    toDelete.push(key);
                }
            });
            toDelete.forEach(key => this.cache.delete(key));
            logger.info('SMART_CACHE', `Cleared cache for context: ${context}`, { 
                deletedCount: toDelete.length 
            });
        } else {
            this.cache.clear();
            logger.info('SMART_CACHE', 'Cleared entire cache');
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): any {
        const hitRate = this.stats.totalAccesses > 0 ? 
            (this.stats.hits / this.stats.totalAccesses) * 100 : 0;
        
        return {
            size: this.cache.size,
            maxSize: this.config.maxCacheSize,
            hitRate: parseFloat(hitRate.toFixed(2)),
            hits: this.stats.hits,
            misses: this.stats.misses,
            evictions: this.stats.evictions,
            totalAccesses: this.stats.totalAccesses
        };
    }

    /**
     * Clean up expired entries
     */
    cleanup(): void {
        const now = Date.now();
        const toDelete: string[] = [];
        
        this.cache.forEach((entry, key) => {
            if (!this.isStillValid(entry)) {
                toDelete.push(key);
            }
        });
        
        toDelete.forEach(key => {
            this.cache.delete(key);
            this.stats.evictions++;
        });
        
        if (toDelete.length > 0) {
            logger.debug('SMART_CACHE', `Cleaned up ${toDelete.length} expired entries`);
        }
    }
}


