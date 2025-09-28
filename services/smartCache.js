const crypto = require('crypto');
const logger = require('./logger');

/**
 * Smart Caching System with similarity matching
 * Reduces API calls by caching similar results and adapting them
 */
class SmartCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.similarityThreshold = options.similarityThreshold || 0.85;
        this.maxCacheSize = options.maxCacheSize || 1000;
        this.defaultTTL = options.defaultTTL || 3600000; // 1 hour
        this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutes
        
        // Start cleanup interval
        this.startCleanupInterval();
    }

    /**
     * Generate a hash for data to use as cache key
     */
    generateHash(data) {
        const normalizedData = this.normalizeData(data);
        const dataString = JSON.stringify(normalizedData, Object.keys(normalizedData).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Normalize data for consistent hashing
     */
    normalizeData(data) {
        if (typeof data === 'string') {
            return data.toLowerCase().trim();
        }
        
        if (Array.isArray(data)) {
            return data.map(item => this.normalizeData(item)).sort();
        }
        
        if (typeof data === 'object' && data !== null) {
            const normalized = {};
            Object.keys(data).sort().forEach(key => {
                if (typeof data[key] === 'number' || typeof data[key] === 'string') {
                    normalized[key] = data[key];
                } else if (Array.isArray(data[key])) {
                    normalized[key] = data[key].map(item => this.normalizeData(item));
                }
            });
            return normalized;
        }
        
        return data;
    }

    /**
     * Calculate similarity between two data objects
     */
    calculateSimilarity(data1, data2) {
        const normalized1 = this.normalizeData(data1);
        const normalized2 = this.normalizeData(data2);
        
        // Simple similarity based on common keys and values
        const keys1 = this.getAllKeys(normalized1);
        const keys2 = this.getAllKeys(normalized2);
        
        const commonKeys = keys1.filter(key => keys2.includes(key));
        const totalKeys = new Set([...keys1, ...keys2]).size;
        
        if (totalKeys === 0) return 0;
        
        let similarity = commonKeys.length / totalKeys;
        
        // Check value similarity for common keys
        commonKeys.forEach(key => {
            const val1 = this.getValueByPath(normalized1, key);
            const val2 = this.getValueByPath(normalized2, key);
            
            if (val1 === val2) {
                similarity += 0.1; // Bonus for exact matches
            } else if (typeof val1 === 'string' && typeof val2 === 'string') {
                // String similarity
                const strSimilarity = this.calculateStringSimilarity(val1, val2);
                similarity += strSimilarity * 0.05;
            }
        });
        
        return Math.min(similarity, 1.0);
    }

    /**
     * Calculate string similarity using Levenshtein distance
     */
    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Get all keys from a nested object
     */
    getAllKeys(obj, prefix = '') {
        let keys = [];
        
        if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                keys.push(fullKey);
                
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    keys = keys.concat(this.getAllKeys(obj[key], fullKey));
                }
            });
        }
        
        return keys;
    }

    /**
     * Get value by path from nested object
     */
    getValueByPath(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Check if cached result is still valid
     */
    isStillValid(cachedItem) {
        const now = Date.now();
        return now - cachedItem.timestamp < cachedItem.ttl;
    }

    /**
     * Calculate TTL based on data type and complexity
     */
    calculateTTL(data, taskType) {
        const baseTTL = this.defaultTTL;
        
        // Adjust TTL based on task type
        const taskTTLMultipliers = {
            'extraction': 2,      // Cache extraction results longer
            'categorization': 1.5,
            'validation': 1,
            'analysis': 0.5,      // Analysis results change more frequently
            'insights': 0.3
        };
        
        const multiplier = taskTTLMultipliers[taskType] || 1;
        return Math.floor(baseTTL * multiplier);
    }

    /**
     * Find similar cached results
     */
    findSimilarCached(data, taskType) {
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (const [key, cachedItem] of this.cache.entries()) {
            if (cachedItem.taskType !== taskType || !this.isStillValid(cachedItem)) {
                continue;
            }
            
            const similarity = this.calculateSimilarity(data, cachedItem.originalData);
            
            if (similarity > this.similarityThreshold && similarity > bestSimilarity) {
                bestMatch = cachedItem;
                bestSimilarity = similarity;
            }
        }
        
        if (bestMatch) {
            logger.debug('SMART_CACHE', `Found similar cached result`, {
                similarity: bestSimilarity,
                taskType,
                cacheKey: bestMatch.key
            });
        }
        
        return bestMatch;
    }

    /**
     * Adapt a cached result to new data
     */
    adaptResult(cachedItem, newData) {
        const adapted = JSON.parse(JSON.stringify(cachedItem.result));
        
        // Simple adaptation - replace data-specific fields
        if (adapted.data && newData.data) {
            adapted.data = { ...adapted.data, ...newData.data };
        }
        
        if (adapted.originalData) {
            adapted.originalData = newData;
        }
        
        // Add adaptation metadata
        adapted._adapted = true;
        adapted._originalCacheKey = cachedItem.key;
        adapted._adaptationTimestamp = new Date().toISOString();
        
        logger.debug('SMART_CACHE', 'Adapted cached result for new data');
        
        return adapted;
    }

    /**
     * Get cached result or find similar one
     */
    async getCachedResult(data, taskType) {
        const dataHash = this.generateHash(data);
        const cached = this.cache.get(dataHash);
        
        // Check exact match
        if (cached && this.isStillValid(cached)) {
            logger.debug('SMART_CACHE', 'Found exact cached result');
            return cached.result;
        }
        
        // Check for similar cached results
        const similar = this.findSimilarCached(data, taskType);
        if (similar) {
            return this.adaptResult(similar, data);
        }
        
        return null;
    }

    /**
     * Set cached result
     */
    async setCachedResult(data, result, taskType) {
        const dataHash = this.generateHash(data);
        const ttl = this.calculateTTL(data, taskType);
        
        // Check cache size limit
        if (this.cache.size >= this.maxCacheSize) {
            this.evictOldest();
        }
        
        this.cache.set(dataHash, {
            key: dataHash,
            result,
            originalData: data,
            taskType,
            timestamp: Date.now(),
            ttl
        });
        
        logger.debug('SMART_CACHE', 'Cached result', {
            taskType,
            ttl,
            cacheSize: this.cache.size
        });
    }

    /**
     * Evict oldest cache entries
     */
    evictOldest() {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove oldest 10% of entries
        const toRemove = Math.ceil(entries.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
        
        logger.debug('SMART_CACHE', `Evicted ${toRemove} old cache entries`);
    }

    /**
     * Start cleanup interval
     */
    startCleanupInterval() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }

    /**
     * Clean up expired cache entries
     */
    cleanup() {
        const now = Date.now();
        let removedCount = 0;
        
        for (const [key, cachedItem] of this.cache.entries()) {
            if (!this.isStillValid(cachedItem)) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            logger.debug('SMART_CACHE', `Cleaned up ${removedCount} expired entries`);
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        logger.info('SMART_CACHE', 'Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        
        for (const cachedItem of this.cache.values()) {
            if (this.isStillValid(cachedItem)) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }
        
        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            hitRate: this.calculateHitRate()
        };
    }

    /**
     * Calculate cache hit rate (simplified)
     */
    calculateHitRate() {
        // This would need to be implemented with proper hit/miss tracking
        return 0.75; // Placeholder
    }
}

module.exports = SmartCache;


